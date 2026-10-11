# AWDS Academy setup

Updated on 11 October 2026. The Supabase plugin is connected to the healthy `awds` project (`gmrjnxeheyptfcqgirpt`). Migration `20261011181635`, `initialize_awds_academy`, has been applied. Live checks confirm Auth is reachable, email sign-up and confirmation are enabled, and the invitation-check endpoint rejects invalid invitations. Both Academy tables have row-level security and deny anonymous record access. The initial Supabase advisor checks returned no findings. The pre-publication recheck reports one Auth warning: leaked-password protection is disabled (a Pro-plan feature); database security and performance checks reported no other findings. An invitation and its enrollment record have been created for `thanfo@gmail.com` in the Administration cohort. Its code was verified to work only with that email. The owner has created and confirmed that Auth account, and its Academy administrator role has now been granted and verified.

The user signed into the Supabase dashboard inside Codex. Brevo custom SMTP was enabled and saved there using the supplied credential, `smtp-relay.brevo.com:587`, sender `AWDS Academy <thanfo@gmail.com>`, and the default 60-second interval between emails to a user. A reload verified the saved settings and hidden stored password. Confirmation and recovery templates and subjects were customized and saved. The owner attempted activation, but confirmation delivery failed. Auth logs on 11 October 2026 at 18:51–18:53 UTC show Brevo rejecting signup mail with `525 "5.7.1 Unauthorized IP address"`. Brevo SMTP IP blocking must authorize the actual Supabase outbound connection before activation can succeed. The owner subsequently completed activation and email confirmation successfully. The precise change made in Brevo was not observed by the assistant; no Brevo security setting was changed by the assistant. The credential is stored only in Supabase, not in this repository or the website.

## Intended services

| Purpose | Service |
| --- | --- |
| Website, course scripts and 267 narration MP3 files | Existing GitHub Pages website |
| Accounts and password recovery | Supabase Auth, email and password |
| Profiles, progress, cohort scores and invitations | Supabase PostgreSQL, protected by row-level security |
| Backup copy of a trainee's progress | Browser local storage, keyed by user ID |
| Confirmation and recovery email delivery | Brevo through Supabase custom SMTP |
| Academy sender | AWDS Academy <thanfo@gmail.com> (provided by owner) |
| First administrator | thanfo@gmail.com |

No Supabase Storage bucket is needed for the supplied course. The audio files are static website assets. Course content is downloadable; authentication protects trainee records and the normal learning workflow. Scores are calculated in the browser, so these records are not a tamper-proof certification system.

## Connect and initialize Supabase

1. **Completed:** connect the Supabase integration to project `gmrjnxeheyptfcqgirpt`. The supplied publishable key authorizes the public client; it cannot create tables or grant administrator rights.
2. **Completed:** apply `src/academy/supabase/schema.sql`. It is repeatable and preserves existing course rows. Existing deployments must be reviewed before applying changed policies. Internal permission checks are in the non-exposed `awds_private` schema; only narrow invoker functions are public API endpoints.
3. In Authentication, enable email/password sign-up and keep email confirmation enabled. Do not enable anonymous sign-ins. Use a password minimum of at least eight characters.
4. **Completed:** Site URL is `https://www.axiswelldelivery.com/academy/`. Allowed redirects are that exact URL and the temporary preview `http://127.0.0.1:4173/academy/`. Remove the local redirect when account testing is complete.
5. **Completed:** the owner created the Auth user `thanfo@gmail.com` and confirmed its email. Ran `src/academy/supabase/bootstrap-admin.sql` and verified `confirmed=true` and `is_admin=true`. A Supabase dashboard login is separate from an Academy Auth user.

The policies bind invitation access to the signed-in email, protect each trainee's profile and progress, limit cohort scores to the same cohort, and reserve invitation management and cross-trainee records for administrators. Revoking an invitation also removes its trainee's data access; use this deliberately.

## Administrator workflow

After signing in with an administrator account, open **Admin → Users & access codes**. Enter the trainee’s name, email and class, then choose **Add user & create code**. This creates the invited user’s enrollment and email-bound access code. Use **Copy invitation** to share the course link and code with that user; this button does not send email automatically.

The invited user chooses **First time here? Activate your account**, enters the invited email and code, sets their own password, and confirms their email. Supabase creates the password-based Auth account during activation. Administrators do not set or see trainee passwords. Uninvited users cannot access Academy records. **Trainee progress** lists users after they complete their profile.

## Brevo mail delivery

The company domain's incoming mailbox remains with Namecheap Private Email. The user selected Brevo for Academy confirmation and reset messages; no changes to the domain's MX records are needed for this choice. The SMTP credential has not been saved in the repository or website.

Saved in Supabase Authentication → Email → SMTP:

| Setting | Value |
| --- | --- |
| Host | `smtp-relay.brevo.com` |
| Port | `587` with STARTTLS |
| Username | The SMTP login supplied by the owner from Brevo |
| Password | The owner's Brevo SMTP key, entered privately into Supabase |
| Sender email | `thanfo@gmail.com`, identified by the owner as verified in Brevo |
| Sender name | `AWDS Academy` |

Use the SMTP key as the SMTP password; it does not grant Supabase administration access. Do not save it in website files or GitHub public variables. Supabase's built-in mail service only delivers to project-team addresses and is not suitable for trainee email delivery. See [Supabase SMTP documentation](https://supabase.com/docs/guides/auth/auth-smtp). The owner has now completed email confirmation successfully. A password-reset test request succeeded; inbox receipt and link completion still need owner verification.

