# Compound

A calm, self-hosted viewer for your Trading 212 portfolio, with a long-term goal simulator. You run your own copy on your own machine, so your Trading 212 key is stored only there and only ever sent to Trading 212.

- **Dashboard:** your portfolio's total value, cash, invested amount and gain, plus every position. Updates every minute, or on demand.
- **Deposits:** how much you've put in and taken out, what it's grown to (overall and as a yearly rate), a chart of its value against what you've put in, and a month-by-month chart. Needs the History - Transactions permission.
- **Goal simulator:** how much to invest each month to reach a goal by a given age, with a chart you can adjust live and presets you can save. Compares the goal against what you actually deposit each month. Works without connecting Trading 212.
- **VUAG price** in the header, if you hold Vanguard's S&P 500 fund.
- **Key activity:** every call Compound makes to Trading 212 with your key, listed in Settings.

See [SECURITY.md](SECURITY.md) for how your key is protected.

---

## Install

You need Docker with Compose 2.24 or newer. Any Linux homelab, NAS, or a Raspberry Pi 4/5 works; images are published for `amd64` and `arm64`.

1. Make a folder and download `docker-compose.yml` into it:
   ```sh
   mkdir compound && cd compound
   curl -O https://raw.githubusercontent.com/Purdze/compound/main/docker-compose.yml
   ```
