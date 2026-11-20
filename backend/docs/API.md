# MADHU SMRUTI — API Reference

Base URL (dev): `http://localhost:5000`. Every route is mounted at **both**
`/api/...` (canonical) and `/api/v1/...` (frontend compatibility) — the two are
identical; examples below use `/api`.

All JSON responses share this envelope:

```json
{ "success": true, "message": "...", "data": { ... } }
```

Errors use `{ "success": false, "message": "...", "details": { ... } }` where
`details` holds Zod field errors for validation failures (HTTP 400).

---

## Public endpoints

### GET /api/health

Service + database health probe. No authentication.

**Response** `200`

```json
{
  "status": "ok",
  "service": "madhu-smruti-api",
  "version": "0.1.0",
  "environment": "development",
  "database": "connected",          // "connected" | "not_configured" | "error"
  "imagekit": "configured",         // "configured" | "not_configured"
  "uptimeSeconds": 120,
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

---

### POST /api/contributors

Registers contributor details. **Upserts on phone number**: registering again
with the same phone updates name/designation (HTTP 200) instead of creating a
duplicate (HTTP 201).

**Body**

| Field          | Type   | Required | Notes                                  |
| -------------- | ------ | -------- | -------------------------------------- |
| `name`         | string | yes      | 1–120 chars                            |
| `phone`        | string | yes      | Indian mobile — normalized to E.164 `+91XXXXXXXXXX` (accepts `98765 43210`, `09876543210`, `+919876543210`) |
| `designation`  | string | no       | ≤ 120 chars                            |

**Contributor reuse strategy**: the normalized mobile number is the natural
contributor key. Re-registering the same number updates name/designation
instead of creating a duplicate (HTTP 200 vs 201), so no account or OTP is
needed.

**Response** `201` (created) / `200` (updated)

```json
{ "id": "uuid", "name": "...", "phone": "...", "designation": "..." }
```

**Errors** `400` validation failed · `429` rate limited · `503` database down

---

### POST /api/submissions

Creates a **draft** submission. The response contains the raw **edit token**
exactly once — it is the only credential for later access (view/edit/finalize),
is shown to the contributor once, and only its SHA-256 hash is stored
server-side. It cannot be recovered.

**Body**

| Field            | Type   | Required | Notes                                            |
| ---------------- | ------ | -------- | ------------------------------------------------ |
| `contributorId`  | UUID   | yes      | id from `POST /api/contributors`                 |
| `title`          | string | yes      | 1–200 chars                                      |
| `subtitle`       | string | no       | max 200 chars (writeup subtitle)                 |
| `category`       | string | no       | max 80 chars (e.g. Reminiscence, Essay, Poem)    |
| `language`       | enum   | yes      | `english` \| `hindi` \| `odia`                   |
| `submissionType` | enum   | yes      | `writeup` \| `painting`                          |
| `writeup`        | object | if writeup | `{ editorJson, htmlContent }` — Tiptap doc JSON + rendered HTML |
| `painting`       | object | if painting | `{ imageUrl, imagekitFileId?, caption? }` — imageUrl must be an ImageKit URL from the upload endpoints |

A `writeup` submission requires `writeup` and rejects `painting` (and
vice-versa).

**Response** `201` — also used as **PUT** response.

```json
{
  "submission": {
    "id": "uuid",
    "referenceNumber": "MDRAFM-W-2026-0001",   // W = writeup, P = painting
    "submissionType": "writeup",
    "title": "...",
    "subtitle": "..." | null,
    "category": "..." | null,
    "language": "odia",
    "status": "draft",
    "createdAt": "...", "updatedAt": "...", "submittedAt": null,
    "contributor": { "id": "...", "name": "...", "phone": "+919876543210", "designation": "..." }
  },
  "editToken": "d1INSzIAA32w0xB5YpF2CE5F13Gl-XwJJMsqn2aadt4"
}
```

The client builds the contributor's **private resume link** from these values:
`<frontend>/resume/<id>?token=<editToken>`. The token is the only access
credential — it is shown once, stored server-side as a SHA-256 hash, and can
never be recovered.

**Errors** `400` validation / unknown contributor · `429` · `503`

---

### POST /api/submissions/verify-token

Cross-device draft access. The contributor pastes the **Draft Access Token**
that was shown once when the draft was saved. The server hashes it with
SHA-256, looks up the matching draft (unique index), and returns only the
submission id/summary — the raw token is never echoed back. Rate limited to
30 attempts / 15 min; all failures use the same generic message.

**Body** `{ "token": "<draft access token>" }`

**Response** `200`
```json
{ "submissionId": "...", "submission": { "id", "referenceNumber", "title", "status": "draft", "...": "..." } }
```

**Errors** `400` missing token · `401` invalid token or no longer a draft · `429` too many attempts

Use the returned id as `/submit?draft=<id>&token=<the pasted token>` in the
frontend; the existing token-guarded GET/PUT endpoints then load and update
the draft in place without duplicating it.

### GET /api/submissions/search?phone=...

Public "Track Article" search. Normalizes the Indian mobile number (accepts
`98765 43210`, `+91 98765 43210`, trunk prefixes) and returns lightweight
summaries of every submission for that contributor, most recent first.
**No edit credentials are included.** Rate limited.

**Response** `200`
```json
{ "submissions": [ { "id", "referenceNumber", "title", "submissionType", "language", "status", "createdAt", "updatedAt", "submittedAt" } ] }
```

### GET /api/submissions/track/:id?phone=...

Public read-only article view used when a contributor clicks a search result.
The phone number must belong to the contributor who owns the article. It opens
the article **without a token**, but never returns edit credentials, and all
mutation endpoints remain token-guarded. Rate limited.

**Response** `200` — full read-only detail (same shape as the private GET).
**Errors** `400` missing/invalid phone · `404` not found or phone mismatch

---

### GET /api/submissions/:id 🔒

Full submission detail. **Private**: requires the raw edit token or a
short-lived edit session. A phone number alone is **never** sufficient.

**Credential** — either:
- header `X-Edit-Token: <raw edit token | session token>`, or
- query string `?token=<raw edit token | session token>`

**Response** `200` — summary fields plus:

```json
{
  "writeup":  { "editorJson": { ... }, "htmlContent": "<p>...</p>", "updatedAt": "..." },  // writeup only
  "images":   [ { "id": "...", "imageUrl": "...", "caption": "...", "displayOrder": 0 } ], // painting only
  "history":  [ { "id": "...", "action": "created", "remarks": "...", "changedBy": "contributor", "createdAt": "..." } ]
}
```

The stored token hash is never included in any response.

**Errors** `401` missing/invalid token · `404` unknown id · `429` rate limited

---

### PUT /api/submissions/:id 🔒

Updates a draft. **Drafts only** — finalized (or otherwise non-draft)
submissions return `409`; an admin must reopen them via the status endpoint.
Requires an edit credential (see GET).

**Body** (at least one field required)

| Field          | Type   | Notes                                            |
| -------------- | ------ | ------------------------------------------------ |
| `title`        | string | 1–200 chars                                      |
| `subtitle`     | string | max 200 chars                                    |
| `category`     | string | max 80 chars                                     |
| `language`     | enum   | `english` \| `hindi` \| `odia`                   |
| `autosave`     | boolean | `true` for the editor's debounced autosave — the update is applied but **no `updated` history entry is recorded** (autosave is not an audit-worthy event). Manual saves/finalization still record history. |
| `writeup`      | object | `{ editorJson, htmlContent }` (writeup type only) |
| `painting`     | object | `{ imageUrl, imagekitFileId?, caption? }` (painting type only) |
| `contributor`  | object | `{ name?, phone?, designation? }` — updates the linked contributor; phone is normalized to `+91XXXXXXXXXX` |

**HTML sanitization**: `writeup.htmlContent` is sanitized server-side before
storage (allowlisted Tiptap vocabulary: headings, lists, blockquote, bold/italic/
underline/strike/code, links, text-style spans with `color`/`font-size`/
`text-align`, and the editor `figure` image node with caption, width and
left/center/right float). Script tags, event handlers, `javascript:` URLs and
unknown attributes are removed, so previews and administrative review always
render safe HTML. The Tiptap JSON (`editorJson`) is stored verbatim as JSONB and
is what the editor reconstructs drafts from.

**Response** `200` — full detail (as GET). Appends an `updated` history entry
unless `autosave` is `true`.

**Errors** `400` validation · `401` bad token · `404` · `409` not a draft

---

### POST /api/submissions/:id/finalize 🔒

Converts a draft into a **final** submission (`draft → submitted`). The status
update and the audit-history entry run inside a **single database transaction**.
Requires an edit credential.

**Response** `200` — full detail with `status: "submitted"`, `submittedAt` set.

**Errors** `401` · `404` · `409` already finalized

---

### POST /api/submissions/:id/resume 🔒

Verifies the private edit token and issues a **short-lived editing session**
(15-minute JWT bound to this submission id) so the browser doesn't keep the raw
token around. Requires an edit credential (the raw token itself).

**Response** `200`

```json
{
  "sessionToken": "eyJhbGci...",
  "expiresInSeconds": 900,
  "submission": { ...summary... }
}
```

The session token is used like an edit token (`X-Edit-Token` header) on
subsequent GET/PUT/finalize calls.

**Errors** `401` · `404` · `409` submission is not a draft

---

## Upload endpoints

### POST /api/uploads/sign

Generates **client-side upload authorization parameters** for ImageKit
(equivalent of a signed Cloudinary upload). Signature = `SHA1(token + expire + privateKey)`,
valid ~60 seconds.

**Response** `200`

```json
{
  "token": "hex", "expire": 1700000000, "signature": "sha1hex",
  "publicKey": "public key or null",
  "urlEndpoint": "https://ik.imagekit.io/... or null",
  "folder": "madhu-smruti/submissions"
}
```

**Errors** `503` when `IMAGEKIT_PRIVATE_KEY` is not configured · `429`

### POST /api/uploads/image

Server-side upload. `multipart/form-data` with field **`image`**; JPEG/PNG/WebP
only, max 5 MB. The image is streamed to ImageKit — binaries are never stored
in PostgreSQL (only URL + fileId references).

**Response** `201`

```json
{ "imageUrl": "https://ik.imagekit.io/...", "imagekitFileId": "...", "bytes": 12345, "format": "png" }
```

**Errors** `400` no file / bad type · `413` file > 5 MB · `502` ImageKit upload failed

---

## Admin endpoints

Admin authentication uses a JWT session in an **HTTP-only cookie**
(`admin_session`, SameSite=Strict, 8 h) plus a JavaScript-readable
**CSRF cookie** (`admin_csrf`). Every admin **state-changing** request must
echo the CSRF cookie value in the `X-CSRF-Token` header (double-submit
pattern). Login is rate-limited to 30 attempts / 15 min.

### POST /api/admin/login

**Body** `{ "email": "...", "password": "..." }`

**Response** `200` `{ "admin": { "id", "name", "email" } }` — sets both cookies.
Passwords are verified against bcrypt (cost 12); the same error/timing profile
is used whether or not the account exists.

**Errors** `400` validation · `401` invalid credentials · `429` too many attempts

### GET /api/admin/me 🔐

Lightweight session check for the dashboard route guard.

**Response** `200` `{ "admin": { "sub", "email", "name" } }`

### POST /api/admin/logout 🔐

Clears both cookies. Requires a valid session **and** CSRF header.

**Response** `200`

### GET /api/admin/dashboard 🔐

**Response** `200`

```json
{
  "totalContributors": 12,
  "totalSubmissions": 34,
  "totalDrafts": 3,
  "totalFinalSubmissions": 31,
  "pendingReviews": 2,
  "byStatus":  { "draft": 3, "submitted": 10, "under_review": 2, "approved": 17, "rejected": 2 },
  "byType":    { "writeup": 20, "painting": 14 },
  "recent":    [ { "id": "...", "referenceNumber": "...", "title": "...", "status": "...", "submissionType": "...", "createdAt": "...", "contributorName": "..." } ]
}
```

### GET /api/admin/submissions 🔐

Server-side paginated list — only one page is ever sent to the browser.
**Query params**: `page` (default 1), `limit` (default 20, max 100),
`status`, `submissionType`, `language`, `search` (title / reference / name),
`contributorName`, `phone`, `designation` (partial matches), `fromDate` and
`toDate` (`YYYY-MM-DD`, applied to creation date).

**Response** `200`

```json
{ "items": [ { "id", "referenceNumber", "title", "submissionType", "language", "status", "createdAt", "updatedAt", "submittedAt", "contributorName", "contributorPhone", "contributorDesignation" } ],
  "page": 1, "limit": 20, "total": 34, "totalPages": 2 }
