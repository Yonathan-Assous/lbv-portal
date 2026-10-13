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
const SESSION_HOURS = 12;

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

export function sessionCookie() {
  const exp = String(Date.now() + SESSION_HOURS * 3600 * 1000);
  return `${COOKIE}=${exp}.${sign(exp)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_HOURS * 3600}`;
}

export const clearCookie = `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

export function isAuthed(req) {
  const raw = (req.headers.cookie || '').split(/;\s*/).find(c => c.startsWith(COOKIE + '='));
  if (!raw || !process.env.ADMIN_PASSWORD) return false;
  const [exp, mac] = raw.slice(COOKIE.length + 1).split('.');
  if (!exp || !mac || Number(exp) < Date.now()) return false;
  const good = sign(exp);
  return good.length === mac.length && crypto.timingSafeEqual(Buffer.from(good), Buffer.from(mac));
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
