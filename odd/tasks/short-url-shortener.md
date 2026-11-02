# ShortURL2 — URL shortener with owner-only analytics

Public link creation with guards, a single owner login for analytics, Docker deploy on Railway.
Stack: Next.js 16 App Router + TypeScript + PostgreSQL 16 (Drizzle) + Tailwind.
Design: warm editorial system in `design/system.md`; screens in `design/stitch/screens/*.html`.

## Specs

S1. `POST /api/links` `{ url }` → `201 { code, shortUrl, targetUrl, expiresAt }`.
Code is 7 chars `[0-9A-Za-z]`, unique, never reserved (`admin`, `login`, `api`, `_next`,
`favicon.ico`, `health`, `stats`, `go`, `links`). Non-http(s) or > 2048 chars → `400 { error }`
and no row is written.

S2. `GET /:code` → `302` to the target with `Cache-Control: no-store`, recording exactly one click.
Unknown → `404`, disabled → `410`, expired → `410`. None of those record a click.
Anonymous links whose first click is pending review go through `/go/:code` instead (S4).

S3. Creation is rate limited to 20 links per IP per hour, counted in Postgres with an atomic
upsert so the limit survives redeploys and works across replicas. Over the limit → `429 { error }`
and no row is written. The client IP comes from `X-Forwarded-For` only when `TRUST_PROXY=true`,
and only the last entry of that header.

S4. Anonymous links expire 30 days after creation (`expiresAt`). While a link is anonymous and has
no claimed owner, the first visit renders `/go/:code`: the destination, a warning, `Continuar` and
`Volver`. `Continuar` records the click and redirects. The interstitial exists to defeat blind
phishing and must never be skippable server-side without the click being recorded.

S5. If `SAFE_BROWSING_API_KEY` is set, `POST /api/links` checks the destination against Google
Safe Browsing before inserting and returns `400 { error }` when it is flagged. When the variable is
absent the check is skipped and the app still boots: no hard dependency on an external service.

S6. `POST /api/auth/login` with the owner password sets an `HttpOnly`, `SameSite=Lax` session
cookie valid 7 days, `Secure` when `BASE_URL` starts with `https://`. Wrong password → `401`
without distinguishing user from password. `POST /api/auth/logout` clears it.

S7. Every `/admin/**` page and every admin API without a valid session returns `401`, or redirects
to `/login` for pages. The public creation form and `/:code` stay open.

S8. `GET /api/links/:code/stats` → `{ code, targetUrl, totalClicks, clicksToday, bestDay,
{ date, count } }` with 30 consecutive zero-filled days, ascending, bucketed by `ANALYTICS_TZ`
(default `America/Argentina/Buenos_Aires`), plus `topDays` (3) and `activity` (first click,
last click, average per day).

S9. `GET /api/analytics?range=7|30|90` → aggregate for all links: `totalClicks`, the daily series for
that range, `topLinks` (5, with relative counts), `byWeekday` (7 values), and `comparison`
(best weekday, average clicks per link, links with zero clicks).

S10. `GET /api/links?q=&status=all|active|disabled&page=1&perPage=20` → paginated list with
`code, targetUrl, clicks, createdAt, status` plus `total` and `pageCount`. `q` matches code or URL.

S11. `DELETE /api/links/:code` soft-disables a link: redirects become `410`, history is preserved.
`PATCH /api/links/:code` with `{ status: "active" | "disabled" }` re-enables or disables it.

S12. `GET /api/health` → `200 { ok: true }`, no auth, no DB writes.

S13. The process boots from environment variables plus Postgres only: no filesystem writes and no
database access during `npm run build`.

S14. UI reproduces `design/stitch/screens/*.html` using one Tailwind component vocabulary from
`design/system.md`. Only the three font families and the eleven tokens; no hex outside `:root`;
no font size, radius or spacing value outside the declared scales.

S15. `/admin` is the status screen (today: clicks today, active links, last click, created today,
recent activity, top today). `/admin/analytics` is the trends screen (range selector, series, top
links, weekdays, comparison, CSV). The 30-day series appears only on analytics and on a link's
detail — never on `/admin`.

S16. There is no user model: no author or "created by" column anywhere, and no settings screen.
Configuration lives in environment variables.

## API contract for the UI

| Method | Path | Auth | Body / Query | Response |
| --- | --- | --- | --- | --- |
| POST | `/api/links` | public | `{ url }` | `201 { code, shortUrl, targetUrl, expiresAt }` |
| GET | `/:code` | public | — | `302` / `404` / `410` |
| GET | `/go/:code` | public | — | interstitial page |
| POST | `/api/auth/login` | public | `{ password }` | `204` + cookie / `401` |
| POST | `/api/auth/logout` | owner | — | `204` |
| GET | `/api/links` | owner | `?q&status&page&perPage` | `{ items, total, page, pageCount }` |
| PATCH | `/api/links/:code` | owner | `{ status }` | `200 { code, status }` |
| DELETE | `/api/links/:code` | owner | — | `200 { code, status }` |
| GET | `/api/links/:code/stats` | owner | — | stats shape in S8 |
| GET | `/api/analytics` | owner | `?range` | aggregate shape in S9 |
| GET | `/api/health` | public | — | `{ ok: true }` |

## Tasks

| ID | Task | Specs | Slice |
| --- | --- | --- | --- |
| T1 | Scaffold, compose, Drizzle, schema `links`/`clicks`, `/api/links` + `/:code` | S1, S2, S13 | 1 (done, restored) |
| T2 | Public creation guards: rate limit, expiry, Safe Browsing | S3, S4, S5 | 2 |
| T3 | Owner auth: bcrypt, signed cookie, guards | S6, S7 | 2 |
| T4 | Analytics: per-link stats and aggregate with range | S8, S9 | 3 |
| T5 | Index endpoints: search, filter, pagination, disable | S10, S11 | 3 |
| T6 | `/go/:code` interstitial | S4 | 3 |
| T7 | Tailwind system and the seven screens | S14, S15, S16 | 4 |
| T8 | Dockerfile, railway.json, `/api/health`, runbook | S12, S13 | 5 |

## Log

L1. "Quiero que me ayudes a crear una aplicacion para acortar urls y que tambien contenga analiticas"
L2. Persistence: "Postgres en Docker". L3. Auth: "Quiero que este abierta al publico pero que solo yo pueda aceder a las analiticas"
L4. Analytics: "Contador + timeline de clics". L5. "Quiero usar Next.js". L6. Docker on Railway.
L7. Deploy: "Si quiero que relices el deploy". L8. Info messages overlapped on screen 1.
L9. Design source mirrored into `design/shorturl2/` and later regenerated in Stitch.
L10. "no me gusta para nada el diseño creado" → warm editorial system, Tailwind, one vocabulary.
L11. Creation stays public but hardened: "Averigua como lo hacen otras webs" → Safe Browsing,
30-day expiry, interstitial, rate limit (S3–S5).
L12. Login is owner-only; no user model, so no "creado por" column (S16).
L13. "La ventana de Link parece ser un detalle de un enlace no un index" → index screen added (S10).
L14. Settings screen dropped; configuration via environment (S16).
L15. Roles split: "Panel = estado, Analíticas = tendencias" (S15).
L16. Code restored from the earlier verified scaffold instead of rewritten.
