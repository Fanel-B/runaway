# Journal des modifications

Chaque entrée indique ce qui a changé, pourquoi, les fichiers concernés, comment l’essayer, ce qui a **réellement** été vérifié, et les limites qui restent.

## 31 octobre 2026 : Tranche 3, API déployable, suppression et conservation

Branche `t3-fiabilisation`, partie de `essai`.

### A. Rendre l’API déployable

**Pourquoi :** jusqu’ici l’API ne tournait que derrière le proxy Vite, sur la même origine. Pour la déployer, il faut décider qui peut l’appeler depuis un navigateur, empêcher un script de remplir la base, et pouvoir suivre une requête dans les logs sans y écrire de secret.

- **CORS** : `CORS_ORIGINS` liste les origines exactes, séparées par des virgules. Une étoile, un chemin ou une origine sans `http(s)://` font échouer le démarrage. Sans valeur, aucun appel d’une autre origine n’est autorisé, ce qui suffit en local grâce au proxy. Pas de cookies (`allow_credentials=False`) : les secrets passent dans l’en-tête `Authorization`.
- **Quota de créations** : `POST /trips` et `POST /trips/example` partagent une fenêtre glissante d’une heure, 10 créations par client et 200 au total, configurables. Au-delà : `429 rate_limited`, un en-tête `Retry-After` et un message lisible dans l’interface. Les requêtes invalides (422) et les échecs du générateur ne consomment pas le quota. Justification du choix dans le README.
- **Logs JSON** : une ligne par requête (méthode, chemin sans query string, statut, durée, `request_id`). L’identifiant est repris de `X-Request-ID` s’il est sûr, sinon généré, et il est renvoyé dans la réponse. Les en-têtes, les corps et les adresses IP ne sont jamais écrits, et une passe finale masque tout ce qui ressemble à un secret. Les logs d’uvicorn passent par le même format, et son journal d’accès est désactivé.
- **Interface** : `VITE_API_URL` permet de viser une API sur un autre domaine. Sans cette variable, l’interface passe toujours par `/api`.
- `/ready` vérifie aussi la colonne de la migration 0003 : une base non migrée est signalée au lieu de provoquer des 503 incompréhensibles.

Fichiers : `backend/app/config.py`, `ratelimit.py` (nouveau), `observability.py` (nouveau), `main.py`, `frontend/src/lib/api.js`, `.env.example`, `backend/tests/conftest.py`, `backend/tests/test_deploy.py` (nouveau).

### B. Suppression et conservation

**Pourquoi :** un voyage doit pouvoir être effacé par celui qui l’a créé, et la base ne doit pas garder indéfiniment des voyages que plus personne n’ouvre.

- **`DELETE /trips/{id}`** : réservé à la clé d’édition. Avec la clé de lecture : 403. Avec un voyage inconnu ou un mauvais secret : le même 404, comme le reste de l’API. Après suppression, les deux clés reçoivent 404.
- **Bouton « Supprimer ce voyage »** dans l’onglet Carnet, visible seulement pour l’organisateur. Le dialogue liste ce qui disparaît et rappelle qu’aucune annulation n’est possible. Le bouton reste désactivé tant que la case « Je comprends que la suppression est définitive » n’est pas cochée. Ensuite l’entrée est retirée du stockage local, et l’accueil confirme la suppression une seule fois.
- **Conservation** : migration `0003` avec `last_opened_at`. Une lecture réussie la rafraîchit, au plus une fois par jour et sans changer la révision. Les voyages existants reçoivent la date de la migration, pour avoir droit à une période complète.
- **Purge** : `python -m app.retention` compte les voyages non ouverts depuis `RETENTION_MONTHS` mois (12 par défaut), et `--apply` les supprime. Elle n’est branchée sur aucune tâche planifiée, et un voyage sans date n’est jamais supprimé.
- **Page de confidentialité** (`#confidentialite`, lien dans le pied de page et dans le Carnet) : données gardées sur le serveur et dans le navigateur, adresse IP, Google Fonts, pourquoi, combien de temps, comment effacer. Chaque phrase correspond à ce que fait le code.
- Le Carnet affiche la règle de conservation. Le message « introuvable » mentionne aussi qu’un voyage a pu être supprimé.

