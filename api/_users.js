// The list of managers. The owner logs in with ADMIN_PASSWORD and a username of their choice (default "owner").
// Kept in the PRIVATE store, passwords only as scrypt hashes.
import { put, get } from '@vercel/blob';
import { leadsToken } from './_leads.js';

const KEY = 'admins/users.json';
const OWNER_KEY = 'admins/owner.json';
const opts = extra => ({ token: leadsToken(), ...extra });

async function readJson(key, fallback) {
  try {
    const r = await get(key, opts({ access: 'private' }));
    if (!r || r.statusCode !== 200) return fallback;
    return JSON.parse(await new Response(r.stream).text());
  } catch (e) { return fallback; }
}
const writeJson = (key, v) => put(key, JSON.stringify(v), opts({ access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true }));

export async function loadUsers() { const l = await readJson(KEY, []); return Array.isArray(l) ? l : []; }
export const saveUsers = list => writeJson(KEY, list);

/** The owner's username (and when they last logged in). */
export async function loadOwner() { const o = await readJson(OWNER_KEY, {}); return { username: 'owner', ...o }; }
export const saveOwner = o => writeJson(OWNER_KEY, o);

/** What the admin page may see about a manager (never the password hash). */
export const publicUser = u => ({ id: u.id, name: u.name, username: u.username, role: u.role, at: u.at, last: u.last || '' });
