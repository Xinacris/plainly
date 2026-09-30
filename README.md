# Plainly

**Live:** https://plainly-wine.vercel.app
**Repo:** https://github.com/Xinacris/plainly

Amazon without the noise: decide with facts, not noise. There are no sponsored results and no badges. Delivery, returns and warranty are shown up front, and products can be compared side by side. It's a 24-hour rebuild of amazon.com. See [DECISIONS.md](DECISIONS.md) for what was built, what was cut, and why.

## Demo account

Don't want to register? Sign in with the shared demo account, or use "Sign in as demo" on the sign-in page:

- **Email:** `demo@example.com`
- **Password:** `plainly-demo-2026`

The demo data (addresses, orders in different states, a return) is shared, so others may change it; it's reset every few days. Its email and password can't be changed.

Guest checkout works without an account.

## Stack

Vite, React, TypeScript, React Router, TanStack Query, Zustand and Tailwind v4. Product data comes from [DummyJSON](https://dummyjson.com).

Accounts use [Supabase](https://supabase.com) (Auth and Postgres, EU region). Signed in, addresses, orders and returns are stored in Supabase, limited to your own rows by row-level security. Signed out, they stay in the browser (localStorage). The cart always stays in the browser. The schema and policies are SQL migrations in [`supabase/migrations/`](supabase/migrations).

## Run locally

```sh
npm install
npm run dev
```

Accounts need `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in a gitignored `.env.local`. Without them the site runs in guest mode. No other key ever goes to the browser.

Every push to `main` deploys to production on Vercel.
