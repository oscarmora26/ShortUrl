# ShortURL2 — URL shortener with click analytics

Public link creation, owner-only analytics, deployed with Docker on Railway.
Stack: Next.js (App Router) + TypeScript + PostgreSQL (Drizzle ORM).

## Specs

S1. `POST /api/links` with `{ url }` returns `201 { code, shortUrl, targetUrl }`.
Code is 7 chars from `[0-9A-Za-z]`, unique, never a reserved word
(`admin`, `login`, `api`, `_next`, `favicon.ico`, `health`, `stats`).
Non-http(s) or URL longer than 2048 chars returns `400 { error }` and creates no row.

S2. `GET /:code` returns `302` to `targetUrl` with `Cache-Control: no-store` and
records exactly one click. Unknown code returns `404`. Disabled code returns `410`.
A `404` or `410` records no click.

S3. Creation is rate limited to 20 links per IP per hour, counted in Postgres with an
atomic upsert so the limit survives redeploys and works across replicas.
Over the limit returns `429 { error }`. Rejected requests do not create rows.

S4. `POST /api/auth/login` with the owner password sets an `HttpOnly`, `SameSite=Lax`
session cookie valid 7 days, `Secure` when `BASE_URL` starts with `https://`.
Wrong password returns `401` without distinguishing user from password.

S5. Every `/admin/**` page and `GET /api/links/[code]/stats` without a valid session
returns `401` for API routes and redirects to `/login` for pages.

S6. `GET /api/links/[code]/stats` returns
`{ code, targetUrl, totalClicks, daily: [{ date, clicks }] }` with 30 consecutive
zero-filled days, ascending, bucketed by `ANALYTICS_TZ`
(default `America/Argentina/Buenos_Aires`).

S7. `GET /api/links` (owner) returns `code, targetUrl, createdAt, totalClicks`,
newest first.

S8. `DELETE /api/links/[code]` (owner) soft-disables the link: the redirect returns
`410` and historical clicks are preserved.

S9. `GET /api/health` returns `200 { ok: true }` with no auth and no DB writes.

S10. The process boots from environment variables plus Postgres only: no filesystem
writes, no database access during `npm run build`.

S11. UI must follow `design/shorturl2/export/*.png`. Tokens are the 12 colors in
`design/shorturl2/README.md`. Long text must wrap or truncate, never overflow:
the hero headline has a max width and wraps, and no text node overlaps another.

## Tasks

| ID | Task | Specs | Commit |
| --- | --- | --- | --- |
| T1 | Scaffold Next+TS, docker compose (db+app), Drizzle, single dev command | S10 | 1 |
| T2 | Schema, migration, URL validation, code generation | S1 | 1 |
| T3 | Create endpoint, redirect route, click recording, tests | S1, S2 | 1 |
| T4 | Postgres rate limit with atomic upsert | S3 | 2 |
| T5 | Session: bcrypt, signed cookie, login/logout, admin guard | S4, S5 | 2 |
| T6 | Analytics queries: total plus zero-filled daily series | S6 | 3 |
| T7 | Admin endpoints: stats, list, disable | S7, S8 | 3 |
| T8 | UI for the four designed screens | S11 | 4 |
| T9 | Dockerfile, railway.json, healthcheck, deploy runbook | S9, S10 | 5 |

## Log

L1. "Quiero que me ayudes a crear una aplicacion para acortar urls y que tambien contenga analiticas"

L2. Persistence decision: "Postgres en Docker"

L3. Auth decision: "Quiero que este abierta al publico pero que solo yo pueda aceder a las analiticas"

L4. Analytics scope: "Contador + timeline de clics"

L5. "Quiero usar Next.js"

L6. "Quiero utilizar docker para poder desplegar la aplicacion en Railway"

L7. "Si quiero que relices el deploy"

L8. "Los mensajes de la seccion de informacion de la primera pantalla esta uno encima del otro"

L9. Design sources live at `design/shorturl2/` (mirrored from the OpenPencil document).
The hero headline overflows and overlaps its subtitle in the export; the code must
give it a max width and real wrapping.
