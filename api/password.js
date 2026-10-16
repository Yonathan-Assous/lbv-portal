import { isAuthed, passwordMatches, checkPassword, hashPassword, readBody } from './_lib.js';
import { leadsReady } from './_leads.js';
import { loadUsers, saveUsers, loadOwner, saveOwner } from './_users.js';

// Any logged-in manager changes their own password: POST { current, next }.
// The owner's new password is kept (hashed) next to the owner's username; the main password from the
// hosting settings keeps working as a backup for the owner.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const s = isAuthed(req);
  if (!s) return res.status(401).json({ error: 'login' });
  if (!leadsReady()) return res.status(503).json({ error: 'not-configured' });
  let b;
  try { b = await readBody(req); } catch (e) { return res.status(400).json({ error: 'bad-json' }); }
  const current = String(b.current || ''), next = String(b.next || '');
  if (next.length < 8) return res.status(400).json({ error: 'short' });

  if (s.r === 'owner') {
    const owner = await loadOwner();
    const ok = (owner.hash && checkPassword(current, owner.hash)) || passwordMatches(current);
    if (!ok) { await new Promise(r => setTimeout(r, 800)); return res.status(403).json({ error: 'wrong-current' }); }
    await saveOwner({ ...owner, hash: hashPassword(next), changed: new Date().toISOString() });
    return res.status(200).json({ ok: true });
  }
  const list = await loadUsers();
  const u = list.find(x => x.id === s.id);
  if (!u) return res.status(404).json({ error: 'not-found' });
  if (!checkPassword(current, u.hash)) { await new Promise(r => setTimeout(r, 800)); return res.status(403).json({ error: 'wrong-current' }); }
  u.hash = hashPassword(next);
  await saveUsers(list);
  return res.status(200).json({ ok: true });
}
