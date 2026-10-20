// A small counter store for visits and clicks (Upstash Redis, connected from the Vercel project's Storage tab).
// Only counts are kept: no names, no IP addresses, no cookies. Without it, nothing is counted and the site works as usual.
const url = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const token = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
export const redisReady = () => Boolean(url() && token());

/** Several commands in one request: [["INCR","k"], ["HINCRBY","h","f",1], …] → their results. */
export async function redis(commands) {
  const r = await fetch(url().replace(/\/$/, '') + '/pipeline', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!r.ok) throw new Error('redis ' + r.status);
  return (await r.json()).map(x => x.result);
}

/** Today's date in Israel (the business day the visit belongs to). */
export const day = (d = new Date()) => new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' })).toISOString().slice(0, 10);
