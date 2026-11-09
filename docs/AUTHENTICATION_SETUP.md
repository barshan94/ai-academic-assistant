# Private authentication setup

The application uses Supabase email/password authentication with server-managed cookies. Public account registration is intentionally not exposed because this is a single-owner private workspace.

## 1. Configure local environment

Copy `.env.example` to `.env.local` and fill in the project's URL and publishable key from the Supabase dashboard:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Never use a service-role or secret key in a `NEXT_PUBLIC_` variable. Never commit `.env.local`. The browser uses only the publishable key. The application also has a narrowly scoped server-only service-role client for privileged operations such as completed-upload registration and readiness probes; its key must be configured as `SUPABASE_SERVICE_ROLE_KEY` only in the server environment.

## 2. Create the owner account privately

In the Supabase dashboard for the `academic-assistant` project:

1. Open Authentication → Users.
2. Choose Add user and create the owner's email/password account.
3. Use a strong, unique password and keep it in a password manager.
4. Keep public sign-ups disabled; do not add a public registration page.

The app intentionally provides sign-in only. Account creation and recovery are managed by the owner in Supabase.

## Free-plan password screening limitation

The last recorded Supabase security-advisor review (2026-11-05) reported leaked-password protection as disabled. The current Supabase Free plan does not provide the built-in leaked-password screening control. The application does not call a separate breached-password service, so never claim that a password is checked against known breach lists.

For every owner or teacher account:

- Keep public sign-ups disabled and create the account privately in Supabase Auth.
- Use a separate account for each person; do not share the owner account.
- Set a unique random password of at least 16 characters using a password manager. Do not reuse it on another service.
- Revoke access when the person no longer needs the workspace.

The current sign-in page does not implement a verified MFA enrollment/challenge/recovery flow. Do not assume MFA is active or enable an MFA requirement until that complete flow is implemented and tested. These steps are free-compatible risk reductions, not an equivalent replacement for leaked-password screening.

## 3. Configure authentication URLs

In Authentication → URL Configuration, set the local Site URL to `http://localhost:3000` during local development. Add the exact production application URL to the allowed redirect URLs when a deployment exists. Do not add broad wildcard production redirects.

## 4. Run and verify

```bash
npm install
npm run dev
```

Open `http://localhost:3000/login`, sign in with the privately created owner account, verify that `/dashboard` loads, then sign out and verify that visiting `/dashboard` redirects to `/login`.

## Security behavior

- Dashboard requests are checked by Next.js middleware using Supabase Auth.
- The dashboard independently verifies the current user on the server.
- Sign-in and sign-out run as server actions.
- Redirect after sign-in is fixed to `/dashboard`; user-supplied redirect destinations are not trusted.
- The service-role key is never used for browser authentication or ordinary owner-scoped dashboard CRUD. It is isolated in a `server-only` helper and used only by explicitly privileged server routes/RPCs. Keep `SUPABASE_SERVICE_ROLE_KEY` out of client components, `NEXT_PUBLIC_*` variables, middleware and public build arguments.
- The profile migration is separate and must be reviewed and applied before profile data is used.
