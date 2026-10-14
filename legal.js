// Legal & help pages (terms, cancellations, privacy, cookies, accessibility, help) in one window (#legal),
// plus the links to them at the bottom of the footer. Built before app.js wires up the windows.
// The texts describe only what this site really does; anything specific to a booking or an event
// (prices, cancellation terms) is set in that booking or contract, not invented here.
(() => {
  const root = document.documentElement;
  const LANG = ['fr', 'en'].includes(root.lang) ? root.lang : 'he';
  const main = document.getElementById('main'), foot = document.querySelector('.foot');
  if (!main || !foot) return;

  const MAIL = 'LBV0585551826@gmail.com', WA = 'https://wa.me/972585182655';
  const L = {
    he: {
      title: 'מידע משפטי ועזרה', updated: 'עודכן לאחרונה: אוקטובר 2026',
      help: 'עזרה ודיווח על תקלה',
      sections: [
        ['terms', 'תקנון ותנאי שימוש', [
          'האתר מציג את השירותים של La Belle Vie: נופש בחגים, הפקת אירועים, מערכת לערבי גאלה ואפליקציה לחתונות. השימוש באתר מותנה בתנאים האלה.',
          'המידע באתר, כולל התמונות, הסרטונים וההדגמות, נועד להתרשמות. מחירים, תאריכים ותנאים מחייבים רק כפי שהם מופיעים בהצעת מחיר, בהזמנה או בהסכם חתום.',
          'ההדגמות באתר (התרמה, הגרלה, לוח בקרה ועוד) מציגות שמות ומספרים לדוגמה בלבד.',
          'אין להעתיק תכנים, תמונות או סרטונים מהאתר בלי אישור בכתב.',
        ]],
        ['cancel', 'ביטולים והחזרות', [
          'נופש בחגים: תנאי הביטול וההחזר של כל נופש מוצגים באתר ההזמנות לפני התשלום, והם חלק מההזמנה שאתם מאשרים.',
          'הפקת אירועים ומערכת הגאלה: תנאי הביטול נקבעים בהסכם החתום לכל אירוע.',
          'לכל בקשת ביטול או שאלה על החזר, פנו אלינו בוואטסאפ או במייל ונחזור אליכם.',
        ]],
        ['privacy', 'מדיניות פרטיות', [
          'מה אנחנו אוספים: כשאתם נרשמים לעדכונים או מבקשים הצעת מחיר, אתם מוסרים שם, טלפון ו/או מייל ואת סוג השירות שמעניין אתכם. זה הכול. אנחנו לא אוספים מידע אחר עליכם.',
          'למה: כדי לחזור אליכם ולשלוח לכם עדכונים שביקשתם. אנחנו לא מוכרים ולא מעבירים את הפרטים לאף אחד.',
          'איפה זה נשמר: באחסון פרטי ונעול, שרק מנהלי האתר יכולים לפתוח אחרי כניסה עם סיסמה. הפרטים לא נשמרים בקוד האתר.',
          'הסרה: בכל מייל שנשלח יש קישור להסרה מרשימת התפוצה. אפשר גם לבקש מאיתנו למחוק את הפרטים שלכם לגמרי, בוואטסאפ או במייל.',
        ]],
        ['cookies', 'מדיניות עוגיות', [
          'האתר לא משתמש בעוגיות פרסום או מעקב, ולא בכלי ניתוח תנועה.',
          'הדפדפן שלכם שומר רק את השפה שבחרתם, כדי שהאתר ייפתח בה בפעם הבאה. מנהלי האתר מקבלים עוגייה אחת לכניסה למערכת הניהול.',
          'הגופנים באתר נטענים משירות הגופנים של גוגל.',
        ]],
        ['access', 'הצהרת נגישות', [
          'אנחנו רוצים שכל אחד יוכל להשתמש באתר. האתר נבנה עם כתיבה מימין לשמאל בעברית, ניווט מלא במקלדת עם סימון ברור של המקום, טקסט חלופי לתמונות, ניגודיות צבעים גבוהה, והתאמה לטלפון ולמחשב.',
          'מי שהגדיר במכשיר "הפחתת תנועה" יקבל את האתר בלי אנימציות.',
          'אם נתקלתם בחלק באתר שלא נוח או לא נגיש לכם, ספרו לנו בוואטסאפ או במייל ונטפל בזה.',
        ]],
        ['help', 'עזרה ודיווח על תקלה', [
          'משהו לא עובד? שלחו לנו בוואטסאפ או במייל מה ניסיתם לעשות, באיזה מכשיר, ואם אפשר צילום מסך.',
        ]],
      ],
      wa: 'וואטסאפ', mail: 'מייל',
    },
    fr: {
      title: 'Informations légales et aide', updated: 'Dernière mise à jour : octobre 2026',
      help: 'Aide et signaler un problème',
      sections: [
        ['terms', 'Conditions d’utilisation', [
          'Ce site présente les services de La Belle Vie : séjours de fêtes, production d’événements, système pour soirées de gala et application de mariage. Son utilisation implique l’acceptation de ces conditions.',
          'Les informations, photos, vidéos et démonstrations sont données à titre indicatif. Seuls un devis, une réservation ou un contrat signé engagent sur les prix, les dates et les conditions.',
          'Les démonstrations (dons, tombola, tableau de bord…) affichent uniquement des noms et des montants d’exemple.',
          'Toute reproduction des contenus, photos ou vidéos est interdite sans accord écrit.',
        ]],
        ['cancel', 'Annulations et remboursements', [
          'Séjours de fêtes : les conditions d’annulation et de remboursement de chaque séjour sont affichées sur le site de réservation avant le paiement et font partie de la réservation que vous validez.',
          'Production d’événements et système de gala : les conditions d’annulation sont fixées dans le contrat signé pour chaque événement.',
          'Pour toute demande d’annulation ou de remboursement, écrivez-nous sur WhatsApp ou par e-mail.',
        ]],
        ['privacy', 'Politique de confidentialité', [
          'Ce que nous collectons : lorsque vous vous inscrivez aux nouvelles ou demandez un devis, vous nous donnez un nom, un téléphone et/ou un e-mail, et le service qui vous intéresse. Rien d’autre.',
          'Pourquoi : pour vous recontacter et vous envoyer les nouvelles demandées. Nous ne vendons ni ne transmettons vos données à personne.',
          'Où : dans un stockage privé et verrouillé, accessible uniquement aux administrateurs du site après connexion par mot de passe. Vos données ne figurent pas dans le code du site.',
          'Retrait : chaque e-mail contient un lien de désinscription. Vous pouvez aussi nous demander d’effacer entièrement vos données, sur WhatsApp ou par e-mail.',
        ]],
        ['cookies', 'Politique de cookies', [
          'Le site n’utilise ni cookies publicitaires, ni traceurs, ni outil de mesure d’audience.',
          'Votre navigateur garde seulement la langue choisie, pour rouvrir le site dans cette langue. Les administrateurs reçoivent un seul cookie pour se connecter à l’espace de gestion.',
          'Les polices du site sont chargées depuis le service de polices de Google.',
        ]],
        ['access', 'Déclaration d’accessibilité', [
          'Nous voulons que chacun puisse utiliser ce site : navigation complète au clavier avec un repère bien visible, textes alternatifs pour les images, contrastes élevés, affichage adapté au téléphone et à l’ordinateur.',
          'Si votre appareil demande de réduire les animations, le site s’affiche sans animations.',
          'Une partie du site vous pose problème ? Dites-le-nous sur WhatsApp ou par e-mail, nous la corrigerons.',
        ]],
        ['help', 'Aide et signaler un problème', [
          'Quelque chose ne fonctionne pas ? Envoyez-nous sur WhatsApp ou par e-mail ce que vous essayiez de faire, sur quel appareil, et si possible une capture d’écran.',
        ]],
      ],
      wa: 'WhatsApp', mail: 'E-mail',
    },
    en: {
      title: 'Legal information and help', updated: 'Last updated: October 2026',
      help: 'Help and report a problem',
      sections: [
        ['terms', 'Terms of use', [
          'This site presents the services of La Belle Vie: holiday stays, event production, a system for gala evenings and a wedding app. Using the site means accepting these terms.',
          'The information, photos, videos and demos are for illustration. Only a quote, a booking or a signed contract is binding on prices, dates and conditions.',
          'The demos (donations, raffle, control room and more) show example names and amounts only.',
          'Copying content, photos or videos from the site requires our written permission.',
        ]],
        ['cancel', 'Cancellations and refunds', [
          'Holiday stays: the cancellation and refund terms of each stay are shown on the booking site before payment and are part of the booking you confirm.',
          'Event production and the gala system: cancellation terms are set in the signed contract for each event.',
          'For any cancellation or refund request, write to us on WhatsApp or by email.',
        ]],
        ['privacy', 'Privacy policy', [
          'What we collect: when you sign up for updates or ask for a quote, you give us a name, a phone number and/or an email, and the service you are interested in. Nothing else.',
          'Why: to get back to you and send the updates you asked for. We never sell or pass your details to anyone.',
          'Where: in private, locked storage that only the site’s administrators can open after signing in with a password. Your details are not kept in the site’s code.',
          'Removal: every email has an unsubscribe link. You can also ask us to delete your details completely, on WhatsApp or by email.',
        ]],
        ['cookies', 'Cookie policy', [
          'The site uses no advertising or tracking cookies and no analytics tools.',
          'Your browser only keeps the language you chose, so the site opens in it next time. Administrators get a single cookie to sign in to the admin area.',
          'The site’s fonts are loaded from Google’s font service.',
        ]],
        ['access', 'Accessibility statement', [
          'We want everyone to be able to use this site: full keyboard navigation with a clear focus marker, text alternatives for images, high colour contrast, and a layout that works on phones and computers.',
          'If your device asks for reduced motion, the site appears without animations.',
          'If any part of the site is hard to use for you, tell us on WhatsApp or by email and we will fix it.',
        ]],
        ['help', 'Help and report a problem', [
          'Something not working? Send us on WhatsApp or by email what you were trying to do, on which device, and a screenshot if you can.',
        ]],
      ],
      wa: 'WhatsApp', mail: 'Email',
    },
  }[LANG];

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const contact = `<p class="legal__contact"><a class="btn btn--sun" href="${WA}" target="_blank" rel="noopener">${esc(L.wa)}</a><a class="btn btn--line" href="mailto:${MAIL}">${esc(L.mail)}</a></p>`;

  const sec = document.createElement('section');
  sec.className = 'sheet sheet--dark legal';
  sec.id = 'legal';
  sec.dataset.title = L.title;
  sec.innerHTML = `<div class="wrap legal__wrap">
    <h2 class="h2">${esc(L.title)}</h2>
    <nav class="legal__toc">${L.sections.map(([id, t]) => `<a href="#legal-${id}">${esc(t)}</a>`).join('')}</nav>
    ${L.sections.map(([id, t, ps]) => `<article class="legal__part" id="legal-${id}"><h3>${esc(t)}</h3>${ps.map(p => `<p>${esc(p)}</p>`).join('')}${['cancel', 'privacy', 'access', 'help'].includes(id) ? contact : ''}</article>`).join('')}
    <p class="legal__updated">${esc(L.updated)}</p>
  </div>`;
  main.append(sec);

  const links = document.createElement('nav');
  links.className = 'foot__legal';
  links.innerHTML = L.sections.map(([id, t]) => `<a href="#legal-${id}">${id === 'help' ? '<span class="foot__sos" aria-hidden="true">SOS</span>' : ''}${esc(t)}</a>`).join('');
  foot.querySelector('.foot__small').before(links);
})();
