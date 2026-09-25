#!/bin/sh
set -e

# Host part of DATABASE_URL: drop scheme, path, credentials, port and IPv6 brackets.
db_host=$(printf '%s' "$DATABASE_URL" | sed -E 's#^[a-z]+://##; s#/.*$##; s#^.*@##; s#:[0-9]+$##; s#^\[(.*)\]$#\1#')

# The default host "db" only exists when the bundled database is enabled, so this is
# also the "no database chosen" case.
if ! getent hosts "$db_host" >/dev/null 2>&1; then
  cat >&2 <<EOF
No database found at "$db_host". Choose one in a .env file next to docker-compose.yml:
  DATABASE_URL=postgresql://user:password@host:5432/compound   (your own Postgres)
  COMPOSE_PROFILES=bundled-db                                   (Postgres included with Compound)
Then run: docker compose up -d. See README → Install.
EOF
  exit 1
fi

# Migrations are additive and run on every start; if one fails the container
# exits instead of serving against an out-of-date schema.
prisma migrate deploy --schema=./prisma/schema.prisma || {
  echo "Couldn't set up the database. Check DATABASE_URL (user, password, database name) and that the user can create tables." >&2
  exit 1
}
exec node server.js
