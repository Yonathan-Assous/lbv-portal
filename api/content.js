import { put, list } from '@vercel/blob';
import { CONTENT_KEY, isAuthed, can, storageReady, validContent, readBody } from './_lib.js';

// GET  → the published content (public; the site falls back to the bundled content.json on 404).
// PUT  → save new content (admin session required).
export default async function handler(req, res) {
  if (req.method === 'GET') {
    // 204 = nothing saved yet: the site quietly uses its bundled content.json.
    if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(204).end();
    try {
      const { blobs } = await list({ prefix: CONTENT_KEY, limit: 1 });
      if (!blobs.length) return res.status(204).end();
      const r = await fetch(`${blobs[0].url}?v=${Date.parse(blobs[0].uploadedAt) || Date.now()}`, { cache: 'no-store' });
      res.setHeader('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=10');
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
    const text = JSON.stringify({ ...body, savedAt: new Date().toISOString(), savedBy: s.n }, null, 2);
    if (text.length > 1_500_000) return res.status(413).json({ error: 'too-big' });
    await put(CONTENT_KEY, text, {
      access: 'public', contentType: 'application/json',
      addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60,
    });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'method' });
}
