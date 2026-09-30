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

## Build rules

These apply to every block:

- **Truthful copy.** Never show badges, delivery promises or discount claims the data doesn't support. Every number shown is computed from the data. Fields that would look broken are hidden.
- **Prices** are formatted with `Intl.NumberFormat`. **Ratings** are truncated to one decimal and never rounded up, so 4.99 shows as 4.9.
- **Cards size to their content.** No fixed heights with `overflow-hidden`.
- **Breakpoints:** Tailwind v4's `sm`, `md`, `lg`, `xl` and `2xl` only.
- **Errors:** each route has an error boundary whose "Try again" actually refetches.
- **No dead links.** If something isn't built yet, it isn't shown.
- **Overlays:** drawers, sheets and dialogs trap focus, close on Escape, and return focus to the element that opened them.
- **Code:** small, typed components, and no nested ternaries in JSX.

### Verification after each block

`node scripts/verify.mjs <url> --changed=<pages>` screenshots each page and audits it for horizontal scroll, clipping, overlap and low-contrast text. Then it runs the key user flows.

- **Changed pages** get the full matrix: 1440, 1024 and 390 px in light and dark.
- **Every other page** gets a quick check at 1440 px (light) and 390 px (dark).
- **Limits:** each scene waits for its main content (never `networkidle`), has a 15-second limit, and the whole run has a 2-minute budget. Scenes run in parallel and report their timing as they finish.
- **Kernel check:** key output, edge cases, reuse, no nested logic, error states, least surprise.

## Data decisions

DummyJSON's data has quirks, and each one is handled so the page stays honest:

| Data | What Plainly does | Why |
|---|---|---|
| `rating` doesn't match the product's own reviews. For product 1 it's 2.56, while its 3 reviews average 4.0. | The rating shown is the **average of the 3 reviews shown**, truncated. | A number that contradicts the reviews right below it is noise. This also matches decision #8: the rating rests on 3 reviews. |
| Every one of the 582 reviews has the same date. | Review dates aren't shown. | A date that's identical everywhere carries no information. |
| `minimumOrderQuantity` makes no sense (48 for a mascara). | Hidden, and never enforced. | It would look broken. |
| 92 of the 194 products have no `brand`. | The brand line only appears when a brand exists. | No "Unknown brand" filler. |
| Two titles are cut off in the source data ("Dolce Shine Eau de", "Gucci Bloom Eau de"). | Shown exactly as in the data. | Completing them would mean inventing data. |
| `price` together with `discountPercentage` | **Resolved in hours 9–13:** `price` is the list price *before* the discount. DummyJSON's own carts API charges `total × (1 − discountPercentage / 100)`, which settles it. So the price you pay is the discounted price, rounded to the cent, and it's used everywhere: cards, product page, cart, checkout, sorting and the price filter. Where there's a discount, the page shows it as "12% off" next to the price, with "List price ~~$29.99~~" underneath. The % is truncated, never rounded up. Discounts under 1% (7 products, a few cents at most) aren't presented as discounts. | Showing a discount means charging it, or the page would claim a saving the checkout doesn't give. Orders placed before this change keep the prices they were placed at. |
| `stock` and `availabilityStatus` | Cards show only exceptions ("Only N left" when stock is 5 or fewer, "Out of stock"). The product page also shows "In stock". Quantities are capped at stock, and at 10 per line. | "In stock" on every card is noise. Scarcity is only claimed when it's true. |
| `returnPolicy` is "N days return policy" or "No return policy" (44 products). `warrantyInformation` has ten phrasings, including "No warranty". | The decision card shortens them ("30-day returns", "1 year"). "No returns" is flagged in the warning color with an icon, because it counts against buying. "No warranty" shows as "None", unflagged. The seller's exact wording is kept in the "Shipping, returns and warranty" section. | The flag marks the one fact most likely to change a decision, without inventing a scale. |
| `shippingInformation` says when an item *ships* ("Ships in 1-2 business days", six phrasings in all), not when it arrives. | Checkout shows a **delivery estimate** per item: the ship window from the data plus 2–5 business days in transit. The page says the transit time is Plainly's assumption and calls every date an estimate. An unknown phrasing gets no estimate, and the text is shown as-is. | Transit time isn't in the data. A range with a stated assumption is honest; a single "Arrives Tuesday" would be a promise nobody can keep. |
| There's no payment, shipping cost or tax data, and the API is read-only. | Payment is simulated and the page says so. The summary says "Shipping and tax: none in this demo". Placing an order doesn't reduce stock. | Showing "Free shipping" would be a claim; showing nothing would look like a missing fee. |

