// Public-safe config for the admin login page.
// The anon key is designed to be public — it only works within your RLS policies.
// NEVER put the service-role key here.
window.SUPABASE_CONFIG = {
  url: 'https://YOUR_PROJECT_REF.supabase.co',
  anonKey: 'YOUR_SUPABASE_ANON_KEY',
};
