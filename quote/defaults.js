// The ready-made chapters of a La Belle Vie quote, in Hebrew and French (from the company's own quote).
// "{client}" is replaced by the client's name when a chapter is added to a quote. The admin can edit all of it.
export const QUOTE_DEFAULTS = {
  vatRate: 18,
  he: {
    title: 'הצעת מחיר',
    subtitle: 'הפקה מלאה, מקצה לקצה',
    intro: 'La Belle Vie מציעה לכם ליווי מלא של הערב, מהרעיון הראשון ועד התיאום ביום האירוע. המטרה שלנו: ערב אלגנטי ומרגש, שמשרת את {client} ומחזק את הקשר עם התורמים.',
    lines: ['תקציב הספקים החיצוניים שייבחרו: אולם, קייטרינג, עיצוב, טכני, הופעות, הדפסות ומתנות'],
    payment: '',
    closing: 'החבילה כוללת את הליווי והתיאום של כל הסעיפים שפורטו למעלה. רכישות, השכרות, הפקות וספקים חיצוניים מתומחרים לפי הבחירות והכמויות שנאשר יחד. כל הוצאה מקבלת את האישור שלכם לפני שמתחייבים.',
    tagline: 'חזון אחד. הפקה מלאה. ערב שנראה בדיוק כמו שחלמתם.',
  },
  fr: {
    title: 'Devis',
    subtitle: 'Prestation complète clé en main',
    intro: 'LA BELLE VIE vous propose une prise en charge complète de votre gala, de la création du concept jusqu’à la coordination de la soirée. Notre objectif : concevoir un événement élégant et marquant, au service du rayonnement de {client} et de la mobilisation de ses donateurs.',
    lines: ['Budget des prestations externes retenues : salle, restauration, décoration, technique, animations, impressions et cadeaux'],
    payment: '',
    closing: 'Le forfait comprend l’accompagnement et la coordination des postes détaillés ci-dessus. Les achats, locations, fabrications et prestations externes sont chiffrés selon les choix et quantités validés ensemble. Chaque dépense est soumise à votre accord avant engagement.',
    tagline: 'Une vision, une organisation complète, une soirée à votre image.',
  },
  // Social media management: a one-time setup, then a monthly package the client chooses (shown side by side).
  social: {
    he: {
      title: "ניהול רשתות חברתיות", intro: "כל מה שצריך כדי שהעסק יופיע ויימכר ברשתות: פתיחת החשבונות ומיתוגם, כתיבת תוכן, צילום ועריכת סרטונים, העלאה שוטפת, מענה לגולשים וקמפיינים ממומנים. אתם מתמקדים בעסק, ואנחנו בכל השאר.",
      unit: "לחודש",
      setup: { name: "הקמה מאפס (תשלום חד־פעמי)", price: 2900, bullets: ["פתיחת חשבונות אינסטגרם, פייסבוק וטיקטוק, חשבון עסקי ומנהל מודעות.", "מיתוג הפרופילים: תמונת פרופיל וקאבר, ביוגרפיה, קישורים וכפתור וואטסאפ.", "עיצוב בסיס: כיסויי הייליטס ותבניות קבועות לפוסטים ולסרטונים.", "אסטרטגיה ותוכנית תוכן: פגישת אפיון, קהל יעד, בדיקת מתחרים ותוכנית לחודש הראשון."] },
      options: [
        { name: "בסיס", price: 2400, recommended: false, bullets: ["אינסטגרם ופייסבוק", "8 פוסטים מעוצבים בחודש", "4 סרטוני רילס ערוכים", "3 סטוריז בשבוע", "מענה לתגובות והודעות א׳–ה׳", "דו״ח ביצועים חודשי"] },
        { name: "צמיחה", price: 3900, recommended: true, bullets: ["אינסטגרם, פייסבוק וטיקטוק", "יום צילום בעסק פעם בחודש", "12 פוסטים מעוצבים", "8 סרטוני רילס ערוכים", "5 סטוריז בשבוע", "מענה לתגובות והודעות א׳–ו׳", "עד 3 קמפיינים ממומנים", "דו״ח ביצועים חודשי ופגישה"] },
        { name: "פרימיום", price: 6500, recommended: false, bullets: ["אינסטגרם, פייסבוק, טיקטוק ויוטיוב שורטס", "2 ימי צילום בחודש", "16 פוסטים מעוצבים", "12 סרטוני רילס ערוכים", "סטוריז כל יום", "מענה לתגובות והודעות א׳–ו׳", "עד 5 קמפיינים ממומנים", "דו״ח שבועי ופגישה חודשית"] },
      ],
      note: "תקציב הפרסום עצמו משולם ישירות למטא או לטיקטוק, ואינו כלול במחיר החבילה.",
    },
    fr: {
      title: "Gestion des réseaux sociaux", intro: "Tout ce qu’il faut pour que votre activité existe et vende sur les réseaux : création et image des comptes, rédaction, tournage et montage vidéo, publication régulière, réponses aux abonnés et campagnes sponsorisées. Vous vous concentrez sur votre activité, nous nous occupons du reste.",
      unit: "par mois",
      setup: { name: "Mise en place (paiement unique)", price: 2900, bullets: ["Création des comptes Instagram, Facebook et TikTok, compte professionnel et gestionnaire de publicités.", "Image des profils : photo, couverture, bio, liens et bouton WhatsApp.", "Design de base : couvertures des stories à la une et modèles de publications et vidéos.", "Stratégie et plan de contenu : rendez-vous de lancement, cible, analyse de la concurrence et plan du premier mois."] },
      options: [
        { name: "Essentiel", price: 2400, recommended: false, bullets: ["Instagram et Facebook", "8 publications par mois", "4 reels montés", "3 stories par semaine", "Réponses aux commentaires et messages du dimanche au jeudi", "Rapport mensuel"] },
        { name: "Croissance", price: 3900, recommended: true, bullets: ["Instagram, Facebook et TikTok", "Une journée de tournage par mois", "12 publications", "8 reels montés", "5 stories par semaine", "Réponses du dimanche au vendredi", "Jusqu’à 3 campagnes sponsorisées", "Rapport mensuel et rendez-vous"] },
        { name: "Premium", price: 6500, recommended: false, bullets: ["Instagram, Facebook, TikTok et YouTube Shorts", "2 journées de tournage par mois", "16 publications", "12 reels montés", "Stories tous les jours", "Réponses du dimanche au vendredi", "Jusqu’à 5 campagnes sponsorisées", "Rapport hebdomadaire et rendez-vous mensuel"] },
      ],
      note: "Le budget publicitaire est payé directement à Meta ou TikTok et n’est pas inclus dans le prix du forfait.",
    },
  },
  sections: [
    {
      he: { title: 'תכנון והפקה כללית', bullets: [
        'הגדרת הקונספט, הנושא והקו המנחה של הערב.',
        'בניית תקציב משוער לפי סדרי העדיפויות שלכם.',
        'איתור והצעת מקומות מתאימים.',
        'משא ומתן ותיאום מול האולם והספקים.',
        'בניית לוח זמנים מפורט לכל ההכנות, וליווי צמוד לאורך כל הדרך.',
        'ייעוץ לגבי התוכנית ורגעי השיא של הערב.'] },
      fr: { title: 'Conception et organisation générale', bullets: [
        'Définition du concept, du thème et du fil conducteur de la soirée.',
        'Élaboration du budget prévisionnel selon vos priorités.',
        'Recherche et proposition de lieux adaptés.',
        'Négociation et coordination avec la salle et les prestataires.',
        'Création du rétroplanning et accompagnement tout au long des préparatifs.',
        'Conseils sur le programme et les temps forts du gala.'] },
    },
    {
      he: { title: 'זהות חזותית ועיצוב גרפי', bullets: [
        'עיצוב לוגו לערב, בהתאמה לזהות של {client}.',
        'הגדרת צבעים, גופנים ושפה עיצובית.',
        'עיצוב Save the Date והזמנות, דיגיטליות ומודפסות.',
        'הזמנה דיגיטלית עם טופס אישור הגעה.',
        'התאמת העיצובים לוואטסאפ ולרשתות החברתיות.',
        'עיצוב תפריטים, תוכניות, כרטיסי ישיבה, מספרי שולחנות ושילוט.',
        'עיצוב חומרי התרמה, התחייבויות והגרלה.',
        'עימוד ברכת המזון, כרטיסי תודה ומתנות אישיות.',
        'עיצוב גרפיקה למסכים, לבמה ולרקע שמאחורי הרבנים.'] },
      fr: { title: 'Identité visuelle et création graphique', bullets: [
        'Création d’un logo de soirée, en harmonie avec l’identité de {client}.',
        'Définition des couleurs, des typographies et de l’univers graphique.',
        'Création du save the date et des invitations numériques et imprimées.',
        'Conception d’une invitation en ligne avec formulaire de confirmation de présence.',
        'Déclinaison des visuels pour WhatsApp et les réseaux sociaux.',
        'Création des menus, programmes, marque-places, numéros de table et signalétique.',
        'Conception des supports de dons, engagements et tombola.',
        'Mise en page de Birkat Hamazon, cartes de remerciement et cadeaux personnalisés.',
        'Création des visuels pour les écrans, la scène et le fond derrière les Rabbanim.'] },
    },
    {
      he: { title: 'עיצוב ותפאורה', bullets: [
        'תכנון האווירה והעיצוב בהתאם לנושא.',
        'הצעה לסידור האולם, אזור הקבלה והבמה.',
        'בחירת מרכזי שולחן, סידורי פרחים ואלמנטים עיצוביים.',
        'הדגשת האזורים של האורחים, השותפים והתורמים.',
        'עיצוב פינת צילום אישית.',
        'פיקוח על ההקמה והגימורים לפני פתיחת הדלתות.'] },
      fr: { title: 'Décoration et mise en scène', bullets: [
        'Conception de l’ambiance et de la décoration en accord avec le thème.',
        'Proposition d’aménagement de la salle, de l’accueil et de la scène.',
        'Sélection des centres de table, compositions florales et éléments décoratifs.',
        'Mise en valeur des espaces dédiés aux invités, aux partenaires et aux donateurs.',
        'Conception d’un espace photo personnalisé.',
        'Supervision de l’installation et des finitions avant l’ouverture des portes.'] },
    },
    {
      he: { title: 'קייטרינג ובחירת ספקים', bullets: [
        'איתור, בחירה ומשא ומתן עם ספקים בהתאם לתקציב.',
        'תיאום קבלת הפנים, הארוחה והשירות מול האולם או הקייטרינג.',
        'הקפדה על דרישות הכשרות שתעבירו אלינו.',
        'ארגון המוזיקה וההופעות.',
        'תיאום הצלם, צלם הווידאו והצוותים הטכניים.',
        'ארגון ההגברה, התאורה, המסכים וההקרנות.'] },
      fr: { title: 'Restauration et sélection des prestataires', bullets: [
        'Recherche, sélection et négociation avec les prestataires adaptés au budget.',
        'Coordination du cocktail, du dîner et du service avec la salle ou le traiteur.',
        'Prise en compte des exigences de cacherout communiquées.',
        'Organisation des prestations musicales et des animations.',
        'Coordination du photographe, du vidéaste et des équipes techniques.',
        'Organisation des besoins en sonorisation, éclairage, écrans et projection.'] },
    },
    {
      he: { title: 'תוכנית, תכנים והתרמה', bullets: [
        'בניית סדר ערב מפורט.',
        'ארגון הנאומים, ההקרנות והקטעים המוזיקליים.',
        'תיאום התכנים שמציגים את המוסד ואת הפרויקטים שלו.',
        'הכנת חומרים להוקרת השותפים והתורמים.',
        'תכנון רגעי ההתרמה יחד עם הנהלת המוסד.',
        'ארגון ההגרלה והכנת החומרים שלה.',
        'הכנה וניהול של מספרי ההגרלה בשידור חי על המסכים.',
        'תיאום הפרסים והענקתם לזוכים.'] },
      fr: { title: 'Programme, contenus et collecte de dons', bullets: [
        'Construction du déroulé détaillé de la soirée.',
        'Organisation des interventions, discours, projections et séquences musicales.',
        'Coordination des contenus présentant l’institution et ses projets.',
        'Préparation des supports de mise à l’honneur des partenaires et donateurs.',
        'Conception des séquences d’appel aux dons avec les responsables de l’association.',
        'Organisation de la tombola et préparation des supports associés.',
        'Préparation et gestion de l’affichage des numéros de tombola en direct sur les écrans.',
        'Coordination des lots et de leur remise aux gagnants.'] },
    },
    {
      he: { title: 'קבלת פנים וחוויית האורחים', bullets: [
        'ריכוז אישורי ההגעה.',
        'הכנת סידור ההושבה יחד עם הצוות של {client}.',
        'ארגון קבלת הפנים וההושבה.',
        'תשומת לב מיוחדת לרבנים, לאורחי הכבוד ולשותפים.',
        'איתור והצעת מתנות אישיות.',
        'תיאום ההצגה והחלוקה שלהן.'] },
      fr: { title: 'Accueil et expérience des invités', bullets: [
        'Centralisation des confirmations de présence.',
        'Préparation du plan de table avec l’équipe de {client}.',
        'Organisation de l’accueil et du placement.',
        'Attention particulière portée aux Rabbanim, invités d’honneur et partenaires.',
        'Recherche et proposition de cadeaux personnalisés.',
        'Coordination de leur présentation et de leur distribution.'] },
    },
    {
      he: { title: 'תיאום מלא ביום האירוע', bullets: [
        'נוכחות של La Belle Vie לפיקוח על ההקמה ועל מהלך הערב.',
        'בדיקת העיצוב, החומרים המודפסים והציוד.',
        'תדריך ותיאום של כל אנשי המקצוע.',
        'ניהול לוח הזמנים, המעברים והבלת״מים.',
        'מעקב אחרי השירות, ההופעות, ההקרנות ורגעי השיא.',
        'כתובת אחת לכל דבר, כדי שהצוות של {client} יוכל להתפנות לאורחים.'] },
      fr: { title: 'Coordination complète le jour du gala', bullets: [
        'Présence de LA BELLE VIE pour superviser l’installation et le déroulement de l’événement.',
        'Vérification de la décoration, des supports imprimés et des équipements.',
        'Brief et coordination des différents intervenants.',
        'Gestion du timing, des transitions et des imprévus.',
        'Suivi du service, des animations, des projections et des temps forts.',
        'Interlocuteur central pour permettre à l’équipe de {client} de se consacrer à ses invités.'] },
    },
    {
      he: { title: 'ליווי אחרי האירוע', bullets: [
        'תיאום קבלת התמונות והסרטונים מהספקים.',
        'עיצוב מסר או גרפיקת תודה.',
        'סיכום האירוע יחד עם המארגנים.'] },
      fr: { title: 'Suivi après l’événement', bullets: [
        'Coordination de la récupération des photos et vidéos auprès des prestataires.',
        'Création du visuel ou message de remerciement.',
        'Bilan de l’événement avec les organisateurs.'] },
    },
  ],
};
