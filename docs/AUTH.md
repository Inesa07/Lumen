# Accounts and data in the cloud

## Who does what

| Part | Where | Job |
|---|---|---|
| `static/js/account.js` | browser | sign-in / sign-up pages, the account chip in the menu |
| `src/main.js` | browser | decides: guest or signed in; opens the right data |
| `src/data/cloud.js` | browser | offline-first sync: IndexedDB copy + outbox → Supabase |
| Supabase Auth | cloud | checks passwords, sends e-mails, issues login tokens |
| PostgreSQL + RLS | cloud | stores the rows; every user can only touch their own rows |

## The ideas behind it

**Password hashing.** Supabase never stores your password. It stores a *hash*: the result of a one-way
function (bcrypt) with a random *salt*. At sign-in the password you type is hashed the same way and the two
hashes are compared. bcrypt is deliberately slow, so guessing millions of passwords takes very long.

**JWT (JSON Web Token).** After sign-in the browser receives an *access token*: a small JSON object
`{ sub: "<your user id>", exp: ..., role: "authenticated" }` plus a digital signature that only Supabase can make.
Every request to the database carries it, and the database trusts the `sub` inside because the signature is valid.
The token expires after about an hour; supabase-js uses the *refresh token* to get a new one automatically.

**Row Level Security (RLS).** The publishable key in `src/config.js` is public. What protects the data is a
rule inside PostgreSQL on every table:

```sql
create policy "own rows only" on public.sessions for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
```

`auth.uid()` reads `sub` from the token. Postgres silently adds this condition to every query, so
`select * from sessions` returns only *your* rows, and inserting a row with somebody else's `user_id` fails.

**PKCE (Proof Key for Code Exchange).** For "Continue with Google" and e-mail links the browser first creates a
random secret, sends only its hash, and later proves it knows the secret when swapping the `?code=` for a session.
A stolen `code` alone is useless.

**Offline-first with an outbox.** Every change is saved on the device first and put into an *outbox*.
The outbox is uploaded in the background; without internet it waits and retries. At start-up the cloud copy
is downloaded, so all devices show the same data.

## Supabase settings (one time)

1. **SQL Editor** → run `supabase/migrations/001_init.sql`.
2. **Authentication → URL Configuration**
   - Site URL: the address of the app (now `http://localhost:5173`, later the published address)
   - Redirect URLs: add `http://localhost:5173/**` and later `https://<published address>/**`
3. **Authentication → Sign In / Providers → Email**: "Confirm email" on = users must click a link first.
   Supabase's built-in e-mail service sends only a few e-mails per hour; before launch connect your own
   SMTP service (Authentication → Emails → SMTP settings).
4. Optional: **Google** provider (needs an OAuth client from Google Cloud Console).
