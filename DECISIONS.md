# Plainly: Decisions

## Thesis

**Plainly is Amazon without the noise: decide with facts, not noise.**

Search results are ranked honestly, with no sponsored slots and no badges. The facts you need before buying (price, delivery, returns, warranty) are shown up front. You can compare products on one screen instead of across tabs. Amazon's fast checkout stays, and the whole site works in dark mode.

## Stack

- **Framework:** Vite, React, TypeScript and React Router. There's no server rendering, because the data comes from a public mock API, so SSR adds nothing.
- **Data:** TanStack Query loads DummyJSON's catalog of 194 products once. Search, filters and sorting then run in the browser, so they're instant, and facets that the API doesn't offer become possible.
- **Local state:** Zustand with the `persist` middleware stores the cart, orders and theme in localStorage. There's no backend and no sign-in.
- **Styling:** Tailwind v4, with every color defined as a CSS variable token.
- **Hosting:** Vercel, with a rewrite that sends every path to `index.html`, so deep links load directly.

## Accepted

| # | Decision | Why |
|---|---|---|
| 1 | **Keep Amazon's fast checkout, on one page with no upsells.** Address, delivery estimate, place order, confirmation. | It's the part of Amazon that already works. The job is to not break it and to remove the Prime and upgrade prompts. |
| 2 | **Search results with no sponsored slots.** Sort by relevance, price, rating or biggest discount. | On Amazon you scroll past paid placements before reaching real results. Every result here is there on its merits. |
| 3 | **Instant filters for category, brand, price, rating and in-stock.** Applied filters show as removable chips, and on mobile the filters open in a bottom sheet. | Amazon's filter sidebar is long, hidden on mobile, and hard to undo. Filtering in the browser makes every change instant. |
| 4 | **No badges.** Show facts that can be checked instead: the rating with its review count, the discount %, and stock. | "Best Seller" and "Amazon's Choice" labels are no longer trusted. A fact the user can check replaces each one. |
| 5 | **A decision card at the top of the product page.** It shows price, delivery date, return policy, warranty and stock, and everything else collapses. | Returns and shipping details are buried in very long product pages. These are the facts that decide a purchase. |
| 6 | **A compare tray.** Add up to 3 products and see them side by side, with the differences highlighted. | Comparing similar products on Amazon means juggling tabs. |
| 7 | **Dark mode.** It follows the system setting, has a light / dark / system toggle, and is built on tokens from the first hour. | People shop late at night. Building it in from the start costs little; adding it later means touching every component. |
| 10 | **Cut sign-in, Prime, recommendation carousels, lists, Q&A and seller pages.** The header is reduced to logo, search, Orders, Cart and the theme toggle. | The header and footer are full of links nobody uses. Everything works as a guest, so the public URL works for anyone without signing in. |

**Home page:** kept lean, with about an hour of work at most. It has a short intro, the categories, and one row of the biggest real discounts, labeled with how that row was chosen.

## Changed from the proposal

| # | Proposal | Decision | Why |
|---|---|---|---|
| 8 | Star distribution and filtering reviews by star | **Cut.** Show the real reviews, with a clear note that the rating is based on only 3 reviews. | DummyJSON has exactly 3 reviews per product. A distribution chart built from 3 data points is the kind of noise this product rejects. |
| 9 | A full return flow from the order page | **Simplified.** The orders page shows each item's return policy and whether its return window is still open. | This answers "can I still return this?" without building a flow the mock backend can't carry out. |

## Considered, not now

- **Full return flow:** return reasons, return status, and a replacement option.
- **Star distribution for reviews:** not meaningful with 3 reviews per product (see #8).
- **Accounts and lists:** sign-in, saved addresses per user, wishlists. Guest use with localStorage covers the core loop.

## Build order (24 hours)

Every block ends with a deploy, so there is always a working live URL.

| Hours | Ships |
|---|---|
| 0–2 | Project setup, theme tokens with dark mode, minimal header, Vercel deploy with the deep-link rewrite |
| 2–6 | Catalog loading, search results, basic product page, cart |
| 6–9 | Checkout, confirmation, order list. **The full purchase loop works. This is the MVP line.** |
| 9–13 | Filters and chips, facts instead of badges, decision card |
| 13–16 | Compare tray |
| 16–19 | Return policy and return window on orders, honest review section |
| 19–22 | Home page (about 1 hour), mobile pass, loading, empty and error states, accessibility |
| 22–24 | No new features. Bug fixes, README, final deploy |

**If time runs short, cut in this order:**
1. Return window on orders
2. Home discount row: the home page becomes intro and categories only
3. Compare limited to 2 products instead of 3

**Never cut:** the purchase loop, dark mode or the decision card.

## Before the timed build

- **Amazon rather than Higgsfield AI.** I first compared an Amazon rebuild with a Higgsfield AI rebuild. I dropped Higgsfield because the Pexels API had paused new keys, which left me with no reliable video source.
- **Starting clean.** An earlier Amazon prototype built with another tool copied Amazon's branding and had pricing and layout bugs. That's why this build starts from an empty project, under its own name.

## Bug log

| When | Bug | Cause | Fix |
|---|---|---|---|
