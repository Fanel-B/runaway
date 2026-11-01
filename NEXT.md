# Reprise Runaway

## Où en est le dépôt (31 octobre 2026)

| Branche            | Contenu                                                                | État                                           |
| ------------------ | ---------------------------------------------------------------------- | ---------------------------------------------- |
| `main`             | Commit initial, réécrit sans `Co-Authored-By` (`69c8eea`)              | Inchangée cette nuit                           |
| `essai`            | Tranche 2 : carnet éditable, droits, budget, identité visuelle         | Poussée, PR #1 vers `main` ouverte             |
| `t3-fiabilisation` | Tranche 3 : API déployable, suppression, conservation, confidentialité | Poussée, PR #2 vers `essai` ouverte            |
| `t4-outillage`     | ESLint, Prettier, lint bloquant et audit en avertissement dans la CI   | Poussée, PR #3 vers `t3-fiabilisation` ouverte |

Les trois pull requests ont été ouvertes le 1er novembre avec `gh` (#1, #2, #3), à relire et fusionner dans cet ordre. La CI est verte sur les trois branches : 67 tests sur SQLite et sur PostgreSQL 17, lint, build, et audit en simple avertissement.

## Terminé

- **Tranche 2** : clé d’édition distincte, verrous, révisions atomiques, budget enregistré et calculé par `budget.py`, exemple fictif, interface « carnet d’escapades », ambiance animée.
- **Tranche 3** :
  - CORS par liste d’origines (`CORS_ORIGINS`, `*` refusé) ;
  - quota de créations (10 par client, 200 au total, par heure) ;
  - logs JSON avec `request_id`, sans secret ni adresse IP ;
  - `DELETE /trips/{id}` réservé à l’organisateur, et bouton de suppression avec confirmation ;
  - date de dernière ouverture (migration 0003) et purge manuelle `python -m app.retention` ;
  - page de confidentialité ;
  - `VITE_API_URL` pour une API sur un autre domaine ;
  - aucun tiret cadratin dans le dépôt.
- **Tranche 4** (branche `t4-outillage`) : ESLint avec la configuration recommandée React, Prettier pour tout le dépôt, `npm run lint` bloquant et `npm audit` en avertissement dans la CI.

Détails et tests réellement exécutés : `JOURNAL_DES_MODIFICATIONS.md`.

## Avant de reprendre

1. **Migrer la base locale en 0003** (`MISE_A_JOUR_WINDOWS.md`, étape 2). Sans cela, la nouvelle API répond 503. Je ne l’ai pas fait : la migration a seulement été testée sur une copie (39 voyages conservés à l’identique).
2. Relire les pull requests #1, #2 et #3.
3. La CI a validé PostgreSQL (67 tests) ; la revérifier après chaque fusion.

## Restant

1. Purge planifiée (tâche Windows, cron ou job de l’hébergeur) une fois l’hébergement choisi.
2. Responsable et contact sur la page de confidentialité avant toute mise en ligne.
3. Quota partagé (Redis ou base) si l’API tourne en plusieurs instances.
4. Héberger les polices localement pour ne plus transmettre l’adresse IP à Google.
5. Historique consultable des révisions.
6. Révocation et rotation des clés de lecture et d’édition.
7. Brancher OpenRouter derrière `LLMClient` (clé serveur, limite de coût, timeout). Pas avant d’avoir validé les tranches 2 et 3.
8. Tests navigateur dans la CI (le script de vérification reste local).

## Blocages connus

- Aucun blocage technique.
- Décisions qui te reviennent : l’ordre de fusion des PR, l’hébergement, la durée de conservation définitive, le contact à publier.
- Outils absents sur ce poste : Docker et `psql` (PostgreSQL n’est testé que par la CI). `gh` est installé et connecté.

## Prochaine action

Migrer la base locale, ouvrir la PR `essai` vers `main`, la relire avec la CI au vert, puis faire de même pour `t3-fiabilisation`.

## Commandes courtes (PowerShell, depuis `runaway\backend`)

```powershell
..\..\.venv\Scripts\python.exe -m pytest
$env:DATABASE_URL = "sqlite:///./runaway.db"; ..\..\.venv\Scripts\python.exe -m alembic upgrade head
..\..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1
..\..\.venv\Scripts\python.exe -m app.retention          # comptage de la purge, sans suppression
```

Frontend : `npm ci`, `npm run dev`, `npm run build` depuis `runaway\frontend`.
