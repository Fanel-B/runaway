# Runaway

**Des envies en vrac. Un départ ensemble.**

Je construis Runaway pour organiser des voyages de groupe avec un budget étudiant, au départ de Paris ou Toulouse. Le projet vient d’une préparation de voyage où les destinations et le budget changeaient sans cesse. Je veux rendre les contraintes, les coûts inconnus et les décisions plus faciles à comprendre.

## État actuel : première tranche, générateur simulé

Cette version permet de remplir un formulaire, créer un brouillon jour par jour, le sauvegarder et le relire avec un lien privé. Le générateur `FakeLLM` produit des journées génériques : **ce n’est pas encore un itinéraire touristique recommandé**.

| Disponible | À construire |
| --- | --- |
| API FastAPI, validation Pydantic | Appel réel à OpenRouter |
| PostgreSQL configuré, SQLAlchemy, migration Alembic | Catalogue d’estimations sourcées |
| SQLite pour une démo locale sans Docker | Recherche de lieux et carte Leaflet |
| Tests de validation, stockage et erreurs | Contraintes verrouillées et aperçu avant/après |
| Calcul pur des trois scénarios avec marge de 8 % | Extraction d’une conversation |
| Interface React/Vite et lien de lecture protégé | Versions, révocation des liens et quotas |

Le calculateur est testé avec des montants fictifs. L’API n’a pas encore de catalogue : elle affiche donc **budget incomplet**, jamais un tarif inventé. Aucun appel réseau à un LLM ou à OpenStreetMap n’est effectué.

## Démarrage rapide sur Windows / PowerShell

Prérequis : Python 3.12, Node.js 22 et Git. Docker est facultatif pour la démo SQLite.

À la racine du dépôt :

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.lock
cd backend
$env:DATABASE_URL = "sqlite:///./runaway.db"
$env:LLM_PROVIDER = "fake"
..\.venv\Scripts\python.exe -m alembic upgrade head
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1
```

Dans un second terminal, à la racine :

```powershell
cd frontend
npm ci
npm run dev
```

Ouvrir http://localhost:5173. Documentation interactive : http://127.0.0.1:8000/docs.

### Avec PostgreSQL

Si Docker est installé, copier `.env.example` vers `.env` puis lancer depuis la racine :

```powershell
Copy-Item .env.example .env
docker compose up -d db
```

Dans le terminal du backend, définir `DATABASE_URL` avec les identifiants locaux de `.env`, puis exécuter la migration et démarrer Uvicorn. Exemple de développement uniquement :

```powershell
$env:DATABASE_URL = "postgresql+psycopg://runaway:runaway_local_only@localhost:5432/runaway"
..\.venv\Scripts\python.exe -m alembic upgrade head
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1
```

Docker Compose lit `.env`. Le backend lit les variables du processus : **copier `.env` ne suffit pas à configurer le terminal Python**. Ne pas publier ces identifiants de développement comme configuration de production.

### Linux / cloud

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.lock
cd backend
export DATABASE_URL=sqlite:///./runaway.db
export LLM_PROVIDER=fake
../.venv/bin/python -m alembic upgrade head
../.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1
```

Le frontend utilise le même `npm ci` / `npm run dev`. Son proxy `/api` est configuré pour le serveur de développement. Un hébergement de `dist/` nécessite un reverse proxy `/api` adapté ; le build seul ne déploie pas l’API.

## Tests et vérification

```powershell
cd backend
..\.venv\Scripts\python.exe -m pytest
cd ..\frontend
npm run build
```

Les tests isolés utilisent une base SQLite temporaire initialisée par la vraie migration. `TEST_DATABASE_URL` permet de les exécuter sur une base PostgreSQL **réservée aux tests**. Aucun appel à un fournisseur externe n’a lieu dans pytest. Le workflow GitHub Actions prévoit les deux bases et la compilation du frontend ; son exécution sur GitHub reste à vérifier après le premier push.

## Organisation

```text
backend/app/schemas.py    contrats d’entrée et de sortie
backend/app/llm.py        interface et générateur de démonstration
backend/app/budget.py     calculs purs, sans dépendance réseau
backend/app/models.py     persistance du voyage validé
backend/app/main.py       orchestration HTTP et erreurs
backend/migrations/      évolution du schéma
backend/tests/           règles métier et intégration
frontend/src/            interface et styles
docs/decisions.md        choix et compromis
NEXT.md                  reprise de la prochaine session
```

## Choix et limites

- Je sépare les propositions du modèle des calculs de budget. Un JSON valide ne garantit pas un voyage réalisable.
- Je conserve les montants en centimes et n’arrondis qu’à la fin du calcul. Les trois scénarios ne sont pas des probabilités.
- Je commence par un instantané JSON validé en base pour rendre le parcours complet simple. Les versions et les étapes éditables nécessiteront une prochaine migration.
- Je garde SQLite comme mode local explicite, sans prétendre qu’il remplace les tests PostgreSQL.
- Les liens de lecture contiennent un secret dans le fragment URL. Toute personne recevant le lien peut lire le voyage. Le serveur ne stocke que son empreinte. Il n’existe encore ni révocation ni modification de voyage.
- Le formulaire et le résultat sont du texte échappé par React. Aucun secret fournisseur ne va dans le navigateur.
- **Ne pas exposer publiquement cette version** : quotas, limites de taille globales, révocation et exploitation doivent être ajoutés avant une ouverture publique. Aucun vrai appel payant n’est présent pour le moment.

Je compléterai la partie « difficultés rencontrées » après avoir relu, exécuté et modifié cette première tranche moi-même. Je ne revendique pas encore une maîtrise de FastAPI, Alembic ou du déploiement PostgreSQL.

## Documentation utilisée

- [FastAPI : tests](https://fastapi.tiangolo.com/tutorial/testing/)
- [SQLAlchemy : ORM](https://docs.sqlalchemy.org/en/20/orm/quickstart.html)
- [Alembic : migrations](https://alembic.sqlalchemy.org/en/latest/tutorial.html)
