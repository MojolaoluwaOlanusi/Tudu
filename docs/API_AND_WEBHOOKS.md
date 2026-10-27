# Public API and webhooks

The `/api/v1` surface is a versioned, token-authenticated API for
programmatic access to boards and tasks. Outbound webhooks push task
events to HTTPS endpoints you control, with a Standard-Webhooks
signature.

## Authentication

Every `/api/v1` route requires a personal access token:

Authorization: Bearer tudu_pat_`<random-hex>`

Tokens are created in Settings -> API tokens. The plaintext is shown
exactly once. Only a SHA-256 hash (with a server-side pepper) is stored.
Revoking a token is immediate: the next request with that token gets 401.

Tokens never expire on their own. Rotate by revoking and creating a new
one.

## Rate limiting

- **100 requests per minute per user**, shared across every token the
  user has. Counted by user id, not by token, so multiple tokens do not
  multiply the budget.
- Every request counts, including 404s.
- Standard headers on every response: `RateLimit-Limit`,
  `RateLimit-Remaining`, `RateLimit-Reset`.

On overflow the response is:

```json
{ "error": "Rate limit exceeded. Try again shortly." }
```

**HTTP status 429.**

## Endpoints

### GET /api/v1/me

Returns the authenticated user.

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "Ada",
  "avatar_url": "https://...",
  "created_at": "2025-01-01T00:00:00.000Z"
}
```

**Errors: 401 (no token), 404 (user deleted).**

### GET /api/v1/boards

Lists boards the caller can see: their personal boards plus every board
on a workspace they are an accepted member of. Ordered by created_at
ascending.

```json
[
  {
    "id": "uuid",
    "name": "My board",
    "workspace_id": null,
    "created_at": "...",
    "updated_at": "..."
  }
]
```

**This endpoint does not create a default board on read (unlike the in-app
`/api/boards`).**

### GET /api/v1/boards/:id

One board if the caller can see it. Errors: 404 for both "not found" and
"not yours".

### GET /api/v1/tasks

Lists tasks visible to the caller. Query parameters:

|   Param    |          Type                     |         Notes       |
|------------|-----------------------------------|---------------------|
|`board_id`  |  uuid                             |  filter to one board|
|`status`    | `todo` \| `doing` \| `done`       |   filter by status  |
|`category`  |  `work` \| `personal` \| `study`  |  filter by category |
|`priority`  |  `low` \| `medium` \| `high`      |   filter by priority|
|`limit`     | int                               | 1-200, default 50   |
|`offset`    |  int                              |  default 0          |

Order is `created_at DESC, id DESC` so pagination is stable.

```json
{
  "items": [
    {
      "id": "uuid",
      "title": "Ship v1",
      "description": null,
      "status": "todo",
      "category": "work",
      "priority": "high",
      "due_date": null,
      "board_id": "uuid",
      "column_id": "uuid",
      "assignee_id": null,
      "created_at": "...",
      "updated_at": "..."
    }
  ],
  "limit": 50,
  "offset": 0,
  "count": 1
}
```

Soft-deleted tasks are never returned.

### GET /api/v1/tasks/:id

One task. Errors: 404 if not found, soft-deleted, or not visible.

### POST /api/v1/tasks (Pro only)

Creates a task. Requires the `api.public.write` feature.

Request body (Zod-validated, `.strict()` so unknown fields are rejected):

```json
{
  "title": "Ship v1",               // required, 1-500 chars
  "description": "cut and ship",    // optional, <= 10000 chars
  "category": "work",               // optional
  "priority": "high",               // optional
  "due_date": "2026-01-01T00:00:00.000Z",  // optional, ISO
  "board_id": "uuid",               // optional
  "column_id": "uuid",              // optional (wins over board_id)
  "naturalLanguage": true           // optional, default true
}
```

If `naturalLanguage` is not `false`, the title is parsed by the NLP
service (dates, hashtags, priority keywords) and blank fields are filled
from the parse. Explicit values always win.

**Response:** `201` with the created task.

**Errors**:

- 400 on schema error, with { "error": "Invalid request body", "fields": {...} }

- 402 if not entitled to api.public.write

- 404 if the board or column is not visible to the caller

**Side effects:** an activity-log row, a socket broadcast, and one
`task.created` webhook delivery per subscribed endpoint.

### PUT /api/v1/tasks/:id (Pro only)

Partial update. Same field rules as `POST`, plus `status`. All fields
optional; at least one is required.

**Errors:** same shape as `POST`, plus 404 when the task does not exist or
is not owned by the caller.

### DELETE /api/v1/tasks/:id (Pro only)

Soft-deletes a task (sets `deleted_at`, does not remove the row).
Returns `{ "message": "Task deleted successfully" }`.

**Errors:** 404 if not found or already deleted.

## Outbound webhooks

Subscribe to task events. Every mutation pushes a signed HTTPS POST to
each active endpoint the user has registered. Webhooks are available on
the Pro tier (`api.public.write`).

### Events

|Event            |  Triggered by                                                             |
|-----------------|---------------------------------------------------------------------------|
|`task.created`   |    `POST /api/tasks`, `POST /api/v1/tasks`, `/tudu create                 |
|`task.updated`   |   any edit to title/description/category/priority/due_date/status/assignee|
|`task.moved`     |drag between columns, status change                                        |
|`task.deleted`   | soft delete                                                               |

