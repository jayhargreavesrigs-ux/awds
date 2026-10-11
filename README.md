# Axis Well Delivery website

A responsive, industrial, multi-page website. Each route is a standalone HTML document served by the host. Navigation uses ordinary links and browser page loads; there is no client-side router. Service descriptions and case studies are full pages, available without JavaScript.

## Build and preview

Run `npm ci --ignore-scripts`, then `npm run build` from the project directory. The build includes the Supabase browser client pinned in `package-lock.json`. Preview with `python3 -m http.server 4173 --bind 127.0.0.1 --directory dist` and open `http://127.0.0.1:4173/`. Run `npm test` for course, startup and simulated account/course checks; `npm run check:connection` performs read-only checks against the configured project.

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
- `/academy/`: trainee portal, opened in a new tab by **AWDS Academy** in the main navigation.

There are 18 company pages, the separate academy portal, and a dedicated 404 document. Each company page has its own title, description, main heading and active navigation state.

## Academy integration

The supplied website portal is imported into `src/academy/`; its 267 supplied narration files are in `public/academy/audio/`. The site build includes both in `dist/academy/`, retaining relative script and audio paths. The AWDS Academy link appears on every company page, including the mobile menu, and uses `target="_blank"` with `rel="noopener noreferrer"`.

The portal retains its email/password login, invitation access codes, password recovery, trainee profiles and administrator dashboard. GitHub Pages cannot run the package's PHP backend, so it uses Supabase. The supplied public settings point to project `gmrjnxeheyptfcqgirpt`. The Academy schema was installed on 11 October 2026; live Auth and invitation checks pass with email confirmation enabled. Both Academy tables have row-level security, anonymous record access is denied, and Database security and performance checks passed; the latest Auth advisory notes that Pro-plan leaked-password protection is disabled. The portal checks database readiness before loading sign-in.

Brevo SMTP, Academy redirect URLs, and branded confirmation/recovery emails are configured. The Academy currently uses text branding without a logo. Administrators add users and generate email-bound invitation codes; each invited user activates their account by choosing a password and confirming their email. The `thanfo@gmail.com` Academy account has been confirmed and granted administrator access. See [ACADEMY-SETUP.md](ACADEMY-SETUP.md) for the administrator workflow and remaining deployment checks. The provided publishable key is safe to include in the browser configuration. Build-time variables can override it using either `AWDS_SUPABASE_URL` / `AWDS_SUPABASE_PUBLIC_KEY` or the supplied `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` names. Never publish a service-role or secret key. Both override values must be supplied together; the build rejects secret keys. Owner activation, email confirmation and sign-in have succeeded. The authorized password-reset test request was accepted; inbox receipt and reset-link completion still require verification. The trainee test account is confirmed, with its profile and progress stored in Supabase; browser reload and administrator progress visibility still require a final live check. The owner authorized publishing the current version with these live tests outstanding.

Both requested npm packages are installed. The static Academy uses `@supabase/supabase-js`; `@supabase/ssr` is available for a future server-rendered app but is not loaded by this GitHub Pages website.

The build copies only the portal's browser files and audio. Database setup SQL and the original PHP setup/configuration files are not published.

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

All 18 routes load directly. Checked internal links and asset references, one main heading per page, removal of outdated biography and email text, standalone service navigation, mobile menu behavior, desktop and mobile layout, and required contact fields. No contact enquiry was sent during testing.
