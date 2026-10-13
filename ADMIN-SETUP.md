# ניהול האתר (/admin) – מה צריך להפעיל ב-Vercel
# Administration du site (/admin) – à activer sur Vercel

## עברית

דף הניהול נמצא בכתובת `lbv-event.com/admin`. משם אפשר לשנות את דבר המנכ״ל, את הצוות, את רשימת הנופשים ואת הסרטונים, ולהעלות תמונות וסרטונים.
כדי שהשמירה תעבוד באתר החי, צריך פעמיים לעשות משהו בפרויקט `lbv-portal` ב-Vercel:

1. **אחסון:** בלשונית Storage ← Create ← **Blob** ← לחבר לפרויקט `lbv-portal`. זה מוסיף לבד את המשתנה `BLOB_READ_WRITE_TOKEN`.
2. **סיסמה:** ב-Settings ← Environment Variables להוסיף `ADMIN_PASSWORD` עם סיסמה חזקה (ואפשר גם `ADMIN_SECRET` עם מחרוזת אקראית ארוכה).
3. לעשות Redeploy.

עד שזה מופעל, האתר עובד רגיל עם התוכן שבקובץ `content.json`, ודף הניהול מציג הודעה שהאחסון לא מחובר.
דף הניהול לא נוגע באף מסד נתונים של מערכות אחרות (גאלה, שמחה, הזמנות).

## Français

La page d'administration est sur `lbv-event.com/admin` : mot du directeur, équipe, liste des séjours, vidéos, et envoi de photos/vidéos.
Pour que l'enregistrement fonctionne en production, dans le projet Vercel `lbv-portal` :

1. **Stockage :** Storage → Create → **Blob** → connecter au projet `lbv-portal` (ajoute `BLOB_READ_WRITE_TOKEN`).
2. **Mot de passe :** Settings → Environment Variables → `ADMIN_PASSWORD` (et éventuellement `ADMIN_SECRET`, une longue chaîne aléatoire).
3. Redeploy.

Sans cela, le site fonctionne normalement avec `content.json`, et l'admin affiche que le stockage n'est pas connecté.
Aucune base de données des autres systèmes (gala, simha, booking) n'est utilisée.

## Technique
- `api/` : fonctions Vercel (Node, ESM) – `config`, `login` (cookie HMAC 12 h), `content` (GET public / PUT admin → Blob `site/content.json`), `upload` (jeton d'upload direct navigateur → Blob).
- `content.json` : contenu par défaut, utilisé si le Blob est vide.
- `tools/serve.mjs` : serveur local qui imite l'API (contenu enregistré dans `content.json`, fichiers dans `media/uploads`).
