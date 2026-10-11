/* GitHub Pages serves the course; Supabase handles accounts and trainee records.
   Use the project's public anon/publishable key here, never a service-role key.
   Run src/academy/supabase/schema.sql in the intended project before enabling sign-in. */
window.AWDS_CONFIG = {
  backend: 'supabase',

  // Supabase only (Project Settings → API):
  supabaseUrl: 'https://gmrjnxeheyptfcqgirpt.supabase.co',
  supabaseAnonKey: 'sb_publishable_nKRAkLceKYIXzd8kwV8ynQ_aLHCrq5W',

  // Public address of this page; it appears in trainee invitations and reset emails.
  courseUrl: new URL('.', window.location.href).href,

  // How often the admin dashboard refreshes, in seconds.
  pollSeconds: 20
};
