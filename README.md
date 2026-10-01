# Plainly

**Amazon without the noise: decide with facts, not noise.**

Plainly is a rebuild of amazon.com's shopping core with the noise taken out. There are no sponsored results and no badges. The facts that decide a purchase (price, delivery, returns, warranty, stock) sit at the top of every product page, and products can be compared side by side. Checkout stays as fast as Amazon's.

- **Live:** https://plainly-wine.vercel.app
- **Repo:** https://github.com/Xinacris/plainly
- **Why it's built this way:** [DECISIONS.md](DECISIONS.md), with every decision, what was cut and why, and the bug log.

## Demo account

You don't need an account: guest checkout works. To see the signed-in side without registering, use **Sign in as demo** on the sign-in page, or:

- **Email:** `demo@example.com`
- **Password:** `plainly-demo-2026`

The demo is shared, so others may change its addresses and orders. It's reset every 3 days, and its email and password can't be changed.

## What's real and what's simulated

- **Products** (194 of them), photos and reviews come from [DummyJSON](https://dummyjson.com)'s public mock API, and stay in English. Prices, discounts, stock, and the return, shipping and warranty policies are DummyJSON's. Plainly only computes from them, for example the price you pay after the discount.
- **Payment is simulated.** There's no card form and nothing is charged. Shipping and tax are "none in this demo".
- **Delivery dates are estimates.** They're the item's shipping time from the data plus an assumed 2–5 business days in transit, and the pages say so.
- **Order and return statuses move by time,** on a short timeline you can watch:
  - **Orders:** Preparing for 2 minutes, then Shipped, then Delivered at 5 minutes.
  - **Returns:** Requested for 2 minutes, then Refunded.
  - **Cancelling:** allowed only while Preparing.
- **Guests:** the cart, addresses, orders, returns and settings stay in this browser (localStorage).
- **Accounts are real,** on [Supabase](https://supabase.com) (Auth and Postgres, EU region). Signed in, your addresses, orders and returns are stored in Supabase, limited to your own rows by row-level security, and follow you across devices. The cart stays in the browser either way.
- **No email is sent.** There's no email provider, so email confirmation is off, and anything that would need an email (password reset, email change) says so instead of pretending.

## Features at a glance

- **Search with no sponsored slots.** It understands categories ("phone" → Smartphones, shown as a removable chip) and fixes typos ("lptop" → laptop), and always says when it did.
- **Instant filters:** category (in two steps, through departments), brand, price, rating, in stock, and 10%+ off. Every filter is a chip and lives in the URL.
- **Product page:** a decision card with price, delivery estimate, returns, warranty and stock. Phones get a swipeable photo gallery first.
- **No badges:** ratings are the real average of the reviews shown, with the count.
- **Compare tray:** up to 3 products from one department, with the differences marked.
- **One-page checkout:** a saved-address picker, a cart toast and a mini-cart preview.
- **Orders:** tabs (Active, Delivered, Cancelled, Returns), cancel while preparing, and returns per item within each item's return window.
- **Accounts:** email and password (Google sign-in is built, but only listed test users can use it while Google's app is in testing). The account offers to move this browser's data in on first sign-in. Profile has name, phone and a password change.
- **Dark mode:** light, dark, or the system setting.
- **English and Turkish:**
  - **Choosing:** the first visit follows the browser language. Switch with EN / TR in the header or in the phone menu.
  - **Formats:** prices stay in US dollars, formatted for the language.
  - **Turkish search:** Turkish words work too ("telefon", "tişört", even typed as "tisort").
- **Accessibility settings** at `/accessibility`: text size up to 125%, increased contrast, reduce motion, and underline all links. The page also has an accessibility statement (WCAG 2.2 AA target, what's tested, known limitations).
- **Offline:** a banner appears when the connection drops. Account actions say they need a connection. To see it without going offline, add **`?simulate=offline`** to any URL, for example https://plainly-wine.vercel.app/?simulate=offline. It lasts for that tab until you press **Exit simulation**, and it doesn't block product data.
- **A 404 page** with search and departments, and `/privacy`.

## Stack

Vite, React, TypeScript, React Router, TanStack Query, Zustand and Tailwind v4, with Supabase (supabase-js) for accounts. Hosted on Vercel; every push to `main` deploys to production.

## Run it locally

```sh
npm install
npm run dev
```

That's enough for guest mode: browsing, cart, compare, checkout and orders all work without any keys. The sign-in links stay visible; without Supabase settings, the account pages say the service can't be reached.

### With accounts (Supabase)

1. **Project:** create a Supabase project. Copy `.env.example` to `.env.local` and fill in your project's URL and **publishable** key (`sb_publishable_…`). These two are the only values the browser ever gets. The data is protected by row-level security, not by hiding these.
2. **Schema:** apply the schema and policies, which are SQL migrations in [`supabase/migrations/`](supabase/migrations):

   ```sh
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```

3. **Auth settings:** in the Supabase dashboard, turn off "Confirm email" (there's no email provider), and add `http://localhost:5173/auth/callback` to the redirect URLs.
4. **Demo account (optional):** seed it with `SUPABASE_URL=… SUPABASE_SECRET_KEY=… node scripts/demo-reset.mjs`. The secret key is for scripts only. It must never go in a `VITE_` variable or in the repo.

### Tests

The full verification runs against a local preview of a test build, pointed at a **separate** Supabase project, so test users never touch production:

```sh
npx vite build --mode test       # uses .env.test.local (see .env.example)
npx vite preview --port 4173
node scripts/verify.mjs          # layout + axe audit and every flow, in about 90 s
node scripts/rls-test.mjs        # one user can't read or change another's data
```

`verify.mjs --display=larger,contrast` runs everything again at the largest text size with increased contrast. The live site only ever gets one light check (`verify.mjs <url> --smoke`); see "Deployment notes" in DECISIONS.md.

Every env file is gitignored. `node scripts/check-secrets.mjs` runs before every commit. It fails if any secret from them appears in a tracked file or in the committed session logs (`.agent-logs/`).
