# XC Media Pass — Self-Hosted Backend

Self-hosted backend for the **XC Media Pass** app (Xzavain Cloud): Node 20 + Express + SQLite
(`better-sqlite3`). It serves the Vite/React frontend from `dist/` and exposes a generic
entity API driven by the schemas in `base44/entities/*.jsonc`, with server-side row-level
security (RLS), auth, file uploads, and admin user management.

No demo or seed data is created — the database starts empty (apart from your admin user).

## Screenshots

| | |
|---|---|
| ![Sign-in screen](docs/screenshots/login.jpg) | ![Admin dashboard](docs/screenshots/admin-dashboard.jpg) |
| Branded sign-in with email + password | Admin Hub overview: stream stats, connected servers, live activity |
| ![Billing calendar](docs/screenshots/billing-calendar.jpg) | ![Media servers](docs/screenshots/servers.jpg) |
| Upcoming renewals, intake projections and MRR | Connected media server fleet with status and telemetry |
| ![Customer dashboard](docs/screenshots/customer-dashboard.jpg) | |
| Customer portal home | |

## Quick start

```bash
cp .env.example .env        # set ADMIN_EMAIL / ADMIN_PASSWORD
npm install
npm run build               # builds the frontend into dist/
npm start                   # serves API + frontend on PORT (default 3000)
```

Open `http://localhost:3000`. On first boot, if the `users` table is empty and
`ADMIN_EMAIL`/`ADMIN_PASSWORD` are set, an admin account is created automatically
(see "First admin" below).

## Environment

| Variable            | Default | Description                                                        |
|---------------------|---------|--------------------------------------------------------------------|
| `PORT`              | `3000`  | HTTP port                                                          |
| `ADMIN_EMAIL`       | —       | Email for the first-boot admin (only used when `users` is empty)   |
| `ADMIN_PASSWORD`    | —       | Password for the first-boot admin (only used when `users` is empty)|
| `DATA_DIR`          | `./data`| Directory for `xcmediapass.db` and `uploads/`                      |
| `DB_PATH`           | —       | Override the full SQLite path (defaults to `$DATA_DIR/xcmediapass.db`) |
| `VITE_TMDB_API_KEY` | —       | Build-time key for the frontend TMDB discovery layer               |

## First admin

1. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` **before** the first start.
2. Start the server once. The admin user (role `admin`) is created with a
   scrypt-hashed password.
3. Log in, then change the password. You can remove the two variables from
   `.env` afterwards — they are ignored once any user exists.

Additional admins/staff/customers: `POST /api/users/invite` (admin-only) with
`{email, role}` returns an `invite_url` containing a one-time temporary
password.

## API overview

Auth uses Bearer tokens (`Authorization: Bearer <token>`), issued at login,
valid for 30 days, revocable via logout.

| Method & path                          | Description                                                        |
|----------------------------------------|--------------------------------------------------------------------|
| `POST /api/auth/login`                 | `{email, password}` → `{token, user}` (401 on bad credentials)     |
| `GET /api/auth/me`                     | Current user (401 without a valid token)                           |
| `POST /api/auth/logout`                | Invalidate the current token                                       |
| `POST /api/users/invite`               | Admin-only. `{email, role}` → `{invite_url, temp_password, ...}`   |
| `GET /api/entities/:name`              | List. `?filter=` JSON, `?sort=-created_date,subject`, `?limit=&offset=` |
| `GET /api/entities/:name/:id`          | Get one (404 unknown entity/id)                                    |
| `POST /api/entities/:name`             | Create (400 on missing required fields)                            |
| `PUT /api/entities/:name/:id`          | Update                                                             |
| `DELETE /api/entities/:name/:id`       | Delete                                                             |
| `POST /api/entities/:name/aggregate`   | `{groupBy, sum}` → `{rows: [{<groupBy>, "sum_<field>"}]}`           |
| `POST /api/entities/:name/bulk`        | Create many (array → array, all-or-nothing)                        |
| `PUT /api/entities/:name/bulk`         | Update many (array of `{id, ...}` → array, all-or-nothing)          |
| `DELETE /api/entities/:name?filter=`   | Delete all matching filter → `{deleted: n}`                        |
| `POST /api/uploads`                    | `{filename, content_base64}` → `{file_url: "/uploads/..."}`        |
| `GET /uploads/*`                       | Static file serving from `data/uploads/`                           |
| `GET /api/settings/public`             | `{configured: true, brand: {...}}`                                 |
| `GET /api/apps/public/*`               | Legacy bootstrap stub → `{configured: false, ...}` (never crashes) |
| `GET /api/health`                      | `{ok: true}`                                                       |

The built-in **`User`** entity is served from the `users` table at
`/api/entities/User`: list is admin-only, get/update are admin-or-self,
create always returns 403 ("use `POST /api/users/invite`"), delete is
admin-only. Non-admin updates silently drop `role`/`disabled` instead of
failing. `password_hash` is never returned.

### List filter operators

`?filter=` takes a JSON object. Field conditions support plain equality plus
`$eq $ne $in $nin $contains $gte $lte $gt $lt $exists $regex` (with sibling
`$options: "i"` for case-insensitive regex), and `$or` / `$and` combinators:

```
?filter={"status":"open","$or":[{"priority":"urgent"},{"csat_score":{"$lt":3}}]}
?filter={"raw_product_name":{"$regex":"plex","$options":"i"}}
?filter={"category_id":{"$exists":false}}
```

`?sort=-created_date,subject` sorts descending by `created_date`, then ascending
by `subject`. Default `limit` is 100 (max 1000).

### Uploads

`POST /api/uploads` accepts `{filename, content_base64}`. Allowed extensions:
`png jpg jpeg gif webp svg pdf`. Decoded files are capped at 10 MB (HTTP 413
above that). Files are stored under `data/uploads/<uuid>_<sanitized-name>` and
served at the returned `file_url`.

## RLS (row-level security)

Each entity schema declares an `rls` block with `create/read/update/delete`
rules, enforced **server-side** on every request:

- `null` — public (passes even without authentication).
- `{user_condition: {role}}` — the user's role must match (`role` may be a
  string or list; `admin` always passes role checks).
- `{"data.<field>": "{{user.id}}"}` / `"{{user.email}}"` — record ownership;
  array fields are checked by membership.
- `$or` / `$and` — nestable combinators.

List endpoints return only records the requester may read; single-record
reads/updates/deletes return 401 (unauthenticated) or 403 (forbidden) when the
rule fails; creates auto-fill `created_by` with the acting user's id. Entities
without an `rls` block default to admin-only.

## Database

On boot, one table is created per entity schema (`id TEXT PRIMARY KEY`,
`created_date`, `updated_date`, `created_by`, plus one column per property:
string/date/enum → `TEXT`, number → `REAL`, integer/boolean → `INTEGER`,
array/object → `TEXT` holding JSON), plus `users` and `sessions` tables. The
`User` entity is virtualized onto `users` and gets no separate table.

Passwords are hashed with `node:crypto` scrypt (`scrypt$salt$hash`).

## Deploy with Coolify

Self-host in a few clicks. You need a Coolify instance connected to your server.

**Option A — from this Git repo (recommended)**
1. In Coolify: **Projects → your project → Add → Service → Docker Compose**, and point it at this repository.
2. **Environment variables** — add:
   - `ADMIN_EMAIL` = your email (required — creates the first admin on boot)
   - `ADMIN_PASSWORD` = a strong password (required — change it after first login)
   - `VITE_TMDB_API_KEY` = your TMDB key (optional — enables discovery; must be set as a **build-time** variable so `npm run build` bakes it into the frontend)
3. **Persistent storage** — the compose file already declares the `xcmp-data` volume mounted at `/app/data` (SQLite database + uploads). In Coolify's service → **Storages**, confirm a persistent volume is attached at `/app/data`.
4. Click **Deploy**. The healthcheck hits `/api/health`; Coolify shows the service healthy when it responds.
5. Open the app URL and sign in with the admin email/password from step 2. No demo data is seeded — the database starts empty.

**Option B — plain Docker Compose**
```bash
cp .env.example .env        # then set ADMIN_EMAIL / ADMIN_PASSWORD inside .env
docker compose up -d --build
# open http://localhost:3000 and sign in
```

- The image builds the frontend (`npm run build`) and serves everything from one process on port 3000.
- Persist the data volume — it holds the SQLite database and uploads.
