# Plainly: Decisions

## Thesis

**Plainly is Amazon without the noise: decide with facts, not noise.**

Search results are ranked honestly, with no sponsored slots and no badges. The facts you need before buying (price, delivery, returns, warranty) are shown up front. You can compare products on one screen instead of across tabs. Amazon's fast checkout stays, and the whole site works in dark mode.

## Stack

- **Framework:** Vite, React, TypeScript and React Router. There's no server rendering, because the data comes from a public mock API, so SSR adds nothing.
- **Data:** TanStack Query loads DummyJSON's catalog of 194 products once. Search, filters and sorting then run in the browser, so they're instant, and facets that the API doesn't offer become possible.
- **Local state:** Zustand with the `persist` middleware stores the cart, compare list, theme, language and display settings in localStorage, plus addresses and orders for guests.
- **Accounts:** Supabase (Auth and Postgres with row-level security, EU region) for signed-in addresses, orders and returns; see "Accounts, reversed from Cut". supabase-js loads on demand, so guests never download it.
- **Languages:** English and Turkish from two typed message catalogs, with no i18n library; see the revision round, item 11.
- **Styling:** Tailwind v4, with every color defined as a CSS variable token.
- **Hosting:** Vercel, with a rewrite that sends every path to `index.html`, so deep links load directly.

## Build rules

These apply to every step:

- **Truthful copy.** Never show badges, delivery promises or discount claims the data doesn't support. Every number shown is computed from the data. Fields that would look broken are hidden.
- **Prices** are formatted with `Intl.NumberFormat`. **Ratings** are truncated to one decimal and never rounded up, so 4.99 shows as 4.9.
- **Cards size to their content.** No fixed heights with `overflow-hidden`. The one exception is deliberate: product card titles take exactly two lines and end in an ellipsis, so every line of a card aligns across a row. The full title stays in the DOM and in a tooltip.
- **Breakpoints:** Tailwind v4's `sm`, `md`, `lg`, `xl` and `2xl` only.
- **Errors:** each route has an error boundary whose "Try again" actually refetches.
- **No dead links.** If something isn't built yet, it isn't shown.
- **Overlays:** drawers, sheets and dialogs trap focus, close on Escape, and return focus to the element that opened them.
- **Context vs. filter.** Whatever is picked in the top bar (a department, "All products", "10%+ off") is *navigation context*: it's the page heading and the breadcrumb, the bar marks it as current, "Clear all" keeps it, and you leave it through the bar or the breadcrumb. Whatever is picked on the page is a *filter*: a removable chip, cleared by "Clear all". One context at a time; picking another in the bar replaces it.
- **Code:** small, typed components, and no nested ternaries in JSX.

### Verification after each step

`node scripts/verify.mjs [url] --changed=<pages>` screenshots each page and audits it for horizontal scroll, clipping, overlap and low-contrast text, and runs axe-core (WCAG 2.2 A/AA and best practices). Then it runs the user flows. It runs against a local preview of the test build (see "Deployment notes"). The final run has 111 scenes and 94 flows in about 90 seconds, 10 at a time. It also runs `scripts/rls-test.mjs` (33 checks).

- **Changed pages** get the full matrix: 1440, 1024 and 390 px in light and dark.
- **Every other page** gets a quick check at 1440 px (light) and 390 px (dark).
- **Limits:** each scene waits for its main content (never `networkidle`), has a 15-second limit, and the whole run has a 2-minute budget. Scenes run in parallel and report their timing as they finish.
- **Locale and display:** pages open in English unless a test asks for Turkish. `--display=larger,contrast` runs everything again at the largest text size with increased contrast.
- **Kernel check:** key output, edge cases, reuse, no nested logic, error states, least surprise.

## Data decisions

DummyJSON's data has quirks, and each one is handled so the page stays honest:

| Data | What Plainly does | Why |
|---|---|---|
| `rating` doesn't match the product's own reviews. For product 1 it's 2.56, while its 3 reviews average 4.0. | The rating shown is the **average of the 3 reviews shown**, truncated. | A number that contradicts the reviews right below it is noise. This also matches decision #8: the rating rests on 3 reviews. |
| Every one of the 582 reviews has the same date. | Review dates aren't shown. | A date that's identical everywhere carries no information. |
| `minimumOrderQuantity` makes no sense (48 for a mascara). | Hidden, and never enforced. | It would look broken. |
| 92 of the 194 products have no `brand`. | No brand is shown for them. On cards the brand line stays, empty and hidden from screen readers, so the lines of every card align across a row. | No "Unknown brand" filler. |
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

### 404 illustration

Also generated with Gemini, outside this agent session. The source, `design/gemini-404-concept.jpeg` (1200×896), stays in the repo: three bars like the logo's, the middle one tipped over.

**Redrawn as SVG so it follows the theme.** The first version used the JPEG on the light image tile. Since then the illustration has been an inline SVG component, `MissingBarArt`, like `LogoMark`:
- **No tile:** transparent, with no background.
- **Bars:** `currentColor`, the action green in light mode and the mint in dark mode.
- **Outline:** a dashed rectangle in the muted token.

**The pose took two tries.** The concept's middle bar leans at about 45° between the uprights, and the three shapes read as the letter "N". A bar lying flat below two upright ones read as a face (two eyes and a mouth), and it had lost the logo's rounded corners. The illustration is now the logo mark itself, with the same geometry and corner radius. The middle bar is replaced by a dashed outline of where it should be, inset by half its stroke so its outer edge is the missing bar's. It says "something is missing from its place", matching "This page isn't here", without reading as a letter or a face. The 404 test checks two bars in the action color, one dashed outline in the muted color, and no tile.

The Gemini prompt, verbatim:

> Create a flat illustration for the "page not found" (404) screen of Plainly, a calm, honest online store. Concept: three rounded vertical bars standing side by side, like the brand's logo, but the middle one has gently tipped over and is lying on its side. The mood is light and slightly playful, not dramatic or sad: something is simply missing from its place. Style requirements: Flat design, solid colors only. No gradients, no shadows except one soft flat ground shadow under the bars, no 3D, no textures. Colors: deep green #1F6B4A for the bars, a soft neutral #E7E8E3 background filling the whole image edge to edge, and at most one small accent in muted berry #A3285B (for example a tiny detail on the fallen bar). No text, letters or numbers anywhere in the image, including no "404". Simple composition, centered, with plenty of empty space around the bars. Aspect ratio 4:3. Show 3 variations side by side so I can pick one.

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
| 10 | **Cut sign-in** (reversed later: see "Accounts, reversed from Cut"), **Prime, recommendation carousels, lists, Q&A and seller pages.** The header is reduced to logo, search, Orders, Account, Cart and the language and theme controls, plus one bar of department links. The footer is one line on what's mocked, plus Privacy, Accessibility and a repo link. | The header and footer are full of links nobody uses. Everything works as a guest, so the public URL works for anyone without signing in. |

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
  - Checks: `verify.mjs` now runs axe-core (WCAG 2.1 A/AA and best practices, later 2.2) on the 1440-light and 390-dark scene of every page.

