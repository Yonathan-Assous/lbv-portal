// Admin for the LBV homepage: edits content.json (CEO letter, team, trips, videos).
// Production: Vercel functions + Blob storage. Local preview: tools/serve.mjs stand-in.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const DEFAULTS = {
  team: () => ({ photo: '', he: { name: '', role: '' }, fr: { name: '', role: '' }, en: { name: '', role: '' } }),
  trips: () => ({ id: 'trip-' + Date.now(), status: 'soon', image: '', link: '', bookingUrl: { he: '', fr: '', en: '' }, he: { name: 'נופש חדש', place: '', subline: '' }, fr: { name: 'Nouveau séjour', place: '', subline: '' }, en: { name: 'New holiday', place: '', subline: '' } }),
  videos: () => ({ he: { title: 'סרטון חדש', file: '', poster: '' }, fr: { title: 'Nouvelle vidéo', file: '', poster: '' }, en: { title: 'New video', file: '', poster: '' } }),
};
const TITLE = {
  team: m => m.he.name || 'איש צוות חדש',
  trips: t => `${t.he.name || 'נופש'} · ${({ open: 'פתוח להרשמה', soon: 'בקרוב', hidden: 'מוסתר' })[t.status] || ''}`,
  videos: v => v.he.title || 'סרטון',
};

let state = null, storage = 'none', dirty = false;

const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
function set(obj, path, value) {
  const keys = path.split('.'), last = keys.pop();
  const target = keys.reduce((o, k) => (o[k] ??= {}), obj);
  target[last] = value;
}
const preview = p => !p ? '' : /^(https?:|data:|\/)/.test(p) ? p : '../' + p;

function toast(text, kind = 'ok') {
  const t = $('#toast');
  t.textContent = text; t.className = `toast toast--${kind}`; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 4000);
}
function markDirty() { dirty = true; $('#saveBtn').classList.add('is-dirty'); }

/* ---------- uploads ---------- */
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

/** A photo/video slot: preview, "upload" button, "remove". */
function mediaSlot(el, read, write) {
  const isVideo = el.dataset.kind === 'video';
  const draw = () => {
    const v = read();
    el.classList.add('slot');
    el.innerHTML = `
      <div class="slot__preview">${v ? (isVideo
        ? `<video src="${preview(v)}" muted playsinline preload="metadata"></video>`
        : `<img src="${preview(v)}" alt="">`) : `<span>${isVideo ? 'אין סרטון' : 'אין תמונה'}</span>`}</div>
      <div class="slot__btns">
        <label class="btn btn--line btn--sm">${v ? 'החלפה' : 'העלאה'}<input type="file" accept="${isVideo ? 'video/mp4,video/quicktime' : 'image/jpeg,image/png,image/webp'}" hidden></label>
        ${v ? '<button type="button" class="btn btn--text btn--sm" data-clear>הסרה</button>' : ''}
      </div>`;
    $('input', el).addEventListener('change', async e => {
      const file = e.target.files[0];
      if (!file) return;
      el.classList.add('is-busy');
      toast('מעלה… זה יכול לקחת קצת זמן בסרטונים', 'info');
      try { write(await uploadFile(file)); markDirty(); draw(); toast('הקובץ הועלה. לא לשכוח ללחוץ ״שמירה ופרסום״'); }
      catch (err) { toast(err.message === 'no-storage' ? 'האחסון עוד לא מחובר, אי אפשר להעלות' : 'ההעלאה נכשלה. נסו שוב', 'err'); }
      finally { el.classList.remove('is-busy'); }
    });
    $('[data-clear]', el)?.addEventListener('click', () => { write(''); markDirty(); draw(); });
  };
  draw();
}

/* ---------- binding ---------- */
function bindField(input, read, write, type) {
  if (type === 'paras') {
    input.value = (read() || []).join('\n\n');
    input.addEventListener('input', () => { write(input.value.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean)); markDirty(); });
  } else {
    input.value = read() ?? '';
    input.addEventListener('input', () => { write(input.value.trim()); markDirty(); });
  }
}

