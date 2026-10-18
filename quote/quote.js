// A La Belle Vie quote, as the client sees it: /quote/?id=q-…&t=… (the signed link the admin sends).
(function () {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const qs = new URLSearchParams(location.search);
  const id = qs.get('id') || '', token = qs.get('t') || '';
  const api = `/api/quotes?view=${encodeURIComponent(id)}&t=${encodeURIComponent(token)}`;

  const L = {
    he: {
      brand: 'הפקת אירועים ונופשים בחגים', to: 'לכבוד', event: 'האירוע', date: 'תאריך האירוע', place: 'מקום', guests: 'משתתפים',
      tbd: 'להשלמה', number: 'הצעה מס׳', issued: 'תאריך', valid: 'בתוקף עד', fin: 'הצעה כספית', item: 'פירוט', amount: 'סכום',
      qty: 'כמות', unit: 'מחיר ליחידה', subtotal: 'סה״כ', discount: 'הנחה', vat: 'מע״מ', total: 'סה״כ לתשלום',
      vatIncl: 'המחירים כוללים מע״מ.', vatNone: 'ללא מע״מ.', vatPart: 'מתוכו מע״מ', payment: 'תנאי תשלום', validity: 'תוקף ההצעה',
      validText: d => `ההצעה בתוקף ${d} ימים, עד ${'{date}'}.`,
      okTitle: 'אישור ההצעה', okText: 'מתאים לכם? כתבו את השם המלא ולחצו על האישור. נקבל הודעה ונחזור אליכם.',
      okName: 'השם המלא', okBtn: 'אני מאשר/ת את ההצעה', okDone: 'ההצעה אושרה', okBy: (n, d) => `אושרה על ידי ${n}, ב־${d}. תודה! נחזור אליכם בהקדם.`,
      okErr: 'לא הצלחנו לשמור את האישור. נסו שוב, או כתבו לנו בוואטסאפ.', print: 'הורדה כ־PDF / הדפסה',
      signName: 'שם', signDate: 'תאריך וחתימה', notFound: 'ההצעה לא נמצאה. ודאו שהקישור שלם, או פנו אלינו.', clientDefault: 'המוסד',
    },
    fr: {
      brand: 'Organisation & production événementielle', to: 'À l’attention de', event: 'L’événement', date: 'Date de l’événement', place: 'Lieu', guests: 'Participants',
      tbd: 'À compléter', number: 'Devis n°', issued: 'Date', valid: 'Valable jusqu’au', fin: 'Proposition financière', item: 'Désignation', amount: 'Montant',
      qty: 'Qté', unit: 'Prix unitaire', subtotal: 'Total', discount: 'Remise', vat: 'TVA', total: 'Total à payer',
      vatIncl: 'Prix TTC.', vatNone: 'Hors TVA.', vatPart: 'dont TVA', payment: 'Modalités de paiement', validity: 'Validité du devis',
      validText: d => `Devis valable ${d} jours, jusqu’au ${'{date}'}.`,
      okTitle: 'Bon pour accord', okText: 'Cela vous convient ? Indiquez votre nom complet et validez. Nous serons prévenus et reviendrons vers vous.',
      okName: 'Nom complet', okBtn: 'J’accepte ce devis', okDone: 'Devis accepté', okBy: (n, d) => `Accepté par ${n}, le ${d}. Merci ! Nous revenons vers vous rapidement.`,
      okErr: 'L’accord n’a pas pu être enregistré. Réessayez, ou écrivez-nous sur WhatsApp.', print: 'Télécharger en PDF / imprimer',
      signName: 'Nom', signDate: 'Date et signature', notFound: 'Devis introuvable. Vérifiez le lien complet, ou contactez-nous.', clientDefault: 'votre institution',
    },
  };
  // Contact details: the site's own (the admin's "פרטי קשר"), with the defaults as fallback.
  const CONTACT0 = { whatsapp: '058-518-2655', phone: '058-518-2655', phone2: '058-555-1826', email: 'LBV0585551826@gmail.com', instagram: 'https://www.instagram.com/la_belle_vie_lbv/' };
  const intl = s => { let d = String(s || '').replace(/[^\d]/g, ''); if (d.startsWith('0')) d = '972' + d.slice(1); return d; };

  function money(v, cur, lang) {
    return new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'he-IL', { style: 'currency', currency: cur === 'EUR' ? 'EUR' : 'ILS', maximumFractionDigits: 2 }).format(v);
  }
  const dateStr = (d, lang) => d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
  /** Totals, the same way the admin computes them. */
  function totals(q) {
    const sub = (q.items || []).reduce((s, it) => s + (Number(it.qty) || 1) * (Number(it.price) || 0), 0);
    const after = Math.max(0, sub - (Number(q.discount) || 0));
    const r = (Number(q.vatRate) || 18) / 100;
    if (q.vat === 'plus') return { sub, after, vat: after * r, total: after * (1 + r) };
    if (q.vat === 'incl') return { sub, after, vat: after - after / (1 + r), total: after };
    return { sub, after, vat: 0, total: after };
  }

  function render(q, contact) {
    const t = L[q.lang] || L.he, lang = q.lang === 'fr' ? 'fr' : 'he';
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'fr' ? 'ltr' : 'rtl';
    document.title = `${q.title || t.fin} – La Belle Vie`;
    const who = (q.client && q.client.name) || t.clientDefault;
    const fill = s => esc(String(s || '').replace(/\{client\}/g, who));
    const tbd = v => v ? esc(v) : `<span class="tbd">${t.tbd}</span>`;
    const issued = new Date(q.createdAt || Date.now());
    const until = new Date(issued.getTime() + (Number(q.validDays) || 14) * 86400000);
    const tot = totals(q);
    const priced = (q.items || []).some(it => Number(it.price));
    const multi = (q.items || []).some(it => (Number(it.qty) || 1) !== 1);
    const amt = v => priced ? money(v, q.currency, lang) : '______';
    const c = { ...CONTACT0, ...(contact || {}) };

    $('#sheet').innerHTML = `
      <header class="q-head">
        <img class="q-logo" src="../media/logo-letters.png" alt="La Belle Vie" width="208" height="146">
        <div class="q-brand"><b>LA BELLE VIE</b><small>${t.brand}</small></div>
      </header>
      <div class="q-title">
        <h1>${esc(q.title || t.fin)}${q.subtitle ? `<span>${esc(q.subtitle)}</span>` : ''}</h1>
        <div class="q-meta"><span>${t.number} <b>${esc(q.number || '')}</b></span><span>${t.issued}: ${dateStr(issued, lang)}</span><span>${t.valid}: ${dateStr(until, lang)}</span></div>
      </div>
      <div class="q-parts">
        <div class="q-box"><h2>${t.to}</h2><p class="big">${esc(who)}</p>
          ${q.client?.phone ? `<p dir="ltr" style="text-align:start">${esc(q.client.phone)}</p>` : ''}${q.client?.email ? `<p dir="ltr" style="text-align:start">${esc(q.client.email)}</p>` : ''}</div>
        <div class="q-box"><h2>${t.event}</h2>
          ${q.event?.type ? `<p class="big">${esc(q.event.type)}</p>` : ''}
          <p>${t.date}: ${tbd(q.event?.date)}</p><p>${t.place}: ${tbd(q.event?.place)}</p><p>${t.guests}: ${tbd(q.event?.guests)}</p></div>
      </div>
      ${q.intro ? `<div class="q-text"><p class="q-intro">${fill(q.intro)}</p></div>` : ''}
      ${(q.sections || []).length ? `<div class="q-secs">${q.sections.map((s, i) => `
        <section class="q-sec"><h2><span class="q-num">${i + 1}</span>${fill(s.title)}</h2>
          <ul>${(s.bullets || []).map(b => `<li>${fill(b)}</li>`).join('')}</ul></section>`).join('')}</div>` : ''}
      <div class="q-items"><h2 class="q-h">${t.fin}</h2>
        <table><thead><tr><th>${t.item}</th>${multi ? `<th class="n">${t.qty}</th><th class="n">${t.unit}</th>` : ''}<th class="n">${t.amount}</th></tr></thead>
        <tbody>${(q.items || []).map(it => {
          const q1 = Number(it.qty) || 1, p = Number(it.price) || 0;
          return `<tr><td class="what"><b>${fill(it.name)}</b></td>${multi ? `<td class="n">${q1}</td><td class="n">${priced ? money(p, q.currency, lang) : '______'}</td>` : ''}<td class="n">${p ? money(q1 * p, q.currency, lang) : '______'}</td></tr>`;
        }).join('')}</tbody></table>
      </div>
      <div class="q-sum"><dl>
        ${Number(q.discount) ? `<dt>${t.subtotal}</dt><dd>${amt(tot.sub)}</dd><dt>${t.discount}</dt><dd>− ${amt(Number(q.discount))}</dd>` : ''}
        ${q.vat === 'plus' ? `<dt>${t.subtotal}</dt><dd>${amt(tot.after)}</dd><dt>${t.vat} ${q.vatRate}%</dt><dd>${amt(tot.vat)}</dd>` : ''}
        <dt class="total">${t.total}</dt><dd class="total">${amt(tot.total)}</dd>
      </dl></div>
      <div class="q-text">
        <p class="q-small">${q.vat === 'incl' ? `${t.vatIncl}${priced ? ` (${t.vatPart} ${q.vatRate}%: ${money(tot.vat, q.currency, lang)})` : ''}` : q.vat === 'none' ? t.vatNone : q.vat === 'note' ? `${t.vat}: ${esc(q.vatNote || t.tbd)}` : ''}</p>
        <div><h2>${t.payment}</h2><p>${q.payment ? esc(q.payment) : t.tbd}</p></div>
        <div><h2>${t.validity}</h2><p>${t.validText(q.validDays || 14).replace('{date}', dateStr(until, lang))}</p></div>
        ${q.closing ? `<p>${fill(q.closing)}</p>` : ''}
      </div>
      ${q.tagline ? `<p class="q-tag"><b>LA BELLE VIE</b>${esc(q.tagline)}</p>` : ''}
      <div class="q-ok ${q.status === 'accepted' ? 'is-done' : ''}" id="ok">
        <h2>${q.status === 'accepted' ? t.okDone : t.okTitle}</h2>
        ${q.status === 'accepted'
          ? `<p>${esc(t.okBy(q.accepted?.name || '', dateStr(new Date(q.accepted?.at || Date.now()), lang)))}</p>`
          : `<p class="no-print">${t.okText}</p>
             <form id="okForm"><input name="name" required autocomplete="name" placeholder="${t.okName}" aria-label="${t.okName}"><button class="act act--gold" type="submit">${t.okBtn}</button></form>
             <div class="q-sign"><span>${t.signName}: ____________________</span><span>${t.signDate}: ____________________</span></div>`}
      </div>
      <footer class="q-foot">
        <a href="tel:+${intl(c.phone)}" dir="ltr">${esc(c.phone)}</a>${c.phone2 ? `<span class="sep">•</span><a href="tel:+${intl(c.phone2)}" dir="ltr">${esc(c.phone2)}</a>` : ''}
        <span class="sep">•</span><a href="https://wa.me/${intl(c.whatsapp)}" target="_blank" rel="noopener">WhatsApp</a>
        <span class="sep">•</span><a href="mailto:${esc(c.email)}" dir="ltr">${esc(c.email)}</a>
        <span class="sep">•</span><a href="https://www.lbv-event.com" target="_blank" rel="noopener" dir="ltr">lbv-event.com</a>
      </footer>`;
    $('#printBtn').textContent = t.print;
    $('#actions').hidden = false;
    $('#okForm')?.addEventListener('submit', async e => {
      e.preventDefault();
      const name = e.target.name.value.trim();
      if (!name) return;
      const btn = e.target.querySelector('button');
      btn.disabled = true;
      try {
        const r = await fetch(api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
        if (!r.ok) throw new Error();
        render(await r.json(), contact);
      } catch (err) { btn.disabled = false; alert(t.okErr); }
    });
  }

  $('#printBtn').addEventListener('click', () => window.print());
  (async () => {
    try {
      const [r, content] = await Promise.all([
        fetch(api, { cache: 'no-store' }),
        fetch('/api/content', { cache: 'no-store' }).then(x => (x.ok && x.status !== 204 ? x.json() : null)).catch(() => null),
      ]);
      if (!r.ok) throw new Error();
      render(await r.json(), content && content.contact);
    } catch (e) {
      $('#sheet').innerHTML = `<p class="err">${L.he.notFound}<br><span dir="ltr">${L.fr.notFound}</span></p>`;
    }
  })();
})();
