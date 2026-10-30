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

Aucune nouvelle dépendance n’a été ajoutée dans cette version. Si besoin, pour resynchroniser :

```powershell
cd C:\Users\bfane\Projets\Runaway_Premiere_Tranche\runaway
..\.venv\Scripts\python.exe -m pip install -r backend\requirements.lock
cd frontend
npm ci
```

## 2. Migrer la base locale

La migration `0002` ajoute la clé d’édition, la révision, le drapeau d’exemple et les montants du budget. Elle conserve les voyages existants et leurs liens de lecture. Ces anciens voyages restent en lecture seule.

```powershell
cd C:\Users\bfane\Projets\Runaway_Premiere_Tranche\runaway\backend
Copy-Item runaway.db runaway.backup.db   # sauvegarde conseillée
$env:DATABASE_URL = "sqlite:///./runaway.db"
..\..\.venv\Scripts\python.exe -m alembic upgrade head
..\..\.venv\Scripts\python.exe -m alembic current   # doit afficher 0002 (head)
```

> Lors de cette session, la base a déjà été migrée. Une copie d’avant migration a été laissée dans `backend\runaway.pre-0002.db` : elle est ignorée par Git et peut être supprimée une fois la migration vérifiée.

Pour revenir en arrière si nécessaire : `..\..\.venv\Scripts\python.exe -m alembic downgrade 0001`. Les clés d’édition, révisions et budgets saisis sont alors perdus.

## 3. Lancer le projet (deux terminaux)

**Terminal 1 — API**

```powershell
cd C:\Users\bfane\Projets\Runaway_Premiere_Tranche\runaway\backend
$env:DATABASE_URL = "sqlite:///./runaway.db"
$env:LLM_PROVIDER = "fake"
..\..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Terminal 2 — interface**

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

| Symptôme | Cause probable | Solution |
| --- | --- | --- |
| « Serveur injoignable » dans l’interface | L’API ne tourne pas sur le port 8000 | Relancer le terminal 1 |
| `/ready` renvoie 503 | Migration 0002 non appliquée | Étape 2 |
| « Voyage introuvable » | Lien incomplet ou clé erronée | Rouvrir depuis « Vos voyages récents » |
| Plus de bouton « Modifier » | Clé organisateur absente de ce navigateur (navigation privée, données effacées) | Carnet → « Clé organisateur » → coller la clé sauvegardée |
| Polices différentes | Pas d’accès à Google Fonts | Normal : les polices de secours prennent le relais |
| `Activate.ps1` bloqué | Politique d’exécution | Inutile : appeler directement `..\..\.venv\Scripts\python.exe` |
