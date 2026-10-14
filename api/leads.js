import { isAuthed, storageReady, readBody } from './_lib.js';
import { LEADS, leadsReady, saveLead, deleteLead, updateLead, loadLeads } from './_leads.js';

// People who left details on the site, kept in the PRIVATE store:
//   type "signup": "tell me first" sign-ups for updates (consent required, used for mailings)
//   type "quote":  quote requests from the contact form (also sent to WhatsApp by the visitor)
// POST   public: one entry → its own file under leads/.
// GET    admin:  everything, newest first.
// PATCH  admin:  ?id=leads/...  body { handled: true|false }
// DELETE admin:  ?id=leads/...
const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!storageReady() || !leadsReady()) return res.status(503).json({ error: 'not-configured' });

  if (req.method === 'POST') {
    let b;
    try { b = await readBody(req); } catch (e) { return res.status(400).json({ error: 'bad-json' }); }
    if (b.website) return res.status(200).json({ ok: true }); // honeypot: bots fill hidden fields
    const at = new Date().toISOString();
    if (b.type === 'quote') {
      const lead = {
        type: 'quote', name: clean(b.name, 80), phone: clean(b.phone, 30), service: clean(b.service, 80),
        date: clean(b.date, 40), guests: clean(b.guests, 20), notes: clean(b.notes, 1500), lang: clean(b.lang, 5),
        consent: false, at,
      };
      if (!lead.name || lead.phone.replace(/\D/g, '').length < 9) return res.status(400).json({ error: 'invalid' });
      await saveLead(lead);
      return res.status(200).json({ ok: true });
    }
    const lead = {
      type: 'signup', name: clean(b.name, 80), phone: clean(b.phone, 30), email: clean(b.email, 120).toLowerCase(),
      interest: clean(b.interest, 40), lang: clean(b.lang, 5), consent: b.consent === true, at,
    };
    const digits = lead.phone.replace(/\D/g, '');
    const emailOk = !lead.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email);
    if (!lead.name || (digits.length < 9 && !lead.email) || !emailOk || !lead.consent) return res.status(400).json({ error: 'invalid' });
    await saveLead(lead);
    return res.status(200).json({ ok: true });
  }

  if (!isAuthed(req)) return res.status(401).json({ error: 'login' });

  if (req.method === 'GET') return res.status(200).json(await loadLeads());

  const id = new URL(req.url, 'http://x').searchParams.get('id') || '';
  if (!id.startsWith(LEADS) || id.includes('..')) return res.status(400).json({ error: 'bad-id' });

  if (req.method === 'PATCH') {
    let b;
    try { b = await readBody(req); } catch (e) { return res.status(400).json({ error: 'bad-json' }); }
    const ok = await updateLead(id, { handled: b.handled === true, handledAt: b.handled === true ? new Date().toISOString() : '' });
    return ok ? res.status(200).json({ ok: true }) : res.status(404).json({ error: 'not-found' });
  }
  if (req.method === 'DELETE') {
    await deleteLead(id);
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ error: 'method' });
}
