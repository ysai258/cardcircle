# CardCircle

**Know who has the card you need.**

Merchants run offers on specific banks and networks — "10% off on HDFC Visa
credit cards" — and the usual way to find out who has one is to ask the group
chat. CardCircle answers that question without the chat: a private directory
of which cards your friends hold, and nothing more.

It is **not** a wallet, a payment processor, or a place to store card numbers.
When you find the card you need, you call your friend and *they* make the
purchase. That framing is deliberate and the interface reinforces it.

---

## Quick start

Requires Node 22+ and Docker.

```bash
npm install
cp .env.example .env.local

# Generate a master key into .env.local
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# ...and paste it as APP_MASTER_KEY

npm run infra:up      # Postgres 18 on port 55433
npm run db:migrate
npm run db:seed
npm run dev           # http://localhost:3000
```

The seed prints six accounts. All of them use the password
`cardcircle-dev-2026`, and every phone number and card value is fabricated.

### Walk the demo

Sign in as **Alice** (`9000000001`), then:

1. **Home → HDFC Bank → Credit → Visa.** Two cards: Rahul's Millennia and
   Arjun's Regalia. The filtering happens in SQL, not in the browser.
2. **Open Rahul's card.** Alice and Rahul are friends and he shares his BIN
   with friends and his phone number, so she sees `540123` and a **Call
   Rahul** button.
3. **Open Arjun's card.** Alice is *not* Arjun's friend, and Arjun masks his
   BIN completely. She sees that he holds an HDFC Regalia — enough to answer
   the offer question — with no digits at all.

Arjun's BIN is not blanked client-side; the server never puts it in the
response. Open devtools and look: there is no `bin` key. Searching his exact
BIN finds nothing either, or the search box would reveal what the mask hides.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm test` | All suites (creates/migrates the test database first) |
| `npm run test:unit` | Pure logic, no database |
| `npm run test:security` | Authorisation + schema safety |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Apply migrations |
| `npm run db:generate` | Generate a migration from schema changes |
| `npm run db:seed` | Reset and seed development data |
| `npm run db:gen-product-urls` | Regenerate the product-link migration from `card-product-urls.ts` |
| `npm run db:gen-catalogue` | Regenerate a catalogue migration (products added, stale ones dropped) |
| `npm run db:check-product-urls` | Report which product links actually landed (read-only, safe on production) |
| `npm run infra:up` / `infra:down` | Local Postgres |

Tests run against a **separate** `cardcircle_test` database. The security
suite truncates every table between tests, so pointing it at your development
database would quietly destroy your seed data.

---

## Architecture

Next.js 16 App Router, deployed as one unit. Route Handlers provide the REST
API; React Server Components render the pages. Both call the same service
layer, so there is one authorisation path rather than two.

```
src/
  app/
    (auth)/          sign in, register
    (app)/           authenticated pages
    api/             REST route handlers
  server/
    common/          errors, logging, rate limiting, HTTP boundary
    crypto/          key derivation, AES-GCM, Argon2id, phone handling
    modules/
      auth/          sessions, registration, login
      cards/         authorization.ts  <-- the resolver
      friends/       requests, blocking
      users/         search, profiles
      audit/         security event log
  db/                schema + migrations
