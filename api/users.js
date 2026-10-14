import crypto from 'node:crypto';
import { isAuthed, can, ROLES, hashPassword, readBody } from './_lib.js';
import { leadsReady } from './_leads.js';
import { loadUsers, saveUsers, publicUser, loadOwner, saveOwner } from './_users.js';

// Managers, for the owner only.
// GET    → the list (without passwords)
// POST   { name, username, password, role }  → add
// PATCH  ?id=  { name?, role?, password? }    → change
// DELETE ?id=                                  → remove
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const s = isAuthed(req);
  if (!s) return res.status(401).json({ error: 'login' });
  if (!can(s, 'users')) return res.status(403).json({ error: 'forbidden' });
  if (!leadsReady()) return res.status(503).json({ error: 'not-configured' });

  const list = await loadUsers();
  const owner = await loadOwner();
  if (req.method === 'GET') return res.status(200).json({ owner: { username: owner.username, last: owner.last || '' }, users: list.map(publicUser) });

  let b = {};
  if (req.method !== 'DELETE') { try { b = await readBody(req); } catch (e) { return res.status(400).json({ error: 'bad-json' }); } }
  const role = ROLES.includes(b.role) && b.role !== 'owner' ? b.role : null;
  const username = String(b.username || '').trim().toLowerCase();
  const name = String(b.name || '').trim().slice(0, 60);
  const pw = String(b.password || '');

  if (req.method === 'POST') {
    if (!name || !/^[a-z0-9._-]{3,30}$/.test(username) || pw.length < 8 || !role) return res.status(400).json({ error: 'invalid' });
    if (list.some(u => u.username === username) || username === owner.username) return res.status(409).json({ error: 'taken' });
    list.push({ id: crypto.randomUUID(), name, username, role, hash: hashPassword(pw), at: new Date().toISOString() });
    await saveUsers(list);
    return res.status(200).json({ ok: true });
  }

  const id = new URL(req.url, 'http://x').searchParams.get('id') || '';
  // The owner's own username.
  if (id === 'owner' && req.method === 'PATCH') {
    if (!/^[a-z0-9._-]{3,30}$/.test(username)) return res.status(400).json({ error: 'invalid' });
    if (list.some(u => u.username === username)) return res.status(409).json({ error: 'taken' });
    await saveOwner({ ...owner, username });
    return res.status(200).json({ ok: true });
  }
  const u = list.find(x => x.id === id);
  if (!u) return res.status(404).json({ error: 'not-found' });

  if (req.method === 'PATCH') {
    if (name) u.name = name;
    if (role) u.role = role;
    if (pw) { if (pw.length < 8) return res.status(400).json({ error: 'short' }); u.hash = hashPassword(pw); }
    await saveUsers(list);
    return res.status(200).json({ ok: true });
  }
  if (req.method === 'DELETE') {
    await saveUsers(list.filter(x => x !== u));
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ error: 'method' });
}
