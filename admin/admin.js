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
