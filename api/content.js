import { put, list, del } from '@vercel/blob';
import { CONTENT_KEY, isAuthed, can, storageReady, validContent, readBody } from './_lib.js';

// Every save is a new file (site/content-v/<time>.json), so the site never gets a stale copy of an
// overwritten file and a change shows up as soon as it is saved. The last few versions are kept.
const VERSIONS = 'site/content-v/';
const KEEP = 10;

async function versions() {
  const all = [];
  let cursor;
  do {
    const r = await list({ prefix: VERSIONS, cursor, limit: 1000 });
    all.push(...r.blobs);
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  return all.sort((a, b) => b.pathname.localeCompare(a.pathname)); // newest first
}

// GET  → the published content (public; the site falls back to the bundled content.json on 204).
// PUT  → save new content (admin session required).
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') {
    // 204 = nothing saved yet: the site quietly uses its bundled content.json.
    if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(204).end();
    try {
      let blob = (await versions())[0];
      if (!blob) blob = (await list({ prefix: CONTENT_KEY, limit: 1 })).blobs[0]; // saved before versions existed
      if (!blob) return res.status(204).end();
      const r = await fetch(`${blob.url}?v=${Date.parse(blob.uploadedAt) || Date.now()}`, { cache: 'no-store' });
      return res.status(200).json(await r.json());
    } catch (e) {
      return res.status(502).json({ error: 'read-failed' });
    }
  }

  if (req.method === 'PUT') {
    const s = isAuthed(req);
    if (!s) return res.status(401).json({ error: 'login' });
    if (!can(s, 'content')) return res.status(403).json({ error: 'forbidden' });
    if (!storageReady()) return res.status(503).json({ error: 'not-configured' });
    let body;
    try { body = await readBody(req); } catch (e) { return res.status(400).json({ error: 'bad-json' }); }
    if (!validContent(body)) return res.status(400).json({ error: 'bad-shape' });
    const now = new Date();
    const text = JSON.stringify({ ...body, savedAt: now.toISOString(), savedBy: s.n }, null, 2);
    if (text.length > 1_500_000) return res.status(413).json({ error: 'too-big' });
    const name = `${VERSIONS}${String(now.getTime()).padStart(15, '0')}.json`;
    await put(name, text, {
      access: 'public', contentType: 'application/json',
      addRandomSuffix: true, cacheControlMaxAge: 60,
    });
    // Tidy up: keep only the latest versions (and drop the old single file once versions exist).
    try {
      const old = (await versions()).slice(KEEP).map(b => b.url);
      const legacy = (await list({ prefix: CONTENT_KEY, limit: 1 })).blobs.map(b => b.url);
      if (old.length || legacy.length) await del([...old, ...legacy]);
    } catch (e) {}
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'method' });
}
