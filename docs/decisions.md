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

## 6. Portée de cette tranche

Pas de carte, de génération réelle, de cache, d’extraction de texte, de votes ni de modification. Les composants d’interface indiquent explicitement ce qui est à venir. Aucun fichier de conversation privé n’est inclus dans le dépôt.
