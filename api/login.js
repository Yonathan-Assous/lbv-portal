import { passwordMatches, sessionCookie, clearCookie, storageReady, readBody } from './_lib.js';

export default async function handler(req, res) {
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', clearCookie);
    return res.status(204).end();
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!process.env.ADMIN_PASSWORD) return res.status(503).json({ error: 'not-configured' });

  const { password } = await readBody(req).catch(() => ({}));
  if (!passwordMatches(password)) {
    await new Promise(r => setTimeout(r, 800)); // slow down guessing
    return res.status(401).json({ error: 'wrong-password' });
  }
  res.setHeader('Set-Cookie', sessionCookie());
  return res.status(200).json({ ok: true, storage: storageReady() ? 'blob' : 'none' });
}