function renderSingle() {
  $$('[data-bind]').forEach(el => {
    const path = el.dataset.bind;
    if (el.classList.contains('photo-row')) mediaSlot(el, () => get(state, path), v => set(state, path, v));
    else bindField(el, () => get(state, path), v => set(state, path, v), el.dataset.type);
  });
}

function renderList(name) {
  const list = $(`[data-list="${name}"]`);
  const items = state[name];
  list.innerHTML = '';
  items.forEach((item, i) => {
    const node = $(`#tpl-${name}`).content.firstElementChild.cloneNode(true);
    const title = () => { $('.card__title', node).textContent = TITLE[name](item); };
    title();
    $$('[data-field]', node).forEach(el => {
      const path = el.dataset.field;
      const read = () => get(item, path), write = v => { set(item, path, v); title(); };
      if (el.classList.contains('photo-row') || el.dataset.kind) mediaSlot(el, read, write);
      else if (el.tagName === 'SELECT') { el.value = read() || 'soon'; el.addEventListener('change', () => { write(el.value); markDirty(); }); }
      else bindField(el, read, write);
    });
    $('.card__tools', node).innerHTML = `
      <button type="button" class="icon" data-move="-1" aria-label="למעלה" ${i === 0 ? 'disabled' : ''}>↑</button>
      <button type="button" class="icon" data-move="1" aria-label="למטה" ${i === items.length - 1 ? 'disabled' : ''}>↓</button>
      <button type="button" class="icon icon--del" data-del aria-label="מחיקה">✕</button>`;
    $$('[data-move]', node).forEach(b => b.addEventListener('click', () => {
      const j = i + Number(b.dataset.move);
      [items[i], items[j]] = [items[j], items[i]];
      markDirty(); renderList(name);
    }));
    $('[data-del]', node).addEventListener('click', () => {
      if (!confirm(`למחוק את ״${TITLE[name](item)}״?`)) return;
      items.splice(i, 1); markDirty(); renderList(name);
    });
    list.appendChild(node);
  });
}

function renderAll() { renderSingle(); ['team', 'trips', 'videos'].forEach(renderList); }

$$('[data-add]').forEach(b => b.addEventListener('click', () => {
  const name = b.dataset.add;
  state[name].push(DEFAULTS[name]());
  markDirty(); renderList(name);
  $(`[data-list="${name}"]`).lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}));

