// Simulated DOM + fake backend only: never creates real accounts or sends email.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { JSDOM, VirtualConsole } from 'jsdom';

const read = name => readFileSync(new URL('../src/academy/' + name, import.meta.url), 'utf8');
const html = read('index.html').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
const course = read('academy.js');
const marker = course.indexOf('/* AWDS Academy — course runner:');
const settle = async () => { for (let i = 0; i < 12; i++) await new Promise(resolve => setImmediate(resolve)); };
async function waitUntil(predicate) {
  const deadline = Date.now() + 3000;
  while (!predicate() && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 10));
}
let checks = 0;
function check(condition, label) { assert(condition, label); checks++; }

async function page({ recovery = false, failReads = false, admin = false } = {}) {
  const errors = [], messages = [], calls = [], rows = new Map();
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => { if (error.type !== 'css-parsing') errors.push(error.message); });
  virtualConsole.on('error', (...args) => messages.push(args.join(' ')));
  const dom = new JSDOM(html, { url: 'https://academy.example.test/', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole });
  const { window: w } = dom;
  await new Promise(resolve => w.addEventListener('load', resolve, { once: true }));
  Object.defineProperty(w, 'crypto', { value: webcrypto });
  w.TextEncoder = TextEncoder;
  w.scrollTo = () => {};
  // DOM simulation has no audio device; actual MP3s are checked separately.
  w.HTMLMediaElement.prototype.pause = () => {};
  w.HTMLMediaElement.prototype.load = () => {};
  w.HTMLMediaElement.prototype.play = async () => {};
  w.fetch = async () => { throw new Error('Unexpected network call in local test'); };
  w.AWDS_CONFIG = { backend: 'supabase', hosted: true, supabaseUrl: 'https://backend.example.test', supabaseAnonKey: 'fixture', courseUrl: w.location.href };
  const user = { id: 'qa-trainee', email: 'qa@example.test', user_metadata: {} };
  rows.set('profiles/' + user.id, { f: { fullName: 'QA Trainee', preferredName: 'QA' }, cohort: 'Test', enrolHash: 'qa' });
  const state = { failWrites: false, failLogout: false, recovery, failReads, admin };
  let authCallback;
  w.supabase = { createClient: () => ({
    rpc: async name => { calls.push('rpc:' + name); return { data: name === 'awds_is_admin' ? state.admin : state.validCode !== false }; },
    auth: {
      onAuthStateChange: fn => { authCallback = fn; },
      getSession: async () => { if (recovery) authCallback('PASSWORD_RECOVERY'); return { data: { session: recovery ? { user } : null } }; },
      signInWithPassword: async () => { calls.push('login'); return { data: { user } }; },
      signUp: async () => { calls.push('signup'); return { data: { session: null } }; },
      resetPasswordForEmail: async () => { calls.push('forgot'); return {}; },
      updateUser: async () => { calls.push('reset'); return { data: { user } }; },
      signOut: async () => { calls.push('logout'); return state.failLogout ? { error: { message: 'Simulated sign-out failure' } } : {}; }
    },
    from: () => ({
      upsert: async row => { if (state.failWrites) return { error: { message: 'Simulated save failure' } }; rows.set(row.path, row.data); calls.push('save:' + row.path); return {}; },
      delete: () => ({ eq: async (_key, path) => { rows.delete(path); return {}; } }),
      select: () => ({ eq: (key, value) => {
        const response = () => state.failReads ? { error: { message: 'Simulated read failure' } } : { data: [...rows].filter(([path]) => (key === 'path' ? path : path.split('/')[0]) === value).map(([path, data]) => ({ path, data })) };
        return { maybeSingle: async () => { const r = response(); return r.error ? r : { data: r.data[0] || null }; }, then: (resolve, reject) => Promise.resolve(response()).then(resolve, reject) };
      } })
    })
  }) };
  w.eval(read('awds-backend.js'));
  w.eval(course.slice(0, marker));
  const generated = new Map();
  const normalize = value => { const el = w.document.createElement('div'); el.innerHTML = value; return el.textContent.trim(); };
  for (const block of w.AWDS_BLOCKS) for (const week of block.weeks) {
    for (const topic of week.topics) topic.gens = topic.gens.map(generator => () => { const q = generator(); generated.set(normalize(q.q), q); return q; });
  }
  w.eval(course.slice(marker));
  await settle();
  const find = selector => { const el = w.document.querySelector(selector); assert(el, 'Missing ' + selector); return el; };
  const submit = async selector => { find(selector).dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true })); await settle(); };
  const click = async selector => { find(selector).click(); await settle(); };
  const login = async () => { find('#aw-e').value = 'qa@example.test'; find('#aw-p').value = 'local-fixture-only'; await submit('#aw-auth form'); };
  return { w, dom, find, submit, click, login, calls, rows, state, generated, errors, messages };
}

