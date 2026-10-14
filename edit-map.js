// Editable map of the site's texts, shared by the site and the admin.
// It walks the page in a fixed order and gives every text block a key ("faq:3"), and every list a key
// ("sukkot:L0"). The three languages have the same structure, so a key points to the same block in
// /, /fr/ and /en/. The admin reads the original texts from the pages themselves and saves only changes;
// each change remembers the original it replaced, so a change is never applied to the wrong block.
(function () {
  const TEXT = 'h1,h2,h3,h4,p,li,summary,figcaption,cite,a.btn,.badge,.tagline,.vthumb__label';
  // Parts of the page that are built or managed elsewhere (demos, admin-managed lists, generated bits).
  const SKIP = '.rail,.team,.trips,.door__subs,.letter__body,.gallery__grid,.phone,.gn,.rf,.sim,.venue,.gd,.buy,form,.reach,.dock,.float-stack,.player,.lang,.bar__lang,.langs-switch,script,noscript,svg';
  const INLINE = /^(B|STRONG|EM|I|BR|SPAN)$/;
  const LEAD = /^(B|STRONG|TIME)$/;

  /** How a block can be edited: 'lead' (bold start + text), 'plain' (text only), or null (not editable). */
  function shape(el) {
    const kids = [...el.children];
    if (!kids.length) return el.textContent.trim() ? 'plain' : null;
    // "Lines": a title made of several styled lines (each line is a <span>); edited one line per row.
    if (kids.length > 1 && kids.every(k => k.tagName === 'SPAN' && !k.children.length) &&
      [...el.childNodes].every(n => n.nodeType === 1 || !n.textContent.trim())) return 'lines';
    const first = el.firstChild && el.firstChild.nodeType === 3 && !el.firstChild.textContent.trim() ? el.firstChild.nextSibling : el.firstChild;
    // "Lead" blocks: a bold start, then the text (directly, or in one <span>).
    if (first && first.nodeType === 1 && LEAD.test(first.tagName) &&
      (kids.length === 1 || (kids.length === 2 && kids[1].tagName === 'SPAN' && !kids[1].children.length))) return 'lead';
    if (kids.every(k => INLINE.test(k.tagName) && !k.children.length) && el.textContent.trim()) return 'plain';
    return null;
  }
  function read(el, sh) {
    if (sh === 'lines') return { text: [...el.children].map(s => s.textContent.trim()).join('\n') };
    if (sh === 'lead') {
      const b = el.firstElementChild;
      let t = '';
      for (let n = b.nextSibling; n; n = n.nextSibling) t += n.textContent;
      return { lead: b.textContent.trim(), text: t.replace(/\s+/g, ' ').trim() };
    }
    return { text: el.textContent.replace(/\s+/g, ' ').trim() };
  }
  function write(el, sh, v) {
    if (sh === 'lines') {
      const lines = String(v.text || '').split('\n').map(s => s.trim()).filter(Boolean);
      const spans = [...el.children];
      lines.forEach((t, i) => {
        let s = spans[i];
        if (!s) { s = spans[spans.length - 1].cloneNode(); el.append(s); }
        s.textContent = t;
      });
      spans.slice(lines.length).forEach(s => s.remove());
      return;
    }
    if (sh === 'lead') {
      const b = el.firstElementChild;
      const span = b.nextElementSibling && b.nextElementSibling.tagName === 'SPAN' ? b.nextElementSibling : null;
      b.textContent = v.lead || '';
      while (el.firstChild !== b) el.firstChild.remove();
      while (b.nextSibling) b.nextSibling.remove();
      if (span) { span.textContent = v.text || ''; el.append(span); }
      else if (v.text) el.append(' ' + v.text);
    } else el.textContent = v.text || '';
  }
  // A list item in the visitor's language, or the Hebrew one when that language is still empty.
  const pick = (it, lang, keys) => {
    const v = it[lang];
    return v && keys.some(k => String(v[k] || '').trim()) ? v : (it.he || {});
  };
  const same = (a, b) => !!a && !!b && (a.text || '') === (b.text || '') && (a.lead || '') === (b.lead || '');

  /** Scans a document (the live page, or one fetched by the admin). */
  function scan(doc) {
    const scopes = [];
    const add = (el, id, title) => { if (el) scopes.push({ el, id, title }); };
    add(doc.querySelector('header'), 'header', '');
    doc.querySelectorAll('main > section[id]').forEach(s => add(s, s.id, s.dataset.title || (s.querySelector('h1,h2') || {}).textContent || s.id));
    add(doc.querySelector('footer'), 'footer', '');
    const out = [];
    for (const sc of scopes) {
      const blocks = [], lists = [], faqs = [];
      // Lists: every ul/ol whose items are all simple text.
      const listEls = [...sc.el.querySelectorAll('ul,ol')].filter(l => !l.closest(SKIP) && l.children.length &&
        [...l.children].every(li => li.tagName === 'LI' && shape(li)));
      listEls.forEach((l, i) => lists.push({
        key: `${sc.id}:L${i}`, el: l, tag: l.tagName,
        lead: (l.children[0].firstElementChild && LEAD.test(l.children[0].firstElementChild.tagName)) ? l.children[0].firstElementChild.tagName : '',
        items: [...l.children].map(li => read(li, shape(li))),
      }));
      // Questions and answers (<details>), as one list per scope.
      const det = [...sc.el.querySelectorAll('details')].filter(d => !d.closest(SKIP));
      if (det.length) faqs.push({ key: `${sc.id}:Q`, parent: det[0].parentElement, els: det,
        items: det.map(d => ({ q: (d.querySelector('summary') || {}).textContent || '', a: [...d.querySelectorAll('p')].map(p => p.textContent.trim()).join('\n\n') })) });
      let n = 0;
      sc.el.querySelectorAll(TEXT).forEach(el => {
        if (el.closest(SKIP) || el.closest('details') || listEls.some(l => l.contains(el))) return;
        if (el.parentElement && el.parentElement.closest(TEXT) && !el.matches('a.btn')) return;
        const sh = shape(el);
        if (!sh) return;
        blocks.push({ key: `${sc.id}:${n++}`, el, sh, tag: el.tagName, cls: el.className, orig: read(el, sh) });
      });
      out.push({ id: sc.id, title: sc.title, el: sc.el, blocks, lists, faqs });
    }
    return out;
  }

  /** Applies saved changes to the live page. */
  function apply(map, content, lang) {
    const texts = (content && content.texts) || {}, lists = (content && content.lists) || {};
    for (const sc of map) {
      for (const b of sc.blocks) {
        const c = texts[b.key];
        if (!c) continue;
        if (c.hidden) { b.el.hidden = true; b.el.style.display = 'none'; continue; }
        const v = c[lang];
        if (v && v.val && same(v.orig, b.orig)) write(b.el, b.sh, v.val);
      }
      for (const l of sc.lists) {
        const c = lists[l.key];
        if (!c || !Array.isArray(c.items)) continue;
        if (c.hidden) { l.el.style.display = 'none'; continue; }
        const tpl = l.el.children[0];
        l.el.innerHTML = '';
        c.items.filter(it => !it.hidden).forEach(it => {
          const v = pick(it, lang, ['lead', 'text']);
          const li = tpl.cloneNode(true);
          if (l.lead) {
            if (!li.firstElementChild) li.prepend(document.createElement(l.lead.toLowerCase()));
            write(li, 'lead', v);
          } else write(li, 'plain', v);
          l.el.append(li);
        });
      }
      for (const q of sc.faqs) {
        const c = lists[q.key];
        if (!c || !Array.isArray(c.items)) continue;
        const tpl = q.els[0];
        const anchor = q.els[q.els.length - 1].nextSibling;
        q.els.forEach(d => d.remove());
        c.items.filter(it => !it.hidden).forEach(it => {
          const v = pick(it, lang, ['q', 'a']);
          const d = tpl.cloneNode(false);
          const s = document.createElement('summary'); s.textContent = v.q || '';
          d.append(s);
          String(v.a || '').split(/\n\s*\n/).filter(Boolean).forEach(t => { const p = document.createElement('p'); p.textContent = t.trim(); d.append(p); });
          q.parent.insertBefore(d, anchor);
        });
      }
    }
    // Window titles (the gold bar and the banner read data-title when the window is built).
    const titles = (content && content.titles) || {};
    for (const sc of map) {
      const t = titles[sc.id] && titles[sc.id][lang];
      if (t && sc.el.dataset && sc.el.dataset.title !== undefined) {
        sc.el.dataset.title = t;
        const bar = sc.el.querySelector('.sheet__bar strong'), hero = sc.el.querySelector('.sheet-hero h2');
        if (bar) bar.textContent = t;
        if (hero) hero.textContent = t;
      }
    }
  }

  window.LBVEdit = { scan, apply, read, shape, same };
  // The live page is scanned now, before anything else changes it.
  if (document.querySelector('main')) window.LBVEdit.map = scan(document);
})();
