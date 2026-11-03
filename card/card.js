// The Hebrew business card: topics with their videos. To add a video, add a line to its topic.
(() => {
  const PHONE = '972585182655';
  const site = (id, title) => ({ title, src: `/media/${id}.mp4`, poster: `/media/${id}.jpg` });
  const card = (id, title) => ({ title, src: `/card/v/${id}.mp4`, poster: `/card/v/${id}.jpg` });

  const TOPICS = [
    {
      id: 'about', name: 'מי אנחנו', short: 'הצוות, הניסיון והאווירה', pic: '/card/v/ilan.jpg', ask: 'לשמוע עוד על La Belle Vie',
      text: 'אווירה משפחתית, צוות אחד, ו-15 שנות ניסיון בחגים ובאירועים.',
      videos: [{ ...site('ilan-short', 'מי זה אילן'), poster: '/card/v/ilan.jpg' }, site('special', 'מה מיוחד אצלנו'), card('profile', 'La Belle Vie בקצרה'), card('both', 'גם חגים, גם אירועים')],
    },
    {
      id: 'holidays', name: 'נופש בחגים', short: 'סוכות ופסח במלון, בכשרות מהדרין', pic: '/media/kids.jpg', ask: 'לשמוע על נופש בחגים',
      text: 'סוכות ופסח במלון, בכשרות מהדרין, עם מופע בכל ערב ועולם שלם לילדים.',
      videos: [site('why', 'למה La Belle Vie'), site('guests-full', 'האורחים מספרים'), card('families', 'משפחות שחוזרות כל שנה'), site('day', 'יום אחד – אין סוף חוויות'), site('kids', 'גן עדן לילדים'), site('pizza', 'מהמטבח באהבה'), site('vibe', 'האווירה אצלנו'), site('shows', 'ערבים בלתי נשכחים'), site('included', 'חוויה שמחכה לכם'), site('guests', 'כמו אבא ואמא'), card('board', 'השנה בסוכות'), card('pesach', 'פסח 2027')],
    },
    {
      id: 'events', name: 'חתונות, בר מצווה ואירועים', short: 'מתחילת הדרך ועד הריקוד האחרון', pic: '/card/v/t-events.jpg', ask: 'לשמוע על הפקת אירוע',
      text: 'צוות אחד מתחילת הדרך ועד הריקוד האחרון. אולם, עיצוב, אוכל, מוזיקה, ואישורי הגעה באפליקציה.',
      videos: [card('reasons', '5 סיבות להפיק איתנו'), card('taktak', 'מה עושה אירוע מושלם'), card('before', 'מה שהאורחים לא רואים'), card('avenue', 'אירוע ב-The Avenue'), card('soon', 'חוגגים בקרוב?'), card('chat', 'בר מצווה בעוד 3 חודשים'), card('groom', 'הצ׳אט של החתן'), card('var', 'בדיקת VAR לאירוע'), card('gifts', 'מזכרת לכל אורח'), card('tip', 'הטיפ השבוע')],
    },
    {
      id: 'gala', name: 'ערבי גאלה והתרמה', short: 'הפקה, כרטיסים, תרומות והגרלה', pic: '/card/v/t-gala.jpg', ask: 'לשמוע על ערב גאלה או התרמה',
      text: 'מפיקים את הערב כולו: שולחנות, אולם ואוכל, יחד עם כרטיסים מראש, תרומות על המסך, הגרלה ומוקד טלפוני.',
      videos: [card('gala-behind', 'מאחורי הקלעים של ערב גאלה'), card('gala-look', 'איך נראה ערב גאלה אצלנו'), card('gala-system', 'מארגנים ערב התרמה?')],
    },
    {
      id: 'company', name: 'ערבי חברה וימי גיבוש', short: 'ערב לעובדים או יום גיבוש', pic: '/card/v/t-company.jpg', ask: 'לשמוע על ערב חברה או יום גיבוש',
      text: 'מתכננים ערב לעובדים או יום גיבוש? ספרו לנו מה אתם מחפשים, ואנחנו נדאג לכל השאר.',
      note: 'דוגמאות מהפקות שלנו:',
      videos: [card('taktak', 'מה עושה אירוע מושלם'), card('avenue', 'אירוע ב-The Avenue'), card('before', 'מה שהאורחים לא רואים')],
    },
  ];

  const $ = id => document.getElementById(id);
  const wa = ask => `https://wa.me/${PHONE}?text=${encodeURIComponent(`שלום, הגעתי מהכרטיס של La Belle Vie ואשמח ${ask}.`)}`;
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const dock = $('waDock');

  $('cards').innerHTML = TOPICS.map(t => `
    <li><a class="card" href="#${t.id}">
      <img class="card__pic" src="${t.pic}" alt="" loading="lazy">
      <span class="card__words">
        <span class="card__name">${esc(t.name)}</span>
        <span class="card__short">${esc(t.short)}</span>
        <span class="card__count">${t.videos.length} סרטונים</span>
      </span>
      <svg class="card__arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </a></li>`).join('');

  // The address decides the screen, so the phone's back button works and a link can open one topic (/card/#gala).
  let topic = null;
  const route = () => {
    topic = TOPICS.find(t => `#${t.id}` === location.hash) || null;
    $('home').hidden = !!topic;
    $('topic').hidden = !topic;
    dock.href = wa(topic ? topic.ask : 'לשמוע עוד על La Belle Vie');
    window.scrollTo(0, 0);
    if (!topic) return;
    $('topicName').textContent = topic.name;
    $('topicText').textContent = topic.text;
    $('topicNote').textContent = topic.note || '';
    $('topicNote').hidden = !topic.note;
    $('topicAsk').href = wa(topic.ask);
    $('videos').innerHTML = topic.videos.map((v, i) => `
      <li><button class="video" type="button" data-i="${i}">
        <span class="video__pic"><img src="${v.poster}" alt="" loading="lazy"><span class="video__play" aria-hidden="true"></span></span>
        <span class="video__title">${esc(v.title)}</span>
      </button></li>`).join('');
    $('topicName').focus({ preventScroll: true });
  };
  addEventListener('hashchange', route);
  route();

  $('videos').addEventListener('click', e => {
    const b = e.target.closest('.video');
    if (b) play(+b.dataset.i);
  });

  // The player: a video plays only when asked to, and the next one starts only from the button.
  const player = $('player'), video = $('playerVideo');
  let cur = 0;
  const play = i => {
    const v = topic.videos[i];
    cur = i;
    $('playerTitle').textContent = v.title;
    $('playerWa').href = wa(topic.ask);
    $('playerPrev').disabled = i === 0;
    $('playerNext').disabled = i === topic.videos.length - 1;
    video.poster = v.poster;
    video.src = v.src;
    if (!player.open) player.showModal();
    video.play().catch(() => {});
  };
  $('playerPrev').addEventListener('click', () => play(cur - 1));
  $('playerNext').addEventListener('click', () => play(cur + 1));
  $('playerClose').addEventListener('click', () => player.close());
  player.addEventListener('click', e => { if (e.target === player) player.close(); });
  player.addEventListener('close', () => { video.pause(); video.removeAttribute('src'); video.load(); });

  $('share').addEventListener('click', async () => {
    const url = `${location.origin}/card/`;
    if (navigator.share) { try { await navigator.share({ title: 'La Belle Vie', url }); } catch (e) {} return; }
    try { await navigator.clipboard.writeText(url); } catch (e) { return; }
    const m = $('copied'); m.hidden = false; setTimeout(() => { m.hidden = true; }, 2500);
  });
})();
