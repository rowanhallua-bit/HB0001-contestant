# Bidd — Backend Progress

> **Read this file first at the start of every work session.** It is the single source of truth for what is done, what is in progress, and what is next.
> Source docs: `Bidd_Backend_Gameplan.md`, `vision.md`, `build.md` (in Rouan's Downloads).

**Date:** 2026-10-17 · **Submission:** 5:00 PM sharp · **Feature freeze:** 3:00 PM · **No merges to `main` after 4:15 without Rouan**

**Today's goal:** a working, deployed app where a student signs up with their school `.edu` email, verifies it with a one-time code, and sets up their account (campus is derived from the email, never chosen). Everything else stacks on top of that.

---

## Who owns what

| Person | Owns |
|---|---|
| **Rouan + Claude** | `backend/`: database, RLS, auth/verification, API routes, payments, QR, security, deploy |
| **Quinn** | `frontend/`: all real UI. Builds against the API contract in `backend/docs/API.md` |
| **Rowan** | Brand kit, seed content sheet, pitch, submission form |

---

## Architecture (decided)

```
BiddApp/
├── progress.md            ← this file
├── backend/               ← Next.js (App Router, TypeScript) — API only + a bare /dev test UI
│   ├── app/api/...        ← every business operation lives here
│   ├── app/dev/...        ← ugly test pages for us to click through (NOT the product UI)
│   ├── lib/supabase/      ← browser / server / admin (secret-key) clients, kept separate
│   ├── lib/contracts/     ← Zod schemas + TS types shared with Quinn
│   ├── lib/security/      ← rate limits, origin checks, auth guards
│   ├── supabase/migrations/  ← schema + RLS + functions (source of truth, no dashboard-only changes)
│   ├── supabase/seed.sql  ← synthetic demo data only
│   └── docs/              ← API.md (for Quinn), KEYS.md (setup), SECURITY.md
└── frontend/              ← Quinn's app (added by Quinn)
```

**How Quinn's frontend talks to the backend:**
- Frontend signs in through our API (`/api/auth/request-code`, `/api/auth/verify-code`). The backend returns the Supabase session.
- Every other call sends `Authorization: Bearer <access_token>`. The backend validates the token server-side on every request, then re-checks account status and campus membership in the database.
- Bearer tokens (not cookies) mean no CSRF surface and no cross-site cookie headaches. CORS only allows our own frontend origins.
- Quinn never gets the Supabase secret key. RLS is the real security boundary, so even a direct Supabase call from the browser can't read another campus's data.

**Security rules we never break:**
1. Campus comes from the **verified email domain** on the server. A `campus_id` in a request body is ignored.
2. Only exact allowlisted domains get in (`crimson.ua.edu` yes; `crimson.ua.edu.evil.com` no). Enforced at the Supabase Auth boundary (Before-User-Created hook), not just in the UI.
3. Every table has RLS on, deny by default. Secret key is only used server-side for privileged steps.
4. Prices, fees, seller, points, verification flags, roles are computed/owned by the server. Never trusted from the client.
5. No secrets in git, no secrets in chat. `.env.local` only; Vercel env vars for deploys.
6. Demo/impersonation login exists only when `DEMO_MODE=true` and never on the production deployment.
7. Badge reads **"School email verified"**, not "verified student".

---

## Task list

Status: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked (reason noted)

### Phase 0 — Setup (target: by ~12:00)
- [x] Plan written, `progress.md` created
- [x] `backend/` folder, `.gitignore`, `.env.example`, `docs/KEYS.md`, `docs/OVERVIEW.md` (big picture)
- [x] `backend/supabase/` initialized (`config.toml`: 6-digit codes, 10-min expiry, 60s resend; `migrations/` ready)
- [x] Git author set to Rouan for this repo
- [x] GitHub repo connected: https://github.com/rowanhallua-bit/HB0001-contestant (`main` pushed)
- [ ] **Rouan:** add Quinn as collaborator, turn on 2FA
- [x] **Rouan:** create Supabase project (`xanamvujsuckcypoaavd`), put keys in `backend/.env.local`
- [x] Scaffold Next.js 16 + TypeScript in `backend/`, `@supabase/supabase-js`, `zod` (`@supabase/ssr` dropped: Bearer tokens, no cookies)
- [x] `GET /api/health` works locally (reports env + database status)
- [!] Deploy skeleton to Vercel (root directory = `backend`) — **on hold**: Rouan's Vercel plan doesn't cover collaborative projects; testing locally for now

### Phase 1 — Sign-up, verification, account setup (P0, top priority, target: ~1:30)
- [~] Migration 001 written (`supabase/migrations/20261017130000_identity_and_campus.sql`): `campuses`, `campus_email_domains`, `profiles`, `campus_memberships`, `organizations`, `organization_memberships`, `audit_events`, `private.rate_limits` — RLS on everything, deny by default, SELECT-only policies. **Not applied yet** (paste into SQL editor)
- [~] Seed written (`supabase/seed.sql`): UA (crimson) + Ole Miss (red/blue), 4 domains, 8 chapters each. **Not applied yet**
- [~] Before-User-Created hook function `public.hook_before_user_created` written. **Rouan:** enable it in Auth → Hooks
- [ ] **Rouan:** email templates ("Magic Link" + "Confirm signup") show the code `{{ .Token }}`
- [x] `POST /api/auth/request-code` — normalize email, exact-domain check, rate limit, same response for new/existing accounts
- [x] `POST /api/auth/verify-code` — verify OTP, provision account, return session (+ `POST /api/auth/refresh`)
- [x] First verified login creates `profile` + `campus_membership` from the verified email (`provision_user`, service_role only)
- [x] `GET /api/me` — profile, campus + theme, memberships, "School email verified" badge
- [x] `POST /api/onboarding` — display name + chapter **request** (pending) · `GET /api/organizations` for the picker
- [x] `POST /api/auth/logout`
- [x] Rate limits on code requests/verification (per email + per IP, hashed buckets, Postgres counters, fail closed)
- [ ] Custom SMTP via Resend so codes reach real school inboxes  **← critical path, needs a domain**
- [~] Turnstile: `/dev` sends the token and the API passes it to Supabase. **Rouan:** turn on CAPTCHA in Supabase Attack Protection with the Turnstile secret
- [x] `/dev` test UI: email → code → me → onboarding → refresh/logout
- [x] Security tests written (`npm run test:security`): unsupported + look-alike domains, hook, wrong code, bad/tampered tokens, forged `campus_id`/role, cross-campus reads by ID, self-edits of role/campus/chapter status, privileged RPCs, anon reads, bad origin. Unit tests pass; security tests need the migration applied
- [x] `docs/API.md` auth section + shared Zod types in `lib/contracts/auth.ts` for Quinn

### Phase 2 — Listings & feed (target: ~2:15)
- [ ] Migration 002: `closets`, `listings`, `listing_media` (+ RLS: same-campus only, owner writes)
- [ ] Private Storage bucket, server-validated image upload (JPEG/PNG/WebP, size cap, EXIF strip), short-lived signed URLs
- [ ] `GET /api/listings` (filters: tags Rush/Bid Day/Gameday/Formal, cursor pagination), `GET /api/listings/:id`
- [ ] `POST /api/listings`, `PATCH /api/listings/:id`
- [ ] `POST /api/ai-listing` (Claude vision → editable draft, optional, per-user quota)
- [ ] Seed listings from Rowan's sheet

### Phase 3 — Buy + QR handoff (target: 3:00 freeze)
- [ ] Migration 003: `orders`, `inventory_reservations`, `payment_events`, `handoff_tokens`
- [ ] `POST /api/checkout` — server price + buyer fee (5% + $0.50), atomic reservation, Stripe sandbox Checkout (or clearly-labeled mock)
- [ ] `POST /api/stripe/webhook` — signature check, idempotent by event ID
- [ ] `POST /api/orders/:id/handoff-token`, `POST /api/handoffs/confirm` — one-time, seller-only, emits Cup event once
- [ ] Chapter closet access codes (hashed, rate-limited) + drops with per-size stock

### Phase 4 — Closet Cup & polish (3:00–4:00)
- [ ] `cup_events` + sanitized aggregate `GET /api/cup` (campus view + SEC view)
- [ ] Reports / block / remove listing basics
- [ ] Final security pass (RLS advisor, acceptance tests), production env check (no demo mode)

### Phase 5 — Ship (4:00–4:45)
- [ ] Final Vercel deploy, phone smoke test, both campus logins tested
- [ ] README for judges

---

## Decisions log
- **2026-10-17** — Backend is its own Next.js app in `backend/`; Quinn's UI in `frontend/` calls it with Bearer tokens.
- **2026-10-17** — Allowed domains to start: `crimson.ua.edu`, `ua.edu` (UA); `go.olemiss.edu`, `olemiss.edu` (Ole Miss). Any other `.edu` gets "your school isn't on Bidd yet". Adding a school = one row in `campuses` + rows in `campus_email_domains`.
- **2026-10-17** — Email OTP code (not magic links): school email scanners often "click" links and burn them.
- **2026-10-17** — One Supabase project for today (hackathon). Demo login gated by `DEMO_MODE` and off in production.

- **2026-10-17** — Vercel hosting on hold (plan doesn't support collaborative projects). Develop and test on `localhost:3000`; GitHub is for code only.
- **2026-10-17** — Local Node 22 on Rouan's machine via fnm + `node22.cmd` launcher (system Node 12 can't be removed without admin).

## Blockers / waiting on Rouan
- Apply migration 001 + seed in the Supabase SQL editor (the Supabase connector is signed in to a different account)
- Enable the Before-User-Created hook, switch email templates to `{{ .Token }}`, CAPTCHA secret if using Turnstile
- Quinn added as collaborator on the repo
- A domain for Resend (needed to email codes to real `.edu` inboxes) — see `backend/docs/KEYS.md`

## Session log
- **~11:30** — Read gameplan/vision/build. Wrote this plan, created `backend/` with keys guide and env template. Waiting on GitHub repo + Supabase keys to start Phase 0 scaffolding.
- Connected git to https://github.com/rowanhallua-bit/HB0001-contestant and pushed the plan to `main`. Next: Supabase keys → scaffold Next.js in `backend/`.
- **~11:50** — Commit author fixed to Rouan (history rewritten + force-pushed while repo was fresh). Created `backend/supabase/`, wrote `docs/OVERVIEW.md`. Waiting on Rouan's go-ahead on the big picture.
- **~1:30** — Backend skeleton built: Next.js 16 API, env validation, Supabase clients, CORS proxy, rate limits, auth guard, all Phase 1 routes, `/dev` page, migration 001 + seed, security + unit tests, `docs/API.md`. Typecheck + production build pass; `/api/health` OK against the real project (database `not_migrated` until the SQL is applied). Next: apply SQL → dashboard switches → `npm run test:security` → real code email test.
