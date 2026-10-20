// A La Belle Vie quote, as the client sees it: /quote/?id=q-…&t=… (the signed link the admin sends).
// It lays the quote out on real A4 pages, each with the gold logo header.
(function () {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const qs = new URLSearchParams(location.search);
  const id = qs.get('id') || '', token = qs.get('t') || '';
  const api = `/api/quotes?view=${encodeURIComponent(id)}&t=${encodeURIComponent(token)}`;
  const PAGE_W = 794;

  const L = {
    he: {
      kind: 'הצעת מחיר', page: (i, n) => `עמוד ${i} מתוך ${n}`,
      to: 'לכבוד', event: 'האירוע', date: 'תאריך', place: 'מקום', guests: 'משתתפים', tbd: 'להשלמה',
      number: 'הצעה מס׳', issued: 'תאריך', valid: 'בתוקף עד', validFor: d => `תוקף ההצעה: ${d} ימים`, dateFull: () => 'תאריך האירוע', guestsFull: 'מספר משתתפים משוער', hoursFull: 'שעות העבודה ביום האירוע', totalHT: 'סה״כ לפני מע״מ', vatApp: 'מע״מ', totalTTC: 'סה״כ כולל מע״מ', included: 'מה כלול בהצעה', fin: 'הצעה כספית', item: 'פירוט', amount: 'סכום',
      qty: 'כמות', incl: 'כלול', subtotal: 'סה״כ', discount: 'הנחה', vat: 'מע״מ', total: 'סה״כ לתשלום', monthly: 'ובנוסף, החבילה החודשית שתבחרו',
      vatIncl: 'המחירים כוללים מע״מ.', vatNone: 'ללא מע״מ.', vatPart: 'מתוכו מע״מ', payment: 'תנאי תשלום', validity: 'תוקף ההצעה',
      validText: (d, date) => `ההצעה בתוקף ${d} ימים, עד ${date}.`, rec: 'מומלץ',
      okTitle: 'אישור ההצעה', okText: 'מתאים לכם? כתבו את השם המלא ולחצו על האישור. נקבל הודעה ונחזור אליכם.', okPick: 'איזו חבילה מתאימה לכם?',
      okName: 'השם המלא', okBtn: 'אני מאשר/ת את ההצעה', okDone: 'ההצעה אושרה', okBy: (n, d, p) => `אושרה על ידי ${n}, ב־${d}${p ? `, בחבילת ${p}` : ''}. תודה! נחזור אליכם בהקדם.`,
      okErr: 'לא הצלחנו לשמור את האישור. נסו שוב, או כתבו לנו בוואטסאפ.', print: 'הורדה כ־PDF / הדפסה',
      extras: 'תוספות לפי בחירה', services: 'השירותים שלנו', svcIncludes: 'השירות כולל:', toDefine: 'יתומחר', external: 'ספקים חיצוניים (הערכה)', letters: 'אבגדהוזחטיכלמנ', rep: 'איש קשר', phone: 'טלפון', mail: 'מייל', hours: 'שעות', signRole: 'תפקיד', signName: 'שם', signDate: 'תאריך וחתימה', notFound: 'ההצעה לא נמצאה. ודאו שהקישור שלם, או פנו אלינו.', clientDefault: 'המוסד', cont: '(המשך)',
    },
    fr: {
      kind: 'Devis', page: (i, n) => `Page ${i} / ${n}`,
      to: 'À l’attention de', event: 'L’événement', date: 'Date', place: 'Lieu', guests: 'Participants', tbd: 'À compléter',
      number: 'Devis n°', issued: 'Date d’émission', valid: 'Valable jusqu’au', validFor: d => `Validité du devis : ${d} jours`, dateFull: ev => (/gala/i.test(ev || '') ? 'Date du gala' : 'Date de l’événement'), guestsFull: 'Nombre prévisionnel de participants', hoursFull: 'Horaires de la prestation le jour de l’événement', totalHT: 'Total HT', vatApp: 'TVA applicable', totalTTC: 'TOTAL TTC', included: 'Ce que comprend la prestation', fin: 'Proposition financière', item: 'Désignation', amount: 'Montant',
      qty: 'Qté', incl: 'Inclus', subtotal: 'Total', discount: 'Remise', vat: 'TVA', total: 'Total à payer', monthly: 'Puis le forfait mensuel choisi',
      vatIncl: 'Prix TTC.', vatNone: 'Hors TVA.', vatPart: 'dont TVA', payment: 'Modalités de paiement', validity: 'Validité du devis',
      validText: (d, date) => `Devis valable ${d} jours, jusqu’au ${date}.`, rec: 'Recommandé',
      okTitle: 'Bon pour accord', okText: 'Cela vous convient ? Indiquez votre nom complet et validez. Nous serons prévenus et reviendrons vers vous.', okPick: 'Quel forfait vous convient ?',
      okName: 'Nom complet', okBtn: 'J’accepte ce devis', okDone: 'Devis accepté', okBy: (n, d, p) => `Accepté par ${n}, le ${d}${p ? `, forfait ${p}` : ''}. Merci ! Nous revenons vers vous rapidement.`,
      okErr: 'L’accord n’a pas pu être enregistré. Réessayez, ou écrivez-nous sur WhatsApp.', print: 'Télécharger en PDF / imprimer',
      extras: 'Options au choix', services: 'Nos prestations', svcIncludes: 'Cette prestation comprend :', toDefine: 'À définir', external: 'Prestations externes (estimation)', letters: 'ABCDEFGHIJKLMN', rep: 'Représentant', phone: 'Téléphone', mail: 'E-mail', hours: 'Horaires', signRole: 'Fonction', signName: 'Nom', signDate: 'Date et signature', notFound: 'Devis introuvable. Vérifiez le lien complet, ou contactez-nous.', clientDefault: 'votre institution', cont: '(suite)',
    },
  };
  const CONTACT0 = { whatsapp: '058-518-2655', phone: '058-518-2655', phone2: '058-555-1826', email: 'LBV0585551826@gmail.com' };
  const intl = s => { let d = String(s || '').replace(/[^\d]/g, ''); if (d.startsWith('0')) d = '972' + d.slice(1); return d; };
  const money = (v, cur, lang) => new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'he-IL', { style: 'currency', currency: cur === 'EUR' ? 'EUR' : 'ILS', maximumFractionDigits: 2 }).format(v);
  const dateStr = (d, lang) => d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
  /** Totals, the same way the admin computes them: priced chapters + extra lines + the packages' setup. */
  function totals(q) {
    const sub = (q.sections || []).reduce((s, x) => s + (Number(x.price) || 0), 0)
      + (q.services || []).reduce((s, x) => s + (Number(x.price) || 0), 0)
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
    // Without prices: amounts are left out everywhere (also "– 600 ₪" at the end of a line).
    const np = s => {
      s = String(s || '');
      if (!q.hidePrices) return s;
      s = s.replace(/\s+[–-]\s+[^–]*(₪|€|%)[^–]*$/, '');
      return /[₪€]/.test(s) ? '' : s;   // a line that is only about a price is left out
    };
    const fill = s => esc(np(s).replace(/\{client\}/g, who));
    const tbd = v => v ? esc(v) : `<span class="tbd">${t.tbd}</span>`;
    const cur = v => money(v, q.currency, lang);
    const issued = new Date(q.createdAt || Date.now());
    const until = new Date(issued.getTime() + (Number(q.validDays) || 14) * 86400000);
    const tot = totals(q);
    const out = [];

    out.push(`<div class="q-title">${q.brandLine ? `<p class="q-brand"><b>LA BELLE VIE</b> ${esc(q.brandLine)}</p>` : ''}<h1>${esc(q.title || t.kind)}</h1>${q.subtitle ? `<p>${esc(q.subtitle)}</p>` : ''}
      <div class="q-meta"><span>${t.number} <b>${esc(q.number || '')}</b></span><span>${t.issued}: ${dateStr(issued, lang)}</span><span>${q.fullDetails ? t.validFor(q.validDays || 14) : `${t.valid}: ${dateStr(until, lang)}`}</span></div></div>`);
    const full = !!q.fullDetails;
    out.push(`<div class="q-parts">
      <div class="q-box"><h2>${t.to}</h2><p class="big">${q.client?.name ? esc(q.client.name) : tbd('')}</p>
        ${full ? `<p>${t.rep}: ${tbd(q.client?.contact)}</p><p>${t.phone}: ${q.client?.phone ? `<bdi dir="ltr">${esc(q.client.phone)}</bdi>` : tbd('')}</p><p>${t.mail}: ${q.client?.email ? `<bdi dir="ltr">${esc(q.client.email)}</bdi>` : tbd('')}</p>`
          : `${q.client?.phone ? `<p><bdi dir="ltr">${esc(q.client.phone)}</bdi></p>` : ''}${q.client?.email ? `<p><bdi dir="ltr">${esc(q.client.email)}</bdi></p>` : ''}`}</div>
      <div class="q-box"><h2>${t.event}</h2>${q.event?.type ? `<p class="big">${esc(q.event.type)}</p>` : ''}
        ${full ? `<p>${t.dateFull(q.event?.type)}: ${tbd(q.event?.date)}</p><p>${t.place}: ${tbd(q.event?.place)}</p><p>${t.guestsFull}: ${tbd(q.event?.guests)}</p><p>${t.hoursFull}: ${tbd(q.event?.hours)}</p>`
          : `<p>${t.date}: ${tbd(q.event?.date)} · ${t.place}: ${tbd(q.event?.place)}</p><p>${t.guests}: ${tbd(q.event?.guests)}</p>`}</div></div>`);
    if (q.introTitle && q.intro) out.push(`<h2 class="q-h">${fill(q.introTitle)}</h2>`);
    String(q.intro || '').split(/\n\s*\n/).map(x => x.trim()).filter(Boolean).forEach(x => out.push(`<p class="q-intro">${fill(x)}</p>`));

    const secs = q.sections || [];
    // A chapter's lines: "# " is a sub-heading, "> " a short paragraph, anything else a bullet.
    const body = arr => {
      let h = '', open = false;
      for (const raw of (arr || []).map(String)) {
        const kind = raw.startsWith('# ') ? 'h' : raw.startsWith('> ') ? 'p' : 'li';
        const text = fill(kind === 'li' ? raw : raw.slice(2));
        if (!text) continue;
        if (kind === 'li') { if (!open) { h += '<ul>'; open = true; } h += `<li>${text}</li>`; continue; }
        if (open) { h += '</ul>'; open = false; }
        h += kind === 'h' ? `<h4 class="q-sub">${text}</h4>` : `<p class="q-p">${text}</p>`;
      }
      return h + (open ? '</ul>' : '');
    };
    let num = 0;
    const secBlock = s => {
      const n = ++num;
      const price = Number(s.price) && !q.hidePrices ? `<span class="q-price">${cur(Number(s.price))}${s.unit ? ` <small>${esc(s.unit)}</small>` : ''}</span>` : '';
      const head = cont => `<h3><span class="q-num">${n}</span>${fill(s.title)}${cont ? ` <small>${t.cont}</small>` : price}</h3>`;
      const bl = (s.bullets || []).map(String);
      const whole = `<section class="q-sec">${head(false)}${body(bl)}</section>`;
      if (bl.length <= 8) return whole;
      // A long chapter can continue on the next page, never leaving a sub-heading alone at the bottom.
      const parts = [];
      for (let i = 0; i < bl.length;) {
        let j = Math.min(bl.length, i + 8);
        while (j < bl.length && j > i + 1 && bl[j - 1].startsWith('# ')) j--;
        parts.push(bl.slice(i, j)); i = j;
      }
      return { html: whole, split: parts.map((p, k) => `<section class="q-sec">${head(k > 0)}${body(p)}</section>`) };
    };
    const before = secs.filter(s => !s.afterPrice), after = secs.filter(s => s.afterPrice);
    const svcs = (q.services || []).filter(v => v.name);
    const letter = k => (t.letters || '')[k] || String(k + 1);
    if (svcs.length) {
      // Each service: one overall price, then everything it includes, in detail.
      out.push(`<h2 class="q-h">${t.services}</h2>`);
      svcs.forEach((v, k) => {
        const chs = before.filter(x => x.svc === v.id);
        const price = Number(v.price) && !q.hidePrices ? `<b class="q-svc__price">${cur(Number(v.price))}${v.unit ? ` <small>${esc(v.unit)}</small>` : ''}</b>` : '';
        out.push(`<div class="q-svc"><span class="q-svc__k">${letter(k)}</span><div class="q-svc__t"><h3>${fill(v.name)}</h3>${v.note ? `<p>${fill(v.note)}</p>` : ''}${chs.length ? `<p class="q-svc__inc">${t.svcIncludes}</p>` : ''}</div>${price}</div>`);
        chs.forEach(x => out.push(secBlock(x)));
      });
      const loose = before.filter(x => !svcs.some(v => v.id === x.svc));
      if (loose.length) { out.push(`<h2 class="q-h">${t.included}</h2>`); loose.forEach(x => out.push(secBlock(x))); }
    } else if (before.length) {
      if (q.sectionsTitle !== '-') out.push(`<h2 class="q-h">${q.sectionsTitle ? fill(q.sectionsTitle) : t.included}</h2>`);
      before.forEach(s => out.push(secBlock(s)));
    }

    const pk = q.packages;
    if (pk && pk.options && pk.options.length) {
      out.push(`<h2 class="q-h">${fill(pk.title)}</h2>${pk.intro && pk.intro !== q.intro ? `<p class="q-pk-intro">${fill(pk.intro)}</p>` : ''}`);
      if (pk.setup) out.push(`<div class="q-setup"><b>${fill(pk.setup.name)}</b>${q.hidePrices ? '' : `<span class="q-price">${Number(pk.setup.price) ? cur(Number(pk.setup.price)) : t.tbd}</span>`}
        ${(pk.setup.bullets || []).length ? `<ul>${pk.setup.bullets.map(fill).filter(Boolean).map(b => `<li>${b}</li>`).join('')}</ul>` : ''}</div>`);
      out.push(`<div class="q-pkgs" style="--n:${pk.options.length}">${pk.options.map(o => `
        <div class="q-pkg ${o.recommended ? 'is-rec' : ''}">${o.recommended ? `<span class="q-rec">${t.rec}</span>` : ''}
          <h4>${esc(o.name)}</h4>${q.hidePrices ? '' : `<div class="q-pkg__price">${Number(o.price) ? cur(Number(o.price)) : t.tbd}<small>${esc(pk.unit || '')}</small></div>`}
          <ul>${(o.bullets || []).map(fill).filter(Boolean).map(b => `<li>${b}</li>`).join('')}</ul></div>`).join('')}</div>
        ${pk.note ? `<p class="q-note">${fill(pk.note)}</p>` : ''}`);
      if ((pk.extras || []).length) out.push(`<div class="q-extras"><h3>${t.extras}</h3><ul>${pk.extras.map(fill).filter(Boolean).map(x => `<li>${x}</li>`).join('')}</ul></div>`);
    }

    // The money: each priced chapter, the extra lines, the setup; then the total.
    const rows = [];
    const anyPrice = tot.sub > 0;
    // Chapters appear in the table only when some of them have their own price (otherwise they are described above).
    const secPriced = !svcs.length && secs.some(s => Number(s.price));
    svcs.forEach((v, k) => rows.push([`<b>${letter(k)}. ${fill(v.name)}</b>${v.unit ? ` <small>${esc(v.unit)}</small>` : ''}`, Number(v.price) ? cur(Number(v.price)) : t.toDefine]));
    if (svcs.length && (q.items || []).some(it => Number(it.price) && !/^[#=] /.test(it.name || ''))) rows.push({ head: t.external });
    secs.forEach((s, i) => { if (secPriced) rows.push([`<b>${i + 1}. ${fill(s.title)}</b>${s.unit ? ` <small>${esc(s.unit)}</small>` : ''}`, Number(s.price) ? cur(Number(s.price)) : (anyPrice ? t.incl : '______')]); });
    let group = 0;
    (q.items || []).forEach(it => {
      const name = String(it.name || '');
      if (svcs.length && (/^[#=] /.test(name) || !Number(it.price))) return;   // with services: only priced external lines
      if (name.startsWith('# ')) { rows.push({ head: fill(name.slice(2)) }); group = 0; return; }
      if (name.startsWith('= ')) { rows.push({ sub: fill(name.slice(2)), v: group }); group = 0; return; }
      const v = (Number(it.qty) || 1) * (Number(it.price) || 0);
      group += v;
      rows.push([`<b>${fill(name)}</b>${(Number(it.qty) || 1) !== 1 ? ` <small>× ${it.qty}</small>` : ''}${it.unit ? ` <small>${esc(it.unit)}</small>` : ''}`, v ? cur(v) : '______']);
    });
    if (pk && pk.setup) rows.push([`<b>${fill(pk.setup.name)}</b>`, Number(pk.setup.price) ? cur(Number(pk.setup.price)) : '______']);
    if ((rows.length || pk) && !q.hidePrices) {
      const finHead = cont => `<h2 class="q-h">${after.length ? `<span class="q-num">${finNum}</span>` : ''}${q.finTitle ? fill(q.finTitle) : t.fin}${cont ? ` <small>${t.cont}</small>` : ''}</h2>`;
      const finNum = after.length ? ++num : 0;
      const rowHtml = r => r.head ? `<tr class="q-grp"><td colspan="2">${r.head}</td></tr>`
        : r.sub ? `<tr class="q-subt"><td>${r.sub}</td><td class="n">${r.v ? cur(r.v) : '______'}</td></tr>`
        : `<tr><td>${r[0]}</td><td class="n">${r[1]}</td></tr>`;
      const table = list => list.length ? `<table class="q-table"><thead><tr><th>${t.item}</th><th class="n">${t.amount}</th></tr></thead><tbody>${list.map(rowHtml).join('')}</tbody></table>` : '';
      const sums = `<div class="q-sum"><dl>
          ${Number(q.discount) ? `<dt>${t.subtotal}</dt><dd>${cur(tot.sub)}</dd><dt>${t.discount}</dt><dd>− ${cur(Number(q.discount))}</dd>` : ''}
          ${q.vat === 'plus' ? `<dt>${t.totalHT}</dt><dd>${anyPrice ? cur(tot.after) : '______'}</dd><dt>${t.vatApp}</dt><dd>${anyPrice ? cur(tot.vat) : '______'}</dd>` : ''}
          ${rows.length ? `<dt class="total">${q.vat === 'plus' ? t.totalTTC : t.total}</dt><dd class="total">${anyPrice ? cur(tot.total) : '______'}</dd>` : ''}
          ${pk ? `<dt class="monthly">${t.monthly}</dt><dd class="monthly">${esc(pk.unit || '')}</dd>` : ''}
        </dl></div>${q.finNote ? `<div class="q-finnote">${body(String(q.finNote).split('\n').map(x => x.trim()).filter(Boolean).map(x => '> ' + x))}</div>` : ''}`;
      const whole = `<div>${finHead(false)}${table(rows)}${sums}</div>`;
      if (rows.length <= 12) out.push(whole);
      else {
        const parts = [];
        for (let i = 0; i < rows.length; i += 12) parts.push(rows.slice(i, i + 12));
        out.push({ html: whole, split: parts.map((part, k) => `<div>${finHead(k > 0)}${table(part)}${k === parts.length - 1 ? sums : ''}</div>`) });
      }
    }
    after.forEach(s => out.push(secBlock(s)));

    const vatLine = q.vat === 'incl' ? `${t.vatIncl}${anyPrice ? ` (${t.vatPart} ${q.vatRate}%: ${cur(tot.vat)})` : ''}` : q.vat === 'none' ? t.vatNone : q.vat === 'note' ? `${t.vat}: ${esc(q.vatNote || t.tbd)}` : '';
    out.push(`<div class="q-terms">${vatLine && !q.hidePrices ? `<p>${vatLine}</p>` : ''}
      ${q.payment ? `<div><h3>${t.payment}</h3><p>${esc(q.payment)}</p></div>` : ''}
      <div><h3>${t.validity}</h3><p>${t.validText(q.validDays || 14, dateStr(until, lang))}</p></div>
      </div>`);

    const done = q.status === 'accepted';
    out.push(`<div class="q-ok ${done ? 'is-done' : ''}" id="ok"><h2>${after.length ? `<span class="q-num">${++num}</span>` : ''}${done ? t.okDone : t.okTitle}</h2>${q.okNote ? `<p>${fill(q.okNote)}</p>` : ''}
      ${done ? `<p>${esc(t.okBy(q.accepted?.name || '', dateStr(new Date(q.accepted?.at || Date.now()), lang), q.accepted?.package))}</p>`
        : `<p class="no-print">${t.okText}</p>
          <form id="okForm">
            ${pk ? `<p>${t.okPick}</p><div class="q-choose">${pk.options.map((o, i) => `<label><input type="radio" name="pkg" value="${esc(o.name)}" ${o.recommended || (!pk.options.some(x => x.recommended) && !i) ? 'checked' : ''}>${esc(o.name)}</label>`).join('')}</div>` : ''}
            <div class="row"><input type="text" name="name" required autocomplete="name" placeholder="${t.okName}" aria-label="${t.okName}"><button class="act act--gold" type="submit">${t.okBtn}</button></div>
          </form>
          <div class="q-sign"><span>${t.signName}: ____________________</span>${full ? `<span>${t.signRole}: ____________________</span>` : ''}<span>${t.signDate}: ____________________</span></div>`}</div>`);
    if (q.tagline) out.push(`<p class="q-tag"><b>LA BELLE VIE</b>${esc(q.tagline)}</p>`);
    if (q.closing) out.push(`<div class="q-terms q-close"><p>${fill(q.closing)}</p></div>`);
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
      if (/^<(h2 class="q-h"|div class="q-svc")/.test(b) && list[i + 1]) {
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
    } catch (e) {
      $('#pages').innerHTML = `<p class="err">${L.he.notFound}<br><span dir="ltr">${L.fr.notFound}</span></p>`;
    }
  })();
})();
