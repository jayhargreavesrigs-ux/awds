/* AWDS Academy — hosting adapter.
   Gives the course the small "runtime" it expects (window.claude.use('db' | 'user' | 'downloads')) on top of
   either the PHP + MySQL API in ./api/ or a Supabase project, and draws the sign-in screens:
   sign in · first visit with an access code · forgot password · set a new password.
   Settings come from config.js (window.AWDS_CONFIG). */
(function () {
  const CFG = window.AWDS_CONFIG = Object.assign({ backend: 'php', apiUrl: 'api/api.php', courseUrl: location.href.split('#')[0], pollSeconds: 20 }, window.AWDS_CONFIG || {}, { hosted: true });

  // ------------------------------------------------------------------ backends
  function phpBackend() {
    async function call(a, body) {
      let r;
      try { r = await fetch(CFG.apiUrl + '?a=' + a, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-AWDS': '1' }, body: JSON.stringify(body || {}) }); }
      catch (e) { throw Object.assign(new Error('Could not reach the server. Check your connection.'), { status: 0 }); }
      let j = {}; try { j = await r.json(); } catch (e) { }
      if (!r.ok) throw Object.assign(new Error(j.error || ('Server error ' + r.status)), { status: r.status, code: r.status === 403 ? 'invalid_argument' : 'server' });
      return j;
    }
    return {
      kind: 'php', accounts: true,
      me: async () => (await call('me')).user,
      login: async (email, password) => (await call('login', { email, password })).user,
      activate: async (email, code, password) => (await call('activate', { email, code, password })).user,
      forgot: async email => { await call('forgot', { email }); },
      reset: async (token, password) => (await call('reset', { token, password })).user,
      logout: async () => { await call('logout'); },
      get: async path => { const j = await call('get', { path }); return { exists: j.exists, data: j.data }; },
      set: async (path, data) => { await call('set', { path, data }); },
      del: async path => { await call('delete', { path }); },
      list: async coll => (await call('list', { coll })).docs,
      adminUsers: async () => (await call('admin_users')).users,
      adminResetLink: async id => (await call('admin_reset_link', { id })).link,
      adminSetActive: async (id, active) => { await call('admin_set_active', { id, active }); },
      adminAddAdmin: async (email, name) => (await call('admin_add_admin', { email, name })).link
    };
  }

  function supabaseBackend() {
    if (!window.supabase || !CFG.supabaseUrl || !CFG.supabaseAnonKey) throw new Error('Supabase is selected in config.js but supabaseUrl / supabaseAnonKey are missing.');
    const sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey);
    const err = (e, fallback) => { if (!e) return; const x = new Error(e.message || fallback || 'Server error'); x.code = (e.code === '42501' || /row-level security/i.test(e.message || '')) ? 'invalid_argument' : 'server'; throw x; };
    const userOut = async u => { if (!u) return null; const { data: adm, error } = await sb.rpc('awds_is_admin'); err(error); return { id: u.id, email: u.email, name: (u.user_metadata && u.user_metadata.name) || '', isOwner: !!adm }; };
    let recovery = false;
    sb.auth.onAuthStateChange(ev => { if (ev === 'PASSWORD_RECOVERY') { recovery = true; if (B.onRecovery) B.onRecovery(); } });
    const B = {
      kind: 'supabase', accounts: false,
      isRecovery: () => recovery || /type=recovery/.test(location.hash),
      me: async () => { const { data, error } = await sb.auth.getSession(); err(error); return userOut(data.session && data.session.user); },
      login: async (email, password) => { const { data, error } = await sb.auth.signInWithPassword({ email, password }); if (error) throw new Error(/invalid/i.test(error.message) ? 'Email or password is not correct.' : error.message); return userOut(data.user); },
      activate: async (email, code, password) => {
        const { data: ok, error } = await sb.rpc('awds_check_code', { p_email: email, p_code: code }); err(error);
        if (!ok) throw new Error('That email and access code do not match an invitation. Check both, or ask the course administrator.');
        const r = await sb.auth.signUp({ email, password, options: { emailRedirectTo: CFG.courseUrl } });
        if (r.error) throw new Error(/registered/i.test(r.error.message) ? 'An account already exists for this email. Sign in, or use "Forgot password".' : r.error.message);
        if (!r.data.session) throw Object.assign(new Error('Check your email and click the confirmation link, then sign in here.'), { info: true });
        return userOut(r.data.user);
      },
      forgot: async email => { const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: CFG.courseUrl }); err(error); },
      reset: async (_t, password) => { const { data, error } = await sb.auth.updateUser({ password }); err(error); recovery = false; return userOut(data.user); },
      logout: async () => { const { error } = await sb.auth.signOut({ scope: 'local' }); err(error); },
      get: async path => { const { data, error } = await sb.from('awds_docs').select('data').eq('path', path).maybeSingle(); err(error); return { exists: !!data, data: data ? data.data : null }; },
      set: async (path, data) => { const { error } = await sb.from('awds_docs').upsert({ path, data, updated_at: new Date().toISOString() }); err(error); },
      del: async path => { const { error } = await sb.from('awds_docs').delete().eq('path', path); err(error); },
      list: async coll => { const { data, error } = await sb.from('awds_docs').select('path,data').eq('coll', coll); err(error); return (data || []).map(r => ({ id: r.path.split('/')[1], data: r.data })); }
    };
    return B;
  }

  let B;
  try { B = CFG.backend === 'supabase' ? supabaseBackend() : phpBackend(); }
  catch (e) { document.addEventListener('DOMContentLoaded', () => { document.body.insertAdjacentHTML('afterbegin', `<div style="padding:16px;background:#F8E4E1;color:#B1372B;font:15px system-ui">AWDS Academy setup error: ${e.message}</div>`); }); return; }

  // ------------------------------------------------------------------ db facade (the shape the course expects)
  const watchers = new Set();
  const touch = () => watchers.forEach(w => w.poll());
  const snapDoc = (path, r) => ({ id: path.split('/')[1], exists: !!r.exists, data: () => r.data, metadata: {} });
  const randId = () => Array.from(crypto.getRandomValues(new Uint8Array(10)), b => b.toString(16).padStart(2, '0')).join('');
  function doc(path) {
    return {
      id: path.split('/')[1], path,
      get: async () => snapDoc(path, await B.get(path)),
      set: async data => { await B.set(path, JSON.parse(JSON.stringify(data))); touch(); },
      delete: async () => { await B.del(path); touch(); },
      onSnapshot: (next, onErr) => watch(async () => next(snapDoc(path, await B.get(path))), onErr)
    };
  }
  function collection(name) {
    return {
      path: name, doc: id => doc(name + '/' + (id || randId())),
      onSnapshot: (next, onErr) => watch(async () => { const rows = await B.list(name); const docs = rows.map(r => ({ id: r.id, exists: true, data: () => r.data, metadata: {} })); next({ docs, size: docs.length, empty: !docs.length }); }, onErr)
    };
  }
  function watch(fn, onErr) {
    const w = { poll: () => fn().catch(e => onErr && onErr(e)) };
    watchers.add(w); w.poll();
    const t = setInterval(() => { if (!document.hidden) w.poll(); }, Math.max(5, CFG.pollSeconds) * 1000);
    return () => { clearInterval(t); watchers.delete(w); };
  }
  const DB = { doc, collection };

  // ------------------------------------------------------------------ sign-in screens
  let resolveMe; const meP = new Promise(r => resolveMe = r); let ME = null;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const css = `.aw-auth{position:fixed;inset:0;z-index:100;background:var(--bg,#F4F6F9);display:grid;place-items:center;padding:16px;overflow:auto}
    .aw-card{background:var(--surface,#fff);border:1px solid var(--line,#DCE3EC);border-radius:12px;max-width:440px;width:100%;padding:28px 24px;box-shadow:0 10px 30px rgba(20,50,79,.08)}
    .aw-card h1{font-family:var(--f-display,Georgia,serif);color:var(--navy,#14324F);font-size:28px;margin:4px 0 6px}.aw-card .crumb{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted,#5E6C7A)}
    .aw-card p{color:var(--muted,#5E6C7A);margin:0 0 16px;font-size:15px}.aw-card label{display:block;font-size:14px;font-weight:700;margin:12px 0 4px;color:var(--ink,#18222E)}
    .aw-card input{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid var(--line,#DCE3EC);border-radius:8px;font-size:16px;background:var(--surface,#fff);color:var(--ink,#18222E)}
    .aw-card button.go{width:100%;margin-top:18px;padding:12px;border:0;border-radius:8px;background:var(--amber,#C86A14);color:#fff;font-weight:700;font-size:16px;cursor:pointer}
    .aw-card button.go:disabled{opacity:.6}.aw-links{display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-top:14px;font-size:14px}
    .aw-links a{color:var(--blue,#2E5C8A);cursor:pointer;text-decoration:underline}.aw-msg{margin-top:12px;padding:10px 12px;border-radius:8px;font-size:14px}
    .aw-msg.err{background:var(--bad-soft,#F8E4E1);color:var(--bad,#B1372B)}.aw-msg.ok{background:var(--good-soft,#E3F2E8);color:var(--good,#2D7A4B)}
    .aw-acc table{width:100%;border-collapse:collapse;font-size:14px}.aw-acc td,.aw-acc th{padding:8px 6px;border-bottom:1px solid var(--line,#DCE3EC);text-align:left;vertical-align:top}
    .aw-acc .row{display:flex;gap:6px;flex-wrap:wrap}.aw-acc button{padding:6px 10px;border:1px solid var(--line,#DCE3EC);border-radius:6px;background:var(--surface,#fff);color:var(--ink,#18222E);cursor:pointer;font-size:13px}
    .aw-acc .wide{max-width:900px}.aw-acc input.link{font-family:var(--f-mono,monospace);font-size:12px}`;
  function mount() { if (document.getElementById('aw-style')) return; const s = document.createElement('style'); s.id = 'aw-style'; s.textContent = css; document.head.appendChild(s); }
  function screen(html) { mount(); let el = document.getElementById('aw-auth'); if (!el) { el = document.createElement('div'); el.id = 'aw-auth'; el.className = 'aw-auth'; document.body.appendChild(el); } el.innerHTML = `<div class="aw-card">${html}</div>`; return el; }
  const close = () => { const el = document.getElementById('aw-auth'); if (el) el.remove(); };
  const msg = (el, text, ok) => { const m = el.querySelector('.aw-msg'); m.hidden = false; m.className = 'aw-msg ' + (ok ? 'ok' : 'err'); m.textContent = text; };
  function form(el, fn) {
    el.querySelector('form').addEventListener('submit', async e => {
      e.preventDefault(); if (!e.target.reportValidity()) return;
      const b = el.querySelector('button.go'); b.disabled = true;
      try { await fn(new FormData(e.target)); } catch (x) { msg(el, x.message, x.info); } finally { b.disabled = false; }
    });
    el.querySelectorAll('[data-to]').forEach(a => { a.href = '#'; a.addEventListener('click', e => { e.preventDefault(); views[a.dataset.to](); }); });
  }
  const done = u => { ME = u; close(); history.replaceState(null, '', location.pathname + location.search); resolveMe(u); addHeaderButtons(); };
  const views = {
    signin() {
      const el = screen(`<h1>AWDS Academy</h1><form novalidate>
        <label for="aw-e">Email</label><input id="aw-e" name="email" type="email" autocomplete="username" required>
        <label for="aw-p">Password</label><input id="aw-p" name="password" type="password" autocomplete="current-password" required>
        <button class="go">Sign in</button><div class="aw-msg" hidden></div></form>
        <div class="aw-links"><a data-to="first">First time here? Activate your account</a><a data-to="forgot">Forgot password?</a></div>`);
      form(el, async f => done(await B.login(String(f.get('email')).trim(), f.get('password'))));
    },
    first() {
      const el = screen(`<div class="crumb">AWDS Academy</div><h1>Activate your account</h1><p>Use the email address and the access code from your invitation, then choose your own password.</p><form novalidate>
        <label for="aw-e">Email</label><input id="aw-e" name="email" type="email" autocomplete="username" required>
        <label for="aw-c">Access code</label><input id="aw-c" name="code" placeholder="AWDS-XXXX-XXXX" autocomplete="off" required>
        <label for="aw-p">Choose a password (8+ characters)</label><input id="aw-p" name="password" type="password" autocomplete="new-password" minlength="8" required>
        <label for="aw-p2">Type it again</label><input id="aw-p2" name="password2" type="password" autocomplete="new-password" required>
        <button class="go">Activate my account</button><div class="aw-msg" hidden></div></form>
        <div class="aw-links"><a data-to="signin">I already have a password</a><a data-to="forgot">Forgot password?</a></div>`);
      form(el, async f => {
        if (String(f.get('password')).length < 8) throw new Error('Use a password of at least 8 characters.');
        if (f.get('password') !== f.get('password2')) throw new Error('The two passwords do not match.');
        const code = String(f.get('code')).trim();
        try { sessionStorage.setItem('awds-activation-code', code); } catch (e) { }
        const u = await B.activate(String(f.get('email')).trim(), code, f.get('password'));
        done(u);
      });
    },
    forgot() {
      const el = screen(`<h1>Reset your password</h1><p>Enter your account email to receive a password-reset link. You do not need an invitation access code.</p><form novalidate>
        <label for="aw-e">Email</label><input id="aw-e" name="email" type="email" autocomplete="username" required>
        <button class="go">Email me a link</button><div class="aw-msg" hidden></div></form>
        <div class="aw-links"><a data-to="signin">Back to sign in</a></div>`);
      form(el, async f => { await B.forgot(String(f.get('email')).trim()); msg(el, 'If that email has an account, a reset link is on its way. Check your inbox and spam folder, then open the link to choose a new password. Your invitation code is not needed.', true); });
    },
    reset(token) {
      const el = screen(`<h1>Choose a new password</h1><p>Enter your new password twice.</p><form novalidate>
        <label for="aw-p">New password (8+ characters)</label><input id="aw-p" name="password" type="password" autocomplete="new-password" required>
        <label for="aw-p2">Type it again</label><input id="aw-p2" name="password2" type="password" autocomplete="new-password" required>
        <button class="go">Save and continue</button><div class="aw-msg" hidden></div></form>`);
      form(el, async f => {
        if (String(f.get('password')).length < 8) throw new Error('Use a password of at least 8 characters.');
        if (f.get('password') !== f.get('password2')) throw new Error('The two passwords do not match.');
        done(await B.reset(token, f.get('password')));
      });
    }
  };
  if (B.kind === 'supabase') B.onRecovery = () => views.reset(null);

  async function boot() {
    const m = location.hash.match(/reset=([a-f0-9]{20,})/);
    if (m && B.kind === 'php') return views.reset(m[1]);
    if (B.kind === 'supabase' && B.isRecovery()) { await new Promise(r => setTimeout(r, 400)); return views.reset(null); }
    let u = null; try { u = await B.me(); } catch (e) { }
    // Recovery can arrive while getSession is resolving the callback URL.
    if (B.kind === 'supabase' && B.isRecovery()) return views.reset(null);
    if (u) done(u); else views.signin();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  // ------------------------------------------------------------------ header: sign out, accounts (admins on PHP)
  function addHeaderButtons() {
    const go = () => {
      const anchor = document.getElementById('dashBtn'); if (!anchor) return setTimeout(go, 300);
      if (!document.getElementById('aw-out')) {
        const out = document.createElement('button'); out.className = 'hbtn'; out.id = 'aw-out'; out.textContent = 'Sign out';
        out.addEventListener('click', async () => { out.disabled = true; try { await B.logout(); location.replace(location.pathname); } catch (e) { out.disabled = false; out.textContent = 'Sign out failed — retry'; } });
        anchor.after(out);
      }
      if (ME && ME.isOwner && B.accounts && !document.getElementById('aw-accts')) {
        const ac = document.createElement('button'); ac.className = 'hbtn'; ac.id = 'aw-accts'; ac.textContent = 'Accounts';
        ac.addEventListener('click', accounts); anchor.after(ac);
      }
    };
    go();
  }
  async function accounts() {
    mount(); const el = document.createElement('div'); el.className = 'aw-auth aw-acc'; el.id = 'aw-acc';
    const paint = async (note) => {
      let users = []; try { users = await B.adminUsers(); } catch (e) { note = e.message; }
      el.innerHTML = `<div class="aw-card wide"><div class="crumb">AWDS Academy · Accounts</div><h1>Sign-in accounts</h1>
        <p>Trainees create their own account the first time they use their access code. Use this page to send a password-reset link by hand, disable an account, or add another administrator.</p>
        ${note ? `<div class="aw-msg ok">${note}</div>` : ''}
        <div style="overflow:auto"><table><thead><tr><th>Name / email</th><th>Role</th><th>Last sign-in</th><th></th></tr></thead><tbody>
        ${users.map(u => `<tr><td><b>${esc(u.name || '—')}</b><br>${esc(u.email)}${u.active ? '' : ' <span style="color:var(--bad)">(disabled)</span>'}</td><td>${u.role === 'admin' ? 'Administrator' : 'Trainee'}</td><td>${u.last_login ? esc(u.last_login.slice(0, 10)) : 'never'}</td>
          <td><div class="row"><button data-link="${esc(u.id)}">Reset link</button>${u.id === ME.id ? '' : `<button data-tog="${esc(u.id)}" data-on="${u.active ? 0 : 1}">${u.active ? 'Disable' : 'Enable'}</button>`}</div></td></tr>`).join('')}</tbody></table></div>
        <div id="aw-linkbox"></div>
        <form id="aw-addadm" style="margin-top:18px"><label>Add an administrator (email)</label><div class="row" style="display:flex;gap:8px"><input name="email" type="email" placeholder="name@axiswelldelivery.com" required><input name="name" placeholder="Name"></div><button class="go" style="width:auto;padding:10px 16px">Add administrator</button></form>
        <div class="aw-links"><a id="aw-close">Close</a></div></div>`;
      el.querySelector('#aw-close').onclick = () => el.remove();
      el.querySelectorAll('[data-link]').forEach(b => b.onclick = async () => { const l = await B.adminResetLink(b.dataset.link); showLink(l, 'Send this link to the person. It works once, for 24 hours, and lets them choose a new password.'); });
      el.querySelectorAll('[data-tog]').forEach(b => b.onclick = async () => { await B.adminSetActive(b.dataset.tog, b.dataset.on === '1'); paint(b.dataset.on === '1' ? 'Account enabled.' : 'Account disabled. That person can no longer sign in.'); });
      el.querySelector('#aw-addadm').onsubmit = async e => { e.preventDefault(); const f = new FormData(e.target); try { const l = await B.adminAddAdmin(String(f.get('email')).trim(), String(f.get('name') || '').trim()); await paint('Administrator added.'); showLink(l, 'Send this link to the new administrator so they can choose their password.'); } catch (x) { paint(x.message); } };
    };
    const showLink = (l, text) => { const box = el.querySelector('#aw-linkbox'); box.innerHTML = `<div class="aw-msg ok">${text}</div><input class="link" readonly value="${esc(l)}" onclick="this.select()">`; const i = box.querySelector('input'); i.select(); try { navigator.clipboard.writeText(l).catch(() => { }); } catch (e) { } };
    document.body.appendChild(el); paint();
  }

  // ------------------------------------------------------------------ the runtime the course calls
  const USER = { me: async () => { const u = await meP; return { id: u.id, name: u.name || '', email: u.email, isOwner: !!u.isOwner }; }, isOwner: async () => !!(await meP).isOwner };
  const DL = { save: async ({ filename, data }) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: /\.csv$/i.test(filename) ? 'text/csv' : 'application/octet-stream' })); a.download = filename; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); } };
  window.claude = { use: async n => ({ db: DB, user: USER, downloads: DL })[n] || null };
})();
