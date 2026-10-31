# PR : `t4-outillage` vers `t3-fiabilisation`

Ouvrir : https://github.com/Fanel-B/runaway/compare/t3-fiabilisation...t4-outillage?expand=1&title=Tranche%204%20%3A%20outillage%20frontend%20%28ESLint%2C%20Prettier%2C%20CI%29

Titre : `Tranche 4 : outillage frontend (ESLint, Prettier, CI)`

Description à coller :

```markdown
## Ce que contient la tranche 4

- ESLint 9 avec la configuration recommandée : `@eslint/js`, `eslint-plugin-react` (`recommended`, `jsx-runtime`), `eslint-plugin-react-hooks` (`recommended-latest`). Seule règle désactivée : `react/prop-types`, car React 19 ne vérifie plus les `propTypes`.
- Prettier 3, un format unique pour tout le dépôt (`.prettierrc.json`, `.prettierignore`).
- CI : `npm run lint` bloquant, `npm audit` en avertissement seulement (annotation, jamais d'échec).

## Corrections ESLint (sans changement de comportement)

- `set-state-in-effect` (3) : remise à zéro pendant le rendu dans `Budget` et `EditStopDialog` ; dans `TripView`, état mis à jour seulement dans le callback de la requête.
- `exhaustive-deps` (1) dans `Budget`.
- `no-irregular-whitespace` (4) dans `Privacy` : `&nbsp;`.

Le reformatage Prettier est isolé dans son propre commit, à relire à part.

Non touchés, comme demandé : tests frontend, accessibilité, design.

## Comment l'essayer

`cd frontend`, `npm ci`, puis `npm run lint`, `npm run format:check`, `npm run build`.

## Tests

- Lint : 0 problème. Une erreur volontaire fait bien échouer la commande.
- `format:check` : conforme. Build : réussi.
- Parcours navigateur relancés après reformatage : 30/30 et 14/14.
- `npm audit` : 6 « moderate » dans `minimatch` (outillage ESLint) ; `npm audit --omit=dev` : 0.

## Limites

- `format:check` n'est pas dans la CI (non demandé) : à décider.
- CI non observée depuis mon poste.
```
