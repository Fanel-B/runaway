# Décisions de la première tranche

## 1. Un contrat IA avant un fournisseur

`LLMClient.generate` renvoie du texte JSON. Le service valide la structure avec Pydantic, puis contrôle que les numéros de journée couvrent exactement la durée demandée. Une réponse invalide est rejetée avant toute insertion.

Le faux générateur ne propose aucun monument prétendument vérifié : il produit des espaces de programme à remplir. OpenRouter viendra avec un modèle fixé côté serveur, des limites de coût, un timeout et des tests de réponses simulées.

## 2. Les données absentes ne coûtent pas zéro

Le calculateur additionne seulement les postes connus, mais marque un scénario incomplet dès qu’une estimation manque. `within_budget` vaut alors `null`. Le frontend n’affiche pas le sous-total nul comme un voyage gratuit. Les valeurs de test ne sont pas utilisées comme tarifs touristiques.

## 3. Base migrée, pas créée implicitement au démarrage

L’application ne lance pas `create_all`. Alembic porte la création de table ; `/ready` vérifie sa présence. Les tests utilisent aussi cette migration. Le schéma JSON est un premier compromis : les versions et verrous seront introduits dans une tranche séparée.

## 4. Lecture protégée dès le début

Un UUID identifie le voyage, mais ne donne pas à lui seul accès aux préférences. La création renvoie un secret de lecture aléatoire ; seule son empreinte est conservée en base. Le fragment d’URL est lu par le frontend puis envoyé en en-tête Authorization. Aucun endpoint d’édition ni de liste publique n’existe encore.

Cette solution ne remplace pas un futur mécanisme de révocation. Le lien est une capacité de lecture, à traiter comme privé. Ne pas coller des secrets ou une conversation personnelle dans le nom de destination.

## 5. Vérifications locales et PostgreSQL

Le cloud de développement ne dispose pas initialement de Docker ni de serveur PostgreSQL. SQLite permet d’exécuter les tests et le parcours local. Le workflow CI ajoute PostgreSQL 17 ; il faut vérifier ce job après le push avant de déclarer l’intégration PostgreSQL validée.

## 6. Deuxième tranche : édition sans comptes

**Deux capacités distinctes.** La création renvoie une clé de lecture et une clé d’édition, générées indépendamment. Seules leurs empreintes SHA-256 sont en base. Le serveur détermine le rôle en comparant l’empreinte présentée à chacune, en temps constant. Une clé inconnue et un voyage inexistant donnent la même erreur 404. Un lien de lecture qui tente d’écrire reçoit 403.

**Pas d’écrasement silencieux.** Chaque voyage a un compteur `revision`. Une écriture envoie la révision qu’elle a lue. Le serveur fait `UPDATE … WHERE id = ? AND revision = ?` puis incrémente. Si aucune ligne ne correspond, un autre écrivain est passé avant : 409, et l’interface propose de recharger sans perdre la saisie en cours. Cette forme reste atomique en SQLite comme en PostgreSQL, sans verrou applicatif.

**Verrous contrôlés côté serveur.** « On garde » est un champ de l’activité stockée. Une modification de contenu sur une activité verrouillée est refusée par l’API, pas seulement masquée dans l’interface. Toute modification marque l’activité « à revoir » (coûts et trajets), jusqu’à ce que l’organisateur indique l’avoir revue.

**Un seul calcul de budget.** Les montants saisis sont stockés tels quels (`budget_inputs`), et `budget.py` recalcule à chaque lecture et à chaque sauvegarde. Les anciens voyages obtiennent ainsi le même format de réponse. Le total du groupe est arrondi depuis le sous-total non arrondi, pas multiplié depuis le total par personne déjà arrondi.

**Migration conservatrice.** `0002` n’ajoute que des colonnes. `edit_token_hash` vaut NULL pour les voyages existants : leur ancien lien reste un lien de lecture, jamais un droit d’édition. Un test part d’une base en 0001 avec un ancien voyage, migre, relit et vérifie le refus d’écriture.

**Exemple séparé.** `examples.py` contient le séjour fictif. `POST /trips/example` crée une nouvelle copie à chaque appel, avec ses propres clés : on peut tout modifier sans affecter ni un autre exemple ni un vrai voyage.

## 7. Portée de cette tranche

Pas de carte, de génération réelle, de cache, d’extraction de texte, de votes, de réservation ni de collaboration en temps réel. Les modifications sont réservées à l’organisateur. Aucun fichier de conversation privé n’est inclus dans le dépôt.
