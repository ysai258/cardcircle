# CardCircle security model

This describes what CardCircle stores, who can read it, and how those rules
are enforced. It is written to be checkable: nearly every claim here maps to a
test, and the tests are named.

---

## 1. What is never stored

There is no database column for any of these, and there never will be:

```
pan            card_number      cvv            pin
full_pan       raw_card_number  security_code  otp
```

This is enforced, not merely intended.
`tests/schema/schema-safety.test.ts` parses the Drizzle schema with
`getTableConfig()` and scans the generated migration DDL, and fails the build
if a prohibited column name appears in either.

It checks the **parsed schema**, not the source text. A grep-based check would
either drown in false positives from this document and from the security tests
— which must be free to say "cvv" — or force the documentation to avoid naming
the risk it protects against. The test suite also verifies the checker itself
rejects the names it claims to and spares legitimate ones like `pincode`.

Verified by temporarily adding a `cvv` column: two tests fail immediately.

### What *is* stored

Per card: owner, bank, nickname, optional variant, credit/debit, network,
first six digits (BIN), last four digits, discoverability, timestamps — plus
an **encrypted** expiry date if the owner chose to record one.

Per user: name, an encrypted phone number, a keyed lookup digest, the
country code and last four digits in the clear (for masked display), an
Argon2id password hash, phone-sharing preference, status, timestamps.

A BIN identifies the issuing product, not the account. Combined with the last
four digits it is what a person needs to recognise their own card, and is not
sufficient to transact.

---

## 2. Cryptography

One secret — `APP_MASTER_KEY`, 32 bytes of base64 — lives in the environment.
Every key actually used is derived from it with **HKDF-SHA256** (RFC 5869)
under a distinct, versioned label:

| Purpose | Use |
| --- | --- |
| `phone-hmac-v1` | Deterministic lookup digest for phone numbers |
| `phone-enc-v1` | AES-256-GCM of the E.164 number |
| `expiry-enc-v1` | AES-256-GCM of `MM/YY` |

This gives purpose-separated, cryptographically independent keys without
asking an operator to manage four secrets.

**Encryption** is AES-256-GCM via `node:crypto`. The stored blob is
`version || iv(12) || tag(16) || ciphertext`, and the key purpose is bound in
as Additional Authenticated Data. That last detail matters: a phone ciphertext
copied into the expiry column fails authentication rather than silently
decrypting to something.

**Phone numbers** pose two conflicting requirements — find a user by exact
number, but do not keep a plaintext directory of everyone's number. Resolved
with a keyed HMAC as the unique index. An *unkeyed* hash would be useless
here: the Indian mobile number space is about 10⁹, which is minutes of GPU
work. With the key, the digest is not reversible.

Numbers are normalised to E.164 before hashing (via `libphonenumber-js`), so
`9876543210`, `+919876543210`, `09876543210` and `+91 98765 43210` all resolve
to one account.

**Passwords** use Argon2id at OWASP's recommended parameters: 19 MiB memory,
2 iterations, 1 degree of parallelism (~75 ms). No composition rules — a
length floor of 10 characters, because "must contain a symbol" pushes people
toward `Password1!` and NIST SP 800-63B recommends against it.

Covered by `tests/unit/crypto.test.ts` (28 tests), including tamper
detection, truncation, cross-purpose rejection, and that ciphertext never
contains its plaintext.

---

## 3. Authorisation

### One resolver

`src/server/modules/cards/authorization.ts` exports `buildCardView()`. It is
the single authoritative decision about which card fields a requester may
receive. It is a **pure function**: no database handle, no `await`, no logger,
no environment access. Decryption is injected.

That purity is the design goal, not an aesthetic preference. It means every
branch is reachable from a plain unit test with plain objects, so "a non-friend
cannot see an expiry date" is an assertion rather than a hope.

| Relationship | Discoverability | Result |
| --- | --- | --- |
| `self` | any | Full owner view |
| `blocked` (either direction) | any | `null` → 404 |
| any | `nobody` | `null` → 404 |
| not friends | `friends` | `null` → 404 |
| not friends | `everyone` | Safe subset + request CTA |
| `friends` | `friends` or `everyone` | Safe subset + explicitly shared fields |

Owner disabled → `null` for everyone but the owner.

### Lazy decryption

