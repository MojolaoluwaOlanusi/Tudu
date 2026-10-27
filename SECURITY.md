# Security policy

## Reporting a vulnerability

Do not open a public issue for a security problem.

Email <olanusimojola@gmail.com> with:

* A description of the issue

* Steps to reproduce

* Any proof-of-concept code or screenshots

* The version / commit you tested against

If you would prefer to disclose privately on GitHub, use the "Report a
vulnerability" link under the repo's Security tab once advisories are
enabled.

## Response timeline

* Acknowledge within 24 hours (business days)

* Triage and severity within 7 days

* Fix and disclosure coordinated within 90 days, sooner for critical
issues

We will credit you in the eventual release notes unless you ask us not to.

## In scope

* Authentication (email, Google, GitHub OAuth)

* Authorization (boards, workspaces, sharing, marketplace)

* Billing and entitlement enforcement

* Public API and personal access tokens

* Outbound webhooks (signing, retry)

* Self-hosting licence verification

* GitHub / Slack integration signature verification

* Data isolation between users and workspaces

* Sensitive data exposure (tokens in logs, secrets in client bundles)

## Out of scope

* Social engineering (phishing, pretexting)

* Physical attacks

* DoS by traffic flooding (rate limits exist; report only if you find a
bypass)

* Vulnerabilities in third-party services (Paystack, Google, GitHub,
Resend, Slack)

* Self-XSS that requires the user to paste code into the console

* Reports generated automatically by a scanner with no reproduction

## Supported versions

* main branch and the latest minor release are supported.

* Older minor versions receive fixes only for critical issues.

## Bounties

* There is no paid bug-bounty programme today. Public credit is offered for
any valid report. If a bounty programme launches, this file will say so.

## PGP

* No stable PGP key is published yet. If you need encrypted communication,
say so in your initial email and we will exchange keys.

## Known trade-offs (deliberately out of scope today)

**These are documented in the codebase and not vulnerabilities:**

* GitHub and Slack integration tokens are stored in the database as
plaintext (TEXT), matching the posture of the rest of the credentials.
Encrypting at rest is on docs/FUTURE_WORK.md.

* API tokens are hashed with SHA-256 + a server-side pepper. Losing the
pepper means tokens can no longer be verified; rotating it invalidates
every token.

* Webhook delivery does not enforce a replay window; receivers are
expected to compare webhook-timestamp against their own clock.
