// Shared helpers for sign-ups (leads), unsubscribes and the mailing that uses them.
import crypto from 'node:crypto';
import { list, put } from '@vercel/blob';

export const LEADS = 'leads/';
export const UNSUB = 'unsub/';

const unsubSecret = () => process.env.UNSUB_SECRET || process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || '';
export const emailKey = email => crypto.createHash('sha256').update(String(email).trim().toLowerCase()).digest('hex').slice(0, 32);
export const unsubToken = email => crypto.createHmac('sha256', unsubSecret()).update(String(email).trim().toLowerCase()).digest('base64url').slice(0, 24);

async function listAll(prefix) {
  const out = [];
  let cursor;
  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    out.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return out;
}

/** Every sign-up, newest first, flagged when that email has unsubscribed. */
export async function loadLeads() {
  const [blobs, unsubs] = await Promise.all([listAll(LEADS), listAll(UNSUB)]);
  const gone = new Set(unsubs.map(b => b.pathname.slice(UNSUB.length).replace(/\.json$/, '')));
  const leads = await Promise.all(blobs.map(async b => {
    try { return { ...(await (await fetch(b.url, { cache: 'no-store' })).json()), url: b.url }; } catch (e) { return null; }
  }));
  return leads.filter(Boolean)
    .map(l => ({ ...l, unsubscribed: Boolean(l.email) && gone.has(emailKey(l.email)) }))
    .sort((a, b) => (b.at > a.at ? 1 : -1));
}

export async function markUnsubscribed(email) {
  await put(`${UNSUB}${emailKey(email)}.json`, JSON.stringify({ at: new Date().toISOString() }), {
    access: 'public', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true,
  });
}
