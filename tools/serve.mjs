// Local preview server for the homepage + a local stand-in for the admin API.
// Production uses the Vercel functions in /api (Blob storage); here content is saved to
// ./content.json and uploads to ./media/uploads, so the admin can be tested end to end.
// Set ADMIN_PASSWORD in the environment to enable the local admin login.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT) || 5190;
const PASSWORD = process.env.ADMIN_PASSWORD || '';
const STATS = {};   // local visit counts (/api/track)
const sessions = new Map(); // session id → { n: name, r: role }
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.svg': 'image/svg+xml' };

const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
const authed = req => { const c = (req.headers.cookie || '').split(/;\s*/).find(x => x.startsWith('lbv_admin=')); return c ? sessions.get(c.slice(10)) || null : null; };
const PERMS = { content: ['owner', 'admin', 'editor'], leads: ['owner', 'admin', 'sales'], mail: ['owner', 'admin', 'sales'], users: ['owner'] };
const can = (s, k) => !!s && PERMS[k].includes(s.r);
const usersFile = () => path.join(root, 'data', 'users.local.json');
const loadUsers = () => fs.existsSync(usersFile()) ? JSON.parse(fs.readFileSync(usersFile(), 'utf8')) : [];
const saveUsers = l => { fs.mkdirSync(path.dirname(usersFile()), { recursive: true }); fs.writeFileSync(usersFile(), JSON.stringify(l, null, 2)); };
const hash = pw => { const salt = crypto.randomBytes(16).toString('base64url'); return salt + ':' + crypto.scryptSync(pw, salt, 32).toString('base64url'); };
const ownerFile = () => path.join(root, 'data', 'owner.local.json');
const loadOwner = () => ({ username: 'owner', ...(fs.existsSync(ownerFile()) ? JSON.parse(fs.readFileSync(ownerFile(), 'utf8')) : {}) });
const saveOwner = o => { fs.mkdirSync(path.dirname(ownerFile()), { recursive: true }); fs.writeFileSync(ownerFile(), JSON.stringify(o)); };
const check = (pw, h) => { const [salt, v] = String(h).split(':'); return !!salt && crypto.scryptSync(String(pw), salt, 32).toString('base64url') === v; };
const body = req => new Promise((ok, bad) => { const b = []; req.on('data', d => b.push(d)); req.on('end', () => ok(Buffer.concat(b))); req.on('error', bad); });

