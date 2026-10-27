# Template marketplace

The marketplace lets Pro users publish a board as a template, and lets
any signed-in user install a template as a new board. Free templates are
installable by anyone; paid templates are bought or rented through
Paystack, with 70% of the sale going to the publisher.

This guide covers what each side sees, how money flows, and how refunds
and versioning work.

## What the marketplace is

A "template" is a snapshot of a board's columns and its 15 most recent
live cards, saved at publish time so later edits to the source board do
not change it. Each template has a name, a category, a description, a
price (0 for free), an optional rental period, and a version number.

Templates live in the `marketplace_templates` table. Purchases live in
`template_purchases`. Publisher payout details live in
`publisher_profiles`.

## For installers

### Browse

Landing page or in-app at `/settings/templates` -> Marketplace tab.
Templates are ordered by install count (most installed first).

### Free templates

Click Install. A new board is created under your account with the
template's columns and example cards. The install count is incremented
once per user per template even if you install it again.

### Paid templates

Click Buy & install. A Paystack popup opens, pre-initialised with the
publisher's subaccount as the split destination. On success you are
returned to the app and the board is created.

- The purchase is one-off. You own it forever unless it is refunded.
- The purchase reference is used server-side to verify the payment.
  You cannot skip the payment popup by calling the install endpoint
  directly.

### Rentals

Some publishers offer rental terms (e.g. 30 days). Renting works the same
as buying but the purchase record carries an `expires_at`. After expiry
the install endpoint returns 402 with a specific "Your rental has
expired" message.

### Updates

When a publisher bumps the version of a template you own, the marketplace
shows an "Update available" button on that template. Clicking it replaces
the board you originally installed with a fresh board built from the new
version. The old board is deleted, so if you have cards on it that you
want to keep, do not click Update.

If you bought at a lower price or the terms changed (rental days went
from 0 to something, or the rental period changed), the sync is blocked
with an explanation. In that case you must buy or rent the new version.

### Refunds

You may request a refund within 14 days of purchase. Refund is
self-service from Settings -> Billing -> Your template purchases. On
success:

- The purchase flips to `refunded` in `template_purchases`.
- Paystack refunds the full amount, including reversing the publisher
  split.
- The board created by that purchase is deleted.
- You can still see the template in the marketplace but must re-buy it.

After 14 days the Refund button disappears and the API returns 400. This
is deliberate: the purchase is delivered immediately and the amount is
small.

## For publishers

### Before you can sell

To publish a paid template you first need a Paystack subaccount, created
once per publisher. In Settings -> Billing -> Sell templates, provide:

- Business name (matches the bank account).
- Bank (Nigerian banks only - Paystack subaccounts settle NGN).
- 10-digit account number.

The backend calls Paystack to resolve the account name and to create the
subaccount with a 30% platform split (Tudu keeps 30%, you keep 70%).

If you re-save the profile, a new subaccount is created and the old one
is left inactive in Paystack. You do not need to do this unless your
bank details change.

Free templates do not need a subaccount.

### Publishing a free template

From a board, open the Publish dialog. Set price to 0. The template is
created with `status = 'approved'` immediately. Free templates are
moderated only reactively - a human reviews abuse reports, not every
publication.

### Publishing a paid template

Same flow, with:

- `price_kobo` in NGN kobo (minimum 10000, i.e. NGN 100).
- Optional `rental_days`. 0 means a permanent sale.

The price check is server-side. A paid template without an active
publisher subaccount is refused.

### Versioning

Each edit to a template bumps `version` by one. Existing buyers see an
"Update available" badge and can either sync (see above) or ignore it.

If you want to change what buyers get on their next install without
forcing existing installs to sync, bump the version and edit the
template.

### Editing a template

From the marketplace card in Settings -> Templates -> Marketplace tab,
if you are the author, click Edit template. You can change:

- Name.
- Description.
- Price (free <-> paid, and new paid amount).
- Rental days.
- Definition source board (to snapshot a new board into the template).

Any change bumps the version.

### Deleting a template

Clicking Delete removes the row from `marketplace_templates`. Existing
buyers keep their installed boards but cannot re-download or sync. Buyers
who already purchased and are within 14 days can still request a refund -
the purchase row survives because it is a separate table.

### Auto-sync on install

When a new buyer installs a template, the backend:

1. Creates a new board for the buyer.
2. Creates the columns from the template definition.
3. Creates the example cards, mapped to the right columns.
4. Increments the template's `install_count`.
5. Records the install in `template_installs` (idempotent per
   template/user pair).
6. Updates the purchase row's `board_id` (if the buyer is the payer).

## Money

### The split

- **Publisher gets 70%** of every paid sale.
- **Tudu gets 30%** - the platform fee, taken by Paystack at settlement.
- **Paystack fees and VAT are borne by the publisher.** The
  transaction is created with `bearer: 'subaccount'`.

The 30/70 direction is the number passed as `percentage_charge` when the
subaccount is created. If Paystack ever reverses this, the value lives in
one place: `publisherController.ts`.

### Settlement

Paystack pays publishers directly into their bank account on a rolling
settlement schedule (typically T+1 for Nigerian accounts). Tudu never
holds publisher money.

### Refunds

A refund reverses both the publisher's settlement and the platform fee.
Paystack handles this; the app flips the purchase row and deletes the
board.

### Credit bundles

AI credit bundles (separate from templates) are one-off Paystack charges
to Tudu itself, not split. See `docs/SELF_HOSTING.md` for the full
Paystack setup.

## Pricing guidance

There is no enforced pricing curve. What tends to work:

- **Free**: starter boards with a small twist (a content calendar, a
  bug tracker). These get the most installs and are your best
  advertising.
- **NGN 500 - NGN 2,000 one-off**: personal productivity templates.
- **NGN 2,000 - NGN 10,000**: team or agency templates with column
  conventions and example cards a buyer would actually keep.
- **Rentals at NGN 200 - NGN 1,000 for 30 days**: good for
  season-specific boards (e.g. a conference planner) or boards a
  buyer only needs occasionally.

The minimum price is NGN 100. Below that, Paystack fees eat the whole
amount.

## Moderation

Today:

- Free templates: approved automatically. Reported templates are
  reviewed reactively.
- Paid templates: approved automatically, but refunds are a safety valve.

Coming (see `docs/FUTURE_WORK.md`):

- A moderation queue with a human reviewer.
- A rating and review system.
- A takedown workflow with a public policy.

## Example walkthrough

Publisher sells a "Freelancer CRM" board for NGN 2,000:

1. Publisher signs in, goes to Settings -> Billing, saves payout account.
   Paystack returns `ACCT_xyz`. Stored in `publisher_profiles`.
2. Publisher opens the board, clicks Publish, enters price 2000, rental
   days 0. Template created, `status = 'approved'`, version 1.
3. Buyer browses the marketplace, clicks Buy & install on the Freelancer
   CRM card.
4. Backend calls Paystack `/transaction/initialize` with amount 200000
   kobo, subaccount `ACCT_xyz`, bearer `subaccount`. Buyer sees the
   popup, pays NGN 2,000.
5. Paystack fires `charge.success`. Backend records the payment in
   `payments` and flips `template_purchases.status = 'success'`.
6. Buyer is redirected to the app; frontend calls the install endpoint
   with the reference. Backend verifies, creates the board, increments
   install count, links the board to the purchase.
7. Paystack settles: NGN 1,400 to the publisher's bank, NGN 600 to Tudu,
   in a rolling schedule.
8. Within 14 days, buyer requests a refund. Backend calls Paystack
   `/refund` and, on success, deletes the board and marks the purchase
   refunded. Paystack reverses both settlements.