## Brand

The logo concept was generated with Gemini, outside this agent session, so it isn't in `.agent-logs/`. The source image is kept at `design/gemini-logo-concept.jpeg`. It was then rebuilt here as SVG rather than traced: `LogoMark` in `src/components/Logo.tsx` uses `currentColor`, so the header mark is the action green in light mode and the mint in dark mode. `public/favicon.svg` uses the same geometry with a `prefers-color-scheme` switch. The 32 px PNG and the 180 px apple-touch-icon are rendered from that SVG by `scripts/icons.mjs`.

**The idea:** three columns stand for facts laid out side by side, which is what compare does.

The Gemini prompt, verbatim:

> Design a logo for "Plainly", an online store whose whole idea is shopping without noise: no ads, no fake badges, just honest facts about products. The brand should feel calm, trustworthy, and quietly confident, the opposite of a loud marketplace.
> Requirements:
> - Two parts: a simple icon mark, and the wordmark "Plainly" next to it.
> - The icon must stay recognizable at 16x16 px (favicon) and 32 px in a website header. One simple shape, no fine details, no gradients, no shadows, no 3D.
> - Flat design, solid colors only. Primary color: deep green #1F6B4A. The mark should also work as a single color, including a light mint #6FCB9D on a dark background.
> - Wordmark in a clean, neutral sans-serif similar to Public Sans, medium or semibold weight, normal letter spacing.
> - Possible directions for the icon: a rounded letter "P" with a subtle detail, a shopping bag reduced to one clean line, or a simple checkmark combined with a bag or a "P". Pick whatever reads most clearly at small sizes.
> - Avoid: arrows or smiles (too close to Amazon), stars, badges, sparkles, price tags, anything that looks like a sale sticker.
> - Plain white background, logo centered, with plenty of empty space around it.
> Show 4 different directions side by side so I can pick one.

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

### How #3–#5 were built (hours 9–13)

