# Journal des modifications

Chaque entrée indique ce qui a changé, pourquoi, les fichiers concernés, comment l’essayer, ce qui a **réellement** été vérifié, et les limites qui restent.

## 30 octobre 2026 — Logo oiseau et ambiance animée

### Changements

- **Logo** : un oiseau lointain en deux arcs remplace la flèche ↗, dans l’en-tête et le pied de page. Il bat des ailes au survol. Il sert aussi de favicon (`frontend/public/favicon.svg`).
- **Ambiance du voyage**, inspirée de Q’in Saba : vagues, feuilles, neige ou soleil selon le style et le mois de départ. La couche couvre presque toute la page comme un voile transparent, par-dessus le contenu. Elle est fusionnée en `multiply` : elle teinte le fond sans éclaircir le texte. Elle ne capte pas les clics et est masquée aux lecteurs d’écran. Un bouton de la couverture met l’animation en pause, et ce choix est mémorisé. Si le système demande moins de mouvement, les particules disparaissent. L’ambiance n’apparaît pas à l’impression. Règles détaillées dans `docs/DIRECTION_ARTISTIQUE.md`.
- La couverture illustrée s’anime légèrement : les vagues ondulent et les oiseaux planent.

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

## 30 octobre 2026 — Vérification complète et corrections

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

## 29 octobre 2026 — Deuxième tranche : carnet éditable et nouvelle identité

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