async function api(req, res, p) {
  if (p === '/api/config') { const s = authed(req); return json(res, 200, { storage: 'local', configured: Boolean(PASSWORD), authed: !!s, user: s ? { name: s.n, role: s.r } : null, leads: true }); }
  if (p === '/api/login') {
    if (req.method === 'DELETE') { res.writeHead(204, { 'Set-Cookie': 'lbv_admin=; Path=/; Max-Age=0' }); return res.end(); }
    const { username, password } = JSON.parse((await body(req)).toString() || '{}');
    const uname = String(username || '').trim().toLowerCase();
    let user = null;
    const o = loadOwner();
    if ((!uname || uname === o.username) && PASSWORD && (password === PASSWORD || (o.hash && check(password, o.hash)))) user = { n: 'הבעלים', r: 'owner' };
    else if (uname) { const u = loadUsers().find(x => x.username === uname); if (u && check(password, u.hash)) user = { n: u.name, r: u.role }; }
    if (!user) return json(res, 401, { error: 'wrong-password' });
    const id = crypto.randomUUID(); sessions.set(id, user);
    res.writeHead(200, { 'Content-Type': 'application/json', 'Set-Cookie': `lbv_admin=${id}; Path=/; HttpOnly; SameSite=Strict` });
    return res.end(JSON.stringify({ ok: true, storage: 'local', user: { name: user.n, role: user.r } }));
  }
  if (p === '/api/content') {
    if (req.method === 'GET') { res.writeHead(204); return res.end(); } // local: the site reads content.json
    if (!authed(req)) return json(res, 401, { error: 'login' });
    if (!can(authed(req), 'content')) return json(res, 403, { error: 'forbidden' });
    const data = JSON.parse((await body(req)).toString());
    fs.writeFileSync(path.join(root, 'content.json'), JSON.stringify({ ...data, savedAt: new Date().toISOString() }, null, 2) + '\n');
    return json(res, 200, { ok: true });
  }
  if (p === '/api/leads') {
    const file = path.join(root, 'data', 'leads.local.json');
    const all = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
    if (req.method === 'POST') {
      const b = JSON.parse((await body(req)).toString() || '{}');
      if (b.website) return json(res, 200, { ok: true });
      const at = new Date().toISOString(), id = 'leads/local-' + Date.now();
      fs.mkdirSync(path.dirname(file), { recursive: true });
      if (b.type === 'quote') {
        if (!b.name || String(b.phone || '').replace(/\D/g, '').length < 9) return json(res, 400, { error: 'invalid' });
        all.push({ type: 'quote', name: b.name, phone: b.phone, service: b.service || '', date: b.date || '', guests: b.guests || '', notes: b.notes || '', lang: b.lang || '', consent: false, at, id });
      } else {
        if (!b.name || !b.consent || (String(b.phone || '').replace(/\D/g, '').length < 9 && !b.email)) return json(res, 400, { error: 'invalid' });
        all.push({ type: 'signup', name: b.name, phone: b.phone || '', email: b.email || '', interest: b.interest || '', lang: b.lang || '', consent: true, at, id });
      }
      fs.writeFileSync(file, JSON.stringify(all, null, 2));
      return json(res, 200, { ok: true });
    }
    if (!authed(req)) return json(res, 401, { error: 'login' });
    if (!can(authed(req), 'leads')) return json(res, 403, { error: 'forbidden' });
    if (req.method === 'GET') return json(res, 200, [...all].reverse());
    if (req.method === 'PATCH') {
      const id = new URL(req.url, 'http://x').searchParams.get('id');
      const b = JSON.parse((await body(req)).toString() || '{}');
      fs.writeFileSync(file, JSON.stringify(all.map(l => (l.id || l.url) === id ? { ...l, handled: b.handled === true } : l), null, 2));
      return json(res, 200, { ok: true });
    }
    if (req.method === 'DELETE') {
      const id = new URL(req.url, 'http://x').searchParams.get('id');
      fs.writeFileSync(file, JSON.stringify(all.filter(l => (l.id || l.url) !== id), null, 2));
      return json(res, 200, { ok: true });
    }
  }
  if (p === "/api/quotes") {
    // Local stand-in for the private quotes store.
    const qf = path.join(root, "data", "quotes.local.json"), cf = path.join(root, "data", "catalog.local.json");
    const all = fs.existsSync(qf) ? JSON.parse(fs.readFileSync(qf, "utf8")) : [];
    const saveAll = l => { fs.mkdirSync(path.dirname(qf), { recursive: true }); fs.writeFileSync(qf, JSON.stringify(l, null, 2)); };
    const tok = id => crypto.createHmac("sha256", PASSWORD || "x").update("quote:" + id).digest("base64url").slice(0, 22);
    const u = new URL(req.url, "http://x"), view = u.searchParams.get("view"), id = u.searchParams.get("id");
    if (view) {
      const q = all.find(x => x.id === view);
      if (!q || u.searchParams.get("t") !== tok(view)) return json(res, 404, { error: "not-found" });
      if (req.method === "POST") { const b = JSON.parse((await body(req)).toString() || "{}"); if (!b.name) return json(res, 400, { error: "name" }); if (q.status !== "accepted") { q.status = "accepted"; const pk = q.packages && q.packages.options.find(o => o.name === b.package); q.accepted = { name: b.name, at: new Date().toISOString(), ...(pk ? { package: pk.name, packagePrice: pk.price } : {}) }; saveAll(all); } }
      const { createdBy, updatedBy, leadId, ...rest } = q; return json(res, 200, rest);
    }
    const me = authed(req);
    if (!me) return json(res, 401, { error: "login" });
    if (!can(me, "leads")) return json(res, 403, { error: "forbidden" });
    if (u.searchParams.has("catalog")) {
      if (req.method === "PUT") { const b = JSON.parse((await body(req)).toString() || "{}"); fs.mkdirSync(path.dirname(cf), { recursive: true }); fs.writeFileSync(cf, JSON.stringify(b, null, 2)); return json(res, 200, b); }
      return json(res, 200, fs.existsSync(cf) ? JSON.parse(fs.readFileSync(cf, "utf8")) : { sections: null });
    }
    if (req.method === "GET") return json(res, 200, id ? { ...all.find(x => x.id === id), token: tok(id) } : [...all].reverse().map(q => ({ ...q, token: tok(q.id) })));
    if (req.method === "DELETE") { saveAll(all.filter(x => x.id !== id)); return json(res, 200, { ok: true }); }
    if (req.method === "POST") {
      const b = JSON.parse((await body(req)).toString() || "{}"), now = new Date().toISOString();
      let q = b.id && all.find(x => x.id === b.id);
      const { token, ...data } = b;
      if (q) { Object.assign(q, data, { updatedAt: now }); if (b.status === "sent" && q.status === "draft") q.status = "sent"; }
      else { q = { ...data, id: "q-" + crypto.randomBytes(8).toString("hex"), number: "LBV-" + now.slice(0, 4) + "-" + String(all.length + 1).padStart(3, "0"), status: b.status === "sent" ? "sent" : "draft", createdAt: now, createdBy: me.n }; all.push(q); }
      saveAll(all); return json(res, 200, { ...q, token: tok(q.id) });
    }
  }
  // Local stand-in for the visit counter (kept in memory while the server runs).
  if (p === "/api/track") {
    const b = JSON.parse((await body(req)).toString() || "{}"), d = new Date().toISOString().slice(0, 10);
    const day = (STATS[d] ??= { u: new Set(), pv: 0, clk: {}, win: {}, dev: {}, lang: {}, ref: {} });
    const inc = (o, k) => { o[k] = (o[k] || 0) + 1; };
    if (b.t === "view") { day.u.add(b.v); day.pv++; inc(day.dev, b.dev === "mobile" ? "mobile" : "desktop"); inc(day.lang, b.lang || "he"); inc(day.ref, b.ref || "direct"); }
    else if (b.t === "win" && b.id) inc(day.win, b.id);
    else if (b.t === "click" && b.k) inc(day.clk, b.k);
    res.writeHead(204); return res.end();
  }
  if (p === "/api/visits") {
    if (!authed(req)) return json(res, 401, { error: "login" });
    const dates = [...Array(30)].map((_, i) => new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10));
    const all = { clicks: {}, windows: {}, devices: {}, langs: {}, refs: {} }, U = new Set(), W = new Set(); let views = 0;
    const add = (t, o) => Object.entries(o || {}).forEach(([k, v]) => { t[k] = (t[k] || 0) + v; });
    const days = dates.map((d, i) => { const x = STATS[d]; if (!x) return { d, visitors: 0, views: 0 }; x.u.forEach(v => { U.add(v); if (i >= 23) W.add(v); }); views += x.pv;
      add(all.clicks, x.clk); add(all.windows, x.win); add(all.devices, x.dev); add(all.langs, x.lang); add(all.refs, x.ref); return { d, visitors: x.u.size, views: x.pv }; });
    return json(res, 200, { ready: true, days, period: { visitors: U.size, views }, week: W.size, today: days[29], ...all });
  }
  if (p === '/api/send') {
    // Local stand-in: counts who would receive it, sends nothing.
    if (!authed(req)) return json(res, 401, { error: 'login' });
    const b = JSON.parse((await body(req)).toString() || '{}');
    if (!b.subject || !b.message) return json(res, 400, { error: 'empty' });
    const file = path.join(root, 'data', 'leads.local.json');
    const all = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
    const n = b.test ? 1 : new Set(all.filter(l => l.email && (!b.interest || l.interest === b.interest || l.interest === 'all')).map(l => l.email)).size;
    return json(res, 200, { ok: true, sent: n, total: n, simulated: true });
  }
  if (p === '/api/users') {
    const me = authed(req);
    if (!me) return json(res, 401, { error: 'login' });
    if (!can(me, 'users')) return json(res, 403, { error: 'forbidden' });
    const list = loadUsers();
    if (req.method === 'GET') return json(res, 200, { owner: (({ hash: _h, ...o }) => o)(loadOwner()), users: list.map(({ hash: _, ...u }) => u) });
    const b = req.method === 'DELETE' ? {} : JSON.parse((await body(req)).toString() || '{}');
    const role = ['admin', 'editor', 'sales'].includes(b.role) ? b.role : null;
    const username = String(b.username || '').trim().toLowerCase();
    if (req.method === 'POST') {
      if (!b.name || !/^[a-z0-9._-]{3,30}$/.test(username) || String(b.password || '').length < 8 || !role) return json(res, 400, { error: 'invalid' });
      if (list.some(u => u.username === username)) return json(res, 409, { error: 'taken' });
      list.push({ id: crypto.randomUUID(), name: b.name, username, role, hash: hash(b.password), at: new Date().toISOString() });
      saveUsers(list); return json(res, 200, { ok: true });
    }
    const id = new URL(req.url, 'http://x').searchParams.get('id');
    if (id === 'owner' && req.method === 'PATCH') { if (!/^[a-z0-9._-]{3,30}$/.test(username)) return json(res, 400, { error: 'invalid' }); saveOwner({ ...loadOwner(), username }); return json(res, 200, { ok: true }); }
    const u = list.find(x => x.id === id);
    if (!u) return json(res, 404, { error: 'not-found' });
    if (req.method === 'PATCH') { if (b.name) u.name = b.name; if (role) u.role = role; if (b.password) u.hash = hash(b.password); saveUsers(list); return json(res, 200, { ok: true }); }
    if (req.method === 'DELETE') { saveUsers(list.filter(x => x !== u)); return json(res, 200, { ok: true }); }
  }
  if (p === '/api/password') {
    const me = authed(req);
    if (!me) return json(res, 401, { error: 'login' });
    const b = JSON.parse((await body(req)).toString() || '{}');
    if (String(b.next || '').length < 8) return json(res, 400, { error: 'short' });
    if (me.r === 'owner') { const o = loadOwner(); if (!((o.hash && check(b.current, o.hash)) || b.current === PASSWORD)) return json(res, 403, { error: 'wrong-current' }); saveOwner({ ...o, hash: hash(b.next) }); return json(res, 200, { ok: true }); }
    const list = loadUsers(), u = list.find(x => x.name === me.n);
    if (!u || !check(b.current, u.hash)) return json(res, 403, { error: 'wrong-current' });
    u.hash = hash(b.next); saveUsers(list); return json(res, 200, { ok: true });
  }
  if (p === '/api/upload-local') {
    if (!authed(req)) return json(res, 401, { error: 'login' });
    const name = (new URL(req.url, 'http://x').searchParams.get('name') || 'file').replace(/[^\w.\-]/g, '_');
    const dir = path.join(root, 'media', 'uploads');
    fs.mkdirSync(dir, { recursive: true });
    const file = `${Date.now()}-${name}`;
    fs.writeFileSync(path.join(dir, file), await body(req));
    return json(res, 200, { url: `media/uploads/${file}` });
  }
  return json(res, 404, { error: 'unknown' });
}

http.createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.startsWith('/api/')) return api(req, res, p).catch(e => json(res, 500, { error: e.message }));
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(root, p);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
  const size = fs.statSync(file).size;
  const type = types[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const range = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Number(range[2]) : size - 1;
    res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 });
    return fs.createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' });
  fs.createReadStream(file).pipe(res);
}).listen(port, () => console.log(`LBV homepage on http://localhost:${port}`));
