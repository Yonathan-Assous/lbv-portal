// A La Belle Vie quote, as the client sees it: /quote/?id=q-…&t=… (the signed link the admin sends).
// Real A4 pages, each with the logo header. Every fixed word comes from quote-texts.json (he / fr).
(function () {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const qs = new URLSearchParams(location.search);
  const id = qs.get('id') || '', token = qs.get('t') || '';
  const api = `/api/quotes?view=${encodeURIComponent(id)}&t=${encodeURIComponent(token)}`;
  const PAGE_W = 794;
  const CONTACT0 = { phone: '058-518-2655', phone2: '058-555-1826', email: 'LBV0585551826@gmail.com' };
  const intl = s => { let d = String(s || '').replace(/[^\d]/g, ''); if (d.startsWith('0')) d = '972' + d.slice(1); return d; };

  // Numbers, prices and dates are isolated left-to-right, so nothing flips inside Hebrew text.
  const ltr = s => `<bdi dir="ltr">${s}</bdi>`;
  /** 1,250 ₪ in both languages (decimals only when there are any). */
  const amount = (v, cur) => {
    const n = Math.round((Number(v) || 0) * 100) / 100;
    return `${n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })} ${cur === 'EUR' ? '€' : '₪'}`;
  };
  const money = (v, cur) => ltr(amount(v, cur));
  const pad = n => String(n).padStart(2, '0');
  /** 21.10.2026 in both languages. */
  const dmy = d => ltr(`${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`);
  /** The event date as typed in the admin: 2026-10-21, 21/10/2026 or 21.10.26 become 21.10.2026; free text stays as written. */
  const eventDate = s => {
    s = String(s || '').trim();
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) return ltr(`${pad(m[3])}.${pad(m[2])}.${m[1]}`);
    m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})$/);
    if (m) return ltr(`${pad(m[1])}.${pad(m[2])}.${m[3].length === 2 ? '20' + m[3] : m[3]}`);
    return esc(s);
  };

  /** The same totals as the admin: services, chapters with a price, item lines, the packages' setup. */
  function totals(q) {
    const sub = (q.sections || []).reduce((s, x) => s + (Number(x.price) || 0), 0)
      + (q.services || []).reduce((s, x) => s + (Number(x.price) || 0), 0)
      + (q.items || []).reduce((s, it) => s + (/^[#=] /.test(it.name || '') ? 0 : (Number(it.qty) || 1) * (Number(it.price) || 0)), 0)
      + (q.packages && q.packages.setup ? Number(q.packages.setup.price) || 0 : 0);
    const after = Math.max(0, sub - (Number(q.discount) || 0));
    const r = (Number(q.vatRate) || 18) / 100;
    if (q.vat === 'plus') return { sub, after, vat: after * r, total: after * (1 + r) };
    if (q.vat === 'incl') return { sub, after, vat: after - after / (1 + r), total: after };
    return { sub, after, vat: 0, total: after };
  }

  /** The quote as blocks, in the order of the brief; the layout puts as many as fit on each A4 page. */
  function blocks(q, t) {
    const who = (q.client && q.client.name) || '';
    const fill = s => esc(String(s || '').replace(/\{client\}/g, who));
    const cur = v => money(v, q.currency);
    const prices = !q.hidePrices;
    const issued = new Date(q.createdAt || Date.now());
    const until = new Date(issued.getTime() + (Number(q.validDays) || 30) * 86400000);
    const out = [];

    // 1. Number, date, validity
    out.push({ html: `<dl class="q-meta">
      <div><dt>${t.number}</dt><dd>${ltr(esc(q.number || ''))}</dd></div>
      <div><dt>${t.date}</dt><dd>${dmy(issued)}</dd></div>
      <div><dt>${t.validUntil}</dt><dd>${dmy(until)}</dd></div></dl>` });

    // 2. To
    const c = q.client || {}, ev = q.event || {};
    const toRows = [
      c.phone && [t.phone, ltr(esc(c.phone))],
      ev.type && [t.event, fill(ev.type)],
      ev.date && [t.eventDate, eventDate(ev.date)],
    ].filter(Boolean);
    out.push({ html: `<section class="q-to"><h2>${t.to}</h2>${c.name ? `<p class="q-to__name">${esc(c.name)}</p>` : ''}
      ${toRows.length ? `<dl>${toRows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>` : ''}</section>` });

    // 3. Items: services (one overall price each), or priced chapters in older quotes, then item lines and the setup
    const svcs = (q.services || []).filter(v => v.name);
    const rows = [];
    const line = (desc, note, qty, unit) => rows.push({ desc, note, qty: Number(qty) || 1, unit: Number(unit) || 0 });
    if (svcs.length) {
      // A service's price is its own overall price plus any price written on the chapters inside it.
      const own = v => (Number(v.price) || 0) + (q.sections || []).filter(x => x.svc === v.id).reduce((t, x) => t + (Number(x.price) || 0), 0);
      svcs.forEach(v => line(fill(v.name), [v.note, v.unit].filter(Boolean).map(fill).join(' · '), 1, own(v)));
      (q.sections || []).filter(x => Number(x.price) && x.title && !svcs.some(v => v.id === x.svc)).forEach(x => line(fill(x.title), fill(x.unit), 1, x.price));
    }
    else (q.sections || []).filter(s => !s.afterPrice && s.title).forEach(s => line(fill(s.title), fill(s.unit), 1, s.price));
    let group = 0;
    (q.items || []).forEach(it => {
      const name = String(it.name || '');
      if (svcs.length && (/^[#=] /.test(name) || !Number(it.price))) return;
      if (name.startsWith('# ')) { rows.push({ group: fill(name.slice(2)) }); group = 0; return; }
      if (name.startsWith('= ')) { rows.push({ sub: fill(name.slice(2)), v: group }); group = 0; return; }
      group += (Number(it.qty) || 1) * (Number(it.price) || 0);
      line(fill(name), fill(it.unit), it.qty, it.price);
    });
    const pk = q.packages;
    if (pk && pk.setup && pk.setup.name) line(fill(pk.setup.name), '', 1, pk.setup.price);
    const cell = v => (v ? cur(v) : '<span class="q-dash">–</span>');
    const rowHtml = r => r.group ? `<tr class="q-grp"><td colspan="${prices ? 4 : 1}">${r.group}</td></tr>`
      : r.sub ? (prices ? `<tr class="q-subt"><td colspan="3">${r.sub}</td><td class="n">${cell(r.v)}</td></tr>` : '')
      : `<tr><td>${r.desc}${r.note ? `<small>${r.note}</small>` : ''}</td>${prices ? `<td class="n q">${ltr(r.qty)}</td><td class="n">${cell(r.unit)}</td><td class="n">${cell(r.qty * r.unit)}</td>` : ''}</tr>`;
    const table = (list, cont) => `<table class="q-table${prices ? '' : ' q-table--plain'}"><thead><tr><th>${t.description}${cont ? ` <small>${t.continued}</small>` : ''}</th>${prices ? `<th class="n q">${t.qty}</th><th class="n">${t.unitPrice}</th><th class="n">${t.total}</th>` : ''}</tr></thead>
      <tbody>${list.map(rowHtml).join('')}</tbody></table>`;
    if (rows.length) {
      const CHUNK = 14;
      if (rows.length <= CHUNK) out.push({ html: table(rows) });
      else for (let i = 0; i < rows.length; i += CHUNK) out.push({ html: table(rows.slice(i, i + CHUNK), i > 0) });
    }

    // 4. Summary, on the side
    const tot = totals(q);
    if (prices && tot.sub > 0) {
      const r = Number(q.vatRate) || 18, d = Number(q.discount) || 0, sum = [];
      if (d) sum.push([t.subtotal, cur(tot.sub)], [t.discount, ltr(`− ${amount(d, q.currency)}`)]);
      if (q.vat === 'plus') { if (!d) sum.push([t.subtotal, cur(tot.after)]); sum.push([`${t.vat} ${ltr(r + '%')}`, cur(tot.vat)]); }
      else if (q.vat === 'incl') { if (!d) sum.push([t.subtotal, cur(tot.after - tot.vat)]); sum.push([`${t.vat} ${ltr(r + '%')} <small>${t.vatIncluded}</small>`, cur(tot.vat)]); }
      else if (q.vat === 'note' && q.vatNote) sum.push([t.vat, esc(q.vatNote)]);
      out.push({ html: `<div class="q-sum"><dl>${sum.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}
        <div class="q-sum__total"><dt>${t.totalDue}</dt><dd>${cur(tot.total)}</dd></div></dl></div>` });
    }

    // 5. Included / not included
    const inc = (q.included || []).filter(Boolean), exc = (q.excluded || []).filter(Boolean);
    const list = (h, arr) => arr.length ? `<div><h3>${h}</h3><ul>${arr.map(x => `<li>${fill(x)}</li>`).join('')}</ul></div>` : '';
    if (inc.length || exc.length) out.push({ html: `<section class="q-cols q-lists">${list(t.included, inc)}${list(t.excluded, exc)}</section>` });

    // 6. Payment and cancellation, in small text
    const para = (h, s) => String(s || '').trim() ? `<div><h3>${h}</h3><p>${fill(String(s).trim())}</p></div>` : '';
    if (String(q.payment || '').trim() || String(q.cancellation || '').trim())
      out.push({ html: `<section class="q-cols q-terms">${para(t.payment, q.payment)}${para(t.cancellation, q.cancellation)}</section>` });

    // 7. Approval: on paper, or filled in when the client approved online
    const ok = q.status === 'accepted' && q.accepted;
    out.push({ html: `<section class="q-ok"><h2>${t.approval}</h2><p>${t.approvalLine}</p>
      <div class="q-sign">
        <div><span>${t.name}</span><b>${ok ? esc(q.accepted.name || '') : ''}</b></div>
        <div><span>${t.date}</span><b>${ok && q.accepted.at ? dmy(new Date(q.accepted.at)) : ''}</b></div>
        <div><span>${t.signature}</span><b></b></div></div>
      ${ok && q.accepted.package ? `<p class="q-ok__pk">${t.onlinePackage}: ${esc(q.accepted.package)}</p>` : ''}</section>` });

    // Then, on their own pages: the detail of each service and the packages (when the quote has them)
    const secs = q.sections || [];
    const body = arr => {
      let h = '', open = false;
      for (const raw of (arr || []).map(String)) {
        const kind = raw.startsWith('# ') ? 'h' : raw.startsWith('> ') ? 'p' : 'li';
        const text = fill(kind === 'li' ? raw : raw.slice(2));
        if (!text) continue;
        if (kind === 'li') { if (!open) { h += '<ul>'; open = true; } h += `<li>${text}</li>`; continue; }
        if (open) { h += '</ul>'; open = false; }
        h += kind === 'h' ? `<h5>${text}</h5>` : `<p>${text}</p>`;
      }
      return h + (open ? '</ul>' : '');
    };
    // A chapter is laid out line by line: it continues on the next page only when it does not fit.
    const chapter = (s, svcName) => {
      const bl = (s.bullets || []).map(String);
      const title = String(s.title).trim() === String(svcName || '').trim() ? '' : fill(s.title);   // no repeat of the service's own name
      const part = (a, b, cont) => `<section class="q-ch">${title ? `<h4>${title}${cont ? ` <small>${t.continued}</small>` : ''}</h4>` : ''}${body(bl.slice(a, b))}</section>`;
      // where a page may end: never right after a sub-heading
      const cuts = bl.map((x, i) => i + 1).filter(i => i < bl.length && !bl[i - 1].startsWith('# ') && i >= 2 && bl.length - i >= 2);
      return [{ html: part(0, bl.length), part, n: bl.length, cuts }];
    };
    const annex = [];
    const withBody = s => s.title && (s.bullets || []).length;
    if (svcs.length) svcs.forEach(v => {
      const chs = secs.filter(s => !s.afterPrice && s.svc === v.id && withBody(s));
      if (!chs.length) return;
      annex.push({ html: `<h3 class="q-svc">${fill(v.name)}</h3>`, keep: true });
      chs.forEach(s => annex.push(...chapter(s, v.name)));
    });
    else secs.filter(s => !s.afterPrice && withBody(s)).forEach(s => annex.push(...chapter(s)));
    if (pk && pk.options && pk.options.length) {
      annex.push({ html: `<h3 class="q-svc">${fill(pk.title)}</h3>`, keep: true });
      pk.options.forEach(o => annex.push({ html: `<section class="q-ch"><h4>${esc(o.name)}${o.recommended ? ` <small>${t.recommended}</small>` : ''}${prices && Number(o.price) ? `<span class="q-ch__price">${cur(o.price)}${pk.unit ? ` <small>${esc(pk.unit)}</small>` : ''}</span>` : ''}</h4>${body(o.bullets)}</section>` }));
      if ((pk.extras || []).length) annex.push({ html: `<section class="q-ch">${body(pk.extras)}</section>` });
      if (pk.note) annex.push({ html: `<section class="q-ch"><p>${fill(pk.note)}</p></section>` });
    }
    secs.filter(s => s.afterPrice && withBody(s)).forEach(s => annex.push(...chapter(s)));
    if (annex.length) out.push({ html: `<h2 class="q-annex">${t.details}</h2>`, keep: true, newPage: true }, ...annex);
    return out;
  }

  /** Lays the blocks out on A4 pages: as many as fit, then a new page. */
  function paginate(q, t, contact) {
    const c = { ...CONTACT0, ...(contact || {}) };
    // The logo header, unchanged.
    const head = (i, n) => `<header class="pg-head"><img class="pg-logo" src="../media/logo-events.png" alt="La Belle Vie" width="600" height="528">
      <div class="pg-meta"><b>${esc(t.kind)}</b><small>${esc(q.number || '')}</small><small>${t.page.replace('{i}', i).replace('{n}', n)}</small></div></header>`;
    const foot = `<footer class="pg-foot">${[
      c.phone && `<a href="tel:+${intl(c.phone)}">${ltr(esc(c.phone))}</a>`,
      c.phone2 && `<a href="tel:+${intl(c.phone2)}">${ltr(esc(c.phone2))}</a>`,
      c.email && `<a href="mailto:${esc(c.email)}">${ltr(esc(c.email))}</a>`,
      `<a href="https://www.lbv-event.com" target="_blank" rel="noopener">${ltr('lbv-event.com')}</a>`,
    ].filter(Boolean).join('<span class="sep" aria-hidden="true"></span>')}</footer>`;
    // Measure each block inside a hidden page of the real size.
    const probe = document.createElement('div');
    probe.className = 'page'; probe.style.cssText = 'position:absolute;visibility:hidden;left:-9999px;top:0;zoom:1';
    probe.innerHTML = head(1, 1) + '<div class="pg-body"></div>' + foot;
    document.body.append(probe);
    const body = probe.querySelector('.pg-body');
    const cs = getComputedStyle(body);
    const room = body.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 4;
    // (measured with a second block after it, so the gap below counts as on the page)
    const height = h => { body.innerHTML = `<div class="blk">${h}</div><div class="blk"></div>`; return body.lastChild.offsetTop - body.firstChild.offsetTop; };
    const pages = [[]];
    let used = 0;
    const newPage = () => { if (pages[pages.length - 1].length) { pages.push([]); used = 0; } };
    const list = blocks(q, t);
    list.forEach((b, i) => {
      if (b.newPage) newPage();
      if (b.part && used + height(b.html) > room) {
        // Fill this page with as many lines as fit, then continue on the next one.
        let a = 0;
        while (a < b.n) {
          const ends = [...b.cuts.filter(x => x > a), b.n];
          let end = 0;
          for (const e of ends) { if (used + height(b.part(a, e, a > 0)) <= room) end = e; else break; }
          if (!end) { if (pages[pages.length - 1].length) { newPage(); continue; } end = ends[0]; }
          const h = b.part(a, end, a > 0);
          pages[pages.length - 1].push(h); used += height(h);
          a = end;
          if (a < b.n) newPage();
        }
        return;
      }
      let h = height(b.html);
      // A heading stays with what follows it.
      if (b.keep && list[i + 1]) { const nx = list[i + 1]; h += height(nx.part ? nx.part(0, nx.cuts[0] || nx.n, false) : nx.html); }
      if (used + h > room) newPage();
      pages[pages.length - 1].push(b.html); used += height(b.html);
    });
    probe.remove();
    const n = pages.length;
    return pages.map((p, i) => `<article class="page">${head(i + 1, n)}<div class="pg-body">${p.map(h => `<div class="blk">${h}</div>`).join('')}</div>${foot}</article>`).join('');
  }

  function fit() {
    const z = Math.min(1, (document.documentElement.clientWidth - 16) / PAGE_W);
    document.documentElement.style.setProperty('--z', String(Math.max(.3, z)));
  }

  /** Approving online, under the pages (not printed). */
  function online(q, t) {
    if (q.status === 'accepted') return `<p class="online__done">${t.onlineDone}</p>`;
    const pk = q.packages;
    return `<form class="online__form" id="okForm"><p>${t.onlineHint}</p>
      ${pk && pk.options && pk.options.length ? `<fieldset class="online__pk"><legend>${t.onlinePackage}</legend>${pk.options.map((o, i) => `<label><input type="radio" name="pkg" value="${esc(o.name)}" ${o.recommended || (!pk.options.some(x => x.recommended) && !i) ? 'checked' : ''}>${esc(o.name)}</label>`).join('')}</fieldset>` : ''}
      <div class="online__row"><input type="text" name="name" required autocomplete="name" placeholder="${t.onlineName}" aria-label="${t.onlineName}"><button class="act act--gold" type="submit">${t.onlineButton}</button></div></form>`;
  }

  function render(q, T, contact) {
    const lang = q.lang === 'fr' ? 'fr' : 'he', t = T[lang];
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'fr' ? 'ltr' : 'rtl';
    document.title = `${t.kind} ${q.number || ''} – La Belle Vie`;
    $('#pages').innerHTML = paginate(q, t, contact);
    $('#online').innerHTML = online(q, t);
    $('#online').hidden = false;
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
        render(await r.json(), T, contact);
      } catch (err) { btn.disabled = false; alert(t.onlineError); }
    });
  }

  $('#printBtn').addEventListener('click', () => window.print());
  addEventListener('resize', fit);
  (async () => {
    let T = null;
    try {
      const [r, texts, content] = await Promise.all([
        fetch(api, { cache: 'no-store' }),
        fetch('quote-texts.json', { cache: 'no-cache' }).then(x => x.json()),
        fetch('/api/content', { cache: 'no-store' }).then(x => (x.ok && x.status !== 204 ? x.json() : null)).catch(() => null),
      ]);
      T = texts;
      if (!r.ok) throw new Error();
      const q = await r.json();
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      render(q, T, content && content.contact);
    } catch (e) {
      $('#pages').innerHTML = T ? `<p class="err">${T.he.notFound}<br><span dir="ltr">${T.fr.notFound}</span></p>` : '<p class="err">…</p>';
    }
  })();
})();
