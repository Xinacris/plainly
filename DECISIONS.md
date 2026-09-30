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

These apply to every step:

- **Truthful copy.** Never show badges, delivery promises or discount claims the data doesn't support. Every number shown is computed from the data. Fields that would look broken are hidden.
- **Prices** are formatted with `Intl.NumberFormat`. **Ratings** are truncated to one decimal and never rounded up, so 4.99 shows as 4.9.
- **Cards size to their content.** No fixed heights with `overflow-hidden`.
- **Breakpoints:** Tailwind v4's `sm`, `md`, `lg`, `xl` and `2xl` only.
- **Errors:** each route has an error boundary whose "Try again" actually refetches.
- **No dead links.** If something isn't built yet, it isn't shown.
- **Overlays:** drawers, sheets and dialogs trap focus, close on Escape, and return focus to the element that opened them.
- **Context vs. filter.** Whatever is picked in the top bar (a department, "All products", "10%+ off") is *navigation context*: it's the page heading and the breadcrumb, the bar marks it as current, "Clear all" keeps it, and you leave it through the bar or the breadcrumb. Whatever is picked on the page is a *filter*: a removable chip, cleared by "Clear all". One context at a time; picking another in the bar replaces it.
- **Code:** small, typed components, and no nested ternaries in JSX.