Fichiers : `backend/app/main.py`, `models.py`, `retention.py` (nouveau), `backend/migrations/versions/0003_last_opened.py` (nouveau), `backend/tests/test_retention.py` (nouveau), `test_migration.py`, `frontend/src/components/Carnet.jsx`, `Privacy.jsx` (nouveau), `App.jsx`, `Home.jsx`, `Chrome.jsx`, `TripView.jsx`, `frontend/src/lib/route.js`, `frontend/src/styles/base.css`, `screens.css`.

### Autre changement

- Plus aucun tiret cadratin dans le dépôt (nouvelle règle d’écriture). Un montant absent s’affiche désormais « inconnu » au lieu d’un tiret.

### Pour essayer

1. Migrer la base locale (`MISE_A_JOUR_WINDOWS.md`, étape 2), puis lancer l’API et l’interface comme d’habitude.
2. **Suppression** : « Explorer un exemple », onglet Carnet, « Supprimer ce voyage ». Annuler, puis recommencer en cochant la case. L’accueil confirme la suppression et le voyage a disparu de « Vos voyages récents ».
3. **Confidentialité** : lien « Confidentialité » dans le pied de page.
4. **Quota** : cliquer onze fois sur « Explorer un exemple » en moins d’une heure. La onzième fois affiche « Trop de voyages créés depuis cette connexion ». Relancer l’API remet le compteur à zéro.
5. **CORS** : lancer l’API avec `$env:CORS_ORIGINS = "https://exemple.org"`, puis `curl.exe -i -X OPTIONS http://127.0.0.1:8000/trips -H "Origin: https://pirate.example" -H "Access-Control-Request-Method: POST"` répond 400 sans `access-control-allow-origin`.
6. **Logs** : chaque requête affiche une ligne JSON dans le terminal de l’API. Envoyer `-H "X-Request-ID: mon-essai-01"` avec curl et retrouver cet identifiant dans la ligne.
7. **Purge** : depuis `backend`, `..\..\.venv\Scripts\python.exe -m app.retention` (comptage seul, rien n’est supprimé).

### Tests réellement exécutés

- `pytest` : **67 réussis** (38 avant cette tranche), sur SQLite. Les nouveaux tests couvrent :
  - CORS : origine refusée (preflight 400, pas d’en-tête d’autorisation), origine listée acceptée exactement, aucune origine par défaut, étoile et origines mal formées refusées, lecture depuis l’environnement ;
  - quota : par client, partagé entre les deux routes, retour après la fenêtre, limite globale, requêtes invalides et échecs du générateur non comptés, adresses oubliées après la fenêtre ;
  - logs : JSON valide, `request_id` unique ou repris, aucune clé, aucune empreinte, ni `Bearer` ni `Authorization` sur un parcours création, lecture, modification et suppression ; identifiant entrant douteux remplacé ; masquage ;
  - suppression : 401, 403 lecteur, 404 inconnu et mauvais secret, 204 organisateur, 404 ensuite pour les deux clés, les autres voyages intacts ;
  - conservation : date posée à la création, rafraîchie par une lecture sans changer la révision, pas rafraîchie par un mauvais secret ; calcul des mois (fin de mois, années bissextiles) ; purge qui ne supprime que les voyages trop anciens et garde ceux sans date ; durée nulle refusée ;
  - migration 0002 vers 0003 : un voyage de 2023 reçoit la date de la migration, n’est pas purgé, et survit à un aller-retour downgrade/upgrade.
