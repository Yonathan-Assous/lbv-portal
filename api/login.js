import { passwordMatches, checkPassword, sessionCookie, clearCookie, storageReady, readBody } from './_lib.js';
import { leadsReady } from './_leads.js';
import { loadUsers, saveUsers, loadOwner, saveOwner } from './_users.js';

// POST { username, password }:
//   the owner's username (default "owner") + the main password → the owner
//   a manager's username + their password                      → that manager (role from the list)
// (An empty username with the main password still works, as a backup for the owner.)
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
  const owner = leadsReady() ? await loadOwner() : { username: 'owner' };
  // The owner: their own password (if they set one in the admin), or the main password as a backup.
  const ownerOk = (owner.hash && checkPassword(password, owner.hash)) || passwordMatches(password);
  if ((!name || name === owner.username) && ownerOk) {
    user = { id: 'owner', n: 'הבעלים', r: 'owner' };
    if (leadsReady()) saveOwner({ ...owner, last: new Date().toISOString() }).catch(() => {});
  } else if (name && leadsReady()) {
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
