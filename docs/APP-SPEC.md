# The demo app every example builds

Every folder in `examples/` implements the same small banking app. A reader should be able to open any one folder and recognise the app from the others. The only differences between folders should be the framework and the way each one applies compression dictionaries.

All data and copy come from `@compression-dictionaries/demo-content`. All styling comes from its `styles.css`. Do not hard-code data or restyle the app in individual examples.

## Pages

The **dashboard** (`/`) greets the customer by first name, lists both accounts with their balances, and shows the recent transactions in a table. Money is formatted with `formatMoney`.

The **transfers page** (`/transfers`) must be lazy-loaded, so it ends up in its own JavaScript chunk. It has a form with a payee select, an amount field and a reference field, and a confirm button that shows a confirmation message without calling any real API.

The **products page** (`/products`) lists every product, and each links to a **product detail page** (`/products/:id`) showing the rate, fee and a short eligibility paragraph.

A shared **header** links to all three sections.

## Releases

Each example produces three releases, following `releases` in `demo-content`.

In **v1**, the app is exactly as described above.

In **v2**, the transfers page shows an estimated fee (a flat £0.25 for amounts over £1,000, otherwise free) below the amount field before the user confirms, and the dashboard greeting changes from "Welcome back, Ada" to "Good to see you, Ada".

In **v3**, which includes everything from v2, the dashboard gains a savings goal card showing progress towards £10,000 using the savings balance, and product detail pages change their eligibility paragraph.

These changes must be real source edits, so the deltas reflect a realistic deploy. The recommended approach is a `release-overlays/v2/` and `release-overlays/v3/` folder in each example, holding replacement versions of the files that change. The release script applies them cumulatively to a working copy. Running the release script must leave the example's source tree unchanged.

## Scripts every example provides

Each example's `package.json` provides the same script names, so the README can give identical instructions for every folder.

`build` runs the framework's normal production build.

`releases` builds v1, v2 and v3 into `releases/v1`, `releases/v2` and `releases/v3`, then runs `build-deltas` for each release against the one or two before it, with the right preset and public path.

`serve` serves the release named in `releases/current.txt`, using the middleware from `@compression-dictionaries/core`, and logs the encoding of every asset response.

`release` switches the served release, as in `npm run release -- v2`.

`test` runs `releases` and then a negotiation test modelled on `examples/vanilla/test/negotiation.test.mjs`. That test must prove, over HTTP, that a client holding the v1 main bundle receives a `dcz` delta for the v2 bundle that decodes to the exact v2 file, that the lazy-loaded transfers chunk also gets a delta, and that an unknown dictionary falls back to Brotli.

## Ports

Each example serves on its own port, so they can run side by side. These are vanilla on 3000, react-vite on 3001, angular on 3002 and nextjs on 3003.

## Scope limits

The shared dictionary for HTML pages is demonstrated in the vanilla example only. In the single-page apps, product pages are client-side routes, so there is no HTML response to compress. In the server-rendered frameworks, the HTML is streamed, which the `sharedDictionary` middleware cannot wrap. Each example README should say this plainly.
