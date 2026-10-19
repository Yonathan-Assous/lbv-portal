import crypto from 'node:crypto';
import { list, put, get, del } from '@vercel/blob';
import { isAuthed, can, readBody } from './_lib.js';
import { leadsToken, leadsReady } from './_leads.js';

// Quotes (הצעות מחיר) built in the admin, kept in the PRIVATE store next to the requests:
//   quotes/q-<id>/v….json   one quote      quotes/_catalog/v….json   the chapters (services) and default texts
// Every save is a new version file (an overwritten file can be served stale for a minute); the newest wins
// and older versions are removed. Quotes saved before this as quotes/q-<id>.json are still read.
// Admin (sales permission):
//   GET            → every quote (newest first)          GET ?id=     → one quote
//   POST           → create or update a quote            DELETE ?id=  → delete
//   GET ?catalog   → the services list                   PUT ?catalog → save it
// Client (no login, with the quote's signed link):
//   GET ?view=<id>&t=<token>   → the quote as the client sees it
//   POST ?view=<id>&t=<token>  { name } → the client approves the quote
const PREFIX = 'quotes/q-';
const CATALOG = 'quotes/_catalog';
const opts = extra => ({ token: leadsToken(), ...extra });
const secret = () => process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || '';
export const quoteToken = id => crypto.createHmac('sha256', secret()).update('quote:' + id).digest('base64url').slice(0, 22);

async function readJson(key, fallback = null) {
  try {
    const r = await get(key, opts({ access: 'private' }));
    if (!r || r.statusCode !== 200) return fallback;
    return JSON.parse(await new Response(r.stream).text());
  } catch (e) { return fallback; }
}

async function listAll(prefix) {
  const out = [];
  let cursor;
  do {
    const page = await list(opts({ prefix, cursor, limit: 1000 }));
    out.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return out;
}
/** The newest version of a document ("quotes/q-…" or the catalog), or the old single file. */
async function readDoc(key, fallback = null) {
  const versions = (await listAll(key + '/v')).map(b => b.pathname).sort();
  if (versions.length) return readJson(versions[versions.length - 1], fallback);
  return readJson(key + '.json', fallback);
}
async function writeDoc(key, value) {
  const stamp = String(Date.now()).padStart(15, '0') + '-' + crypto.randomBytes(3).toString('hex');
  await put(`${key}/v${stamp}.json`, JSON.stringify(value), opts({ access: 'private', contentType: 'application/json', addRandomSuffix: false }));
  try {
    const old = (await listAll(key + '/v')).map(b => b.pathname).sort().slice(0, -3);   // keep the last 3
    const legacy = (await listAll(key + '.json')).map(b => b.pathname);
    if (old.length || legacy.length) await del([...old, ...legacy], opts());
  } catch (e) {}
}
async function listQuotes() {
  const ids = new Set((await listAll(PREFIX)).map(b => (b.pathname.match(/^quotes\/(q-[a-z0-9]+)/) || [])[1]).filter(Boolean));
  const all = await Promise.all([...ids].map(id => readDoc('quotes/' + id)));
  return all.filter(Boolean).sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
}

const str = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ' ').slice(0, max);
const num = v => { const n = Number(v); return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0; };
const pick = (v, ok, dflt) => (ok.includes(v) ? v : dflt);