const auth = await page();
try {
  await auth.submit('#aw-auth form');
  check(!auth.calls.includes('login'), 'empty sign-in is blocked');
  auth.find('#aw-e').value = 'not-an-email'; auth.find('#aw-p').value = 'fixture';
  await auth.submit('#aw-auth form');
  check(!auth.calls.includes('login'), 'invalid email is blocked');
  check(auth.find('[data-to="first"]').hasAttribute('href'), 'auth links are keyboard-focusable');
  await auth.click('[data-to="first"]');
  check(!!auth.w.document.querySelector('[data-to="forgot"]'), 'activation offers a separate password-reset path');
  auth.find('#aw-e').value = 'qa@example.test'; auth.find('#aw-c').value = 'AWDS-AAAA-AAAA';
  auth.find('#aw-p').value = 'fixture-one'; auth.find('#aw-p2').value = 'fixture-two';
  await auth.submit('#aw-auth form');
  check(!auth.calls.includes('signup') && /do not match/.test(auth.find('.aw-msg').textContent), 'mismatched passwords rejected');
  auth.find('#aw-p2').value = 'fixture-one'; auth.state.validCode = false;
  await auth.submit('#aw-auth form');
  check(!auth.calls.includes('signup') && /do not match an invitation/.test(auth.find('.aw-msg').textContent), 'invalid invitation cannot create an account or send a confirmation');
  auth.state.validCode = true; await auth.submit('#aw-auth form');
  check(/Check your email/.test(auth.find('.aw-msg').textContent), 'confirmation instruction shown');
  check(auth.w.sessionStorage.getItem('awds-activation-code') === 'AWDS-AAAA-AAAA', 'code retained while email confirmation is pending');
  await auth.click('[data-to="signin"]'); await auth.click('[data-to="forgot"]');
  check(!auth.w.document.querySelector('[name="code"]') && !auth.w.document.querySelector('[name="password"]'), 'reset request asks only for email');
  const codeChecksBeforeRecovery = auth.calls.filter(call => call === 'rpc:awds_check_code').length;
  auth.find('#aw-e').value = 'qa@example.test'; await auth.submit('#aw-auth form');
  check(auth.calls.includes('forgot') && /If that email/.test(auth.find('.aw-msg').textContent), 'recovery request displays neutral message');
  check(auth.calls.filter(call => call === 'rpc:awds_check_code').length === codeChecksBeforeRecovery, 'reset request never checks an invitation code');
  check(auth.errors.length === 0, auth.errors.join('\n'));
} finally { auth.dom.window.close(); }

const recovery = await page({ recovery: true });
try {
  check(/Choose a new password/.test(recovery.find('#aw-auth h1').textContent), 'recovery view survives session initialization');
  check(!recovery.w.document.querySelector('[name="code"]'), 'email recovery link opens a password-only form');
  recovery.find('#aw-p').value = 'fixture-password'; recovery.find('#aw-p2').value = 'fixture-password';
  await recovery.submit('#aw-auth form');
  check(recovery.calls.includes('reset') && !recovery.w.document.querySelector('#aw-auth'), 'recovery completes and opens course');
  check(!recovery.calls.includes('rpc:awds_check_code'), 'saving the reset password does not require an invitation');
} finally { recovery.dom.window.close(); }

