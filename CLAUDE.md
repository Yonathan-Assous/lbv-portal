# Instructions pour Claude – nouvelle page d'accueil La Belle Vie

Ce fichier a été écrit par Yichai (avec Claude) pour son père, Yonathan, et pour le Claude qu'il utilisera.
Avant chaque étape importante, explique à Yonathan ce que tu vas faire et attends son accord.

## Objectif

La branche `feat/nouvelle-page-accueil` remplace l'ancienne page d'accueil (`index.html` sur `main`,
« La Belle Vie - Services Communautaires ») par le nouveau site :
- la page d'accueil en hébreu (`index.html`), en français (`fr/`) et en anglais (`en/`) ;
- une administration complète sur `/admin`, avec la gestion des textes, des photos, des vidéos et des séjours, les demandes reçues, les gestionnaires et leurs rôles, des statistiques et un guide.

Yonathan veut que cette branche devienne la page principale du site.

## Ce qui a déjà été vérifié

- `main` est entièrement contenu dans la branche, donc la fusion se fait sans conflit.
- Le dossier `campaigns/` est identique. Rien ne change pour les campagnes existantes.
- Le seul fichier supprimé est `styles.css`, qui servait uniquement à l'ancienne page. Aucune autre page ne l'utilise.
- Le site fonctionne même sans configuration : il affiche le contenu de `content.json`. Seule l'administration a besoin des réglages Vercel ci-dessous.

## Étapes (chacune seulement avec l'accord de Yonathan)

1. **Relire.** Montrer à Yonathan le diff `main...feat/nouvelle-page-accueil` et un aperçu de la page.
   Pour l'aperçu local : `node tools/serve.mjs`, puis ouvrir http://localhost:5190.
   Pour tester l'administration en local, définir avant `ADMIN_PASSWORD` avec une valeur de test.
2. **Pull Request.** Ouvrir une PR de `feat/nouvelle-page-accueil` vers `main`, sur `Yonathan-Assous/lbv-portal`.
3. **Vercel** (projet du site de Yonathan). Configurer avant la fusion, ou juste après :
   - **Stockage public** : Storage → Create → **Blob** (accès *public*), connecté au projet. Cela crée `BLOB_READ_WRITE_TOKEN`, utilisé pour les textes, les photos et les vidéos de l'admin.
   - **Stockage privé** : un deuxième store **Blob** en accès *private*, connecté au projet avec le préfixe de variable `LEADS`. Cela donne `LEADS_READ_WRITE_TOKEN`. Il contient les demandes des visiteurs (inscriptions, devis) et les comptes des gestionnaires. Il ne doit jamais être public.
   - **Variables** (Settings → Environment Variables, en *Production*) :
     - `ADMIN_PASSWORD` : le mot de passe principal du propriétaire. Yonathan le tape lui-même, ne jamais l'écrire dans le code.
     - `ADMIN_SECRET` : une longue chaîne aléatoire qui sert à signer les sessions. Recommandé.
     - Facultatif, pour envoyer des e-mails depuis l'admin : `RESEND_API_KEY`, `EMAIL_FROM` et `EMAIL_REPLY_TO`.
   - **Analytics** : onglet Analytics → Enable, pour les statistiques de visites dans l'admin.
4. **Fusion.** Fusionner la PR uniquement quand Yonathan le dit, puis le laisser lancer ou valider le déploiement en production.
5. **Après la mise en ligne.** Se connecter sur `/admin` avec le nom d'utilisateur `owner` et `ADMIN_PASSWORD`.
   Dans *הגדרות → מנהלים* (Paramètres → Gestionnaires), le propriétaire peut changer son nom d'utilisateur et ajouter des gestionnaires.
   Chaque gestionnaire a son propre mot de passe et peut le changer dans *החשבון שלי* (Mon compte).

## Règles à respecter

- Ne jamais modifier `main` directement : tout passe par la PR.
- Ne pas fusionner et ne pas déployer en production sans l'accord explicite de Yonathan.
- Ne jamais copier de secrets, tokens ou fichiers `.env` dans GitHub.
- Ne pas toucher aux projets Gala, Simha et Booking, ni à leurs bases de données. Ce site ne les utilise pas.
- Recommandation de sécurité : d'anciens secrets apparaissent dans l'historique Git des projets gala et simha. Il faut les régénérer (rotation) chez les fournisseurs concernés.

## Repères techniques

- Site statique : `index.html`, `fr/`, `en/`, `style.css` et `app.js` (fenêtres, vidéos, galerie, pages de séjours). `edit-map.js` relie chaque texte de la page à une clé modifiable dans l'admin.
- `content.json` contient le contenu par défaut. Une fois le Blob public branché, l'admin enregistre `site/content.json` dans ce Blob.
- `api/` : fonctions Vercel (Node, ESM) :
  - `login`, `password` et `users` : sessions signées par HMAC, rôles owner, admin, editor et sales, mots de passe en scrypt ;
  - `content` et `upload` : textes et fichiers de l'admin ;
  - `leads`, `send` et `unsubscribe` : demandes des visiteurs, envoi d'e-mails et désinscription.
- `admin/` contient l'interface d'administration, en hébreu, avec édition des textes en hébreu, français et anglais.
- `tools/serve.mjs` est le serveur local qui imite l'API. Les fichiers de test qu'il crée vont dans `data/`, qui n'est pas à committer.
- Une copie de travail existe chez Yichai (`yichaiassous-boop/lbv-portal`, avec un aperçu sur son propre Vercel).
  Les textes ou photos modifiés dans *son* admin restent dans *son* stockage. Si on veut les garder, il faut les reprendre dans `content.json` avant la mise en ligne.
