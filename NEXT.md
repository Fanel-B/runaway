# Reprise Runaway

## Terminé (tranche 2, 29–30 octobre 2026)

- Logo oiseau en deux arcs (aussi en favicon) et ambiance animée selon le voyage : vagues, feuilles, neige ou soleil, avec un bouton de pause.

- Migration Alembic `0002` : clé d’édition distincte (empreinte), `revision`, `updated_at`, `is_example`, `budget_inputs`. Les anciens voyages et leurs liens de lecture sont conservés, en lecture seule.
- API d’édition : modification d’activité, verrouillage et déverrouillage, marquage « revu », sauvegarde du budget. Droits vérifiés par le serveur (401 / 403 / 404) et écriture atomique par révision (409 en cas d’écran périmé).
- Budget : cinq postes × trois scénarios, saisie par personne ou pour le groupe, totaux par personne et pour le groupe calculés uniquement par `budget.py`.
- Exemple fictif de trois jours (`backend/app/examples.py`), copie indépendante à chaque ouverture.
- Interface refaite et découpée en composants, avec la direction artistique « carnet d’escapades » (`docs/DIRECTION_ARTISTIQUE.md`) : accueil immersif, brief, couverture, Programme / Budget / Carnet, dialogue de comparaison avant/après, export JSON, impression, journal du projet consultable dans l’interface.
- Documentation : README, `MISE_A_JOUR_WINDOWS.md`, `JOURNAL_DES_MODIFICATIONS.md`, `docs/decisions.md`.

Résultats détaillés et limites : voir `JOURNAL_DES_MODIFICATIONS.md`.

## Avant de reprendre

- **Git :** le commit initial a été réécrit sans `Co-Authored-By` (`69c8eea`) et `main` a été poussé en force le 30 octobre 2026. La tranche 2 est commitée sur la branche **`essai`**, poussée sur GitHub. `main` ne la contient pas encore : il faudra la fusionner après relecture. Aucun commit ne doit contenir `Co-Authored-By`.
- Un autre clone créé avant le 30 octobre doit être réaligné : `git fetch` puis `git reset --hard origin/main`, **après** avoir sauvegardé ses changements locaux.
- La base locale `backend/runaway.db` est migrée en 0002. Une sauvegarde d’avant migration est dans `backend/runaway.pre-0002.db`, ignorée par Git.
- La CI GitHub (SQLite, PostgreSQL 17, build) se déclenche à chaque push, donc aussi sur `essai` : vérifier son résultat dans l’onglet Actions.

## Restant

1. Lancer une fois les tests sur PostgreSQL (`TEST_DATABASE_URL`) ou attendre la CI.
2. Historique des révisions consultable (table `trip_versions`) avant toute édition collaborative.
3. Révocation et rotation des clés de lecture et d’édition.
4. Brancher OpenRouter derrière `LLMClient` : clé serveur, limite de coût, timeout, tests de réponses simulées. **Pas avant d’avoir validé cette tranche.**
5. Catalogue d’estimations datées et sourcées pour préremplir le budget, avec leur provenance.
6. Tests navigateur dans la CI (le script de vérification de cette session était local).

## Blocages connus

- Aucun blocage technique. Les points ouverts sont des décisions : fusion de `essai` dans `main`, visibilité du dépôt, hébergement.

## Prochaine action

Essayer la branche `essai` (parcours « Pour essayer » du journal), vérifier la CI sur GitHub, puis fusionner `essai` dans `main`.

## Commandes courtes (PowerShell, depuis `runaway\backend`)

```powershell
..\..\.venv\Scripts\python.exe -m pytest
$env:DATABASE_URL = "sqlite:///./runaway.db"; ..\..\.venv\Scripts\python.exe -m alembic upgrade head
..\..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1
```

Frontend : `npm ci`, `npm run dev`, `npm run build` depuis `runaway\frontend`.
