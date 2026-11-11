# Reprise Runaway

## Où en est le dépôt (11 novembre 2026)

Les PR #1, #2 et #3 sont fusionnées, mais `main` ne contient que la tranche 2 : elles ont été fusionnées dans l’ordre #1, #2, #3 alors qu’elles étaient empilées.

| PR  | Branche                        | Contenu                                        | État    |
| --- | ------------------------------ | ---------------------------------------------- | ------- |
| #4  | `t3-fiabilisation` vers `main` | Remonte les tranches 3 et 4, sans code nouveau | Ouverte |
| #5  | `t4-tests` vers `main`         | Tests frontend et accessibilité                | Ouverte |

**Ordre de fusion : #4, puis #5.** Tant que #4 n’est pas fusionnée, #5 affiche aussi les tranches 3 et 4 dans ses changements. Une fois #4 fusionnée, elle n’affiche que les siens.

## Méthode

Une branche par tranche, une PR directement vers `main`, plus de branche d’intégration. Après la fusion de #4, supprimer `essai`, `t3-fiabilisation` et `t4-outillage`.

## Terminé

- **Tranche 2** : clé d’édition distincte, verrous, révisions atomiques, budget enregistré et calculé par `budget.py`, exemple fictif, interface « carnet d’escapades », ambiance animée.
- **Tranche 3** : CORS par liste d’origines, quota de créations, logs JSON sans secret, `DELETE /trips/{id}`, migration 0003, purge manuelle, page de confidentialité, `VITE_API_URL`.
- **Tranche 4, outillage** : ESLint, Prettier, lint bloquant et audit en avertissement dans la CI.
- **Tests frontend** : 81 tests Vitest bloquants en CI.
- **Accessibilité** : contrastes mesurés, focus clavier corrigé, détail dans `docs/DIRECTION_ARTISTIQUE.md`.

Détails et tests réellement exécutés : `JOURNAL_DES_MODIFICATIONS.md`.

## Avant de reprendre

1. **Migrer la base locale en 0003** (`MISE_A_JOUR_WINDOWS.md`, étape 2). Elle est toujours en 0002 : sans cela, la nouvelle API répond 503.
2. Fusionner les PR dans l’ordre indiqué plus haut.

## Restant

1. Décider du corail sur fonds colorés (voir `docs/DIRECTION_ARTISTIQUE.md`, section Accessibilité).
2. Purge planifiée une fois l’hébergement choisi.
3. Responsable et contact sur la page de confidentialité avant toute mise en ligne.
4. Quota partagé si l’API tourne en plusieurs instances.
5. Héberger les polices localement pour ne plus transmettre l’adresse IP à Google.
6. Historique consultable des révisions.
7. Révocation et rotation des clés de lecture et d’édition.
8. Brancher OpenRouter derrière `LLMClient` (clé serveur, limite de coût, timeout).
9. Tests navigateur et mesures d’accessibilité dans la CI (les scripts restent locaux).

## Blocages connus

- Aucun blocage technique.
- Décisions qui te reviennent : le corail, l’hébergement, la durée de conservation définitive, le contact à publier.
- Outils absents sur ce poste : Docker et `psql`. PostgreSQL n’est testé que par la CI.

## Prochaine action

Migrer la base locale en 0003, puis fusionner #4 et #5, dans cet ordre.

## Commandes courtes (PowerShell, depuis `runaway\backend`)

```powershell
..\..\.venv\Scripts\python.exe -m pytest
$env:DATABASE_URL = "sqlite:///./runaway.db"; ..\..\.venv\Scripts\python.exe -m alembic upgrade head
..\..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1
..\..\.venv\Scripts\python.exe -m app.retention          # comptage de la purge, sans suppression
```

Frontend : `npm ci`, `npm run dev`, `npm run test`, `npm run lint`, `npm run build` depuis `runaway\frontend`.
