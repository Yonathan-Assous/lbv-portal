(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const WA = '972585182655';

  // The same script serves the Hebrew page (/) and the French page (/fr/).
  const root = document.documentElement;
  const LANG = root.lang === 'fr' ? 'fr' : 'he';
  const RTL = root.dir === 'rtl';
  const MEDIA = root.dataset.media || 'media/';
  const VSUFFIX = root.dataset.vsuffix || '';
  const ils = n => n.toLocaleString(LANG === 'fr' ? 'fr-FR' : 'he-IL');

  const T = {
    he: {
      families: ['משפחת כהן', 'משפחת לוי', 'משפחת אזולאי', 'משפחת פרץ', 'משפחת ביטון', 'משפחת דהן', 'משפחת אוחיון', 'משפחת חדד', 'משפחת עמר', 'משפחת סעדה', 'משפחת אלמליח', 'משפחת בן חמו', 'אנונימי'],
      people: ['יוסף אזולאי', 'שרה לוי', 'דוד פרץ', 'רחל ביטון', 'משה דהן', 'אסתר חדד', 'אברהם עמר', 'מרים כהן', 'יעקב אוחיון', 'חנה אלמליח', 'שמואל בן חמו', 'רבקה סעדה'],
      prizes: ['סוף שבוע זוגי במלון', 'נופש פסח למשפחה', 'ארוחה זוגית במסעדה', 'סט כלי כסף לשבת'],
      ticket: 'כרטיס מס׳ ',
      nextPrize: 'להגרלת הפרס הבא',
      seat: 'לסדר את השולחנות',
      seated: 'כל האורחים הושבו. לאפס',
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
      seat: 'Placer les invités',
      seated: 'Tous les invités sont placés. Recommencer',
      fields: { service: 'service', name: 'nom', phone: 'téléphone' },
      missing: list => 'Il manque : ' + list.join(', ') + '. Complétez puis réessayez.',
      msg: ['Bonjour La Belle Vie, je souhaite recevoir un devis.', 'Service : ', 'Nom : ', 'Téléphone : ', 'Date : ', 'Nombre de personnes : ', 'Remarques : '],
    },
  }[LANG];

  /* ---------- Editable content (managed from /admin) ---------- */
  // The HTML ships with the same content, so the page reads fine before (or without) this step.
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const asset = p => !p ? '' : /^(https?:|data:|\/)/.test(p) ? p : MEDIA + p.replace(/^media\//, '');
  const SITE = MEDIA.replace(/media\/$/, '');
  async function loadContent() {
    for (const url of ['/api/content', SITE + 'content.json']) {
      try {
        const r = await fetch(url, { cache: 'no-store' });
        if (r.ok) return await r.json();
      } catch (e) {}
    }
    return null;
  }
  function renderContent(c) {
    if (!c) return;
    const L = LANG;
    const ceo = c.ceo && c.ceo[L];
    const letter = $('.letter__body');
    if (ceo && letter) {
      letter.innerHTML = `<h3 class="h3">${esc(ceo.title)}</h3>` +
        ceo.paragraphs.filter(p => p.trim()).map(p => `<p>${esc(p)}</p>`).join('') +
        `<p class="letter__sign">${esc(ceo.name)}<small>${esc(ceo.role)}</small></p>`;
      if (c.ceo.photo) $('.letter__photo img').src = asset(c.ceo.photo);
    }
    const team = $('.team');
    if (team && Array.isArray(c.team)) {
      // A member without a photo yet gets a monogram tile until one is uploaded from the admin.
      team.innerHTML = c.team.map(m => {
        const pic = m.photo
          ? `<img src="${esc(asset(m.photo))}" alt="" loading="lazy" width="480" height="600">`
          : `<span class="team__mono" aria-hidden="true">${esc((m[L]?.name || '').replace(/[׳']/g, '').trim().charAt(0))}</span>`;
        return `<li>${pic}<b>${esc(m[L]?.name)}</b><span>${esc(m[L]?.role)}</span></li>`;
      }).join('');
    }
    const trips = (c.trips || []).filter(t => t.status !== 'hidden');
    const badge = t => t.status === 'open'
      ? `<span class="badge">${L === 'fr' ? 'Réservations ouvertes' : 'ההרשמה פתוחה'}</span>`
      : `<span class="badge badge--soft">${L === 'fr' ? 'Bientôt' : 'בקרוב'}</span>`;
    const subs = $('.door__subs');
    if (subs) subs.innerHTML = trips.map(t => `<li><b>${esc(t[L]?.name)}</b> ${esc(t[L]?.subline || '')} ${badge(t)}</li>`).join('');
    const cards = $('.trips');
    if (cards) {
      const soonArt = $('.trips__card--soon svg')?.outerHTML || '';
      cards.innerHTML = trips.map(t => {
        const book = t.bookingUrl && t.bookingUrl[L];
        const href = t.link || book || '#contact';
        const ext = /^https?:/.test(href) ? ' target="_blank" rel="noopener"' : '';
        const visual = t.image ? `<img src="${esc(asset(t.image))}" alt="" loading="lazy">` : soonArt;
        return `<li><a href="${esc(href)}"${ext} class="trips__card${t.image ? '' : ' trips__card--soon'}">${visual}${badge(t)}<b>${esc(t[L]?.name)}</b><small>${esc(t[L]?.place)}</small></a></li>`;
      }).join('');
    }
    const rail = $('#rail');
    if (rail && Array.isArray(c.videos) && c.videos.length) {
      rail.innerHTML = c.videos.map(v => {
        const x = v[L] || v.he;
        return `<button class="vthumb" data-src="${esc(asset(x.file))}" data-poster="${esc(asset(x.poster))}" data-title="${esc(x.title)}"><img src="${esc(asset(x.poster))}" alt="" loading="lazy"><span class="vthumb__play" aria-hidden="true"></span><span class="vthumb__label">${esc(x.title)}</span></button>`;
      }).join('');
    }
  }
  loadContent().then(renderContent);

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
  const closeLabel = LANG === 'fr' ? 'Retour à l’accueil' : 'חזרה לדף הראשי';
  sheets.forEach(s => {
    const barEl = document.createElement('div');
    barEl.className = 'sheet__bar';
    barEl.innerHTML = `<button class="sheet__close" type="button">${RTL ? '&#8594;' : '&#8592;'} ${closeLabel}</button><strong>${s.dataset.title || ''}</strong>`;
    s.prepend(barEl);
    // Windows with a data-hero image get the dark theme and a cinematic banner carrying their title.
    if (s.dataset.hero) {
      const src = MEDIA + s.dataset.hero;
      const media = /\.mp4$/.test(src)
        ? `<video src="${src}" autoplay muted loop playsinline aria-hidden="true"></video>`
        : `<img src="${src}" alt="" loading="lazy">`;
      const hero = document.createElement('header');
      hero.className = 'sheet-hero';
      hero.innerHTML = `${media}<div class="wrap"><h2>${s.dataset.heroText || s.dataset.title}</h2></div><span class="horizon__line"></span>`;
      barEl.after(hero);
      s.classList.add('sheet--dark', 'has-hero');
    }
    barEl.querySelector('button').addEventListener('click', () => closeSheet(true));
  });
  let openSheetEl = null, pageY = 0;
  function openSheet(sheet, target) {
    if (openSheetEl !== sheet) {
      if (!openSheetEl) pageY = scrollY;
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
  addEventListener('keydown', e => { if (e.key === 'Escape' && openSheetEl && !$('#player').open) closeSheet(true); });
  route();

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
  const rail = $('#rail');
  $$('[data-rail]').forEach(b => b.addEventListener('click', () => {
    // "Next" moves toward the reading direction: left in Hebrew, right in French.
    const dir = RTL ? -1 : 1;
    rail.scrollBy({ left: dir * Number(b.dataset.rail) * rail.clientWidth * 0.8, behavior: reduced ? 'auto' : 'smooth' });
  }));

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

  /* ---------- Gala tabs ---------- */
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
    lbvShowModule(tile.dataset.mod, tile.dataset.tab, tile);
    const panel = modPanels.find(p => p.dataset.mod === tile.dataset.mod);
    if (panel) setTimeout(() => panel.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }), 30);
  }));

  /* ---------- Live donations demo ---------- */
  const gifts = [180, 360, 500, 770, 1000, 1800, 2600, 3600, 5000, 10000];
  const GOAL = 250000;
  let total = 0, shown = 0;
  const dTotal = $('#dTotal'), dBar = $('#dBar'), dFeed = $('#dFeed');

  const tween = (from, to) => {
    if (reduced) { dTotal.textContent = ils(to) + ' ₪'; return; }
    const t0 = performance.now();
    const step = now => {
      const k = Math.min(1, (now - t0) / 700);
      shown = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
      dTotal.textContent = ils(shown) + ' ₪';
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const donate = amount => {
    const prev = total;
    total = Math.min(GOAL, total + amount);
    tween(prev, total);
    dBar.style.width = (total / GOAL * 100) + '%';
    const li = document.createElement('li');
    li.innerHTML = `<span>${pick(T.families)}</span><b>${ils(amount)} ₪</b>`;
    dFeed.prepend(li);
    while (dFeed.children.length > 6) dFeed.lastChild.remove();
  };
  $('#dAdd').addEventListener('click', () => donate(pick(gifts)));

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
      total = 136000;
      [1800, 360, 3600].forEach(donate);
    }
    donateTimer = setInterval(() => { if (total < GOAL * 0.96) donate(pick(gifts)); }, 2200);
  };
  const stopDonations = () => { clearInterval(donateTimer); donateTimer = null; };
  addEventListener('sheet:change', e => (e.detail === 'gala' ? startDonations : stopDonations)());
  if ($('#gala.is-open')) { startDonations(); simStart(); }

  /* ---------- Raffle demo ---------- */
  const rName = $('#rName'), rTicket = $('#rTicket'), rGo = $('#rGo'), raffle = $('.raffle'), rPrize = $('#rPrize');
  let prizeIdx = 0, spinning = false;

  rGo.addEventListener('click', () => {
    if (spinning) return;
    if (raffle.classList.contains('is-won')) {
      prizeIdx = (prizeIdx + 1) % T.prizes.length;
      rPrize.textContent = T.prizes[prizeIdx];
    }
    spinning = true;
    raffle.classList.remove('is-won');
    rGo.disabled = true;
    const end = performance.now() + (reduced ? 0 : 2600);
    let delay = 50;
    const tick = () => {
      rName.textContent = pick(T.people);
      rTicket.textContent = T.ticket + String(1000 + Math.floor(Math.random() * 900));
      if (performance.now() < end) { delay *= 1.09; setTimeout(tick, delay); return; }
      raffle.classList.add('is-won');
      burst();
      spinning = false;
      rGo.disabled = false;
      rGo.textContent = T.nextPrize;
    };
    tick();
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

  /* ---------- Wedding seating demo ---------- */
  const hall = $('#hall');
  const TABLES = 9, SEATS = 10;
  for (let t = 0; t < TABLES; t++) {
    const el = document.createElement('div');
    el.className = 'table';
    let seats = '';
    for (let s = 0; s < SEATS; s++) seats += `<i class="seat" style="--a:${s * 360 / SEATS}deg"></i>`;
    el.innerHTML = seats + `<span class="table__top">${t + 1}</span>`;
    hall.appendChild(el);
  }
  // Table groups: groom's family, bride's family, friends.
  const plan = ['g1', 'g1', 'g1', 'g2', 'g2', 'g2', 'g3', 'g3', 'g3'];
  const seatBtn = $('#seatBtn');
  let seated = false, seating = false;
  seatBtn.addEventListener('click', () => {
    if (seating) return;
    const all = $$('.table', hall);
    if (seated) {
      $$('.seat', hall).forEach(s => s.className = 'seat');
      seated = false; seatBtn.textContent = T.seat;
      return;
    }
    seating = true;
    let i = 0;
    const order = [];
    all.forEach((t, ti) => $$('.seat', t).forEach((s, si) => { if (!(ti === 8 && si > 5)) order.push([s, plan[ti]]); }));
    const step = () => {
      for (let k = 0; k < 3 && i < order.length; k++, i++) {
        const [s, g] = order[i];
        s.classList.add(g, 'is-in');
        setTimeout(() => s.classList.remove('is-in'), 300);
      }
      if (i < order.length) setTimeout(step, reduced ? 0 : 28);
      else { seating = false; seated = true; seatBtn.textContent = T.seated; }
    };
    step();
  });

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
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener');
  });
})();
