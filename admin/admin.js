// LBV admin: one place to run the site — requests and sign-ups, every text, holidays, team, videos,
// photos, contact details and statistics. Edits are kept in content.json (published with "שמירה ופרסום").
// Production: Vercel functions + Blob storage. Local preview: tools/serve.mjs stand-in.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const LANGS = ['he', 'fr', 'en'];
const LNAME = { he: 'עברית', fr: 'צרפתית', en: 'אנגלית' };
const DIR = { he: 'rtl', fr: 'ltr', en: 'ltr' };
const E = window.LBVEdit;

let state = null, saved = '', storage = 'none', lang = 'he', page = 'dashboard', scopeId = 'top', leads = [], leadsReady = false;
const docs = {};      // the site's own pages (he/fr/en), scanned: the originals of every text
let maps = {};

/* ---------- small UI helpers ---------- */
function toast(text, kind = 'ok') {
  const t = $('#toast');
  t.textContent = text; t.className = `toast toast--${kind}`; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 3800);
}
function changed() {
  const d = JSON.stringify(state) !== saved;
  $('#saveBar').hidden = !d;
  return d;
}
const touch = () => changed();
const date = iso => (iso || '').slice(0, 10).split('-').reverse().join('/');
const autosize = ta => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight + 2, 420) + 'px'; };

/** A labelled input or textarea bound to read/write. */
function field(label, value, onInput, opt = {}) {
  const wrap = document.createElement('label');
  wrap.className = 'field';
  const long = opt.multi || String(value || '').length > 70 || String(value || '').includes('\n');
  wrap.innerHTML = `<span>${label}${opt.tag || ''}</span>` + (long
    ? `<textarea rows="${opt.rows || 2}"></textarea>`
    : `<input type="${opt.type || 'text'}">`);
  const el = $('input,textarea', wrap);
  el.value = value ?? '';
  el.dir = opt.dir || DIR[lang];
  if (opt.placeholder) el.placeholder = opt.placeholder;
  el.addEventListener('input', () => { onInput(el.value); if (el.tagName === 'TEXTAREA') autosize(el); });
  if (el.tagName === 'TEXTAREA') requestAnimationFrame(() => autosize(el));
  return wrap;
}
function html(s) { const t = document.createElement('template'); t.innerHTML = s.trim(); return t.content.firstElementChild; }
function card(title, sub, actions = '') {
  return html(`<section class="card"><div class="card__head"><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div><div class="row-tools">${actions}</div></div></section>`);
}