### Changes after testing the live site

1. **Breadcrumbs on the product page:** Department › Category › Brand › Product. Each step opens the matching search, and the brand step is the category filtered by that brand. Products without a brand skip that step, and the product name is plain text marked `aria-current`. On phones it stays on one line. The product name, which the heading right below repeats, gives way first, down to 3rem. Only then do the other steps shorten. Truncation is visual only: the full text stays in the DOM and in a tooltip. *Why:* shoppers want to see where a product sits and step back to a wider view in one tap.
2. **A "10%+ off" sale filter.**
   - **Why a threshold:** every product has some discount, so a plain "On sale" filter would show nearly everything.
   - **The numbers:** the displayed discounts spread almost evenly from 0% to 19% (median 10%). 14%+ would have been closest to a third of the catalog (61 products). **10%+ was chosen: 104 of 194 products (54%).** It's the most familiar sale threshold for shoppers, and it still removes the 90 products with small or no discounts.
   - **The trade-off:** the sale view covers more than half the catalog, so it narrows less than a stricter rule would.
   - **The rule:** it uses the same truncated whole-number % the cards show, so every product in the view shows at least "10% off". The chip is labeled with the rule itself.
   - **Where it appears:** first built as a filter everywhere (a chip even when opened from the bar). It was then split by the context-vs-filter rule (see "Sale view as context" below). The bar link and the home page's "Biggest discounts" "See all" open the sale view as context (`view=sale`, sorted by discount). The checkbox in the filter panel stays a filter (`sale=1`).
   - **Colour:** it has its own `sale` token, a calm berry (#a3285b light, #f39abf dark; 7.0 and 8.2:1 on surface). It's clearly a different hue from action green and from the warning color, which means low stock and no returns. The "N% off" text on cards and the decision card uses it too, so the token means "discount" everywhere.
3. **Two-row phone header.** Below `sm`, the header took three rows and pushed products down. Row 1 is now the logo, a cart icon with its count (the cart stays one tap away), and a menu button; row 2 is full-width search. The menu was the same modal sheet as the filters, and is now a drawer from the right (revision item 8). Either way, focus stays in it, Escape closes it, and focus returns to the button. At first it held Orders and the light / dark / system choice; it now holds the account, Orders, Addresses, Profile, the language and theme choices, and Accessibility. It closes itself if the screen grows past `sm` while open (a phone turned sideways), so the page is never left inert behind a hidden modal. The department bar and the desktop header are unchanged.
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

### Cart feedback: toast, in-cart line, mini-cart

- **Add-to-cart toast** replaces the inline "Added N to your cart". The old text didn't say whether N was what was just added or the total.
  - **Content:** the toast shows the thumbnail and name, what was just added ("3 added to your cart"), and the running total only when it's more than that ("You now have 7 of these in your cart"). Actions: View cart and Checkout.
  - **Position:** on desktop it's at the top right, just below the header, aligned with the page's right edge, so the cart link sits right above it. On phones it's full width near the top, below the header (or at the top of the screen once the header has scrolled away), never near the compare tray at the bottom.
  - **Behaviour:** it dismisses itself after 5 seconds, pauses while hovered or focused (resuming gives it a fresh 5 seconds), and has a close button.
  - **One at a time:** adding again while it's open updates it and restarts the timer; there's never a second toast.
  - **Screen readers:** an always-mounted, visually hidden polite live region announces each add, so the card's buttons aren't read out as part of the announcement.
  - **Motion:** the slide-in runs only under `prefers-reduced-motion: no-preference`.
- **What's already in the cart.** Next to Add to cart, a persistent, live line reads "7 in your cart · View cart".
  - **Quantity:** the selector offers only what can still be added.
  - **The limit, in words:** "You can add up to 3 more (only 4 in stock)" or "(limit 10 per item)". At the limit, the selector and button go and it says "You can't add more: that's the most you can buy (…)".
- **Mini-cart preview** on the desktop header's cart link. It shows items (thumbnail, name, quantity, line price), the subtotal, View cart and Checkout, and an empty state.
  - **Mouse:** it opens 150 ms after the pointer arrives and closes 300 ms after it leaves, so a quick pass doesn't flicker and moving into the panel keeps it open.
  - **Keyboard:** it opens on keyboard focus only (`:focus-visible`); the link is marked `aria-expanded`. Escape closes it and returns focus to the cart link, and tabbing out closes it.
  - **Touch:** touch pointers never open it, and a tap's focus isn't keyboard focus, so tapping the cart link goes straight to the cart.
  - **The toast:** the preview and the toast never overlap. Opening the preview dismisses the toast, since the preview shows the same news.
  - **Phones:** the icon-only cart link has no preview.

### Address book, order management, Account menu

Built while sign-in was still cut, so at first everything stayed in this browser, like the cart. Accounts came later and use the same pages (see "Accounts, reversed from Cut"); guests still keep everything in the browser. Guest checkout stays the default.

- **Address book (`/addresses`):**
  - Add, edit (in place) and delete addresses, and mark one as the default, with the same validation as checkout.
  - The first address saved becomes the default, and the default is listed first. Deleting the default makes the next one in the list the default; the confirmation dialog says so.
  - Orders store their own copy of the address, so editing or deleting one never changes a past order. A test deletes an address and checks the order still shows it.
- **Checkout address picker** replaces "Filled in from your last order". Saved addresses are selectable cards with the default preselected. "Add a new address" opens the form inline, with "Save this address for later", ticked by default. With nothing saved, the form shows directly. The address book isn't seeded from past orders, so it only holds what the shopper chose to save.
- **Simulated order status:** there's no real shipping, so status moves by time from the order's placement.
  - **The rule:** Preparing for the first 2 minutes, Shipped until 5 minutes, then Delivered. A return is Requested for 2 minutes, then Refunded.
  - **Why fixed times:** the page labels this as simulated and shows the times. Scaling the timeline to the delivery estimates was considered and rejected: "Ships in 1 month" items would never visibly progress for a reviewer. A fixed 2 + 3 minutes shows the whole path in one sitting, and the estimate dates stay the real estimates.
  - **Live updates:** the page re-reads the clock every 5 seconds, so an open page moves on by itself.
- **Orders page tabs:** Active (Preparing, Shipped), Delivered, Cancelled and Returns, each with a count, and the tab kept in the URL (`?tab=`). Each order shows a Preparing → Shipped → Delivered progress with the time of the current step.
- **Cancel:** offered only while Preparing, after a confirmation. It's checked again on confirming, in case the order shipped while the dialog was open. A cancelled order keeps all its details and shows when it was cancelled.
- **Returns:**
  - **When:** per item, only after delivery, within that item's return window (counted from the order date, as before), and once per item.
  - **How:** a reason picker in a confirmation dialog. A return covers the whole line.
  - **When it isn't possible:** items with no returns, or a closed window, keep the action visible but disabled, with the reason beside it ("No returns for this item.", "Return window closed on …").
  - **After requesting:** returns show on the order line and in the Returns tab: Requested, then Refunded, with the amount marked as simulated.
- **Account menu:**
  - **Desktop:** an "Account" disclosure menu with Orders and Addresses. It opens on click or Enter, and closes on Escape (focus back to the button), on a click outside, when focus leaves it, or when a link is followed. The header's Orders link stays too.
  - **Phones:** an "Account" section with the same two links in the phone menu. (Now a drawer from the right, with the account at the top; see revision item 8.)
  - **Sign-in came later:** with accounts, the menu also shows who's signed in, Profile, and Sign in or Sign out. The confirmation page's "See your orders" and the header's Orders link lead to the orders page.

### Accounts, reversed from Cut

- **The decision:** accounts move from Cut to Add, built on Supabase (email and password, plus Google).
  - **Why:** after testing, addresses and orders are only really useful if they follow you across devices, and that needs an account.
  - **Guest checkout stays the default:** the original reason still holds (an account is friction before the first purchase), and the live link must work for someone who isn't signed in.
  - **The cart stays in the browser** in both cases.
- **No email provider, so email confirmation is off.** Supabase's built-in sender only delivers to the project's own team members, at 2 messages an hour. The rule that follows from "no dead links": any flow that depends on email delivery is either hidden or clearly says it's unavailable in this demo. That covers forgot password and email change. It's never a form that silently sends nothing. Changing the password while signed in stays, since it needs no email.
- **Keys:**
  - **The browser:** it gets only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. That's Supabase's publishable key; the legacy `anon` key is deprecated by the end of 2026. Both are public by design, since row-level security protects the data.
  - **The production secret key:** it lives only as a GitHub Actions secret, for the keep-alive and demo-reset workflow, which must never print it. The script logs counts only.
  - **Everything else:** the test project's secret key, the CLI access token and the database passwords are in gitignored env files. `.env.example` shows the names with placeholders.
  - **What's never in the repo or the logs:** a service-role or secret key, a token or a password.
- **Privacy page (`/privacy`),** linked from the footer.
  - **Why now:** Google won't let the OAuth app leave "Testing" without a privacy policy URL.
  - **Content:** it says what's stored for signed-in users and where (Supabase, EU region), that guest data stays in the browser, what Google shares (name and email), that nothing is sold or shared, that payments are simulated, the hosting logs, and how to get an account deleted.
  - **Kept truthful:** while accounts were being built, it said they weren't live yet; it changed when they went live. It also says that guest settings stay in the browser, and that product data and photos load from DummyJSON's servers, which see those requests.
  - **Contact:** first a placeholder shown as plain text; since the revision round, the real address (`CONTACT_EMAIL` in `src/lib/contact.ts`) as a working mailto link.

- **How accounts are built:**
  - **Schema and RLS** are SQL migrations in `supabase/migrations/`, applied to both projects with the Supabase CLI. Every table has RLS, every policy checks ownership, and `anon` gets nothing.
    - **Orders** are updatable only in `cancelled_at`, and only during the 2-minute Preparing window.
    - **Returns** need a delivered, uncancelled order.
    - **The default address** must be your own.
    - `scripts/rls-test.mjs` checks that one user can't read, change, delete or impersonate another's rows.
  - **Statuses** are still computed on the client from timestamps, with the same simulated timings, so there are no scheduled jobs.
  - **supabase-js loads on demand,** so guests don't download it. The session is read locally, so a slow or unreachable account service never holds up browsing, the cart or guest checkout. Account pages show an error with Try again instead.
  - **Signed in,** addresses, orders and returns are read from and written to Supabase through one set of hooks. The pages don't care where the data lives. Signed out, everything behaves exactly as before, and the cart stays in the browser either way.
  - **Moving this browser's data in:** offered once per account per browser after sign-in ("Not now" is remembered), and always available from Addresses and Orders.
    - Orders and returns keep their ids, so duplicates are ignored. Addresses already in the account (same id or same details) are skipped.
    - The browser's copy is cleared only after everything is in, and running it twice changes nothing.
  - **Profile:** name and phone, plus a password change. Email change is explained, not offered (see the email rule above).
  - **Demo account** (`demo@example.com`, password `plainly-demo-2026`, also in the README):
    - **Locked:** a trigger on `auth.users` refuses email and password changes for it, even through the Auth API directly.
    - **Reset:** `scripts/demo-reset.mjs` restores its data every 3 days, from the keep-alive workflow.
    - **Kept fresh:** Preparing and Shipped only last minutes. The demo has two fixed "live" orders, and when it signs in with nothing on its way, `refresh_demo_orders()` re-dates them: one placed now, one 3 minutes ago. That's a SECURITY DEFINER function that refuses every caller except the demo account. Nothing new is created, so the shared account doesn't pile up orders.
  - **Keep-alive:** a GitHub Actions workflow runs the demo reset every 3 days, which writes to the database and keeps the free project from pausing. The secret key reaches only that step, as an environment variable, and the script prints counts only.
  - **Guarding secrets:** `scripts/check-secrets.mjs` runs before every commit. It reads the secret values from the local env files and fails if any appears in a tracked file or in `.agent-logs/`.
  - **Log redaction:** the session logs in `.agent-logs/` are committed, so this guard matters. Once, the first four characters of the two database passwords were echoed into the session while debugging. The full values never appeared. The script now also redacts any four-character prefix of a secret in `.agent-logs/`, the logs were checked clean, and rotating both passwords was recommended. The final pass re-ran the check and searched the repo and logs for key-shaped strings (`sb_secret_`, `sbp_`, JWTs, GitHub tokens): none.
- **A separate test project.** Verification never touches production. A second Supabase project, plainly-test, has the same migrations. `vite build --mode test` reads `.env.test.local`, which points the test build at it. The account flows in `verify.mjs` and `scripts/rls-test.mjs` create and delete their own users there with the test project's secret key. That key lives only in the gitignored `.env.test.local`. Production is touched only by the deployed app and the keep-alive workflow.
- **Testing:** the full verification runs on that test build's local preview; the live URL gets one light smoke check.
- **Built in checkpoints, in this order:**
  - **0.** Setup: pinned `@supabase/supabase-js` and the Supabase CLI; `.env.test.local` pointed at plainly-test (it held production's URL and publishable key); production's "Confirm email" switched off, as decided; secret-scan guard.
  - **1.** Migrations (schema, RLS, grants, demo lock) written and applied to plainly-test, then plainly. Three files in `supabase/migrations/` at this point (a fourth, for the demo's live orders, came with item 5), all applied to both projects; advisors clean. `scripts/rls-test.mjs` passed all 31 checks against plainly-test (33 once the demo function's checks were added). It caught that this project grants every table right to `authenticated` by default, which the third migration fixes.
  - **2.** Supabase client and auth flows: sign in, sign up, sign out, Google, and email-dependent flows explained. `/signin` (with the demo note and "Sign in as demo"), `/signup` and `/auth/callback`, plus the Account menu's Sign in / Sign out. supabase-js loads on demand, so guests don't download it. Entry points stay hidden in production until item 7 (`src/lib/accounts.ts`); test builds (`vite build --mode test`, pointed at plainly-test) show them.
  - **3.** Profile page: `/profile` for name and phone (saved to `profiles`, created on first use), the email shown read-only with why it can't change, and a password change with no email needed. The demo account gets notes instead of the email and password controls. It has an error state with Try again, and signed-out visitors go to sign-in and come back.
  - **4.** Signed-in data in Supabase (addresses, orders, returns), and moving this browser's data into the account. `src/account/data.ts` holds the account copy and its writes; `src/account/hooks.ts` gives pages the same shapes whether the data is in the browser or the account. Every account page has loading and error states. After sign-in, a one-time dialog offers to move this browser's data, and an inline notice on Addresses and Orders keeps the offer open. The move is idempotent, and the browser's copy is cleared only after it succeeds. Checked end to end on plainly-test; all 67 existing flows still pass.
  - **5.** Demo account: seed and reset script, sign-in page note, "Sign in as demo", README. `scripts/demo-reset.mjs` restores 3 addresses and lasting order states (delivered with a refunded return and a no-returns item, delivered and returnable, cancelled), using real catalog snapshots. It's idempotent and has been run on plainly-test; production is seeded by the workflow (item 6). On demo sign-in, when nothing is on its way, its two fixed live orders are re-dated to Preparing and Shipped by a demo-only database function; this replaced an earlier top-up that added new orders, see the bug log. The credentials are on the sign-in page and in the README.
  - **6.** GitHub Actions: keep-alive and demo reset every 3 days, never printing the secret. `.github/workflows/keep-alive.yml`, pushed after the `gh` login got the `workflow` scope. Its first run created and seeded production's demo account; the log shows the key only as `***`. The demo was checked with the publishable key: 3 addresses, 3 orders, 1 return, and its password change is refused.
  - **7.** Tests (sign-up, sign-in, sign-out, profile, data move, demo, RLS isolation), verification, docs, deploy.
    - **7a.** Tests: 5 account flows in `verify.mjs` (run only against a `vite build --mode test` preview pointed at plainly-test; they create and delete their own users), plus `scripts/rls-test.mjs` (31 checks). All 72 flows pass. The flows found a real race: the confirm dialog ran its action on the dialog's `close` event, which fires a moment after the dialog disappears. It now runs on the click.
    - **7b.** Accounts switched on (`src/lib/accounts.ts`). `/privacy` and the footer now say accounts are live. The decisions are recorded in this section. Verified on the test build: 154 scenes and 72 flows, including sign-in, sign-up and the demo's profile at every size, plus the RLS test. Deployed, with one live smoke check on `/signin`.
- **Google sign-in, checked by hand** (it can't be automated). While the Google app is in "Testing", only listed test users can use it.
  1. On the live site, open Sign in: "Continue with Google" shows only when Google is enabled in the project.
  2. With a Google account listed as a test user: Continue with Google, pick the account, and you land back on the page you started from, signed in (Account menu shows your email).
  3. Profile: the name from Google is filled in, and the email is shown read-only.
  4. Sign out, then sign in with Google again: the same account (same orders), not a new one.
  5. With a Google account *not* listed as a test user: Google refuses, and the sign-in page is reachable again via "Back to sign in".
  6. Cancel on Google's consent screen: you come back to "Sign-in didn't finish", with a way back.
  7. After the privacy URL is accepted and the app is published: repeat step 2 with any Google account.

### Returns belong only under Returns

- **The rule:** a returned item, requested or refunded, is listed only under **Returns**, never under Delivered. It's per item, not per order:
  - **Partly returned:** the order stays under Delivered, showing only the items that weren't returned, with a note like "1 item returned · see Returns".
  - **Fully returned:** the order appears only under Returns.
- **The Returns tab** lists each returned item with its order number, reason and status. The refund amount is marked as simulated in both states: "a refund of $X (simulated) follows in about 2 minutes", then "$X back (simulated)".
- **Counts:** Delivered counts orders that still have a kept item, and Returns counts returned items, so no item is ever counted in two tabs.
- **Everywhere:** it's one orders page over one data shape, so it works the same for guests, signed-in users and the demo's seeded orders. The demo's partly returned order (the CK One refunded, the mascara kept) is checked in the demo flow.

### Revision round: twelve fixes from testing

Twelve items from a full test of the live site, each built, verified and deployed on its own, in this order.

- **1.** Privacy contact: the real address, as a working mailto link (`src/lib/contact.ts`, reused by `/accessibility`)
- **2.** Select boxes: one consistent, themed chevron with padding (native selects kept). `src/components/Select.tsx`, used by quantity, sort and the return reason. The native arrow is hidden (`appearance: none`) and replaced by a `currentColor` chevron 12px from the edge, so it also shows in forced-colors mode. A flow checks all three, in both themes.
- **3.** Account menu email: one line when it fits, ellipsis plus full address otherwise. The desktop menu widens to fit (`w-max`, 14–24rem). Truncation applies only past that, with the full address in the text and in a `title`. The phone menu follows the same rule. A flow checks a short and a 70-character address. (Also: verification now runs 10 scenes at a time instead of 6, since the machine has 12 cores. The same run went from 113s to 86s, well inside the 2-minute budget.)
- **4.** Sign out at the bottom of the account menu, below a divider. In both menus the order is now: who's signed in, then Orders, Addresses, Profile, then Sign out. A flow checks the order and the divider.
- **5.** "In stock" styled like the other decision-card facts. `StockNote` has a `fact` variant (surrounding size, text color), used in the decision card and, for consistency, on the compare page. "Only N left" and "Out of stock" keep the warning color at the same size. Cards still show only the exceptions, small. A flow compares the Stock value's size and color with the Warranty value's.
- **6.** Lazy images. Native `loading="lazy"` alone started too early: Chrome loads anything within 1,250–2,500px, so a phone's first visit to the home page requested 16 photos and a desktop's 39, of 56. Photos now get their `src` only when they come within 300px of the screen (one shared IntersectionObserver, `src/lib/useNearViewport.ts`). In sideways rows, `scrollMargin` (where supported) preloads the next card; elsewhere, cards load as they scroll in. The first department card is in the first screen at every width, so its photos load right away. The product page's main photo is `eager` with `fetchpriority="high"`. Every photo sits in a square box sized before it loads, so nothing shifts (measured layout shift on the home page: 0 on a phone, 0.0002 on desktop). First load now: 8 photos on a phone (390×844), 32 at 1280×720 (24 of them in the first screen), 39 at 1440×900, where 32 are in the first screen. A flow counts image requests on the home page's first load at 390 and 1280px, checks that scrolling to and along a row loads more, and checks the main product photo's priority.
- **7.** Horizontal rows on phones. The rows already had the page's 16px padding, but snapping ignored it: on load, the browser snapped the first card to the screen's edge, 16px left of the heading, and every swipe settled there too. Adding `scroll-padding-inline: 1rem` moves the snap line onto the page's left line. The rows now snap mandatorily, so a swipe always settles with a card on that line. Cards still run off the right edge to show there's more. A flow at 360 and 390px checks that the first card lines up with the heading, that the row runs off the right edge, and that a real touch swipe settles with a card on the line. Against the old build, it fails with "first card at 0px, heading at 16px".
- **8.** Phone menu: a drawer from the right (`src/components/Drawer.tsx`), 85% wide up to 24rem, full height, over a dimmed backdrop; a tap on the backdrop closes it. It's a native modal `<dialog>` like the filter sheet: focus stays inside, Escape closes, and focus returns to the menu button. It slides in over 200ms, and not at all with reduced motion. From the top: "Menu" and a close button. Then the account area. Signed in, it shows an initial, the name, and the email below (each on one line with an ellipsis only when needed, as in item 3), or the email alone when there's no name. Signed out, it shows a full-width Sign in button. Then Orders, Addresses and Profile as 48px rows with an icon, 16px text and a chevron, then the theme choice. Sign out is pinned to the bottom below a divider. The language choice joins the theme choice in item 11. The name comes from the profile, loaded with the account data, falling back to the name given at sign-up, and it updates when Profile is saved. Focus rings use `:focus-visible` only, so none shows after a tap. Two flows cover it. The first checks position and width, the backdrop, the slide and reduced motion, row size and icons, the order of the parts, Tab staying inside with a ring, and Escape and backdrop-tap closing with focus returned. The second, signed in, checks the account area with and without a name, and Sign out at the bottom.
- **9.** 404 page: an illustration (first the Gemini image on the light image tile; later redrawn as SVG, see Brand), "This page isn’t here" with a short, friendly explanation, its own search box, links to all 8 departments, and Back to home. The illustration is described in the Brand section. The search box is the header's form with its own id, a visible label and its own landmark name. The department list is named "Shop by department", because "Departments" was already the header bar's name; the new flow caught the duplicate. A flow checks the illustration, the title, all 8 links (one followed), and that the search box searches. The layout scene for the page now waits for the new heading.
- **10.** Offline state. `src/lib/network.ts` follows the browser's `online`/`offline` events. A banner below the header (`OfflineBanner`, in an always-present `role="status"` region so screen readers announce it) says: "You’re offline. Your cart is saved in this browser, and pages you’ve already opened still work." That's true because the cart is in localStorage, every page's code is in the main bundle, and the catalog stays in memory once loaded. Photos that haven't loaded yet won't load, and a full reload offline doesn't work (there's no service worker; see "Considered, not now"). The banner goes as soon as the connection is back. Every account action checks first and, when offline, sends nothing and says "You’re offline, and this needs a connection. Nothing was changed; try again when you’re back online." This covers sign-in, sign-up, Google, profile load and save, password change, and address, order and return writes. A real network failure while offline gets the same words instead of "couldn’t reach the account service". Sign-out stays local and works offline. `?simulate=offline` forces the state for the tab (kept in sessionStorage, so it survives navigation) and adds "(simulated)" and an Exit simulation button, which also removes the parameter from the URL. The simulation doesn't block requests, so product data still loads; the README says so. Guest checkout works offline, because the order is kept in the browser. Three flows cover it: a real dropped connection (the banner comes and goes, and in-app navigation and the cart still work), the simulation (sign-in answers without sending any request, it lasts across pages, and Exit ends it), and, signed in, a profile save offline and then online. A layout scene checks the banner at 390 and 1440px in both themes.
- **11.** English and Turkish throughout, with a picker, Turkish search synonyms and Turkish flows.
  - **Catalogs:** `src/i18n/en.ts` holds every string of the interface, including `/privacy`, error and offline messages, aria-labels and page titles. `tr.ts` is typed as the same shape, so a missing Turkish string fails the build instead of showing a blank. Strings with numbers are functions. Plurals use `Intl.PluralRules`: Turkish nouns stay singular after a number ("3 ürün"), so both forms are the same there, but the rules still apply per language. No library: two languages and a typed object don't need one.
  - **Switching:** `t` is a live binding. Switching replaces it and remounts the routes (`App.tsx` keys `RouterProvider` by language), so every string and format is read again. That keeps call sites plain (`t.cartPage.title`) instead of a hook in every component. The URL, the catalog cache and the stores (cart, compare, theme, orders) survive; half-typed form input doesn't, which is acceptable for a rare action. Two flags outside React (`i18n/switching.ts`) carry what the remount would lose: the picker that was used gets focus back, and the phone menu reopens if the switch happened there. Its close then returns focus to the menu button.
  - **Formats:** prices use `Intl.NumberFormat` with USD in both languages ("$8.94", "$8,94"). Dates use `Intl.DateTimeFormat` ("Thu, Oct 8", "8 Eki Per"), as do ratings ("4.0", "4,0"). Percent discounts put the sign first in Turkish ("%10 indirim").
  - **Choosing:** on the first visit, the first of `navigator.languages` that's English or Turkish wins, otherwise English. The choice is remembered in localStorage (`plainly-locale`), and `<html lang>` always matches. The picker is a radio group like the theme toggle: EN / TR in the desktop header next to the theme control (each named in its own language, "English" and "Türkçe", and marked with `lang`), and full names under Language in the phone menu, above the theme.
  - **Product data:** titles, descriptions, reviews and brands stay in English. In Turkish, a small note above the description says so, and the footer mentions it. English data is marked `lang="en"` (card titles and brands, the product heading, description and reviews), so screen readers pronounce it right. That also fixed a real bug: Turkish uppercase turned brand names like "Gigabyte" into "GİGABYTE". Plainly's own readings of the data are translated where the phrasing is known: "No returns", "30-day returns", warranty periods and the six shipping phrases. The raw policy strings in "Shipping, returns and warranty" stay as the seller wrote them, and the Turkish note says they're in English. Category and department names are translated. The English category names are unchanged.
  - **Search:** the synonyms telefon → smartphones, tişört and gömlek → mens-shirts, parfüm → fragrances and dizüstü → laptops were added, with their plural and multi-word forms. Turkish category and department names count as search terms in both languages. Queries and product text are folded (lowercase, diacritics removed, ı → i), so "tisort" finds "tişört". These words are in the typo-tolerance vocabulary, so "telefn" and "parfm" are corrected and understood.
  - **Header:** with the language picker next to the theme control, the search box at 640px was squeezed to about 40px (Turkish labels are longer). From `sm` to `md`, search now has its own full-width row, as it does on phones. From `md` up it's one row again, with search at 178px or more at 768px.
  - **Tests:** verification runs in English by default. `verify.mjs` pins the browser locale to en-US, because this machine's is Turkish and the first visit follows it. Four Turkish flows cover the first visit per browser language (tr, de and en-GB), switching in the header (focus kept, remembered after reload, arrow keys) and in the phone drawer (it stays open, and focus returns on close). They also cover Turkish prices, dates, plurals and facts with the English data note, the synonyms and typos, and a full Turkish checkout with validation. Turkish layout scenes (home, product, search, the open menu) get the overlap and axe audit.
  - **Turkish strings, reviewed:** at the end of this section.
- **12.** Accessibility: `/accessibility`, linked from the footer and the phone menu, in English and Turkish.
  - **Display settings** (`src/a11y/display.ts`), remembered in this browser and applied before first paint by the inline script in `index.html`, like the theme:
    - **Text size:** Default, Large (112.5%) or Larger (125%). It's the root font size, so every rem-based size scales, spacing included.
    - **Increased contrast:** new token values for light and dark. Every text color reaches 7:1 on surface and background, border-strong 8:1, and focus rings are 3px.
    - **Reduce motion:** turns off every transition and animation even when the device allows motion. When off, the device's setting still applies, and the gallery's scripted scroll checks both.
    - **Underline all links:** every link, including those styled as buttons or cards.
    - **Reset to defaults**, with a status message.
  - **Statement:**
    - **Target:** WCAG 2.2 AA.
    - **What's tested and how:** axe on every page with the 2.2 AA rules (the `wcag22aa` tag was added to `verify.mjs` for this; nothing new failed), the layout audit, the keyboard flows, the contrast values, and the reduced-motion checks for the drawer, tray and cart notice.
    - **Known limitations,** said plainly: no screen-reader testing yet, Chromium only, product photos without descriptions, English product data in Turkish, and automated checks catch only part.
    - **Contact:** the address from item 1, as a mailto link.
  - **Largest text size:** a full run with `--display=larger,contrast`, a new `verify.mjs` flag that puts those settings on every page. The layout audit and axe were clean from the start, with no overlap, clipping or sideways scroll. Nine flows failed, and each was sorted:
    - **One real breakage:** the header's search box at 768px was 31px wide. Media-query breakpoints don't follow the root font size, so the header now switches to one row with a container query in rem: 768px at default text, 960px at the largest.
    - **Price on the first screen:** on phones, the price fell 19px below it, so at the largest size the gallery takes 36% of the height instead of 45%.
    - **Pixel-based assertions:** four tests hard-coded pixel sizes (16px text, a 384px menu, the breadcrumb rule, a scroll position), and now use the root size or the underlying rule.
    - **Settings flow:** the settings flow now runs without the forced settings.
    - **Two load timeouts.**
  - **One deliberate exception:** at the largest text size, the decision card's last fact on a 1024×768 screen is 19px below the fold. More text needs more room, as with zoom, and shrinking the desktop layout to avoid a short scroll would cost more than it saves. That one check is skipped at that size, with the reason in the test.
  - **Runs:** both are green, the default (90s) and the largest text with increased contrast (104s). Turkish scenes include the new page.


The round ended with both full runs green on the test build (default, and the largest text with increased contrast), one smoke check on live, and a deploy.

**Follow-ups from testing:**
- **Ratings on cards:** in Turkish, "3 değerlendirme" broke onto its own line on narrow cards. Cards (including the home rows) now show "★ 4.6 (3)" / "★ 4,6 (3)" on one line, with a full spoken label: "4.6 rating, 3 reviews" / "4,6 puan, 3 değerlendirme".
- **Full wording:** the product page keeps "· 3 reviews", and the compare page "3 reviews". On both, the count and its word can't break apart.
- **Test:** a flow checks cards at 360px in both languages (one line, the compact form, the spoken label) and the product page's no-break count.
- **404 illustration:** redrawn as SVG (see Brand).

**Second round of follow-ups:**
- **404 illustration:** now the logo mark with a dashed outline for the missing middle bar (see Brand).
- **Card alignment:** cards in a row stretch to the same height. The price was pushed to the bottom, so a card with a one-line title (Decoration Swing) had a large gap between rating and price. Now every line sits at the same height across a row:
  - **Brand line:** it keeps its height when a product has no brand (empty and hidden from screen readers).
  - **Title:** always exactly two lines (`line-clamp-2` with a two-line minimum height). Longer titles get an ellipsis, and the full title stays the link's text (its accessible name) and its tooltip.
  - **Price:** it follows the rating with a small, fixed gap, and leftover space goes below Compare.
  - **Where:** this applies to every product card, in search results and the home rows.
  - **Test:** a flow checks brand, title, rating and price tops per row on the home page and a department, at 360, 1024 and 1440px, in both themes and languages. It also checks two-line titles with their tooltip, a gap of 12px or less, and a one-line list price.
  - **Audit:** the layout audit now accepts a line clamp as intended when the full text is in a `title`, as it already did for a one-line ellipsis.
- **List price:** "List price" / "Liste fiyatı" and its amount stay on one line, like the review count.

#### Turkish strings, reviewed

First translated here without a native reviewer. A native speaker then reviewed the strings flagged as uncertain, and these changes were applied:

| Before | After | Note |
|---|---|---|
| "Oturum aç" / "Oturumu kapat" | **"Giriş yap" / "Çıkış yap"** | Everywhere, including the related phrasings (privacy, sign-in page, messages). No "oturum" remains in the Turkish catalog. |
| "Oturum açan" (Signed in as) | **"Giriş yapılan hesap"** | |
| "İlgi düzeyi" (sort: Relevance) | **"En alakalı"** | Not "Önerilen": on Turkish shops it usually implies a sponsored order, which Plainly doesn't have. |
| "Spor ve outdoor" | **"Spor & Outdoor"** | |
| City / State / ZIP | **"İlçe" / "İl" / "Posta kodu"** | The fields as a Turkish address names them; the validation messages match ("İlçenizi girin.", "İlinizi girin."). |
| "Kargoda" (Shipped) | **"Kargoya verildi"** | "Para iadesi yapıldı" (Refunded) kept. |
| "diğer değerlendiricilerin" | **"diğer alıcıların"** | In the demo account's notes on Profile. |
| "Sayfa yolu" (breadcrumb's name) | **"Gezinti yolu"** | |
| "Filtreler, 2 tane uygulandı" | **"Filtreler, 2 filtre uygulandı"** | The phone filter button's accessible name. |
| "atlama bağlantısı" | **"içeriğe atla bağlantısı"** | In the accessibility statement. |
| "erişilebilirlik ağacı" | **"ekran okuyuculara sunulan sayfa yapısı"** | Plain wording instead of the technical term. |
| "4,0 puan, 3 değerlendirme" (cards' spoken label) | **"5 üzerinden 4,0 puan, 3 değerlendirme"** | Now the same as the product page's. |

Kept as they were, after review: "Üst giyim", "Erkek gömlek ve tişörtleri", "Otomobiller" / "Araçlar", "Para iadesi yapıldı", "Görünüm ayarları", "Daha büyük", and the DummyJSON sentence on `/privacy`.

**Checked:** a Turkish flow finds the reviewed wording in the interface:
- **Menu:** "Giriş yap".
- **Search:** "En alakalı" as the sort, and "Filtreler, 3 filtre uygulandı" on the filter button.
- **Navigation:** "Gezinti yolu" as the breadcrumb, and "Spor & Outdoor" as the department heading.
- **Addresses:** the İlçe, İl and Posta kodu fields.
- **Accessibility statement:** the new wording, and that no "oturum" phrasing shows.

The checkout and rating flows use the new labels.

## Changed from the proposal

| # | Proposal | Decision | Why |
|---|---|---|---|
| 8 | Star distribution and filtering reviews by star | **Cut.** Show the real reviews, with a clear note that the rating is based on only 3 reviews. | DummyJSON has exactly 3 reviews per product. A distribution chart built from 3 data points is the kind of noise this product rejects. |
| 9 | A full return flow from the order page | **First simplified, then built per item.** At first the orders page only showed each item's return policy and whether its window was still open. Later, per-item returns came with a reason, Requested → Refunded on the simulated timeline, and a Returns tab. Replacements are still out. | The first version answered "can I still return this?" cheaply. Once order management existed, returns fit the same simulated timeline. |

## Considered, not now

- **Replacements in returns.** Returns with reasons and statuses were built; offering a replacement item instead of a refund wasn't, since there's no stock to reserve.
- **Star distribution for reviews:** not meaningful with 3 reviews per product (see #8).
- **Lists and wishlists.** (Sign-in and per-user addresses moved out of this list: see "Accounts, reversed from Cut".) Originally: **Accounts and lists:** sign-in, saved addresses per user, wishlists. Guest use with localStorage covers the core loop.
- **Wallet and loyalty points.** Payment is simulated, so a balance or points would be made-up numbers, not a fact to shop by, even with accounts.
- **Third-party accessibility overlay widgets.** These are scripts that add a toolbar or "fix" pages automatically. They don't repair the underlying code. They often conflict with the screen readers and settings people already use, and they add a third-party script that sees every page. Many disabled users and accessibility experts advise against them (see the Overlay Fact Sheet). Plainly builds accessibility into its own components instead, and offers four display settings that change only its own CSS.
- **A service worker, so a reload works offline.** The offline banner covers the common case, a connection dropping mid-visit. Caching the app shell and catalog for offline reloads would add a cache-invalidation layer to a site that deploys on every push, and a stale catalog would show prices and stock that may have changed.
- **Switching to a product API with a larger catalog.** DummyJSON's 194 products are small for a store. The free alternatives either have fewer products (Fake Store API has 20) or lack the fields this product is built on: return policy, shipping time, warranty, stock and reviews. Platzi's Fake Store, for one, has titles, prices and images, but none of those. The decision card, the compare rows, the delivery estimates, the return windows and the honest ratings all come from those fields. A bigger catalog would have meant less truth per product, or inventing the missing fields, which is exactly what Plainly is against.
- **A "Best sellers" sort.** DummyJSON has no sales data. Any popularity ranking would have to be invented, from stock, rating or the order of the data, and presenting a made-up signal as popularity is exactly the noise Plainly rejects. The sorts stay relevance, price, rating and discount, each computed from data the page shows.

## Build order

The work ran in this order. Each step ended with a deploy, so there was always a working live URL. The planned steps were 1–7 and a final pass; accounts and the revision round came from testing the live site.

| Step | Ships |
|---|---|
| 1 | Project setup, theme tokens with dark mode, minimal header, Vercel deploy with the deep-link rewrite |
| 2 | Catalog loading, search results, basic product page, cart |
| 3 | Checkout, confirmation, order list, logo. **The full purchase loop works. This is the MVP line.** |
| 4 | Filters and chips, facts instead of badges, decision card with the honest review section |
| 5 | Compare tray |
| 6 | Return policy and return window on orders, home page, then a polish pass: mobile layout, loading, empty and error states, keyboard and accessibility |
| 7 | Changes from testing the live site, in this order: breadcrumbs, the 10%+ off sale filter, a two-row phone header with a menu, category-aware search, the department as navigation context, and a device-matched "System" theme icon; then the sale view as context (the context-vs-filter rule), typo-tolerant search, and a two-step category filter, compare limited to one department, on phones a photo-first product page with a swipeable gallery, cart feedback (toast, in-cart line, mini-cart), and an address book, order management and Account menu |
| 8 | Accounts on Supabase (reversed from Cut), in checkpoints: setup and the separate test project, migrations with RLS and the isolation test, auth flows, Profile, signed-in data and moving the browser's data in, the demo account and its reset, the keep-alive workflow, tests, then switching accounts on |
| 9 | Returns only under Returns, per item |
| 10 | The revision round, twelve items in order: privacy contact, select chevrons, account menu email, Sign out last, stock as a fact, lazy images, row snapping, the phone drawer, the 404 page, the offline state, English and Turkish, and accessibility settings and statement |
| 11 | Follow-ups from testing: compact ratings on cards, card line alignment, list price on one line, and the 404 illustration redrawn twice |
| 12 | No new features. Final pass: docs brought up to date, privacy rechecked, repo hygiene, one live check of every page, the purchase path and the demo |

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
- **Since then:** the full verification (every scene and flow) runs against a local preview build (`vite preview`) of the commit being deployed. The live URL gets a single light smoke check at the end (`verify.mjs --smoke[=scene]`: one page in light mode at 1440 px), so automated traffic to production stays minimal.
- **Deploys:** every push to `main` deploys to production on Vercel; a deploy is confirmed by the commit's status on GitHub before the smoke check.
- **Final live check:** once, from a fresh browser with no cookies or storage, and not blocked by the checkpoint. Every page loaded as a direct deep link in light, dark, English and Turkish, the guest purchase path completed, the demo sign-in and sign-out worked, and the 404 and offline simulation rendered: 297 checks, no problems.

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
| Address book, orders | The return buttons were announced as "Return this item : Powder Canister", with a stray space before the colon, so the test couldn't find them by name. | The item name was added as visually hidden text right after the visible label. Positioned out of the text flow, it made Chrome insert a space. Suffixes that start with a space ("Edit address for …") happen to hide the effect. | The return buttons use an explicit `aria-label` ("Return this item: Powder Canister") that contains the visible text. |
| Returns per item, demo | The shared demo account's "Active" tab went empty after repeated sign-ins. On plainly-test it sat at the 20-order cap with nothing Preparing or Shipped. | Each demo sign-in with nothing on its way *added* two orders, capped at 20. The cap stopped the pile-up, but once reached, the demo never showed an order on its way again until the next reset, up to 3 days later. | The demo has two fixed live orders that a demo-only database function (`refresh_demo_orders()`) re-dates on sign-in; nothing is added. Its SECURITY DEFINER warning in the advisors is intentional: it refuses every caller except the demo. The RLS test checks that normal users and anonymous visitors can't call it. |
| Returns per item | On phones the current order tab (e.g. "Returns") was cut off at the edge of the sideways-scrolling tab bar. | The scroll-into-view ran when the page first rendered "Loading your orders…", before the tabs existed, and not again once they did. | It also runs when the orders finish loading. A test opens the Returns tab at 390 px and checks the tab is fully visible. |
| Returns per item | Under load, the desktop gallery test sometimes saw → at the last photo move it backwards. | Pressing → again restarted the smooth scroll to the same photo; the interrupted scroll's "scroll ended" event reported an in-between position and reset the current photo. | A key press aimed where the gallery is already heading does nothing, and a "scroll ended" event between snap points is ignored. A real stop always lands on a snap point. |
| Languages | In Turkish, brand names on product cards showed as "GİGABYTE" and "FASHİON TRENDS". | The cards uppercase brands with CSS, and uppercasing follows the page language: in Turkish, "i" becomes "İ". | English product data is marked `lang="en"` (brands, titles, descriptions, reviews), which also helps screen readers pronounce it. |
| Languages | At 640px the header's search box was squeezed to about 40px once the language picker joined the theme control; Turkish labels are longer too. | Logo, search, three links and two pickers on one row don't fit at `sm`. | From `sm` to `md`, search has its own full-width row. A flow checks both widths. |
| Accessibility | At the largest text size, the header's search box at 768px was 31px wide. | Tailwind's breakpoints are media queries, and a media query's `rem` is the browser's default 16px, not the page's root size. So the one-row header switched on at 768px regardless of the text size. | The header switches with a container query in rem, whose rem follows the root size: 768px at default text, 960px at the largest. |
| Accessibility | In the full run at the largest text size, the filter-sheet focus test timed out once. | It presses Tab 45 times and checks each press, about 1.3s alone, and the run was fully parallel. | That flow gets 30s. It passed in every run since. |
| Accessibility | The item 12 commit included 111 verification screenshots (23 MB) from the larger-text run. | They went to a new `verify-shots-a11y/` folder, and `.gitignore` only covered `verify-shots/`. | The next commit untracked them, and `.gitignore` now covers `verify-shots*/`. They stay in the history: public UI screenshots, nothing sensitive, and not worth rewriting pushed history for. |
| Lazy images | Under full parallel load, the desktop gallery test once saw → from the fifth thumbnail stay put. It passed 8 of 8 runs on its own, with and without this change. | The test clicked the thumbnail and pressed → at once, while the ← scroll from the step before could still be landing. | The test waits until the gallery says "5 of 6" before pressing →. |
| Lazy images | The new image-count test saw 38 requests at 1280px, where 32 were expected. | The router saves the scroll position when a page is left and restores it on the next load, so the second pass started halfway down the home page. | The test scrolls back to the top before leaving. |
