# Runaway

**Des envies en vrac. Un départ ensemble.**

Je construis Runaway pour organiser des voyages de groupe avec un budget étudiant, au départ de Paris ou Toulouse. Le projet vient d’une préparation de voyage où les destinations et le budget changeaient sans cesse. Je veux rendre les contraintes, les coûts inconnus et les décisions plus faciles à comprendre.

## État actuel : troisième tranche (fiabilisation), générateur toujours simulé

Runaway se présente comme un carnet d’escapades en trois chapitres.

- **Programme** : couverture du carnet, journées présentées comme des chapitres colorés, activités rangées par moment de journée quand la donnée existe. On peut modifier le nom, la ville, le type et les notes, avec une **comparaison avant/après** avant d’appliquer. « **On garde** » verrouille une décision, et on peut la déverrouiller. Une activité modifiée signale que ses coûts et trajets restent **à revoir**.
- **Budget** : trois scénarios (bas, central, haut) × cinq postes (transport, hébergement, repas, activités, frais annexes), montants pour tout le séjour, saisis par personne ou pour le groupe. Les totaux sont **calculés côté serveur** par le calculateur Python et affichés par personne ou pour le groupe. Un champ vide reste inconnu, un zéro est un coût nul assumé. On ne lit jamais « dans le plafond » tant qu’un poste manque.
- **Carnet** : lien de lecture seule, export JSON sans secret, impression du programme, résumé des décisions gardées, clé organisateur, journal du projet, et **suppression définitive** du voyage par l’organisateur.
- **Confidentialité** : une page courte (lien en pied de page) dit quelles données sont gardées, pourquoi, combien de temps et comment les effacer.

Le générateur reste `FakeLLM` : **ce n’est pas un itinéraire recommandé**. Aucun lieu, horaire ni tarif n’est vérifié, et aucun appel à une IA payante ni à OpenStreetMap n’est effectué. Un **exemple fictif** de trois jours sur la côte basque montre une démonstration remplie. Chaque clic en crée une copie indépendante.

| Disponible | À construire |
| --- | --- |
| API FastAPI, validation Pydantic, migrations Alembic 0001 à 0003 | Appel réel à OpenRouter derrière `LLMClient` |
| Secret de lecture et secret d’édition distincts, empreintes seules en base | Révocation et rotation des liens |
| Verrous et révisions contrôlés par le serveur (comparer-puis-écrire atomique) | Historique consultable des versions |
| Budget éditable et persistant, recalculé par le serveur | Catalogue d’estimations sourcées et datées |
| Interface React découpée en composants, design system documenté | Recherche de lieux et carte Leaflet |
| Tests pytest (droits, verrous, révisions, budgets, migrations, CORS, quota, logs, purge) | Tests navigateur automatisés dans la CI |
| CORS par liste d’origines, quota de créations, logs JSON sans secret | Quota partagé entre plusieurs instances (Redis ou base) |
| Suppression d’un voyage, purge de conservation (manuelle) | Purge planifiée, contact du responsable sur la page de confidentialité |

## Lancer le projet

Instructions détaillées pour mon poste : **[MISE_A_JOUR_WINDOWS.md](MISE_A_JOUR_WINDOWS.md)**. En résumé, depuis `runaway\`, avec l’environnement Python du dossier parent :

```powershell
# Terminal 1 : API
cd backend
$env:DATABASE_URL = "sqlite:///./runaway.db"
$env:LLM_PROVIDER = "fake"
..\..\.venv\Scripts\python.exe -m alembic upgrade head
..\..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1

# Terminal 2 : interface
cd frontend
npm ci
npm run dev
```

Ouvrir http://127.0.0.1:5173. Documentation interactive de l’API : http://127.0.0.1:8000/docs.

Sur une nouvelle machine sans environnement : `python -m venv .venv` puis `pip install -r backend/requirements.lock`, en adaptant le chemin de `.venv`.

### Avec PostgreSQL

Si Docker est installé, copier `.env.example` vers `.env`, lancer `docker compose up -d db`, puis définir `DATABASE_URL` avec les identifiants locaux de `.env` dans le terminal du backend avant la migration. Docker Compose lit `.env`, le backend non : **copier `.env` ne suffit pas à configurer le terminal Python**. Ces identifiants sont réservés au développement.

### Linux / cloud

```bash
python3 -m venv .venv && .venv/bin/python -m pip install -r backend/requirements.lock
cd backend && export DATABASE_URL=sqlite:///./runaway.db LLM_PROVIDER=fake
../.venv/bin/python -m alembic upgrade head
../.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1
```

Le proxy `/api` n’existe qu’en développement (Vite). En production, deux possibilités : servir l’API derrière le même domaine (reverse proxy `/api`), ou la servir sur son propre domaine. Dans ce second cas, construire l’interface avec `VITE_API_URL=https://api.exemple` et lister l’origine du site dans `CORS_ORIGINS`.

