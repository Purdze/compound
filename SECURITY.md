# Security

Compound is single-user and self-hosted. Each person runs their own copy, so their Trading 212 key only ever lives on hardware they control. This document explains how that key is protected and what to do if something goes wrong.

## How your API key is stored

Trading 212 authenticates with an **API key and API secret** pair. Compound stores both together, encrypted.

- **Algorithm:** AES-256-GCM (authenticated encryption), using Node's built-in `crypto` module.
- **What's encrypted:** the JSON `{ key, secret }`. Nothing about the key is stored in plaintext.
- **Per-record IV:** a fresh random 12-byte IV for every save.
- **Integrity:** the 16-byte GCM tag is stored with the ciphertext. Any change to it makes decryption fail instead of returning garbage.
- **Bound to its owner row:** the owner id is authenticated as additional data.
- **Encryption key:** 32 random bytes generated on first start and saved to `secrets.json` in the `compound-data` volume, readable only by the app's user (mode `0600`). It is never stored in the database or the image. You can supply your own via `ENCRYPTION_KEY` instead.

Keeping the encryption key in a different volume from the database means a leaked database backup on its own exposes no keys.

## How your API key is used

- Keys are decrypted **server-side only**, in one module (`src/lib/t212/client.ts`), at the moment a Trading 212 request is made. That module is marked `server-only`, so importing it from browser code fails the build.
- The browser never talks to Trading 212, and no page or API response contains key material. Settings only shows "Connected", when the key was added and when it was last used.
- Trading 212 errors are mapped to fixed messages. Request headers and upstream response bodies are never logged or returned.
- Every call made with your key is recorded (time, endpoint, HTTP status; never the key) and shown under **Settings → Key activity**.

## Setup and signing in

- **First visitor claims the install.** Until setup is finished, anyone who can reach Compound can complete it and become the owner. Finish setup right after starting Compound, and right after a password reset. Once a password exists, setup is closed; two simultaneous setups can't both succeed.
- **Password.** Chosen during setup and stored as a salted scrypt hash in the database (OWASP settings: N=2^17, r=8, p=1), never in plain text. Checks are constant-time. The stored hash records its settings, and a hash made with older settings is upgraded automatically at the next sign-in.
- **Session.** A successful sign-in sets an HttpOnly, SameSite=Lax cookie signed with HMAC-SHA256. It's also Secure when `APP_URL` is `https://`, and lasts 30 days. The signature covers the stored password hash, so **changing or resetting the password signs out every other browser.** **Settings → Password → Sign out everywhere else** does the same without changing the password.
- **Failed sign-ins are limited to 10 per 15 minutes across the whole install.** Compound doesn't trust client-supplied headers like `X-Forwarded-For` to tell clients apart, since an attacker could fake them to get unlimited guesses. The trade-off: someone who can reach Compound can lock you out for 15 minutes by guessing wrong on purpose.
- **Requests from other sites are refused.** Browsers treat other ports on the same host (e.g. another homelab app) as the same site, so the cookie alone doesn't stop them. Every request that changes something must come from Compound's own pages, checked with the browser's `Sec-Fetch-Site` header, or `Origin` on older browsers.
- Request bodies must be JSON and at most 16 KB.
- Every API route except health, sign-in and setup requires a signed-in session, and all of them are rate-limited.
- A forgotten password is reset from the server with `docker compose exec app compound-reset-password`, which needs shell access to the server.

## Other protections

- A strict Content-Security-Policy with a fresh nonce per page: only scripts Compound itself rendered can run (`script-src 'nonce-…' 'strict-dynamic'`), plus `connect-src 'self'`, `object-src 'none'` and `frame-ancestors 'none'`. Also `X-Frame-Options: DENY`, `nosniff`, and a restrictive referrer policy.
- The container runs as a non-root user.
- **Your own Postgres:** Compound's data lives in your database, so your Postgres access controls and backups apply. Give Compound its own user that owns only the `compound` database. `DATABASE_URL` in `.env` contains that user's password, so keep `.env` private.
- **Bundled Postgres:** it isn't published outside the compose network, which is why its default password (`compound`) is acceptable. Anything that can join that Docker network could use it. To guard against that, set your own `POSTGRES_PASSWORD` in `.env` before the first start.
- The only outbound requests are to Trading 212 and, unless you turn it off in Settings, one request to GitHub every 12 hours for the latest version number.

## Threat model in brief

| If someone obtains…                                          | They get                                                                                                                                                |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A database backup only                                       | Presets, activity history, and your deposit and withdrawal history (dates and amounts), and your portfolio's value each day. Your key stays encrypted.  |
| `secrets.json` only                                          | Nothing useful on its own                                                                                                                               |
| Both the database and `secrets.json`, or root on your server | Your decryptable key. With a **read-only** key they can see your portfolio but can't trade or withdraw. This is why Compound insists on read-only keys. |
| Your Compound password                                       | The Compound interface, including removing or replacing your key. The key itself is never displayed.                                                    |

Anyone with root on the machine running Compound can read anything it can. Only run it on hardware you trust.

## If you suspect your key was compromised

1. **Revoke the key in Trading 212 first:** at [app.trading212.com](https://app.trading212.com/) open API (Beta) (in the mobile app it's under Settings) and delete the key. This is what actually cuts off access.
2. In Compound, go to **Settings → Trading 212 API key → Remove key**.
3. Check your Trading 212 account activity for anything unexpected.
4. Create a new key with Account data and Portfolio turned on and **Orders - Execute** and **Pies - Write** off, and add it again.
5. If you think the server itself was exposed, also rotate Compound's secrets:
   - Delete the generated secrets: `docker compose exec app rm /data/secrets.json`.
   - Restart with `docker compose up -d --force-recreate app`. New secrets are generated and every browser is signed out.
   - Change your password in **Settings → Password**.
   - Re-add your new key, since the old stored one can no longer be decrypted.

## Reporting a vulnerability

Open a private security advisory on the GitHub repository (Security → Report a vulnerability) rather than a public issue.
