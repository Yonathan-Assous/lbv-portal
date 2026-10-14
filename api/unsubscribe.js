import { storageReady } from './_lib.js';
import { unsubToken, markUnsubscribed } from './_leads.js';

// The "remove me" link at the bottom of every mailing. Signed per address, so nobody can
// unsubscribe someone else.
const page = (lang, ok) => {
  const t = {
    he: [ok ? 'הוסרתם מרשימת התפוצה' : 'הקישור לא תקין', ok ? 'לא נשלח לכם יותר עדכונים. תמיד אפשר להירשם שוב באתר.' : 'נסו שוב מהמייל, או כתבו לנו.'],
    fr: [ok ? 'Vous êtes désinscrit' : 'Lien invalide', ok ? 'Vous ne recevrez plus nos nouvelles. Vous pouvez vous réinscrire sur le site à tout moment.' : 'Réessayez depuis l’e-mail, ou écrivez-nous.'],
    en: [ok ? 'You have been unsubscribed' : 'This link is not valid', ok ? 'You will not receive any more updates. You can sign up again on the site at any time.' : 'Try again from the email, or write to us.'],
  }[lang] || [];
  const dir = lang === 'he' ? 'rtl' : 'ltr';
  return `<!doctype html><html lang="${lang}" dir="${dir}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>La Belle Vie</title>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0B1430;color:#fff;font-family:Assistant,Arial,sans-serif;text-align:center;padding:24px">
<div><img src="/media/logo-white.png" alt="La Belle Vie" width="120" style="margin-bottom:18px"><h1 style="font-family:'Frank Ruhl Libre',Georgia,serif;color:#E3B65C">${t[0]}</h1><p style="color:#C7D3E4">${t[1]}</p><p><a href="/" style="color:#E3B65C">lbv-event.com</a></p></div></body></html>`;
};

export default async function handler(req, res) {
  const q = new URL(req.url, 'http://x').searchParams;
  const email = (q.get('e') || '').trim().toLowerCase();
  const lang = ['he', 'fr', 'en'].includes(q.get('l')) ? q.get('l') : 'he';
  let ok = false;
  if (email && storageReady() && q.get('t') === unsubToken(email)) {
    await markUnsubscribed(email);
    ok = true;
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(ok ? 200 : 400).send(page(lang, ok));
}