- **Contrôle par mutation** : en remplaçant temporairement la liste d’origines par `*`, 3 tests CORS échouent. Le code a ensuite été remis en place.
- **Vrai serveur uvicorn** (base temporaire) : création, lecture, mauvaise clé, suppression par le lecteur (403), preflight refusé (400) et accepté, troisième création refusée (429, `Retry-After: 3589`), suppression par l’organisateur (204), relecture (404). Dans le journal produit, recherche faite avec un script Node : aucune des deux clés, aucune empreinte, ni `Bearer` ni `authorization`. 11 lignes de requête sur 11 portent un `request_id`, aucune ne contient d’adresse IP, et les 17 lignes sont du JSON valide.
- **Copie de la base locale** (39 voyages, la base d’origine n’a pas été touchée) : la nouvelle API répond 503 sur `/ready` tant que la copie est en 0002. Après `upgrade head`, la copie est en 0003, les 39 voyages et leurs données sont identiques, tous ont une date de dernière ouverture, et `/ready` répond 200.
- **Commande de purge** sur une base temporaire : comptage de 3 voyages vieillis, `--apply` en supprime 3, un second passage n’en trouve plus.
- `npm run build` : réussi.
- **Navigateur** (Chrome headless piloté par un script local hors dépôt, interface sur `127.0.0.1:5174` et API sur `127.0.0.1:8011`, donc deux origines différentes) :
  - parcours complet existant : **30/30**, donc toute l’application fonctionne en mode CORS ;
  - parcours de la tranche 3 : **14/14** : exemple créé à travers le CORS, zone de suppression et conservation visibles pour l’organisateur, aucune pour le lecteur, suppression par le lecteur refusée par l’API (403), dialogue (bouton désactivé tant que la case n’est pas cochée, Annuler ne supprime rien), suppression confirmée (retour à l’accueil, message, retrait de la liste locale), lien de lecture ensuite « introuvable », message non répété à la visite suivante, page de confidentialité depuis le pied de page avec ses six sections, pas de débordement à 390 et 768 px, message 429 dans l’interface avec une API limitée à une création, appel depuis une origine non autorisée bloqué par le navigateur, aucune erreur JavaScript.
  - Ces tests ont été lancés avec les requêtes externes bloquées (internet était instable cette nuit) : les polices Google n’étaient pas chargées, les polices de secours ont été utilisées.

### Non vérifié

- **PostgreSQL** : ni Docker ni `psql` sur ce poste. Les tests tourneront sur PostgreSQL 17 dans la CI GitHub au push, mais je n’ai pas pu voir leur résultat (pas de CLI `gh`, et l’accès à l’API GitHub m’a été refusé).
- Le comportement derrière un vrai reverse proxy (`--proxy-headers`) n’a pas été testé.
- Pas de test dans Safari, Firefox, sur un vrai téléphone ou avec un lecteur d’écran.

### Limites

- Le quota vit dans la mémoire d’un seul processus : il repart de zéro au redémarrage et n’est pas partagé entre plusieurs instances.
- La purge est manuelle.
- La page de confidentialité n’indique ni responsable ni contact : à compléter avant une mise en ligne.
- Google Fonts reçoit l’adresse IP des visiteurs (c’est écrit sur la page de confidentialité). Héberger les polices supprimerait ce transfert.
- Les logs vont sur la sortie d’erreur : leur durée de conservation dépendra de l’hébergeur.

## 30 octobre 2026 : Logo oiseau et ambiance animée

### Changements

- **Logo** : un oiseau lointain en deux arcs remplace la flèche ↗, dans l’en-tête et le pied de page. Il bat des ailes au survol. Il sert aussi de favicon (`frontend/public/favicon.svg`).
- **Ambiance du voyage**, inspirée de Q’in Saba : vagues, feuilles, neige ou soleil selon le style et le mois de départ. La couche couvre presque toute la page comme un voile transparent, par-dessus le contenu. Elle est fusionnée en `multiply` : elle teinte le fond sans éclaircir le texte. Elle ne capte pas les clics et est masquée aux lecteurs d’écran. Un bouton de la couverture met l’animation en pause, et ce choix est mémorisé. Si le système demande moins de mouvement, les particules disparaissent. L’ambiance n’apparaît pas à l’impression. Règles détaillées dans `docs/DIRECTION_ARTISTIQUE.md`.
- La couverture illustrée s’anime légèrement : les vagues ondulent et les oiseaux planent.
- **Jaune adouci.** Le jaune soleil plein (`#F4CB54`) ne sert plus qu’aux petits accents. Les grandes surfaces (chapitre 1, plafond du budget, ciel « grands espaces », sable) passent au jaune doux `--sun-soft` (`#F8E2A6`). L’ambiance soleil est environ deux fois plus discrète : halo, soleil, rayons plus fins et éclats.

Fichiers : `frontend/src/components/Ambience.jsx` (nouveau), `Chrome.jsx`, `TripView.jsx`, `Landscape.jsx`, `frontend/src/styles/screens.css`, `frontend/index.html`, `frontend/public/favicon.svg`.

### Tests réellement exécutés