- **Filters in the URL.** Category and brand (both repeatable), min/max price, minimum rating and in stock are URL params, alongside `q` and `sort`, so a filtered view can be shared, bookmarked or reloaded. Changes replace the history entry, as sort already did, so Back leaves the search rather than undoing each click.
- **Counts:** each option shows how many results you'd get with it. Each facet's counts ignore that facet's own selection, so choosing a second category shows its real count. Options with nothing to show are hidden unless they're selected.
- **Order in the panel:** the short facets come first (availability, price, rating), then category and brand, which are long lists. Brand shows the 8 most common and a "Show all" toggle, because there are 60+. Price filters on the price you pay.
- **Phones:** below `lg`, a "Filters" button with a count of applied filters opens a bottom sheet. It's a native modal `<dialog>`, so focus is trapped and Escape closes it, and focus returns to the button. Filters apply as you tap; the footer says "Show N results".
- **Decision card on phones:** title, then the card, then the photos, so the facts that decide a purchase are on the first screen at 390×844. From `md` up the photos are on the left. A test checks that the facts sit above the fold at 1440×900, 1024×768 and 390×844.
- **Collapsible sections:** native `<details>`. Description and Reviews start open; "Shipping, returns and warranty" and "Product details" start closed.

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
| Hours 2–6 | The first verification run hung for more than 8 minutes and printed nothing. | It waited for `networkidle` while DummyJSON images kept loading, used Playwright's default 30 s timeouts, ran scenes one at a time, and only printed at the end. | Rewrote `verify.mjs`: waits for DOMContentLoaded plus a selector for each page's content, 15 s per scene, a 2-minute budget, 6 scenes in parallel, timing reported per scene. The full run now takes about 17 s. |
| Hours 2–6 | The overlap check called `getBoundingClientRect` once per pair of elements. | O(n²) layout reads. | Measure each element once and skip pairs that can't intersect. |
| Hours 2–6 | A one-letter search ("a") returned all 194 products under "Results for 'a'". | Single-character search words were dropped, which left no filter at all. | Single-character words are kept as search terms. |
| Hours 2–6 | A cart quantity saved in localStorage could be higher than current stock. | Saved quantities weren't checked against stock. | The cart clamps each line to what's in stock and skips out-of-stock lines. |
| Hours 2–6 | Latent: the gallery position, quantity and "Added" message would carry over when moving from one product page directly to another. | React Router reuses the same component when only the `:id` changes. | The product details are keyed by id. Nothing links product to product yet, so this couldn't happen yet. |
| Hours 2–6 | The error-boundary test reported its own console error as a failure. | The test blocks DummyJSON on purpose. | That test is exempt from the console-error check. |
| Hours 6–9 | Adding the Orders link pushed the theme toggle onto a row of its own on phones (390 px). | Logo, Orders, Cart and the toggle need about 370 px, and a phone has 358. | On phones, search and the theme toggle now share the second row. From `sm` up, everything is on one row. Checked at 320, 360, 390, 640 and 1024 px. |
| Hours 6–9 | Item thumbnails in checkout and orders stretched into tall strips on phones. | The image tile is a flex child, and flex's default `stretch` overrode its square aspect ratio when the text beside it wrapped. | `self-start` on the tile. |
| Hours 6–9 | On phones the line total sat next to the title for short titles and under it for long ones. Date ranges also broke in the middle of a date ("Thu," then "Oct 8" on the next line). | `flex-wrap` on the title row, and the range was one string. | The total always sits on the quantity row. Each date is `whitespace-nowrap`, so a range only breaks between its two dates. |
| Hours 6–9 | The missing-postcode error read "Enter your zip or postal code." | The message lowercased the whole field label. | Only a leading capital is lowercased, so acronyms keep their case. |
| Hours 6–9 | A DECISIONS.md edit script dropped everything after the inserted rows. | The insert kept only the text before the anchor. | Caught by checking section headings after the edit. Restored from git (no uncommitted changes were lost) and redone. |
| Hours 9–13 | A filter checkbox snapped back to unchecked for a moment after a click. Playwright caught it: "Clicking the checkbox did not change its state". | The controls read only from the URL, and React Router applies URL updates as a transition, so React re-rendered the old state first. Sort had the same lag. | The new params are kept locally and shown immediately, then dropped once the URL changes. |
| Hours 9–13 | The phone Filters button's accessible name didn't match "Filters, 1 applied", even though its text content was exactly that. | The name was assembled from separate flex items and screen-reader-only text, and the browser's name computation didn't join them into that string. | An explicit `aria-label`, and the visible count is `aria-hidden`. |
| Hours 9–13 | Latent, fixed before shipping: the sidebar and the bottom sheet each render the rating radios under the same `name`, so the browser would treat them as one group. | Two instances of one panel. | The group name comes from `useId()`, so it's unique per panel. |
| Hours 9–13 | Latent, fixed before shipping: the "showing 24" note would have stayed at 24 after "Show more". | The note was computed outside the component that knows how many are visible. | Moved into the result grid. |
| Hours 9–13 | The audit reported 70+ overlaps and clippings on the bottom-sheet screenshot, and the screenshot itself was misplaced. | It measured the page behind the modal, treated rows scrolled inside the sheet as clipped, and took a full-page screenshot of a fixed element. | With a modal open, only the modal is audited. Scroll containers don't count as clipping, boxes are cut to their scroll container before overlap checks, and modal scenes take a viewport screenshot. |
| Hours 9–13 | The chip test failed even though removing the chip did clear the Max input. | The URL changes before React re-renders, and the test read the input in between. | The test waits for the input to clear. |
