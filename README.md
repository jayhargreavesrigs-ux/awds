# Axis Well Delivery website

A responsive, industrial, multi-page website. Each route is a standalone HTML document served by the host. Navigation uses ordinary links and browser page loads; there is no client-side router. Service descriptions and case studies are full pages, available without JavaScript.

## Build and preview

Run `node scripts/build-site.mjs` from the project directory to generate the site. No package installation is needed. Preview with `python3 -m http.server 4173 --bind 127.0.0.1 --directory dist` and open `http://127.0.0.1:4173/`.

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
- `scripts/build-site.mjs`: shared header, navigation, page layouts and static generation.
- `public/assets/`: optimized field photography, company logo and downloadable profile.
- `dist/`: generated deployable output; rebuild after editing source content.

## Contact details

Hilary Chukwu’s direct contact email is `hchukwu@axiswelldelivery.com`. General enquiries and the enquiry draft recipient use `info@axiswelldelivery.com`; this is also the intended recipient when EmailJS is connected. The downloadable company profile retains the general contact email.

The enquiry form validates inputs and opens an email draft. It does not send mail automatically. The old website’s EmailJS settings were placeholders; a real delivery service must be configured before changing the button to “Send”.

## Content and assets

Company services, other leadership profiles, reported metrics and case studies were adapted from https://www.axiswelldelivery.com/ on 17 September 2026. Hilary Chukwu’s biography was replaced with the exact wording supplied by the user. Figures are company-reported information, not independently audited.

Field photography comes from the user’s `well pictures/` directory. Land and swamp case-study collages retain their original project associations. The source photographs are untouched. The original downloadable profile was retained, with both contact email addresses updated and the contact page visually checked.

## Verification

Motion includes staggered headline and card entrances, photograph reveals, count-up figures, interactive button and card details, and brief page transitions in supporting browsers. These are dependency-free enhancements; navigation still loads separate HTML documents. Reduced-motion preferences disable the effects, and content remains available without JavaScript. Animations run once rather than looping, and keyboard focus cancels any entrance that could obscure a control.

All 18 routes load directly. Checked internal links and asset references, one main heading per page, removal of outdated biography and email text, standalone service navigation, mobile menu behavior, desktop and mobile layout, and required contact fields. No test email was sent.

The Sites registration is in `.openai/hosting.json`.
