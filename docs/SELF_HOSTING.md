# Self-hosting Tudu

This is the complete guide to running Tudu on a server you control. It
covers a bare-metal install without Docker, every environment variable,
each optional integration, and the licence flow that unlocks Pro features
on a self-hosted instance.

Tudu is AGPL-3.0. You may run it internally, expose it to your team, or
modify it, provided you share modifications under the same licence when
you offer the modified product as a network service.

## Who should self-host

Self-hosting makes sense if:

- You already run Postgres and a Node process somewhere.
- You want your task data to stay on infrastructure you own.
- You need an air-gapped or offline-capable deployment.

Self-hosting is a worse fit if you do not want to run Postgres backups,
patch the server, or manage OAuth apps. The hosted version exists for
exactly that reason.

## Requirements

- **Node 18 or 20.** Node 16 is not supported.
- **Postgres 15+.** Older versions may work but are untested.
- **2 vCPU / 1 GB RAM** minimum for a team of 20. Storage scales with
  attachments (none in the core app) and webhook delivery history.
- **A reverse proxy** that terminates TLS (nginx, Caddy, Traefik, or a
  cloud load balancer).
- **DNS** - two hostnames if you want the frontend and API on different
  subdomains, or one if you plan to proxy them on the same origin.

## Install without Docker

### 1. Create the database

```sql
CREATE DATABASE tudu;
CREATE USER tudu WITH PASSWORD 'change-me';
GRANT ALL PRIVILEGES ON DATABASE tudu TO tudu;
```

Save the connection string:
postgresql://tudu:change-me@127.0.0.1:5432/tudu

### 2. Backend

```bash
git clone https://github.com/MojolaoluwaOlanusi/Tudu.git
cd Tudu/backend
npm ci
cp .env.example .env
# Edit .env - see "Environment variables" below
npm run migrate
npm run build
NODE_ENV=production node dist/server.js
```

The API listens on PORT (default 5000).

### 3. Frontend

```bash
cd ../frontend
npm ci
cp .env.example .env
# Edit .env: VITE_API_URL and VITE_SOCKET_URL must point at the backend
npm run build
# Serve dist/ with nginx or any static host
```

A minimal `nginx.conf` for the SPA:

```nginx
server {
  listen 80;
  root /var/www/tudu/frontend/dist;
  index index.html;
  location / {
    try_files $uri /index.html;
  }
  location /api/ {
    proxy_pass http://127.0.0.1:5000;
  }
  location /socket.io/ {
    proxy_pass http://127.0.0.1:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

### Environment variables

Every variable the backend reads, grouped by whether it is required for
a basic install.

#### Required

- `DATABASE_URL` - Postgres connection string.

- `JWT_SECRET` - random string, 32 bytes or more. Rotating this logs
every user out.

- `SESSION_SECRET` - random string. Used by Express sessions for the
Passport OAuth handshake.

- `FRONTEND_URL` - the public URL of the SPA (CORS + OAuth redirects).

- `NODE_ENV` - production behind TLS.

#### Strongly recommended

- `JWT_EXPIRES_IN` - JWT lifetime, default `7d`.

- `PORT` - default `5000`.

- `APP_URL` - used in emails and Paystack callback URLs. Defaults to
`http://localhost:5173` which is wrong in production.

#### Optional - auth

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` -
enable Google sign-in.

- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL` -
enable GitHub sign-in AND the GitHub integration (the same OAuth app
is used for both; see "GitHub integration" below).

Without any OAuth credentials, email + password still works.

#### Optional - AI

- `AI_PROVIDER` - `gemini` (default), `groq`, or `ollama`.

- `GEMINI_API_KEY` - required if provider is `gemini`.

- `GROQ_API_KEY` - required if provider is `groq`.

- `OLLAMA_URL` - required if provider is ollama (default
`http://localhost:11434`).

- `AI_MODEL` - override the default model for the selected provider.

- `GROQ_BASE_URL` / `GEMINI_BASE_URL` - override the API base URL for a
proxy or gateway in front of the provider.

Without a key, only the AI breakdown endpoint fails (with a 503). Every
other feature works.