const failure = await page({ failReads: true });
try {
  await failure.login();
  check(/could not verify your Academy access/.test(failure.find('#main').textContent), 'database failure does not open course');
} finally { failure.dom.window.close(); }

const trainee = await page();
try {
  await trainee.login();
  check(!trainee.w.document.querySelector('#aw-auth'), 'valid sign-in opens trainee dashboard');
  check(trainee.find('#dashBtn').hidden, 'trainee admin button hidden');
  const first = trainee.find('.unit-link:not(.locked)').dataset.unit;
  const second = trainee.find('.unit-link.locked').dataset.unit;
  await trainee.click('[data-unit="' + second + '"]');
  check(/first/.test(trainee.find('#toast').textContent), 'later lessons are locked');
  await trainee.click('[data-unit="' + first + '"]');
  trainee.state.failWrites = true;
  await trainee.click('[data-act="next"]');
  check(!trainee.find('#banner').hidden && /has not synced/.test(trainee.find('#banner').textContent), 'failed save is visible');
  trainee.state.failWrites = false;
  const slides = [...trainee.w.document.querySelectorAll('[data-slide]')].map(el => el.dataset.slide);
  for (const slide of slides) await trainee.click('[data-slide="' + slide + '"]');
  check(!trainee.find('[data-act="test"]').disabled, 'viewing all slides unlocks test');
  check(trainee.rows.has('progress/qa-trainee'), 'progress saved to fake backend');
  await trainee.click('[data-act="test"]');
  await trainee.submit('#testForm');
  check(/unanswered/.test(trainee.find('#warn').textContent), 'blank submission asks for confirmation');
  for (const element of trainee.w.document.querySelectorAll('#testForm .q')) {
    const q = trainee.generated.get(element.querySelector('.qt').textContent.trim()); assert(q);
    if (q.type === 'num') element.querySelector('input').value = String(q.ans);
    else element.querySelector('input[value="' + q.ans + '"]').checked = true;
  }
  await trainee.submit('#testForm');
  check(trainee.find('.pct').textContent === '100%', 'correct answers pass the test');
  check(!trainee.find('[data-unit="' + second + '"]').classList.contains('locked'), 'passing unlocks next lesson');
  const saved = trainee.rows.get('progress/qa-trainee');
  check(saved.units[first].passed && saved.units[first].attempts.length === 1, 'pass and attempt recorded');
  trainee.state.failLogout = true; await trainee.click('#aw-out');
  check(/failed/.test(trainee.find('#aw-out').textContent), 'failed sign-out is not reported as success');
  check(trainee.errors.length === 0 && trainee.messages.length === 0, [...trainee.errors, ...trainee.messages].join('\n'));
} finally { trainee.dom.window.close(); }

const administrator = await page({ admin: true });
try {
  await administrator.login();
  check(!administrator.find('#dashBtn').hidden && !!administrator.w.document.querySelector('#admBody'), 'administrator dashboard opens');
  await administrator.click('[data-tab="codes"]');
  administrator.find('#cm-name').value = 'QA Invite';
  administrator.find('#cm-email').value = 'invite@example.test';
  administrator.find('#cm-cohort').value = 'QA Cohort';
  await administrator.submit('#codeMake');
  await waitUntil(() => [...administrator.rows.keys()].some(path => path.startsWith('codes/')) || /Could not create/.test(administrator.find('#toast').textContent));
  check([...administrator.rows.keys()].some(path => path.startsWith('codes/')), 'administrator can create invitation in fake backend: ' + administrator.find('#toast').textContent);
  check(administrator.errors.length === 0 && administrator.messages.length === 0, [...administrator.errors, ...administrator.messages].join('\n'));
} finally { administrator.dom.window.close(); }
console.log('Academy simulated-flow checks passed: ' + checks + ' assertions. No real accounts or emails were used.');
