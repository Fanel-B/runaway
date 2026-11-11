# Reprise Runaway

## Où en est le dépôt (11 novembre 2026)

Les PR #1, #2 et #3 sont fusionnées, mais `main` ne contient que la tranche 2 : elles ont été fusionnées dans l’ordre #1, #2, #3 alors qu’elles étaient empilées.

| PR  | Branche                        | Contenu                                        | État    |
| --- | ------------------------------ | ---------------------------------------------- | ------- |
| #4  | `t3-fiabilisation` vers `main` | Remonte les tranches 3 et 4, sans code nouveau | Ouverte |
| #5  | `t4-tests` vers `main`         | Tests frontend et accessibilité                | Ouverte |
| #6  | `t5-preparation` vers `main`   | Préparation du déploiement, sans déployer      | Ouverte |

**Ordre de fusion : #4, puis #5, puis #6.** Chaque PR vise `main` et affiche aussi le contenu des précédentes tant qu’elles ne sont pas fusionnées. Une fois celles-ci fusionnées, elle n’affiche que ses propres changements.

## Méthode

Une branche par tranche, une PR directement vers `main`, plus de branche d’intégration. Après la fusion de #4, supprimer `essai`, `t3-fiabilisation` et `t4-outillage`.

## Terminé

- **Tranche 2** : clé d’édition distincte, verrous, révisions atomiques, budget enregistré et calculé par `budget.py`, exemple fictif, interface « carnet d’escapades », ambiance animée.
- **Tranche 3** : CORS par liste d’origines, quota de créations, logs JSON sans secret, `DELETE /trips/{id}`, migration 0003, purge manuelle, page de confidentialité, `VITE_API_URL`.
- **Tranche 4, outillage** : ESLint, Prettier, lint bloquant et audit en avertissement dans la CI.
- **Tests frontend** : 81 tests Vitest bloquants en CI.
- **Accessibilité** : contrastes mesurés, focus clavier corrigé, détail dans `docs/DIRECTION_ARTISTIQUE.md`.
- **Préparation du déploiement** : images, compose de production, Caddy, scripts, `docs/DEPLOIEMENT.md`. Testé sur un runner GitHub, cycle sauvegarde et restauration compris. Rien n’est déployé.

Détails et tests réellement exécutés : `JOURNAL_DES_MODIFICATIONS.md`.

## Avant de reprendre

1. **Migrer la base locale en 0003** (`MISE_A_JOUR_WINDOWS.md`, étape 2). Elle est toujours en 0002 : sans cela, la nouvelle API répond 503.
2. Fusionner les PR dans l’ordre indiqué plus haut.
3. Lire `RAPPORT_NUIT.md`.

## Restant

1. Décider du corail sur fonds colorés (voir `docs/DIRECTION_ARTISTIQUE.md`, section Accessibilité).
2. Choisir le domaine, le responsable des données, et où copier les sauvegardes (`docs/DEPLOIEMENT.md`).
3. Déployer pour de vrai : `deploy/deploy.sh` sur un VPS.
4. Purge planifiée une fois l’hébergement choisi.
5. Responsable et contact sur la page de confidentialité avant toute mise en ligne.
6. Quota partagé si l’API tourne en plusieurs instances.
7. Héberger les polices localement pour ne plus transmettre l’adresse IP à Google.
8. Historique consultable des révisions.
9. Révocation et rotation des clés de lecture et d’édition.
10. Brancher OpenRouter derrière `LLMClient` (clé serveur, limite de coût, timeout).
11. Tests navigateur et mesures d’accessibilité dans la CI (les scripts restent locaux).

## Blocages connus

- Aucun blocage technique.
- Décisions qui te reviennent : le corail, le domaine et l’hébergement, le responsable des données, la copie des sauvegardes, la durée de conservation.
- Outils absents sur ce poste : Docker, WSL et `psql`. PostgreSQL et la pile de production ne sont testés que par la CI.

## Prochaine action

Migrer la base locale en 0003, puis fusionner #4, #5 et #6, dans cet ordre, et supprimer les branches `essai`, `t3-fiabilisation`, `t4-outillage`, `t4-tests` et `t5-preparation`.

## Commandes courtes (PowerShell, depuis `runaway\backend`)

```powershell
..\..\.venv\Scripts\python.exe -m pytest
$env:DATABASE_URL = "sqlite:///./runaway.db"; ..\..\.venv\Scripts\python.exe -m alembic upgrade head
..\..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1
..\..\.venv\Scripts\python.exe -m app.retention          # comptage de la purge, sans suppression
```

Frontend : `npm ci`, `npm run dev`, `npm run test`, `npm run lint`, `npm run build` depuis `runaway\frontend`.
