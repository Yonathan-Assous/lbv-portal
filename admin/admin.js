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

/* ---------- navigation: area (top row) → page (second row), like a store admin ---------- */
const ICON = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  inbox: 'M4 4h16v12H15l-3 3-3-3H4zM8 9h8M8 12h5',
  site: 'M3 5h18v14H3zM3 9h18M7 7h.01M10 7h.01',
  people: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M16 3.5a4 4 0 0 1 0 7.5M22 21v-1a6 6 0 0 0-4-5.6',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 13.7H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10.3 3V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  help: 'M12 18h.01M9.2 9a3 3 0 1 1 4.1 2.8c-.8.4-1.3 1-1.3 1.9V14M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
};
/** The parts of the site, in the order they appear; each becomes one tab with everything about it. */
function windows() {
  const list = [
    ['w-home', 'דף הראשי', 'פתיחה, השירותים, מי אנחנו ודבר המנכ״ל'],
    ['w-about-us', 'מי אנחנו', 'החלון "מי אנחנו" והצוות'],
    ['w-holidays', 'נופשים', 'כרטיסי הנופשים, ולהוסיף נופש חדש'],
  ];
  for (const t of state.trips || []) list.push([`trip-${t.id}`, t.he?.name || 'נופש', t.id === 'sukkot' ? 'כל מה שבחלון סוכות: טקסטים, סרטונים וגלריה' : 'הדף של הנופש באתר']);
  list.push(['w-events', 'הפקת אירועים', 'החלון של חתונות, בר מצוות וערבי גאלה'], ['w-gala', 'מערכת הגאלה', 'הטקסטים בחלון מערכת הגאלה'],
    ['w-wedding', 'אפליקציה לחתונה', 'החלון של אפליקציית החתונה'], ['w-why', 'למה דווקא La Belle Vie', 'מה מייחד אתכם ולמי החוויה מתאימה'],
    ['w-faq', 'שאלות נפוצות', 'להוסיף, לשנות, להסתיר ולסדר שאלות'], ['w-contact', 'בקשת הצעת מחיר', 'החלון עם הטופס'], ['w-menu', 'תפריט ותחתית', 'התפריט העליון ותחתית הדף']);
  return list.map(([id, title, sub]) => ({ id, title, sub, lang: true }));
}
const GROUPS = () => [
  { id: 'home', name: 'ראשי', pages: [{ id: 'dashboard', title: 'לוח בקרה', sub: 'תמונת מצב: פניות, נרשמים וקיצורי דרך' }] },
  { id: 'inbox', name: 'פניות', badge: true, pages: [
    { id: 'inbox', title: 'פניות ונרשמים', sub: 'כל מי שהשאיר פרטים באתר: בקשות להצעת מחיר והרשמות לעדכונים', badge: true },
    { id: 'mail', title: 'מייל לנרשמים', sub: 'עדכון לכל מי שנרשם, מהמייל של החברה' }] },
  { id: 'site', name: 'עמודי האתר', pages: windows() },
  { id: 'people', name: 'צוות', pages: [{ id: 'team', title: 'צוות ודבר המנכ״ל', sub: 'תמונות, שמות ותפקידים, והמכתב של אילן', lang: true }] },
  { id: 'settings', name: 'הגדרות', pages: [
    { id: 'contact', title: 'פרטי קשר וקישורים', sub: 'טלפונים, וואטסאפ, מייל ורשתות חברתיות, בכל האתר בבת אחת' },
    { id: 'banners', title: 'תמונות רקע', sub: 'התמונה הגדולה מאחורי הכותרת של כל חלון' },
    { id: 'stats', title: 'סטטיסטיקה', sub: 'כמה פונים, כמה נרשמים, וכמה מבקרים באתר' }] },
  { id: 'help', name: 'עזרה', pages: [
    { id: 'guide', title: 'הדרכה', sub: 'איך עושים כל דבר, צעד אחר צעד' },
    { id: 'support', title: 'תמיכה טכנית', sub: 'בדיקה שהכול מחובר, ומה עושים כשמשהו לא עובד' }] },
];
const allPages = () => GROUPS().flatMap(g => g.pages.map(p => ({ ...p, group: g.id })));
function drawNav() {
  const open = leads.filter(l => !l.handled).length;
  const cur = allPages().find(p => p.id === page) || allPages()[0];
  $('#groups').innerHTML = GROUPS().map(g => `<button type="button" class="grp" data-group="${g.id}" ${g.id === cur.group ? 'aria-current="true"' : ''}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${ICON[g.id]}"/></svg>${g.name}${g.badge && open ? `<span class="n">${open}</span>` : ''}</button>`).join('');
  const grp = GROUPS().find(g => g.id === cur.group);
  $('#tabs').innerHTML = grp.pages.map(p => `<button type="button" class="tab" role="tab" data-page="${p.id}" aria-selected="${p.id === page}">${esc(p.title)}${p.badge && open ? `<span class="n">${open}</span>` : ''}</button>`).join('');
  $$('[data-group]', $('#groups')).forEach(b => b.addEventListener('click', () => go(GROUPS().find(g => g.id === b.dataset.group).pages[0].id)));
  $$('[data-page]', $('#tabs')).forEach(b => b.addEventListener('click', () => go(b.dataset.page)));
  $('#tabs [aria-selected="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
}
function go(p, opts = {}) {
  const info = allPages().find(x => x.id === p) || allPages()[0];
  page = info.id;
  $('#pageTitle').textContent = info.title;
  $('#pageSub').textContent = info.sub;
  $('#langPick').hidden = !info.lang;
  history.replaceState(null, '', '#' + page);
  drawNav();
  render();
  scrollTo({ top: 0 });
  if (opts.anchor) setTimeout(() => $(opts.anchor)?.scrollIntoView({ block: 'center' }), 80);
}
function render() {
  const pg = $('#page');
  pg.innerHTML = '';
  if (page.startsWith('w-') || page.startsWith('trip-')) return windowPage(pg, page);
  ({ dashboard, inbox, mail, team, contact, banners, stats, guide, support })[page](pg);
}
$$('#langPick button').forEach(b => b.addEventListener('click', () => {
  lang = b.dataset.lang;
  $$('#langPick button').forEach(x => x.setAttribute('aria-selected', String(x === b)));
  render();
}));

/* ---------- one tab per part of the site: everything about it, in the site's order ---------- */
const WIN_SCOPES = { 'w-home': ['top', 'services', 'about', 'team'], 'w-menu': ['header', 'footer'] };
function windowPage(pg, id) {
  const trip = id.startsWith('trip-') ? state.trips.find(t => 'trip-' + t.id === id) : null;
  const sid = trip ? trip.id : id.slice(2);
  const parts = [];   // [anchor id, label, element]
  const add = (label, el) => { const a = 'part-' + parts.length; el.id = a; el.classList.add('section-anchor'); parts.push([a, label, el]); };
  const siteLink = `../${lang === 'he' ? '' : lang + '/'}${sid === 'home' || sid === 'menu' ? '' : '#' + sid}`;
  if (trip) {
    // A holiday: its card + (Sukkot) the fixed window with its videos and gallery, or (others) its own page.
    add('הכרטיס', tripCard(trip, state.trips.indexOf(trip), true));
    if (trip.id === 'sukkot') {
      add('הטקסטים בחלון', scopeEditor('sukkot', { title: 'הטקסטים בחלון סוכות' }));
      const v = card('הסרטונים', 'הפס "רואים בעיניים" בחלון סוכות');
      v.append(videoCards(state.videos, () => state.videos));
      add('הסרטונים', v);
      const items = state.gallery || galleryDefault();
      const g = card('הגלריה', 'רגעים מהנופש');
      g.append(galleryGrid(items, () => (state.gallery ??= items)));
      add('הגלריה', g);
    } else if (trip.page?.on) {
      const c = card('דף הנופש', 'כל חלק מופיע באתר רק כשיש בו תוכן');
      c.append(tripPageEditor(trip));
      add('דף הנופש', c);
    } else if (STATIC_WIN(trip.id)) {
      add('הטקסטים בחלון', scopeEditor(trip.id, { title: 'החלון הקיים של ' + (trip.he?.name || '') }));
    }
  } else if (sid === 'holidays') {
    add('הטקסטים', scopeEditor('holidays'));
    const c = card('הנופשים', 'כל נופש הוא כרטיס בחלון "נופשים". את הדף של כל נופש עורכים בלשונית שלו למעלה.', '<button class="btn btn--gold" data-add>+ נופש חדש</button>');
    const list = html('<div class="cards"></div>');
    state.trips.forEach((t, i) => list.append(tripCard(t, i, false)));
    $('[data-add]', c).addEventListener('click', addTrip);
    c.append(list);
    add('הנופשים', c);
  } else {
    (WIN_SCOPES[id] || [sid]).forEach(s => { if (scopeOf('he', s)) add(SCOPE_NAME[s] || s, scopeEditor(s, s === 'why' ? { listTitles: ['מה מייחד אותנו', 'למי החוויה שלנו מתאימה'] } : {})); });
    if (sid === 'home') add('דבר המנכ״ל', ceoCard());
    if (sid === 'about-us') add('הצוות', teamCard());
  }
  const bannerSec = docs.he.getElementById(sid);
  if (bannerSec?.dataset.hero && !(trip && trip.page?.on)) {
    const b = card('תמונת רקע לכותרת', 'התמונה הגדולה בראש החלון');
    b.append(heroSlot(bannerSec));
    add('תמונת רקע', b);
  }
  const head = html(`<div class="jump"><a href="${siteLink}" target="_blank" rel="noopener">↗ לראות באתר</a></div>`);
  if (parts.length > 1) parts.forEach(([a, label]) => head.append(html(`<a href="#${a}">${esc(label)}</a>`)));
  $$('a[href^="#part-"]', head).forEach(a => a.addEventListener('click', e => { e.preventDefault(); $(a.getAttribute('href'))?.scrollIntoView({ block: 'start', behavior: 'smooth' }); }));
  pg.append(head, ...parts.map(p => p[2]));
}
function addTrip() {
  const id = 'trip-' + Date.now().toString(36);
  state.trips.push({ id, status: 'soon', image: '', link: '#' + id, bookingUrl: { he: '', fr: '', en: '' },
    he: { name: 'נופש חדש', place: '', subline: '' }, page: { on: true, he: { title: '', lead: '', points: [] } } });
  touch();
  go('trip-' + id);
  toast('נוסף נופש חדש. ממלאים שם, ואז את הדף שלו', 'info');
}

/* ---------- global search: any text on the site, or any person who left details ---------- */
(function search() {
  const inp = $('#gq'), res = $('#gqRes');
  const close = () => { res.hidden = true; };
  inp.addEventListener('input', () => {
    const q = inp.value.trim().toLowerCase();
    res.innerHTML = '';
    if (q.length < 2) return close();
    const out = [];
    leads.filter(l => [l.name, l.phone, l.email].join(' ').toLowerCase().includes(q)).slice(0, 5).forEach(l =>
      out.push([`<b>${esc(l.name)}</b><small>${l.type === 'quote' ? 'בקשת הצעת מחיר' : 'נרשם לעדכונים'} · ${esc(l.phone || l.email || '')}</small>`, () => { inboxTab = 'all'; inboxQ = l.name; go('inbox'); }]));
    const where = s => { const w = windows().find(x => x.id === 'w-' + s || x.id === 'trip-' + s) || windows().find(x => (WIN_SCOPES[x.id] || []).includes(s)); return w; };
    maps.he.forEach(s => s.blocks.forEach(b => {
      if (out.length > 14) return;
      const v = textVal('he', b.key) || {};
      const str = [v.lead, v.text].filter(Boolean).join(' ');
      if (!str.toLowerCase().includes(q)) return;
      const w = where(s.id);
      if (!w) return;
      out.push([`<span>${esc(str.slice(0, 90))}</span><small>${esc(w.title)} · ${KIND(b)}</small>`, () => go(w.id, { anchor: `[data-key="${CSS.escape(b.key)}"]` })]);
    }));
    if (!out.length) res.innerHTML = '<p>לא נמצא.</p>';
    out.forEach(([h, fn]) => { const b = html(`<button type="button">${h}</button>`); b.addEventListener('click', () => { close(); inp.value = ''; fn(); }); res.append(b); });
    res.hidden = false;
  });
  document.addEventListener('click', e => { if (!e.target.closest('.hb__search')) close(); });
  inp.addEventListener('keydown', e => { if (e.key === 'Escape') { close(); inp.blur(); } });
})();

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
    <button data-go="w-home"><b>לשנות טקסט באתר</b><span>כל כותרת ומשפט</span></button>
    <button data-go="w-holidays"><b>להוסיף נופש</b><span>עם דף משלו</span></button>
    <button data-go="trip-sukkot"><b>סרטונים ותמונות</b><span>של סוכות</span></button>
    <button data-go="contact"><b>פרטי קשר</b><span>טלפון, וואטסאפ, קישורים</span></button>
    <button data-go="w-faq"><b>שאלות נפוצות</b><span>להוסיף ולשנות</span></button>
    <button data-go="guide"><b>הדרכה</b><span>איך עושים כל דבר</span></button></div>`));
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
/* ---------- 5. holidays: cards + a full page for each ---------- */
const STATIC_WIN = id => !!docs.he.getElementById(id)?.classList.contains('sheet');
/** A holiday's card. In the "Holidays" list it is short with a button to its tab; in its own tab it also has the page switch. */
function tripCard(t, i, inTab) {
  const ST = { open: ['ההרשמה פתוחה', 'tag--ok'], soon: ['בקרוב', 'tag--gold'], hidden: ['מוסתר', 'tag--muted'] };
  const tr = t[lang] || {}, W = () => (t[lang] ??= {});
  const el = html(`<article class="ecard ${t.status === 'hidden' ? 'is-hidden' : ''}"><div class="ecard__bar"><span class="ecard__title">${esc(t.he?.name || 'נופש')} <span class="tag ${ST[t.status]?.[1] || ''}">${ST[t.status]?.[0] || ''}</span></span></div><div class="ecard__body"></div></article>`);
  const bar = $('.ecard__bar', el);
  if (!inTab) {
    const b = html('<button type="button" class="btn btn--dark btn--sm">לעריכת הדף של הנופש ←</button>');
    b.addEventListener('click', () => go('trip-' + t.id));
    const tl = tools(state.trips, i, render, { hide: false, confirm: `למחוק את הנופש "${t.he?.name || ''}"?` });
    tl.prepend(b);
    bar.append(tl);
  } else if (t.id !== 'sukkot') {
    const del = html('<button type="button" class="btn btn--sm btn--danger">מחיקת הנופש</button>');
    del.addEventListener('click', () => { if (!confirm(`למחוק את הנופש "${t.he?.name || ''}" ואת הדף שלו?`)) return; state.trips.splice(i, 1); touch(); go('w-holidays'); });
    bar.append(del);
  }
  const body = $('.ecard__body', el);
  const st = html(`<label class="field"><span>מצב</span><select><option value="open">ההרשמה פתוחה</option><option value="soon">בקרוב</option><option value="hidden">מוסתר מהאתר</option></select></label>`);
  $('select', st).value = t.status || 'soon';
  $('select', st).addEventListener('change', e => { t.status = e.target.value; touch(); render(); });
  const g = html('<div class="grid2"></div>');
  g.append(field(`שם הנופש (${LNAME[lang]})`, tr.name || '', v => { W().name = v; touch(); drawNav(); }, { placeholder: lang !== 'he' ? t.he?.name : '' }),
    field(`מקום / שורה קטנה בכרטיס`, tr.place || '', v => { W().place = v; touch(); }, { placeholder: lang !== 'he' ? t.he?.place : '' }),
    field(`שורה בכרטיס בדף הראשי`, tr.subline || '', v => { W().subline = v; touch(); }, { placeholder: 'למשל: במלון נוף כנרת' }),
    field(`קישור להזמנה (${LNAME[lang]})`, t.bookingUrl?.[lang] || '', v => { (t.bookingUrl ??= {})[lang] = v.trim(); touch(); }, { dir: 'ltr', placeholder: 'https://' }));
  body.append(st, g, slot('תמונה לכרטיס', () => t.image, v => { t.image = v; }));
  if (inTab && t.id !== 'sukkot') {
    const pg0 = t.page || { on: false };
    const sw = html(`<label class="switch" style="margin-top:6px"><input type="checkbox" ${pg0.on ? 'checked' : ''}> לנופש יש דף משלו באתר</label>`);
    $('input', sw).addEventListener('change', e => { (t.page ??= {}).on = e.target.checked; t.link = t.page.on || STATIC_WIN(t.id) ? '#' + t.id : ''; touch(); render(); });
    body.append(sw);
    if (STATIC_WIN(t.id)) body.append(html(`<p class="hint" style="margin-top:10px">${pg0.on ? 'הדף שבונים למטה מחליף באתר את החלון הקיים של ' + esc(t.he?.name) + '.' : 'כרגע מוצג באתר החלון הקיים של ' + esc(t.he?.name) + ' (אפשר לערוך אותו למטה). כשמפעילים, בונים דף מלא כמו בסוכות, והוא מחליף אותו.'}</p>`));
  }
  return el;
}

/** The full page of a holiday: the same parts as the Sukkot window, each shown only when filled. */
function tripPageEditor(t) {
  const page = t.page;
  const p = page[lang] || {}, ph = page.he || {}, P = () => (page[lang] ??= {});
  const ph_ = k => (lang !== 'he' ? ph[k] || '' : '');
  const box = html('<div class="tp"></div>');
  const sec = (title, hint) => { const s = html(`<section class="tp__sec"><h3>${title}</h3>${hint ? `<p class="hint">${hint}</p>` : ''}</section>`); box.append(s); return s; };

  // Start from the Sukkot window (texts only), so the new page has the same shape right away.
  const tpl = html(`<div class="hint hint--box tp__tpl"><span>רוצים להתחיל מהר? אפשר למלא את הדף בטקסטים של חלון סוכות (בשלוש השפות), ואז לשנות רק מה שצריך.</span><button type="button" class="btn btn--line btn--sm">מילוי מהתבנית של סוכות</button></div>`);
  $('button', tpl).addEventListener('click', () => {
    if ((ph.title || ph.points?.length) && !confirm('זה יחליף את הטקסטים שכבר כתבתם בדף. להמשיך?')) return;
    fillFromSukkot(page); touch(); render();
  });
  box.append(tpl);

  const s1 = sec('פתיחה', `כותרת, פסקת פתיחה ונקודות חשובות (${LNAME[lang]}).`);
  s1.append(field('כותרת הדף', p.title || '', v => { P().title = v; touch(); }, { placeholder: ph_('title') || 'למשל: פסח במלון נוף כנרת' }),
    field('פסקת פתיחה', p.lead || '', v => { P().lead = v; touch(); }, { multi: true, placeholder: ph_('lead') || 'כמה משפטים שמזמינים להגיע' }));
  s1.append(pairList('נקודות חשובות', page, 'points', ['מודגש', 'המשך'], 'למשל: "פנסיון מלא" – "ארוחות עשירות בכשרות מהדרין".'));
  s1.append(field('הערה בסוף (רשות)', p.note || '', v => { P().note = v; touch(); }, { multi: true, placeholder: ph_('note') }));

  const s2 = sec('כפתורים', 'כפתור "בדיקת זמינות והזמנה" מופיע כשהמצב הוא "ההרשמה פתוחה" ויש קישור להזמנה (בשדות שלמעלה). אחרת מופיע "לעדכון ראשון".');
  s2.append(field(`קישור "לראות את החדרים" (${LNAME[lang]}, רשות)`, t.roomsUrl?.[lang] || '', v => { (t.roomsUrl ??= {})[lang] = v.trim(); touch(); }, { dir: 'ltr', placeholder: 'https://' }));

  const s3 = sec('סרטון ראשי', 'הסרטון הגדול ליד הפתיחה, כמו "למה La Belle Vie" בסוכות.');
  const g3 = html('<div class="grid2"></div>');
  g3.append(slot('הסרטון', () => page.video, v => { page.video = v; }, 'video'), slot('תמונת פתיחה לסרטון (או תמונה במקום סרטון)', () => page.image, v => { page.image = v; }));
  const g3b = html('<div class="grid2"></div>');
  g3b.append(field('שם הסרטון', p.videoTitle || '', v => { P().videoTitle = v; touch(); }, { placeholder: ph_('videoTitle') || 'למשל: למה פסח איתנו' }),
    field('שורה קטנה מתחת (רשות)', p.videoSub || '', v => { P().videoSub = v; touch(); }, { placeholder: ph_('videoSub') || 'למשל: חצי דקה' }));
  s3.append(g3, g3b);

  const s4 = sec('יום אחד אצלנו', 'לוח זמנים של יום בנופש. נשאר ריק? החלק לא יופיע.');
  s4.append(field('כותרת', p.dayTitle || '', v => { P().dayTitle = v; touch(); }, { placeholder: ph_('dayTitle') || 'יום אחד אצלנו' }),
    pairList('שעות ופעילויות', page, 'day', ['שעה', 'מה עושים'], 'למשל: "09:00" – "ארוחת בוקר".'));

  const s5 = sec('סרטונים של הנופש', 'הפס של הסרטונים, עם סרטונים של הנופש הזה בלבד (למשל סקי או פסח).');
  s5.append(field('כותרת הפס', p.videosTitle || '', v => { P().videosTitle = v; touch(); }, { placeholder: ph_('videosTitle') || 'רואים בעיניים' }));
  s5.append(videoCards(page.videos || [], () => (page.videos ??= [])));

  const s6 = sec('גלריה', 'תמונות מהנופש, עם כיתוב קטן לכל תמונה.');
  s6.append(field('כותרת הגלריה', p.galleryTitle || '', v => { P().galleryTitle = v; touch(); }, { placeholder: ph_('galleryTitle') || 'רגעים מהנופש' }));
  s6.append(galleryGrid(page.gallery || [], () => (page.gallery ??= [])));

  const s7 = sec('ציטוט של אורח', 'משפט של אורח בסוף הדף. נשאר ריק? לא יופיע.');
  s7.append(field('הציטוט', p.quote || '', v => { P().quote = v; touch(); }, { multi: true, placeholder: ph_('quote') }),
    field('מי אמר', p.cite || '', v => { P().cite = v; touch(); }, { placeholder: ph_('cite') || 'למשל: אורח בנופש פסח' }));

  const s8 = sec('תמונת רקע לכותרת', 'התמונה הגדולה בראש הדף.');
  s8.append(slot('תמונת רקע', () => page.banner, v => { page.banner = v; }));
  return box;
}

/** A list of {lead, text} pairs, kept per language (an empty translation shows the Hebrew one). */
function pairList(title, page, key, labels, hint) {
  const wrap = html(`<div><div class="subhead"><h4>${title}</h4><div class="row-tools"></div></div><div class="items"></div></div>`);
  const own = () => ((page[lang] ??= {})[key] ??= []);
  const list = (page[lang] && page[lang][key]) || [];
  const tools_ = $('.row-tools', wrap);
  if (lang !== 'he' && !list.length && page.he?.[key]?.length) {
    const cp = html('<button type="button" class="btn btn--line btn--sm">להעתיק מהעברית ולתרגם</button>');
    cp.addEventListener('click', () => { page[lang] ??= {}; page[lang][key] = clone(page.he[key]); touch(); render(); });
    tools_.append(cp);
  }
  const add = html('<button type="button" class="btn btn--dark btn--sm">+ הוספה</button>');
  add.addEventListener('click', () => { own().push({ lead: '', text: '' }); touch(); render(); });
  tools_.append(add);
  const L = $('.items', wrap);
  if (!list.length) L.append(html(`<p class="hint">${lang !== 'he' && page.he?.[key]?.length ? `עדיין לא תורגם: באתר ב${LNAME[lang]} יופיע כמו בעברית.` : hint}</p>`));
  list.forEach((x, k) => {
    const row = html('<div class="item"><div class="item__fields"></div></div>');
    $('.item__fields', row).append(field(labels[0], x.lead || '', v => { x.lead = v; touch(); }, { placeholder: lang !== 'he' ? page.he?.[key]?.[k]?.lead : '' }),
      field(labels[1], x.text || '', v => { x.text = v; touch(); }, { placeholder: lang !== 'he' ? page.he?.[key]?.[k]?.text : '' }));
    row.append(tools(list, k, render, { hide: false }));
    L.append(row);
  });
  return wrap;
}

/** Fills a holiday page with the texts of the Sukkot window (as they are on the site now). */
function fillFromSukkot(page) {
  for (const l of LANGS) {
    const sc = scopeOf(l, 'sukkot');
    const val = b => { const v = textVal(l, b.key); return [v?.lead, v?.text].filter(Boolean).join(' '); };
    const by = sel => sc.blocks.find(b => sel(b));
    const items = key => (state.lists?.[key]?.items?.map(it => it[l] || it.he) || sc.lists.find(x => x.key === key)?.items || []).map(x => ({ lead: x.lead || '', text: x.text || '' }));
    const q = by(b => b.tag === 'P' && b.el.closest('blockquote')), c = by(b => b.tag === 'CITE');
    page[l] = {
      ...(page[l] || {}),
      title: val(by(b => b.tag === 'H3' && /h2/.test(b.cls)) || {}) || '',
      lead: val(by(b => /lead/.test(b.cls)) || {}) || '',
      points: items('sukkot:L0'),
      dayTitle: val(by(b => b.tag === 'H3' && b.el.closest('.day')) || {}) || '',
      day: items('sukkot:L1'),
      quote: q ? val(q) : '', cite: c ? val(c) : '',
    };
  }
}

/* ---------- 6. team and the CEO letter ---------- */
function ceoCard() {
  const ceo = state.ceo, c = ceo[lang] || {}, C = () => (ceo[lang] ??= {});
  const k = card('דבר המנכ״ל', `המכתב של אילן בדף הראשי (${LNAME[lang]})`);
  k.append(slot('תמונה', () => ceo.photo, v => { ceo.photo = v; }));
  k.append(field('כותרת', c.title || '', v => { C().title = v; touch(); }),
    field('המכתב (שורה ריקה בין פסקאות)', (c.paragraphs || []).join('\n\n'), v => { C().paragraphs = v.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean); touch(); }, { multi: true, rows: 8 }));
  const g = html('<div class="grid2"></div>');
  g.append(field('חתימה (שם)', c.name || '', v => { C().name = v; touch(); }), field('תפקיד', c.role || '', v => { C().role = v; touch(); }));
  k.append(g);
  return k;
}
function teamCard() {
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
  $('[data-add]', t).addEventListener('click', () => { state.team.push({ photo: '', he: { name: '', role: '' } }); touch(); render(); });
  t.append(list);
  return t;
}
function team(pg) { pg.append(teamCard(), ceoCard()); }

/* ---------- 7. videos ---------- */
/** Video cards for any list of videos (the Sukkot strip, or a holiday page). own() returns the saved array. */
function videoCards(items, own) {
  const box = html('<div><div class="cards"></div><div style="margin-top:12px"><button type="button" class="btn btn--gold">+ סרטון</button></div></div>');
  const list = $('.cards', box);
  if (!items.length) list.append(html('<p class="hint">עוד אין סרטונים. לוחצים "+ סרטון", מעלים את הקובץ ותמונת פתיחה.</p>'));
  items.forEach((v, i) => {
    const tr = v[lang] || {}, W = () => (own()[i][lang] ??= {});
    const el = html(`<article class="ecard ${v.hidden ? 'is-hidden' : ''}"><div class="ecard__bar"><span class="ecard__title">${esc(v.he?.title || 'סרטון')} ${v.hidden ? '<span class="tag tag--muted">מוסתר</span>' : ''}</span></div><div class="ecard__body"></div></article>`);
    $('.ecard__bar', el).append(tools(items, i, () => { own(); touch(); render(); }, { confirm: `למחוק את "${v.he?.title || 'הסרטון'}"?` }));
    const g = html('<div class="grid2"></div>');
    g.append(slot(`הסרטון (${LNAME[lang]}${lang !== 'he' ? ', רשות' : ''})`, () => tr.file, x => { W().file = x; }, 'video'), slot('תמונת פתיחה', () => tr.poster, x => { W().poster = x; }));
    $('.ecard__body', el).append(field(`שם הסרטון (${LNAME[lang]})`, tr.title || '', x => { W().title = x; touch(); }, { placeholder: lang !== 'he' ? v.he?.title : '' }), g);
    list.append(el);
  });
  $('button.btn--gold', box).addEventListener('click', () => { own().push({ he: { title: 'סרטון חדש', file: '', poster: '' } }); touch(); render(); });
  return box;
}
/* ---------- 8. gallery + window banners ---------- */
function galleryDefault() {
  const caps = l => [...docs[l].querySelectorAll('.gallery__item')].map(b => b.querySelector('span')?.textContent || '');
  const he = [...docs.he.querySelectorAll('.gallery__item')];
  const fr = caps('fr'), en = caps('en');
  return he.map((b, i) => ({ img: (b.dataset.full || '').replace(/^(\.\.\/)?/, ''), he: { cap: b.querySelector('span')?.textContent || '' }, fr: { cap: fr[i] || '' }, en: { cap: en[i] || '' } }));
}
/** A photo grid with captions and an upload button. own() returns the saved array. */
function galleryGrid(items, own) {
  const box = html('<div><div style="margin-bottom:12px"><label class="btn btn--gold">+ הוספת תמונות<input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden></label></div><div class="gal"></div></div>');
  const grid = $('.gal', box);
  if (!items.length) grid.append(html('<p class="hint">עוד אין תמונות. אפשר לבחור כמה תמונות בבת אחת.</p>'));
  items.forEach((p, i) => {
    const el = html(`<div class="gal__item ${p.hidden ? 'is-hidden' : ''}"><div class="gal__img"><img src="${esc(preview(p.img))}" alt="" loading="lazy"></div></div>`);
    el.append(field('כיתוב', p[lang]?.cap || '', v => { (own()[i][lang] ??= {}).cap = v; touch(); }, { placeholder: lang !== 'he' ? p.he?.cap : '' }));
    el.append(tools(items, i, () => { own(); touch(); render(); }, { confirm: 'למחוק את התמונה?' }));
    grid.append(el);
  });
  $('input', box).addEventListener('change', async e => {
    const files = [...e.target.files];
    if (!files.length) return;
    toast(`מעלה ${files.length} תמונות…`, 'info');
    try {
      for (const f of files) own().push({ img: await uploadFile(f), he: { cap: '' } });
      touch(); render(); toast('התמונות נוספו. לא לשכוח "שמירה ופרסום"');
    } catch (err) { toast(err.message === 'no-storage' ? 'האחסון עוד לא מחובר' : 'ההעלאה נכשלה', 'err'); }
  });
  return box;
}
/** The big background of a window (saved only when it differs from the original). */
function heroSlot(s) {
  const def = s.dataset.hero;
  return slot(SCOPE_NAME[s.id] || s.dataset.title, () => state.heroes?.[s.id] || 'media/' + def, v => {
    (state.heroes ??= {});
    if (!v || v === 'media/' + def) delete state.heroes[s.id]; else state.heroes[s.id] = v;
  }, /\.mp4$/.test(def) ? 'video' : 'image');
}
function banners(pg) {
  const h = card('תמונות רקע של החלונות', 'אפשר להחליף כל אחת גם מתוך הלשונית של החלון עצמו, ב"עמודי האתר".');
  const hg = html('<div class="grid2"></div>');
  [...docs.he.querySelectorAll('main > section.sheet[data-hero]')].forEach(s => hg.append(heroSlot(s)));
  h.append(hg);
  pg.append(h);
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

/* ---------- 11. guide, tech support and the first-visit tour ---------- */
const HOWTO = [
  ['לשנות טקסט באתר', ['כותבים מילה מהטקסט בחיפוש שלמעלה, ולוחצים על התוצאה.', 'או: "עמודי האתר" ← בוחרים את החלק (למשל "סוכות").', 'משנים את הטקסט בשדה. השדה נצבע בזהב כדי שתדעו מה שיניתם.', 'לוחצים "שמירה ופרסום" בפס שלמטה. תוך דקה זה באתר.'], 'w-home'],
  ['לתרגם לצרפתית או לאנגלית', ['נכנסים לחלק שרוצים לתרגם.', 'למעלה בצד בוחרים "Français" או "English".', 'כל שדה מציג את העברית באפור, וכותבים מעליו את התרגום.', 'מה שלא תורגם יופיע באתר בעברית, אז אפשר לתרגם בהדרגה.'], 'w-home'],
  ['להסתיר משהו מהאתר בלי למחוק', ['ליד כל טקסט, פריט, סרטון או תמונה יש כפתור "להסתיר".', 'הדבר נשאר בניהול, חיוור, ואפשר להחזיר אותו בלחיצה על "להציג באתר".'], 'w-home'],
  ['לבנות דף לפסח, או לפתוח נופש חדש', ['"עמודי האתר" ← "נופשים" ← "+ נופש חדש" (או הלשונית "פסח").', 'כותבים שם ומצב ("בקרוב" או "ההרשמה פתוחה").', 'מסמנים "לנופש יש דף משלו באתר".', 'לוחצים "מילוי מהתבנית של סוכות" כדי להתחיל עם דף מלא, ומשנים מה שצריך.', 'מעלים סרטון ראשי, סרטונים לפס, תמונות לגלריה ותמונת רקע.', '"שמירה ופרסום". הנופש מופיע כרטיס בחלון "נופשים", עם דף משלו.'], 'w-holidays'],
  ['להוסיף סרטונים או תמונות', ['סרטונים ותמונות של סוכות: "עמודי האתר" ← "סוכות".', 'של נופש אחר: בלשונית של אותו נופש.', 'לוחצים "+ סרטון" או "+ הוספת תמונות" ובוחרים קבצים מהמחשב או מהטלפון.', 'אפשר לסדר בחיצים ↑↓, להסתיר או למחוק.'], 'trip-sukkot'],
  ['לטפל בפנייה', ['"פניות" ← "פניות ונרשמים". המספר הזהוב אומר כמה מחכות.', 'לוחצים "וואטסאפ" כדי לענות, או על מספר הטלפון כדי להתקשר.', 'כשסיימתם לוחצים "סימון כטופל". הפנייה עוברת ל"הכול".', '"ייצוא לאקסל" מוריד את כל הרשימה.'], 'inbox'],
  ['לשלוח מייל לכל הנרשמים', ['"פניות" ← "מייל לנרשמים".', 'בוחרים למי, כותבים נושא ותוכן.', 'שולחים קודם "שליחת בדיקה" למייל שלכם ובודקים איך זה נראה.', 'רק אז "שליחה לכל הנרשמים".'], 'mail'],
  ['להחליף טלפון, וואטסאפ או קישור', ['"הגדרות" ← "פרטי קשר וקישורים".', 'משנים את המספר או הכתובת. זה מתחלף בכל האתר בבת אחת.'], 'contact'],
  ['טעיתי, איך מבטלים?', ['לפני "שמירה ופרסום": לוחצים "ביטול השינויים" בפס שלמטה.', 'אחרי שפורסם: ליד הטקסט לוחצים "להחזיר למקור".'], 'w-home'],
];
function guide(pg) {
  const c = card('איך עושים…', 'לוחצים על נושא כדי לראות את הצעדים');
  const box = html('<div class="guide"></div>');
  HOWTO.forEach(([q, steps, to], i) => {
    const d = html(`<details><summary><span>${i + 1}</span>${esc(q)}</summary><ol>${steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol></details>`);
    const b = html('<button type="button" class="btn btn--line btn--sm go">לשם ←</button>');
    b.addEventListener('click', () => go(to));
    d.append(b);
    box.append(d);
  });
  c.append(box);
  const t = card('סיור קצר במערכת', 'שתי דקות שמראות איפה כל דבר נמצא', '<button class="btn btn--gold" data-tour>להתחיל את הסיור</button>');
  $('[data-tour]', t).addEventListener('click', () => tour(true));
  pg.append(t, c);
}

async function support(pg) {
  const c = card('בדיקה שהכול מחובר', 'אם משהו כאן אדום, זו הסיבה שמשהו לא עובד');
  const list = html('<div class="checks"><p class="hint">בודק…</p></div>');
  c.append(list);
  const s = card('משהו לא עובד?', '');
  s.append(html(`<div><ol class="hint" style="padding-inline-start:20px;display:grid;gap:6px">
      <li>מרעננים את הדף (במחשב: F5, בטלפון: משיכה למטה).</li>
      <li>אם שמרתם ועדיין לא רואים את השינוי באתר: מחכים דקה ומרעננים את האתר.</li>
      <li>אם כתוב "פג תוקף הכניסה": נכנסים שוב עם הסיסמה. השינויים שלא נשמרו נשארים בדף עד שסוגרים אותו.</li>
      <li>קובץ גדול (סרטון) יכול לקחת כמה דקות להעלות. לא סוגרים את הדף באמצע.</li>
    </ol>
    <p class="hint">עדיין לא עובד? שולחים צילום מסך עם הסבר קצר:</p>
    <div class="row-tools"><a class="btn btn--dark" href="https://wa.me/972585182655?text=${encodeURIComponent('תקלה במערכת הניהול של האתר:')}" target="_blank" rel="noopener">דיווח בוואטסאפ</a>
      <a class="btn btn--line" href="mailto:LBV0585551826@gmail.com?subject=${encodeURIComponent('תקלה במערכת הניהול')}">דיווח במייל</a></div></div>`));
  pg.append(c, s);
  const rows = [];
  const add = (ok, title, text) => rows.push(`<div class="check"><i class="${ok === true ? 'ok' : ok === null ? 'warn' : 'err'}"></i><b>${title}</b><span>${text}</span></div>`);
  add(true, 'כניסה לניהול', 'מחובר');
  add(storage !== 'none', 'אחסון לתמונות, לסרטונים ולשמירה', storage === 'blob' ? 'מחובר' : storage === 'local' ? 'בדיקה במחשב' : 'לא מחובר: אי אפשר לשמור ולהעלות');
  let leadsOk = false;
  try { leadsOk = (await fetch('/api/leads', { cache: 'no-store' })).ok; } catch (e) {}
  add(leadsOk, 'אחסון פרטי לפניות ולנרשמים', leadsOk ? 'מחובר' : 'לא מחובר: פניות לא נשמרות');
  let mailOk = null;
  try { const r = await fetch('/api/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); const j = await r.json().catch(() => ({})); mailOk = j.error === 'email-not-configured' ? false : r.status === 400 ? true : null; } catch (e) {}
  add(mailOk, 'שירות המיילים', mailOk ? 'מחובר' : mailOk === false ? 'עוד לא מחובר: צריך את המפתח של מערכת הגאלה (אבא)' : 'לא ידוע');
  let site = false;
  try { site = (await fetch('../', { cache: 'no-store' })).ok; } catch (e) {}
  add(site, 'האתר עצמו', site ? 'עולה' : 'לא עולה');
  add(null, 'ספירת מבקרים', 'מפעילים פעם אחת ב"הגדרות" ← "סטטיסטיקה"');
  list.innerHTML = rows.join('');
}

/** A short tour that points at each part of the screen. Shown once on the first visit, and from "הדרכה". */
function tour(force) {
  try { if (!force && localStorage.getItem('lbv-admin-tour')) return; localStorage.setItem('lbv-admin-tour', '1'); } catch (e) {}
  const steps = [
    ['#groups', 'התחומים', 'בשורה הזאת בוחרים תחום: פניות, עמודי האתר, צוות, הגדרות ועזרה. המספר הזהוב = פניות שמחכות לכם.'],
    ['#tabs', 'הדפים בתוך התחום', 'כאן בוחרים דף. ב"עמודי האתר" יש לשונית לכל חלק באתר (סוכות, פסח, אירועים…), ובה כל מה ששייך אליו.'],
    ['#gq', 'חיפוש', 'כותבים מילה מהאתר או שם של לקוח, ומגיעים ישר למקום.'],
    ['#page', 'אזור העריכה', 'משנים כאן טקסטים, מעלים סרטונים ותמונות, מסתירים או מוסיפים. שדה ששונה נצבע בזהב.'],
    ['#langPick', 'שפות', 'עורכים בעברית. לחיצה על Français או English מציגה את אותו טקסט בשפה השנייה.'],
    [null, 'שמירה ופרסום', 'כשיש שינוי, מופיע למטה פס כהה עם "שמירה ופרסום". לוחצים, ותוך דקה זה באתר. אפשר גם לבטל.'],
    ['.grp[data-group="help"]', 'עזרה', 'בכל רגע: "עזרה" ← "הדרכה" (איך עושים כל דבר) או "תמיכה טכנית" (אם משהו לא עובד).'],
  ];
  if (page !== 'w-home' && $('#langPick').hidden) go('w-home');
  const el = html(`<div class="tour" role="dialog" aria-modal="true" aria-label="סיור"><div class="tour__ring"></div><div class="tour__card"><h3></h3><p></p><div class="tour__foot"><div class="tour__dots">${steps.map(() => '<i></i>').join('')}</div><div class="row-tools"><button type="button" class="btn btn--line btn--sm" data-skip>דילוג</button><button type="button" class="btn btn--gold btn--sm" data-next>הבא</button></div></div></div></div>`);
  document.body.append(el);
  let k = 0;
  const show = () => {
    const [sel, title, text] = steps[k];
    $('h3', el).textContent = title; $('p', el).textContent = text;
    $$('.tour__dots i', el).forEach((d, j) => d.classList.toggle('on', j === k));
    $('[data-next]', el).textContent = k === steps.length - 1 ? 'סיום' : 'הבא';
    const ring = $('.tour__ring', el), cardEl = $('.tour__card', el);
    const t = sel && $(sel);
    if (t && !t.hidden && t.offsetParent !== null) {
      t.scrollIntoView({ block: 'nearest' });
      const r0 = t.getBoundingClientRect();
      // Tall areas (the editing area) are framed only where they show on screen.
      const top = Math.max(r0.top, $('.hb').getBoundingClientRect().bottom + 8), bottom = Math.min(r0.bottom, innerHeight - 12);
      const r = { top, bottom, left: r0.left, width: r0.width, height: Math.max(40, bottom - top) };
      Object.assign(ring.style, { display: 'block', top: r.top - 6 + 'px', left: r.left - 6 + 'px', width: r.width + 12 + 'px', height: r.height + 12 + 'px' });
      const tall = r.height > innerHeight * .45;
      const below = !tall && r.bottom + 220 < innerHeight;
      cardEl.style.top = (tall ? r.top + 40 : below ? r.bottom + 18 : Math.max(12, r.top - 220)) + 'px';
      cardEl.style.left = Math.max(12, Math.min(innerWidth - cardEl.offsetWidth - 12, r.left + r.width / 2 - 180)) + 'px';
    } else {
      ring.style.display = 'none';
      cardEl.style.top = innerHeight / 2 - 110 + 'px';
      cardEl.style.left = innerWidth / 2 - cardEl.offsetWidth / 2 + 'px';
    }
  };
  $('[data-next]', el).addEventListener('click', () => { if (++k >= steps.length) el.remove(); else show(); });
  $('[data-skip]', el).addEventListener('click', () => el.remove());
  requestAnimationFrame(show);
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
  go(allPages().some(p => p.id === start) ? start : 'dashboard');
  setTimeout(() => tour(false), 600);
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
