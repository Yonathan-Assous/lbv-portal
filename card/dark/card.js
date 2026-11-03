// The dark version of the Hebrew business card: topics with their videos. To add a video, add a line to its topic.
(() => {
  const PHONE = '972585182655';
  const site = (id, title) => ({ title, src: `/media/${id}.mp4`, poster: `/media/${id}.jpg` });
  const card = (id, title) => ({ title, src: `/card/v/${id}.mp4`, poster: `/card/v/${id}.jpg` });

  const TOPICS = [
    {
      id: 'about', name: 'מי אנחנו', ask: 'לשמוע עוד על La Belle Vie',
      text: 'אווירה משפחתית, צוות אחד, ו-15 שנות ניסיון בחגים ובאירועים.',
      videos: [{ ...site('ilan-short', 'מי זה אילן'), poster: '/card/v/ilan.jpg' }, site('special', 'מה מיוחד אצלנו'), card('profile', 'La Belle Vie בקצרה'), card('both', 'גם חגים, גם אירועים')],
    },
    {
      id: 'holidays', name: 'נופש בחגים', ask: 'לשמוע על נופש בחגים',
      text: 'סוכות ופסח במלון, בכשרות מהדרין, עם מופע בכל ערב ועולם שלם לילדים.',
      videos: [site('why', 'למה La Belle Vie'), site('guests-full', 'האורחים מספרים'), card('families', 'משפחות שחוזרות כל שנה'), site('day', 'יום אחד – אין סוף חוויות'), site('kids', 'גן עדן לילדים'), site('pizza', 'מהמטבח באהבה'), site('vibe', 'האווירה אצלנו'), site('shows', 'ערבים בלתי נשכחים'), site('included', 'חוויה שמחכה לכם'), site('guests', 'כמו אבא ואמא'), card('board', 'השנה בסוכות'), card('pesach', 'פסח 2027')],
    },
    {
      id: 'events', name: 'חתונות, בר מצווה ואירועים', ask: 'לשמוע על הפקת אירוע',
      text: 'צוות אחד מתחילת הדרך ועד הריקוד האחרון. אולם, עיצוב, אוכל, מוזיקה, ואישורי הגעה באפליקציה.',
      videos: [card('reasons', '5 סיבות להפיק איתנו'), card('taktak', 'מה עושה אירוע מושלם'), card('before', 'מה שהאורחים לא רואים'), card('avenue', 'אירוע ב-The Avenue'), card('soon', 'חוגגים בקרוב?'), card('chat', 'בר מצווה בעוד 3 חודשים'), card('groom', 'הצ׳אט של החתן'), card('var', 'בדיקת VAR לאירוע'), card('gifts', 'מזכרת לכל אורח'), card('tip', 'הטיפ השבוע')],
    },
    {
      id: 'gala', name: 'ערבי גאלה והתרמה', ask: 'לשמוע על ערב גאלה או התרמה',
      text: 'מפיקים את הערב כולו: שולחנות, אולם ואוכל, יחד עם כרטיסים מראש, תרומות על המסך, הגרלה ומוקד טלפוני.',
      videos: [card('gala-behind', 'מאחורי הקלעים של ערב גאלה'), card('gala-look', 'איך נראה ערב גאלה אצלנו'), card('gala-system', 'מארגנים ערב התרמה?')],
    },
    {
      id: 'company', name: 'ערבי חברה וימי גיבוש', ask: 'לשמוע על ערב חברה או יום גיבוש',
      text: 'מתכננים ערב לעובדים או יום גיבוש? ספרו לנו מה אתם מחפשים, ואנחנו נדאג לכל השאר.',
      note: 'דוגמאות מהפקות שלנו',
      videos: [card('taktak', 'מה עושה אירוע מושלם'), card('avenue', 'אירוע ב-The Avenue'), card('before', 'מה שהאורחים לא רואים')],
    },
  ];

  const $ = id => document.getElementById(id);
  const wa = ask => `https://wa.me/${PHONE}?text=${encodeURIComponent(`שלום, הגעתי מהכרטיס של La Belle Vie ואשמח ${ask}.`)}`;
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const topics = $('topics');

  topics.insertAdjacentHTML('beforeend', TOPICS.map(t => `
    <section class="topic" id="${t.id}">
      <h3 class="topic__head">
        <button class="topic__btn" type="button" aria-expanded="false" aria-controls="${t.id}-body">
          <span class="topic__fan" aria-hidden="true">${t.videos.slice(0, 3).map(v => `<img src="${v.poster}" alt="" loading="lazy">`).join('')}</span>
          <span class="topic__name">${esc(t.name)}</span>
          <span class="topic__count">${t.videos.length} סרטונים</span>
          <svg class="topic__chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </h3>
      <div class="topic__body" id="${t.id}-body" hidden>
        <p class="topic__text">${esc(t.text)}</p>
        ${t.note ? `<p class="topic__note">${esc(t.note)}</p>` : ''}
        <ul class="rail">${t.videos.map((v, i) => `
          <li><button class="tile" type="button" data-topic="${t.id}" data-i="${i}">
            <span class="tile__pic"><img src="${v.poster}" alt="" loading="lazy"><span class="tile__play" aria-hidden="true"></span></span>
            <span class="tile__title">${esc(v.title)}</span>
          </button></li>`).join('')}
        </ul>
        <a class="topic__ask" href="${wa(t.ask)}" target="_blank" rel="noopener">לשאול אותנו בוואטסאפ</a>
      </div>
    </section>`).join(''));

  const open = (id, scroll) => {
    TOPICS.forEach(t => {
      const on = t.id === id, sec = $(t.id);
      sec.classList.toggle('is-open', on);
      sec.querySelector('.topic__btn').setAttribute('aria-expanded', on);
      $(`${t.id}-body`).hidden = !on;
    });
    if (scroll && id) $(id).scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };

  topics.addEventListener('click', e => {
    const btn = e.target.closest('.topic__btn');
    if (btn) {
      const sec = btn.closest('.topic');
      if (sec.classList.contains('is-open')) open(null);
      else { open(sec.id, true); history.replaceState(null, '', `#${sec.id}`); }
      return;
    }
    const tile = e.target.closest('.tile');
    if (tile) play(tile.dataset.topic, +tile.dataset.i);
  });

  // The player: a video plays only when asked to, and the next one starts only from the button.
  const player = $('player'), video = $('playerVideo');
  let cur = null;
  const play = (topicId, i) => {
    const t = TOPICS.find(x => x.id === topicId), v = t.videos[i];
    cur = { t, i };
    $('playerTitle').textContent = v.title;
    $('playerWa').href = wa(t.ask);
    $('playerPrev').disabled = i === 0;
    $('playerNext').disabled = i === t.videos.length - 1;
    video.poster = v.poster;
    video.src = v.src;
    if (!player.open) player.showModal();
    video.play().catch(() => {});
  };
  const step = d => cur && play(cur.t.id, cur.i + d);
  $('playerPrev').addEventListener('click', () => step(-1));
  $('playerNext').addEventListener('click', () => step(1));
  $('playerClose').addEventListener('click', () => player.close());
  player.addEventListener('click', e => { if (e.target === player) player.close(); });
  player.addEventListener('close', () => { video.pause(); video.removeAttribute('src'); video.load(); });

  // A link can open one topic directly, e.g. /card/dark/#gala
  const fromHash = TOPICS.find(t => `#${t.id}` === location.hash);
  open(fromHash ? fromHash.id : 'about');
  if (fromHash) requestAnimationFrame(() => $(fromHash.id).scrollIntoView({ block: 'start' }));

  const hello = wa('לשמוע עוד על La Belle Vie');
  $('waMain').href = hello;
  $('waDock').href = hello;

  const bg = $('introVideo');
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) bg.play().catch(() => {});

  $('share').addEventListener('click', async () => {
    const url = `${location.origin}/card/dark/`;
    if (navigator.share) { try { await navigator.share({ title: 'La Belle Vie', url }); } catch (e) {} return; }
    try { await navigator.clipboard.writeText(url); } catch (e) { return; }
    const m = $('copied'); m.hidden = false; setTimeout(() => { m.hidden = true; }, 2500);
  });
})();
