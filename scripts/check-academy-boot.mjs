import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/academy/boot.js', import.meta.url), 'utf8');
async function boot({ configured = true, status = 200, data = false, offline = false, sdkFailure = false } = {}) {
  const message = {}, scripts = [], requests = [];
  const main = { innerHTML: '', querySelector: () => message };
  const elements = Object.fromEntries(['.shell', '#map', '#menuBtn', '#voiceBtn', '#dashBtn', '.meter'].map(id => [id, { style: {}, hidden: false }]));
  const window = { AWDS_CONFIG: configured ? { backend: 'supabase', supabaseUrl: 'https://project.example.test', supabaseAnonKey: 'sb_publishable_fixture' } : {} };
  const context = vm.createContext({
    window, URL, AbortSignal, console: { error() {} },
    document: {
      querySelector: id => id === '#main' ? main : elements[id],
      querySelectorAll: () => ['#menuBtn', '#voiceBtn', '#dashBtn', '.meter'].map(id => elements[id]),
      createElement: () => ({}),
      head: { appendChild(script) {
        scripts.push(script.src);
        if (sdkFailure) return script.onerror();
        if (script.src === 'awds-backend.js') window.claude = { use() {} };
        script.onload();
      } }
    },
    fetch: async (url, options) => {
      requests.push({ url: String(url), options });
      if (offline) throw new Error('Offline test');
      return { status, ok: status === 200, json: async () => data };
    }
  });
  await vm.runInContext(source, context);
  return { message: message.textContent, scripts, requests, elements };
}
const unconfigured = await boot({ configured: false });
assert.equal(unconfigured.requests.length, 0);
assert.match(unconfigured.message, /being set up/);
const missingSchema = await boot({ status: 404 });
assert.equal(missingSchema.scripts.length, 0);
assert.match(missingSchema.message, /database is being prepared/);
assert.equal(missingSchema.elements['#map'].hidden, true);
for (const options of [{ status: 401 }, { offline: true }, { data: true }, { sdkFailure: true }]) {
  const result = await boot(options);
  assert(!result.scripts.includes('academy.js'));
  assert.match(result.message, /could not load/);
}
const ready = await boot();
assert.deepEqual(ready.scripts, ['vendor/supabase.js', 'awds-backend.js', 'academy.js']);
assert.equal(new URL(ready.requests[0].url).searchParams.get('p_email'), 'connection-probe@example.invalid');
assert.equal(ready.requests[0].options.headers.apikey, 'sb_publishable_fixture');
console.log('Academy boot checks passed: missing configuration/schema, rejected key, offline, invalid response, script failure, ready project.');