#### Optional - email (Resend)

- `RESEND_API_KEY`- required for due-date reminders.

- `REMINDER_FROM_EMAIL` - verified sender, e.g. `Tudu <onboarding@yourdomain.com>`.

- `REMINDER_CRON_SECRET` - shared secret for `/api/reminders/run`.

If these are missing, reminders are disabled but nothing else breaks.

#### Optional - push notifications (VAPID)

- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` - generate with
`npx web-push generate-vapid-keys`. Subject is a `mailto:` or
`https://` URL.

Without VAPID, the browser never offers to subscribe and nothing breaks.

#### Optional - Paystack billing

- `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`.

- `PAYSTACK_PLAN_PRO_MONTHLY`, `PAYSTACK_PLAN_PRO_YEARLY` - plan codes
from the Paystack dashboard.

Without these, the pricing page still renders but checkout returns 500.
If you do not want billing at all, you can ignore these and just not
link to `/pricing`.

#### Optional - GitHub integration (PRs to cards)

Requires the same `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`/
`GITHUB_CALLBACK_URL` as auth. The OAuth scope is elevated to `repo`
when a user installs the integration from settings, so if you enabled
GitHub for auth only, users can grant additional scope on the
integration page.

- `GITHUB_WEBHOOK_SECRET` - legacy shared secret. Not required: the
current implementation generates a per-user secret on connect and lets
the user rotate it from settings.

Without OAuth credentials, the integration cannot be installed.

#### Optional - Slack integration

`SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_SIGNING_SECRET`,
`SLACK_REDIRECT_URI` - create a Slack app with the /tudu command
and the OAuth scopes `commands, chat:write, channels:read, groups:read`. The redirect URI must match the URL of the deployed
backend's `/api/integrations/slack/oauth/callback`.

Without these, the Slack install button returns 500.

#### Optional - self-hosting licence

Two modes, controlled by `TUDU_MODE`:

- `TUDU_MODE` - `cloud` (default) or `self_hosted`.

- Cloud mode (issuer):

  - `LICENSE_PRIVATE_KEY` - Ed25519 PEM. Signs licence files.

  - `LICENSE_PUBLIC_KEY` - Ed25519 PEM. Included in the served
licences and in every self-hosted build.

- Self-hosted mode (consumer):

  - `LICENSE_PUBLIC_KEY` - the issuer's public key.

  - `LICENSE_PATH` - where the installed licence lives. Default
`./data/license.lic`.

  - `TUDU_LICENSE_BLOB` - optional. Base64 of the signed licence JSON,
used when the filesystem is ephemeral.

  - `TUDU_FINGERPRINT_SALT` - optional. Any stable string. Makes the
hardware fingerprint stable across container restarts.

Full licence flow in a later section.

#### Optional - API tokens

- `API_TOKEN_HASH_PEPPER` - server-side pepper mixed into the SHA-256
hash of every personal access token. If unset, the hash is a plain
SHA-256 of the token, which is weaker but still works. Set this on
production.

### Running migrations

```bash
cd backend
npm run migrate
```

`migrations/run.ts` reads `migrations/init.sql` and applies it. Every
statement in it is idempotent, so running it against an existing database
is safe. There are no separate versioned migrations yet.

### Configuring OAuth

#### Google

1. In the Google Cloud Console, create an OAuth 2.0 Client ID of type
"Web application".

2. Authorized redirect URIs:

    - Dev: `http://localhost:5000/auth/google/callback`

    - Prod: `https://api.yourhost.com/auth/google/callback`

3. Copy the client ID and secret to `.env`.

4. Set `GOOGLE_CALLBACK_URL` to the same redirect URI.

#### GitHub

1. GitHub -> Settings -> Developer settings -> OAuth Apps -> New.

2. Homepage URL: your frontend origin.

3. Authorization callback URL: `https://api.yourhost.com/auth/github/callback`.

4. Copy ID and secret to `.env`, and set `GITHUB_CALLBACK_URL`.

Google's OAuth consent screen verification requires:

- A public Privacy Policy page at `https://yourhost.com/privacy`.
- A public Terms page at `https://yourhost.com/terms`.
- Both linked visibly from the app homepage.
Both are built into the app under `/privacy` and `/terms`; you just need
to add the hostname to Google's "Authorized domains" list.

### Configuring Paystack (or disabling billing)

1. Create a Paystack account and activate a business.

2. Create two Plans in the dashboard: Pro Monthly (NGN 7,500) and Pro
Yearly (NGN 75,000). Copy their plan codes.

3. Set the four `PAYSTACK_*` env vars above.

4. Point Paystack's webhook to `https://api.yourhost.com/api/billing/webhook`.
Only `charge.success`, `subscription.create`, `subscription.disable`,
and `invoice.payment_failed` are handled.

5. Set `APP_URL` to your frontend origin so the checkout callback
redirects correctly.

If you do not want billing, do not set the Paystack vars and remove any
link to `/pricing` from your navigation. The app will not charge anyone.

### Configuring AI providers

#### Gemini (recommended default)

1. Visit [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey).

2. Create an API key.

3. Set `AI_PROVIDER=gemini` and `GEMINI_API_KEY`=....

#### Groq

1. Visit [https://console.groq.com/keys](https://aistudio.google.com/apikey).

2. Create a key.

3. Set `AI_PROVIDER=groq` and `GROQ_API_KEY`=....

#### Ollama (fully offline)

1. Run `ollama serve` on the host.

2. `ollama pull llama3.2` (or your model of choice).

3. Set `AI_PROVIDER=ollama` and optionally `OLLAMA_URL` and `AI_MODEL`.

Ollama needs enough RAM for the model. On a 1 GB host, use a small
quantised model or skip Ollama.

### Configuring email

1. Sign up at [https://resend.com](https://resend.com/).

2. Verify a sending domain and create an API key.

3. Set `RESEND_API_KEY`, `REMINDER_FROM_EMAIL`, and
`REMINDER_CRON_SECRET` in `.env`.

Trigger reminders once a day with any HTTP scheduler (systemd timer,
Render cron, GitHub Action). Example `curl`:

```bash
curl -fsS -X POST \
  -H "X-Cron-Secret: $REMINDER_CRON_SECRET" \
  "https://api.yourhost.com/api/reminders/run"
```

The endpoint returns a summary of how many users were checked, how many
emails were sent, and how many failed.

### Configuring push notifications

1. `npx web-push generate-vapid-keys`.

2. Set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` in `.env`.

3. Rebuild the frontend so `vite-plugin-pwa` bundles the VAPID key into
the service worker.

The backend will not send push notifications to a browser that has not
subscribed, and will prune subscriptions that return HTTP 404 or 410.

### GitHub integration

1. The GitHub integration (PR opened -> card moved, PR merged -> card
moved) uses the same OAuth app as GitHub login.

2. Enable GitHub auth (see above).

3. The user opens Settings -> Integrations -> GitHub -> Connect. This
re-runs OAuth with a `repo` scope and stores the resulting token
per-user.

4. In the same settings page, the user picks a repo, a board, a column
for "PR opened", and a column for "PR merged".

The user copies the payload URL and secret into the repo's webhook
settings. The secret can be rotated from the settings page at any
time; rotation invalidates the old webhook until GitHub is updated.

Webhooks are signed with HMAC-SHA256 over the raw body. The signature
identifies which user the event belongs to; only the user whose secret
matches can act.

### Slack integration

1. Create a Slack app at [https://api.slack.com/apps](https://api.slack.com/apps).

2. Set the OAuth redirect URL to
`https://api.yourhost.com/api/integrations/slack/oauth/callback`.

3. Grant the bot scopes `commands, chat:write, chat:write.public, channels:read, groups:read`.

4. Create a slash command `/tudu` pointing at
`https://api.yourhost.com/api/integrations/slack/commands`.

5. Copy the client ID, client secret, signing secret, and redirect URI
into `.env`.

The command is signed with HMAC over `v0:{timestamp}:{body}` and rejects
timestamps more than 5 minutes old.

### Self-hosting licence

Tudu's Pro features on a self-hosted instance require a signed licence
file. Flow:

#### On the hosted portal (issuer)

1. The customer signs in and buys Pro.

2. Their self-hosted instance prints its hardware fingerprint in
Settings -> Self-hosting.

3. The customer pastes that fingerprint into the same page on the hosted
portal and clicks "Generate licence".

4 .The portal signs an Ed25519 payload and returns a `.lic` file. The
signed blob is stored in `licenses` for support.

#### On the self-hosted instance (consumer)

1. Set `TUDU_MODE=self_hosted`.

2. Set `LICENSE_PUBLIC_KEY` to the issuer's public key (shipped with
every release).

3. Upload the `.lic` file from Settings -> Self-hosting, or set
`TUDU_LICENSE_BLOB` for ephemeral filesystems.

4. Activation verifies the signature and the hardware fingerprint
before saving. A licence issued for a different machine will be
refused with `fingerprint_mismatch`.

Verification is offline. The hosted issuer cannot revoke a licence that
is already installed. A revoked licence keeps working until the instance
renews (default 1 year), which is the standard trade-off of offline
licensing.

### Running as a service

Example systemd unit:

```ini
[Unit]
Description=Tudu API
After=network.target

[Service]
Type=simple
User=tudu
WorkingDirectory=/home/tudu/Tudu/backend
EnvironmentFile=/home/tudu/Tudu/backend/.env
ExecStart=/usr/bin/node dist/server.js
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.
```

The frontend is static; serve it with nginx, Caddy, or any static host
and point `VITE_API_URL` at the API.

### Health checks, backup, restore

#### Health

`GET /health` returns `{ "status": "ok", "timestamp": "..." }`. This is
what every load balancer and uptime monitor should hit.

`GET /api/public/stats` returns uptime, version, and the live
`active_users` count. It is public and safe to poll.

#### Backup

Two things matter:

1. Postgres. `pg_dump daily`, keep 30 days, store off-host. Use
Neon's branching, or a `pg_dump | gzip` on a small server.

2. `.env.` Contains every secret. Back it up to a password manager,
not to the same disk as the database.

#### Restore

```bash
gunzip -c tudu-YYYY-MM-DD.sql.gz | psql "$DATABASE_URL"
```

Restoring is a full replacement; any data created after the dump is lost.

#### Upgrading

```bash
git pull
cd backend && npm ci && npm run migrate && npm run build
systemctl restart tudu-api
cd ../frontend && npm ci && npm run build
# Reload nginx or the static host
```

`npm run migrate` is safe to re-run. It never drops data.

### Troubleshooting

**The API returns 500 on every route after restart.**
Check `DATABASE_URL`. A connection failure in `pg.Pool` surfaces as 500
on the first request, not at boot.

**OAuth login redirects back to /login with `error=auth_failed`.**
`FRONTEND_URL` and the OAuth app's redirect URI must match exactly. Most
often the difference is `http` vs `https` or a trailing slash.

**"Please use OAuth to login".**
The user signed up with Google or GitHub and has no password. They must
sign in with the same provider.

**AI breakdown returns 503 "provider is selected but ... is not set".**
`AI_PROVIDER` says `gemini` (or `groq`) but the matching key is missing
from `.env`. Set the key and restart.

**AI breakdown returns 429 from the provider.**
Free-tier rate limit. Wait, or upgrade your provider plan.

**Push notifications never appear.**
VAPID keys missing on the backend, or the browser denied notification
permission. The settings page shows a "blocked in your browser settings"
message when the permission is denied.

**Slack `/tudu create` says "workspace is not linked".**
The Slack app was installed by one Tudu user, but the command is
arriving with a `team_id` that does not match any row in
`slack_integrations`. Re-install from Settings -> Integrations ->
Slack.

**GitHub webhook receives 401 "Signature does not match any known secret".**
The webhook secret in GitHub does not match the current per-user secret.
Rotate from Settings -> Integrations -> GitHub, then update GitHub.

**Self-hosting: "This license was issued for a different machine".**
`TUDU_FINGERPRINT_SALT` was not set on the Docker instance, or the
machine identifiers changed (e.g. `/etc/machine-id` regenerated). Set a
stable salt, restart, re-issue.
