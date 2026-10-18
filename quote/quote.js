// A La Belle Vie quote, as the client sees it: /quote/?id=q-…&t=… (the signed link the admin sends).
// It opens behind gold-locked doors, then lays the quote out on real A4 pages, each with the logo header.
(function () {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const qs = new URLSearchParams(location.search);
  const id = qs.get('id') || '', token = qs.get('t') || '';
  const api = `/api/quotes?view=${encodeURIComponent(id)}&t=${encodeURIComponent(token)}`;
  const PAGE_W = 794;

  const L = {
    he: {
      kind: 'הצעת מחיר', forYou: 'הצעה אישית עבור', open: 'לפתיחת ההצעה', page: (i, n) => `עמוד ${i} מתוך ${n}`,
      to: 'לכבוד', event: 'האירוע', date: 'תאריך', place: 'מקום', guests: 'משתתפים', tbd: 'להשלמה',
      number: 'הצעה מס׳', issued: 'תאריך', valid: 'בתוקף עד', included: 'מה כלול בהצעה', fin: 'הצעה כספית', item: 'פירוט', amount: 'סכום',
      qty: 'כמות', incl: 'כלול', subtotal: 'סה״כ', discount: 'הנחה', vat: 'מע״מ', total: 'סה״כ לתשלום', monthly: 'ובנוסף, החבילה החודשית שתבחרו',
      vatIncl: 'המחירים כוללים מע״מ.', vatNone: 'ללא מע״מ.', vatPart: 'מתוכו מע״מ', payment: 'תנאי תשלום', validity: 'תוקף ההצעה',
      validText: (d, date) => `ההצעה בתוקף ${d} ימים, עד ${date}.`, rec: 'מומלץ',
      okTitle: 'אישור ההצעה', okText: 'מתאים לכם? כתבו את השם המלא ולחצו על האישור. נקבל הודעה ונחזור אליכם.', okPick: 'איזו חבילה מתאימה לכם?',
      okName: 'השם המלא', okBtn: 'אני מאשר/ת את ההצעה', okDone: 'ההצעה אושרה', okBy: (n, d, p) => `אושרה על ידי ${n}, ב־${d}${p ? `, בחבילת ${p}` : ''}. תודה! נחזור אליכם בהקדם.`,
      okErr: 'לא הצלחנו לשמור את האישור. נסו שוב, או כתבו לנו בוואטסאפ.', print: 'הורדה כ־PDF / הדפסה',
      signName: 'שם', signDate: 'תאריך וחתימה', notFound: 'ההצעה לא נמצאה. ודאו שהקישור שלם, או פנו אלינו.', clientDefault: 'המוסד', cont: '(המשך)',
    },
    fr: {
      kind: 'Devis', forYou: 'Une proposition personnelle pour', open: 'Ouvrir le devis', page: (i, n) => `Page ${i} / ${n}`,
      to: 'À l’attention de', event: 'L’événement', date: 'Date', place: 'Lieu', guests: 'Participants', tbd: 'À compléter',
      number: 'Devis n°', issued: 'Date', valid: 'Valable jusqu’au', included: 'Ce que comprend la prestation', fin: 'Proposition financière', item: 'Désignation', amount: 'Montant',
      qty: 'Qté', incl: 'Inclus', subtotal: 'Total', discount: 'Remise', vat: 'TVA', total: 'Total à payer', monthly: 'Puis le forfait mensuel choisi',
      vatIncl: 'Prix TTC.', vatNone: 'Hors TVA.', vatPart: 'dont TVA', payment: 'Modalités de paiement', validity: 'Validité du devis',
      validText: (d, date) => `Devis valable ${d} jours, jusqu’au ${date}.`, rec: 'Recommandé',
      okTitle: 'Bon pour accord', okText: 'Cela vous convient ? Indiquez votre nom complet et validez. Nous serons prévenus et reviendrons vers vous.', okPick: 'Quel forfait vous convient ?',
      okName: 'Nom complet', okBtn: 'J’accepte ce devis', okDone: 'Devis accepté', okBy: (n, d, p) => `Accepté par ${n}, le ${d}${p ? `, forfait ${p}` : ''}. Merci ! Nous revenons vers vous rapidement.`,
      okErr: 'L’accord n’a pas pu être enregistré. Réessayez, ou écrivez-nous sur WhatsApp.', print: 'Télécharger en PDF / imprimer',
      signName: 'Nom', signDate: 'Date et signature', notFound: 'Devis introuvable. Vérifiez le lien complet, ou contactez-nous.', clientDefault: 'votre institution', cont: '(suite)',
    },
  };
  const CONTACT0 = { whatsapp: '058-518-2655', phone: '058-518-2655', phone2: '058-555-1826', email: 'LBV0585551826@gmail.com' };
  const intl = s => { let d = String(s || '').replace(/[^\d]/g, ''); if (d.startsWith('0')) d = '972' + d.slice(1); return d; };
  const money = (v, cur, lang) => new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'he-IL', { style: 'currency', currency: cur === 'EUR' ? 'EUR' : 'ILS', maximumFractionDigits: 2 }).format(v);
  const dateStr = (d, lang) => d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
  /** Totals, the same way the admin computes them: priced chapters + extra lines + the packages' setup. */
  function totals(q) {
    const sub = (q.sections || []).reduce((s, x) => s + (Number(x.price) || 0), 0)
      + (q.items || []).reduce((s, it) => s + (Number(it.qty) || 1) * (Number(it.price) || 0), 0)
      + (q.packages && q.packages.setup ? Number(q.packages.setup.price) || 0 : 0);
    const after = Math.max(0, sub - (Number(q.discount) || 0));
    const r = (Number(q.vatRate) || 18) / 100;
    if (q.vat === 'plus') return { sub, after, vat: after * r, total: after * (1 + r) };
    if (q.vat === 'incl') return { sub, after, vat: after - after / (1 + r), total: after };
    return { sub, after, vat: 0, total: after };
  }

  /** The quote as a list of blocks; the page layout puts as many as fit on each A4 page. */
  function blocks(q, t, lang, contact) {
    const who = (q.client && q.client.name) || t.clientDefault;
    const fill = s => esc(String(s || '').replace(/\{client\}/g, who));
    const tbd = v => v ? esc(v) : `<span class="tbd">${t.tbd}</span>`;
    const cur = v => money(v, q.currency, lang);
    const issued = new Date(q.createdAt || Date.now());
    const until = new Date(issued.getTime() + (Number(q.validDays) || 14) * 86400000);
    const tot = totals(q);
    const out = [];

    out.push(`<div class="q-title"><h1>${esc(q.title || t.kind)}</h1>${q.subtitle ? `<p>${esc(q.subtitle)}</p>` : ''}
      <div class="q-meta"><span>${t.number} <b>${esc(q.number || '')}</b></span><span>${t.issued}: ${dateStr(issued, lang)}</span><span>${t.valid}: ${dateStr(until, lang)}</span></div></div>`);
    out.push(`<div class="q-parts">
      <div class="q-box"><h2>${t.to}</h2><p class="big">${esc(who)}</p>
        ${q.client?.phone ? `<p><bdi dir="ltr">${esc(q.client.phone)}</bdi></p>` : ''}${q.client?.email ? `<p><bdi dir="ltr">${esc(q.client.email)}</bdi></p>` : ''}</div>
      <div class="q-box"><h2>${t.event}</h2>${q.event?.type ? `<p class="big">${esc(q.event.type)}</p>` : ''}
        <p>${t.date}: ${tbd(q.event?.date)} · ${t.place}: ${tbd(q.event?.place)}</p><p>${t.guests}: ${tbd(q.event?.guests)}</p></div></div>`);
    if (q.intro) out.push(`<p class="q-intro">${fill(q.intro)}</p>`);

    const secs = q.sections || [];
    if (secs.length) {
      out.push(`<h2 class="q-h">${t.included}</h2>`);
      secs.forEach((s, i) => {
        const price = Number(s.price) ? `<span class="q-price">${cur(Number(s.price))}${s.unit ? ` <small>${esc(s.unit)}</small>` : ''}</span>` : '';
        const head = cont => `<h3><span class="q-num">${i + 1}</span>${fill(s.title)}${cont ? ` <small>${t.cont}</small>` : price}</h3>`;
        const bl = s.bullets || [];
        // Long chapters are split in two so a page never overflows.
        const part = (from, to, cont) => `<section class="q-sec">${head(cont)}<ul>${bl.slice(from, to).map(b => `<li>${fill(b)}</li>`).join('')}</ul></section>`;
        if (bl.length > 7) out.push({ html: part(0, bl.length), split: [part(0, Math.ceil(bl.length / 2)), part(Math.ceil(bl.length / 2), bl.length, true)] });
        else out.push(part(0, bl.length));
      });
    }

    const pk = q.packages;
    if (pk && pk.options && pk.options.length) {
      out.push(`<h2 class="q-h">${fill(pk.title)}</h2>${pk.intro ? `<p class="q-pk-intro">${fill(pk.intro)}</p>` : ''}`);
      if (pk.setup) out.push(`<div class="q-setup"><b>${fill(pk.setup.name)}</b><span class="q-price">${Number(pk.setup.price) ? cur(Number(pk.setup.price)) : t.tbd}</span>
        ${(pk.setup.bullets || []).length ? `<ul>${pk.setup.bullets.map(b => `<li>${fill(b)}</li>`).join('')}</ul>` : ''}</div>`);
      out.push(`<div class="q-pkgs" style="--n:${pk.options.length}">${pk.options.map(o => `
        <div class="q-pkg ${o.recommended ? 'is-rec' : ''}">${o.recommended ? `<span class="q-rec">${t.rec}</span>` : ''}
          <h4>${esc(o.name)}</h4><div class="q-pkg__price">${Number(o.price) ? cur(Number(o.price)) : t.tbd}<small>${esc(pk.unit || '')}</small></div>
          <ul>${(o.bullets || []).map(b => `<li>${fill(b)}</li>`).join('')}</ul></div>`).join('')}</div>
        ${pk.note ? `<p class="q-note">${fill(pk.note)}</p>` : ''}`);
    }

    // The money: each priced chapter, the extra lines, the setup; then the total.
    const rows = [];
    const anyPrice = tot.sub > 0;
    secs.forEach((s, i) => { if (Number(s.price) || anyPrice) rows.push([`<b>${i + 1}. ${fill(s.title)}</b>${s.unit ? ` <small>${esc(s.unit)}</small>` : ''}`, Number(s.price) ? cur(Number(s.price)) : (anyPrice ? t.incl : '______')]); });
    (q.items || []).forEach(it => { const v = (Number(it.qty) || 1) * (Number(it.price) || 0); rows.push([`<b>${fill(it.name)}</b>${(Number(it.qty) || 1) !== 1 ? ` <small>× ${it.qty}</small>` : ''}${it.unit ? ` <small>${esc(it.unit)}</small>` : ''}`, v ? cur(v) : '______']); });
    if (pk && pk.setup) rows.push([`<b>${fill(pk.setup.name)}</b>`, Number(pk.setup.price) ? cur(Number(pk.setup.price)) : '______']);
    if (rows.length || pk) {
      out.push(`<div><h2 class="q-h">${t.fin}</h2>
        ${rows.length ? `<table class="q-table"><thead><tr><th>${t.item}</th><th class="n">${t.amount}</th></tr></thead>
          <tbody>${rows.map(r => `<tr><td>${r[0]}</td><td class="n">${r[1]}</td></tr>`).join('')}</tbody></table>` : ''}
        <div class="q-sum"><dl>
          ${Number(q.discount) ? `<dt>${t.subtotal}</dt><dd>${cur(tot.sub)}</dd><dt>${t.discount}</dt><dd>− ${cur(Number(q.discount))}</dd>` : ''}
          ${q.vat === 'plus' && anyPrice ? `<dt>${t.subtotal}</dt><dd>${cur(tot.after)}</dd><dt>${t.vat} ${q.vatRate}%</dt><dd>${cur(tot.vat)}</dd>` : ''}
          ${rows.length ? `<dt class="total">${t.total}</dt><dd class="total">${anyPrice ? cur(tot.total) : '______'}</dd>` : ''}
          ${pk ? `<dt class="monthly">${t.monthly}</dt><dd class="monthly">${esc(pk.unit || '')}</dd>` : ''}
        </dl></div></div>`);
    }

    const vatLine = q.vat === 'incl' ? `${t.vatIncl}${anyPrice ? ` (${t.vatPart} ${q.vatRate}%: ${cur(tot.vat)})` : ''}` : q.vat === 'none' ? t.vatNone : q.vat === 'note' ? `${t.vat}: ${esc(q.vatNote || t.tbd)}` : '';
    out.push(`<div class="q-terms">${vatLine ? `<p>${vatLine}</p>` : ''}
      <div><h3>${t.payment}</h3><p>${q.payment ? esc(q.payment) : `<span class="tbd">${t.tbd}</span>`}</p></div>
      <div><h3>${t.validity}</h3><p>${t.validText(q.validDays || 14, dateStr(until, lang))}</p></div>
      ${q.closing ? `<p>${fill(q.closing)}</p>` : ''}</div>`);
    if (q.tagline) out.push(`<p class="q-tag"><b>LA BELLE VIE</b>${esc(q.tagline)}</p>`);

    const done = q.status === 'accepted';
    out.push(`<div class="q-ok ${done ? 'is-done' : ''}" id="ok"><h2>${done ? t.okDone : t.okTitle}</h2>
      ${done ? `<p>${esc(t.okBy(q.accepted?.name || '', dateStr(new Date(q.accepted?.at || Date.now()), lang), q.accepted?.package))}</p>`
        : `<p class="no-print">${t.okText}</p>
          <form id="okForm">
            ${pk ? `<p>${t.okPick}</p><div class="q-choose">${pk.options.map((o, i) => `<label><input type="radio" name="pkg" value="${esc(o.name)}" ${o.recommended || (!pk.options.some(x => x.recommended) && !i) ? 'checked' : ''}>${esc(o.name)}</label>`).join('')}</div>` : ''}
            <div class="row"><input type="text" name="name" required autocomplete="name" placeholder="${t.okName}" aria-label="${t.okName}"><button class="act act--gold" type="submit">${t.okBtn}</button></div>
          </form>
          <div class="q-sign"><span>${t.signName}: ____________________</span><span>${t.signDate}: ____________________</span></div>`}</div>`);
    return out;
  }

  /** Lays the blocks out on A4 pages: as many as fit, then a new page. */
  function paginate(q, t, lang, contact) {
    const c = { ...CONTACT0, ...(contact || {}) };
    const head = (i, n) => `<header class="pg-head"><img class="pg-logo" src="../media/logo-events.png" alt="La Belle Vie" width="600" height="528">
      <div class="pg-meta"><b>${esc(t.kind)}</b><small>${esc(q.number || '')}</small><small>${t.page(i, n)}</small></div></header>`;
    const foot = `<footer class="pg-foot"><a href="tel:+${intl(c.phone)}"><bdi dir="ltr">${esc(c.phone)}</bdi></a>${c.phone2 ? `<span class="sep">•</span><a href="tel:+${intl(c.phone2)}"><bdi dir="ltr">${esc(c.phone2)}</bdi></a>` : ''}
      <span class="sep">•</span><a href="https://wa.me/${intl(c.whatsapp)}" target="_blank" rel="noopener">WhatsApp</a>
      <span class="sep">•</span><a href="mailto:${esc(c.email)}"><bdi dir="ltr">${esc(c.email)}</bdi></a>
      <span class="sep">•</span><a href="https://www.lbv-event.com" target="_blank" rel="noopener"><bdi dir="ltr">lbv-event.com</bdi></a></footer>`;
    // Measure each block inside a hidden page of the real size.
    const probe = document.createElement('div');
    probe.className = 'page'; probe.style.cssText = 'position:absolute;visibility:hidden;left:-9999px;top:0;zoom:1';
    probe.innerHTML = head(1, 1) + '<div class="pg-body"></div>' + foot;
    document.body.append(probe);
    const body = probe.querySelector('.pg-body');
    const cs = getComputedStyle(body);
    const room = body.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 4;
    const height = html => { body.innerHTML = `<div class="blk">${html}</div>`; return body.firstChild.offsetHeight + 18; };
    const pages = [[]];
    let used = 0;
    const place = html => {
      const h = height(html);
      if (used + h > room && pages[pages.length - 1].length) { pages.push([]); used = 0; }
      pages[pages.length - 1].push(html); used += h;
    };
    const list = blocks(q, t, lang, contact);
    list.forEach((b, i) => {
      if (typeof b === 'object') {
        // A long chapter: whole if it fits on this page, otherwise in two parts.
        if (used + height(b.html) <= room) return place(b.html);
        return b.split.forEach(place);
      }
      // Keep a heading with what follows it.
      if (/^<h2 class="q-h"/.test(b) && list[i + 1]) {
        const next = typeof list[i + 1] === 'object' ? list[i + 1].split[0] : list[i + 1];
        if (used + height(b) + height(next) > room && pages[pages.length - 1].length) { pages.push([]); used = 0; }
      }
      place(b);
    });
    probe.remove();
    const n = pages.length;
    return pages.map((p, i) => `<article class="page">${head(i + 1, n)}<div class="pg-body">${p.map(h => `<div class="blk">${h}</div>`).join('')}</div>${foot}</article>`).join('');
  }

  function fit() {
    const z = Math.min(1, (document.documentElement.clientWidth - 16) / PAGE_W);
    document.documentElement.style.setProperty('--z', String(Math.max(.3, z)));
  }

  function render(q, contact) {
    const t = L[q.lang] || L.he, lang = q.lang === 'fr' ? 'fr' : 'he';
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'fr' ? 'ltr' : 'rtl';
    document.title = `${q.title || t.kind} – La Belle Vie`;
    $('#pages').innerHTML = paginate(q, t, lang, contact);
    $('#printBtn').textContent = t.print;
    $('#tools').hidden = false;
    fit();
    $('#okForm')?.addEventListener('submit', async e => {
      e.preventDefault();
      const name = e.target.name.value.trim();
      if (!name) return;
      const btn = e.target.querySelector('button');
      btn.disabled = true;
      try {
        const r = await fetch(api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, package: e.target.pkg ? e.target.pkg.value : '' }) });
        if (!r.ok) throw new Error();
        render(await r.json(), contact);
      } catch (err) { btn.disabled = false; alert(t.okErr); }
    });
  }

  /** The doors: the client turns the gold key and the quote is revealed. */
  function cover(q) {
    const t = L[q.lang] || L.he;
    const el = $('#cover');
    el.innerHTML = `<div class="cover__in">
      <img class="cover__logo" src="../media/logo-events.png" alt="La Belle Vie" width="600" height="528">
      <p class="cover__for">${t.forYou}<b>${esc((q.client && q.client.name) || '')}</b></p>
      <div class="doors" id="doors" role="button" tabindex="0" aria-label="${t.open}">
        <div class="doors__light" aria-hidden="true"></div>
        <div class="door door--a" aria-hidden="true"><i></i></div><div class="door door--b" aria-hidden="true"><i></i></div>
        <span class="lock" aria-hidden="true"></span>
        <svg class="key" viewBox="0 0 120 44" aria-hidden="true"><defs><linearGradient id="kG" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#f7e6c0"/><stop offset=".5" stop-color="#d4af6a"/><stop offset="1" stop-color="#8a6a32"/></linearGradient></defs><g fill="none" stroke="url(#kG)" stroke-width="5" stroke-linecap="round"><circle cx="20" cy="22" r="14"/><circle cx="20" cy="22" r="5"/><path d="M34 22h76M92 22v12M101 22v8M110 22v12"/></g></svg>
      </div>
      <button type="button" class="cover__btn" id="openBtn">${t.open}</button></div>`;
    el.hidden = false;
    let opened = false;
    const open = () => {
      if (opened) return; opened = true;
      const d = $('#doors');
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce) { el.classList.add('is-gone'); return; }
      d.classList.add('is-locking');
      setTimeout(() => { d.classList.add('is-open'); el.classList.add('is-gone'); }, 1150);
    };
    $('#doors').addEventListener('click', open);
    $('#doors').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    $('#openBtn').addEventListener('click', open);
  }

  $('#printBtn').addEventListener('click', () => window.print());
  addEventListener('resize', fit);
  (async () => {
    try {
      const [r, content] = await Promise.all([
        fetch(api, { cache: 'no-store' }),
        fetch('/api/content', { cache: 'no-store' }).then(x => (x.ok && x.status !== 204 ? x.json() : null)).catch(() => null),
      ]);
      if (!r.ok) throw new Error();
      const q = await r.json();
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      render(q, content && content.contact);
      if (!qs.has('print') && q.status !== 'accepted') cover(q);
    } catch (e) {
      $('#pages').innerHTML = `<p class="err">${L.he.notFound}<br><span dir="ltr">${L.fr.notFound}</span></p>`;
    }
  })();
})();