/* ---------- uploads (photos and videos go straight to storage) ---------- */
async function uploadFile(file) {
  if (storage === 'local') {
    const r = await fetch(`/api/upload-local?name=${encodeURIComponent(file.name)}`, { method: 'POST', body: file });
    if (!r.ok) throw new Error('upload');
    return (await r.json()).url;
  }
  if (storage === 'blob') {
    const { upload } = await import('https://cdn.jsdelivr.net/npm/@vercel/blob@2.8.1/client/+esm');
    const blob = await upload(`uploads/${file.name}`, file, { access: 'public', handleUploadUrl: '/api/upload' });
    return blob.url;
  }
  throw new Error('no-storage');
}
const preview = p => !p ? '' : /^(https?:|data:|\/)/.test(p) ? p : '../' + p.replace(/^\.\.\//, '');

/** Photo/video slot with preview, upload/replace and remove. */
function slot(label, read, write, kind = 'image') {
  const el = document.createElement('div');
  el.className = 'slot';
  const draw = () => {
    const v = read();
    const isV = kind === 'video';
    el.innerHTML = `<div class="slot__preview">${v ? (isV ? `<video src="${esc(preview(v))}" muted playsinline preload="metadata"></video>` : `<img src="${esc(preview(v))}" alt="">`) : (isV ? 'אין סרטון' : 'אין תמונה')}</div>
      <div class="slot__btns"><span class="slot__label">${label}</span>
        <div class="row-tools"><label class="btn btn--line btn--sm">${v ? 'החלפה' : 'העלאה'}<input type="file" accept="${isV ? 'video/mp4,video/quicktime' : 'image/jpeg,image/png,image/webp'}" hidden></label>
        ${v ? '<button type="button" class="btn btn--sm btn--danger" data-clear>הסרה</button>' : ''}</div></div>`;
    $('input', el).addEventListener('change', async e => {
      const file = e.target.files[0];
      if (!file) return;
      el.classList.add('is-busy');
      toast(isV ? 'מעלה סרטון… זה יכול לקחת כמה דקות' : 'מעלה…', 'info');
      try { write(await uploadFile(file)); touch(); draw(); toast('הועלה. כדי שיופיע באתר לוחצים "שמירה ופרסום"'); }
      catch (err) { toast(err.message === 'no-storage' ? 'האחסון עוד לא מחובר, אי אפשר להעלות' : 'ההעלאה נכשלה. נסו שוב', 'err'); }
      finally { el.classList.remove('is-busy'); }
    });
    $('[data-clear]', el)?.addEventListener('click', () => { write(''); touch(); draw(); });
  };
  draw();
  return el;
}

/** Move / hide / delete buttons for an item in an array. */
function tools(arr, i, rerender, opt = {}) {
  const it = arr[i];
  const t = html(`<div class="row-tools">
    ${opt.hide !== false ? `<button type="button" class="btn btn--line btn--sm" data-hide>${it.hidden ? 'להציג באתר' : 'להסתיר'}</button>` : ''}
    <button type="button" class="icon" data-mv="-1" title="למעלה" ${i === 0 ? 'disabled' : ''}>↑</button>
    <button type="button" class="icon" data-mv="1" title="למטה" ${i === arr.length - 1 ? 'disabled' : ''}>↓</button>
    <button type="button" class="icon icon--del" data-del title="מחיקה">✕</button></div>`);
  $('[data-hide]', t)?.addEventListener('click', () => { if (it.hidden) delete it.hidden; else it.hidden = true; touch(); rerender(); });
  $$('[data-mv]', t).forEach(b => b.addEventListener('click', () => { const j = i + Number(b.dataset.mv); [arr[i], arr[j]] = [arr[j], arr[i]]; touch(); rerender(); }));
  $('[data-del]', t).addEventListener('click', () => { if (!confirm(opt.confirm || 'למחוק?')) return; arr.splice(i, 1); touch(); rerender(); });
  return t;
}

/* ---------- the site's own pages: originals of every text ---------- */
async function loadDocs() {
  const urls = { he: '../index.html', fr: '../fr/index.html', en: '../en/index.html' };
  await Promise.all(LANGS.map(async l => {
    const t = await (await fetch(urls[l], { cache: 'no-store' })).text();
    docs[l] = new DOMParser().parseFromString(t, 'text/html');
  }));
  maps = Object.fromEntries(LANGS.map(l => [l, E.scan(docs[l])]));
}
const scopeOf = (l, id) => maps[l].find(s => s.id === id);
const SCOPE_NAME = {
  header: 'תפריט עליון', top: 'פתיחה (ראש הדף)', services: 'השירותים (דף ראשי)', about: 'מי אנחנו (דף ראשי)', team: 'הצוות (דף ראשי)',
  'about-us': 'חלון "מי אנחנו"', holidays: 'חלון "נופשים"', sukkot: 'חלון סוכות', pesach: 'חלון פסח', events: 'הפקת אירועים',
  gala: 'מערכת הגאלה', wedding: 'אפליקציה לחתונה', why: 'למה דווקא La Belle Vie', faq: 'שאלות נפוצות', contact: 'בקשת הצעת מחיר', footer: 'תחתית הדף',
};
const KIND = el => ({ H1: 'כותרת ראשית', H2: 'כותרת', H3: 'כותרת משנה', H4: 'כותרת קטנה', LI: 'פריט', A: 'כפתור', SUMMARY: 'שאלה', FIGCAPTION: 'כיתוב לתמונה', CITE: 'מקור הציטוט' })[el.tag]
  || (/\blead\b/.test(el.cls) ? 'פסקת פתיחה' : /tagline/.test(el.cls) ? 'סלוגן' : /badge/.test(el.cls) ? 'תווית' : 'פסקה');

/* ---------- texts: values, changes, hiding ---------- */
const T = () => (state.texts ??= {});
function textVal(l, key) {
  const b = scopeOf(l, key.split(':')[0])?.blocks.find(x => x.key === key);
  const c = state.texts?.[key]?.[l];
  return c && c.val && b && E.same(c.orig, b.orig) ? c.val : b?.orig;
}
function setText(l, key, val) {
  const b = scopeOf(l, key.split(':')[0]).blocks.find(x => x.key === key);
  const t = (T()[key] ??= {});
  if (E.same(val, b.orig)) delete t[l]; else t[l] = { orig: b.orig, val };
  if (!Object.keys(t).length) delete T()[key];
  touch();
}
const isChanged = key => !!state.texts?.[key] && LANGS.some(l => state.texts[key][l]);
const titleOrig = (l, id) => docs[l].getElementById(id)?.dataset.title || '';
const titleVal = (l, id) => state.titles?.[id]?.[l] || titleOrig(l, id);
function setTitle(l, id, v) {
  const t = ((state.titles ??= {})[id] ??= {});
  if (!v || v === titleOrig(l, id)) delete t[l]; else t[l] = v;
  if (!Object.keys(t).length) delete state.titles[id];
  touch();
}

/* ---------- lists and questions (start from the site's own, then saved in content) ---------- */
function listDefault(key, faq) {
  const id = key.split(':')[0];
  const per = Object.fromEntries(LANGS.map(l => {
    const sc = scopeOf(l, id);
    return [l, faq ? sc.faqs.find(q => q.key === key) : sc.lists.find(x => x.key === key)];
  }));
  return per.he.items.map((it, i) => Object.fromEntries(LANGS.map(l => [l, clone(per[l]?.items[i] || {})])));
}
const listItems = (key, faq) => state.lists?.[key]?.items || listDefault(key, faq);
function listOwn(key, faq) {
  const L = (state.lists ??= {});
  if (!L[key]) L[key] = { items: listDefault(key, faq) };
  return L[key].items;
}

/* ---------- navigation ---------- */
const ICON = {
  dashboard: 'M3 13h8V3H3zm10 8h8V11h-8zM3 21h8v-6H3zm10-18v6h8V3z',
  inbox: 'M4 4h16v12H15l-3 3-3-3H4zM8 9h8M8 12h5',
  mail: 'M3 5h18v14H3zM3 7l9 6 9-6',
  texts: 'M4 5h16M4 10h16M4 15h10M4 20h7',
  faq: 'M12 18h.01M9.2 9a3 3 0 1 1 4.1 2.8c-.8.4-1.3 1-1.3 1.9V14M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
  why: 'M12 3l2.6 5.5 6 .8-4.4 4.2 1.1 6L12 16.7 6.7 19.5l1.1-6L3.4 9.3l6-.8z',
  trips: 'M3 20h18M5 20V9l7-5 7 5v11M10 20v-6h4v6',
  team: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M16 3.5a4 4 0 0 1 0 7.5M22 21v-1a6 6 0 0 0-4-5.6',
  videos: 'M4 5h12v14H4zM16 10l5-3v10l-5-3',
  gallery: 'M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6M16 9.5a1.5 1.5 0 1 1 0-.01',
  contact: 'M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z',
  stats: 'M4 20V10M10 20V4M16 20v-8M22 20H2',
};
const PAGES = [
  { group: 'ראשי' },
  { id: 'dashboard', title: 'לוח בקרה', sub: 'תמונת מצב: פניות, נרשמים וקיצורי דרך' },
  { group: 'פניות' },
  { id: 'inbox', title: 'פניות ונרשמים', sub: 'כל מי שהשאיר פרטים באתר: בקשות להצעת מחיר והרשמות לעדכונים', badge: true },
  { id: 'mail', title: 'שליחת מייל לנרשמים', sub: 'עדכון לכל מי שנרשם, מהמייל של החברה' },
  { group: 'תוכן האתר' },
  { id: 'texts', title: 'טקסטים בדפים', sub: 'כל כותרת, משפט וכפתור באתר. לשנות, להסתיר או להחזיר למקור', lang: true },
  { id: 'faq', title: 'שאלות נפוצות', sub: 'להוסיף, לשנות, להסתיר ולסדר שאלות', lang: true },
  { id: 'why', title: 'למה דווקא La Belle Vie', sub: 'מה מייחד אתכם ולמי החוויה מתאימה', lang: true },
  { id: 'trips', title: 'נופשים ודפי נופש', sub: 'כרטיסי הנופשים, ודף מלא לכל נופש (כמו פסח, או נופש חדש)', lang: true },
  { id: 'team', title: 'צוות ודבר המנכ״ל', sub: 'תמונות, שמות ותפקידים, והמכתב של אילן', lang: true },
  { id: 'videos', title: 'סרטונים', sub: 'הסרטונים בחלון סוכות: להוסיף, להסתיר ולסדר', lang: true },
  { id: 'gallery', title: 'תמונות וגלריה', sub: 'הגלריה "רגעים מהנופש" ותמונות הרקע של החלונות', lang: true },
  { id: 'contact', title: 'פרטי קשר וקישורים', sub: 'טלפונים, וואטסאפ, מייל ורשתות חברתיות, בכל האתר בבת אחת' },
  { group: 'נתונים' },
  { id: 'stats', title: 'סטטיסטיקה', sub: 'כמה פונים, כמה נרשמים, וכמה מבקרים באתר' },
];
function drawNav() {
  const open = leads.filter(l => !l.handled).length;
  $('#sideNav').innerHTML = PAGES.map(p => p.group ? `<div class="side__group">${p.group}</div>`
    : `<button type="button" class="side__item" data-page="${p.id}" ${p.id === page ? 'aria-current="page"' : ''}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${ICON[p.id]}"/></svg>${p.title}
        ${p.badge && open ? `<span class="side__badge">${open}</span>` : ''}</button>`).join('');
  $$('[data-page]', $('#sideNav')).forEach(b => b.addEventListener('click', () => go(b.dataset.page)));
}
function go(p, opts = {}) {
  page = p;
  if (opts.scope) scopeId = opts.scope;
  const info = PAGES.find(x => x.id === p);
  $('#pageTitle').textContent = info.title;
  $('#pageSub').textContent = info.sub;
  $('#langPick').hidden = !info.lang;
  $('#app').classList.remove('is-menu');
  history.replaceState(null, '', '#' + p);
  drawNav();
  render();
  scrollTo({ top: 0 });
}
function render() {
  const pg = $('#page');
  pg.innerHTML = '';
  ({ dashboard, inbox, mail, texts, faq, why, trips, team, videos, gallery, contact, stats })[page](pg);
}
$$('#langPick button').forEach(b => b.addEventListener('click', () => {
  lang = b.dataset.lang;
  $$('#langPick button').forEach(x => x.setAttribute('aria-selected', String(x === b)));
  render();
}));
$('#menuBtn').addEventListener('click', e => { e.stopPropagation(); $('#app').classList.toggle('is-menu'); });
// On a phone, a tap outside the menu closes it.
document.addEventListener('click', e => { if ($('#app').classList.contains('is-menu') && !e.target.closest('#side')) $('#app').classList.remove('is-menu'); });

/* ---------- 1. dashboard ---------- */
function dashboard(pg) {
  const open = leads.filter(l => !l.handled), q = leads.filter(l => l.type === 'quote'), s = leads.filter(l => l.type !== 'quote');
  const month = new Date().toISOString().slice(0, 7);
  const thisMonth = leads.filter(l => (l.at || '').startsWith(month)).length;
  pg.append(html(`<div class="stats">
    <button class="stat stat--gold" data-go="inbox"><b>${open.length}</b><span>פניות שעוד לא טופלו</span></button>
    <button class="stat" data-go="inbox"><b>${q.length}</b><span>בקשות להצעת מחיר</span></button>
    <button class="stat" data-go="inbox"><b>${s.length}</b><span>נרשמים לעדכונים</span></button>
    <button class="stat" data-go="stats"><b>${thisMonth}</b><span>פניות החודש</span></button></div>`));
  const two = html('<div class="dash2"></div>');
  const recent = card('הפניות האחרונות', leadsReady ? '' : 'טוען…', '<button class="btn btn--line btn--sm" data-go="inbox">לכל הפניות</button>');
  const box = html('<div class="leads"></div>');
  leads.slice(0, 5).forEach(l => box.append(leadRow(l, true)));
  if (leadsReady && !leads.length) box.innerHTML = '<p class="empty">עוד אין פניות. כשמישהו ישאיר פרטים באתר, הוא יופיע כאן.</p>';
  recent.append(box);
  const quick = card('קיצורי דרך', '');
  quick.append(html(`<div class="quick" style="grid-template-columns:1fr 1fr">
    <button data-go="texts"><b>לשנות טקסט באתר</b><span>כל כותרת ומשפט</span></button>
    <button data-go="trips"><b>להוסיף נופש</b><span>עם דף משלו</span></button>
    <button data-go="gallery"><b>להעלות תמונות</b><span>לגלריה ולחלונות</span></button>
    <button data-go="contact"><b>פרטי קשר</b><span>טלפון, וואטסאפ, קישורים</span></button>
    <button data-go="faq"><b>שאלות נפוצות</b><span>להוסיף ולשנות</span></button>
    <button data-go="mail"><b>מייל לנרשמים</b><span>עדכון לכולם</span></button></div>`));
  two.append(recent, quick);
  pg.append(two);
  $$('[data-go]', pg).forEach(b => b.addEventListener('click', () => go(b.dataset.go)));
}

/* ---------- 2. requests and sign-ups ---------- */
const INTEREST = { pesach: 'פסח', sukkot: 'סוכות', all: 'כל הנופשים והאירועים' };
const tripName = id => (state.trips || []).find(t => t.id === id)?.he?.name;
function waLink(phone) {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.startsWith('0')) d = '972' + d.slice(1);
  return d.length >= 9 ? `https://wa.me/${d}` : '';
}
function leadRow(l, compact) {
  const quote = l.type === 'quote';
  const wa = waLink(l.phone);
  const what = quote ? (l.service || 'בקשת הצעת מחיר') : (INTEREST[l.interest] || tripName(l.interest) || l.interest || '');
  const row = html(`<article class="lead ${l.handled ? 'is-done' : ''}">
    <div>
      <div class="lead__name">${esc(l.name)}
        <span class="tag ${quote ? 'tag--gold' : 'tag--blue'}">${quote ? 'בקשת הצעת מחיר' : 'נרשם לעדכונים'}</span>
        ${l.handled ? '<span class="tag tag--ok">טופל</span>' : '<span class="tag tag--err">חדש</span>'}
        ${l.unsubscribed ? '<span class="tag tag--muted">הוסר מהמיילים</span>' : ''}</div>
      <div class="lead__meta">
        <span>${esc(what)}</span>
        ${l.phone ? `<a href="tel:${esc(l.phone)}" dir="ltr">${esc(l.phone)}</a>` : ''}
        ${l.email ? `<a href="mailto:${esc(l.email)}" dir="ltr">${esc(l.email)}</a>` : ''}
        ${l.date ? `<span>תאריך: ${esc(l.date)}</span>` : ''}${l.guests ? `<span>${esc(l.guests)} אנשים</span>` : ''}
        <span>${LNAME[l.lang] || ''}</span><span>${date(l.at)}</span></div>
    </div>
    ${compact ? '' : `<div class="row-tools">
      ${wa ? `<a class="btn btn--line btn--sm" href="${wa}" target="_blank" rel="noopener">וואטסאפ</a>` : ''}
      <button type="button" class="btn btn--sm ${l.handled ? 'btn--line' : 'btn--dark'}" data-done>${l.handled ? 'להחזיר ל"חדש"' : 'סימון כטופל'}</button>
      <button type="button" class="icon icon--del" data-del title="מחיקה">✕</button></div>`}
    ${!compact && l.notes ? `<p class="lead__notes">${esc(l.notes)}</p>` : ''}
  </article>`);
  $('[data-done]', row)?.addEventListener('click', async () => {
    const r = await fetch(`/api/leads?id=${encodeURIComponent(l.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ handled: !l.handled }) });
    if (!r.ok) return toast('לא הצלחנו לעדכן', 'err');
    l.handled = !l.handled; drawNav(); render();
  });
  $('[data-del]', row)?.addEventListener('click', async () => {
    if (!confirm(`למחוק את ${l.name}? אי אפשר לשחזר.`)) return;
    const r = await fetch(`/api/leads?id=${encodeURIComponent(l.id)}`, { method: 'DELETE' });
    if (!r.ok) return toast('המחיקה נכשלה', 'err');
    leads = leads.filter(x => x !== l); drawNav(); render(); toast('נמחק');
  });
  return row;
}
let inboxTab = 'open', inboxQ = '';
function inbox(pg) {
  const sets = { open: ['לא טופלו', l => !l.handled], all: ['הכול', () => true], quote: ['בקשות להצעת מחיר', l => l.type === 'quote'], signup: ['נרשמים לעדכונים', l => l.type !== 'quote'] };
  const c = card('', '', `<button class="btn btn--line btn--sm" data-csv>ייצוא לאקסל</button><button class="btn btn--line btn--sm" data-mails>העתקת המיילים</button><button class="btn btn--line btn--sm" data-reload>רענון</button>`);
  c.querySelector('.card__head > div').replaceWith(html(`<div class="tabs" role="tablist">${Object.entries(sets).map(([k, [n, f]]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${k === inboxTab}">${n}<em>${leads.filter(f).length}</em></button>`).join('')}</div>`));
  const search = html(`<div class="toolbar" style="margin-bottom:14px"><input type="search" placeholder="חיפוש לפי שם, טלפון או מייל" value="${esc(inboxQ)}"></div>`);
  const list = html('<div class="leads"></div>');
  const shown = () => leads.filter(sets[inboxTab][1]).filter(l => !inboxQ || [l.name, l.phone, l.email, l.notes].join(' ').toLowerCase().includes(inboxQ.toLowerCase()));
  const draw = () => {
    list.innerHTML = '';
    const arr = shown();
    if (!leadsReady) list.innerHTML = '<p class="empty">טוען…</p>';
    else if (!arr.length) list.innerHTML = `<p class="empty">${inboxTab === 'open' ? 'אין פניות שמחכות לטיפול. כל הכבוד!' : 'אין כאן פניות.'}</p>`;
    arr.forEach(l => list.append(leadRow(l)));
  };
  $('input', search).addEventListener('input', e => { inboxQ = e.target.value; draw(); });
  $$('[data-tab]', c).forEach(b => b.addEventListener('click', () => { inboxTab = b.dataset.tab; render(); }));
  $('[data-reload]', c).addEventListener('click', () => loadLeads().then(render));
  $('[data-mails]', c).addEventListener('click', async () => {
    const m = [...new Set(shown().map(l => l.email).filter(Boolean))].join(', ');
    if (!m) return toast('אין מיילים ברשימה הזאת', 'err');
    try { await navigator.clipboard.writeText(m); toast('המיילים הועתקו'); } catch (e) { prompt('העתיקו:', m); }
  });
  $('[data-csv]', c).addEventListener('click', () => {
    const rows = [['סוג', 'שם', 'טלפון', 'מייל', 'מה ביקש', 'תאריך האירוע', 'אנשים', 'הערות', 'שפה', 'נשלח ב', 'טופל']]
      .concat(shown().map(l => [l.type === 'quote' ? 'הצעת מחיר' : 'עדכונים', l.name, l.phone, l.email, l.service || INTEREST[l.interest] || l.interest, l.date, l.guests, l.notes, LNAME[l.lang] || l.lang, date(l.at), l.handled ? 'כן' : 'לא']));
    const csv = '﻿' + rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `פניות-LBV-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  });
  c.append(search, list);
  pg.append(c);
  draw();
}
async function loadLeads() {
  try {
    const r = await fetch('/api/leads', { cache: 'no-store' });
    if (r.ok) leads = await r.json();
  } catch (e) {}
  leadsReady = true;
  drawNav();
}

/* ---------- 3. mailing ---------- */
function mail(pg) {
  const c = card('מייל לנרשמים', 'נשלח מהכתובת של החברה, לכל נרשם בנפרד, עם קישור להסרה. התשובות מגיעות למייל של LBV.');
  c.append(html(`<div>
    <div class="grid2">
      <label class="field"><span>למי לשלוח</span><select id="mailTo"><option value="">כל הנרשמים עם מייל</option>${Object.entries(INTEREST).filter(([k]) => k !== 'all').map(([k, v]) => `<option value="${k}">מי שנרשם ל${v}</option>`).join('')}</select></label>
      <label class="field"><span>נושא המייל</span><input id="mailSubject" placeholder="למשל: ההרשמה לפסח נפתחה!"></label>
    </div>
    <label class="field"><span>תוכן המייל</span><textarea id="mailBody" rows="8" placeholder="שורה ריקה בין פסקאות"></textarea></label>
    <div class="grid2">
      <label class="field"><span>טקסט לכפתור (רשות)</span><input id="mailBtn" placeholder="להרשמה"></label>
      <label class="field"><span>קישור לכפתור (רשות)</span><input id="mailUrl" dir="ltr" placeholder="https://"></label>
    </div>
    <div class="toolbar">
      <label class="field" style="flex:1;margin:0"><span>שליחת בדיקה למייל שלכם</span><input id="mailTest" type="email" dir="ltr" placeholder="you@example.com"></label>
      <div class="row-tools" style="align-self:end"><button class="btn btn--line" type="button" id="mailTestBtn">שליחת בדיקה</button><button class="btn btn--gold" type="button" id="mailSendBtn">שליחה לכל הנרשמים</button></div>
    </div>
    <p class="compose__status" id="mailStatus" role="status" hidden></p></div>`));
  pg.append(c);
  const status = (t, k) => { const s = $('#mailStatus'); s.textContent = t; s.hidden = false; s.className = `compose__status compose__status--${k}`; };
  async function send(test) {
    const p = { subject: $('#mailSubject').value.trim(), message: $('#mailBody').value.trim(), buttonText: $('#mailBtn').value.trim(), buttonUrl: $('#mailUrl').value.trim(), interest: $('#mailTo').value };
    if (!p.subject || !p.message) return status('צריך לכתוב נושא ותוכן.', 'err');
    if (test) { p.test = $('#mailTest').value.trim(); if (!/\S+@\S+\.\S+/.test(p.test)) return status('כתבו מייל תקין לבדיקה.', 'err'); }
    else {
      const n = new Set(leads.filter(l => l.email && l.consent && !l.unsubscribed && (!p.interest || l.interest === p.interest || l.interest === 'all')).map(l => l.email)).size;
      if (!n) return status('אין נרשמים עם מייל ברשימה הזאת.', 'err');
      if (!confirm(`לשלוח ל-${n} נרשמים? אי אפשר לבטל אחרי השליחה.`)) return;
    }
    status('שולח…', 'info');
    try {
      const r = await fetch('/api/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
      const j = await r.json().catch(() => ({}));
      if (r.status === 503 && j.error === 'email-not-configured') return status('שירות המיילים עוד לא מחובר (צריך את המפתח של מערכת הגאלה). עד אז אפשר "העתקת המיילים" בדף הפניות.', 'err');
      if (!r.ok) return status('השליחה נכשלה. נסו שוב.', 'err');
      status(test ? 'מייל הבדיקה נשלח.' : `נשלח ל-${j.sent} נרשמים.`, 'ok');
    } catch (e) { status('השליחה נכשלה. בדקו את האינטרנט.', 'err'); }
  }
  $('#mailTestBtn').addEventListener('click', () => send(true));
  $('#mailSendBtn').addEventListener('click', () => send(false));
}

/* ---------- 4. texts (every window), questions, "why" ---------- */
let textQ = '';
function texts(pg) {
  const wrap = html('<div class="split"></div>');
  const side = html('<nav class="card scopes" aria-label="חלונות"></nav>');
  const scopes = maps.he.filter(s => s.blocks.length || s.lists.length);
  if (!scopes.some(s => s.id === scopeId)) scopeId = scopes[0].id;
  scopes.forEach(s => {
    const n = s.blocks.filter(b => isChanged(b.key)).length + s.lists.filter(l => state.lists?.[l.key]).length;
    const b = html(`<button type="button" ${s.id === scopeId && !textQ ? 'aria-current="true"' : ''}>${esc(SCOPE_NAME[s.id] || s.title)}${n ? `<span class="tag tag--gold">${n}</span>` : ''}</button>`);
    b.addEventListener('click', () => { scopeId = s.id; textQ = ''; render(); });
    side.append(b);
  });
  const main = html('<div></div>');
  const search = card('חיפוש', 'כתבו מילה מהאתר כדי למצוא איפה היא מופיעה');
  const inp = html(`<input type="search" placeholder="למשל: כשרות, סוכה, הופכים חלום…" value="${esc(textQ)}">`);
  const results = html('<div class="search-results" style="margin-top:10px"></div>');
  search.append(inp, results);
  const doSearch = () => {
    results.innerHTML = '';
    if (textQ.trim().length < 2) return;
    const q = textQ.trim().toLowerCase();
    maps[lang].forEach(s => s.blocks.forEach(b => {
      const v = textVal(lang, b.key);
      const str = [v?.lead, v?.text].join(' ');
      if (!str.toLowerCase().includes(q)) return;
      const r = html(`<button type="button"><span>${esc(str.slice(0, 120))}</span><small>${esc(SCOPE_NAME[s.id] || s.id)} · ${KIND(b)}</small></button>`);
      r.addEventListener('click', () => { scopeId = s.id; textQ = ''; render(); setTimeout(() => $(`[data-key="${CSS.escape(b.key)}"]`)?.scrollIntoView({ block: 'center' }), 50); });
      results.append(r);
    }));
    if (!results.children.length) results.innerHTML = '<p class="hint">לא נמצא.</p>';
  };
  inp.addEventListener('input', () => { textQ = inp.value; doSearch(); });
  main.append(search);
  if (!textQ) main.append(scopeEditor(scopeId));
  wrap.append(side, main);
  pg.append(wrap);
  doSearch();
}
function scopeEditor(id, opt = {}) {
  const sc = scopeOf(lang, id), scHe = scopeOf('he', id);
  const c = card(opt.title || SCOPE_NAME[id] || id, opt.sub || `עורכים כעת ב${LNAME[lang]}. שדה ששונה מסומן בזהב.`, `<a class="btn btn--line btn--sm" href="../${lang === 'he' ? '' : lang + '/'}#${id === 'top' || id === 'header' || id === 'footer' ? '' : id}" target="_blank" rel="noopener">לראות באתר ↗</a>`);
  // Window title (for windows that open full screen)
  if (docs.he.getElementById(id)?.classList.contains('sheet') && !opt.noTitle) {
    const blk = html(`<div class="block ${state.titles?.[id]?.[lang] ? 'is-changed' : ''}"><div class="block__head"><span class="block__kind">שם החלון (בפס העליון ובכותרת הגדולה)</span></div></div>`);
    blk.append(field('', titleVal(lang, id), v => { setTitle(lang, id, v.trim()); blk.classList.toggle('is-changed', !!state.titles?.[id]?.[lang]); }));
    c.append(blk);
  }
  if (!opt.listsOnly) sc.blocks.forEach(b => c.append(textBlock(b)));
  sc.lists.forEach((l, i) => c.append(listEditor(l.key, !!l.lead, opt.listTitles?.[i] || `רשימה ${sc.lists.length > 1 ? i + 1 : ''}`)));
  scHe.faqs.forEach(q => c.append(faqEditor(q.key)));
  return c;
}
function textBlock(b) {
  const key = b.key;
  const v = textVal(lang, key) || {};
  const hidden = !!state.texts?.[key]?.hidden;
  const blk = html(`<div class="block ${isChanged(key) && state.texts[key][lang] ? 'is-changed' : ''} ${hidden ? 'is-hidden' : ''}" data-key="${esc(key)}">
    <div class="block__head"><span class="block__kind">${KIND(b)} ${state.texts?.[key]?.[lang] ? '<span class="tag tag--gold">שונה</span>' : ''} ${hidden ? '<span class="tag tag--muted">מוסתר באתר</span>' : ''}</span>
    <div class="row-tools">
      ${state.texts?.[key]?.[lang] ? '<button type="button" class="btn btn--line btn--sm" data-reset>להחזיר למקור</button>' : ''}
      <button type="button" class="btn btn--line btn--sm" data-hide>${hidden ? 'להציג באתר' : 'להסתיר מהאתר'}</button></div></div></div>`);
  const upd = val => { setText(lang, key, val); const ch = !!state.texts?.[key]?.[lang]; blk.classList.toggle('is-changed', ch); };
  if (b.sh === 'lead') {
    const cur = { lead: v.lead || '', text: v.text || '' };
    blk.append(field('מודגש', cur.lead, x => { cur.lead = x; upd({ ...cur }); }), field('המשך', cur.text, x => { cur.text = x; upd({ ...cur }); }, { multi: cur.text.length > 50 }));
  } else if (b.sh === 'lines') {
    blk.append(field('כל שורה בשורה נפרדת', v.text || '', x => upd({ text: x }), { multi: true, rows: 3 }));
  } else {
    blk.append(field('', v.text || '', x => upd({ text: x }), { multi: (v.text || '').length > 60 || /^(P|LI)$/.test(b.tag) && (v.text || '').length > 40 }));
  }
  $('[data-reset]', blk)?.addEventListener('click', () => { delete state.texts[key][lang]; if (!Object.keys(state.texts[key]).length) delete state.texts[key]; touch(); render(); });
  $('[data-hide]', blk).addEventListener('click', () => { const t = (T()[key] ??= {}); if (t.hidden) delete t.hidden; else t.hidden = true; if (!Object.keys(t).length) delete T()[key]; touch(); render(); });
  return blk;
}
function listEditor(key, hasLead, title) {
  const own = !!state.lists?.[key];
  const box = html(`<div><div class="subhead"><h3>${esc(title)} ${own ? '<span class="tag tag--gold">שונה</span>' : ''}</h3>
    <div class="row-tools">${own ? '<button type="button" class="btn btn--line btn--sm" data-reset>להחזיר למקור</button>' : ''}<button type="button" class="btn btn--dark btn--sm" data-add>+ הוספת פריט</button></div></div><div class="items"></div></div>`);
  const items = listItems(key);
  const list = $('.items', box);
  items.forEach((it, i) => {
    const v = it[lang] || {};
    const row = html(`<div class="item ${it.hidden ? 'is-hidden' : ''}"><div class="item__fields"></div></div>`);
    const edit = (k, x) => { const arr = listOwn(key); (arr[i][lang] ??= {})[k] = x; touch(); };
    const f = $('.item__fields', row);
    if (hasLead) f.append(field('מודגש', v.lead || '', x => edit('lead', x), { placeholder: lang !== 'he' ? (it.he?.lead || '') : '' }));
    f.append(field(hasLead ? 'המשך' : 'הטקסט', v.text || '', x => edit('text', x), { multi: (v.text || '').length > 50, placeholder: lang !== 'he' ? (it.he?.text || '') : '' }));
    row.append(tools(items, i, () => { ((state.lists ??= {})[key] ??= { items }); touch(); render(); }));
    list.append(row);
  });
  $('[data-add]', box).addEventListener('click', () => { listOwn(key).push({ he: { lead: '', text: '' } }); touch(); render(); });
  $('[data-reset]', box)?.addEventListener('click', () => { if (confirm('להחזיר את הרשימה למה שהיה במקור?')) { delete state.lists[key]; touch(); render(); } });
  return box;
}
function faqEditor(key) {
  const own = !!state.lists?.[key];
  const box = html(`<div><div class="subhead"><h3>השאלות והתשובות ${own ? '<span class="tag tag--gold">שונה</span>' : ''}</h3>
    <div class="row-tools">${own ? '<button type="button" class="btn btn--line btn--sm" data-reset>להחזיר למקור</button>' : ''}<button type="button" class="btn btn--dark btn--sm" data-add>+ שאלה חדשה</button></div></div><div class="items"></div></div>`);
  const items = listItems(key, true);
  const list = $('.items', box);
  items.forEach((it, i) => {
    const v = it[lang] || {};
    const row = html(`<div class="item ${it.hidden ? 'is-hidden' : ''}"><div class="item__fields"></div></div>`);
    const edit = (k, x) => { const arr = listOwn(key, true); (arr[i][lang] ??= {})[k] = x; touch(); };
    $('.item__fields', row).append(
      field('שאלה', v.q || '', x => edit('q', x), { placeholder: lang !== 'he' ? (it.he?.q || '') : '' }),
      field('תשובה', v.a || '', x => edit('a', x), { multi: true, rows: 3, placeholder: lang !== 'he' ? (it.he?.a || '') : '' }));
    row.append(tools(items, i, () => { ((state.lists ??= {})[key] ??= { items }); touch(); render(); }));
    list.append(row);
  });
  $('[data-add]', box).addEventListener('click', () => { listOwn(key, true).push({ he: { q: '', a: '' } }); touch(); render(); });
  $('[data-reset]', box)?.addEventListener('click', () => { if (confirm('להחזיר את השאלות למה שהיה במקור?')) { delete state.lists[key]; touch(); render(); } });
  return box;
}
function faq(pg) {
  pg.append(html(`<p class="hint hint--box">כאן מוסיפים, משנים, מסתירים ומסדרים את השאלות שבחלון "שאלות נפוצות". שאלה שלא תורגמה לצרפתית או לאנגלית תופיע שם בעברית.</p>`));
  pg.append(scopeEditor('faq', { title: 'שאלות נפוצות' }));
}
function why(pg) {
  pg.append(scopeEditor('why', { title: 'למה דווקא La Belle Vie', listTitles: ['מה מייחד אותנו', 'למי החוויה שלנו מתאימה'] }));
}

/* ---------- 5. holidays: cards + a full page for each ---------- */
const STATIC_WIN = id => !!docs.he.getElementById(id)?.classList.contains('sheet');
function trips(pg) {
  pg.append(html(`<p class="hint hint--box">כל נופש מופיע ככרטיס בחלון "נופשים". אפשר לתת לכל נופש <b>דף משלו באתר</b>: כותרת, הסבר, נקודות חשובות, תמונה או סרטון, וכפתורי הזמנה והרשמה. ככה פותחים נופש חדש בכמה דקות.</p>`));
  const c = card('הנופשים', '', '<button class="btn btn--gold" data-add>+ נופש חדש</button>');
  const list = html('<div class="cards"></div>');
  state.trips.forEach((t, i) => list.append(tripCard(t, i)));
  $('[data-add]', c).addEventListener('click', () => {
    const id = 'trip-' + Date.now().toString(36);
    state.trips.push({ id, status: 'soon', image: '', link: '#' + id, bookingUrl: { he: '', fr: '', en: '' },
      he: { name: 'נופש חדש', place: '', subline: '' }, fr: { name: '', place: '', subline: '' }, en: { name: '', place: '', subline: '' },
      page: { on: true, he: { title: '', lead: '', points: [] } } });
    touch(); render();
    setTimeout(() => $('.cards .ecard:last-child')?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 60);
  });
  c.append(list);
  pg.append(c);
}
function tripCard(t, i) {
  const ST = { open: ['ההרשמה פתוחה', 'tag--ok'], soon: ['בקרוב', 'tag--gold'], hidden: ['מוסתר', 'tag--muted'] };
  const tr = t[lang] || {}, W = () => (t[lang] ??= {});
  const el = html(`<article class="ecard ${t.status === 'hidden' ? 'is-hidden' : ''}"><div class="ecard__bar"><span class="ecard__title">${esc(t.he?.name || 'נופש')} <span class="tag ${ST[t.status]?.[1] || ''}">${ST[t.status]?.[0] || ''}</span></span></div><div class="ecard__body"></div></article>`);
  const bar = $('.ecard__bar', el);
  const tl = tools(state.trips, i, render, { hide: false, confirm: `למחוק את הנופש "${t.he?.name || ''}"?` });
  bar.append(tl);
  const body = $('.ecard__body', el);
  const st = html(`<label class="field"><span>מצב</span><select><option value="open">ההרשמה פתוחה</option><option value="soon">בקרוב</option><option value="hidden">מוסתר מהאתר</option></select></label>`);
  $('select', st).value = t.status || 'soon';
  $('select', st).addEventListener('change', e => { t.status = e.target.value; touch(); render(); });
  const g = html('<div class="grid2"></div>');
  g.append(field(`שם הנופש (${LNAME[lang]})`, tr.name || '', v => { W().name = v; touch(); }, { placeholder: lang !== 'he' ? t.he?.name : '' }),
    field(`מקום / שורה קטנה בכרטיס`, tr.place || '', v => { W().place = v; touch(); }, { placeholder: lang !== 'he' ? t.he?.place : '' }),
    field(`שורה בכרטיס בדף הראשי`, tr.subline || '', v => { W().subline = v; touch(); }, { placeholder: 'למשל: במלון נוף כנרת' }),
    field(`קישור להזמנה (${LNAME[lang]})`, t.bookingUrl?.[lang] || '', v => { (t.bookingUrl ??= {})[lang] = v.trim(); touch(); }, { dir: 'ltr', placeholder: 'https://' }));
  body.append(st, g, slot('תמונה לכרטיס', () => t.image, v => { t.image = v; }));
  // The holiday's own page
  const det = html(`<details ${t.page?.on ? 'open' : ''}><summary>דף הנופש באתר</summary><div></div></details>`);
  const inner = $('div', det);
  if (t.id === 'sukkot') {
    inner.append(html(`<p class="hint">לסוכות יש כבר חלון מלא באתר. את הטקסטים שלו עורכים ב"טקסטים בדפים" ← "חלון סוכות", את הסרטונים ב"סרטונים" ואת התמונות ב"תמונות וגלריה".</p>`));
    const b = html('<button type="button" class="btn btn--line btn--sm">לעריכת חלון סוכות</button>');
    b.addEventListener('click', () => go('texts', { scope: 'sukkot' }));
    inner.append(b);
  } else {
    const pg0 = t.page || { on: false };
    const sw = html(`<label class="switch"><input type="checkbox" ${pg0.on ? 'checked' : ''}> לנופש יש דף משלו באתר</label>`);
    $('input', sw).addEventListener('change', e => { (t.page ??= {}).on = e.target.checked; t.link = t.page.on || STATIC_WIN(t.id) ? '#' + t.id : ''; touch(); render(); });
    inner.append(sw);
    if (STATIC_WIN(t.id)) inner.append(html(`<p class="hint" style="margin-top:10px">${pg0.on ? 'הדף שבונים כאן מחליף את החלון הקיים של ' + esc(t.he?.name) + '.' : 'כרגע מוצג החלון הקיים של ' + esc(t.he?.name) + ' (אפשר לערוך אותו ב"טקסטים בדפים"). כשמפעילים, הדף שתבנו כאן יחליף אותו.'}</p>`));
    if (pg0.on) {
      const p = t.page[lang] || {}, P = () => (t.page[lang] ??= {});
      const ph = t.page.he || {};
      inner.append(html('<div style="height:12px"></div>'),
        field(`כותרת הדף (${LNAME[lang]})`, p.title || '', v => { P().title = v; touch(); }, { placeholder: lang !== 'he' ? ph.title : 'למשל: פסח במלון נוף כנרת' }),
        field('פסקת פתיחה', p.lead || '', v => { P().lead = v; touch(); }, { multi: true, placeholder: lang !== 'he' ? ph.lead : 'כמה משפטים שמזמינים להגיע' }));
      // Highlights
      const pts = p.points || [];
      const ptsBox = html(`<div><div class="subhead"><h3>נקודות חשובות</h3><button type="button" class="btn btn--dark btn--sm">+ נקודה</button></div><div class="items"></div></div>`);
      const drawPts = () => {
        const L = $('.items', ptsBox); L.innerHTML = '';
        if (!pts.length) L.innerHTML = '<p class="hint">למשל: "פנסיון מלא" – "ארוחות עשירות בכשרות מהדרין".</p>';
        pts.forEach((x, k) => {
          const row = html('<div class="item"><div class="item__fields"></div></div>');
          $('.item__fields', row).append(field('מודגש', x.lead || '', v => { x.lead = v; touch(); }), field('המשך', x.text || '', v => { x.text = v; touch(); }));
          row.append(tools(pts, k, drawPts, { hide: false }));
          L.append(row);
        });
      };
      $('button', ptsBox).addEventListener('click', () => { P().points = pts; pts.push({ lead: '', text: '' }); touch(); drawPts(); });
      drawPts();
      inner.append(ptsBox, field('הערה בסוף (רשות)', p.note || '', v => { P().note = v; touch(); }, { multi: true }));
      const media = html('<div class="grid3" style="margin-top:12px"></div>');
      media.append(slot('תמונה בדף', () => t.page.image, v => { t.page.image = v; }), slot('סרטון בדף (רשות)', () => t.page.video, v => { t.page.video = v; }, 'video'), slot('תמונת רקע לכותרת', () => t.page.banner, v => { t.page.banner = v; }));
      inner.append(media, html(`<p class="hint">בדף יופיע כפתור "לעדכון ראשון" שרושם לעדכונים${t.status === 'open' ? ', וכפתור "להזמנה" לקישור ההזמנה' : '. כשהמצב יהיה "ההרשמה פתוחה", יופיע גם כפתור "להזמנה"'}.</p>`));
    }
  }
  body.append(det);
  return el;
}

/* ---------- 6. team and the CEO letter ---------- */
function team(pg) {
  const ceo = state.ceo, c = ceo[lang] || {}, C = () => (ceo[lang] ??= {});
  const k = card('דבר המנכ״ל', `המכתב של אילן בדף הראשי (${LNAME[lang]})`);
  k.append(slot('תמונה', () => ceo.photo, v => { ceo.photo = v; }));
  k.append(field('כותרת', c.title || '', v => { C().title = v; touch(); }),
    field('המכתב (שורה ריקה בין פסקאות)', (c.paragraphs || []).join('\n\n'), v => { C().paragraphs = v.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean); touch(); }, { multi: true, rows: 8 }));
  const g = html('<div class="grid2"></div>');
  g.append(field('חתימה (שם)', c.name || '', v => { C().name = v; touch(); }), field('תפקיד', c.role || '', v => { C().role = v; touch(); }));
  k.append(g);
  const t = card('הצוות', 'מופיע בדף הראשי ובחלון "מי אנחנו"', '<button class="btn btn--gold" data-add>+ איש צוות</button>');
  const list = html('<div class="cards"></div>');
  state.team.forEach((m, i) => {
    const tr = m[lang] || {}, W = () => (m[lang] ??= {});
    const el = html(`<article class="ecard"><div class="ecard__bar"><span class="ecard__title">${esc(m.he?.name || 'איש צוות')}</span></div><div class="ecard__body"></div></article>`);
    $('.ecard__bar', el).append(tools(state.team, i, render, { hide: false, confirm: `למחוק את ${m.he?.name || ''}?` }));
    const g2 = html('<div class="grid2"></div>');
    g2.append(field('שם', tr.name || '', v => { W().name = v; touch(); }, { placeholder: lang !== 'he' ? m.he?.name : '' }), field('תפקיד', tr.role || '', v => { W().role = v; touch(); }, { placeholder: lang !== 'he' ? m.he?.role : '' }));
    $('.ecard__body', el).append(slot('תמונה', () => m.photo, v => { m.photo = v; }), g2);
    list.append(el);
  });
  $('[data-add]', t).addEventListener('click', () => { state.team.push({ photo: '', he: { name: '', role: '' }, fr: {}, en: {} }); touch(); render(); });
  t.append(list);
  pg.append(k, t);
}

/* ---------- 7. videos ---------- */
function videos(pg) {
  const c = card('הסרטונים בחלון סוכות', 'בסדר שבו הם מופיעים באתר. סרטון בלי גרסה באנגלית יוצג באנגלית בגרסה הצרפתית.', '<button class="btn btn--gold" data-add>+ סרטון</button>');
  const list = html('<div class="cards"></div>');
  state.videos.forEach((v, i) => {
    const tr = v[lang] || {}, W = () => (v[lang] ??= {});
    const el = html(`<article class="ecard ${v.hidden ? 'is-hidden' : ''}"><div class="ecard__bar"><span class="ecard__title">${esc(v.he?.title || 'סרטון')} ${v.hidden ? '<span class="tag tag--muted">מוסתר</span>' : ''}</span></div><div class="ecard__body"></div></article>`);
    $('.ecard__bar', el).append(tools(state.videos, i, render, { confirm: `למחוק את "${v.he?.title || ''}"?` }));
    const g = html('<div class="grid2"></div>');
    g.append(slot(`הסרטון (${LNAME[lang]})`, () => tr.file, x => { W().file = x; }, 'video'), slot('תמונת פתיחה', () => tr.poster, x => { W().poster = x; }));
    $('.ecard__body', el).append(field(`שם הסרטון (${LNAME[lang]})`, tr.title || '', x => { W().title = x; touch(); }, { placeholder: lang !== 'he' ? v.he?.title : '' }), g);
    list.append(el);
  });
  $('[data-add]', c).addEventListener('click', () => { state.videos.push({ he: { title: 'סרטון חדש', file: '', poster: '' }, fr: {}, en: {} }); touch(); render(); });
  c.append(list);
  pg.append(c);
}

/* ---------- 8. gallery + window banners ---------- */
function galleryDefault() {
  const caps = l => [...docs[l].querySelectorAll('.gallery__item')].map(b => b.querySelector('span')?.textContent || '');
  const he = [...docs.he.querySelectorAll('.gallery__item')];
  const fr = caps('fr'), en = caps('en');
  return he.map((b, i) => ({ img: (b.dataset.full || '').replace(/^(\.\.\/)?/, ''), he: { cap: b.querySelector('span')?.textContent || '' }, fr: { cap: fr[i] || '' }, en: { cap: en[i] || '' } }));
}
function gallery(pg) {
  const own = () => (state.gallery ??= galleryDefault());
  const items = state.gallery || galleryDefault();
  const c = card('גלריה "רגעים מהנופש"', `בחלון סוכות. כיתובים ב${LNAME[lang]}.`, '<label class="btn btn--gold">+ הוספת תמונות<input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden></label>');
  const grid = html('<div class="gal"></div>');
  items.forEach((p, i) => {
    const el = html(`<div class="gal__item ${p.hidden ? 'is-hidden' : ''}"><div class="gal__img"><img src="${esc(preview(p.img))}" alt=""></div></div>`);
    el.append(field('כיתוב', p[lang]?.cap || '', v => { const arr = own(); (arr[i][lang] ??= {}).cap = v; touch(); }, { placeholder: lang !== 'he' ? p.he?.cap : '' }));
    const t = tools(items, i, () => { state.gallery ??= items; touch(); render(); }, { confirm: 'למחוק את התמונה מהגלריה?' });
    el.append(t);
    grid.append(el);
  });
  $('input', c).addEventListener('change', async e => {
    const files = [...e.target.files];
    if (!files.length) return;
    toast(`מעלה ${files.length} תמונות…`, 'info');
    try {
      for (const f of files) own().push({ img: await uploadFile(f), he: { cap: '' } });
      touch(); render(); toast('התמונות נוספו. לא לשכוח "שמירה ופרסום"');
    } catch (err) { toast(err.message === 'no-storage' ? 'האחסון עוד לא מחובר' : 'ההעלאה נכשלה', 'err'); }
  });
  c.append(grid);
  const h = card('תמונות רקע של החלונות', 'התמונה הגדולה שמופיעה מאחורי הכותרת בכל חלון');
  const hg = html('<div class="grid2"></div>');
  [...docs.he.querySelectorAll('main > section.sheet[data-hero]')].forEach(s => {
    const def = s.dataset.hero;
    hg.append(slot(SCOPE_NAME[s.id] || s.dataset.title, () => state.heroes?.[s.id] || 'media/' + def, v => {
      (state.heroes ??= {});
      if (!v || v === 'media/' + def) delete state.heroes[s.id]; else state.heroes[s.id] = v;
    }, /\.mp4$/.test(def) ? 'video' : 'image'));
  });
  h.append(hg);
  pg.append(c, h);
}

/* ---------- 9. contact details ---------- */
const CONTACT0 = {
  whatsapp: '058-518-2655', phone: '058-518-2655', phone2: '058-555-1826', email: 'LBV0585551826@gmail.com',
  instagram: 'https://www.instagram.com/la_belle_vie_lbv/', tiktok: 'https://www.tiktok.com/@la.belle.vie.event', facebook: 'https://www.facebook.com/share/1JXfFgiY9Y/', youtube: 'https://youtube.com/@lbv-la_belle_vie',
};
function contact(pg) {
  const ct = state.contact || {};
  const c = card('פרטי קשר', 'משתנים בבת אחת בכל האתר: בכפתורים הצפים, בתחתית, בחלון יצירת הקשר ובטופס הצעת המחיר.');
  const set = k => v => { const o = (state.contact ??= {}); v = v.trim(); if (!v || v === CONTACT0[k]) delete o[k]; else o[k] = v; if (!Object.keys(o).length) delete state.contact; touch(); };
  const g = html('<div class="grid2"></div>');
  g.append(field('וואטסאפ (לשם מגיעות גם בקשות הצעת המחיר)', ct.whatsapp || CONTACT0.whatsapp, set('whatsapp'), { dir: 'ltr' }),
    field('טלפון ראשי', ct.phone || CONTACT0.phone, set('phone'), { dir: 'ltr' }),
    field('טלפון נוסף', ct.phone2 || CONTACT0.phone2, set('phone2'), { dir: 'ltr' }),
    field('מייל', ct.email || CONTACT0.email, set('email'), { dir: 'ltr' }));
  c.append(g);
  const s = card('רשתות חברתיות', 'הכתובת המלאה של כל עמוד');
  const g2 = html('<div class="grid2"></div>');
  [['instagram', 'אינסטגרם'], ['tiktok', 'טיקטוק'], ['facebook', 'פייסבוק'], ['youtube', 'יוטיוב']].forEach(([k, n]) => g2.append(field(n, ct[k] || CONTACT0[k], set(k), { dir: 'ltr' })));
  s.append(g2);
  pg.append(c, s);
}

/* ---------- 10. statistics ---------- */
function stats(pg) {
  const months = [...Array(6)].map((_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 5 + i); return d.toISOString().slice(0, 7); });
  const by = months.map(m => ({ m, q: leads.filter(l => (l.at || '').startsWith(m) && l.type === 'quote').length, s: leads.filter(l => (l.at || '').startsWith(m) && l.type !== 'quote').length }));
  const max = Math.max(1, ...by.map(x => x.q + x.s));
  const c = card('פניות ונרשמים לפי חודש', 'בקשות להצעת מחיר והרשמות לעדכונים, בחצי השנה האחרונה');
  c.append(html(`<div class="bars">${by.map(x => `<div><small>${x.q + x.s}</small><i style="height:${(x.q + x.s) / max * 100}%"></i><small>${x.m.slice(5)}/${x.m.slice(2, 4)}</small></div>`).join('')}</div>`));
  const ints = {};
  leads.filter(l => l.type !== 'quote').forEach(l => { const k = INTEREST[l.interest] || tripName(l.interest) || l.interest || 'אחר'; ints[k] = (ints[k] || 0) + 1; });
  const svc = {};
  leads.filter(l => l.type === 'quote').forEach(l => { const k = l.service || 'אחר'; svc[k] = (svc[k] || 0) + 1; });
  const two = html('<div class="grid2"></div>');
  const a = card('הרשמות לפי נושא', ''), b = card('בקשות לפי שירות', '');
  a.append(html(`<div>${Object.entries(ints).map(([k, n]) => `<p><b>${n}</b> · ${esc(k)}</p>`).join('') || '<p class="hint">עוד אין.</p>'}</div>`));
  b.append(html(`<div>${Object.entries(svc).map(([k, n]) => `<p><b>${n}</b> · ${esc(k)}</p>`).join('') || '<p class="hint">עוד אין.</p>'}</div>`));
  two.append(a, b);
  const v = card('מבקרים באתר', 'כמה אנשים נכנסו, מאיזו מדינה, מטלפון או ממחשב, ואילו חלונות פתחו. בלי שמות ובלי עוגיות.');
  v.append(html(`<div><p class="hint">הנתונים נאספים על ידי שירות האחסון של האתר (Vercel), ומוצגים שם בגרפים. מפעילים פעם אחת: נכנסים לקישור, לוחצים <b>Enable</b>, וזהו. מאותו רגע כל ביקור נספר.</p>
    <a class="btn btn--dark" href="https://vercel.com/yichai/lbv-portal/analytics" target="_blank" rel="noopener">לפתוח את נתוני המבקרים ↗</a></div>`));
  pg.append(c, two, v);
}

/* ---------- load / save / auth ---------- */
async function loadContent() {
  for (const url of ['/api/content', '../content.json']) {
    try { const r = await fetch(url, { cache: 'no-store' }); if (r.ok && r.status !== 204) return await r.json(); } catch (e) {}
  }
  throw new Error('load');
}
async function openApp() {
  [state] = await Promise.all([loadContent(), loadDocs()]);
  delete state.savedAt;
  saved = JSON.stringify(state);
  $('#login').hidden = true;
  $('#app').hidden = false;
  $('#storageWarn').hidden = storage !== 'none';
  $$('#langPick button').forEach(x => x.setAttribute('aria-selected', String(x.dataset.lang === lang)));
  const start = location.hash.slice(1);
  go(PAGES.some(p => p.id === start) ? start : 'dashboard');
  loadLeads().then(() => { if (['dashboard', 'inbox', 'stats', 'mail'].includes(page)) render(); });
}
$('#saveBtn').addEventListener('click', async () => {
  const btn = $('#saveBtn');
  btn.disabled = true; btn.textContent = 'שומר…';
  for (const k of ['texts', 'lists', 'titles', 'heroes', 'contact']) if (state[k] && !Object.keys(state[k]).length) delete state[k];
  try {
    const r = await fetch('/api/content', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(state) });
    if (r.status === 401) { toast('פג תוקף הכניסה. היכנסו שוב', 'err'); return showLogin(); }
    if (!r.ok) throw new Error(String(r.status));
    saved = JSON.stringify(state); changed();
    toast('נשמר ופורסם! השינויים יופיעו באתר תוך דקה');
  } catch (e) { toast(e.message === '503' ? 'האחסון עוד לא מחובר, אי אפשר לשמור' : 'השמירה נכשלה. נסו שוב', 'err'); }
  finally { btn.disabled = false; btn.textContent = 'שמירה ופרסום'; }
});
$('#undoBtn').addEventListener('click', () => {
  if (!confirm('לבטל את כל השינויים שעוד לא פורסמו?')) return;
  state = JSON.parse(saved); changed(); render(); toast('השינויים בוטלו', 'info');
});
function showLogin() { $('#app').hidden = true; $('#login').hidden = false; $('[name=password]').focus(); }
$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const err = $('#loginErr');
  err.hidden = true;
  const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: e.target.password.value }) });
  if (!r.ok) { err.textContent = r.status === 503 ? 'עוד לא הוגדרה סיסמה לניהול.' : 'הסיסמה לא נכונה. נסו שוב.'; err.hidden = false; return; }
  e.target.reset();
  openApp().catch(() => toast('לא הצלחנו לטעון את התוכן', 'err'));
});
$('#logoutBtn').addEventListener('click', async () => {
  if (changed() && !confirm('יש שינויים שלא פורסמו. לצאת בכל זאת?')) return;
  await fetch('/api/login', { method: 'DELETE' });
  saved = JSON.stringify(state); showLogin();
});
addEventListener('beforeunload', e => { if (state && changed()) { e.preventDefault(); e.returnValue = ''; } });
(async () => {
  try {
    const cfg = await (await fetch('/api/config', { cache: 'no-store' })).json();
    storage = cfg.storage;
    if (cfg.authed) await openApp(); else showLogin();
  } catch (e) { showLogin(); }
})();