Decryption happens only on a branch that has already decided the requester is
entitled to the value. This is tested by running every unauthorised branch
with decryptors that **throw**: if the resolver touched the ciphertext, the
test fails.

### Allowlists, never subtraction

Every DTO is built by explicit field assignment. No `{...card}`, no
`delete dto.expiryCt`, no `omit()`. A spread that happens to be safe today
leaks whatever column is added next month.

### Types that cannot leak

`CardSummaryDTO` — the shape every list endpoint returns — has no field for an
expiry or a phone number, and must never gain one. No amount of getting a list
query wrong can leak a sensitive field, because the type has nowhere to put it.

### Absence, not masking

If you are not entitled to a value, the key is not in the JSON:

```jsonc
// Non-friend. Arjun HAS an expiry and shares it — with his friends.
"shared": {}

// Friend, expiry shared.
"shared": { "expiry": "08/29", "phone": { "e164": "+91...", "verified": false } }
```

The frontend does no hiding. It cannot: it never receives the value.

### 404, never 403

A blocked user, a private card, and a nonexistent card return byte-identical
responses:

```json
{"error":{"code":"NOT_FOUND","message":"Card not found"}}
```

A 403 would confirm the card exists, which is exactly the signal an enumerator
wants. There is deliberately no `FORBIDDEN` error code for another user's
resource.

### Discovery is filtered in SQL

`discoverableByRequester()` is one SQL fragment used by **both** the bank
listing and the home-page per-bank counts. Deriving them separately is how you
get a page saying "HDFC Bank — 12 cards" above a list showing 9, which
discloses that three hidden cards exist.

---

## 4. Defence in depth

These exist to turn a mistake in the layer above into a loud failure rather
than a silent disclosure.

**Response guard.** Every response passes through `jsonResponse()`, which
walks the payload for forbidden keys at any depth. A hit logs the *paths* —
never the payload — and returns a 500.

**Strict schemas.** Every Zod object is `strict`. An unknown key is a
validation error, not something quietly dropped, so
`{"include": ["pan","cvv"]}` is rejected outright:

```
{"code":"VALIDATION_FAILED","details":{"_":["Unrecognized keys: \"pan\", \"cvv\""]}}
```

`ownerId` is absent from every write schema by construction — ownership comes
from the session, so a card cannot be reassigned by a crafted PATCH.

**Ownership in the WHERE clause.** Update and delete match on
`(id = ? AND owner_id = ?)`. Another user's card id matches no row, so the
operation cannot touch it *and* cannot report that it exists.

**Database constraints.** `bin` and `last4` carry CHECK constraints requiring
exactly 6 and 4 digits. They are `text`, not `char(n)`: bpchar pads with
spaces on comparison, silently breaking exact BIN matching, and would have
accepted `'abcdef'` anyway.

**Unordered-pair uniqueness.** `UNIQUE (LEAST(requester_id, recipient_id),
GREATEST(...))` on `friendships`. A plain `UNIQUE(requester_id, recipient_id)`
would happily allow A→B and B→A to both exist.

**A card-number guard on free text.** "Card nickname" is a text box next to
the word "card", and some users will paste their card number into it. Any
input containing 12–19 digits is rejected with an explanation. A warning label
does not stop this; a validator does.

---

## 5. Sessions and transport

Opaque 256-bit tokens in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie. Only
`SHA-256(token)` is stored — a session token is a bearer credential, and a
database dump should not yield live sessions.

Server-side sessions rather than JWTs, for one reason: **revocation**.
Blocking, disabling an account, or signing out must invalidate live sessions
immediately, which a stateless token cannot do. The session lookup joins
`users` and requires `status = 'active'`, so a disabled account loses access on
its very next request.

**CSRF.** `SameSite=Lax` already blocks cross-site state-changing requests,
but it is one control enforced entirely by the browser. Every unsafe method
additionally verifies `Origin` against `Host`; a missing `Origin` on a
POST/PATCH/DELETE is not a browser request and is rejected.