Branded templates in `src/academy/supabase/email/` were saved with subjects “Confirm your AWDS Academy account” and “Reset your AWDS Academy password”. Both preserve Supabase's `{{ .ConfirmationURL }}` variable.

## Website deployment

The supplied public settings are saved in `src/academy/config.js`. To override them for another deployment, set these GitHub repository **Actions variables**:

- `AWDS_SUPABASE_URL`: the project's HTTPS URL.
- `AWDS_SUPABASE_PUBLIC_KEY`: its publishable key or legacy `anon` key.

The workflow injects override settings during the build. It rejects secret/service-role keys. Both override values must be supplied together. The build also accepts `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. With no overrides, it uses the provided public settings in `src/academy/config.js`. A read-only readiness check keeps the portal in setup mode while the Academy schema is missing.

Install with `npm ci --ignore-scripts` and build with `npm run build`. The build copies the pinned `@supabase/supabase-js` browser bundle from `node_modules`; the original imported bundle is no longer used. `@supabase/ssr` is installed as requested but is not needed by the static site. The existing Pages workflow publishes `dist` on a push to `main`. SQL files, email templates, local test fixtures and backend credentials are excluded from the generated website. The existing main-branch GitHub Actions workflow builds, checks and publishes the site. On 11 October 2026, the owner authorized publishing the current version with the remaining live account tests documented below.

## Verification before opening to trainees

- Run `npm test` for course structure, question generation, audio references, startup failure handling and simulated account/course flows. The DOM tests use a fake backend and cannot verify real email delivery, browser layout or Supabase sessions. Run `npm run check:connection` for read-only Auth and schema-readiness checks.
- `scripts/check-academy-access.sql` tests privacy rules against an isolated LOCAL PostgreSQL database named `awds_access_test`. It stubs Auth claims; never run it against production.
- In the real Supabase project, test an invited account through confirmation, sign-in, onboarding, progress save/reload, sign-out, password recovery and code revocation. Check that an uninvited account has no records access and a trainee cannot see another trainee's private information.
- Verify the administrator dashboard, invitation creation and CSV export, then repeat the main flows on a phone.
- Verify password-recovery delivery using an authorized test recipient. The owner’s initial activation emails were rejected, but subsequent email confirmation succeeded. The owner authorized a password-reset test email, which Supabase accepted. A direct SMTP attempt to send the authorized trainee invitation timed out; its delivery is unconfirmed.
- After publishing, verify the company site's Academy link opens `/academy/` in a new tab and all live account flows still work.
- Set an appropriate database backup/export process and verify a restore before relying on production records. Retention, course-data handling and operational ownership remain decisions for the Academy owner.

## Checks completed locally

- All 52 weeks, 180 units, 508 content slides and 118 referenced interactive visual functions passed structural checks.
- 77,925 generated question samples passed answer-shape and numeric checks. This is not an engineering-content review.
- All 267 MP3s were readable, and all 1,179 referenced clips fit their audio file duration.
- Twenty database-access assertions passed, including cross-user and cohort isolation, invitation binding, administrator access and revocation.
- The live migration succeeded. Both tables' row-level security and anonymous-access denial were verified; the public invitation check returns HTTP 200 with `false` for an invalid invitation. The latest advisor recheck has one Auth warning for disabled leaked-password protection; no database security or performance findings were returned.
- The browser preview loads sign-in using the live Supabase project. The owner completed activation, email confirmation and sign-in after the initial Brevo source-IP rejection. A password-reset request to the authorized owner email returned HTTP 200 and updated its recovery timestamp. Inbox receipt and completion through the link still await the owner’s confirmation.
- The company logo has been removed from the Academy header, account screens, and favicon at the owner’s request. The sign-in helper sentence is removed; the invitation instructions remain on the account activation screen.
- The confirmed owner initially still had trainee access. After granting its administrator role and refreshing, the live browser opened the Admin dashboard and loaded Users & access codes, including the existing invitation. No browser warning or error logs were present. No new live invitation was created during this check.
- Thirty-two simulated-flow assertions passed, covering sign-in validation, invalid-invitation rejection, email-confirmation instructions, password recovery without invitation codes, access failures, save failures, quiz progression and administrator invitation creation. The simulation uses no real accounts or messages.
- All 18 company routes and the custom 404 page passed browser layout checks at 1440px and 390px: no horizontal overflow, no failed loaded images, and one main heading per page. All 20 generated pages passed 539 local asset/link-reference checks. The phone navigation opens and closes with Escape, and the contact form rejects missing required fields.
- Mobile-menu opening, Escape dismissal, required contact fields, Academy new-tab behavior and the unconfigured Academy message were checked. A tablet-width header overflow was fixed and retested at 1101px.
- Build checks passed for paired configuration, secret-key rejection and `/awds` project-path links; the normal root-domain build was restored.

Remaining: confirm password-reset email receipt/link completion, then verify trainee progress after a browser reload and administrator visibility with the real test account. Both authorized accounts are now confirmed; the trainee has a saved profile and progress in Supabase. Check the live deployment after publication, and remove the temporary redirect after account testing is complete.

## Pre-publication testing update

The live administrator portal created the authorized trainee test invitation, copied the correct email/code/course link, and allowed cancelling revocation. Instructor preview opened a lesson; narration play/stop and animation next-scene controls responded. Admin sign-out returned to the login form. The test trainee subsequently completed activation and email confirmation. A live database check verified successful sign-in, a saved trainee profile and saved progress. The owner account remains a confirmed administrator.

Account activation and password recovery are separate. Activation requires the email-bound invitation code. Password recovery asks only for the account email and then the new password through the emailed recovery link. The activation screen now includes a direct Forgot password link, and recovery screens explicitly state that no invitation code is needed.
