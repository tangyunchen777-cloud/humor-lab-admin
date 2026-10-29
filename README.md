# Humor Lab · Control Room

Assignments 6–7: a separate Next.js admin app for the existing Humor Lab Supabase database. It preserves the public rating app and its Week 5 improvements while giving approved administrators analytics, content management, model configuration, and generation observability.

## Week 7

- `/profiles`: existing profile directory, protected by Google login and the current superadmin flag.
- `/pipeline`: read 6 prompt chains and 12 ordered steps; read/update their relative selection weights within each humor style. A style always retains a positive-weight chain. Steps compile into one model call.
- `/manage/terms`, `/manage/examples`, `/manage/models`, `/manage/providers`, `/manage/signup-domains`, `/manage/whitelist`: create, read, edit, archive, and restore records; search and stale-edit protection included. Deletion is recoverable and historical references remain intact.
- `/manage/images`: upload a new JPG/PNG/WebP (4 MB max), view images, edit their descriptions, and archive/restore metadata. Published media and stored files remain intact when an image is archived.
- `/media`: view and manage real AI captions with their associated images.
- `/requests`: paginated requests, scene/ID search, status filters, exact prompt snapshots, and live success/failure counts.
- `/responses`: paginated model attempts with captions, HTTP results, latency, and provider token counts when available; navigate to the corresponding request.

Apply the two additional migrations `20261029040129_admin_observability.sql` and `20261029040618_link_generation_traces.sql` after the Assignment 6 migration. They were created with Supabase CLI. These are additive changes to the original Humor Lab database, not the separate semester teaching copy.

The updated caption app reads the weighted prompt chains, active terms, style examples, and first three enabled Google models. It records every actual model attempt, including safe failures and token counts, before returning a preview. Publishing links the caption to its request. Existing published outputs were backfilled as **Published history**, without inventing latency, token counts, or previous HTTP status. New telemetry is tagged **Live request**.

Only Google is integrated into the current caption engine. Other provider entries are inventory metadata; no API keys belong in these tables. Signup-domain and email registries are managed lists, not enforced login gates and not admin permission grants. Google sign-in remains open, and the separately managed database flag still decides admin access.

Run `supabase/tests/observability_access.sql` in SQL Editor as the owner. It tests catalog CRUD, archive/restore, stale edits, prompt mix, member/anonymous isolation, own-request logging, and publication links inside a rolled-back transaction. The existing `admin_access.sql` regression tests continue to pass. `scripts/check-access.mjs` includes every new admin route. No server-role key is needed.

## Features

- Exact database totals, 14-day activity chart, approval rate, humor-style comparison, top captions, and an unrated-content queue.
- Searchable profile directory with contribution counts, role badges, and last sign-in dates.
- Create existing AI-generated caption records with original prompts and model provenance; read/edit captions while preserving their images, creators, and ratings.
- Recoverable deletion: deleted captions disappear from the public feed and can be restored with their votes intact.
- Search/filter individual upvotes and downvotes. Admins cannot rewrite community ratings.
- Database-written activity log for every admin create, edit, delete, and restore.
- Protected pages, protected Server Actions, and independent database authorization.

## Run locally

```sh
pnpm install
cp .env.example .env.local
pnpm dev --port 3010
```

Use the existing project's Supabase URL and anon key. No service-role key, Google secret, or Gemini key belongs in this app. `.env.local` is ignored.

## Database setup

Apply `supabase/migrations/20261022181358_admin_console.sql` once to the existing Humor Lab database. It adds `profiles.is_superadmin` (false by default), recoverable deletion fields, private admin functions, public invoker wrappers, and an RLS-protected private audit table.

### Bootstrap the first admin without a public privilege-granting endpoint

Sign into the public app using Google first. Then, as the database owner, use Supabase SQL Editor:

```sql
update public.profiles
set is_superadmin = true
where id = (
  select id from auth.users
  where lower(email) = lower('YOUR_GOOGLE_EMAIL')
    and exists (
      select 1 from auth.identities
      where user_id = auth.users.id and provider = 'google'
    )
);
```

This is an operator-only bootstrap, not a website endpoint. Ordinary users only have UPDATE privileges on their profile names and avatar path, so they cannot promote themselves. Admin roles are intentionally not editable in this UI. Removing the flag immediately prevents subsequent admin reads and mutations.

### Security design

Next.js Proxy refreshes sessions and sends anonymous visitors to login. Each page's data-access layer and every mutation independently calls `getUser()`, verifies OAuth + Google identity, and reads the live database flag. Checks are not restricted to a shared layout.

All privileged implementation functions live in the non-exposed `private` schema. Each independently calls a definer helper that checks the caller's UUID, Google identity, OAuth authentication method, and current profile flag. Public RPC wrappers are SECURITY INVOKER, with execution restricted to authenticated users. A logged-in non-admin cannot bypass the UI using RPC. No service-role credential is deployed.

Privileged functions have an empty search path and revoked PUBLIC/anon execution. Data API access to the existing tables retains RLS and restricted column grants. Existing public SELECT policies hide soft-deleted media; voting also rejects unavailable media. User IDs come from verified authentication, never user-editable metadata or form fields. Mutations have audit records and edit-version checks.

The dashboard's exact aggregate totals query the full tables. Directory/media/rating lists intentionally load at most the newest 1,000 records for this course project; the audit view loads the latest 100. A larger deployment should move list search and pagination into SQL.

## Google login and Vercel

Reuse the existing Supabase Google provider. In Supabase URL Configuration, add exact URLs:

- `http://localhost:3010/auth/callback`
- `https://YOUR_ADMIN_PRODUCTION_DOMAIN/auth/callback`
- `https://YOUR_ADMIN_COMMIT_DEPLOYMENT_DOMAIN/auth/callback`

The application's redirect URI is always `/auth/callback`, without custom query parameters. Do not change the public app's Site URL or remove its existing redirects. Google continues to use the Supabase provider callback.

Create a separate Vercel project connected to `tangyunchen777-cloud/humor-lab-admin`. Set the two variables from `.env.example`. Turn Vercel Deployment Protection off for the course submission. The public sign-in wall must load in Incognito, while the actual admin data remains behind Google login and the superadmin role.

## Verification

```sh
pnpm lint
pnpm build
pnpm start --port 3010
node scripts/check-access.mjs http://localhost:3010
```

Run `supabase/tests/admin_access.sql` as the database owner to check anonymous and ordinary-user denial, Google-only authentication, self-promotion prevention, create/edit/recoverable delete/restore, stale-edit prevention, and public-feed filtering. Tests run in a transaction and roll back all edits and test records.

Also test real Google sign-in, dashboard navigation, source-prompt display, filters, and sign-out. Submit the latest unique Vercel deployment URLs for both this admin app and the original creation/rating app.
