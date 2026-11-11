# PR : `essai` vers `main`

Ouvrir : https://github.com/Fanel-B/runaway/compare/main...essai?expand=1&title=Tranche%202%20%3A%20carnet%20%C3%A9ditable%2C%20droits%20serveur%20et%20nouvelle%20identit%C3%A9

Titre : `Tranche 2 : carnet éditable, droits serveur et nouvelle identité`

Description à coller :

```markdown
## Ce que contient la tranche 2

**Droits et écriture**

- Deux secrets distincts par voyage : une clé de lecture (dans le lien partagé) et une clé d'édition (gardée dans le navigateur de l'organisateur). La base ne stocke que leurs empreintes SHA-256.
- Rôle décidé par le serveur : `organizer` ou `reader`. Un voyage inconnu et un mauvais secret donnent le même 404.
- Écriture atomique par révision : chaque modification envoie `expected_revision`, et un écran périmé reçoit `409 revision_conflict` au lieu d'écraser une version plus récente.
- « On garde » verrouille une activité (`409 locked` si on tente de la modifier).
- Migration Alembic 0002, purement additive : les anciens voyages gardent leur lien de lecture et restent en lecture seule. Un ancien lien ne devient jamais un droit d'édition.

**Budget**

- Cinq postes et trois scénarios, saisis par personne ou pour le groupe, enregistrés côté serveur.
- Tous les totaux sont calculés par `backend/app/budget.py`, jamais dans le frontend.
- Un champ vide reste inconnu, un zéro est un coût nul assumé. « Dans le plafond » n'apparaît jamais tant qu'un poste manque.

**Interface**

- Interface découpée en composants, direction artistique « carnet d'escapades » documentée (`docs/DIRECTION_ARTISTIQUE.md`).
- Écrans : accueil avec cartes d'inspiration, formulaire, couverture, Programme / Budget / Carnet, comparaison avant/après, export JSON sans secret, impression, journal du projet.
- Exemple fictif de trois jours, copie indépendante à chaque ouverture.
- Logo oiseau, ambiance animée selon le voyage (vagues, feuilles, neige, soleil) avec bouton pause et respect du mouvement réduit.

## Comment l'essayer

1. Migrer la base : `cd backend`, `$env:DATABASE_URL = "sqlite:///./runaway.db"`, `..\..\.venv\Scripts\python.exe -m alembic upgrade head`.
2. Lancer l'API (`uvicorn app.main:app --reload`) puis l'interface (`npm run dev`), ouvrir http://127.0.0.1:5173.
3. « Explorer un exemple » : modifier une activité, comparer, appliquer, cliquer « On garde ».
4. Budget : remplir quelques postes en laissant un champ vide, enregistrer, recharger.
5. Carnet : « Voir comme un ami » ouvre la vue lecture seule.

Détails dans `JOURNAL_DES_MODIFICATIONS.md` et `MISE_A_JOUR_WINDOWS.md`.

## Tests

- pytest : 38 réussis (SQLite), dont la migration depuis 0001 avec un ancien voyage.
- `npm run build` : réussi.
- Parcours navigateur (Chrome headless, script local hors dépôt) : 30/30.
- PostgreSQL : à confirmer par la CI de cette PR.

## Limites connues

- Générateur toujours simulé (`FakeLLM`) : aucun lieu, horaire ni tarif vérifié.
- La clé organisateur vit dans le stockage local du navigateur : perdue si les données sont effacées, non synchronisée, utilisable par quiconque a accès au même profil.
- Pas d'historique des révisions, pas de révocation des liens.
- Pas de test Safari, Firefox ni lecteur d'écran.
```
