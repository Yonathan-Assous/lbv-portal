// Shared helpers for the admin API (Vercel serverless functions).
//
// Storage: Vercel Blob. The site's editable content lives in one JSON document ("content.json"),
// and uploaded photos/videos are stored next to it. Nothing here touches any other system's database.
//
// Required environment variables (set in the Vercel project, never committed):
//   ADMIN_PASSWORD         the password for /admin
//   BLOB_READ_WRITE_TOKEN  added automatically when a Blob store is connected to the project
//   ADMIN_SECRET           optional extra secret for signing the session cookie

import crypto from 'node:crypto';

export const CONTENT_KEY = 'site/content.json';
const COOKIE = 'lbv_admin';
const SESSION_HOURS = 24 * 30;   // a login lasts 30 days on that browser

const secret = () => (process.env.ADMIN_PASSWORD || '') + '|' + (process.env.ADMIN_SECRET || '');

export function storageReady() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN) && Boolean(process.env.ADMIN_PASSWORD);
}

function sign(value) {
  return crypto.createHmac('sha256', secret()).update(value).digest('base64url');
}

export function passwordMatches(given) {
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected || typeof given !== 'string') return false;
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

// Roles: what each kind of manager may do.
//   owner  – everything, including adding and removing managers (logs in with ADMIN_PASSWORD)
//   admin  – everything except managing managers
//   editor – the site's content only (texts, videos, photos)
//   sales  – requests, sign-ups and mailings only
export const ROLES = ['owner', 'admin', 'editor', 'sales'];
const PERMS = {
  content: ['owner', 'admin', 'editor'],
  leads: ['owner', 'admin', 'sales'],
  mail: ['owner', 'admin', 'sales'],
  users: ['owner'],
};
export const can = (s, perm) => !!s && (PERMS[perm] || []).includes(s.r);

/** A signed session: who is logged in and with which role. */
export function sessionCookie(user = { id: 'owner', n: 'הבעלים', r: 'owner' }) {
  const payload = Buffer.from(JSON.stringify({ ...user, exp: Date.now() + SESSION_HOURS * 3600 * 1000 })).toString('base64url');
  return `${COOKIE}=${payload}.${sign(payload)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_HOURS * 3600}`;
}

export const clearCookie = `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

/** The logged-in manager ({ id, n: name, r: role }), or null. */
export function isAuthed(req) {
  const raw = (req.headers.cookie || '').split(/;\s*/).find(c => c.startsWith(COOKIE + '='));
  if (!raw || !process.env.ADMIN_PASSWORD) return null;
  const [payload, mac] = raw.slice(COOKIE.length + 1).split('.');
  if (!payload || !mac) return null;
  const good = sign(payload);
  if (good.length !== mac.length || !crypto.timingSafeEqual(Buffer.from(good), Buffer.from(mac))) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return s && s.exp > Date.now() && ROLES.includes(s.r) ? s : null;
  } catch (e) { return null; }
}

/** Password hashing for managers (scrypt, with a random salt per password). */
export function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('base64url');
  return `${salt}:${crypto.scryptSync(String(pw), salt, 32).toString('base64url')}`;
}
export function checkPassword(pw, stored) {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  const a = crypto.scryptSync(String(pw), salt, 32), b = Buffer.from(hash, 'base64url');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Minimal shape check so a broken save can never blank the public site. */
export function validContent(c) {
  return c && typeof c === 'object' && !Array.isArray(c)
    && c.ceo && typeof c.ceo === 'object'
    && Array.isArray(c.team) && Array.isArray(c.trips) && Array.isArray(c.videos);
}

export async function readBody(req) {
  if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const chunks = [];
  for await (const ch of req) chunks.push(ch);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}
