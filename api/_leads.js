// Shared helpers for sign-ups (leads), unsubscribes and the mailing that uses them.
//
// Sign-ups hold personal details (name, phone, email), so they live in a separate PRIVATE Blob store:
// its files can only be read with that store's token, on the server, never by a link. The site's photos,
// videos and texts stay in the public store. Without the private store, sign-ups are refused rather than
// ever being written somewhere public.
import crypto from 'node:crypto';
import { list, put, get, del } from '@vercel/blob';

export const LEADS = 'leads/';
export const UNSUB = 'unsub/';

// The token of the private store (the name depends on the prefix chosen when connecting it in Vercel).
export const leadsToken = () => process.env.LEADS_READ_WRITE_TOKEN || process.env.LEADS_BLOB_READ_WRITE_TOKEN || '';
export const leadsReady = () => Boolean(leadsToken());
const opts = extra => ({ token: leadsToken(), ...extra });

const unsubSecret = () => process.env.UNSUB_SECRET || process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || '';
export const emailKey = email => crypto.createHash('sha256').update(String(email).trim().toLowerCase()).digest('hex').slice(0, 32);
export const unsubToken = email => crypto.createHmac('sha256', unsubSecret()).update(String(email).trim().toLowerCase()).digest('base64url').slice(0, 24);

async function listAll(prefix) {
  const out = [];
  let cursor;
  do {
    const page = await list(opts({ prefix, cursor, limit: 1000 }));
    out.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return out;
}

export async function saveLead(lead) {
  await put(`${LEADS}${lead.at.slice(0, 10)}.json`, JSON.stringify(lead), opts({ access: 'private', contentType: 'application/json', addRandomSuffix: true }));
}

export async function deleteLead(pathname) {
  await del(pathname, opts());
}

async function readJson(pathname) {
  const r = await get(pathname, opts({ access: 'private' }));
  if (!r || r.statusCode !== 200) return null;
  return JSON.parse(await new Response(r.stream).text());
}

/** Every sign-up, newest first, flagged when that email has unsubscribed. */
export async function loadLeads() {
  const [blobs, unsubs] = await Promise.all([listAll(LEADS), listAll(UNSUB)]);
  const gone = new Set(unsubs.map(b => b.pathname.slice(UNSUB.length).replace(/\.json$/, '')));
  const leads = await Promise.all(blobs.map(async b => {
    try { const l = await readJson(b.pathname); return l && { ...l, id: b.pathname }; } catch (e) { return null; }
  }));
  return leads.filter(Boolean)
    .map(l => ({ ...l, unsubscribed: Boolean(l.email) && gone.has(emailKey(l.email)) }))
    .sort((a, b) => (b.at > a.at ? 1 : -1));
}

export async function markUnsubscribed(email) {
  await put(`${UNSUB}${emailKey(email)}.json`, JSON.stringify({ at: new Date().toISOString() }),
    opts({ access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true }));
}