/* ---------- sign-ups for updates ---------- */
const INTEREST = { pesach: 'פסח', sukkot: 'סוכות', all: 'כל הנופשים והאירועים' };
const LANG_NAME = { he: 'עברית', fr: 'צרפתית', en: 'אנגלית' };
let leads = [];
const escH = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const filtered = () => leads.filter(l => !$('#leadsFilter').value || l.interest === $('#leadsFilter').value);
function waLink(phone) {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.startsWith('0')) d = '972' + d.slice(1);
  return d.length >= 9 ? `https://wa.me/${d}` : '';
}
function renderLeads() {
  const list = filtered();
  $('#leadsCount').textContent = `${list.length} נרשמים`;
  $('#leadsBody').innerHTML = list.length ? list.map((l, i) => {
    const wa = waLink(l.phone);
    return `<tr>
      <td>${escH(l.name)}</td><td dir="ltr">${escH(l.phone)}</td><td dir="ltr">${escH(l.email)}</td>
      <td>${escH(INTEREST[l.interest] || l.interest)}</td><td>${escH(LANG_NAME[l.lang] || l.lang)}</td>
      <td>${escH((l.at || '').slice(0, 10).split('-').reverse().join('/'))}</td>
      <td class="leads__act">${wa ? `<a class="btn btn--line btn--sm" href="${wa}" target="_blank" rel="noopener">וואטסאפ</a>` : ''}
        <button type="button" class="icon icon--del" data-lead="${i}" aria-label="מחיקה">✕</button></td></tr>`;
  }).join('') : '<tr><td colspan="7" class="leads__empty">עוד אין נרשמים.</td></tr>';
  $$('[data-lead]').forEach(b => b.addEventListener('click', async () => {
    const l = list[Number(b.dataset.lead)];
    if (!confirm(`למחוק את ${l.name} מהרשימה?`)) return;
    const r = await fetch(`/api/leads?url=${encodeURIComponent(l.url)}`, { method: 'DELETE' });
    if (r.ok) { leads = leads.filter(x => x !== l); renderLeads(); toast('נמחק'); } else toast('המחיקה נכשלה', 'err');
  }));
}
async function loadLeads() {
  try {
    const r = await fetch('/api/leads', { cache: 'no-store' });
    if (r.status === 503) { $('#leadsBody').innerHTML = '<tr><td colspan="7" class="leads__empty">האחסון עוד לא מחובר, ולכן עוד אין רשימה.</td></tr>'; return; }
    if (!r.ok) throw new Error();
    leads = await r.json();
    renderLeads();
  } catch (e) { toast('לא הצלחנו לטעון את הנרשמים', 'err'); }
}
$('#leadsFilter').addEventListener('change', renderLeads);
$('#leadsReload').addEventListener('click', loadLeads);
$('#leadsEmails').addEventListener('click', async () => {
  const emails = [...new Set(filtered().map(l => l.email).filter(Boolean))].join(', ');
  if (!emails) return toast('אין מיילים ברשימה', 'err');
  try { await navigator.clipboard.writeText(emails); toast('כל המיילים הועתקו. אפשר להדביק בשדה ״עותק מוסתר״ במייל'); }
  catch (e) { prompt('העתיקו את המיילים:', emails); }
});
$('#leadsCsv').addEventListener('click', () => {
  const rows = [['שם', 'טלפון', 'מייל', 'מעניין אותו', 'שפה', 'תאריך']].concat(filtered().map(l => [l.name, l.phone, l.email, INTEREST[l.interest] || l.interest, LANG_NAME[l.lang] || l.lang, (l.at || '').slice(0, 10)]));
  const csv = '﻿' + rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `נרשמים-LBV-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
});

/* ---------- load / save / auth ---------- */
async function loadContent() {
  for (const url of ['/api/content', '../content.json']) {
    try { const r = await fetch(url, { cache: 'no-store' }); if (r.ok && r.status !== 204) return await r.json(); } catch (e) {}
  }
  throw new Error('load');
}

async function openEditor() {
  state = await loadContent();
  $('#login').hidden = true;
  $('#app').hidden = false;
  $('#storageWarn').hidden = storage !== 'none';
  renderAll();
  loadLeads();
}

$('#saveBtn').addEventListener('click', async () => {
  const btn = $('#saveBtn');
  btn.disabled = true; btn.textContent = 'שומר…';
  try {
    const r = await fetch('/api/content', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(state) });
    if (r.status === 401) { toast('פג תוקף הכניסה. היכנסו שוב', 'err'); return showLogin(); }
    if (!r.ok) throw new Error(String(r.status));
    dirty = false; btn.classList.remove('is-dirty');
    toast('נשמר! השינויים יופיעו באתר תוך דקה');
  } catch (e) {
    toast(e.message === '503' ? 'האחסון עוד לא מחובר, אי אפשר לשמור' : 'השמירה נכשלה. נסו שוב', 'err');
  } finally { btn.disabled = false; btn.textContent = 'שמירה ופרסום'; }
});

function showLogin() { $('#app').hidden = true; $('#login').hidden = false; $('[name=password]').focus(); }

$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const err = $('#loginErr');
  err.hidden = true;
  const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: e.target.password.value }) });
  if (!r.ok) { err.textContent = r.status === 503 ? 'עוד לא הוגדרה סיסמה לניהול.' : 'הסיסמה לא נכונה. נסו שוב.'; err.hidden = false; return; }
  e.target.reset();
  openEditor().catch(() => toast('לא הצלחנו לטעון את התוכן', 'err'));
});

$('#logoutBtn').addEventListener('click', async () => {
  if (dirty && !confirm('יש שינויים שלא נשמרו. לצאת בכל זאת?')) return;
  await fetch('/api/login', { method: 'DELETE' });
  dirty = false; showLogin();
});

addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

(async () => {
  try {
    const cfg = await (await fetch('/api/config', { cache: 'no-store' })).json();
    storage = cfg.storage;
    if (cfg.authed) await openEditor(); else showLogin();
  } catch (e) { showLogin(); }
})();
