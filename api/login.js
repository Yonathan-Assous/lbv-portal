import { passwordMatches, checkPassword, sessionCookie, clearCookie, storageReady, readBody } from './_lib.js';
import { leadsReady } from './_leads.js';
import { loadUsers, saveUsers } from './_users.js';

// POST { username, password }:
//   no username + the main password → the owner
//   username + password             → a manager added by the owner (role from the list)
export default async function handler(req, res) {
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', clearCookie);
    return res.status(204).end();
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!process.env.ADMIN_PASSWORD) return res.status(503).json({ error: 'not-configured' });

  const { username, password } = await readBody(req).catch(() => ({}));
  const name = String(username || '').trim().toLowerCase();
  let user = null;
  if (!name && passwordMatches(password)) user = { id: 'owner', n: 'הבעלים', r: 'owner' };
  else if (name && leadsReady()) {
    const list = await loadUsers();
    const u = list.find(x => x.username === name);
    if (u && checkPassword(password, u.hash)) {
      user = { id: u.id, n: u.name, r: u.role };
      u.last = new Date().toISOString();
      saveUsers(list).catch(() => {});
    }
  }
  if (!user) {
    await new Promise(r => setTimeout(r, 800)); // slow down guessing
    return res.status(401).json({ error: 'wrong-password' });
  }
  res.setHeader('Set-Cookie', sessionCookie(user));
  return res.status(200).json({ ok: true, storage: storageReady() ? 'blob' : 'none', user: { name: user.n, role: user.r } });
}
