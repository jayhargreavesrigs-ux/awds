// Read-only project checks: no sign-ups, emails, or database writes.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({ window: { location: { href: 'https://www.axiswelldelivery.com/academy/' } }, URL });
vm.runInContext(readFileSync(new URL('../src/academy/config.js', import.meta.url), 'utf8'), context);
const config = context.window.AWDS_CONFIG;
const base = process.env.AWDS_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || config.supabaseUrl;
const key = process.env.AWDS_SUPABASE_PUBLIC_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || config.supabaseAnonKey;
if (!base || !key) throw new Error('Supabase project URL and public key are required.');

async function get(path) {
  const response = await fetch(new URL(path, base), {
    headers: { apikey: key }, signal: AbortSignal.timeout(15000), redirect: 'error'
  });
  const data = await response.json();
  return { status: response.status, data };
}
const [auth, invitation] = await Promise.all([
  get('/auth/v1/settings'),
  get('/rest/v1/rpc/awds_check_code?p_email=connection-probe%40example.invalid&p_code=INVALID-PROBE')
]);
const ready = auth.status === 200 && invitation.status === 200 && invitation.data === false;
console.log(JSON.stringify({
  project: base,
  authentication: { status: auth.status, emailEnabled: auth.data.external?.email, emailConfirmationRequired: auth.data.mailer_autoconfirm === false, signupDisabled: auth.data.disable_signup },
  academyInvitationCheck: { status: invitation.status, invalidInvitationRejected: invitation.data === false, errorCode: invitation.data?.code, message: invitation.data?.message },
  readyForAccountTesting: ready
}, null, 2));
if (!ready) process.exitCode = 1;
