# Deploy

The app ships as a Docker image (`Dockerfile`, multi-stage, Next `standalone`) and is meant for
Railway with the Postgres plugin. `railway.json` wires the build, the migration and the healthcheck.

## Railway, step by step

1. **New project → Deploy from GitHub repo.** Railway builds with the Dockerfile; `railway.json`
   sets the builder, the pre-deploy command and the healthcheck path.
2. **Add the Postgres plugin.** Railway injects `DATABASE_URL`; do not set it by hand.
3. **Variables** (Project → Variables):

   | Variable | Required | Value |
   | --- | --- | --- |
   | `DATABASE_URL` | yes | injected by the Postgres plugin |
   | `ADMIN_PASSWORD_HASH` | yes | bcrypt hash of the owner password |
   | `SESSION_SECRET` | yes | 48 random bytes, base64 |
   | `BASE_URL` | yes | the public origin, e.g. `https://shorturl2.up.railway.app` |
   | `TRUST_PROXY` | **yes: `true`** | see below |
   | `ANALYTICS_TZ` | no | defaults to `America/Argentina/Buenos_Aires` |
   | `SAFE_BROWSING_API_KEY` | no | when absent the destination check is skipped |

4. **Deploy.** `preDeployCommand` runs `node scripts/migrate.mjs` before the new container takes
   traffic, and `/api/health` gates the rollout.
5. **Set `BASE_URL` before the first login.** The session cookie is `Secure` only when `BASE_URL`
   starts with `https://`; get this wrong and login silently fails.

## Generating the two secrets

```powershell
# bcrypt hash of the owner password (asks nothing, prints the hash)
node -e "console.log(require('bcryptjs').hashSync(process.argv[1], 10))" "tu-password"

# session secret
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Never commit either of them. There is no `.env.example` because the file-write policy blocks `.env*`
paths; this table is the contract instead.

## Why `TRUST_PROXY=true` is not optional

The client IP used by the rate limiter comes from `X-Forwarded-For`, and only when `TRUST_PROXY` is
enabled, and only from the last entry of that header. Without it every request is bucketed as
`unknown`, so the whole world shares one limit of 20 links per hour. With it, the limit is per client.
Never enable it when the app is exposed directly without a proxy: the header would be forgeable.

## Local development

```powershell
npm install
npm run dev          # compose db up -> migrate -> next dev
npm test             # vitest against the compose Postgres (TEST_DATABASE_URL)
```

The test suite uses the `shorturl_test` database on the same server. `DB_PORT` moves both the
compose mapping and the tests (this machine keeps 5432 occupied, so use `DB_PORT=5435`).

## Migrations

`scripts/migrate.mjs` applies `drizzle/*.sql` in journal order and keeps its own `_migrations`
ledger, using `pg` only — Drizzle's migrator subpath is not part of the traced standalone bundle.
It is idempotent, so it runs on every deploy. Locally you still use `npm run db:migrate`, which is
Drizzle's own migrator and keeps a different ledger (`drizzle.__drizzle_migrations`); do not mix
both against the same database manually.

## Known limitations of this build

- **Clicks created today** are counted over the 20 newest links, so past 20 same-day creations the
  number can undercount. Fixing it needs a small aggregate query.
- **`/admin` recent activity** is derived from each link's last click, which is one stats query per
  link (20 on that page). A click-event feed would be cheaper.
- **CSV export** serialises what the page already shows, so `/admin/links` exports the current page.
- **Safe Browsing fails open**: if Google returns an error or times out (4s), the link is created.
  The alternative makes link creation depend on an external service.