**Headers**, set in `src/proxy.ts` (Next 16 renamed Middleware to Proxy):
CSP, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`,
`Permissions-Policy`, HSTS, and `Cache-Control: no-store, private` on `/api/*`.

The CSP allows `unsafe-eval` **in development only** — React's dev build needs
it for debugging. Production does not get it. Loosening a production control
to silence a development warning would be the wrong trade.

The proxy does **not** perform authorisation. Next's own guidance says not to,
and it is the wrong place regardless: it cannot see the database. Every route
and every service authorises independently.

---

## 6. Rate limiting and enumeration

Fixed-window counters in Postgres, incremented atomically via
`INSERT ... ON CONFLICT DO UPDATE`. Postgres rather than memory because
serverless functions share none — an in-process counter resets on every cold
start and is per-instance besides.

Rate-limit keys are hashed before storage, so the table does not become a
plaintext log of which phone numbers and IPs touched the service.

| Bucket | Limit |
| --- | --- |
| `login` | 10 / 15 min, per IP **and** per phone number |
| `register` | 5 / hour |
| `userSearch` | 20 / hour |
| `friendRequest` | 20 / day |
| `cardDetail` | 240 / hour |
| `cardWrite` | 60 / hour |

Login is limited per phone number as well as per IP, so a botnet cannot spread
a password-spraying run for one account across many addresses.

**Login reveals nothing.** Every failure returns the same message. When no
user matches, the password is still verified against a dummy hash — otherwise
an unregistered number returns in ~1 ms and a registered one in ~75 ms, which
is a usable registration oracle. Measured: 19 ms vs 17 ms.

**Search is an unavoidable oracle**, since it must confirm whether a number is
registered to be useful at all. Mitigations, in order of importance: exact
match only (never prefix — the number must already be known), 20/hour,
authentication required, and an audit record per search.

**Identifiers are UUIDs.** Nothing is sequential, so nothing can be walked.

---

## 7. Logging and audit

Structured JSON with a request id. Context objects pass through `redact()`,
which replaces forbidden keys with `[REDACTED]` and Buffers with `[BUFFER]`.

There is deliberately **no helper that logs a request body**. On card and auth
endpoints that is precisely the mistake to avoid, and the surest way not to
make it is not to provide the tool.

Verified against a live server: passwords, phone numbers, expiry dates, BINs
and hash prefixes all appear zero times in the log.

`audit_logs` records security-relevant events. Every write goes through
`recordAuditEvent()`, which drops forbidden keys **and anything that is not a
primitive** — nested objects are how a whole card row ends up in an audit
record by accident. An audit failure is logged loudly but never breaks the
user-facing operation.

---

## 8. Unverified phone numbers

This build has no OTP, by explicit product decision. Phone numbers are
therefore **self-asserted**, and nothing prevents someone registering a number
they do not own.

This is a real limitation with real consequences: a number shown to a friend
may not belong to the person whose name is above it. The mitigations:

- `phone_verified_at` exists and is always `NULL`.
- Every surface that reveals a number says it is unverified.
- Lookup is exact-match only, so the searcher already knows the number.
- Every search and every reveal is audited.

Adding verification later needs a provider and an endpoint — no migration, and
no change to the authorisation model.

---

## 9. Account recovery and erasure

**Recovery codes.** Eight are issued inside the same transaction that creates
the account — an account must never exist without them, or a crash between
the two writes would produce exactly the permanent lockout they prevent.

Each code is 12 characters from a 32-symbol alphabet (60 bits), drawn with
`randomInt()`, which is cryptographically secure and rejection-samples so the
distribution stays uniform. The alphabet omits I, L, O and U: codes get read
off paper and typed by hand, so misreadable characters cost more than the
handful of bits they add.

Only SHA-256 of each code is stored — a code resets a password, so a database
dump must not yield a working one. A plain hash is correct here for the same
reason as session tokens: 60 bits of uniform randomness has no dictionary to
attack.

Codes are strictly single-use. The reset marks the code used and requires it
to be unused *in the same UPDATE*, so two concurrent requests with one code
cannot both succeed. A successful reset revokes every live session: if the
reset happened because the account was compromised, leaving them alive would
defeat the point.

Every failure — wrong number, wrong code, spent code, disabled account —
returns a byte-identical message, so the reset page cannot be used to
discover which numbers are registered. It is rate limited to 5/hour per IP
and per number.

**Erasure.** Deleting an account requires the password again, not just a live
session: the action is irreversible and an unattended laptop should not be
enough. The cascade removes cards, sharing settings, friendships, blocks,
reports, sessions and recovery codes. Audit rows survive with a NULL actor —
the security trail is kept, stripped of who it referred to, which is what a
right-to-erasure request actually requires.

---

## 10. Outbound links

A card's name links to the issuer's page for it, so the person asking "what
does this card get me?" reaches the bank rather than a stale copy of its terms
written here. One of those links is supplied **by another member**, when they
add a card the catalogue does not list — which makes it the only content in
this app that one user writes and others then click.

Untreated, that is a way to deliver a phishing page with CardCircle's
endorsement attached. So:

- **The host is an allowlist, per bank.** A link on an HDFC card must be on one
  of HDFC's own domains, or on one of four named fintech partners that market
  bank-issued cards (Jupiter, OneCard, Fi, slice). Everything else is rejected.
- **Matching is on a dot boundary**, so `hdfc.bank.in.example.com` fails. A
  suffix check would pass it.
- **The bank's code comes from the database**, not the request, so a crafted
  POST cannot nominate which bank's hosts it is measured against.
- **Rejected on the way in, at the API** — a bad URL is never stored, so no
  later renderer has to remember to re-check it. It is checked again at render
  time anyway, so a host removed from the allowlist stops being linked.
- **`https:` is a CHECK constraint** in Postgres as well as a Zod rule: the
  floor that holds if a future code path forgets. `javascript:` and `http:`
  cannot be stored at all.
- **A link may be added to a product that has none, never changed.** Filling a
  gap is a contribution; overwriting is a way to repoint a link everyone else
  already sees.
- Every outbound link carries `rel="noopener noreferrer"` and shows its host,
  so people can see where it goes before following it.

The catalogue's own 149 URLs came from each issuer's sitemap or card-listing
page and were then fetched; see `src/db/card-product-urls.ts` for what that
does and does not guarantee. Cards without one link to the bank's card list
instead, which the UI labels differently rather than implying it is the page
for that exact card.

---

## 11. What the tests cover

245 tests, all passing.

| Suite | Count | Covers |
| --- | --- | --- |
| `tests/unit/card-authorization` | 48 | Every resolver branch, lazy decryption, relationship derivation |
| `tests/unit/crypto` | 28 | HKDF, AES-GCM tampering, HMAC, Argon2id, tokens |
| `tests/unit/mobile-validation` | 26 | Phone normalisation, rejection, masking |
| `tests/unit/bank-links` | 17 | Host allowlist, look-alike hosts, link fallback, shipped URL data |
| `tests/unit/connection-url` | 7 | Client-only libpq params stripped, `sslmode` kept |
| `tests/unit/bank-theme` | 6 | Bank colours stay distinguishable |
| `tests/schema/schema-safety` | 26 | Prohibited columns in schema and migrations |
| `tests/security/friends-and-enumeration` | 20 | Request rules, block teardown, search, profiles, rate limits |
| `tests/security/card-access` | 18 | Friend vs non-friend fields, blocking, ownership, forbidden keys |
| `tests/security/recovery-and-deletion` | 14 | Recovery codes, password reset, erasure |
| `tests/security/discovery` | 13 | List/count parity, filters, BIN prefix, pagination |
| `tests/security/card-links` | 9 | Member-supplied URLs: allowlist, look-alikes, no overwrite, DB CHECK |
| `tests/security/http-boundary` | 9 | Validation errors reach the client as usable 400s |
| `tests/security/register-contract` | 4 | Registration response shape |

Explicitly verified against a running server, not just in tests:

- Unauthenticated API access → 401
- Non-friend card detail → `"shared": {}` on the wire
- Blocked / private / nonexistent card → identical 404 bodies
- Cross-origin and Origin-less POST → rejected
- `{"pan":..., "cvv":...}` in a create request → 400
- PATCH/DELETE on another user's card → 404
- Card number pasted into a nickname → 400
- 11 bad logins → 429 at the limit
- Security headers and `no-store` present
- Phone numbers and expiry dates unreadable in the database
- No secret of any kind in the server log

---

## 12. Threats not addressed

Named honestly rather than left implied.

- **A compromised environment.** The master key is an env var, not a KMS.
  Read the environment and you can decrypt phone numbers and expiries.
- **A malicious friend.** Someone you accept sees what you chose to share.
  That is the product working, and the reason sharing defaults to off.
- **Traffic analysis of the audit log.** An operator can see who looked up
  whom. This is inherent to keeping a security audit trail.
- **Account takeover via password reuse.** There is no second factor. Argon2id
  and login rate limiting help; they do not solve it.
- **Denial of service.** Rate limits protect data, not availability. That is
  the hosting layer's job.
