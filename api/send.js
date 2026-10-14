import { isAuthed, storageReady, readBody } from './_lib.js';
import { loadLeads, unsubToken, leadsReady } from './_leads.js';

// Mailing to the sign-ups, through the same email service the gala system already uses
// (Resend, verified domain lbv-event.com). Needs RESEND_API_KEY in this project's settings.
// Optional: EMAIL_FROM (default "La Belle Vie <noreply@lbv-event.com>"), EMAIL_REPLY_TO.
//
// body: { subject, message, buttonText?, buttonUrl?, interest?: 'pesach'|'sukkot'|'all'|'', test?: 'me@x.com' }
// Each person gets their own email (nobody sees the other addresses) with a personal "remove me" link.

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const FOOT = {
  he: ['קיבלתם את המייל כי נרשמתם לעדכונים באתר La Belle Vie.', 'להסרה מרשימת התפוצה'],
  fr: ['Vous recevez cet e-mail car vous vous êtes inscrit aux nouvelles de La Belle Vie.', 'Se désinscrire'],
  en: ['You are receiving this email because you signed up for updates from La Belle Vie.', 'Unsubscribe'],
};

function emailHtml({ origin, subject, message, buttonText, buttonUrl, lang, unsubUrl }) {
  const dir = lang === 'he' ? 'rtl' : 'ltr', align = dir === 'rtl' ? 'right' : 'left';
  const paras = String(message).split(/\n\s*\n/).map(p => `<p style="margin:0 0 16px;line-height:1.7">${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
  const button = buttonText && /^https?:\/\//.test(buttonUrl || '')
    ? `<p style="margin:24px 0"><a href="${esc(buttonUrl)}" style="display:inline-block;padding:13px 26px;border-radius:99px;background:#E3B65C;color:#0B1430;font-weight:700;text-decoration:none">${esc(buttonText)}</a></p>` : '';
  const [why, unsub] = FOOT[lang] || FOOT.he;
  return `<!doctype html><html lang="${lang}" dir="${dir}"><body style="margin:0;background:#EEF3F8;font-family:Arial,Helvetica,sans-serif;color:#16203A">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="background:#0B1430;padding:26px;text-align:center"><img src="${origin}/media/logo-white.png" alt="La Belle Vie" width="120" style="display:inline-block"></td></tr>
<tr><td dir="${dir}" style="padding:30px 30px 10px;text-align:${align};font-size:16px">
<h1 style="margin:0 0 18px;font-family:Georgia,serif;font-size:24px;color:#2C2F84">${esc(subject)}</h1>${paras}${button}</td></tr>
<tr><td dir="${dir}" style="padding:18px 30px 28px;text-align:${align};font-size:12px;color:#6B7690;border-top:1px solid #E3E9F1">${why}<br><a href="${unsubUrl}" style="color:#6B7690">${unsub}</a></td></tr>
</table></td></tr></table></body></html>`;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!isAuthed(req)) return res.status(401).json({ error: 'login' });
  if (!storageReady() || !leadsReady()) return res.status(503).json({ error: 'not-configured' });
  const key = process.env.RESEND_API_KEY;
  if (!key) return res.status(503).json({ error: 'email-not-configured' });

  let b;
  try { b = await readBody(req); } catch (e) { return res.status(400).json({ error: 'bad-json' }); }
  const subject = String(b.subject || '').trim().slice(0, 150);
  const message = String(b.message || '').trim().slice(0, 8000);
  if (!subject || !message) return res.status(400).json({ error: 'empty' });

  const origin = `https://${req.headers['x-forwarded-host'] || req.headers.host}`;
  const from = process.env.EMAIL_FROM || 'La Belle Vie <noreply@lbv-event.com>';
  const replyTo = process.env.EMAIL_REPLY_TO || 'LBV0585551826@gmail.com';

  let recipients;
  if (b.test) {
    recipients = [{ email: String(b.test).trim().toLowerCase(), lang: 'he' }];
  } else {
    const seen = new Set();
    recipients = (await loadLeads())
      .filter(l => l.email && l.consent && !l.unsubscribed && (!b.interest || l.interest === b.interest || l.interest === 'all'))
      .filter(l => !seen.has(l.email) && seen.add(l.email));
  }
  if (!recipients.length) return res.status(200).json({ ok: true, sent: 0 });

  const emails = recipients.map(r => {
    const lang = ['he', 'fr', 'en'].includes(r.lang) ? r.lang : 'he';
    const unsubUrl = `${origin}/api/unsubscribe?e=${encodeURIComponent(r.email)}&t=${unsubToken(r.email)}&l=${lang}`;
    return {
      from, to: [r.email], reply_to: replyTo, subject,
      html: emailHtml({ origin, subject, message, buttonText: b.buttonText, buttonUrl: b.buttonUrl, lang, unsubUrl }),
      headers: { 'List-Unsubscribe': `<${unsubUrl}>` },
    };
  });

  // Resend's batch endpoint takes up to 100 emails per call.
  let sent = 0;
  const failures = [];
  for (let i = 0; i < emails.length; i += 100) {
    const r = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(emails.slice(i, i + 100)),
    });
    if (r.ok) sent += Math.min(100, emails.length - i);
    else failures.push(`${r.status}: ${(await r.text()).slice(0, 200)}`);
  }
  return res.status(failures.length && !sent ? 502 : 200).json({ ok: !failures.length, sent, total: emails.length, failures });
}
