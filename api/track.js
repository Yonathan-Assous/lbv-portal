import { redis, redisReady, day } from './_redis.js';
import { readBody } from './_lib.js';

// The site reports what visitors do (sent with navigator.sendBeacon):
//   { t: "view", v: <random visitor id>, lang, dev: "mobile"|"desktop", ref: <referring site> }
//   { t: "win",  v, id: <window opened> }      { t: "click", v, k: <what was clicked> }
// Counted per day for 400 days. Unknown values are ignored, so nobody can fill the counters with junk.
const CLICKS = ['whatsapp', 'phone', 'email', 'quote_open', 'quote_send', 'signup_send', 'video', 'instagram', 'tiktok', 'facebook', 'youtube', 'booking', 'gala_demo'];
const KEEP = 60 * 60 * 24 * 400;
const clean = (v, max) => String(v || '').toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, max);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).end();
  if (!redisReady()) return res.status(204).end();
  if (/bot|crawl|spider|preview|headless/i.test(req.headers['user-agent'] || '')) return res.status(204).end();
  let b;
  try { b = await readBody(req); } catch (e) { return res.status(204).end(); }
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { return res.status(204).end(); } }
  const d = day(), v = clean(b.v, 40);
  if (!v) return res.status(204).end();
  const cmds = [];
  const hinc = (key, field) => { cmds.push(['HINCRBY', `${key}:${d}`, field, 1], ['EXPIRE', `${key}:${d}`, KEEP]); };
  if (b.t === 'view') {
    cmds.push(['PFADD', `u:${d}`, v], ['EXPIRE', `u:${d}`, KEEP], ['INCR', `pv:${d}`], ['EXPIRE', `pv:${d}`, KEEP]);
    hinc('dev', b.dev === 'mobile' ? 'mobile' : 'desktop');
    hinc('lang', ['he', 'fr', 'en'].includes(b.lang) ? b.lang : 'he');
    const ref = clean(String(b.ref || '').replace(/^www\./, ''), 60);
    hinc('ref', ref || 'direct');
  } else if (b.t === 'win') {
    const id = clean(b.id, 40);
    if (!id) return res.status(204).end();
    hinc('win', id);
  } else if (b.t === 'click') {
    const k = clean(b.k, 20);
    if (!CLICKS.includes(k)) return res.status(204).end();
    hinc('clk', k);
  } else return res.status(204).end();
  try { await redis(cmds); } catch (e) {}
  return res.status(204).end();
}
