#!/usr/bin/env bash
#
# Deploy CardCircle to Vercel.
#
#   vercel login          # once, interactive
#   bash scripts/deploy.sh
#
# Safe to re-run: every step is idempotent.
#
# This script is deliberately NON-INTERACTIVE. An earlier version prompted
# for the database URL with `read -rs`, which breaks anywhere stdin is not a
# terminal (CI, an agent shell, a pipe) — `read` sees EOF and the script dies
# before configuring anything. Secrets now live in Vercel's own environment
# store, entered once in the dashboard, and are pulled from there.

set -euo pipefail

cd "$(dirname "$0")/.."

info() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!!\033[0m  %s\n' "$*"; }
fail() { printf '\033[1;31mxx\033[0m  %s\n' "$*" >&2; exit 1; }


# ---------------------------------------------------------------------------
# 1. Preconditions
# ---------------------------------------------------------------------------
command -v vercel >/dev/null || fail "Vercel CLI not found. Run: npm i -g vercel"

vercel whoami >/dev/null 2>&1 \
  || fail "Not logged in. Run 'vercel login', then re-run this script."

info "Logged in as $(vercel whoami 2>/dev/null | tail -1)"

if [ ! -f .vercel/project.json ]; then
  info "Linking this directory to a Vercel project..."
  vercel link --yes
fi

# ---------------------------------------------------------------------------
# 2. Master key
#
# Generated locally and piped straight into Vercel. Never printed, never
# written to disk, and deliberately different from the development key.
# ---------------------------------------------------------------------------
ENV_LIST=$(vercel env ls production 2>/dev/null || true)

if grep -q "APP_MASTER_KEY" <<<"$ENV_LIST"; then
  info "APP_MASTER_KEY already set."
  warn "Never rotate it casually: every stored phone number and expiry date"
  warn "becomes undecryptable and phone lookup stops working."
else
  info "Generating APP_MASTER_KEY for production..."
  node -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64'))" \
    | vercel env add APP_MASTER_KEY production
fi

# ---------------------------------------------------------------------------
# 3. Database URL
#
# Entered in the dashboard rather than here, so the credential goes from the
# Neon tab to the Vercel tab without passing through a terminal or a shell
# history file.
# ---------------------------------------------------------------------------
if ! grep -q "DATABASE_URL" <<<"$ENV_LIST"; then
  PROJECT=$(node -e "process.stdout.write(require('./.vercel/project.json').projectName)" 2>/dev/null || echo cardcircle)
  cat <<EOF

  DATABASE_URL is not set yet. Add it once, in the browser:

    1. console.neon.tech -> your project -> Connection Details
       Enable "Pooled connection" and copy the string. It must contain
       "-pooler" in the host: serverless functions open many short-lived
       connections and would exhaust a direct endpoint.

    2. vercel.com/dashboard -> ${PROJECT} -> Settings -> Environment Variables
       Name:        DATABASE_URL
       Value:       (paste)
       Environment: Production

    3. Re-run this script.

EOF
  fail "DATABASE_URL missing."
fi

# ---------------------------------------------------------------------------
# 4. Migrations
#
# Migrations are NOT run from here. Vercel stores DATABASE_URL as a Secret,
# so `vercel env pull` returns "[SENSITIVE]" rather than the value and this
# machine cannot reach the production database at all.
#
# Instead `npm run build` runs them, inside the Vercel build, where the real
# value exists. Drizzle records what it has applied, so repeat builds are a
# no-op. A failed migration fails the deploy, which is the behaviour we want.
# ---------------------------------------------------------------------------
info "Migrations run inside the Vercel build (DATABASE_URL is a Secret here)."

# ---------------------------------------------------------------------------
# 5. Deploy
# ---------------------------------------------------------------------------
info "Building and deploying..."
DEPLOY_LOG=$(mktemp)
vercel deploy --prod --yes 2>&1 | tee "$DEPLOY_LOG"
DEPLOY_URL=$(grep -oE 'https://[a-zA-Z0-9._-]+\.vercel\.app' "$DEPLOY_LOG" | tail -1)
rm -f "$DEPLOY_LOG"

echo
if [ -n "$DEPLOY_URL" ]; then
  info "Deployed: $DEPLOY_URL"
  echo
  echo "  Share that link. Friends sign up with a mobile number and a"
  echo "  password — there is no OTP, so it costs you nothing to run."
  echo
  warn "The production database must stay unseeded: 'npm run db:seed'"
  warn "truncates every table. Never point it at production."
else
  warn "Could not parse a deployment URL — check the output above."
fi
