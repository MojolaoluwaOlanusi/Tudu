# Enterprise

> **Coming soon.** The features below are not in this repository yet.
> If you need them today, email <olanusimojola@gmail.com> to be added to
> the design-partner list.

Tudu already covers most of what small teams need: workspaces with
roles, real-time sync, a template marketplace, GitHub and Slack
integrations, self-hosting with a signed licence, and a full public API.
Enterprise is the next tier up, aimed at teams of 20 or more with
compliance and identity requirements.

## What enterprise will include

### SSO (SAML 2.0 / OIDC)

- IdP-initiated and SP-initiated login.
- Per-workspace IdP metadata (Okta, Azure AD, Google Workspace, JumpCloud,
  OneLogin, Ping, generic SAML 2.0).
- Encrypted client secrets at rest.
- Domain verification so users on `@yourcompany.com` are routed to your
  IdP without typing a URL.

### SCIM 2.0 provisioning

- `/scim/v2/Users` and `/scim/v2/Groups` CRUD.
- Bearer token per workspace, generated and rotated from the workspace
  settings.
- Deprovisioning: removing a user in the IdP removes their workspace
  access on the next SCIM sync.

### Compliance audit export

- A true audit table (separate from `activity_log`, which is per-user
  task activity, not compliance-scoped).
- Fields: `actor_id`, `workspace_id`, `board_id`, `action`,
  `entity_type`, `entity_id`, `old_values`, `new_values`, IP.
- Streaming CSV export over a date range.
- Retention: 24 months, configurable.

### White-label

- Custom domain for a workspace's Tudu URL (e.g.
  `kanban.yourcompany.com`).
- Custom logo, favicon, and primary colour.
- "Powered by Tudu" removed.
- Domain verification via TXT record.

### Data residency

- Region-pinned storage: EU, US, or Africa.
- The customer picks the region at workspace creation; data never leaves
  it.
- Full workspace export as a signed JSON archive.

### On-premise

- Docker image + Helm chart.
- Bundled Postgres.
- Air-gapped install via a signed tarball.
- Uses the self-hosting licence at boot.

### SLA and support

- Named support contact.
- 4-hour acknowledgement, 24-hour resolution target for critical
  incidents.
- A public status page with incident history.

## What already exists and gets folded in

The enterprise tier does not start from zero. It builds on:

- **Workspaces + roles.** Admin / member / viewer already gate every
  endpoint.
- **Self-hosting licence.** Ed25519-signed licences, offline
  verification, hardware fingerprint binding, and a hosted issuance
  portal are shipped and battle-tested.
- **Marketplace moderation hooks.** Template publishing is
  auto-approved today but the schema supports `pending`, `approved`,
  and `rejected` statuses.
- **GitHub and Slack integrations.** Already live with HMAC signature
  verification and per-user secret rotation.
- **Public API and webhooks.** Already live with rate limiting and
  Standard-Webhooks signatures.

## Timeline

Not scheduled. Enterprise is not part of any release commitment. If you
need any of the above sooner than it ships, we would rather know: design
partners get a direct influence on scope and priority.

## How to get notified

- Watch the repository's releases:
  <https://github.com/MojolaoluwaOlanusi/Tudu/releases>
- Or email <olanusimojola@gmail.com> with "Enterprise notifications" in
  the subject.

## How to become a design partner

Design partners get:

- Early access before public launch.
- Direct line to the maintainer for shaping the feature.
- A discounted rate for the first year.

In exchange we ask for a real use case, at least one call to understand
your requirements, and honest feedback on the shipped feature.

If that sounds right, email <olanusimojola@gmail.com> with:

- Team size.
- Which IdP you use.
- Which enterprise feature is a must-have versus a nice-to-have.
- Whether you need on-prem.
