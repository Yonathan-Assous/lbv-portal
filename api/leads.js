import { put, list, del } from '@vercel/blob';
import { isAuthed, storageReady, readBody } from './_lib.js';

// Sign-ups for updates ("tell me first about Pesach", "send me news").
// POST   public: one sign-up → its own blob under leads/ (random, unlisted URL).
// GET    admin:  all sign-ups, newest first.
// DELETE admin:  remove one sign-up (?url=...).
const PREFIX = 'leads/';
const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!storageReady()) return res.status(503).json({ error: 'not-configured' });

  if (req.method === 'POST') {
    let b;
    try { b = await readBody(req); } catch (e) { return res.status(400).json({ error: 'bad-json' }); }
    if (b.website) return res.status(200).json({ ok: true }); // honeypot: bots fill hidden fields
    const lead = {
      name: clean(b.name, 80), phone: clean(b.phone, 30), email: clean(b.email, 120),
      interest: clean(b.interest, 40), lang: clean(b.lang, 5), consent: b.consent === true,
      at: new Date().toISOString(),
    };
    const digits = lead.phone.replace(/\D/g, '');
    const emailOk = !lead.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email);
    if (!lead.name || (digits.length < 9 && !lead.email) || !emailOk || !lead.consent) return res.status(400).json({ error: 'invalid' });
    await put(`${PREFIX}${lead.at.slice(0, 10)}.json`, JSON.stringify(lead), { access: 'public', contentType: 'application/json', addRandomSuffix: true });
    return res.status(200).json({ ok: true });
  }

  if (!isAuthed(req)) return res.status(401).json({ error: 'login' });

  if (req.method === 'GET') {
    const out = [];
    let cursor;
    do {
      const page = await list({ prefix: PREFIX, cursor, limit: 1000 });
      out.push(...page.blobs);
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    const leads = await Promise.all(out.map(async b => {
      try { return { ...(await (await fetch(b.url, { cache: 'no-store' })).json()), url: b.url }; } catch (e) { return null; }
    }));
    return res.status(200).json(leads.filter(Boolean).sort((a, b) => (b.at > a.at ? 1 : -1)));
  }

  if (req.method === 'DELETE') {
    const url = new URL(req.url, 'http://x').searchParams.get('url') || '';
    if (!url.includes('/' + PREFIX)) return res.status(400).json({ error: 'bad-url' });
    await del(url);
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ error: 'method' });
}
