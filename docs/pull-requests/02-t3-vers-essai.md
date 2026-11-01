# PR : `t3-fiabilisation` vers `essai`

Ouvrir : https://github.com/Fanel-B/runaway/compare/essai...t3-fiabilisation?expand=1&title=Tranche%203%20%3A%20API%20d%C3%A9ployable%2C%20suppression%20et%20conservation

Titre : `Tranche 3 : API déployable, suppression et conservation`

Description à coller :

```markdown
## Pourquoi

L'API ne tournait que derrière le proxy Vite (même origine) et ne savait pas supprimer un voyage. Cette tranche la rend déployable et conforme : qui peut l'appeler, combien de créations, des logs exploitables sans secret, et un cycle de vie des données.

## A. API déployable

- **CORS** : `CORS_ORIGINS` liste les origines exactes. `*` est refusé au démarrage. Vide par défaut (le proxy Vite suffit en local). Pas de cookies.
- **Quota de créations** : `POST /trips` et `POST /trips/example` partagent une fenêtre glissante d'une heure, 10 par client et 200 au total (variables d'environnement). `429 rate_limited` avec `Retry-After`. Les requêtes invalides et les échecs du générateur ne comptent pas. Justification du choix dans le README.
- **Logs JSON** : une ligne par requête avec `request_id` (repris de `X-Request-ID` s'il est sûr, renvoyé dans la réponse). Jamais d'en-têtes, de corps ni d'adresse IP. Masquage final de tout ce qui ressemble à un secret.
- `VITE_API_URL` permet à l'interface de viser une API sur un autre domaine.

## B. Suppression et conservation

- `DELETE /trips/{id}` : organisateur seulement. Lecteur : 403. Inconnu ou mauvais secret : 404, comme le reste de l'API.
- Bouton « Supprimer ce voyage » dans le Carnet, avec un dialogue explicite et une case « Je comprends que la suppression est définitive ». L'entrée est retirée du stockage local.
- Migration 0003 : `last_opened_at`, rafraîchie au plus une fois par jour par une lecture, sans changer la révision. Les voyages existants reçoivent la date de la migration.
- Purge manuelle : `python -m app.retention` (comptage seul) et `--apply`. Non planifiée, documentée dans le README.
- Page de confidentialité (`#confidentialite`, lien en pied de page).

## Ce qui n'a pas bougé

- `budget.py` : aucun changement.
- Modèle de droits : deux secrets, empreintes seules, même 404 : inchangé.
- Écriture atomique par révision : inchangée.
- Générateur : toujours `FakeLLM`.

## Comment l'essayer

1. `cd backend`, `$env:DATABASE_URL = "sqlite:///./runaway.db"`, `..\..\.venv\Scripts\python.exe -m alembic upgrade head` (passe en 0003).
2. Lancer l'API et l'interface comme d'habitude.
3. Carnet, « Supprimer ce voyage » ; pied de page, « Confidentialité » ; onze clics sur « Explorer un exemple » pour voir le quota.
4. Purge : `..\..\.venv\Scripts\python.exe -m app.retention`.

Pas à pas complet dans `JOURNAL_DES_MODIFICATIONS.md` (entrée du 31 octobre).

## Tests

- pytest : 67 réussis sur SQLite (29 nouveaux) : CORS, quota, logs sans secret, suppression, conservation, purge, migration 0002 vers 0003.
- Contrôle par mutation : avec `*` à la place de la liste, 3 tests CORS échouent.
- Vrai serveur uvicorn : journal parcouru avec un script, sans clé, empreinte, en-tête d'autorisation ni adresse IP.
- Migration testée sur une copie d'une base réelle de 39 voyages : données identiques après passage en 0003.
- `npm run build` : réussi.
- Navigateur (script local, interface et API sur deux origines différentes) : parcours complet 30/30, parcours tranche 3 14/14.
- **PostgreSQL : non testé localement** (pas de Docker). À confirmer par la CI de cette PR.

## Limites

- Quota en mémoire d'un seul processus : remis à zéro au redémarrage, non partagé entre instances.
- Purge manuelle.
- La page de confidentialité n'indique pas encore de responsable ni de contact.
- Google Fonts reçoit l'adresse IP des visiteurs (dit sur la page).
- Pas testé derrière un vrai reverse proxy.
```