```

**Why a REST layer at all**, when Server Actions would be fewer moving parts:
the security requirement is that the *response* is the boundary. Route
Handlers produce real HTTP responses you can curl and assert on, which is what
makes "inspect the API to confirm unauthorized fields are absent" a thing you
can actually do.

### Stack

| Concern | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 16 | One deployment, free on Vercel |
| Database | Postgres 18 (Supabase in production) | Real relational constraints |
| ORM | Drizzle | SQL-first migrations; TS schema makes the prohibited-column check trivial |
| Passwords | Argon2id (`@node-rs/argon2`) | OWASP parameters, ~75 ms |
| Validation | Zod, `strict` everywhere | Unknown keys are errors, not ignored |
| Styling | Tailwind v4 | Tokens in `globals.css`, light + dark |

---

## The security model

Full detail is in [`docs/security.md`](docs/security.md). The short version:

**Nothing sensitive is stored.** There is no column for a card number, CVV,
PIN, OTP or net-banking credential, and a test fails the build if one is ever
added. Card expiry dates and last-4 digits were removed outright: nothing in
this product needs them. The only reversible secret left is the phone
number, AES-256-GCM encrypted.

**Cards name a product, not a nickname.** An offer says "10% on Airtel Axis",
so a card references a catalogue row rather than free text — otherwise the
question could never be answered reliably. Users extend the catalogue through
an "Other" option; those entries are marked unverified and attributed.

**The BIN is maskable.** Each card chooses who may see its first six digits:
everyone, friends, or nobody. Masked means absent from the response, and
also unsearchable — a card whose BIN is hidden from you cannot be found BY
that BIN, or search would leak exactly what the mask hides.

**One function decides who sees what.**
[`buildCardView`](src/server/modules/cards/authorization.ts) is a pure
function — no database handle, no I/O, decryption injected. Every branch is
unit-testable with plain objects, and no controller or component re-implements
any part of it.

**Responses are built by allowlist.** Every DTO is assembled field by field.
Nothing spreads a database row, so a column added tomorrow appears in no
response until someone writes a line of code putting it there.

**Absence, not masking.** If you may not see an expiry date, the key is not in
the JSON. The frontend does no hiding, because it never receives the value.

**404, never 403.** A blocked user, a private card, and a card that does not
exist return byte-identical responses. A 403 would confirm the card is real.

**Recovery and erasure.** Eight single-use recovery codes are issued at
sign-up and stored only as SHA-256. Using one resets the password and revokes
every live session. Deleting an account requires the password again — a live
session is too weak a confirmation for something irreversible — and cascades
to cards, friendships, blocks, sessions and codes, leaving audit rows with a
NULL actor.

---

## Deployment

Designed for Vercel + Supabase on free tiers, both in Mumbai
(`ap-south-1` / `bom1`) so queries do not cross a region.

**Why Supabase rather than Neon**, given both are free: Neon's free tier
suspends its compute after about five minutes idle, and this app is used
sporadically — someone checks it while shopping, then closes it. That made a
cold start the normal case, not the exception: the first request after a
quiet spell took over a minute. Supabase only pauses after about a week, and
a daily keep-alive cron resets that clock so it never arrives.

The same trick cannot rescue Neon: a five-minute window needs a ping every
few minutes — roughly 360 a day, beyond Hobby's daily cron granularity, and
about 730 compute-hours a month against a 191-hour allowance.

1. Create a Supabase project; copy the **transaction pooler** connection
   string (port 6543), not the direct one — Supabase's direct host is
   IPv6-only and Vercel's functions cannot reach it.
2. Import the repo into Vercel.
3. Set `DATABASE_URL`, `APP_MASTER_KEY` (a *different* 32-byte key from
   development) and `CRON_SECRET` (any 16+ random characters).
4. Nothing else: migrations run during the Vercel build, and the bank list
   ships as migration 0001.

**Do not seed production.** `db:seed` refuses to run when
`NODE_ENV=production`, but it also truncates every table, so keep it away.

Rotating `APP_MASTER_KEY` makes every stored phone number and expiry date
undecryptable and breaks phone lookup entirely. Key purposes are versioned
(`phone-enc-v1`) so a rotation can be done as a migration rather than a flag
day, but that migration is not written yet.

---

## Known limitations

These are real and deliberate, not oversights.

**Phone numbers are unverified.** This build has no OTP — an explicit product
decision to keep the MVP free of paid dependencies. Nothing stops someone
registering a number they do not own. Mitigations: exact-match-only lookup, a
20/hour rate limit, an audit record per search, and an "unverified" badge
wherever a number is shown. The `phone_verified_at` column exists and is
always `NULL`, so verification can be added without a migration.

**Account recovery depends on the user keeping their codes.** With no email
or SMS there is nothing to send a reset link to, so recovery rests on eight
single-use codes issued at sign-up. Lose the password *and* the codes and the
account genuinely cannot be recovered — CardCircle has no way to verify who
you are. The reset page says so plainly rather than implying support can
help.

**The encryption key lives in an environment variable, not a KMS.** That
protects against a database dump. It does not protect against someone who can
read the environment. It is the honest ceiling of a zero-cost deployment; the
key provider is swappable.

**294 of 405 catalogue cards link to their own page on the issuer's site.**
Every one came from the bank's own sitemap or card-listing page and was then
fetched, rather than guessed. The rest fall back to the bank's card list,
which the UI labels as such.

Eight banks — Canara, Union, Bandhan, HSBC, PNB, Bank of Baroda, Central and
YES — have been rebuilt from their own listings, and all but the exceptions
below are linked. YES Bank needed the real Chrome binary rather than bundled
Chromium, which it rejects on the TLS fingerprint; `curl` gets only an empty
JavaScript shell. The remaining gaps are the catalogue's fault rather than the
harvester's: names like "SBI Classic Debit" are a sketch of a card rather
than a card, and where an issuer sells three of them (Visa Classic, RuPay
Classic, Mastercard Classic) picking one would put a confident wrong link on
someone's card.

Known exceptions, all deliberate: Central Bank lists its debit cards as text
with no page per card, and publishes no credit-card list at all; HSBC and PNB
publish no per-card debit pages; eleven YES Bank cards are real but their
tiles lead to a generic application form rather than a page about the card;
four banks (Bank of India, AU, DBS, IDBI) refuse automated requests entirely; and Citi has none on purpose, its Indian card portfolio
having moved to Axis in 2023. `tests/unit/bank-links` lists every one of
these by name, so a new card added without a link fails the build.

**No admin area.** The schema supports it — `reports`, `audit_logs`, and
`users.status` are all there, and disabling an account already removes its
cards from discovery everywhere. The UI is not built.

**Rate limiting is fixed-window, in Postgres.** Serverless functions share no
memory, so an in-process counter would be meaningless. A burst can cross a
window boundary; Redis behind the same interface would fix it.

**`drizzle-kit` has a moderate `npm audit` finding** via a transitive
`esbuild`. It is a development-only migration tool, never bundled or deployed,
and the advisory concerns the esbuild dev server. `audit fix --force` would
downgrade it to 0.18.1, which is ancient and breaking.

---

## Deviations from the original spec

| Spec said | Built instead | Why |
| --- | --- | --- |
| OTP authentication | Phone + password (Argon2id) | Explicit product decision: no paid auth dependency |
| `phone` as a per-card shared field | One account-level setting | Your number is not a property of one card |
| Blocking as a `friendships` status | Its own table | Directional; must survive the friendship and allow mutual blocks |
| Three visibility values | Two (`nobody`, `friends`) | `owner_only` and `nobody` behave identically for every non-owner |
| `is_discoverable` boolean | `discoverability` enum | The demo needs non-friends to find cards, *then* befriend — a boolean cannot express that |
| Separate `friend_requests` table | Merged into `friendships` | The spec offered this; the unordered-pair unique index is what makes duplicates impossible |