## Configuration

Toutes les variables sont documentées dans [.env.example](.env.example). Le backend lit l’environnement du terminal, pas le fichier `.env` (seul Docker Compose le lit).

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `DATABASE_URL` | `sqlite:///./runaway.db` | Base de données |
| `LLM_PROVIDER` | `fake` | Seule valeur acceptée pour l’instant |
| `CORS_ORIGINS` | vide | Origines autorisées à appeler l’API depuis un navigateur, séparées par des virgules, exactes. `*` est refusé au démarrage |
| `RATE_LIMIT_CREATIONS_PER_IP` | `10` | Créations de voyages par client et par fenêtre |
| `RATE_LIMIT_CREATIONS_GLOBAL` | `200` | Créations de voyages, tous clients confondus, par fenêtre |
| `RATE_LIMIT_WINDOW_SECONDS` | `3600` | Durée de la fenêtre glissante |
| `RETENTION_MONTHS` | `12` | Durée sans ouverture après laquelle un voyage est purgeable |
| `LOG_LEVEL` | `INFO` | Niveau des logs JSON |
| `VITE_API_URL` | `/api` | Adresse de l’API vue par l’interface, lue au build |

**Pourquoi 10 créations par heure et par client, 200 au total ?** Un groupe crée un voyage, parfois deux ou trois en essayant des dates, et ouvre l’exemple quelques fois : 10 laisse une marge large. Un script, lui, est plafonné à 240 voyages par jour et par adresse au lieu de plusieurs milliers par minute. La limite globale protège la base si le script change d’adresse. En contrepartie, une vague d’abus peut bloquer les vraies créations pendant au plus une heure. Les lectures et modifications ne sont pas limitées. Les requêtes invalides (422) et les échecs du générateur ne consomment pas le quota.

**Limites du quota :** il vit dans la mémoire du processus. Il repart de zéro au redémarrage et n’est pas partagé entre plusieurs workers ou instances. Derrière un reverse proxy, lancer uvicorn avec `--proxy-headers --forwarded-allow-ips=<adresse du proxy>` : sinon tous les clients ont l’adresse du proxy et partagent le même quota. Ne jamais faire confiance à `X-Forwarded-For` sans cette restriction.

## Logs

L’API écrit une ligne JSON par requête sur la sortie d’erreur : heure, niveau, méthode, chemin (sans la query string), statut, durée en millisecondes et `request_id`. L’identifiant est repris de l’en-tête `X-Request-ID` s’il est sûr (8 à 64 caractères simples), sinon généré, et renvoyé dans la réponse. Les en-têtes, les corps de requête et les adresses IP ne sont jamais écrits. Une dernière passe masque tout ce qui ressemble à un secret (`Bearer …`, suites de 40 caractères ou plus). Le journal d’accès natif d’uvicorn est désactivé, car il ne connaît pas le `request_id`.

## Conservation et purge

Chaque voyage a une date de dernière ouverture (migration 0003), rafraîchie au plus une fois par jour par une lecture réussie. Elle ne change pas la révision. Les voyages existants avant la migration reçoivent la date de la migration : ils ont droit à une période complète.

La purge n’est branchée sur aucune tâche planifiée. Elle se lance à la main, depuis `backend` :

```powershell
..\..\.venv\Scripts\python.exe -m app.retention               # compte seulement, ne supprime rien
..\..\.venv\Scripts\python.exe -m app.retention --apply       # supprime les voyages non ouverts depuis RETENTION_MONTHS mois
..\..\.venv\Scripts\python.exe -m app.retention --months 6    # autre durée, toujours en simple comptage sans --apply
```

Elle utilise `DATABASE_URL` et affiche un résumé JSON (date limite, nombre de voyages). Un voyage sans date d’ouverture n’est jamais supprimé. Pour l’automatiser plus tard : une tâche planifiée Windows, un cron ou un job de l’hébergeur qui lance la même commande.

## API

| Méthode | Route | Droit | Rôle |
| --- | --- | --- | --- |
| `POST` | `/trips` | aucune | Crée un voyage ; renvoie `read_token` **et** `edit_token` |
| `POST` | `/trips/example` | aucune | Crée une copie indépendante de l’exemple fictif |
| `GET` | `/trips/{id}` | lecture ou édition | Renvoie le voyage, `role`, `revision`, budget recalculé |
| `PATCH` | `/trips/{id}/days/{n}/stops/{i}` | édition | Modifie une activité (refusé si verrouillée) ou la marque revue |
| `PUT` | `/trips/{id}/days/{n}/stops/{i}/lock` | édition | Verrouille ou déverrouille |
| `PUT` | `/trips/{id}/budget` | édition | Enregistre les cinq postes |
| `DELETE` | `/trips/{id}` | édition | Supprime définitivement le voyage (204) |