### Verification after each step

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
| `price` together with `discountPercentage` | **Resolved while building facts instead of badges (#4):** `price` is the list price *before* the discount. DummyJSON's own carts API charges `total × (1 − discountPercentage / 100)`, which settles it. So the price you pay is the discounted price, rounded to the cent, and it's used everywhere: cards, product page, cart, checkout, sorting and the price filter. Where there's a discount, the page shows it as "12% off" next to the price, with "List price ~~$29.99~~" underneath. The % is truncated, never rounded up. Discounts under 1% (7 products, a few cents at most) aren't presented as discounts. | Showing a discount means charging it, or the page would claim a saving the checkout doesn't give. Orders placed before this change keep the prices they were placed at. |
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
| 7 | **Dark mode.** It follows the system setting, has a light / dark / system toggle, and is built on tokens from the first step. | People shop late at night. Building it in from the start costs little; adding it later means touching every component. |
| 10 | **Cut sign-in, Prime, recommendation carousels, lists, Q&A and seller pages.** The header is reduced to logo, search, Orders, Cart and the theme toggle, plus one bar of department links. The footer is one line on what's mocked and a repo link. | The header and footer are full of links nobody uses. Everything works as a guest, so the public URL works for anyone without signing in. |

**Home page:** Amazon's structure, not its look. A slim one-line intro so products show above the fold, a category bar, department cards with four subcategory tiles each, two product rows (biggest real discounts, highest rated) that say how they were chosen, and a minimal footer. No carousel and no sign-in block.

### How #3–#5 were built

- **Filters in the URL.** Category and brand (both repeatable), min/max price, minimum rating and in stock are URL params, alongside `q` and `sort`, so a filtered view can be shared, bookmarked or reloaded. Changes replace the history entry, as sort already did, so Back leaves the search rather than undoing each click.
- **Counts:** each option shows how many results you'd get with it. Each facet's counts ignore that facet's own selection, so choosing a second category shows its real count. Options with nothing to show are hidden unless they're selected.
- **Order in the panel:** the short facets come first (availability, price, rating), then category and brand, which are long lists. Brand shows the 8 most common and a "Show all" toggle, because there are 60+. Price filters on the price you pay.
- **Phones:** below `lg`, a "Filters" button with a count of applied filters opens a bottom sheet. It's a native modal `<dialog>`, so focus is trapped and Escape closes it, and focus returns to the button. Filters apply as you tap; the footer says "Show N results".
- **Decision card on phones:** first built as title, then the card, then the photos, so the facts were on the first screen at 390×844. Later changed to photo first (see "Product page on phones: photo first, swipeable gallery"). Desktop is unchanged: photos on the left, and a test still checks the facts are above the fold at 1440×900 and 1024×768.
- **Collapsible sections:** native `<details>`. Description and Reviews start open; "Shipping, returns and warranty" and "Product details" start closed.

### How #6 was built

- **Built with all 3 slots**, so the "Compare limited to 2" cut wasn't needed. Later limited to one department per comparison (see "Compare within one department").
- **Adding:** a "Compare" toggle on every card (`aria-pressed`, above the card's stretched link) and an "Add to compare" button in the decision card. A 4th add is refused, and the tray says "You can compare up to 3. Remove one to add another." for 5 seconds. The selection is saved in localStorage.
- **Tray:** fixed to the bottom on home, search and product pages only. It stays off `/compare`, the cart and checkout, so checkout keeps no distractions. The page gets bottom padding while the tray is visible, so it never covers the last row. It slides up with `@starting-style`, only under `prefers-reduced-motion: no-preference`; a test checks the transition is 0s under `reduce`. On phones it takes two rows, with a full-width Compare button.
- **Differences:** a row is marked when its value isn't the same for every product. It gets a tint *and* a visible "Differs" label, so color isn't the only signal, plus a "Show only what differs" option. There's no "best" marker: whether a longer warranty beats a lower price is the shopper's call, not ours.
- **Rows:** price you pay (with the discount and list price), rating, review count, delivery estimate, returns, warranty and stock, in the same words as the decision card. Review count is always 3 in this data, so that row never differs; it stays because hiding it would hide how thin the ratings are.
- **Phones:** the table keeps its columns, and each fact's label gets its own full-width row above the values, so three products fit in 390 px without sideways scrolling.

### How the return window, home page and polish pass were built

- **Return window (#9):** every item on the orders page and the confirmation shows its return policy and whether the window is still open. It's counted from the order date, as agreed, and the page says so: "Return window open until Oct 30, 2026 (30 days from the order date)". Once the window closes it says when it closed. "No return policy" items say "No returns for this item" in the warning color. A policy in an unknown wording is shown as written.
- **Departments:** eight departments group all 24 DummyJSON categories, each category in exactly one department (checked against the catalog). `/search?department=…` filters to them and sets the page heading. It first showed as a removable chip too; after testing it became navigation context instead (change 6 below).
- **Department bar:** a department bar under the header on every page. It scrolls sideways on phones and brings the current department into view.
- **Home:**
  - A one-line intro. On phones only the heading shows, so it stays one line.
  - Eight department cards (1 / 2 / 4 per row). Each is titled with the department name and its real product count, and has four tiles and a "See all" link. Category tiles are pictured by that category's best-rated product. A department with fewer than four categories fills the rest with its best-rated in-stock products, shown with their price. Women's fashion has six categories, so its tiles show the first four and "See all" covers the rest.
  - Two sideways rows, each saying how it was chosen. "Biggest discounts right now" is sorted by real discount %. "Highest rated" is built from the data, so its note says each rating averages just 3 reviews. Both rows are in stock only.
  - The footer says what's mocked and links to the repo.
- **Polish:**
  - Keyboard and screen readers: a skip link, a title for every page, and the theme toggle follows the ARIA radio-group keyboard pattern (one Tab stop, arrow keys).
  - Navigation: new pages start at the top, while filter changes keep your scroll position.
  - Errors: the tray has its own error boundary.
  - Checks: `verify.mjs` now runs axe-core (WCAG 2.1 A/AA and best practices) on the 1440-light and 390-dark scene of every page.

### Changes after testing the live site

1. **Breadcrumbs on the product page:** Department › Category › Brand › Product. Each step opens the matching search, and the brand step is the category filtered by that brand. Products without a brand skip that step, and the product name is plain text marked `aria-current`. On phones it stays on one line. The product name, which the heading right below repeats, gives way first, down to 3rem. Only then do the other steps shorten. Truncation is visual only: the full text stays in the DOM and in a tooltip. *Why:* shoppers want to see where a product sits and step back to a wider view in one tap.
2. **A "10%+ off" sale filter.**
   - **Why a threshold:** every product has some discount, so a plain "On sale" filter would show nearly everything.
   - **The numbers:** the displayed discounts spread almost evenly from 0% to 19% (median 10%). 14%+ would have been closest to a third of the catalog (61 products). **10%+ was chosen: 104 of 194 products (54%).** It's the most familiar sale threshold for shoppers, and it still removes the 90 products with small or no discounts.
   - **The trade-off:** the sale view covers more than half the catalog, so it narrows less than a stricter rule would.
   - **The rule:** it uses the same truncated whole-number % the cards show, so every product in the view shows at least "10% off". The chip is labeled with the rule itself.
   - **Where it appears:** first built as a filter everywhere (a chip even when opened from the bar). It was then split by the context-vs-filter rule (see "Sale view as context" below). The bar link and the home page's "Biggest discounts" "See all" open the sale view as context (`view=sale`, sorted by discount). The checkbox in the filter panel stays a filter (`sale=1`).
   - **Colour:** it has its own `sale` token, a calm berry (#a3285b light, #f39abf dark; 7.0 and 8.2:1 on surface). It's clearly a different hue from action green and from the warning color, which means low stock and no returns. The "N% off" text on cards and the decision card uses it too, so the token means "discount" everywhere.
3. **Two-row phone header.** Below `sm`, the header took three rows and pushed products down. Row 1 is now the logo, a cart icon with its count (the cart stays one tap away), and a menu button; row 2 is full-width search. The menu is the same modal sheet as the filters: focus stays in it, Escape closes it, and focus returns to the button. It holds Orders and the light / dark / system choice. It closes itself if the screen grows past `sm` while open (a phone turned sideways), so the page is never left inert behind a hidden modal. The department bar and the desktop header are unchanged.
4. **No "Best sellers" sort.** See "Considered, not now".
5. **Search that understands categories.**
   - **When it applies:** only when the *whole* query names a category, a department or a common synonym ("tee", "phone", "perfume", "watch"…). Search then applies that category instead of matching the words as text, and shows it as a chip, e.g. "Smartphones (from “phone”)". There's no redirect: the URL keeps `q`.
   - **Undo:** removing the chip sets `literal=1`, which gives a plain text search for the same words.
   - **Why whole-query only:** "phone case" means an accessory, not a smartphone, so it stays a text search.
   - **Plurals:** matching ignores simple plurals ("dresses", "watches", "accessories").
   - **A mapping changed from the example:** DummyJSON's "tops" holds only frocks and dresses, and every shirt is in "mens-shirts". So "t-shirt", "tee" and "shirt" map to Men's shirts only; mapping them to tops as well would answer "t-shirt" with dresses.
6. **The department is navigation context, not a filter.** A department chosen from the bar shows as the page heading and in a breadcrumb ("All products › Electronics"), not as a chip. "Clear all" removes only filters chosen on the page (category, brand, price, rating, stock, sale, and a query's category). The department is left through the breadcrumb or "All products".
7. **The "System" theme option shows the device's icon:** a phone, a tablet or a monitor.
   - **Detection:** pure CSS media queries, no user-agent check. A coarse pointer with a width under 48rem (Tailwind's `md`), or a height of 500px or less (a phone on its side), is a phone. Any other coarse pointer is a tablet. Anything else is a desktop.
   - **Live and stable:** all three icons sit in one grid cell and CSS shows one, so the swap is live on resize and rotation and never shifts layout.
   - **Accessibility:** the accessible name is "System" in every case; the options are now named Light, Dark and System, inside the "Theme" group.
   - **Where:** the same component serves the header and the phone menu, where it shows the labels.

### Sale view as context, and typo tolerance

- **Sale view as context.** "10%+ off" follows the same rule as departments.
  - **From the bar or the home page:** it opens `/search?view=sale`, which is context. The heading is "10%+ off", the breadcrumb is "All products › 10%+ off", and the bar marks it as current. It has no chip, and "Clear all" keeps it.
  - **Inside it:** category, brand, price, rating and stock are normal filters. The panel hides the "10%+ off" checkbox there, because it could only contradict the view.
  - **Leaving it:** clicking a department or "All products" in the bar leaves the view.
  - **On the page elsewhere:** checked in the panel on a department or on "All products", "10%+ off" is a filter (`sale=1`): a chip, removed by "Clear all".
  - **One context at a time:** if a URL carries both, the sale view wins over a department.
  - **Why:** the same click in the same bar must mean the same thing. Otherwise a sale "chip" that "Clear all" wipes would drop you out of the page you navigated to.
- **Typo tolerance.** "lptop", "iphnoe", "aple watch" and "smartphnes" find the right products, entirely in the browser.
  - **When it runs:** only when the query as typed finds nothing, so exact queries are never mixed with loose matches.
  - **Which words it fixes:** each word of 4+ letters that doesn't start any real word in the catalog (descriptions included).
  - **Candidates:** the catalog's title, brand and category words plus the category synonyms. The fix is the closest one by edit distance, counting a swap of two neighbouring letters as one edit: at most 1 edit up to 5 letters, 2 edits from 6 letters, and a 2-edit fix must keep the first letter. Ties go to the word more products use.
  - **Checked:** none of the 600+ words in product titles gets "corrected" when searched on its own.
  - **Honest and undoable:** the page says "Showing results for laptop · Search instead for lptop". The heading shows the corrected query, and the link searches the typed words exactly (`literal=1`: no correction, no category matching).
  - **With category matching:** a corrected query that names a category still gets that chip ("smartphnes" → Smartphones). Removing the chip searches the corrected words as text.

### Two-step category filter

- **Two steps without a department context.** On All products and in the 10%+ off view, the Category filter first lists the departments with result counts. Picking one reveals its categories with their counts, under a "‹ All departments" button that goes back.
  - **Why:** 24 flat categories is a long list to scan. Departments are the same grouping the top bar uses, so the panel speaks the same language.
- **A department picked here is a filter, not context** (the context-vs-filter rule).
  - **URL:** it's `dept=…` (context stays `department=…`).
  - **Chip:** it shows as a chip labeled "Electronics department". The word "department" is there because Beauty and Groceries each contain a category with the same name, and two "Beauty" chips would be ambiguous.
  - **Clearing:** "Clear all" removes it. Removing its chip, or going back, also drops the categories picked inside it, since they belonged to that step.
  - **The page stays in its context:** the heading and breadcrumb don't change.
- **Inside a department context**, the filter lists that department's categories directly, as before.
- **Counts:** they respect every other active filter, the sale view and a query's category. A department's count is exactly the number of results you get by picking it; a test compares the two in the sale view, with rating and stock filters, and on a text search. Departments with nothing to show are hidden.
- **Keyboard:** after picking a department, focus moves to "All departments"; after going back, it returns to that department. Nobody is dropped at the top of the page.
- **Everywhere:** it's one component, so it works the same in the desktop sidebar and the phone filter sheet (tested in both).
- **Loose categories:** a category picked without a department (e.g. from an old link) stays listed as a ticked checkbox above the departments, so it can be removed.
- **Home tiles:** the home page's category tiles now open their department as context with the category filtered, like the product breadcrumb, instead of a bare category filter.

### Compare within one department

- **The rule:** products can only be compared within one department.
  - **Why:** a blender, an ice cube tray and a car side by side give the shopper nothing to decide with.
  - **Why department, not category:** the categories in this data are narrow. Laptop vs. tablet is a real buying decision, but they're separate categories (Laptops, Tablets), so a category rule would forbid it.
- **How it works:**
  - **Setting it:** the first product added sets the tray's department, and the tray and the compare page heading say so ("Comparing in Electronics"). "Add one more" links stay in that department.
  - **Another department:** adding a product from another department doesn't fail silently. A small modal asks "Compare works within one department. Start a new comparison with this item?", names both departments, and offers **Start new** (clears the tray and adds this item) and **Cancel**.
  - **The modal:** it follows the overlay rules (focus trapped, Escape cancels, focus returns to the toggle). Cancel has the initial focus, because Start new throws the current comparison away.
  - **Toggles elsewhere:** Compare toggles on cards from other departments stay visible, since the prompt is the explanation. Their pressed state only ever reflects what's actually in the tray, so while asking, after Cancel or after Escape they never look added.
  - **Old saved selections:** a selection saved before this rule (v1 of the stored state) that mixed departments keeps only the first department's items, in the order added. The tray says why, once: "Your saved comparison mixed departments, so only the Beauty items were kept." The repaired selection is saved, so the notice doesn't come back.

### Product page on phones: photo first, swipeable gallery

- **Photo first on phones.** The first thing below the header is now the product photo, then the breadcrumb, title and rating, then the decision card with the price.
  - **Why:** people check they're on the right product before they read facts. This reverses the earlier facts-first order on phones.
  - **Keeping the price on the first screen:** the photo tile is capped at 45% of the viewport height (`max-h-[45dvh]`). At 390×844 it's a 358 px square, 42% of the height, and the price still ends on the first screen.
  - **The test:** the old phone above-the-fold check was replaced. It now checks the photo's tile starts right below the header, the order is photo → title → price, the tile is 38–46% of the height, and the price ends within 844 px. It runs on four products: the longest title, one photo, out of stock, and six photos.
  - **Desktop:** unchanged.
- **Swipeable gallery.**
  - **One scroller:** all photos sit in one native horizontal scroller with `scroll-snap`, one photo per snap point. On phones you swipe it like a phone gallery; the scroller keeps the swipe (`overscroll-x-contain`) and the page never scrolls sideways.
  - **Dots:** they show the position, can be tapped, and update as you swipe. The scroll position is the single source of truth.
  - **Desktop:** the scroller can't be scrolled by hand, and the thumbnails work as before. The gallery is focusable, and ←/→ move between photos, including from a focused thumbnail (focus follows to the new one). The keys stop at the first and last photo.
  - **Reduced motion:** smooth scrolling is skipped.
  - **Single photo:** no dots, no thumbnails and nothing to swipe.
  - **Screen readers:** the gallery's accessible name says where you are ("300 Touring photos, 3 of 6"), and each photo's alt text says which one it is.

## Changed from the proposal

| # | Proposal | Decision | Why |
|---|---|---|---|
| 8 | Star distribution and filtering reviews by star | **Cut.** Show the real reviews, with a clear note that the rating is based on only 3 reviews. | DummyJSON has exactly 3 reviews per product. A distribution chart built from 3 data points is the kind of noise this product rejects. |
| 9 | A full return flow from the order page | **Simplified.** The orders page shows each item's return policy and whether its return window is still open, counted from the order date. | This answers "can I still return this?" without building a flow the mock backend can't carry out. |

## Considered, not now

- **Full return flow:** return reasons, return status, and a replacement option.
- **Star distribution for reviews:** not meaningful with 3 reviews per product (see #8).
- **Accounts and lists:** sign-in, saved addresses per user, wishlists. Guest use with localStorage covers the core loop.
- **A "Best sellers" sort.** DummyJSON has no sales data. Any popularity ranking would have to be invented, from stock, rating or the order of the data, and presenting a made-up signal as popularity is exactly the noise Plainly rejects. The sorts stay relevance, price, rating and discount, each computed from data the page shows.

## Build order

The work runs in this order. Each step ends with a deploy, so there is always a working live URL.

| Step | Ships |
|---|---|
| 1 | Project setup, theme tokens with dark mode, minimal header, Vercel deploy with the deep-link rewrite |
| 2 | Catalog loading, search results, basic product page, cart |
| 3 | Checkout, confirmation, order list, logo. **The full purchase loop works. This is the MVP line.** |
| 4 | Filters and chips, facts instead of badges, decision card with the honest review section |
| 5 | Compare tray |
| 6 | Return policy and return window on orders, home page, then a polish pass: mobile layout, loading, empty and error states, keyboard and accessibility |
| 7 | Changes from testing the live site, in this order: breadcrumbs, the 10%+ off sale filter, a two-row phone header with a menu, category-aware search, the department as navigation context, and a device-matched "System" theme icon; then the sale view as context (the context-vs-filter rule), typo-tolerant search, and a two-step category filter, compare limited to one department, and on phones a photo-first product page with a swipeable gallery |
| 8 | No new features. Bug fixes, README, final deploy |

**If something has to be cut, cut in this order:**
1. Return window on orders
2. Home discount row: the home page becomes intro and categories only
3. Compare limited to 2 products instead of 3

**Never cut:** the purchase loop, dark mode or the decision card.

## Before the build

- **Amazon rather than Higgsfield AI.** I first compared an Amazon rebuild with a Higgsfield AI rebuild. I dropped Higgsfield because the Pexels API had paused new keys, which left me with no reliable video source.
- **Starting clean.** An earlier Amazon prototype built with another tool copied Amazon's branding and had pricing and layout bugs. That's why this build starts from an empty project, under its own name.

## Deployment notes

- **Vercel Security Checkpoint.** After the compare tray was deployed, production started answering this machine's automated requests with a 403 "Vercel Security Checkpoint" page. That meant both `curl` and the headless Chromium in `verify.mjs`, so every live check timed out. Repeated full verification runs against production had most likely been flagged as bot traffic. Vercel reported the deployment as successful, and the site opened normally in a regular browser: the checkpoint blocked verification, not real visitors.
- **Since then:** the full verification (every scene and flow) runs against a local preview build (`vite preview`) of the commit being deployed. The live URL gets a single light smoke check at the end (`verify.mjs --smoke`: the home page in light mode at 1440 px), so automated traffic to production stays minimal.

## Bug log

| During | Bug | Cause | Fix |
|---|---|---|---|
| Catalog, search, cart | The first verification run hung for more than 8 minutes and printed nothing. | It waited for `networkidle` while DummyJSON images kept loading, used Playwright's default 30 s timeouts, ran scenes one at a time, and only printed at the end. | Rewrote `verify.mjs`: waits for DOMContentLoaded plus a selector for each page's content, 15 s per scene, a 2-minute budget, 6 scenes in parallel, timing reported per scene. The full run now takes about 17 s. |
| Catalog, search, cart | The overlap check called `getBoundingClientRect` once per pair of elements. | O(n²) layout reads. | Measure each element once and skip pairs that can't intersect. |
| Catalog, search, cart | A one-letter search ("a") returned all 194 products under "Results for 'a'". | Single-character search words were dropped, which left no filter at all. | Single-character words are kept as search terms. |
| Catalog, search, cart | A cart quantity saved in localStorage could be higher than current stock. | Saved quantities weren't checked against stock. | The cart clamps each line to what's in stock and skips out-of-stock lines. |
| Catalog, search, cart | Latent: the gallery position, quantity and "Added" message would carry over when moving from one product page directly to another. | React Router reuses the same component when only the `:id` changes. | The product details are keyed by id. Nothing links product to product yet, so this couldn't happen yet. |
| Catalog, search, cart | The error-boundary test reported its own console error as a failure. | The test blocks DummyJSON on purpose. | That test is exempt from the console-error check. |
| Checkout, orders, logo | Adding the Orders link pushed the theme toggle onto a row of its own on phones (390 px). | Logo, Orders, Cart and the toggle need about 370 px, and a phone has 358. | On phones, search and the theme toggle now share the second row. From `sm` up, everything is on one row. Checked at 320, 360, 390, 640 and 1024 px. |
| Checkout, orders, logo | Item thumbnails in checkout and orders stretched into tall strips on phones. | The image tile is a flex child, and flex's default `stretch` overrode its square aspect ratio when the text beside it wrapped. | `self-start` on the tile. |
| Checkout, orders, logo | On phones the line total sat next to the title for short titles and under it for long ones. Date ranges also broke in the middle of a date ("Thu," then "Oct 8" on the next line). | `flex-wrap` on the title row, and the range was one string. | The total always sits on the quantity row. Each date is `whitespace-nowrap`, so a range only breaks between its two dates. |
| Checkout, orders, logo | The missing-postcode error read "Enter your zip or postal code." | The message lowercased the whole field label. | Only a leading capital is lowercased, so acronyms keep their case. |
| Checkout, orders, logo | A DECISIONS.md edit script dropped everything after the inserted rows. | The insert kept only the text before the anchor. | Caught by checking section headings after the edit. Restored from git (no uncommitted changes were lost) and redone. |
| Filters, facts, decision card | A filter checkbox snapped back to unchecked for a moment after a click. Playwright caught it: "Clicking the checkbox did not change its state". | The controls read only from the URL, and React Router applies URL updates as a transition, so React re-rendered the old state first. Sort had the same lag. | The new params are kept locally and shown immediately, then dropped once the URL changes. |
| Filters, facts, decision card | The phone Filters button's accessible name didn't match "Filters, 1 applied", even though its text content was exactly that. | The name was assembled from separate flex items and screen-reader-only text, and the browser's name computation didn't join them into that string. | An explicit `aria-label`, and the visible count is `aria-hidden`. |
| Filters, facts, decision card | Latent, fixed before shipping: the sidebar and the bottom sheet each render the rating radios under the same `name`, so the browser would treat them as one group. | Two instances of one panel. | The group name comes from `useId()`, so it's unique per panel. |
| Filters, facts, decision card | Latent, fixed before shipping: the "showing 24" note would have stayed at 24 after "Show more". | The note was computed outside the component that knows how many are visible. | Moved into the result grid. |
| Filters, facts, decision card | The audit reported 70+ overlaps and clippings on the bottom-sheet screenshot, and the screenshot itself was misplaced. | It measured the page behind the modal, treated rows scrolled inside the sheet as clipped, and took a full-page screenshot of a fixed element. | With a modal open, only the modal is audited. Scroll containers don't count as clipping, boxes are cut to their scroll container before overlap checks, and modal scenes take a viewport screenshot. |
| Filters, facts, decision card | The chip test failed even though removing the chip did clear the Max input. | The URL changes before React re-renders, and the test read the input in between. | The test waits for the input to clear. |
| Compare tray | On phones the tray squeezed "Compare 2 of 3" into three lines. | Thumbnails, label, Clear and the Compare button were in one row that doesn't fit in 358 px. | Two rows on phones: thumbnails with the count and Clear, then a full-width Compare button. One row from `sm` up. |
| Compare tray | The lint flagged `setState` inside an effect in the tray's "compare is full" notice. It would also have shown an old notice again whenever the tray remounted. | The notice's timing lived in the component. | The store sets the flag and clears it after 5 seconds itself. The component only reads it. |
| Compare tray | The audit flagged the tray thumbnails' corner "×" buttons and the content scrolling under the fixed tray as overlaps. | Both are deliberate layering. | The audit skips pairs where only one element is inside a fixed bar, and an absolutely positioned control sitting on its sibling. |
| Orders, home, polish | Latent, found in review: with products in the compare tray, a catalog failure would have crashed the whole app instead of showing the error page. | The tray reads the catalog in the layout, outside each route's error boundary. | The tray has its own boundary that hides it; the route shows "Something went wrong". A test blocks the API with items in compare. |
| Orders, home, polish | Latent, found in review: opening a product from far down the search results kept the scroll position, so the product page could open scrolled down. | The router had no `ScrollRestoration`. | Added it. Filter and sort changes pass `preventScrollReset`, so they keep your place. Both are tested. |
| Orders, home, polish | The theme toggle is a radio group, but every option was its own Tab stop and the arrow keys did nothing. | The ARIA radio pattern wasn't fully implemented. | One Tab stop (the checked option), and the arrow keys move and select, wrapping around. Tested. |
| Orders, home, polish | Every browser tab said "Plainly", whatever the page. | Pages didn't set a title. | Each page sets its own ("Electronics · Plainly", the product name, "Checkout · Plainly"). |
| Orders, home, polish | The intro strip wrapped to two lines on phones, and the current department could sit out of sight in the department bar. | The full sentence doesn't fit in 358 px; the bar never scrolled to the active link. | Phones show only the intro heading; the bar scrolls the active link to its middle. Both tested at 390 px. |
| Orders, home, polish | The audit flagged cards in the sideways rows as off-screen, and text inside closed `<details>` as overlapping the footer. | Both are hidden by design. | The audit skips items inside horizontal scrollers and content of closed `<details>`. |
| Testing the live site | Product pages scrolled sideways on phones once the one-line breadcrumb was added. | The mobile grid had an implicit `auto` column, so the breadcrumb's unbroken width set the column width. | `grid-cols-1` (a `minmax(0, 1fr)` track), so the breadcrumb truncates instead. The audit caught it at 390 px. |
| Testing the live site | On phones the breadcrumb cut every step ("Electro…", "Ap…") while the product name kept space, and then still cut "Electronics" by a pixel. | Flex shrinking shares the overflow among all items by weight, so even a 1000× weight leaves the others a sliver. | The product step starts at zero width and only takes the leftover space (at least 3rem). The other steps keep their full width unless they overflow on their own. A test checks no ancestor step is cut at 390 px. |
| Testing the live site | Latent, fixed before shipping: opening the phone menu and then turning the phone sideways past `sm` would hide the menu's container while the modal stayed open, leaving the whole page inert. | The menu lives in the phones-only part of the header. | The menu closes itself when the viewport reaches `sm`. Tested by rotating with the menu open. |
| Testing the live site | The applied-filter chips weren't reachable as a list. | The `<ul>` used `display: contents`, which can drop its list role. | The list is a real flex container. |
| Testing the live site | The filter-sheet focus test failed after the sheet gained a control. | The test pressed Tab 40 times and checked the final spot. Past the last control a native modal hands focus to the browser's UI and back, and that's where the 40th press landed. | The test checks every press: focus must stay in the modal or on the browser UI, never on the page behind. The menu uses the same check. |
| Sale view, typos | Latent, found while probing the correction before shipping: "aple watch" found nothing and wasn't corrected. | A word counted as "real" if the text search matched it anywhere, and "aple" happens to appear inside some product description. | A word counts as real only if it starts a word in the catalog; corrections come only from titles, brands, categories and synonyms. A probe confirmed no title word is ever "corrected". |
| Photo-first product page | Two quick → presses from the first photo only reached the second. | Each key press starts a smooth scroll, and the scroll events on the way reported intermediate positions, which reset the current photo before the second press. | While a scroll the gallery started is on its way, it keeps the target and ignores positions passed through; `scrollend` syncs the final one. Tested with repeated presses, from a thumbnail, and at the end. |
| Photo-first product page | The swipe test couldn't swipe: Chromium's `Input.synthesizeScrollGesture` left the gallery at 0 in either direction. | That synthetic gesture doesn't drive the scroller in this headless build. | The test sends raw touch events (`touchStart`, ten `touchMove`s, `touchEnd`), a real finger swipe. Native scrolling and snapping then land exactly on the next photo and back. |
| Photo-first product page | On phones the gallery photo wasn't centered: the photo's tile was narrower than the frame and left a gap on the right. At 390×664 (a 390 px phone with its browser bars showing) the tile was 299 px in a 358 px frame; at 360×640 it was 288 in 328. Slides and snapping were aligned; only the tile inside each slide was off. The earlier test missed it because it only ran at 844 px tall, where the cap never applies. | The tile combined `aspect-ratio: 1` with `max-height: 45dvh` and an auto width. CSS carries a max-height across the aspect ratio into a max-width, so on shorter screens the tile shrank to 45dvh wide and sat left-aligned in its slide. | The tile has an explicit `w-full`, so only its height is capped and the photo centers inside it. A new test at 360, 390 and 414 px, each at a short height (bars showing) and a tall one, swipes through all six photos. After each swipe it checks snap alignment (to the pixel), slide and tile width equal to the frame's inner width, and the photo's center within 1 px of the frame's center. It failed on the old build at all three widths and passes now. |
| Photo-first product page | A green focus ring could show around the gallery after a tap. | The gallery is focusable (for ←/→), and a tap focused it. Chromium doesn't treat that as `:focus-visible`, but browsers apply that rule differently for focusable regions. | A mouse or touch press no longer focuses the gallery (`preventDefault` on `mousedown`), so the ring appears only for keyboard focus via Tab. The same test taps the photo and a dot and checks that nothing in the gallery has an outline or matches `:focus-visible`. |
| Photo-first product page | While swiping on a phone, a curved notch and a thin dark seam showed in the middle of the gallery until the swipe settled. | Each slide's tile drew its own rounded corners and light background, so two tiles side by side showed four rounded corners with the page background between them. | The gallery frame now carries the rounded corners and the light tile background and clips its scrolling content. Slides and tiles are square with no background and no gap, so a swipe looks like one surface sliding. For iOS Safari, where a rounded scrolling container sometimes doesn't clip composited content, the frame is `isolation: isolate` with a `translateZ(0)` layer. A `-webkit-mask-image` would also work but would clip the keyboard focus ring. This has not been checked on a real iOS device, since only Chromium runs here. The full-width tiles, centered photos and no-ring-on-tap from the previous fix are unchanged and still tested. New checks: at 360, 390 and 414 px, slides and tiles have no radius or background, there's no gap between slides, and the frame is rounded, clips, is isolated and composited. A dark-mode pixel test holds a real touch swipe halfway: where the slides meet, the pixels at the frame's top and bottom edge must be tile color, and the frame's corner must be page color. On the old build that test read the page background at the seam; it passes now. |
