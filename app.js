(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  let WA = '972585182655'; // the admin can change it (contact details)

  // The same script serves the Hebrew page (/) and the French page (/fr/).
  const root = document.documentElement;
  const LANG = ['fr', 'en'].includes(root.lang) ? root.lang : 'he';
  const RTL = root.dir === 'rtl';
  const MEDIA = root.dataset.media || 'media/';
  const VSUFFIX = root.dataset.vsuffix || '';
  const ils = n => n.toLocaleString({ fr: 'fr-FR', en: 'en-US' }[LANG] || 'he-IL');

  const T = {
    he: {
      families: ['משפחת כהן', 'משפחת לוי', 'משפחת אזולאי', 'משפחת פרץ', 'משפחת ביטון', 'משפחת דהן', 'משפחת אוחיון', 'משפחת חדד', 'משפחת עמר', 'משפחת סעדה', 'משפחת אלמליח', 'משפחת בן חמו', 'אנונימי'],
      people: ['יוסף אזולאי', 'שרה לוי', 'דוד פרץ', 'רחל ביטון', 'משה דהן', 'אסתר חדד', 'אברהם עמר', 'מרים כהן', 'יעקב אוחיון', 'חנה אלמליח', 'שמואל בן חמו', 'רבקה סעדה'],
      prizes: ['סוף שבוע זוגי במלון', 'נופש פסח למשפחה', 'ארוחה זוגית במסעדה', 'סט כלי כסף לשבת'],
      ticket: 'כרטיס מס׳ ',
      nextPrize: 'להגרלת הפרס הבא',
      seat: 'להושיב את המשפחות',
      seated: 'כל המשפחות הושבו. לאפס',
      mechitza: 'מחיצה',
      fields: { service: 'שירות', name: 'שם', phone: 'טלפון' },
      missing: list => 'חסר: ' + list.join(', ') + '. מלאו ונסו שוב.',
      msg: ['שלום La Belle Vie, אשמח להצעת מחיר.', 'שירות: ', 'שם: ', 'טלפון: ', 'תאריך: ', 'מספר אנשים: ', 'הערות: '],
    },
    fr: {
      families: ['Famille Cohen', 'Famille Levy', 'Famille Azoulay', 'Famille Peretz', 'Famille Bitton', 'Famille Dahan', 'Famille Ohayon', 'Famille Haddad', 'Famille Amar', 'Famille Saadia', 'Famille Elmaleh', 'Famille Benhamou', 'Anonyme'],
      people: ['Yossef Azoulay', 'Sarah Levy', 'David Peretz', 'Rachel Bitton', 'Moché Dahan', 'Esther Haddad', 'Avraham Amar', 'Myriam Cohen', 'Yaakov Ohayon', 'Hanna Elmaleh', 'Chmouel Benhamou', 'Rivka Saadia'],
      prizes: ['Un week-end en couple à l’hôtel', 'Un séjour de Pessah en famille', 'Un dîner pour deux au restaurant', 'Un service en argent pour Chabbat'],
      ticket: 'Billet n° ',
      nextPrize: 'Tirer le lot suivant',
      seat: 'Placer les familles',
      seated: 'Toutes les familles sont placées. Recommencer',
      mechitza: 'Mehitsa',
      fields: { service: 'service', name: 'nom', phone: 'téléphone' },
      missing: list => 'Il manque : ' + list.join(', ') + '. Complétez puis réessayez.',
      msg: ['Bonjour La Belle Vie, je souhaite recevoir un devis.', 'Service : ', 'Nom : ', 'Téléphone : ', 'Date : ', 'Nombre de personnes : ', 'Remarques : '],
    },
    en: {
      families: ['Cohen family', 'Levy family', 'Azoulay family', 'Peretz family', 'Bitton family', 'Dahan family', 'Ohayon family', 'Haddad family', 'Amar family', 'Saadia family', 'Elmaleh family', 'Benhamou family', 'Anonymous'],
      people: ['Yosef Azoulay', 'Sarah Levy', 'David Peretz', 'Rachel Bitton', 'Moshe Dahan', 'Esther Haddad', 'Avraham Amar', 'Miriam Cohen', 'Yaakov Ohayon', 'Hannah Elmaleh', 'Shmuel Benhamou', 'Rivka Saadia'],
      prizes: ['A weekend for two at a hotel', 'A family Pesach stay', 'Dinner for two', 'A silver Shabbat set'],
      ticket: 'Ticket no. ',
      nextPrize: 'Draw the next prize',
      seat: 'Seat the families',
      seated: 'All families seated. Reset',
      mechitza: 'Mechitza',
      fields: { service: 'service', name: 'name', phone: 'phone' },
      missing: list => 'Missing: ' + list.join(', ') + '. Please fill in and try again.',
      msg: ['Hello La Belle Vie, I would like a quote.', 'Service: ', 'Name: ', 'Phone: ', 'Date: ', 'Number of people: ', 'Notes: '],
    },
  }[LANG];

  /* ---------- Editable content (managed from /admin) ---------- */
  // The HTML ships with the same content, so the page reads fine before (or without) this step.
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const asset = p => !p ? '' : /^(https?:|data:|\/)/.test(p) ? p : MEDIA + p.replace(/^media\//, '');
  const SITE = MEDIA.replace(/media\/$/, '');
  // Live preview inside the admin: the page shows the admin's unsaved content and is updated in place.
  const PREVIEW = /[?&]preview\b/.test(location.search) && window.parent !== window;
  async function loadContent() {
    if (PREVIEW) {
      try { const s = parent.LBV_PREVIEW_STATE && parent.LBV_PREVIEW_STATE(); if (s) return JSON.parse(JSON.stringify(s)); } catch (e) {}
    }
    for (const url of ['/api/content', SITE + 'content.json']) {
      try {
        const r = await fetch(url, { cache: 'no-store' });
        if (r.ok && r.status !== 204) return await r.json();
      } catch (e) {}
    }
    return null;
  }
  function renderContent(c) {
    if (!c) return;
    const L = LANG;
    // English falls back to French, then Hebrew, for anything not translated yet.
    const tr = o => (o && (o[L] || o.fr || o.he)) || {};
    const ceo = c.ceo && tr(c.ceo);
    const letter = $('.letter__body');
    if (ceo && letter) {
      letter.innerHTML = `<h3 class="h3">${esc(ceo.title)}</h3>` +
        ceo.paragraphs.filter(p => p.trim()).map(p => `<p>${esc(p)}</p>`).join('') +
        `<p class="letter__sign">${esc(ceo.name)}<small>${esc(ceo.role)}</small></p>`;
      if (c.ceo.photo) $('.letter__photo img').src = asset(c.ceo.photo);
    }
    // The team appears on the homepage and in the "About us" window; both follow the admin.
    if (Array.isArray(c.team)) $$('.team').forEach(team => {
      // A member without a photo yet gets a monogram tile until one is uploaded from the admin.
      team.innerHTML = c.team.map(m => {
        const pic = m.photo
          ? `<img src="${esc(asset(m.photo))}" alt="" loading="lazy" width="480" height="600">`
          : `<span class="team__mono" aria-hidden="true"><svg viewBox="0 0 212 212" aria-hidden="true"><path fill="#fff" d="M106 50a35 35 0 1 1 0 70 35 35 0 0 1 0-70zm0 82c38 0 68 19 74 46a106 106 0 0 1-148 0c6-27 36-46 74-46z"/></svg></span>`;
        return `<li>${pic}<b>${esc(tr(m).name)}</b><span>${esc(tr(m).role)}</span></li>`;
      }).join('');
    });
    const trips = (c.trips || []).filter(t => t.status !== 'hidden');
    const OPEN = { he: 'ההרשמה פתוחה', fr: 'Réservations ouvertes', en: 'Booking open' }, SOON = { he: 'בקרוב', fr: 'Bientôt', en: 'Coming soon' };
    const badge = t => t.status === 'open'
      ? `<span class="badge">${OPEN[L]}</span>`
      : `<span class="badge badge--soft">${SOON[L]}</span>`;
    const subs = $('.door__subs');
    if (subs) subs.innerHTML = trips.map(t => `<li><b>${esc(tr(t).name)}</b> ${esc(tr(t).subline || '')} ${badge(t)}</li>`).join('');
    const cards = $('.trips');
    if (cards) {
      const soonArt = $('.trips__card--soon svg')?.outerHTML || '';
      cards.innerHTML = trips.map(t => {
        const book = t.bookingUrl && (t.bookingUrl[L] || t.bookingUrl.fr || t.bookingUrl.he);
        const href = t.link || book || '#contact';
        const ext = /^https?:/.test(href) ? ' target="_blank" rel="noopener"' : '';
        const visual = t.image ? `<img src="${esc(asset(t.image))}" alt="" loading="lazy">` : soonArt;
        return `<li><a href="${esc(href)}"${ext} class="trips__card${t.image ? '' : ' trips__card--soon'}">${visual}${badge(t)}<b>${esc(tr(t).name)}</b><small>${esc(tr(t).place)}</small></a></li>`;
      }).join('');
    }
    const rail = $('#rail');
    const shown = Array.isArray(c.videos) ? c.videos.filter(v => !v.hidden) : [];
    if (rail && shown.length) {
      rail.innerHTML = shown.map(v => {
        const x = tr(v);
        return `<button class="vthumb" data-src="${esc(asset(x.file))}" data-poster="${esc(asset(x.poster))}" data-title="${esc(x.title)}"><img src="${esc(asset(x.poster))}" alt="" loading="lazy"><span class="vthumb__play" aria-hidden="true"></span><span class="vthumb__label">${esc(x.title)}</span></button>`;
      }).join('');
    }
    // Every text, list and question edited in the admin (see edit-map.js).
    if (window.LBVEdit && LBVEdit.map) LBVEdit.apply(LBVEdit.map, c, L);
    applyContact(c.contact);
    applyGallery(c.gallery, tr);
    applyHeroes(c.heroes);
    applyTripPages(trips, tr);
  }

  /* ---------- Contact details and links (admin "פרטי קשר") ---------- */
  const CONTACT0 = {
    whatsapp: '972585182655', phone: '+972585182655', phone2: '+972585551826', email: 'LBV0585551826@gmail.com',
    instagram: 'instagram.com/la_belle_vie_lbv', tiktok: 'tiktok.com/@la.belle.vie.event', facebook: 'facebook.com/share/1JXfFgiY9Y', youtube: 'youtube.com/@lbv-la_belle_vie',
  };
  function applyContact(ct) {
    if (!ct) return;
    const digits = s => String(s || '').replace(/[^\d+]/g, '');
    const intl = s => { let d = digits(s).replace(/^\+/, ''); if (d.startsWith('0')) d = '972' + d.slice(1); return d; };
    $$('a[href]').forEach(a => {
      const h = a.getAttribute('href');
      if (ct.whatsapp && h.includes('wa.me/' + CONTACT0.whatsapp)) a.href = h.replace(CONTACT0.whatsapp, intl(ct.whatsapp));
      else if (ct.phone && h === 'tel:' + CONTACT0.phone) a.href = 'tel:+' + intl(ct.phone);
      else if (ct.phone2 && h === 'tel:' + CONTACT0.phone2) a.href = 'tel:+' + intl(ct.phone2);
      else if (ct.email && h === 'mailto:' + CONTACT0.email) a.href = 'mailto:' + ct.email;
      else for (const k of ['instagram', 'tiktok', 'facebook', 'youtube']) if (ct[k] && h.includes(CONTACT0[k])) a.href = ct[k];
    });
    if (ct.whatsapp) WA = intl(ct.whatsapp);
  }

  /* ---------- Gallery and window banners (admin "תמונות") ---------- */
  function applyGallery(g, tr) {
    const grid = $('.gallery__grid');
    if (!grid || !Array.isArray(g)) return;
    grid.innerHTML = g.filter(p => !p.hidden && p.img).map(p => {
      const cap = esc(tr(p).cap || '');
      return `<li><button type="button" class="gallery__item" data-full="${esc(asset(p.img))}"><img src="${esc(asset(p.img))}" alt="${cap}" loading="lazy" width="1080" height="1350"><span>${cap}</span></button></li>`;
    }).join('');
  }
  function applyHeroes(h) {
    if (!h) return;
    Object.entries(h).forEach(([id, src]) => {
      const s = document.getElementById(id), media = s && s.querySelector('.sheet-hero > img, .sheet-hero > video');
      if (!src || !media) return;
      const url = asset(src);
      if (/\.mp4($|\?)/.test(url) === (media.tagName === 'VIDEO')) media.src = url;
      else media.outerHTML = /\.mp4($|\?)/.test(url) ? `<video src="${esc(url)}" autoplay muted loop playsinline aria-hidden="true"></video>` : `<img src="${esc(url)}" alt="">`;
    });
  }

  /* ---------- Holiday pages built in the admin (Pesach, or any new holiday) ---------- */
  const TP = {
    he: { book: 'בדיקת זמינות והזמנה', signup: 'לעדכון ראשון', rooms: 'לראות את החדרים', day: 'יום אחד אצלנו', videos: 'רואים בעיניים', gallery: 'רגעים מהנופש', prev: 'הקודם', next: 'הבא' },
    fr: { book: 'Disponibilités et réservation', signup: 'Être informé en premier', rooms: 'Voir les chambres', day: 'Une journée avec nous', videos: 'En images', gallery: 'Moments du séjour', prev: 'Précédent', next: 'Suivant' },
    en: { book: 'Check availability and book', signup: 'Hear first', rooms: 'See the rooms', day: 'A day with us', videos: 'See it for yourself', gallery: 'Moments from the stay', prev: 'Previous', next: 'Next' },
  }[LANG];
  // A holiday page has the same parts as the Sukkot window; every part shows only when it has content.
  function tripPageHtml(t, tr) {
    const pg = t.page;
    const has = v => Array.isArray(v) ? v.length : String(v || '').trim();
    // Each field in the visitor's language, or Hebrew while it isn't translated yet.
    const f = k => { const v = pg[LANG] && pg[LANG][k]; return has(v) ? v : pg.he && pg.he[k]; };
    const name = tr(t).name || '';
    const title = f('title') || name;
    const book = t.bookingUrl && (t.bookingUrl[LANG] || t.bookingUrl.fr || t.bookingUrl.he);
    const rooms = t.roomsUrl && (t.roomsUrl[LANG] || t.roomsUrl.fr || t.roomsUrl.he);
    const points = (f('points') || []).filter(x => x && (x.lead || x.text));
    const day = (f('day') || []).filter(x => x && (x.lead || x.text));
    const vids = (pg.videos || []).filter(v => !v.hidden).map(v => ({ ...tr(v), file: (v[LANG] && v[LANG].file) || (v.fr && v.fr.file) || (v.he && v.he.file), poster: (v[LANG] && v[LANG].poster) || (v.he && v.he.poster) }))
      .map(v => ({ ...v, title: (v.title || '').trim() || ((pg.videos.find(x => x.he) || {}).he || {}).title || '' })).filter(v => v.file);
    const gal = (pg.gallery || []).filter(p => !p.hidden && p.img);
    const vid = pg.video && asset(pg.video), img = pg.image && asset(pg.image);
    const open = t.status === 'open';
    const thumb = (src, poster, label, big, sub) => `<button class="vthumb${big ? ' vthumb--big' : ''}" data-src="${esc(asset(src))}" data-poster="${esc(asset(poster || ''))}" data-title="${esc(label)}">${poster ? `<img src="${esc(asset(poster))}" alt="" loading="lazy">` : ''}<span class="vthumb__play" aria-hidden="true"></span><span class="vthumb__label">${esc(label)}${sub ? `<small>${esc(sub)}</small>` : ''}</span></button>`;
    const media = vid
      ? `<figure class="split__media feature-video">${thumb(pg.video, pg.image, f('videoTitle') || title, true, f('videoSub'))}</figure>`
      : img ? `<figure class="split__media trip-page__img"><img src="${esc(img)}" alt="" loading="lazy"></figure>` : '';
    return `<div class="wrap split trip-page">
        <div class="split__text">
          <h3 class="h2" data-hero-title>${esc(title)}</h3>
          ${has(f('lead')) ? `<p class="lead">${esc(f('lead'))}</p>` : ''}
          ${points.length ? `<ul class="ticks">${points.map(x => `<li>${x.lead ? `<b>${esc(x.lead)}</b> ` : ''}${esc(x.text || '')}</li>`).join('')}</ul>` : ''}
          ${has(f('note')) ? `<p>${esc(f('note'))}</p>` : ''}
          <div class="actions">
            ${book && open ? `<a class="btn btn--lake" href="${esc(book)}" target="_blank" rel="noopener">${TP.book}</a>` : ''}
            ${rooms ? `<a class="btn btn--line" href="${esc(rooms)}" target="_blank" rel="noopener">${TP.rooms}</a>` : ''}
            ${book && open ? '' : `<button class="btn btn--sun" type="button" data-signup="${esc(t.id)}" data-signup-name="${esc(name)}">${TP.signup}</button>`}
          </div>
        </div>${media}
      </div>
      ${day.length ? `<div class="day wrap"><h3 class="h3">${esc(f('dayTitle') || TP.day)}</h3><ol class="timeline">${day.map(x => `<li><time>${esc(x.lead || '')}</time>${esc(x.text || '')}</li>`).join('')}</ol></div>` : ''}
      ${vids.length ? `<div class="rail-wrap"><div class="wrap rail-head"><h3 class="h3">${esc(f('videosTitle') || TP.videos)}</h3>
          <div class="rail-nav"><button class="round" data-rail="-1" aria-label="${TP.prev}">${RTL ? '&#8594;' : '&#8592;'}</button><button class="round" data-rail="1" aria-label="${TP.next}">${RTL ? '&#8592;' : '&#8594;'}</button></div></div>
          <div class="rail" tabindex="0">${vids.map(v => thumb(v.file, v.poster, v.title)).join('')}</div></div>` : ''}
      ${gal.length ? `<div class="gallery wrap"><h3 class="h3">${esc(f('galleryTitle') || TP.gallery)}</h3><ul class="gallery__grid">${gal.map(p => {
        const cap = esc(tr(p).cap || (p.he && p.he.cap) || '');
        return `<li><button type="button" class="gallery__item" data-full="${esc(asset(p.img))}"><img src="${esc(asset(p.img))}" alt="${cap}" loading="lazy" width="1080" height="1350"><span>${cap}</span></button></li>`;
      }).join('')}</ul></div>` : ''}
      ${has(f('quote')) ? `<blockquote class="quote wrap"><p>${esc(f('quote'))}</p>${has(f('cite')) ? `<cite>${esc(f('cite'))}</cite>` : ''}</blockquote>` : ''}`;
  }
  function applyTripPages(trips, tr) {
    let made = false;
    trips.filter(t => t.page && t.page.on).forEach(t => {
      const html = tripPageHtml(t, tr);
      const title = (t.page[LANG] && t.page[LANG].title) || (t.page.he && t.page.he.title) || tr(t).name || '';
      let s = document.getElementById(t.id);
      if (!s) {
        s = document.createElement('section');
        s.className = 'holidays sheet';
        s.id = t.id;
        s.dataset.parent = 'holidays';
        s.dataset.hero = t.page.banner || t.image || 'hero.jpg';
        s.dataset.title = title;
        s.innerHTML = html;
        $('main').append(s);
        initSheet(s);
        made = true;
      } else {
        // An existing window (e.g. Pesach): its content is replaced, its gold bar and banner stay.
        [...s.children].forEach(ch => { if (!ch.matches('.sheet__bar, .sheet-hero')) ch.remove(); });
        s.insertAdjacentHTML('beforeend', html);
        s.dataset.title = title;
        const barT = s.querySelector('.sheet__bar strong'), heroT = s.querySelector('.sheet-hero h2');
        if (barT) barT.innerHTML = brand(esc(title));
        if (heroT) heroT.innerHTML = brand(esc(title));
        if (t.page.banner) applyHeroes({ [t.id]: t.page.banner });
      }
    });
    if (made && location.hash) route();
  }
  loadContent().then(renderContent);
  if (PREVIEW) {
    // The admin's own preview is not a visit: drop it from the visitor statistics.
    window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
    window.va('beforeSend', () => null);
    const css = document.createElement('style');
    css.textContent = '.lbv-pv-flash{outline:3px solid #E3B65C;outline-offset:6px;border-radius:6px;transition:outline-color 1.2s}.lbv-pv-flash.is-off{outline-color:transparent}';
    document.head.append(css);
    const block = key => { for (const sc of LBVEdit.map || []) { const b = sc.blocks.find(x => x.key === key); if (b) return b; } };
    window.LBVPreview = {
      text(key, v) { const b = block(key); if (b && v) LBVEdit.write(b.el, b.sh, v); },
      style(key, s) { const b = block(key); if (b) LBVEdit.style(b.el, s || {}); },
      show(key) {
        const b = block(key);
        if (!b || !b.el.getClientRects().length) return;
        b.el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        b.el.classList.remove('is-off'); b.el.classList.add('lbv-pv-flash');
        clearTimeout(b.flash); b.flash = setTimeout(() => b.el.classList.add('is-off'), 1200);
      },
    };
  }

  /* ---------- Gala links follow the environment (dev.* → dev gala), as on the old portal ---------- */
  const host = location.hostname;
  const galaBase = (host.startsWith('dev.') || host.includes('localhost')) ? 'https://dev.gala.lbv-event.com' : 'https://gala.lbv-event.com';
  $$('[data-gala-path]').forEach(a => { a.href = galaBase + a.dataset.galaPath; });

  // Remember an explicit language choice so the Hebrew page doesn't send French browsers back to /fr/.
  $$('.bar__lang').forEach(a => a.addEventListener('click', () => {
    try { localStorage.setItem('lbv-lang', a.hreflang); } catch (e) {}
  }));

  /* ---------- Header ---------- */
  const bar = $('#bar');
  const onScroll = () => bar.classList.toggle('is-solid', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const menuBtn = $('#menuBtn'), nav = $('#nav');
  menuBtn.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    menuBtn.setAttribute('aria-expanded', open);
  });
  $$('a', nav).forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('is-open');
    menuBtn.setAttribute('aria-expanded', 'false');
  }));

  /* ---------- Windows: detail sections open full-screen from their #hash ---------- */
  const sheets = $$('.sheet');
  // The company name never breaks across two lines in a title.
  const brand = s => s.replace(/La Belle Vie/g, '<span class="nw">La Belle Vie</span>');
  const closeLabel = { fr: 'Retour à l’accueil', en: 'Back to home' }[LANG] || 'חזרה לדף הראשי';
  sheets.forEach(initSheet);
  // Also used for holiday pages the admin creates (they are added after the content loads).
  function initSheet(s) {
    const barEl = document.createElement('div');
    barEl.className = 'sheet__bar';
    barEl.innerHTML = `<button class="sheet__close" type="button">${RTL ? '&#8594;' : '&#8592;'} ${closeLabel}</button><strong>${brand(s.dataset.title || '')}</strong>`;
    s.prepend(barEl);
    // Windows with a data-hero image get the dark theme and a cinematic banner carrying their title.
    if (s.dataset.hero) {
      const src = /^(https?:|\/)/.test(s.dataset.hero) ? s.dataset.hero : MEDIA + s.dataset.hero;
      const media = /\.mp4$/.test(src)
        ? `<video src="${src}" autoplay muted loop playsinline aria-hidden="true"></video>`
        : `<img src="${src}" alt="" loading="lazy">`;
      const hero = document.createElement('header');
      hero.className = 'sheet-hero';
      hero.innerHTML = `${media}<div class="wrap"><h2>${brand(s.dataset.heroText || s.dataset.title)}</h2></div><span class="horizon__line"></span>`;
      barEl.after(hero);
      s.classList.add('sheet--dark', 'has-hero');
    }
    barEl.querySelector('button').addEventListener('click', () => goBack());
  }
  // A window opened from inside another window goes back to that one (and to the same spot), not to the main page.
  const backTo = { he: 'חזרה ל', fr: 'Retour : ', en: 'Back to ' }[LANG];
  const arrow = RTL ? '&#8594;' : '&#8592;';
  function setBack(sheet, from) {
    sheet._from = from || null;
    sheet.querySelector('.sheet__close').innerHTML = from ? `${arrow} ${backTo}${from.sheet.dataset.title || ''}` : `${arrow} ${closeLabel}`;
  }
  function goBack() {
    const from = openSheetEl && openSheetEl._from;
    if (!from) return closeSheet(true);
    const leaving = openSheetEl;
    history.replaceState(null, '', '#' + from.sheet.id);
    openSheet(from.sheet);
    setBack(leaving, null);
    from.sheet.scrollTop = from.top;
  }
  let openSheetEl = null, pageY = 0;
  function openSheet(sheet, target) {
    if (openSheetEl !== sheet) {
      if (!openSheetEl) {
        pageY = scrollY;
        // A window that belongs to another (Sukkot → Holidays) goes back there even when opened straight from the page.
        const parent = sheet.dataset.parent && document.getElementById(sheet.dataset.parent);
        setBack(sheet, parent ? { sheet: parent, top: 0 } : null);
      }
      else if (openSheetEl._from?.sheet !== sheet) setBack(sheet, { sheet: openSheetEl, top: openSheetEl.scrollTop });
      if (openSheetEl) openSheetEl.classList.remove('is-open');
      sheet.classList.add('is-open');
      document.body.classList.add('has-sheet');
      openSheetEl = sheet;
      sheet.scrollTop = 0;
      dispatchEvent(new CustomEvent('sheet:change', { detail: sheet.id }));
    }
    if (target && target !== sheet) {
      // A link into a hidden gala part (e.g. #phoning) opens that part first.
      const panel = target.closest('.mod-panel');
      if (panel && panel.hidden && window.lbvShowModule) lbvShowModule(panel.dataset.mod);
      setTimeout(() => target.scrollIntoView({ block: 'start', behavior: 'instant' }), 60);
    }
    sheet.querySelector('.sheet__close').focus({ preventScroll: true });
  }
  function closeSheet(clearHash) {
    if (!openSheetEl) return;
    openSheetEl.classList.remove('is-open');
    document.body.classList.remove('has-sheet');
    openSheetEl = null;
    dispatchEvent(new CustomEvent('sheet:change', { detail: null }));
    if (clearHash) history.replaceState(null, '', location.pathname + location.search);
    scrollTo({ top: pageY, behavior: 'instant' });
  }
  function route() {
    const id = decodeURIComponent(location.hash.slice(1));
    const target = id && document.getElementById(id);
    const sheet = target && target.closest('.sheet');
    if (sheet) openSheet(sheet, target);
    else if (openSheetEl) { closeSheet(false); if (target) target.scrollIntoView({ behavior: 'instant' }); }
  }
  addEventListener('hashchange', route);
  addEventListener('keydown', e => { if (e.key === 'Escape' && openSheetEl && !$('#player').open) goBack(); });
  route();

  /* ---------- Phone hero: vertical poster to match the vertical video ---------- */
  const heroVideo = $('.hero__video');
  if (heroVideo && matchMedia('(max-width: 760px)').matches) heroVideo.poster = MEDIA + 'hero-mobile.jpg';

  /* ---------- Photo gallery: a tap opens the photo large; arrows / swipe move through them ---------- */
  // The admin can rebuild the gallery, so the list of photos is read when one is opened.
  let gItems = [];
  if ($('.gallery__grid')) {
    const box = document.createElement('dialog');
    box.className = 'lightbox';
    box.innerHTML = `<button class="lightbox__close" type="button" aria-label="${{ fr: 'Fermer', en: 'Close' }[LANG] || 'סגירה'}">&times;</button>
      <button class="lightbox__nav lightbox__nav--prev" type="button" aria-label="‹">‹</button>
      <figure><img alt=""><figcaption></figcaption></figure>
      <button class="lightbox__nav lightbox__nav--next" type="button" aria-label="›">›</button>`;
    document.body.append(box);
    let at = 0;
    const show = i => {
      at = (i + gItems.length) % gItems.length;
      const b = gItems[at];
      $('img', box).src = b.dataset.full;
      $('img', box).alt = $('img', b).alt;
      $('figcaption', box).textContent = $('span', b).textContent;
    };
    // In Hebrew "next" is to the left.
    const step = d => show(at + (RTL ? -d : d));
    document.addEventListener('click', e => {
      const b = e.target.closest('.gallery__item');
      if (!b) return;
      gItems = $$('.gallery__item');
      show(gItems.indexOf(b));
      box.showModal();
    });
    $('.lightbox__close', box).addEventListener('click', () => box.close());
    $('.lightbox__nav--prev', box).addEventListener('click', () => step(-1));
    $('.lightbox__nav--next', box).addEventListener('click', () => step(1));
    box.addEventListener('click', e => { if (e.target === box) box.close(); });
    box.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') step(-1); if (e.key === 'ArrowRight') step(1); });
    let x0 = null;
    box.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1); x0 = null; });
  }

  /* ---------- "About us" window: the team opens and closes from its button ---------- */
  $$('.au__teambtn').forEach(btn => btn.addEventListener('click', () => {
    const box = document.getElementById(btn.getAttribute('aria-controls'));
    const open = box.hidden;
    box.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    btn.innerHTML = `${open ? btn.dataset.close : btn.dataset.open} <span aria-hidden="true">${open ? '↑' : '↓'}</span>`;
    if (open) box.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
  }));

  /* ---------- Line drawings sketch in when visible ---------- */
  const drawings = $$('.draw');
  if (reduced || !('IntersectionObserver' in window)) drawings.forEach(d => d.classList.add('is-drawn'));
  else {
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-drawn'); io.unobserve(e.target); }
    }), { threshold: 0.4 });
    drawings.forEach(d => io.observe(d));
  }

  /* ---------- Video rail + player ---------- */
  // Delegated: holiday pages built from the admin have their own video strip.
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-rail]');
    const rail = b && b.closest('.rail-wrap')?.querySelector('.rail');
    if (!rail) return;
    // "Next" moves toward the reading direction: left in Hebrew, right in French.
    const dir = RTL ? -1 : 1;
    rail.scrollBy({ left: dir * Number(b.dataset.rail) * rail.clientWidth * 0.8, behavior: reduced ? 'auto' : 'smooth' });
  });

  const player = $('#player'), pv = $('#playerVideo');
  // Delegated, so video cards rendered later from content.json work too.
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-video], [data-src]');
    if (!b) return;
    if (b.dataset.src) {
      pv.src = b.dataset.src;
      pv.poster = b.dataset.poster || '';
    } else {
      // Videos that exist in one version only (e.g. the event film) skip the language suffix.
      const name = b.dataset.video + ('sameVideo' in b.dataset ? '' : VSUFFIX);
      pv.src = `${MEDIA}${name}.mp4`;
      pv.poster = `${MEDIA}${name}.jpg`;
    }
    player.setAttribute('aria-label', b.dataset.title);
    player.showModal();
    pv.play().catch(() => {});
  });
  const closePlayer = () => { pv.pause(); pv.removeAttribute('src'); pv.load(); if (player.open) player.close(); };
  $('#playerClose').addEventListener('click', closePlayer);
  player.addEventListener('click', e => { if (e.target === player) closePlayer(); });
  player.addEventListener('close', () => { pv.pause(); });

  /* ---------- Gala tabs: order tickets → raffle → donations (the order of an evening) ---------- */
  const tabBar = $('.stage__tabs');
  if (tabBar) ['t-tickets', 't-raffle', 't-donate'].forEach(id => { const b = document.getElementById(id); if (b) tabBar.appendChild(b); });
  const tabs = $$('.stage__tabs [role=tab]');
  const select = t => {
    tabs.forEach(x => {
      const on = x === t;
      x.setAttribute('aria-selected', on);
      x.tabIndex = on ? 0 : -1;
      $('#' + x.getAttribute('aria-controls')).hidden = !on;
    });
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', e => {
      const fwd = RTL ? 'ArrowLeft' : 'ArrowRight', back = RTL ? 'ArrowRight' : 'ArrowLeft';
      const d = e.key === fwd ? 1 : e.key === back ? -1 : 0;
      if (!d) return;
      const n = tabs[(i + d + tabs.length) % tabs.length];
      select(n); n.focus();
    });
  });
  if (document.getElementById('t-tickets')) select(document.getElementById('t-tickets'));

  // Gala window: nothing below the tiles until one is chosen; each tile shows its own content.
  const modTiles = $$('.modules [data-mod]');
  const modPanels = $$('.mod-panel');
  const hint = $('.modules__hint');
  window.lbvShowModule = (mod, tabId, tile) => {
    modPanels.forEach(p => { p.hidden = p.dataset.mod !== mod; });
    modTiles.forEach(t => t.setAttribute('aria-selected', String(tile ? t === tile : t.dataset.mod === mod && !t.dataset.tab)));
    if (hint) hint.hidden = true;
    const t = tabId && document.getElementById(tabId);
    if (t) select(t);
  };
  modTiles.forEach(tile => tile.addEventListener('click', () => {
    // Clicking the open tile again closes it.
    if (tile.getAttribute('aria-selected') === 'true') {
      tile.setAttribute('aria-selected', 'false');
      modPanels.forEach(p => { p.hidden = true; });
      if (hint) hint.hidden = false;
      return;
    }
    lbvShowModule(tile.dataset.mod, tile.dataset.tab, tile);
    const panel = modPanels.find(p => p.dataset.mod === tile.dataset.mod);
    if (panel) setTimeout(() => panel.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }), 30);
  }));

  /* ---------- Live donation screen: mirrors the gala system's real "doors" screen ---------- */
  // Wording comes from the real screen (app/[gala]/live-screen/page.tsx in gala-system).
  const UI = {
    he: { board: '10 התורמים האחרונים', plaque: 'התורם האחרון', goal: 'יעד', childOne: 'פתחתם דלת לעתיד של ילד', childMany: 'פתחתם דלת לעתיד של {n} ילדים', collective: 'כבר נפתחו דלתות לעתיד של {n} ילדים', towards: 'לקראת הילד הבא: {have} מתוך {need}', add: 'הוסיפו תרומה', raffleKicker: 'הגרלה', draw: 'להגרלה', drawNext: 'לפרס הבא', winner: 'הזוכה', ticketNo: 'כרטיס מס׳' },
    fr: { board: 'Les 10 derniers donateurs', plaque: 'Dernier donateur', goal: 'Objectif', childOne: 'Vous avez ouvert une porte vers l’avenir d’un enfant', childMany: 'Vous avez ouvert une porte vers l’avenir de {n} enfants', collective: 'Des portes se sont déjà ouvertes vers l’avenir de {n} enfants', towards: 'Vers le prochain enfant : {have} sur {need}', add: 'Ajouter un don', raffleKicker: 'Tombola', draw: 'Lancer le tirage', drawNext: 'Lot suivant', winner: 'Gagnant', ticketNo: 'Billet n°' },
    en: { board: 'Latest 10 donors', plaque: 'Latest donor', goal: 'Target', childOne: 'You opened a door to a child’s future', childMany: 'You opened a door to the future of {n} children', collective: 'Doors have already opened to the future of {n} children', towards: 'Towards the next child: {have} of {need}', add: 'Add a donation', raffleKicker: 'Raffle', draw: 'Start the draw', drawNext: 'Next prize', winner: 'Winner', ticketNo: 'Ticket no.' },
  }[LANG];
  $$('[data-t]').forEach(el => { el.textContent = UI[el.dataset.t] || ''; });
  const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k]);

  const GOAL = 250000, PER_CHILD = 500;
  const gifts = [500, 770, 1000, 1800, 2600, 3600, 5000, 10000];
  let total = 0;
  const dTotal = $('#dTotal'), dBar = $('#dBar'), gBoard = $('#gBoard'), gDoors = $('#gDoors');
  $('#gGoal').textContent = ils(GOAL) + ' ₪';

  const renderTotals = () => {
    dTotal.textContent = ils(total) + ' ₪';
    dBar.style.width = Math.min(100, total / GOAL * 100) + '%';
    $('#gCollective').textContent = fill(UI.collective, { n: ils(Math.floor(total / PER_CHILD)) });
    $('#gTowards').textContent = fill(UI.towards, { have: ils(total % PER_CHILD) + ' ₪', need: ils(PER_CHILD) + ' ₪' });
  };
  let doorTimers = [];
  // The lock and key live on the seam between the doors.
  gDoors.insertAdjacentHTML('beforeend', '<span class="gn__lock" aria-hidden="true"></span><svg class="gn__key" viewBox="0 0 120 44" aria-hidden="true"><defs><linearGradient id="gnKeyG" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#f7e6c0"/><stop offset=".5" stop-color="#d4af6a"/><stop offset="1" stop-color="#8a6a32"/></linearGradient></defs><g fill="none" stroke="url(#gnKeyG)" stroke-width="5" stroke-linecap="round"><circle cx="20" cy="22" r="14"/><circle cx="20" cy="22" r="5"/><path d="M34 22h76M92 22v12M101 22v8M110 22v12"/></g></svg>');
  const donate = (amount, reveal = true) => {
    const name = pick(T.families);
    total += amount; // the goal can be passed, as on a real night
    const li = document.createElement('li');
    li.innerHTML = `<span>${name}</span><b>${ils(amount)} ₪</b>`;
    gBoard.prepend(li);
    while (gBoard.children.length > 10) gBoard.lastChild.remove();
    if (reveal) {
      // Every donation: the doors close (if open), a gold key turns in the lock, then they swing open.
      doorTimers.forEach(clearTimeout);
      const wasOpen = gDoors.classList.contains('is-open');
      gDoors.classList.remove('is-open', 'is-locking');
      const at = (ms, fn) => doorTimers.push(setTimeout(fn, ms));
      const closeWait = wasOpen ? 1150 : 0, keyTime = reduced ? 0 : 1250;
      doorTimers = [];
      at(closeWait, () => {
        $('#gName').textContent = name;
        $('#gAmount').textContent = ils(amount) + ' ₪';        void gDoors.offsetWidth;
        gDoors.classList.add('is-locking');
      });
      at(closeWait + keyTime, () => gDoors.classList.add('is-open'));
      at(closeWait + keyTime + 3300, () => gDoors.classList.remove('is-open', 'is-locking'));
    }
    renderTotals();
  };
  $('#dAdd').addEventListener('click', () => {
    // After passing the goal the demo quietly starts a new evening.
    if (total >= GOAL * 1.06) { total = 132000; gBoard.innerHTML = ''; }
    donate(pick(gifts));
  });
  renderTotals();

  /* ---------- Phone simulations (call centre, ticket purchase): loop through their screens ---------- */
  const sims = $$('.sim').map(el => {
    const steps = $$('.sim__step', el);
    const durations = (el.dataset.durations || '3200,3000,3600,3200').split(',').map(Number);
    let timer = null, idx = 0;
    const show = i => steps.forEach((s, k) => s.classList.toggle('is-on', k === i));
    const run = () => { show(idx); timer = setTimeout(() => { idx = (idx + 1) % steps.length; run(); }, durations[idx] || 3000); };
    return {
      start() { if (!timer && steps.length) { idx = 0; reduced ? show(steps.length - 1) : run(); } },
      stop() { clearTimeout(timer); timer = null; },
    };
  });
  const simStart = () => sims.forEach(s => s.start());
  const simStop = () => sims.forEach(s => s.stop());
  addEventListener('sheet:change', e => (e.detail === 'gala' ? simStart : simStop)());

  // Donations run only while the gala window is open.
  let donateTimer = null;
  const startDonations = () => {
    if (donateTimer) return;
    if (total === 0) {
      total = 132000;
      [1800, 500, 3600, 1000, 770, 2600, 5000, 1000, 1800, 1800].forEach(a => donate(a, false));
    }
    // Nothing runs by itself: a donation appears only when the visitor presses the button.
    donateTimer = true;
  };
  const stopDonations = () => { doorTimers.forEach(clearTimeout); gDoors.classList.remove('is-open', 'is-locking'); donateTimer = null; };
  addEventListener('sheet:change', e => (e.detail === 'gala' ? startDonations : stopDonations)());
  if ($('#gala.is-open')) { startDonations(); simStart(); }

  /* ---------- Raffle: the real projector screen — prize first, then digit reels stop left to right ---------- */
  const rf = $('.rf'), rReels = $('#rReels'), rGo = $('#rGo'), rWinner = $('#rWinner');
  const rPrize = $('#rPrize'), rImg = $('#rImg'), rPrizeText = $('#rPrizeText');
  // Prizes are shown like the real screen's "no photo" mode: the name as the hero, with a gold line drawing.
  const PRIZE_ART = [
    '<path d="M30 70a18 18 0 1 1 36 0 18 18 0 0 1-36 0zM48 52V18h40v10H76v8h12v10H76"/><circle cx="48" cy="70" r="7"/>',
    '<ellipse cx="60" cy="74" rx="44" ry="12"/><path d="M22 70c0-9 17-16 38-16s38 7 38 16"/><circle cx="60" cy="60" r="9"/><path d="M34 52v-16h7v16M80 50V30h9v20M80 38h9"/>',
    '<path d="M18 78h84M26 78a34 34 0 0 1 68 0M60 44v-6M54 38h12"/><path d="M14 90h92"/>',
    '<path d="M38 92h44M44 92V58M76 92V58M40 58h8M72 58h8M44 46c0-6 4-8 0-14M76 46c0-6 4-8 0-14"/><path d="M60 26v8"/>',
  ];
  const DIGITS = 4, LOOPS = 6;
  let prizeIdx = 0, spinning = false;
  const cells = Array.from({ length: DIGITS }, () => {
    const cell = document.createElement('div');
    cell.className = 'rf__cell';
    cell.innerHTML = '<div class="rf__strip"><span>0</span></div>';
    rReels.appendChild(cell);
    return cell;
  });
  const showPrize = () => {
    const name = T.prizes[prizeIdx];
    rPrize.textContent = fill({ he: 'פרס {i} מתוך {n}', fr: 'Lot {i} sur {n}', en: 'Prize {i} of {n}' }[LANG] || '', { i: prizeIdx + 1, n: T.prizes.length });
    rImg.hidden = true;
    rPrizeText.innerHTML = `<svg class="rf__art" viewBox="0 0 120 110" aria-hidden="true">${PRIZE_ART[prizeIdx % PRIZE_ART.length]}</svg><b>${esc(name)}</b><i class="rf__orn" aria-hidden="true"></i>`;
    rf.dataset.phase = 'presenting';
    rWinner.textContent = '';
    cells.forEach(c => { const s = $('.rf__strip', c); s.style.transition = 'none'; s.style.transform = 'none'; s.innerHTML = '<span>–</span>'; c.classList.remove('is-locked'); });
    rGo.textContent = UI.draw;
  };
  showPrize();

  rGo.addEventListener('click', () => {
    if (spinning) return;
    if (rf.dataset.phase === 'revealed') { prizeIdx = (prizeIdx + 1) % T.prizes.length; showPrize(); return; }
    spinning = true;
    rGo.disabled = true;
    rf.dataset.phase = 'revealing';
    const number = String(1000 + Math.floor(Math.random() * 9000));
    let last = 0;
    cells.forEach((cell, i) => {
      const strip = $('.rf__strip', cell);
      const target = Number(number[i]);
      let html = '';
      for (let l = 0; l < LOOPS; l++) for (let d = 0; d < 10; d++) html += `<span>${d}</span>`;
      strip.innerHTML = html + `<span>${target}</span>`;
      const h = strip.firstElementChild.offsetHeight || cell.offsetHeight;
      const dur = reduced ? 0 : 2200 + i * 650; // stops left to right, like the real screen
      last = Math.max(last, dur);
      strip.style.transition = 'none';
      strip.style.transform = 'translateY(0)';
      void strip.offsetWidth;
      strip.style.transition = `transform ${dur}ms cubic-bezier(.12,.72,.18,1)`;
      strip.style.transform = `translateY(${-LOOPS * 10 * h}px)`;
      setTimeout(() => cell.classList.add('is-locked'), dur);
    });
    setTimeout(() => {
      rf.dataset.phase = 'revealed';
      rWinner.innerHTML = `<small>${UI.winner}</small><b>${pick(T.people)}</b><span>${UI.ticketNo} ${number}</span>`;
      burst();
      spinning = false;
      rGo.disabled = false;
      rGo.textContent = UI.drawNext;
    }, last + 250);
  });

  const canvas = $('#confetti'), ctx = canvas.getContext('2d');
  function burst() {
    if (reduced) return;
    const r = canvas.getBoundingClientRect(), dpr = devicePixelRatio || 1;
    canvas.width = r.width * dpr; canvas.height = r.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const colors = ['#E3B65C', '#F3D58E', '#1E7FD0', '#FFFFFF'];
    const bits = Array.from({ length: 120 }, () => ({
      x: r.width / 2, y: r.height * 0.45,
      vx: (Math.random() - .5) * 12, vy: -Math.random() * 11 - 3,
      s: 4 + Math.random() * 5, c: pick(colors), a: Math.random() * 6, va: (Math.random() - .5) * .3
    }));
    const t0 = performance.now();
    const frame = now => {
      ctx.clearRect(0, 0, r.width, r.height);
      bits.forEach(b => {
        b.vy += .32; b.vx *= .99; b.x += b.vx; b.y += b.vy; b.a += b.va;
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a);
        ctx.fillStyle = b.c; ctx.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2);
        ctx.restore();
      });
      if (now - t0 < 2600) requestAnimationFrame(frame); else ctx.clearRect(0, 0, r.width, r.height);
    };
    requestAnimationFrame(frame);
  }

  /* ---------- Tickets demo ---------- */
  const qr = $('#qr');
  (() => {
    // Decorative code: three finder squares and a seeded pattern.
    let seed = 7, html = '';
    const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    const finder = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff" style="fill:#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3"/>`;
    for (let y = 0; y < 25; y++) for (let x = 0; x < 25; x++) {
      const inFinder = (x < 8 && y < 8) || (x > 16 && y < 8) || (x < 8 && y > 16);
      if (!inFinder && rnd() > .52) html += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
    }
    qr.innerHTML = html + finder(0, 0) + finder(18, 0) + finder(0, 18);
    $$('.buy__qr').forEach(s => { s.innerHTML = qr.innerHTML; });
  })();
  const tSold = $('#tSold');
  let sold = 312;
  $$('.pack').forEach(p => p.addEventListener('click', () => {
    sold += Number(p.dataset.n);
    tSold.textContent = ils(sold);
    p.classList.add('is-bought');
    setTimeout(() => p.classList.remove('is-bought'), 600);
  }));

  /* ---------- Wedding app: three screens (WhatsApp invite → guest confirms → seating) ---------- */
  const W = {
    he: { tabs: ['ההזמנה בוואטסאפ', 'אישור הגעה', 'סידור שולחנות'], couple: 'נועה ואריאל', online: 'מקוון', cardTop: 'בשמחה ובהתרגשות', cardMid: 'מתכבדים להזמינכם לחתונתם', date: 'יום חמישי · 11.3.2027 · 19:00', venue: 'אולמי הגן, ירושלים', msg: 'שלום משפחת כהן! נשמח מאוד לראותכם איתנו. לאישור הגעה לחצו כאן:', open: 'לאישור הגעה', hello: 'שלום משפחת כהן', q: 'תגיעו לשמוח איתנו?', yes: 'נגיע בשמחה', no: 'לא נוכל להגיע', how: 'מספר אנשים', food: 'העדפות אוכל', foods: ['רגיל', 'צמחוני', 'טבעוני', 'ללא גלוטן'], send: 'שליחת התשובה', thanks: 'תודה! נתראה בשמחה', thanksNo: 'תודה שעדכנתם', got: 'האישור הגיע ישר לנועה ולאריאל', see: 'לראות את זה אצל הזוג', try: 'נסו בעצמכם' },
    fr: { tabs: ['L’invitation WhatsApp', 'Confirmation', 'Plan de table'], couple: 'Noa et Ariel', online: 'en ligne', cardTop: 'Avec joie et émotion', cardMid: 'ont le plaisir de vous convier à leur mariage', date: 'Jeudi · 11.3.2027 · 19h00', venue: 'Salles HaGan, Jérusalem', msg: 'Bonjour famille Cohen ! Nous serions si heureux de vous avoir avec nous. Pour confirmer votre venue :', open: 'Confirmer ma venue', hello: 'Bonjour famille Cohen', q: 'Serez-vous des nôtres ?', yes: 'Nous serons là', no: 'Nous ne pourrons pas venir', how: 'Nombre de personnes', food: 'Préférences de repas', foods: ['Standard', 'Végétarien', 'Végan', 'Sans gluten'], send: 'Envoyer ma réponse', thanks: 'Merci ! À très bientôt', thanksNo: 'Merci de nous avoir prévenus', got: 'La réponse arrive directement chez Noa et Ariel', see: 'Voir côté mariés', try: 'Essayez vous-même' },
    en: { tabs: ['WhatsApp invite', 'Guest RSVP', 'Seating plan'], couple: 'Noa & Ariel', online: 'online', cardTop: 'With joy and love', cardMid: 'invite you to celebrate their wedding', date: 'Thursday · 11.3.2027 · 7 pm', venue: 'HaGan Halls, Jerusalem', msg: 'Hello Cohen family! We would love to have you with us. To confirm, tap here:', open: 'RSVP now', hello: 'Hello Cohen family', q: 'Will you join us?', yes: 'Yes, we’ll be there', no: 'We can’t make it', how: 'How many of you?', food: 'Meal preferences', foods: ['Regular', 'Vegetarian', 'Vegan', 'Gluten-free'], send: 'Send my answer', thanks: 'Thank you! See you there', thanksNo: 'Thanks for letting us know', got: 'The answer goes straight to Noa and Ariel', see: 'See it on the couple’s side', try: 'Try it yourself' },
  }[LANG];
  const screen = $('#wedding .phone__screen');
  if (screen) {
    const tablesView = document.createElement('div');
    tablesView.className = 'av'; tablesView.dataset.v = 'tables';
    tablesView.append(...screen.children);
    screen.innerHTML = `
      <div class="av av--wa" data-v="invite">
        <div class="wa__bar"><span class="wa__ava">${esc(W.couple.slice(0, 1))}</span><span><b>${esc(W.couple)}</b><small>${esc(W.online)}</small></span></div>
        <div class="wa__chat">
          <div class="wa__msg">
            <div class="wa__card"><small>${esc(W.cardTop)}</small><b>${esc(W.couple)}</b><span>${esc(W.cardMid)}</span><i></i><em>${esc(W.date)}</em><em>${esc(W.venue)}</em></div>
            <p>${esc(W.msg)}</p>
            <a class="wa__link" href="#" data-go="rsvp">simha.lbv-event.com/i/K8C2</a>
            <time>10:42 <span class="wa__ticks">✓✓</span></time>
          </div>
          <button class="wa__btn" type="button" data-go="rsvp">${esc(W.open)}</button>
        </div>
      </div>
      <div class="av av--rsvp" data-v="rsvp">
        <form class="gr" novalidate>
          <div class="gr__head"><small>${esc(W.cardTop)}</small><b>${esc(W.couple)}</b><span>${esc(W.date)}</span></div>
          <p class="gr__hello">${esc(W.hello)}</p>
          <fieldset class="gr__q"><legend>${esc(W.q)}</legend>
            <div class="gr__yn"><button type="button" class="is-on" data-yn="yes">${esc(W.yes)}</button><button type="button" data-yn="no">${esc(W.no)}</button></div></fieldset>
          <fieldset class="gr__q" data-only-yes><legend>${esc(W.how)}</legend>
            <div class="gr__step"><button type="button" data-step="-1" aria-label="-">−</button><output>2</output><button type="button" data-step="1" aria-label="+">+</button></div></fieldset>
          <button class="btn btn--sun btn--block" type="submit">${esc(W.send)}</button>
        </form>
        <div class="gr__done" hidden><span class="gr__check"></span><b></b><p>${esc(W.got)}</p><button class="btn btn--lake btn--block" type="button" data-go="tables">${esc(W.see)}</button></div>
      </div>`;
    screen.append(tablesView);
    const phone = screen.closest('.phone');
    phone.insertAdjacentHTML('beforebegin', `<div class="apptabs" role="tablist">${W.tabs.map((t, i) => `<button type="button" role="tab" data-go="${['invite', 'rsvp', 'tables'][i]}"><span>${i + 1}</span>${esc(t)}</button>`).join('')}</div>`);
    const tabsEl = phone.previousElementSibling;
    const go = v => {
      $$('.av', screen).forEach(a => a.classList.toggle('is-on', a.dataset.v === v));
      $$('button', tabsEl).forEach(b => b.setAttribute('aria-selected', String(b.dataset.go === v)));
    };
    phone.parentElement.addEventListener('click', e => {
      const b = e.target.closest('[data-go]');
      if (!b) return;
      e.preventDefault();
      go(b.dataset.go);
    });
    go('invite');

    // The guest's form: really clickable, and the answer lands in the couple's counters.
    const form = $('.gr', screen), done = $('.gr__done', screen);
    let coming = true, people = 2, answered = false;
    form.addEventListener('click', e => {
      const yn = e.target.closest('[data-yn]'), st = e.target.closest('[data-step]'), chip = e.target.closest('.gr__chips button');
      if (yn) { coming = yn.dataset.yn === 'yes'; $$('[data-yn]', form).forEach(b => b.classList.toggle('is-on', b === yn)); $$('[data-only-yes]', form).forEach(f => f.disabled = !coming); }
      if (st) { people = Math.min(12, Math.max(1, people + Number(st.dataset.step))); $('.gr__step output', form).textContent = people; }
      if (chip) chip.classList.toggle('is-on');
    });
    form.addEventListener('submit', e => {
      e.preventDefault();
      $('b', done).textContent = coming ? W.thanks : W.thanksNo;
      form.hidden = true; done.hidden = false;
      if (!answered) {
        answered = true;
        const bump = (id, d) => { const o = $(id); o.textContent = Number(o.textContent) + d; o.parentElement.classList.remove('is-bump'); void o.offsetWidth; o.parentElement.classList.add('is-bump'); };
        bump(coming ? '#aYes' : '#aNo', people);
        bump('#aWait', -people);
      }
      setTimeout(() => { form.hidden = false; done.hidden = true; }, 9000);
    });
  }

  /* ---------- Wedding seating demo: like the real plan in Simha, each family is dragged to its table,
     men (blue) and women (pink) on either side of the mechitza; every table shows seated / places. ---------- */
  const hall = $('#hall');
  const SEATS = 10;
  // Six tables: men on one side of the mechitza, women on the other; families of 2 to 5 people.
  const SIDES = [['m', [4, 3, 3], [5, 2, 3], [2, 4]], ['f', [3, 4, 3], [2, 5, 3], [4, 2]]];
  const tables = [];
  const mkTable = (n, g, fams) => {
    const el = document.createElement('div');
    el.className = 'table';
    let seats = '';
    for (let s = 0; s < SEATS; s++) seats += `<i class="seat" style="--a:${s * 360 / SEATS}deg"></i>`;
    el.innerHTML = seats + `<span class="table__top"><b>${n}</b><small>0/${SEATS}</small></span>`;
    tables.push({ el, g, fams });
    return el;
  };
  const side = (g, list, from) => { const col = document.createElement('div'); col.className = 'hall__side'; list.forEach((f, i) => col.append(mkTable(from + i, g, f))); return col; };
  const mz = document.createElement('div');
  mz.className = 'hall__mz';
  mz.innerHTML = `<span>${esc(T.mechitza)}</span>`;
  hall.append(side('m', SIDES[0].slice(1), 1), mz, side('f', SIDES[1].slice(1), 4));
  const seatBtn = $('#seatBtn');
  let seated = false, seating = false;
  const count = t => { const k = $$('.seat.m, .seat.f', t.el).length; $('small', t.el).textContent = `${k}/${SEATS}`; t.el.classList.toggle('is-full', k >= SEATS); };
  seatBtn.addEventListener('click', () => {
    if (seating) return;
    if (seated) {
      $$('.seat', hall).forEach(s => s.className = 'seat');
      tables.forEach(count);
      seated = false; seatBtn.textContent = T.seat;
      return;
    }
    seating = true;
    // One family at a time lands on its table, all its people together.
    const moves = [];
    tables.forEach(t => { let at = 0; t.fams.forEach(size => { moves.push([t, at, size]); at += size; }); });
    let i = 0;
    const step = () => {
      const [t, at, size] = moves[i++];
      $$('.seat', t.el).slice(at, at + size).forEach(s => { s.classList.add(t.g, 'is-in'); setTimeout(() => s.classList.remove('is-in'), 300); });
      count(t);
      if (i < moves.length) setTimeout(step, reduced ? 0 : 170);
      else { seating = false; seated = true; seatBtn.textContent = T.seated; }
    };
    step();
  });

  /* ---------- Sign-up for updates (Pesach first, or all news) → saved for the admin ---------- */
  const SU = {
    he: { title: 'רוצים לשמוע ראשונים?', lead: 'השאירו פרטים, ונעדכן אתכם על נופשים חדשים, פסח, ואירועים מיוחדים.', name: 'שם מלא', phone: 'טלפון', email: 'מייל', interest: 'מה מעניין אתכם?', opts: { pesach: 'נופש פסח', sukkot: 'נופש סוכות', all: 'כל הנופשים והאירועים' }, consent: 'אני מאשר/ת לקבל עדכונים ופרסומים מ-La Belle Vie. אפשר להסיר בכל רגע.', send: 'הרשמה לעדכונים', thanks: 'תודה! נרשמתם, ונעדכן אתכם ראשונים.', err: 'משהו לא נשלח. בדקו שם, טלפון או מייל, ואישור לקבלת עדכונים.', strip: 'רוצים לשמוע ראשונים על נופשים ואירועים חדשים?', stripBtn: 'להרשמה לעדכונים', close: 'סגירה' },
    fr: { title: 'Être informé en premier', lead: 'Laissez vos coordonnées, nous vous informerons des nouveaux séjours, de Pessah et des événements spéciaux.', name: 'Nom complet', phone: 'Téléphone', email: 'E-mail', interest: 'Ce qui vous intéresse', opts: { pesach: 'Séjour de Pessah', sukkot: 'Séjour de Souccot', all: 'Tous les séjours et événements' }, consent: 'J’accepte de recevoir des nouvelles et des offres de La Belle Vie. Désinscription à tout moment.', send: 'M’inscrire', thanks: 'Merci ! Vous êtes inscrit, vous serez informé en premier.', err: 'L’envoi a échoué. Vérifiez le nom, le téléphone ou l’e-mail, et l’accord.', strip: 'Envie d’être informé en premier des nouveaux séjours et événements ?', stripBtn: 'Recevoir les nouvelles', close: 'Fermer' },
    en: { title: 'Be the first to know', lead: 'Leave your details and we will tell you about new holidays, Pesach and special events.', name: 'Full name', phone: 'Phone', email: 'Email', interest: 'What interests you?', opts: { pesach: 'Pesach stay', sukkot: 'Sukkot stay', all: 'All holidays and events' }, consent: 'I agree to receive news and offers from La Belle Vie. Unsubscribe any time.', send: 'Sign me up', thanks: 'Thank you! You are signed up and will hear first.', err: 'That didn’t go through. Check your name, phone or email, and the consent box.', strip: 'Want to hear first about new holidays and events?', stripBtn: 'Get updates', close: 'Close' },
  }[LANG];
  const su = document.createElement('dialog');
  su.className = 'signup';
  su.innerHTML = `
    <form class="signup__card" novalidate>
      <button type="button" class="signup__x" aria-label="${SU.close}">&times;</button>
      <h3>${SU.title}</h3><p>${SU.lead}</p>
      <label>${SU.name}<input name="name" autocomplete="name" required></label>
      <div class="signup__row"><label>${SU.phone}<input name="phone" type="tel" inputmode="tel" autocomplete="tel"></label>
      <label>${SU.email}<input name="email" type="email" autocomplete="email"></label></div>
      <label>${SU.interest}<select name="interest">${Object.entries(SU.opts).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
      <input name="website" tabindex="-1" autocomplete="off" class="signup__hp" aria-hidden="true">
      <label class="signup__ok"><input type="checkbox" name="consent" required> <span>${SU.consent}</span></label>
      <p class="signup__msg" role="status" hidden></p>
      <button class="btn btn--sun btn--block" type="submit">${SU.send}</button>
    </form>`;
  document.body.appendChild(su);
  const suForm = $('form', su), suMsg = $('.signup__msg', su);
  const openSignup = interest => {
    suForm.reset(); suMsg.hidden = true; suForm.hidden = false;
    $('[type=submit]', su).hidden = false;
    if (interest) suForm.interest.value = interest;
    su.showModal();
  };
  $('.signup__x', su).addEventListener('click', () => su.close());
  su.addEventListener('click', e => { if (e.target === su) su.close(); });
  suForm.addEventListener('submit', async e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(suForm));
    const payload = { name: d.name, phone: d.phone, email: d.email, interest: d.interest, website: d.website, lang: LANG, consent: suForm.consent.checked };
    const okLocal = payload.name && payload.consent && ((payload.phone || '').replace(/\D/g, '').length >= 9 || /\S+@\S+\.\S+/.test(payload.email || ''));
    const show = (text, good) => { suMsg.textContent = text; suMsg.hidden = false; suMsg.classList.toggle('is-good', good); };
    if (!okLocal) return show(SU.err, false);
    try {
      const r = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (r.status === 503) throw new Error('no-storage');
      if (!r.ok) return show(SU.err, false);
      show(SU.thanks, true);
      $('[type=submit]', su).hidden = true;
    } catch (err) {
      // Storage not connected yet: fall back to a WhatsApp message so no sign-up is lost.
      const text = `${SU.title}\n${payload.name}\n${payload.phone || ''} ${payload.email || ''}\n${SU.opts[payload.interest] || ''}`;
      window.open(`https://wa.me/${WA}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
      show(SU.thanks, true);
    }
  });
  // The Pesach buttons open the sign-up instead of the quote form.
  $$('[data-service="pesach"]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); e.stopImmediatePropagation(); openSignup('pesach'); }, true));
  // Holiday pages built from the admin use data-signup="<holiday>" (works for buttons added later too).
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-signup]');
    if (!b) return;
    e.preventDefault();
    const v = b.dataset.signup;
    if (v && !$(`option[value="${CSS.escape(v)}"]`, suForm)) suForm.interest.insertAdjacentHTML('beforeend', `<option value="${esc(v)}">${esc(b.dataset.signupName || v)}</option>`);
    openSignup(v || 'all');
  });
  // A general "get updates" strip just above the footer.
  const foot = $('.foot');
  if (foot) {
    const strip = document.createElement('section');
    strip.className = 'updates';
    strip.innerHTML = `<div class="wrap updates__in"><p>${SU.strip}</p><button type="button" class="btn btn--sun">${SU.stripBtn}</button></div>`;
    foot.before(strip);
    $('button', strip).addEventListener('click', () => openSignup('all'));
  }

  /* ---------- Quote form → WhatsApp ---------- */
  const form = $('#quote'), fService = $('#fService'), fErr = $('#fErr');
  $$('[data-service]').forEach(a => a.addEventListener('click', () => { fService.value = a.dataset.service; }));

  form.addEventListener('submit', e => {
    e.preventDefault();
    const d = new FormData(form);
    const missing = [];
    ['service', 'name', 'phone'].forEach(k => {
      const el = form.elements[k];
      const bad = !String(d.get(k) || '').trim() || (k === 'phone' && String(d.get(k)).replace(/\D/g, '').length < 9);
      el.setAttribute('aria-invalid', bad);
      if (bad) missing.push(T.fields[k]);
    });
    if (missing.length) {
      fErr.hidden = false;
      fErr.textContent = T.missing(missing);
      form.querySelector('[aria-invalid="true"]').focus();
      return;
    }
    fErr.hidden = true;
    const m = T.msg;
    const lines = [
      m[0],
      m[1] + fService.options[fService.selectedIndex].text,
      m[2] + d.get('name'),
      m[3] + d.get('phone'),
      d.get('date') && m[4] + d.get('date'),
      d.get('guests') && m[5] + d.get('guests'),
      d.get('notes') && m[6] + d.get('notes'),
    ].filter(Boolean);
    // The request is also kept in the admin ("פניות"), so nothing gets lost in WhatsApp.
    fetch('/api/leads', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
      body: JSON.stringify({ type: 'quote', service: fService.options[fService.selectedIndex].text, name: d.get('name'), phone: d.get('phone'),
        date: d.get('date') || '', guests: d.get('guests') || '', notes: d.get('notes') || '', website: d.get('website') || '', lang: LANG }),
    }).catch(() => {});
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener');
  });

  /* ---------- Visit and click counts (anonymous: a random id on this browser, no cookies, no names) ---------- */
  if (!PREVIEW) {
    let vid = '';
    try { vid = localStorage.getItem('lbv-vid') || ''; if (!vid) { vid = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('lbv-vid', vid); } }
    catch (e) { vid = Math.random().toString(36).slice(2); }
    const send = o => {
      try {
        const body = JSON.stringify({ v: vid, ...o });
        if (!(navigator.sendBeacon && navigator.sendBeacon('/api/track', body))) fetch('/api/track', { method: 'POST', body, keepalive: true }).catch(() => {});
      } catch (e) {}
    };
    let ref = '';
    try { const r = new URL(document.referrer); if (r.host !== location.host) ref = r.hostname; } catch (e) {}
    send({ t: 'view', lang: LANG, dev: matchMedia('(max-width: 760px)').matches ? 'mobile' : 'desktop', ref });
    addEventListener('sheet:change', e => { if (e.detail) send({ t: 'win', id: e.detail }); });
    document.addEventListener('click', e => {
      const a = e.target.closest('a, button');
      if (!a) return;
      const h = a.getAttribute('href') || '';
      const k = /wa.me|whatsapp/i.test(h) ? 'whatsapp' : h.startsWith('tel:') ? 'phone' : h.startsWith('mailto:') ? 'email'
        : /instagram.com/.test(h) ? 'instagram' : /tiktok.com/.test(h) ? 'tiktok' : /facebook.com/.test(h) ? 'facebook' : /youtube.com|youtu.be/.test(h) ? 'youtube'
        : a.matches('.vthumb') ? 'video' : /#contact$/.test(h) ? 'quote_open' : /gala./.test(h) ? 'gala_demo' : '';
      if (k) send({ t: 'click', k });
    }, true);
    document.addEventListener('submit', e => {
      if (e.target.id === 'quote') send({ t: 'click', k: 'quote_send' });
      else if (e.target === suForm) send({ t: 'click', k: 'signup_send' });
    }, true);
  }
})();
