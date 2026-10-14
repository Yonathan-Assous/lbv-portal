// The list of managers (besides the owner, who logs in with ADMIN_PASSWORD).
// Kept in the PRIVATE store, passwords only as scrypt hashes.
import { put, get } from '@vercel/blob';
import { leadsToken } from './_leads.js';

const KEY = 'admins/users.json';
const opts = extra => ({ token: leadsToken(), ...extra });

export async function loadUsers() {
  try {
    const r = await get(KEY, opts({ access: 'private' }));
    if (!r || r.statusCode !== 200) return [];
    const list = JSON.parse(await new Response(r.stream).text());
    return Array.isArray(list) ? list : [];
  } catch (e) { return []; }
}

export async function saveUsers(list) {
  await put(KEY, JSON.stringify(list), opts({ access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true }));
}

/** What the admin page may see about a manager (never the password hash). */
export const publicUser = u => ({ id: u.id, name: u.name, username: u.username, role: u.role, at: u.at, last: u.last || '' });