Each endpoint subscribes to a subset of events at creation time. The
default is all four.

### Payload

```json
{
  "id": "<delivery-uuid>",
  "type": "task.created",
  "created_at": "2026-10-22T14:23:00.000Z",
  "data": {
    "task": {
      "id": "task-uuid",
      "title": "Ship v1",
      "status": "todo",
      "...": "..."
    }
  }
}
```

### Headers

**Every request carries:**

- `webhook-id` - the delivery UUID.

- `webhook-timestamp` - Unix seconds.

- `webhook-signature` - `v1,<base64-hmac>`.

- `user-agent` - `Tudu-Webhooks/1.0`.

### Signature

Signed content is:

```text
${webhook-id}.${webhook-timestamp}.${raw-body}
```

HMAC-SHA256 with the endpoint's secret (32 bytes hex, generated once at
endpoint creation). Result is base64-encoded and prefixed with `v1,`.

This is the [Standard Webhooks](https://www.standardwebhooks.com/)
scheme, so any Standard-Webhooks verifier works with no Tudu-specific
code.

### Retries

- 6 attempts total, spaced roughly 1 min, 5 min, 30 min, 2 h, 6 h,
12 h - exponential backoff with 10% jitter.

- Success is 2xx.

- After 6 failures the delivery is marked `dead`. It stays in
`webhook_deliveries` and can be requeued manually from Settings ->
Webhooks or `POST /api/webhooks/deliveries/:id/retry`.

- A "pause" toggle exists per endpoint. Paused endpoints are skipped
during delivery; the queue keeps ticking them but does not attempt.

### Verification example - Node

```js
import crypto from 'node:crypto';

const verify = (rawBody, headers, secret) => {
  const id = headers['webhook-id'];
  const ts = headers['webhook-timestamp'];
  const sig = headers['webhook-signature'];
  if (!id || !ts || !sig) return false;

  // Optional: reject replays older than 5 minutes.
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;

  const expected =
    'v1,' +
    crypto
      .createHmac('sha256', secret)
      .update(`${id}.${ts}.${rawBody}`)
      .digest('base64');

  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
```

### Verification example - Python

```python
import hmac, hashlib, base64, time

def verify(raw_body: bytes, headers: dict, secret: str) -> bool:
    wid = headers.get("webhook-id")
    ts  = headers.get("webhook-timestamp")
    sig = headers.get("webhook-signature")
    if not (wid and ts and sig):
        return False

    if abs(time.time() - int(ts)) > 300:
        return False

    to_sign = f"{wid}.{ts}.".encode() + raw_body
    expected = "v1," + base64.b64encode(
        hmac.new(secret.encode(), to_sign, hashlib.sha256).digest()
    ).decode()

    return hmac.compare_digest(expected, sig)
```

Always read the raw body bytes, not the parsed JSON. Express does
this on the receiving side because the Tudu webhook routes are mounted
with `express.raw({ type: 'application/json' })`. If you parse JSON
first, the signature will never match.

### Testing against localhost

Webhooks only POST to HTTPS URLs. For local testing:

- `ngrok` http 3000 and use the HTTPS URL it gives you.

- Or `cloudflared tunnel --url http://localhost:3000`.

- Or run a local HTTPS reverse proxy.

The webhook worker enforces the `https://` scheme at endpoint creation
time. If you insert a row directly into `webhook_endpoints` with an
`http://` URL, deliveries will still fire to it (this is what the
integration tests do) - do not rely on it in production.

### Managing endpoints

The in-app endpoints (not versioned under `/api/v1`, authenticated with
the user's JWT, not the personal access token) live at `/api/webhooks`:

- `/api/webhooks` - list

- `POST /api/webhooks` - create (returns the secret exactly once)

- `PUT /api/webhooks/:id` - pause or resume

- `DELETE /api/webhooks/:id` - delete

- `GET /api/webhooks/:id/deliveries` - last 50 attempts

- `POST /api/webhooks/deliveries/:id/retry` - requeue a dead delivery

The secret is generated on creation and cannot be retrieved again. If
you lose it, delete the endpoint and create a new one.
