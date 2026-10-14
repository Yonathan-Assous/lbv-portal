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
const sessions = new Set();
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.svg': 'image/svg+xml' };

const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
const authed = req => (req.headers.cookie || '').split(/;\s*/).some(c => c.startsWith('lbv_admin=') && sessions.has(c.slice(10)));
const body = req => new Promise((ok, bad) => { const b = []; req.on('data', d => b.push(d)); req.on('end', () => ok(Buffer.concat(b))); req.on('error', bad); });

async function api(req, res, p) {
  if (p === '/api/config') return json(res, 200, { storage: 'local', configured: Boolean(PASSWORD), authed: authed(req) });
  if (p === '/api/login') {
    if (req.method === 'DELETE') { res.writeHead(204, { 'Set-Cookie': 'lbv_admin=; Path=/; Max-Age=0' }); return res.end(); }
    const { password } = JSON.parse((await body(req)).toString() || '{}');
    if (!PASSWORD || password !== PASSWORD) return json(res, 401, { error: 'wrong-password' });
    const id = crypto.randomUUID(); sessions.add(id);
    res.writeHead(200, { 'Content-Type': 'application/json', 'Set-Cookie': `lbv_admin=${id}; Path=/; HttpOnly; SameSite=Strict` });
    return res.end(JSON.stringify({ ok: true, storage: 'local' }));
  }
  if (p === '/api/content') {
    if (req.method === 'GET') { res.writeHead(204); return res.end(); } // local: the site reads content.json
    if (!authed(req)) return json(res, 401, { error: 'login' });
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
      if (!b.name || !b.consent || (String(b.phone || '').replace(/\D/g, '').length < 9 && !b.email)) return json(res, 400, { error: 'invalid' });
      fs.mkdirSync(path.dirname(file), { recursive: true });
      all.push({ name: b.name, phone: b.phone || '', email: b.email || '', interest: b.interest || '', lang: b.lang || '', consent: true, at: new Date().toISOString(), url: 'local-' + Date.now() });
      fs.writeFileSync(file, JSON.stringify(all, null, 2));
      return json(res, 200, { ok: true });
    }
    if (!authed(req)) return json(res, 401, { error: 'login' });
    if (req.method === 'GET') return json(res, 200, [...all].reverse());
    if (req.method === 'DELETE') {
      const url = new URL(req.url, 'http://x').searchParams.get('url');
      fs.writeFileSync(file, JSON.stringify(all.filter(l => l.url !== url), null, 2));
      return json(res, 200, { ok: true });
    }
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
