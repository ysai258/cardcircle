#!/usr/bin/env bash
#
# Deploy CardCircle to Vercel.
#
# Run this AFTER `vercel login`. It is safe to re-run: it skips anything
# already configured.
#
#   bash scripts/deploy.sh
#
# Secrets are read from a prompt or generated locally and piped straight into
# Vercel. Nothing sensitive is echoed to the terminal or written to disk.

set -euo pipefail

cd "$(dirname "$0")/.."

info()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn()  { printf '\033[1;33m!!\033[0m  %s\n' "$*"; }
fail()  { printf '\033[1;31mxx\033[0m  %s\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------------------
# 1. Preconditions
# ---------------------------------------------------------------------------
command -v vercel >/dev/null || fail "Vercel CLI not found. Run: npm i -g vercel"

if ! vercel whoami >/dev/null 2>&1; then
  fail "Not logged in to Vercel. Run 'vercel login' first, then re-run this script."
fi

info "Logged in to Vercel as $(vercel whoami 2>/dev/null | tail -1)"

# ---------------------------------------------------------------------------
# 2. Link the project
# ---------------------------------------------------------------------------
if [ ! -f .vercel/project.json ]; then
  info "Linking this directory to a Vercel project..."
  vercel link --yes
else
  info "Already linked to a Vercel project."
fi

# ---------------------------------------------------------------------------
# 3. Database URL
#
# Read with -s so the connection string (which contains a password) never
# appears on screen or in shell history.
# ---------------------------------------------------------------------------
if vercel env ls production 2>/dev/null | grep -q "DATABASE_URL"; then
  info "DATABASE_URL already set in Vercel production."
  printf 'Paste it again so migrations can run locally (input hidden): '
  read -rs DATABASE_URL
  echo
else
  cat <<'EOF'

  Paste your Neon POOLED connection string.

  Find it at console.neon.tech -> your project -> Connection Details,
  with "Pooled connection" enabled. It looks like:

    postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require

  The pooled endpoint matters: serverless functions open many short-lived
  connections and would exhaust a direct endpoint.

EOF
  printf 'DATABASE_URL (input hidden): '
  read -rs DATABASE_URL
  echo
fi

[ -n "${DATABASE_URL:-}" ] || fail "No DATABASE_URL provided."
case "$DATABASE_URL" in
  postgres://*|postgresql://*) ;;
  *) fail "That does not look like a Postgres connection string." ;;
esac
case "$DATABASE_URL" in
  *-pooler.*) ;;
  *) warn "This does not look like a POOLED endpoint. Serverless functions may exhaust connections." ;;
esac

export DATABASE_URL

# ---------------------------------------------------------------------------
# 4. Environment variables
# ---------------------------------------------------------------------------
if ! vercel env ls production 2>/dev/null | grep -q "DATABASE_URL"; then
  info "Setting DATABASE_URL in Vercel (production)..."
  printf '%s' "$DATABASE_URL" | vercel env add DATABASE_URL production
fi

if vercel env ls production 2>/dev/null | grep -q "APP_MASTER_KEY"; then
  info "APP_MASTER_KEY already set — leaving it alone."
  warn "Never rotate this key casually: every stored phone number and expiry"
  warn "date becomes undecryptable and phone lookup stops working."
else
  info "Generating a fresh 32-byte APP_MASTER_KEY for production..."
  # Generated here and piped straight to Vercel. It is never printed, and
  # never written to a file. It is deliberately DIFFERENT from development.
  node -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64'))" \
    | vercel env add APP_MASTER_KEY production
  info "Production key set. It differs from your development key, by design."
fi

# ---------------------------------------------------------------------------
# 5. Migrations
#
# Run before deploying, so the first request never hits a missing table.
# ---------------------------------------------------------------------------
info "Applying migrations to the production database..."
npx tsx scripts/migrate.ts

# ---------------------------------------------------------------------------
# 6. Deploy
# ---------------------------------------------------------------------------
info "Building and deploying to production..."
DEPLOY_URL=$(vercel deploy --prod --yes 2>&1 | tee /dev/stderr | grep -oE 'https://[a-zA-Z0-9.-]+\.vercel\.app' | tail -1)

echo
if [ -n "$DEPLOY_URL" ]; then
  info "Deployed: $DEPLOY_URL"
  echo
  echo "  Share that link. Your friends sign up with their mobile number"
  echo "  and a password — there is no OTP, so nothing costs you anything."
  echo
  warn "The production database is EMPTY and must stay that way:"
  warn "'npm run db:seed' truncates every table and refuses to run when"
  warn "NODE_ENV=production. Never point it at this database."
else
  warn "Could not parse the deployment URL. Check the output above."
fi
