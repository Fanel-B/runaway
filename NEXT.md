# Reprise Runaway

## Réalisé

- API FastAPI, Pydantic, SQLAlchemy et première migration Alembic.
- `/health`, `/ready`, `POST /trips`, lecture protégée `GET /trips/{id}`.
- `LLMClient` et `FakeLLM`, rejet du JSON et des durées invalides.
- Calculateur de budget : scénarios, partage uniforme, marge de 8 %, inconnus explicites.
- Front React/Vite : formulaire, programme, budget incomplet et lien de lecture.
- Configuration PostgreSQL via Compose et workflow GitHub Actions préparés.
- Instructions PowerShell et Linux dans README.

## Avant de reprendre

État de livraison : le dépôt local est initialisé, mais GitHub n’est pas connecté à cette session. Aucun commit ni push distant n’a été effectué. Le code est fourni aussi sous forme d’archive, sans dépendances installées, base locale ni conversations privées.

Vérifications effectuées : 21 tests pytest réussis sur SQLite et compilation Vite réussie. Une alerte de dépréciation de Starlette sur httpx reste à traiter. Le test navigateur n’a pas pu être exécuté : Chromium était absent et son téléchargement a échoué. PostgreSQL et GitHub Actions n’ont pas encore été exécutés. Refaire ces vérifications avant de considérer le déploiement prêt.

1. Vérifier le compte GitHub connecté, puis rechercher `runaway` chez Fanel-B avant toute création pour éviter un doublon.
2. Si le dépôt existe, inspecter son contenu et ses instructions avant de fusionner ce code.
3. Préférer un dépôt privé pour cette première version, sauf demande explicite de visibilité publique.
4. Relire le diff avec Fanel. Aucun commit ne doit contenir `Co-Authored-By`.
5. Lancer les tests avant le push. Vérifier les jobs GitHub, notamment PostgreSQL.

## Prochaine tranche

Priorité : valider ce socle avec Fanel, puis brancher OpenRouter derrière l’interface avec clé dédiée côté serveur, limite de coût et gestion des erreurs. Ne pas envoyer de clé dans le chat.

Ensuite : catalogue d’estimations datées, contraintes verrouillées et proposition de changement avant application. Introduire les versions en base avant un endpoint d’édition. Ajouter Nominatim et Leaflet seulement après ces règles.

## Limites à garder visibles

Le générateur est faux ; les journées sont des espaces à personnaliser. Aucun lieu, tarif ni horaire réel n’est vérifié. Le budget est volontairement incomplet. SQLite est le mode local ; PostgreSQL doit être testé séparément. Pas de révocation des liens ni de quotas pour une exposition publique.

## Commandes courtes (Linux, depuis backend)

```bash
../.venv/bin/python -m pytest
../.venv/bin/python -m alembic upgrade head
../.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1
```

Frontend : `npm ci`, `npm run dev`, `npm run build`. Les dépendances Python sont figées dans `backend/requirements.lock` ; le lock npm est versionné avec le frontend.
