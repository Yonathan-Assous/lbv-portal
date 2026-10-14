import { put, del } from '@vercel/blob';
import { isAuthed, storageReady, readBody } from './_lib.js';
import { LEADS, loadLeads } from './_leads.js';

// Sign-ups for updates ("tell me first about Pesach", "send me news").
// POST   public: one sign-up → its own blob under leads/ (random, unlisted URL).
// GET    admin:  all sign-ups, newest first (with an "unsubscribed" flag).
// DELETE admin:  remove one sign-up (?url=...).
const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!storageReady()) return res.status(503).json({ error: 'not-configured' });

  if (req.method === 'POST') {
    let b;
    try { b = await readBody(req); } catch (e) { return res.status(400).json({ error: 'bad-json' }); }
    if (b.website) return res.status(200).json({ ok: true }); // honeypot: bots fill hidden fields
    const lead = {
      name: clean(b.name, 80), phone: clean(b.phone, 30), email: clean(b.email, 120).toLowerCase(),
      interest: clean(b.interest, 40), lang: clean(b.lang, 5), consent: b.consent === true,
      at: new Date().toISOString(),
    };
    const digits = lead.phone.replace(/\D/g, '');
    const emailOk = !lead.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email);
    if (!lead.name || (digits.length < 9 && !lead.email) || !emailOk || !lead.consent) return res.status(400).json({ error: 'invalid' });
    await put(`${LEADS}${lead.at.slice(0, 10)}.json`, JSON.stringify(lead), { access: 'public', contentType: 'application/json', addRandomSuffix: true });
    return res.status(200).json({ ok: true });
  }

  if (!isAuthed(req)) return res.status(401).json({ error: 'login' });

  if (req.method === 'GET') return res.status(200).json(await loadLeads());

  if (req.method === 'DELETE') {
    const url = new URL(req.url, 'http://x').searchParams.get('url') || '';
    if (!url.includes('/' + LEADS)) return res.status(400).json({ error: 'bad-url' });
    await del(url);
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ error: 'method' });
}
