# Axis Well Delivery website

A responsive, industrial, multi-page website. Each route is a standalone HTML document served by the host. Navigation uses ordinary links and browser page loads; there is no client-side router. Service descriptions and case studies are full pages, available without JavaScript.

## Build and preview

Run `node scripts/build-site.mjs` from the project directory to generate the site. No package installation is needed. Preview with `python3 -m http.server 4173 --bind 127.0.0.1 --directory dist` and open `http://127.0.0.1:4173/`.

## GitHub Pages

The company repository is `jayhargreavesrigs-ux/awds`. In its **Settings → Pages**, set the publishing source to **GitHub Actions**. The `Publish Axis website` workflow builds and publishes only `dist` after a push to `main`; it can also be run manually from the **Actions** tab. No personal access token is stored in the workflow.

The workflow reads the site's path from GitHub Pages settings. Links and assets use `/awds` for the GitHub project address, or the domain root when a custom domain is connected. Local builds use the root by default. To generate a project-path build manually, run `SITE_BASE_PATH=/awds node scripts/build-site.mjs`; run the normal build again before using the usual local preview.

After changing the Pages custom domain, rerun `Publish Axis website` so the generated links match the new address. A custom domain must be released from the old repository before assigning it to this repository.

## Main pages

- `/`: focused homepage with links into the site.
- `/about/`: company overview and leadership, including Hilary Chukwu’s user-supplied biography.
- `/services/`: services overview and delivery process; seven individual service/approach pages beneath it.
- `/experience/`: case studies, each with its own detail page.
- `/hse-quality/`: safety, quality assurance and local-content commitments.
- `/contact/`: office contacts and enquiry form.

There are 18 content pages plus a dedicated 404 document. Each page has its own title, description, main heading and active navigation state.

## Editing

- `src/sections/`: reusable HTML sections and company information.
- `src/details.json`: service descriptions and case-study content.
- `src/head.html`, `src/footer.html`: shared metadata template and footer.
- `src/styles.css`: visual theme, responsive layouts and page styles.
- `src/app.js`: mobile navigation, scroll animations, counters and enquiry draft handling.
- `scripts/build-site.mjs`: shared header, navigation, page layouts and static generation. Decorative `<!-- ICON:arrow-up-right -->` placeholders (also `arrow-down`, `arrow-up`, and `arrow-left`) render as inline SVG so phones do not substitute emoji.
- `public/assets/`: optimized field photography and company logo.
- `dist/`: generated deployable output; rebuild after editing source content.

## Contact details

Hilary Chukwu’s direct contact email is `hchukwu@axiswelldelivery.com` and his phone number is `+234 906 264 9504`. General enquiries and the enquiry draft recipient use `info@axiswelldelivery.com`; this is also the intended recipient when EmailJS is connected.

The enquiry form validates inputs and opens an email draft. It does not send mail automatically. The old website’s EmailJS settings were placeholders; a real delivery service must be configured before changing the button to “Send”.

## Content and assets

Company services, other leadership profiles, reported metrics and case studies were adapted from https://www.axiswelldelivery.com/ on 17 September 2026. Hilary Chukwu’s biography was replaced with the exact wording supplied by the user. Figures are company-reported information, not independently audited.

Field photography comes from the user’s `well pictures/` directory. Land and swamp case-study collages retain their original project associations. The source photographs are untouched. Company-profile download links and the public PDF were removed at the user’s request.

## Verification

Motion includes staggered headline and card entrances, photograph reveals, count-up figures, interactive button and card details, and brief page transitions in supporting browsers. These are dependency-free enhancements; navigation still loads separate HTML documents. Reduced-motion preferences disable the effects, and content remains available without JavaScript. Animations run once rather than looping, and keyboard focus cancels any entrance that could obscure a control.

All 18 routes load directly. Checked internal links and asset references, one main heading per page, removal of outdated biography and email text, standalone service navigation, mobile menu behavior, desktop and mobile layout, and required contact fields. No test email was sent.