Les secrets passent dans `Authorization: Bearer …`. Chaque écriture envoie `expected_revision`. Le serveur renvoie `409 revision_conflict` si le voyage a changé entre-temps, `409 locked` pour une activité gardée et `403 read_only` pour un lien de lecture. Un voyage inconnu et un mauvais secret donnent le même `404`. Au-delà du quota, les créations reçoivent `429 rate_limited` avec un en-tête `Retry-After`.

## Tests et vérification

```powershell
cd backend
..\..\.venv\Scripts\python.exe -m pytest
cd ..\frontend
npm run build
```

Les tests utilisent une base SQLite temporaire initialisée par les vraies migrations. Le test de migration part de la révision 0001 avec un ancien voyage. `TEST_DATABASE_URL` permet de viser une base PostgreSQL **réservée aux tests**. La CI GitHub Actions prévoit SQLite, PostgreSQL 17 et le build du frontend. Les vérifications réellement exécutées sont listées dans [JOURNAL_DES_MODIFICATIONS.md](JOURNAL_DES_MODIFICATIONS.md).

## Organisation

```text
backend/app/schemas.py     contrats d’entrée et de sortie (programme stocké, modifications, budget)
backend/app/main.py        routes HTTP, droits, écritures atomiques par révision
backend/app/budget.py      calcul pur des scénarios (seule logique budgétaire du projet)
backend/app/examples.py    jeu d’exemple fictif, séparé du parcours normal
backend/app/llm.py         interface LLMClient et FakeLLM
backend/app/config.py      variables d’environnement (CORS, quota, conservation, logs)
backend/app/ratelimit.py   quota de créations en mémoire (fenêtre glissante)
backend/app/observability.py  logs JSON, identifiant de requête, masquage des secrets
backend/app/retention.py   purge des voyages non ouverts (commande manuelle)
backend/migrations/        0001 voyages · 0002 droits d’édition, révisions, budget · 0003 dernière ouverture
backend/tests/             règles métier, droits, verrous, révisions, migration
frontend/src/components/   Home, TripForm, TripView, Programme, Budget, Carnet, dialogues
frontend/src/lib/          appel API, stockage local, formats, routes par fragment d’URL
frontend/src/styles/       tokens.css (palette, espacements), base.css, screens.css
docs/                      décisions techniques et direction artistique
```

## Choix et limites

- Les propositions du modèle sont séparées des calculs de budget : un JSON valide ne garantit pas un voyage réalisable.
- Les montants sont en centimes, la marge de 8 % est appliquée une seule fois et l’arrondi est fait à la fin. Le frontend n’additionne rien : il affiche les chiffres du serveur.
- **Deux secrets distincts.** Le lien partagé ne contient que la clé de lecture, dans le fragment d’URL (jamais envoyé au serveur web). La clé d’édition reste dans le stockage local du navigateur de l’organisateur. Le serveur ne garde que des empreintes SHA-256.
- **Limites de la clé organisateur dans le navigateur** : elle disparaît si l’on vide les données du site ou en navigation privée, elle n’est pas synchronisée entre appareils, et toute personne utilisant ce profil de navigateur peut modifier le voyage. Elle peut être affichée, sauvegardée puis recollée dans l’onglet Carnet. Une vraie authentification la remplacera.
- Les voyages créés avant la migration 0002 n’ont pas de clé d’édition : leur lien de lecture continue de fonctionner, sans jamais devenir un droit d’édition.
- Le programme reste stocké comme un document JSON validé. Les révisions protègent contre l’écrasement, mais aucun historique n’est encore conservé.
- **Avant une mise en ligne publique**, il manque encore : HTTPS et l’hébergement eux-mêmes, un quota partagé si plusieurs instances tournent, la révocation des liens, la purge planifiée, et un contact du responsable sur la page de confidentialité.

Je compléterai la partie « difficultés rencontrées » après avoir relu, exécuté et modifié cette tranche moi-même. Je ne revendique pas encore une maîtrise de FastAPI, Alembic ou du déploiement PostgreSQL.

## Documentation utilisée

- [FastAPI : tests](https://fastapi.tiangolo.com/tutorial/testing/)
- [SQLAlchemy : ORM](https://docs.sqlalchemy.org/en/20/orm/quickstart.html)
- [Alembic : migrations](https://alembic.sqlalchemy.org/en/latest/tutorial.html)
- [MDN : élément `<dialog>`](https://developer.mozilla.org/fr/docs/Web/HTML/Element/dialog)