- `npm run build` : réussi.
- Parcours navigateur complet relancé : **30 vérifications sur 30 réussies**, dont l’absence de débordement à 390 et 768 px et le mouvement réduit.
- Captures relues pour les quatre ambiances (vagues à 1440 et 390 px, neige, feuilles, soleil à 1440 px).
- Bouton de pause vérifié dans Chrome : l’animation passe de `running` à `paused` et le choix est enregistré. La couche est à `z-index: 30` avec `pointer-events: none`.
- Contraste : calculé à la main pour le texte gris secondaire là où les trois vagues se superposent, environ 5:1 (le minimum est 4,5:1). Pas de mesure automatique.

### Limites

- L’ambiance est choisie à partir du style et du mois de départ, pas de la météo réelle.
- Les vagues donnent aux encarts jaunes une teinte plus verte, l’effet d’une eau peu profonde. C’est voulu, mais à rediscuter si cela gêne.
- Le parcours navigateur déclenche les clics en JavaScript, pas avec une vraie souris. Les clics à travers le voile reposent sur `pointer-events: none`.
- Pas encore testé sur un téléphone réel ni dans Safari, qui peut gérer différemment les animations des éléments fixes.

## 30 octobre 2026 : Vérification complète et corrections

### Changements

- **Bug corrigé : page blanche après « Appliquer ».** À la fermeture du dialogue de modification, le composant lisait encore l’activité ciblée, qui valait `null`, et plantait. Il n’affiche désormais rien tant que l’activité et le formulaire ne sont pas prêts. Le bug a été trouvé par le test navigateur.
- **Garde-fou d’affichage** (`ErrorBoundary`) : une erreur inattendue affiche un message et un bouton de rechargement au lieu d’une page vide.
- **Polices non bloquantes** : la feuille Google Fonts se charge en différé. Hors ligne ou avec un réseau lent, la page s’affiche tout de suite avec les polices de secours.
- Ajustements visuels : titre d’accueil sur deux lignes, en-tête mobile sur une ligne, couverture panoramique sur téléphone, icônes des encarts alignées avec le texte.

Fichiers : `frontend/src/components/EditStopDialog.jsx`, `ErrorBoundary.jsx`, `App.jsx`, `frontend/index.html`, `frontend/src/styles/*.css`.

### Tests réellement exécutés

- `pytest` : **38 réussis** (SQLite temporaire, migrations réelles).
- `npm run build` : réussi.
- **Parcours navigateur réel** avec Chrome en mode headless, piloté par le protocole DevTools depuis un script local hors dépôt. **30 vérifications sur 30 réussies** :
  - accueil ; carte d’inspiration qui préremplit le formulaire ;
  - formulaire : erreurs sous les bons champs, focus sur le premier champ fautif, voyage de plus de 14 jours refusé, double clic n’envoyant qu’**un** voyage, clé organisateur absente de l’URL ;
  - programme : filtres J1/J2/J3 ; modification → comparaison avant/après → application → marquage « à revoir » ; « On garde » qui masque « Modifier » ;
  - budget : budget incomplet jamais présenté comme « dans le plafond » ; erreur bas > central signalée sur la ligne ; budget complet avec le central attendu à **345,60 €/personne** et un plafond de groupe de 1 350 € ;
  - **rechargement** de la page : nom, verrou, montants et zéro explicite conservés ;
  - carnet : lien de lecture sans clé d’édition ; export JSON sans aucun secret ; journal ouvert puis fermé avec Échap, focus rendu au bouton ; impression : feuille dédiée et PDF généré ;
  - **conflit entre deux onglets** : refus 409, bandeau, puis rechargement ;
  - **lien ouvert dans un second profil Chrome isolé** : lecture seule, aucune commande d’édition, et écriture directe refusée par l’API (403) ;
  - exemple fictif : tampon, moments de journée, deux décisions gardées, nouvelle copie à chaque clic ;
  - voyages récents ; animations coupées avec `prefers-reduced-motion` ;
  - à **390 et 768 px** (programme, budget, carnet) : aucun débordement horizontal et toutes les commandes font au moins 44 px ; aucune erreur JavaScript.
- Captures relues à 1440, 768 et 390 px pour l’accueil, le formulaire, le programme, le budget, le carnet, l’exemple, le dialogue et la vue lecteur.

### Limites

- Le script navigateur n’est pas versionné ni intégré à la CI.
- Les polices Fraunces, Instrument Sans et Caveat dépendent de Google Fonts : hors ligne, ce sont les polices de secours qui s’affichent.
- Pas de test sur Safari ou Firefox, ni avec un vrai lecteur d’écran.