```

**Errors** `400` invalid query params

### GET /api/admin/submissions/:id/images/:imageId/download 🔐

Streams the original painting image from ImageKit as a downloadable attachment
(`Content-Disposition: attachment`). The image is fetched server-side so the
private ImageKit configuration is never exposed.

**Errors** `401` no session · `404` image not found · `502` provider unavailable

### GET /api/admin/submissions/:id 🔐

Full detail (same shape as the public GET, including history).

**Errors** `404`

### PATCH /api/admin/submissions/:id/status 🔐

Approve, reject, set under review — or **reopen as draft**, which is the only
way a finalized submission becomes editable by its contributor again.
The update and audit entry run in one **transaction**. Requires CSRF header.

**Body** `{ "status": "draft"|"submitted"|"under_review"|"approved"|"rejected", "remarks": "optional ≤1000 chars" }`

**Response** `200` — full updated detail. History entry records `changedBy: <admin name>`.

**Errors** `400` validation · `401` no session · `403` CSRF mismatch · `404` · `409` unchanged status

### GET /api/admin/export 🔐

CSV export with contributor details. Accepts the same filters as the list
endpoint (pagination is ignored). Responds with `Content-Type: text/csv` and a
`Content-Disposition: attachment` header (UTF-8 BOM, quoted/escaped fields).

**Columns**: reference_number, title, submission_type, language, status,
contributor_name, contributor_phone, contributor_designation, created_at,
submitted_at.

---

## Security model summary

| Concern                  | Implementation                                                            |
| ------------------------ | ------------------------------------------------------------------------- |
| Validation               | Zod on every body and admin query; unknown/invalid → `400` with field errors |
| Security headers         | Helmet on all responses                                                    |
| CORS                     | Allow-list from `CORS_ORIGIN`, credentials enabled                         |
| Rate limiting            | Global 600/15 min · login 30/15 min · token-guarded routes 120/15 min      |
| Passwords                | bcrypt, cost 12                                                            |
| Admin session            | JWT in HTTP-only `admin_session` cookie, SameSite=Strict, 8 h              |
| CSRF                     | Double-submit `admin_csrf` cookie + `X-CSRF-Token` header on mutations     |
| Private submissions      | 256-bit random edit token; only SHA-256 hash stored; timing-safe compare   |
| Edit sessions            | 15-minute JWT issued by `/resume`, bound to a single submission            |
| Ownership                | Raw token or session required; **phone number alone never grants access**  |
| Final submissions        | Immutable to contributors; admins reopen via `PATCH .../status`            |
| Transactions             | Finalize and admin status changes update + audit atomically                |
| Images                   | ImageKit references only — no binaries in the database                     |
