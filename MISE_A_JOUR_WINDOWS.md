# Mettre à jour et lancer Runaway sous Windows

Ces commandes correspondent à mon installation réelle :

```text
C:\Users\bfane\Projets\Runaway_Premiere_Tranche\
├── .venv\        environnement Python 3.11.9 (déjà créé, ne pas le recréer)
└── runaway\      dépôt Git (racine du projet)
    ├── backend\  API FastAPI + base SQLite runaway.db
    └── frontend\ React/Vite (Node 24, npm 11)
```

Toutes les commandes sont écrites pour **PowerShell**.

## 1. Mettre à jour les dépendances (une fois après cette mise à jour)

Aucune nouvelle dépendance n’a été ajoutée dans la tranche 3 (le quota et les logs JSON n’utilisent que la bibliothèque standard). Si besoin, pour resynchroniser :

```powershell
cd C:\Users\bfane\Projets\Runaway_Premiere_Tranche\runaway
..\.venv\Scripts\python.exe -m pip install -r backend\requirements.lock
cd frontend
npm ci
```

## 2. Migrer la base locale

La migration `0002` ajoute la clé d’édition, la révision, le drapeau d’exemple et les montants du budget. Elle conserve les voyages existants et leurs liens de lecture. Ces anciens voyages restent en lecture seule.

La migration `0003` (tranche 3) ajoute la date de dernière ouverture, utilisée par la purge de conservation. Les voyages existants reçoivent la date du jour de la migration. **Ta base locale est encore en 0002** : je ne l’ai pas migrée cette nuit. Tant que ce n’est pas fait, la nouvelle API répond 503 et `/ready` le signale.

```powershell
cd C:\Users\bfane\Projets\Runaway_Premiere_Tranche\runaway\backend
Copy-Item runaway.db runaway.backup.db   # sauvegarde conseillée
$env:DATABASE_URL = "sqlite:///./runaway.db"
..\..\.venv\Scripts\python.exe -m alembic upgrade head
..\..\.venv\Scripts\python.exe -m alembic current   # doit afficher 0003 (head)
```

> Le 29 octobre, la base a été migrée en 0002. Une copie d’avant migration a été laissée dans `backend\runaway.pre-0002.db` : elle est ignorée par Git et peut être supprimée une fois la migration vérifiée.

Pour revenir en arrière si nécessaire : `alembic downgrade 0002` retire seulement la date de dernière ouverture ; `alembic downgrade 0001` fait perdre en plus les clés d’édition, révisions et budgets saisis.

## 3. Lancer le projet (deux terminaux)

**Terminal 1 : API**

```powershell
cd C:\Users\bfane\Projets\Runaway_Premiere_Tranche\runaway\backend
$env:DATABASE_URL = "sqlite:///./runaway.db"
$env:LLM_PROVIDER = "fake"
..\..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Terminal 2 : interface**

```powershell
cd C:\Users\bfane\Projets\Runaway_Premiere_Tranche\runaway\frontend
npm run dev
```

Ouvrir http://127.0.0.1:5173. Documentation de l’API : http://127.0.0.1:8000/docs.

## 4. Vérifier

```powershell
cd C:\Users\bfane\Projets\Runaway_Premiere_Tranche\runaway\backend
..\..\.venv\Scripts\python.exe -m pytest
cd ..\frontend
npm run build
```

## 5. Problèmes fréquents

| Symptôme                                          | Cause probable                                                                  | Solution                                                                                          |
| ------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| « Serveur injoignable » dans l’interface          | L’API ne tourne pas sur le port 8000                                            | Relancer le terminal 1                                                                            |
| `/ready` renvoie 503, ou « Lecture indisponible » | Migration 0003 non appliquée                                                    | Étape 2                                                                                           |
| « Voyage introuvable »                            | Lien incomplet ou clé erronée                                                   | Rouvrir depuis « Vos voyages récents »                                                            |
| Plus de bouton « Modifier »                       | Clé organisateur absente de ce navigateur (navigation privée, données effacées) | Carnet → « Clé organisateur » → coller la clé sauvegardée                                         |
| « Trop de voyages créés depuis cette connexion »  | Quota de 10 créations par heure atteint                                         | Attendre, ou relancer l’API (le quota vit en mémoire), ou augmenter `RATE_LIMIT_CREATIONS_PER_IP` |
| Polices différentes                               | Pas d’accès à Google Fonts                                                      | Normal : les polices de secours prennent le relais                                                |
| `Activate.ps1` bloqué                             | Politique d’exécution                                                           | Inutile : appeler directement `..\..\.venv\Scripts\python.exe`                                    |