2. Choose a database by creating a `.env` file in that folder with **one** of these:
   - **A. Your own Postgres (13 or newer).** First create a user and database for Compound in it:
     ```sql
     CREATE USER compound WITH PASSWORD 'choose-a-long-password';
     CREATE DATABASE compound OWNER compound;
     ```
     Then put this in `.env`, with your Postgres host and the password you chose:
     ```
     DATABASE_URL=postgresql://compound:choose-a-long-password@your-postgres:5432/compound
     ```
     See [Reaching your Postgres](#reaching-your-postgres) for what to use as the host.
   - **B. No Postgres yet? Use the one included with Compound.** Put this in `.env`:
     ```
     COMPOSE_PROFILES=bundled-db
     ```
3. Start it:
   ```sh
   docker compose up -d
   ```
   If it doesn't come up, `docker compose logs app` says what's missing.
4. Open `http://<your-server>:3000` straight away and choose your name and a password.
5. Connect Trading 212. The next screen walks you through creating a key in the Trading 212 app. Turn on **Account data**, **Portfolio** and **History - Transactions**, and keep **Orders - Execute** and **Pies - Write** off. The other read-only permissions are optional; future versions of Compound can use them. You can skip this and do it later in **Settings**.

Whoever finishes setup first owns the install, so do step 4 right after starting Compound, before anyone else on your network could open it.

### Reaching your Postgres

Compound's container needs to reach your Postgres. Either:

- **Join your Postgres container's Docker network** (usual for homelabs). Find the network with `docker network ls`, then create `docker-compose.override.yml` next to `docker-compose.yml`, using that network's name:
  ```yaml
  services:
    app:
      networks: [default, homelab]
  networks:
    homelab:
      external: true
  ```
  In `DATABASE_URL`, use your Postgres container's name as the host, e.g. `@postgres:5432`. Compose reads the override file automatically, and updating Compound never touches it.
- **Or use your server's address** and the port Postgres is published on, e.g. `@192.168.1.10:5432`.

### Forgot your password

Run this in your `compound` folder:

```sh
docker compose exec app compound-reset-password
```

Then open Compound straight away. It shows the setup screen again, where you choose a new password. Your Trading 212 key, presets and history are kept, and every browser is signed out.

Lost a device that was signed in? **Settings → Password → Sign out everywhere else** signs out every other browser and device without changing your password.

---

## Updating

Your current version is shown at the bottom of **Settings**. When a new version is out, Compound shows a line under the header saying so, with a link to what changed. To update, run this in your `compound` folder:

```sh
docker compose pull && docker compose up -d
```

Your data, key and settings are kept. Any database changes apply automatically when the new version starts. [CHANGELOG.md](CHANGELOG.md) lists what changed in each version.

- **Pin a version** if you'd rather update deliberately: change `:latest` in `docker-compose.yml` to a version like `:1.2`, which gets fixes only, or `:1.2.0`.
- **Automatic updates:** if you already run [Watchtower](https://containrrr.dev/watchtower/), it will update Compound on its schedule like any other container.
- **Turn off the update check** in **Settings → Profile**. The check only asks GitHub for the latest version number and sends nothing about you.

---

## Backups

Back up two things, and keep them together:

| What                                         | Holds                                                                         | If you lose it                                                                                        |
| -------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| The `compound` database                      | Presets, activity log, your encrypted Trading 212 key, daily portfolio values | Re-add your key and presets; deposit history reloads from Trading 212, but past daily values are gone |
| `secrets.json` in the `compound-data` volume | The encryption key and session secret                                         | Your stored Trading 212 key can't be decrypted; remove and re-add it                                  |

**The database:** with your own Postgres, your existing database backups already cover it. With the bundled one:

```sh
docker compose exec db pg_dump -U compound compound > compound-$(date +%F).sql
```

**`secrets.json`:**

```sh
docker compose cp app:/data/secrets.json ./secrets.json.backup
```

Keep that file private. With it and a database backup, someone could decrypt your key.

### Restoring

Restore the database first: from your own Postgres backups, or for the bundled one:

```sh
docker compose stop app
docker compose exec -T db dropdb -U compound compound
docker compose exec -T db createdb -U compound compound
docker compose exec -T db psql -q -U compound -d compound -v ON_ERROR_STOP=1 < compound-2026-09-25.sql
```

Then `secrets.json`:

```sh
docker compose cp ./secrets.json.backup app:/data/secrets.json
docker compose start app
docker compose exec -u root app sh -c 'chown compound:compound /data/secrets.json && chmod 600 /data/secrets.json'
```

The `chown`/`chmod` line matters: `docker compose cp` leaves the file owned by root and readable by everyone in the container. Restore both from the same point in time; a database with a different `secrets.json` means re-adding your Trading 212 key.

---

## Configuration

Your name, password and update preference are set in the app, under **Settings**. Everything below goes in the `.env` file next to `docker-compose.yml` ([`.env.example`](.env.example) lists it all); run `docker compose up -d` again after changing it. If the database or one of Compound's own settings (`APP_URL`, the secrets) is wrong, Compound refuses to start and `docker compose logs app` says which.

| Variable                            | Default    | Description                                                                                                                                                                              |
| ----------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                      | none       | Your own Postgres. Set this **or** `COMPOSE_PROFILES`.                                                                                                                                   |
| `COMPOSE_PROFILES`                  | none       | `bundled-db` to use the Postgres included with Compound instead                                                                                                                          |
| `POSTGRES_PASSWORD`                 | `compound` | Bundled database only. Only the app container can reach it, so the default is fine. To use your own, set it **before the first start**: Postgres keeps its original password after that. |
| `APP_PORT`                          | `3000`     | Port Compound is served on                                                                                                                                                               |
| `APP_URL`                           | none       | Set to your `https://` address if you put Compound behind a reverse proxy with TLS. The sign-in cookie is then marked Secure.                                                            |
| `T212_BASE_URL`                     | live       | `https://demo.trading212.com/api/v0` for a practice account                                                                                                                              |
| `ENCRYPTION_KEY` / `SESSION_SECRET` | generated  | Supply your own secrets (32 bytes, base64) instead of the generated ones                                                                                                                 |

### Accessing it away from home

Compound is designed to stay on your home network. For access from outside, use a VPN like Tailscale or WireGuard rather than forwarding a port. If you do expose it, put it behind a reverse proxy with HTTPS and set `APP_URL`.

---

## Development

Requires [Bun](https://bun.sh) 1.3+ and Docker.

```sh
bun install
cp .env.example .env    # uncomment COMPOSE_PROFILES, and the dev DATABASE_URL and DATA_DIR at the bottom
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db
bunx prisma migrate dev
bun dev                 # http://localhost:3000
```

To run the whole thing from source in Docker:

```sh
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

| Command                                   | What it does                                            |
| ----------------------------------------- | ------------------------------------------------------- |
| `bun run typecheck`                       | `tsc --noEmit`                                          |
| `bun run lint`                            | ESLint                                                  |
| `bun run format`                          | Format everything with Prettier                         |
| `bun run format:check`                    | Report unformatted files (CI runs this)                 |
| `bun run test`                            | Unit tests                                              |
| `bunx prisma migrate dev --name <change>` | Create a migration after editing `prisma/schema.prisma` |

---

## Project layout

```
prisma/                      schema + migrations
scripts/                     compound-reset-password (installed in the image)
src/app/setup/               first-run setup screen
src/app/login/               sign-in
src/app/(app)/               dashboard, deposits, simulator, settings, connect Trading 212
src/app/api/                 route handlers (rate-limited, scoped to the owner)
src/middleware.ts            per-request Content-Security-Policy nonce
src/lib/guard.ts             sign-in, same-origin and rate-limit checks for API routes
src/lib/api.ts               request/response helpers: origin check, JSON body parsing and size limit
src/lib/setup.ts             owner record and first-run setup
src/lib/password.ts          scrypt password hashing
src/lib/session.ts           signed session cookie
src/lib/crypto.ts            AES-256-GCM seal/open for the Trading 212 key
src/lib/secrets.ts           generates and loads /data/secrets.json
src/lib/t212/                Trading 212 client (server-only), parsing, caching, transaction sync, daily value snapshots
src/lib/deposits.ts          deposit totals, monthly figures, return and yearly rate
src/lib/updates.ts           new-version check against GitHub Releases
.github/workflows/           CI and tagged releases to GHCR
```

---

## License

[GNU General Public License v3.0 or later](LICENSE). You can use, change and share Compound freely; if you distribute a modified version, it must stay under the same license with its source available.
