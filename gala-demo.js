// The gala control room: our own showcase of the organisers' dashboard of the gala system,
// with demo data only. It builds its window (#control-room) before app.js wires up the windows.
// Nothing moves by itself: the numbers change only when the visitor presses a button.
(() => {
  const root = document.documentElement;
  const LANG = ['fr', 'en'].includes(root.lang) ? root.lang : 'he';
  const main = document.getElementById('main');
  if (!main) return;

  const X = {
    he: {
      title: 'לוח הבקרה של הערב', gala: 'ערב גאלה 2026', cause: 'למען ילדי הקהילה',
      intro: 'ככה המארגנים רואים את הערב שלהם: כל כרטיס, כל תשלום וכל שגריר, במסך אחד. נסו ללחוץ.',
      sale: 'מכירה חדשה', reset: 'איפוס', live: 'הדגמה',
      k: ['נאסף', 'כרטיסים', 'משתתפים', 'כרטיסי הגרלה', 'שולם', 'שגרירים'], of: 'מתוך יעד של', men: 'גברים', women: 'נשים',
      evo: 'התפתחות המכירות', evoSub: 'סכום מצטבר לפי יום', amb: 'השגרירים המובילים', sales: 'מכירות',
      dist: 'פילוח', distTabs: ['סוג כרטיס', 'אמצעי תשלום', 'סטטוס'], top: 'המכירות הגדולות',
      all: 'כל המכירות', allSub: n => `${n} מכירות בסך הכול`, search: 'חיפוש לפי שם',
      cols: ['תאריך', 'קונה', 'כרטיס', 'כמות', 'סכום', 'תשלום', 'סטטוס', 'שגריר'],
      tiers: ['ברונזה', 'כסף', 'זהב', 'יהלום'], methods: ['העברה בנקאית', 'ביט', 'מזומן', 'צ׳ק', 'התחייבות'],
      status: ['שולם', 'ממתין', 'אצל שגריר'],
      actions: ['מכירה ידנית', 'מכירת כרטיסי הגרלה', 'מעקב הגעה', 'ייצוא לאקסל'],
      raffleSold: n => `נמכרו ${n} כרטיסי הגרלה`, arrivals: (a, b) => `${a} מתוך ${b} אורחים כבר הגיעו לאולם`, exported: 'הקובץ ירד למחשב',
      newSale: (n, t) => `${n} קנה כרטיס ${t}`,
      note: 'כל השמות והמספרים כאן לדוגמה. במערכת האמיתית הכול מתעדכן בזמן אמת, מכל טלפון של כל שגריר.',
      cta: 'רוצים לוח כזה לערב שלכם?', ctaBtn: 'לדבר איתנו',
      people: ['יוסף אזולאי', 'שרה לוי', 'דוד פרץ', 'רחל ביטון', 'משה דהן', 'אסתר חדד', 'אברהם עמר', 'מרים כהן', 'יעקב אוחיון', 'חנה אלמליח', 'שמואל בן חמו', 'רבקה סעדה', 'אליהו טולדנו', 'לאה אסולין', 'נתן שושן', 'דבורה מימון', 'אהרן בוזגלו', 'יעל אבוטבול'],
      ambs: ['אלי כהן', 'מיכל לוי', 'רפאל אזולאי', 'נועה פרץ', 'דניאל ביטון', 'שירה דהן'],
    },
    fr: {
      title: 'Le tableau de bord de la soirée', gala: 'Gala 2026', cause: 'Au profit des enfants de la communauté',
      intro: 'Voici ce que voient les organisateurs : chaque billet, chaque paiement et chaque ambassadeur, sur un seul écran. Essayez.',
      sale: 'Nouvelle vente', reset: 'Réinitialiser', live: 'Démo',
      k: ['Collecte', 'Billets', 'Participants', 'Tombolas', 'Payé', 'Ambassadeurs'], of: 'sur un objectif de', men: 'Hommes', women: 'Femmes',
      evo: 'Évolution des ventes', evoSub: 'Montant cumulé par jour', amb: 'Top ambassadeurs', sales: 'ventes',
      dist: 'Répartition', distTabs: ['Type de billet', 'Paiement', 'Statut'], top: 'Plus grosses ventes',
      all: 'Toutes les ventes', allSub: n => `${n} ventes au total`, search: 'Rechercher un nom',
      cols: ['Date', 'Acheteur', 'Billet', 'Qté', 'Montant', 'Paiement', 'Statut', 'Ambassadeur'],
      tiers: ['Bronze', 'Argent', 'Or', 'Diamant'], methods: ['Virement', 'Bit', 'Espèces', 'Chèque', 'Promesse'],
      status: ['Payé', 'En attente', 'Chez l’ambassadeur'],
      actions: ['Vente manuelle', 'Vendre des tombolas', 'Suivi des arrivées', 'Export Excel'],
      raffleSold: n => `${n} tickets de tombola vendus`, arrivals: (a, b) => `${a} invités sur ${b} sont déjà arrivés`, exported: 'Le fichier est téléchargé',
      newSale: (n, t) => `${n} a acheté un billet ${t}`,
      note: 'Tous les noms et montants sont des exemples. Dans le vrai système, tout se met à jour en direct, depuis le téléphone de chaque ambassadeur.',
      cta: 'Un tableau comme celui-ci pour votre soirée ?', ctaBtn: 'Parlons-en',
      people: ['Yossef Azoulay', 'Sarah Levy', 'David Peretz', 'Rachel Bitton', 'Moché Dahan', 'Esther Haddad', 'Avraham Amar', 'Myriam Cohen', 'Yaakov Ohayon', 'Hanna Elmaleh', 'Chmouel Benhamou', 'Rivka Saadia', 'Elie Toledano', 'Léa Assoulin', 'Nathan Chouchan', 'Déborah Maimon', 'Aaron Bouzaglo', 'Yaël Aboutboul'],
      ambs: ['Eli Cohen', 'Michal Levy', 'Raphaël Azoulay', 'Noa Peretz', 'Daniel Bitton', 'Chira Dahan'],
    },
    en: {
      title: 'The evening’s control room', gala: 'Gala 2026', cause: 'For the children of the community',
      intro: 'This is what the organisers see: every ticket, every payment and every ambassador, on one screen. Try it.',
      sale: 'New sale', reset: 'Reset', live: 'Demo',
      k: ['Raised', 'Tickets', 'Guests', 'Raffle tickets', 'Paid', 'Ambassadors'], of: 'of a goal of', men: 'Men', women: 'Women',
      evo: 'Sales over time', evoSub: 'Running total per day', amb: 'Top ambassadors', sales: 'sales',
      dist: 'Breakdown', distTabs: ['Ticket type', 'Payment', 'Status'], top: 'Biggest sales',
      all: 'All sales', allSub: n => `${n} sales in total`, search: 'Search a name',
      cols: ['Date', 'Buyer', 'Ticket', 'Qty', 'Amount', 'Payment', 'Status', 'Ambassador'],
      tiers: ['Bronze', 'Silver', 'Gold', 'Diamond'], methods: ['Bank transfer', 'Bit', 'Cash', 'Cheque', 'Pledge'],
      status: ['Paid', 'Pending', 'With ambassador'],
      actions: ['Manual sale', 'Sell raffle tickets', 'Arrivals', 'Export to Excel'],
      raffleSold: n => `${n} raffle tickets sold`, arrivals: (a, b) => `${a} of ${b} guests have arrived`, exported: 'The file has been downloaded',
      newSale: (n, t) => `${n} bought a ${t} ticket`,
      note: 'All names and amounts are examples. In the real system everything updates live, from every ambassador’s phone.',
      cta: 'Want a control room like this for your evening?', ctaBtn: 'Talk to us',
      people: ['Yosef Azoulay', 'Sarah Levy', 'David Peretz', 'Rachel Bitton', 'Moshe Dahan', 'Esther Haddad', 'Avraham Amar', 'Miriam Cohen', 'Yaakov Ohayon', 'Hannah Elmaleh', 'Shmuel Benhamou', 'Rivka Saadia', 'Eli Toledano', 'Leah Assoulin', 'Nathan Shushan', 'Deborah Maimon', 'Aaron Bouzaglo', 'Yael Abutbul'],
      ambs: ['Eli Cohen', 'Michal Levy', 'Raphael Azoulay', 'Noa Peretz', 'Daniel Bitton', 'Shira Dahan'],
    },
  }[LANG];

  const CUR = LANG === 'fr' ? '€' : '₪';
  const LOCALE = { fr: 'fr-FR', en: 'en-US' }[LANG] || 'he-IL';
  const num = n => Math.round(n).toLocaleString(LOCALE);
  const money = n => LANG === 'fr' ? `${num(n)} €` : `${num(n)} ₪`;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const GOAL = 250000;
  const TIERS = [
    { price: 360, color: '#C9824A' }, { price: 540, color: '#C9D1DC' },
    { price: 900, color: '#E3B65C' }, { price: 1800, color: '#8FD3FF' },
  ];
  const METHOD_COLORS = ['#8B7CF6', '#22C3D6', '#8BCB4F', '#F27FB2', '#F2A93B'];
  const STATUS_COLORS = ['#34D399', '#F2A93B', '#8B9CF6'];
  const DAYS = 21;

  // A seeded generator, so the demo looks the same on every visit.
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pickW = w => { let r = rnd() * w.reduce((a, b) => a + b, 0); return w.findIndex(x => (r -= x) < 0); };
  const makeSale = day => {
    const tier = pickW([30, 32, 26, 12]), qty = 1 + pickW([40, 38, 14, 8]);
    return {
      day, buyer: Math.floor(rnd() * X.people.length), tier, qty, amount: TIERS[tier].price * qty,
      method: pickW([34, 26, 12, 10, 18]), status: pickW([70, 18, 12]), amb: pickW([24, 20, 17, 15, 13, 11]),
      raffle: pickW([30, 40, 20, 10]), men: 0,
    };
  };
  let sales = [];
  const reset = () => {
    seed = 7;
    sales = [];
    for (let d = 0; d < DAYS; d++) {
      const n = Math.round(1 + d * 0.22 + rnd() * 3 + (d > DAYS - 5 ? 3 : 0));
      for (let i = 0; i < n; i++) sales.push(makeSale(d));
    }
    sales.forEach(s => { s.men = Math.round(s.qty * (0.35 + rnd() * 0.3)); });
  };
  reset();

  const sec = document.createElement('section');
  sec.className = 'sheet sheet--dark gd';
  sec.id = 'control-room';
  sec.dataset.title = X.title;
  sec.innerHTML = `
  <div class="wrap gd__wrap">
    <header class="gd__head">
      <div class="gd__id">
        <img src="${root.dataset.media || 'media/'}logo-events.png" alt="" width="60" height="53">
        <div><h2 class="gd__title">${esc(X.gala)}</h2><p>${esc(X.cause)}</p></div>
        <span class="gd__pill">${esc(X.live)}</span>
      </div>
      <div class="gd__btns">
        <button class="btn btn--sun" type="button" data-act="sale">+ ${esc(X.sale)}</button>
        <button class="btn btn--line" type="button" data-act="reset">${esc(X.reset)}</button>
      </div>
    </header>
    <p class="gd__intro">${esc(X.intro)}</p>

    <div class="gd__kpis">
      <div class="gd__kpi gd__kpi--hero"><svg class="gd__ring" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52"/><circle class="gd__ringval" cx="60" cy="60" r="52" data-k="ring"/></svg>
        <div><small>${esc(X.k[0])}</small><b data-k="raised"></b><span data-k="goal"></span></div></div>
      <div class="gd__kpi"><small>${esc(X.k[1])}</small><b data-k="tickets"></b><span class="gd__mini" data-k="tierbar"></span></div>
      <div class="gd__kpi"><small>${esc(X.k[2])}</small><b data-k="guests"></b><span class="gd__split"><i data-k="menbar"></i></span><span class="gd__legend" data-k="mw"></span></div>
      <div class="gd__kpi"><small>${esc(X.k[3])}</small><b data-k="raffle"></b><span class="gd__dots" data-k="raffledots"></span></div>
      <div class="gd__kpi"><small>${esc(X.k[4])}</small><b data-k="paid"></b><span class="gd__bar"><i data-k="paidbar"></i></span></div>
      <div class="gd__kpi"><small>${esc(X.k[5])}</small><b data-k="ambs"></b><span class="gd__faces" data-k="faces"></span></div>
    </div>

    <div class="gd__grid">
      <article class="gd__card gd__card--chart"><h3>${esc(X.evo)}</h3><p class="gd__sub">${esc(X.evoSub)}</p><div class="gd__chart" data-k="chart"></div></article>
      <article class="gd__card"><h3>${esc(X.amb)}</h3><ol class="gd__amb" data-k="amb"></ol></article>
      <article class="gd__card"><div class="gd__cardhead"><h3>${esc(X.dist)}</h3>
        <div class="gd__seg" role="tablist">${X.distTabs.map((t, i) => `<button type="button" role="tab" data-dist="${i}" aria-selected="${i === 0}">${esc(t)}</button>`).join('')}</div></div>
        <div class="gd__donut" data-k="donut"></div></article>
      <article class="gd__card"><h3>${esc(X.top)}</h3><ol class="gd__top" data-k="top"></ol></article>
    </div>

    <article class="gd__card gd__tablecard">
      <div class="gd__cardhead"><div><h3>${esc(X.all)}</h3><p class="gd__sub" data-k="count"></p></div>
        <label class="gd__search"><span class="sr-only">${esc(X.search)}</span><input type="search" placeholder="${esc(X.search)}" data-k="q"></label></div>
      <div class="gd__tablewrap"><table class="gd__table"><thead><tr>${X.cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody data-k="rows"></tbody></table></div>
    </article>

    <div class="gd__actions">${X.actions.map((a, i) => `<button type="button" class="gd__action" data-act="${['manual', 'raffle', 'arrivals', 'export'][i]}"><span aria-hidden="true">${['+', '◎', '✓', '⇩'][i]}</span>${esc(a)}</button>`).join('')}</div>
    <p class="gd__note">${esc(X.note)}</p>
    <div class="gd__cta"><b>${esc(X.cta)}</b><a class="btn btn--sun" href="#contact" data-service="gala">${esc(X.ctaBtn)}</a></div>
    <div class="gd__toast" role="status" aria-live="polite"></div>
  </div>`;
  main.append(sec);

  const $ = k => sec.querySelector(`[data-k="${k}"]`);
  let dist = 0, query = '', fresh = -1, arrived = 0;
  const shown = {};
  // Numbers glide to their new value when they change (only after a click).
  const setNum = (k, v, fmt = num) => {
    const el = $(k), from = shown[k] ?? v;
    shown[k] = v;
    if (from === v || matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = fmt(v); return; }
    const t0 = performance.now();
    const step = t => { const p = Math.min(1, (t - t0) / 700), e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(from + (v - from) * e); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };

  const dayLabel = d => { const dt = new Date(2026, 1, 1 + d); return dt.toLocaleDateString(LOCALE, { day: '2-digit', month: '2-digit' }); };

  function render() {
    const total = sales.reduce((a, s) => a + s.amount, 0);
    const tickets = sales.reduce((a, s) => a + s.qty, 0);
    const men = sales.reduce((a, s) => a + s.men, 0);
    const raffle = sales.reduce((a, s) => a + s.raffle, 0);
    const paidAmt = sales.filter(s => s.status === 0).reduce((a, s) => a + s.amount, 0);
    const paidPct = total ? Math.round(paidAmt / total * 100) : 0;

    setNum('raised', total, money);
    $('goal').textContent = `${X.of} ${money(GOAL)}`;
    $('ring').style.strokeDasharray = `${Math.min(1, total / GOAL) * 326.7} 326.7`;
    setNum('tickets', tickets);
    const byTier = TIERS.map((_, i) => sales.filter(s => s.tier === i).reduce((a, s) => a + s.qty, 0));
    $('tierbar').innerHTML = byTier.map((n, i) => `<i style="flex:${n};background:${TIERS[i].color}" title="${esc(X.tiers[i])}: ${n}"></i>`).join('');
    setNum('guests', tickets);
    $('menbar').style.width = (men / tickets * 100) + '%';
    $('mw').innerHTML = `<span>${esc(X.men)} ${num(men)}</span><span>${esc(X.women)} ${num(tickets - men)}</span>`;
    setNum('raffle', raffle);
    $('raffledots').innerHTML = Array.from({ length: 12 }, (_, i) => `<i class="${i < Math.round(raffle / 20) ? 'on' : ''}"></i>`).join('');
    setNum('paid', paidPct, v => Math.round(v) + '%');
    $('paidbar').style.width = paidPct + '%';
    setNum('ambs', X.ambs.length);
    $('faces').innerHTML = X.ambs.map((a, i) => `<i style="--h:${i * 55}">${esc(a.trim().charAt(0))}</i>`).join('');

    // Running total per day.
    const perDay = Array(DAYS).fill(0);
    sales.forEach(s => { perDay[s.day] += s.amount; });
    let run = 0;
    const cum = perDay.map(v => (run += v));
    const W = 600, H = 220, P = 8, max = Math.max(GOAL, run) * 1.02;
    const pts = cum.map((v, i) => [P + i * (W - 2 * P) / (DAYS - 1), H - P - v / max * (H - 2 * P)]);
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const goalY = H - P - GOAL / max * (H - 2 * P);
    const bars = perDay.map((v, i) => { const h = v / Math.max(...perDay) * 60; return `<rect x="${(pts[i][0] - 7).toFixed(1)}" y="${H - P - h}" width="14" height="${h}" rx="3"/>`; }).join('');
    $('chart').innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" class="gd__svg" aria-hidden="true">
      <defs><linearGradient id="gdArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#E3B65C" stop-opacity=".45"/><stop offset="1" stop-color="#E3B65C" stop-opacity="0"/></linearGradient></defs>
      <line x1="0" x2="${W}" y1="${goalY}" y2="${goalY}" class="gd__goal"/>
      <g class="gd__bars">${bars}</g>
      <path d="${line} L ${pts[DAYS - 1][0]} ${H - P} L ${pts[0][0]} ${H - P} Z" fill="url(#gdArea)"/>
      <path d="${line}" class="gd__line"/>
      <circle cx="${pts[DAYS - 1][0]}" cy="${pts[DAYS - 1][1]}" r="6" class="gd__head-dot"/>
    </svg>
    <span class="gd__goaltag" style="top:${goalY / H * 100}%">${money(GOAL)}</span>
    <div class="gd__axis"><span>${dayLabel(0)}</span><span>${dayLabel(10)}</span><span>${dayLabel(DAYS - 1)}</span></div>
    <div class="gd__tip" hidden></div>`;
    const chart = $('chart'), tip = chart.querySelector('.gd__tip');
    chart.onpointermove = e => {
      const r = chart.getBoundingClientRect(), x = (e.clientX - r.left) / r.width;
      const i = Math.max(0, Math.min(DAYS - 1, Math.round(x * (DAYS - 1))));
      tip.hidden = false;
      tip.style.left = (pts[i][0] / W * 100) + '%';
      tip.style.top = (pts[i][1] / H * 100) + '%';
      tip.innerHTML = `<b>${money(cum[i])}</b><span>${dayLabel(i)} · +${money(perDay[i])}</span>`;
    };
    chart.onpointerleave = () => { tip.hidden = true; };

    // Ambassadors, ranked.
    const amb = X.ambs.map((name, i) => {
      const mine = sales.filter(s => s.amb === i);
      return { name, i, n: mine.length, amount: mine.reduce((a, s) => a + s.amount, 0) };
    }).sort((a, b) => b.amount - a.amount);
    const top = amb[0].amount;
    $('amb').innerHTML = amb.slice(0, 5).map((a, r) => `<li><span class="gd__rank">${r + 1}</span><i style="--h:${a.i * 55}">${esc(a.name.charAt(0))}</i>
      <div><b>${esc(a.name)}</b><span>${a.n} ${esc(X.sales)}</span><em><u style="width:${a.amount / top * 100}%"></u></em></div><strong>${money(a.amount)}</strong></li>`).join('');

    // Breakdown donut.
    const sets = [
      { names: X.tiers, colors: TIERS.map(t => t.color), vals: byTier },
      { names: X.methods, colors: METHOD_COLORS, vals: X.methods.map((_, i) => sales.filter(s => s.method === i).length) },
      { names: X.status, colors: STATUS_COLORS, vals: X.status.map((_, i) => sales.filter(s => s.status === i).length) },
    ];
    const set = sets[dist], sum = set.vals.reduce((a, b) => a + b, 0) || 1, C = 2 * Math.PI * 54;
    let off = 0;
    const arcs = set.vals.map((v, i) => { const len = v / sum * C; const a = `<circle cx="70" cy="70" r="54" stroke="${set.colors[i]}" stroke-dasharray="${Math.max(0, len - 2)} ${C}" stroke-dashoffset="${-off}"/>`; off += len; return a; }).join('');
    $('donut').innerHTML = `<svg viewBox="0 0 140 140" aria-hidden="true"><g transform="rotate(-90 70 70)">${arcs}</g><text x="70" y="68" class="gd__dn">${num(sum)}</text><text x="70" y="88" class="gd__dl">${esc(X.distTabs[dist])}</text></svg>
      <ul>${set.names.map((n, i) => `<li><i style="background:${set.colors[i]}"></i><span>${esc(n)}</span><b>${num(set.vals[i])}</b><small>${Math.round(set.vals[i] / sum * 100)}%</small></li>`).join('')}</ul>`;

    // Biggest sales.
    $('top').innerHTML = [...sales].sort((a, b) => b.amount - a.amount).slice(0, 5).map(s => `<li><i style="background:${TIERS[s.tier].color}"></i>
      <div><b>${esc(X.people[s.buyer])}</b><span>${esc(X.tiers[s.tier])} × ${s.qty}</span></div><strong>${money(s.amount)}</strong></li>`).join('');

    // All sales, newest first.
    const list = sales.map((s, i) => ({ s, i })).reverse().filter(({ s }) => !query || X.people[s.buyer].toLowerCase().includes(query));
    $('count').textContent = X.allSub(sales.length);
    $('rows').innerHTML = list.slice(0, 40).map(({ s, i }) => `<tr class="${i === fresh ? 'is-new' : ''}">
      <td data-l="${esc(X.cols[0])}">${dayLabel(s.day)}</td><td data-l="${esc(X.cols[1])}"><b>${esc(X.people[s.buyer])}</b></td>
      <td data-l="${esc(X.cols[2])}"><span class="gd__chip" style="--c:${TIERS[s.tier].color}">${esc(X.tiers[s.tier])}</span></td>
      <td data-l="${esc(X.cols[3])}">${s.qty}</td><td data-l="${esc(X.cols[4])}"><b>${money(s.amount)}</b></td>
      <td data-l="${esc(X.cols[5])}">${esc(X.methods[s.method])}</td>
      <td data-l="${esc(X.cols[6])}"><span class="gd__status" style="--c:${STATUS_COLORS[s.status]}">${esc(X.status[s.status])}</span></td>
      <td data-l="${esc(X.cols[7])}">${esc(X.ambs[s.amb])}</td></tr>`).join('');
  }

  let toastTimer;
  const toast = msg => {
    const t = sec.querySelector('.gd__toast');
    t.textContent = msg; t.classList.add('is-on');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('is-on'), 3200);
  };
  const addSale = () => {
    const s = makeSale(DAYS - 1);
    s.men = Math.round(s.qty * 0.5);
    sales.push(s); fresh = sales.length - 1;
    render();
    toast(X.newSale(X.people[s.buyer], X.tiers[s.tier]));
  };

  sec.addEventListener('click', e => {
    const b = e.target.closest('[data-act],[data-dist]');
    if (!b) return;
    if (b.dataset.dist) {
      dist = Number(b.dataset.dist);
      sec.querySelectorAll('[data-dist]').forEach(x => x.setAttribute('aria-selected', String(x === b)));
      return render();
    }
    const act = b.dataset.act;
    if (act === 'sale' || act === 'manual') addSale();
    if (act === 'reset') { reset(); fresh = -1; arrived = 0; render(); }
    if (act === 'raffle') { const n = 5; sales[sales.length - 1].raffle += n; render(); toast(X.raffleSold(n)); }
    if (act === 'arrivals') {
      const all = sales.reduce((a, s) => a + s.qty, 0);
      arrived = Math.min(all, arrived + Math.ceil(all * 0.18));
      toast(X.arrivals(num(arrived), num(all)));
    }
    if (act === 'export') {
      const rows = [X.cols].concat(sales.map(s => [dayLabel(s.day), X.people[s.buyer], X.tiers[s.tier], s.qty, s.amount, X.methods[s.method], X.status[s.status], X.ambs[s.amb]]));
      const csv = '﻿' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      a.download = 'gala-demo.csv';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      toast(X.exported);
    }
  });
  $('q').addEventListener('input', e => { query = e.target.value.trim().toLowerCase(); render(); });
  render();
})();
