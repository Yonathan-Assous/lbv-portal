import { redis, redisReady, day } from './_redis.js';
import { isAuthed } from './_lib.js';

// For the admin: visitors and clicks of the last N days (default 30).
// → { ready, days: [{ d, visitors, views }], period: { visitors, views }, today, week, clicks, windows, devices, langs, refs }
const sum = (target, h) => { for (let i = 0; h && i < h.length; i += 2) target[h[i]] = (target[h[i]] || 0) + Number(h[i + 1] || 0); };

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!isAuthed(req)) return res.status(401).json({ error: 'login' });
  if (!redisReady()) return res.status(200).json({ ready: false });
  const n = Math.max(1, Math.min(90, Number(new URL(req.url, 'http://x').searchParams.get('days')) || 30));
  const dates = [...Array(n)].map((_, i) => day(new Date(Date.now() - (n - 1 - i) * 86400000)));
  const cmds = [];
  dates.forEach(d => cmds.push(['PFCOUNT', `u:${d}`], ['GET', `pv:${d}`], ['HGETALL', `clk:${d}`], ['HGETALL', `win:${d}`], ['HGETALL', `dev:${d}`], ['HGETALL', `lang:${d}`], ['HGETALL', `ref:${d}`]));
  cmds.push(['PFCOUNT', ...dates.map(d => `u:${d}`)], ['PFCOUNT', ...dates.slice(-7).map(d => `u:${d}`)]);
  let out;
  try { out = await redis(cmds); } catch (e) { return res.status(502).json({ error: 'redis' }); }
  const days = [], clicks = {}, windows = {}, devices = {}, langs = {}, refs = {};
  let views = 0;
  dates.forEach((d, i) => {
    const [u, pv, clk, win, dev, lang, ref] = out.slice(i * 7, i * 7 + 7);
    days.push({ d, visitors: Number(u) || 0, views: Number(pv) || 0 });
    views += Number(pv) || 0;
    sum(clicks, clk); sum(windows, win); sum(devices, dev); sum(langs, lang); sum(refs, ref);
  });
  const [period, week] = out.slice(-2).map(Number);
  return res.status(200).json({ ready: true, days, period: { visitors: period || 0, views }, week: week || 0, today: days[days.length - 1], clicks, windows, devices, langs, refs });
}
