# Bidd API (for the frontend)

Base URL: `http://localhost:3000` locally (Vercel URL later). All bodies are JSON. Shared Zod schemas and
TypeScript types live in [`lib/contracts/auth.ts`](../lib/contracts/auth.ts): copy or import them instead of
retyping shapes.

## Conventions

- **Auth:** after sign-in, send `Authorization: Bearer <accessToken>` on every call. No cookies.
- **Errors** always look like `{ "error": { "code": "school_not_supported", "message": "Bidd isn't at your school yet..." } }`.
  Show `message` to the user and branch on `code`.
- **CORS:** only origins in `FRONTEND_ORIGINS` (e.g. `http://localhost:3001`) may call the API from a browser.
- **The server owns the truth.** Campus, roles, prices, points and statuses are never taken from the client.
  Extra fields like `campus_id` in a body are ignored.
- **Tokens expire after 1 hour.** Refresh with `/api/auth/refresh` a little before `session.expiresAt` (Unix seconds).

## Sign-up / sign-in flow

1. `POST /api/auth/request-code` with the school email. The student gets a code by email.
2. `POST /api/auth/verify-code` with the email + code. You get a `session`.
3. `GET /api/me`. If `user.onboarded` is false, show onboarding.
4. `GET /api/organizations` for the chapter picker, then `POST /api/onboarding`.

New and returning students use the same two calls; there is no separate "sign up".

---

### `POST /api/auth/request-code`

```json
{ "email": "jdoe@crimson.ua.edu", "captchaToken": "<turnstile token, once CAPTCHA is on>" }
```

`200`
```json
{ "sent": true, "message": "Check your school inbox for a code. It expires in 10 minutes.",
  "campus": { "name": "The University of Alabama", "shortName": "Alabama" } }
```

| Status | `code` | When |
|---|---|---|
| 400 | `invalid_email` | Not a valid address |
| 400 | `school_not_supported` | Domain isn't an exact match for a Bidd campus (`crimson.ua.edu.evil.com` fails) |
| 400 | `captcha_failed` | Turnstile token missing/invalid (once CAPTCHA is enabled) |
| 429 | `rate_limited` | Too many requests, or asked again within 60 seconds |
| 503 | `email_delivery_unavailable` | Custom SMTP isn't set up yet |

Supported domains today: `crimson.ua.edu`, `ua.edu` (Alabama), `go.olemiss.edu`, `olemiss.edu` (Ole Miss).

### `POST /api/auth/verify-code`

```json
{ "email": "jdoe@crimson.ua.edu", "code": "123456" }
```

`200`
```json
{ "session": { "accessToken": "...", "refreshToken": "...", "expiresAt": 1792260000, "tokenType": "bearer" },
  "needsOnboarding": true }
```

Errors: `400 invalid_code` (wrong/expired), `429 rate_limited`, `403 school_not_supported`.

### `POST /api/auth/refresh`

```json
{ "refreshToken": "..." }
```
`200` → `{ "session": { ... } }` · `401 invalid_refresh_token` → send the user back to sign-in.

### `POST /api/auth/logout`  (Bearer)

`200` → `{ "ok": true }`. Drop the tokens client-side too.

### `GET /api/me`  (Bearer)

```json
{
  "user": { "id": "uuid", "email": "jdoe@crimson.ua.edu", "displayName": "Jamie", "role": "student", "onboarded": true },
  "campus": { "id": "uuid", "slug": "ua", "name": "The University of Alabama", "shortName": "Alabama",
              "conference": "SEC", "theme": { "name": "crimson", "primary": "#9E1B32", "secondary": "#828A8F", "accent": "#FFFFFF" } },
  "memberships": [ { "id": "uuid", "status": "pending", "role": "member", "requestedAt": "...",
                     "organization": { "id": "uuid", "name": "Kappa Delta", "kind": "sorority" } } ],
  "badges": [ { "id": "school_email_verified", "label": "School email verified" } ]
}
```

Theme the UI from `campus.theme`. Show the badge text exactly as given ("School email verified", not "verified student").

Errors: `401 unauthenticated` / `401 invalid_token` → sign in again; `403 account_suspended`.

### `GET /api/organizations`  (Bearer)

Chapters on the caller's campus only.
```json
{ "organizations": [ { "id": "uuid", "name": "Alpha Chi Omega", "nationalOrg": "Alpha Chi Omega", "kind": "sorority" } ] }
```

### `POST /api/onboarding`  (Bearer)

```json
{ "displayName": "Jamie", "organizationId": "uuid (optional)" }
```
`200` → `{ "ok": true, "chapterRequest": { "organizationId": "uuid", "status": "pending" } }`

Picking a chapter is a **request**: it shows as `pending` until an officer approves it. Can be called again to
change the display name.

Errors: `400 invalid_request` (name rules), `400 organization_not_found` (not a chapter on your campus),
`409 chapter_already_requested`.

### `GET /api/health`

`200 { "ok": true, "checks": { "env": "ok", "database": "ok" } }` or `503` with the failing check.

---

## Testing without the product UI

`http://localhost:3000/dev` is a bare click-through of the whole flow (hidden on the production deployment).