## 29 octobre 2026 : Deuxième tranche : carnet éditable et nouvelle identité

### Diagnostic de départ

Le dépôt local correspondait exactement au commit `8d26ec6` (V1) : pas de V2 locale à préserver. L’environnement Python est `..\.venv` (Python 3.11.9) et la base locale `backend/runaway.db` contenait 2 voyages en révision 0001. Les 21 tests existants passaient.

### Backend : droits, verrous, révisions

**Pourquoi :** pouvoir modifier un voyage sans comptes, sans qu’un lien partagé donne le droit d’écrire, et sans qu’un écran périmé écrase une modification plus récente.

- Secret d’édition distinct du secret de lecture. Seules les empreintes sont en base. Le rôle est déterminé par le serveur (`organizer` / `reader`).
- Écriture atomique par révision (`UPDATE … WHERE revision = attendue`) → `409 revision_conflict` ; activité verrouillée → `409 locked` ; lien de lecture → `403 read_only`.
- Nouvelles routes : modification d’activité, verrouillage, sauvegarde du budget, création d’un exemple.
- Migration `0002` purement additive : les anciens voyages gardent leur lien de lecture et restent en lecture seule.
- Budget : montants saisis stockés, totaux recalculés par `budget.py`, total du groupe arrondi une seule fois.
- Exemple fictif séparé dans `examples.py`, avec une copie indépendante par ouverture.

Fichiers : `backend/app/main.py`, `schemas.py`, `models.py`, `budget.py`, `examples.py`, `backend/migrations/versions/0002_edit_rights.py`, `backend/tests/test_editing.py`, `test_migration.py`, `test_budget.py`.

**Base locale :** migrée en 0002 après une copie de sauvegarde `backend/runaway.pre-0002.db`, ignorée par Git. Les 2 anciens voyages sont présents en révision 1, sans clé d’édition.

### Frontend : refonte et découpage

**Pourquoi :** une démo lisible et mémorable pour un recruteur, et un code plus facile à expliquer que le fichier unique `main.jsx`.

- Découpage : `App`, `Home`, `TripForm`, `TripView`, `Programme`, `EditStopDialog`, `Budget`, `Carnet`, `PrintSheet`, `JournalDialog`, `Dialog`, `Landscape`, `Icon`, plus `lib/` (API, stockage local, formats, routes).
- Système visuel centralisé (`styles/tokens.css`), décrit dans `docs/DIRECTION_ARTISTIQUE.md`. L’ancien `style.css` est supprimé.
- Illustrations SVG originales : aucune photo, donc aucune licence à suivre et aucun lieu présenté comme vérifié.
- Aucune nouvelle dépendance. Le JSX est compilé en mode automatique par esbuild (`vite.config.js`). Vite est autorisé à lire le dossier parent pour afficher ce journal dans l’interface.

### Pour essayer

1. Lancer l’API et l’interface (voir `MISE_A_JOUR_WINDOWS.md`), puis ouvrir http://127.0.0.1:5173.
2. « Explorer un exemple » : naviguer entre Programme, Budget et Carnet, puis modifier une activité et regarder la comparaison.
3. Revenir à l’accueil, choisir une carte postale, compléter les dates puis créer le carnet.
4. Modifier une activité → Comparer → Appliquer ; cliquer « On garde » ; dans Budget, remplir quelques postes en laissant un champ vide, puis enregistrer ; recharger la page.
5. Carnet → « Voir comme un ami » : la vue est en lecture seule. Pour un vrai test, coller le lien dans une fenêtre de navigation privée.

### Tests exécutés ce jour

- `pytest` : **38 réussis**, dont 17 nouveaux sur les droits, les verrous, les révisions, les budgets incomplets, l’exemple et la migration depuis 0001.
- `npm run build` : réussi.
- Le parcours navigateur complet est détaillé dans l’entrée du 30 octobre.

### Limites restantes

- Générateur toujours simulé (`FakeLLM`) : aucun lieu, horaire ni tarif vérifié.
- La clé organisateur vit dans le stockage local du navigateur : perdue si les données sont effacées, non synchronisée, et utilisable par toute personne ayant accès au même profil.
- Pas d’historique consultable des révisions, ni de révocation des liens.
- PostgreSQL et la CI GitHub n’ont pas été relancés dans cette session.
- Rien n’a été commité ni poussé.