/** Only known fields, with limits: what the admin may store in a quote. */
const lines = (v, n, max) => (Array.isArray(v) ? v : []).slice(0, n).map(x => str(x, max)).filter(x => x.trim());
/** Packages the client chooses from (e.g. social media: one-time setup + a monthly package). */
function cleanPackages(p) {
  if (!p || typeof p !== 'object') return null;
  const opt = (Array.isArray(p.options) ? p.options : []).slice(0, 4).map(o => ({ name: str(o.name, 80), price: num(o.price), recommended: o.recommended === true, bullets: lines(o.bullets, 20, 200) }));
  if (!opt.length) return null;
  return {
    title: str(p.title, 160), intro: str(p.intro, 2000), unit: str(p.unit, 40), note: str(p.note, 600), extras: lines(p.extras, 20, 300),
    setup: p.setup && p.setup.name ? { name: str(p.setup.name, 160), price: num(p.setup.price), bullets: lines(p.setup.bullets, 20, 300) } : null,
    options: opt,
  };
}
function cleanQuote(b) {
  return {
    lang: pick(b.lang, ["he", "fr"], "he"),
    currency: pick(b.currency, ["ILS", "EUR"], "ILS"),
    title: str(b.title, 160), subtitle: str(b.subtitle, 160),
    client: { name: str(b.client?.name, 120), contact: str(b.client?.contact, 120), phone: str(b.client?.phone, 40), email: str(b.client?.email, 160) },
    event: { type: str(b.event?.type, 80), date: str(b.event?.date, 60), guests: str(b.event?.guests, 40), place: str(b.event?.place, 120), hours: str(b.event?.hours, 80) },
    fullDetails: b.fullDetails === true, brandLine: str(b.brandLine, 160), okNote: str(b.okNote, 1000),
    introTitle: str(b.introTitle, 160), sectionsTitle: str(b.sectionsTitle, 160), finTitle: str(b.finTitle, 160), finNote: str(b.finNote, 3000),
    intro: str(b.intro, 6000),
    sections: (Array.isArray(b.sections) ? b.sections : []).slice(0, 30).map(x => ({ title: str(x.title, 160), bullets: lines(x.bullets, 60, 600), price: num(x.price), unit: str(x.unit, 40), afterPrice: x.afterPrice === true })),
    items: (Array.isArray(b.items) ? b.items : []).slice(0, 60).map(it => ({ name: str(it.name, 300), qty: num(it.qty) || 1, price: num(it.price), unit: str(it.unit, 40) })),
    packages: cleanPackages(b.packages),
    hidePrices: b.hidePrices === true,
    discount: num(b.discount),
    vat: pick(b.vat, ["incl", "plus", "none", "note"], "incl"),
    vatRate: num(b.vatRate) || 18,
    vatNote: str(b.vatNote, 300),
    payment: str(b.payment, 1000),
    validDays: Math.max(1, Math.min(365, Math.round(num(b.validDays) || 14))),
    closing: str(b.closing, 3000), tagline: str(b.tagline, 200),
    leadId: str(b.leadId, 200),
  };
}
/** What the client sees (no internal fields). */
const forClient = q => {
  const { createdBy, updatedBy, leadId, ...rest } = q;
  return rest;
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!leadsReady()) return res.status(503).json({ error: 'not-configured' });
  const url = new URL(req.url, 'http://x');
  const view = url.searchParams.get('view');

  // ----- the client's signed link -----
  if (view) {
    if (!/^q-[a-z0-9]+$/.test(view) || url.searchParams.get('t') !== quoteToken(view)) return res.status(404).json({ error: 'not-found' });
    const q = await readDoc(`quotes/${view}`);
    if (!q) return res.status(404).json({ error: 'not-found' });
    if (req.method === 'GET') return res.status(200).json(forClient(q));
    if (req.method === 'POST') {
      let b;
      try { b = await readBody(req); } catch (e) { return res.status(400).json({ error: 'bad-json' }); }
      const name = str(b.name, 120).trim();
      if (!name) return res.status(400).json({ error: 'name' });
      if (q.status !== 'accepted') {
        q.status = 'accepted';
        const pkg = q.packages && q.packages.options.find(o => o.name === str(b.package, 80));
        q.accepted = { name, at: new Date().toISOString(), ...(pkg ? { package: pkg.name, packagePrice: pkg.price } : {}) };
        await writeDoc(`quotes/${view}`, q);
      }
      return res.status(200).json(forClient(q));
    }
    return res.status(405).json({ error: 'method' });
  }

  // ----- the admin -----
  const s = isAuthed(req);
  if (!s) return res.status(401).json({ error: 'login' });
  if (!can(s, 'leads')) return res.status(403).json({ error: 'forbidden' });

  if (url.searchParams.has('catalog')) {
    if (req.method === 'GET') return res.status(200).json(await readDoc(CATALOG, null) || { sections: null });
    if (req.method === 'PUT') {
      let b;
      try { b = await readBody(req); } catch (e) { return res.status(400).json({ error: 'bad-json' }); }
      const sec = arr => (Array.isArray(arr) ? arr : []).slice(0, 40).map(x => ({ title: str(x.title, 160), bullets: lines(x.bullets, 60, 600) }));
      const txt = o => ({ title: str(o?.title, 160), subtitle: str(o?.subtitle, 160), intro: str(o?.intro, 6000), closing: str(o?.closing, 3000), tagline: str(o?.tagline, 200), payment: str(o?.payment, 1000), lines: lines(o?.lines, 20, 300),
        brandLine: str(o?.brandLine, 160), introTitle: str(o?.introTitle, 160), finTitle: str(o?.finTitle, 160), finNote: str(o?.finNote, 3000), okNote: str(o?.okNote, 1000), items: lines(o?.items, 60, 300) });
      const cat = {
        sections: (Array.isArray(b.sections) ? b.sections : []).slice(0, 40).map(x => ({ he: sec([x.he])[0] || { title: "", bullets: [] }, fr: sec([x.fr])[0] || { title: "", bullets: [] }, price: num(x.price), unit: str(x.unit, 40), afterPrice: x.afterPrice === true })),
        version: num(b.version),
        he: txt(b.he), fr: txt(b.fr), vatRate: num(b.vatRate) || 18,
        social: b.social ? { he: cleanPackages(b.social.he), fr: cleanPackages(b.social.fr) } : null,
      };
      await writeDoc(CATALOG, cat);
      return res.status(200).json(cat);
    }
    return res.status(405).json({ error: 'method' });
  }

  const id = url.searchParams.get('id') || '';
  if (id && !/^q-[a-z0-9]+$/.test(id)) return res.status(400).json({ error: 'bad-id' });

  if (req.method === 'GET') {
    if (id) {
      const q = await readDoc(`quotes/${id}`);
      return q ? res.status(200).json({ ...q, token: quoteToken(q.id) }) : res.status(404).json({ error: 'not-found' });
    }
    return res.status(200).json((await listQuotes()).map(q => ({ ...q, token: quoteToken(q.id) })));
  }

  if (req.method === 'POST') {
    let b;
    try { b = await readBody(req); } catch (e) { return res.status(400).json({ error: 'bad-json' }); }
    const now = new Date().toISOString();
    let q;
    if (b.id) {
      if (!/^q-[a-z0-9]+$/.test(b.id)) return res.status(400).json({ error: 'bad-id' });
      const old = await readDoc(`quotes/${b.id}`);
      if (!old) return res.status(404).json({ error: 'not-found' });
      q = { ...old, ...cleanQuote(b), updatedAt: now, updatedBy: s.n };
      if (b.status === 'sent' && old.status === 'draft') q.status = 'sent';
    } else {
      // A running number per year: LBV-2026-001, LBV-2026-002, …
      const year = now.slice(0, 4);
      const nums = (await listQuotes()).map(x => String(x.number || '')).filter(n => n.startsWith(`LBV-${year}-`)).map(n => Number(n.split('-')[2]) || 0);
      const number = `LBV-${year}-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, '0')}`;
      q = { id: 'q-' + crypto.randomBytes(8).toString('hex'), number, status: b.status === 'sent' ? 'sent' : 'draft', createdAt: now, createdBy: s.n, ...cleanQuote(b) };
    }
    await writeDoc(`quotes/${q.id}`, q);
    return res.status(200).json({ ...q, token: quoteToken(q.id) });
  }

  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ error: 'bad-id' });
    const files = [...(await listAll(`quotes/${id}/`)), ...(await listAll(`quotes/${id}.json`))].map(b => b.url);
    if (files.length) await del(files, opts());
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ error: 'method' });
}
