# Déployer Runaway sur un VPS

Rien n’est déployé à ce jour. Ce document décrit la marche à suivre quand tu décideras de le faire. Les fichiers ont été testés sur un runner GitHub Actions (voir [Ce qui a été testé](#ce-qui-a-été-testé)), jamais sur un vrai VPS.

## Architecture

Un seul domaine, donc pas de CORS à configurer.

```text
Internet
   │ 80, 443
   ▼
proxy (Caddy, HTTPS automatique, 172.30.0.10)
   ├── /api/*  →  api:8000 (FastAPI, utilisateur non privilégié)  →  db:5432 (PostgreSQL 17)
   └── le reste →  web:8080 (site compilé, nginx non privilégié)
```

Seul le proxy publie des ports. La base est sur un réseau interne sans accès à l’extérieur.

**Le point sensible.** Le quota de créations se base sur l’adresse du visiteur. Derrière un proxy, uvicorn ne voit que l’adresse du proxy : sans précaution, tous les visiteurs partageraient le même quota. `compose.prod.yaml` lance donc uvicorn avec `--proxy-headers --forwarded-allow-ips 172.30.0.10`, l’adresse fixe du proxy. Uvicorn ne croit `X-Forwarded-For` que si la connexion vient de cette adresse, et Caddy remplace toujours la valeur envoyée par le client. Si tu changes l’adresse du proxy, change-la aux deux endroits. Ne mets jamais `*`.

## Ce qu’il reste à décider de ton côté

| Sujet                                  | Pourquoi c’est bloquant                                                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Nom de domaine**                     | Caddy en a besoin pour obtenir le certificat HTTPS.                                                                       |
| **Responsable des données et contact** | La page de confidentialité n’en indique pas. À ajouter dans `frontend/src/components/Privacy.jsx` avant la mise en ligne. |
| **Texte « pas encore en ligne »**      | Cette phrase de la page de confidentialité devient fausse le jour du déploiement.                                         |
| **Hébergeur du VPS**                   | Il aura accès à la machine et à ses propres journaux réseau : à mentionner sur la page de confidentialité.                |
| **Copie des sauvegardes hors du VPS**  | Une sauvegarde stockée sur la seule machine qu’elle protège disparaît avec elle.                                          |
| **Durée de conservation**              | 12 mois par défaut (`RETENTION_MONTHS`).                                                                                  |
| **Purge automatique**                  | La page de confidentialité dit qu’elle est manuelle. Si tu l’automatises, mets le texte à jour.                           |

## Marche à suivre

### 1. Préparer le serveur

Un VPS Linux récent (Debian ou Ubuntu), avec au moins 1 Go de mémoire. La construction des images demande de la mémoire : avec moins de 2 Go, ajoute un fichier d’échange.

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"   # puis se reconnecter
sudo ufw allow OpenSSH && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw allow 443/udp && sudo ufw enable
```

Attention : les ports publiés par Docker contournent `ufw`. Ici, seuls 80 et 443 sont publiés, c’est volontaire.

### 2. Pointer le domaine

Crée un enregistrement DNS `A` (et `AAAA` si le serveur a une IPv6) vers le serveur. Attends qu’il réponde : sans cela, Caddy ne peut pas obtenir de certificat.

### 3. Installer le projet

```bash
sudo mkdir -p /opt/runaway /var/backups/runaway
sudo chown "$USER" /opt/runaway /var/backups/runaway
git clone https://github.com/Fanel-B/runaway.git /opt/runaway
cd /opt/runaway
cp deploy/env.prod.example .env.prod
chmod 600 .env.prod
openssl rand -hex 32    # à coller dans POSTGRES_PASSWORD
nano .env.prod
```

### 4. Variables de `.env.prod`

| Variable                       | Obligatoire | Rôle                                                    |
| ------------------------------ | ----------- | ------------------------------------------------------- |
| `DOMAIN`                       | oui         | Domaine public                                          |
| `ACME_EMAIL`                   | oui         | Contact pour les certificats                            |
| `POSTGRES_USER`, `POSTGRES_DB` | oui         | Compte et base                                          |
| `POSTGRES_PASSWORD`            | oui         | En hexadécimal : il est placé dans une URL de connexion |
| `RATE_LIMIT_CREATIONS_PER_IP`  | non (10)    | Créations par visiteur et par fenêtre                   |
| `RATE_LIMIT_CREATIONS_GLOBAL`  | non (200)   | Créations au total par fenêtre                          |
| `RATE_LIMIT_WINDOW_SECONDS`    | non (3600)  | Durée de la fenêtre                                     |
| `RETENTION_MONTHS`             | non (12)    | Durée de conservation                                   |
| `LOG_LEVEL`                    | non (INFO)  | Niveau des logs                                         |

Le fichier `.env.prod` est ignoré par Git. Il ne doit jamais être commité.

### 5. Déployer

```bash
deploy/deploy.sh
```

Le script récupère `origin/main`, construit les images, sauvegarde la base, applique les migrations, redémarre et vérifie `/api/ready`. Il s’arrête si des fichiers suivis ont été modifiés sur le serveur.

Il garde la trace de chaque déploiement dans `deploy/.deploy-history` : date, version précédente, sauvegarde prise juste avant.

### 6. Vérifier

Ouvre `https://ton-domaine`, crée un voyage, ouvre le lien de lecture dans une fenêtre privée, puis regarde les logs :

```bash
docker compose --env-file .env.prod -f compose.prod.yaml logs -f api
```

### 7. Sauvegarde quotidienne

```bash
crontab -e
```

```cron
15 3 * * * /opt/runaway/deploy/backup.sh >> /var/log/runaway-backup.log 2>&1
```

Les fichiers vont dans `/var/backups/runaway` (variable `BACKUP_DIR`), sont lisibles par leur seul propriétaire, et sont conservés 14 jours (`BACKUP_KEEP_DAYS`). Chaque sauvegarde est relue avec `pg_restore --list` avant d’être validée.

Crée le fichier de log avec les bons droits, ou choisis un chemin dans ton dossier personnel. Une sauvegarde contient les voyages et les empreintes des clés : traite-la comme une donnée sensible, surtout si tu la copies ailleurs.

### 8. Purge de conservation (facultatif)

```bash
docker compose --env-file .env.prod -f compose.prod.yaml run --rm --no-deps api python -m app.retention          # comptage
docker compose --env-file .env.prod -f compose.prod.yaml run --rm --no-deps api python -m app.retention --apply  # suppression
```

## Restaurer une sauvegarde

```bash
deploy/restore.sh /var/backups/runaway/runaway-AAAAMMJJTHHMMSSZ-quotidienne.dump --yes
```

Sans `--yes`, le script refuse. Il prend d’abord une copie de l’état actuel, arrête l’API, recrée la base, restaure en une seule transaction, puis relance l’API.

## Revenir en arrière

Regarde d’abord la dernière ligne de l’historique :

```bash
tail -1 deploy/.deploy-history
# date   version-précédente   sauvegarde-prise-avant-le-déploiement
```

**Cas 1, le déploiement n’a pas ajouté de migration** (`git diff --stat <version-précédente> HEAD -- backend/migrations` n’affiche rien) :

```bash
deploy/deploy.sh <version-précédente>
```

**Cas 2, le déploiement a ajouté une migration.** L’ancien code ne connaît pas le nouveau schéma. Il faut remettre la base dans son état d’avant le déploiement :

```bash
deploy/restore.sh <sauvegarde-prise-avant-le-déploiement> --yes
deploy/deploy.sh <version-précédente>
```

Attention : tout ce qui a été écrit après le déploiement est alors perdu. Si ce n’est pas acceptable, garde la nouvelle version et corrige en avançant.

Après un retour arrière, `deploy/deploy.sh` sans argument redéploiera `origin/main`. Corrige `main` avant de relancer sans argument.

## Passer à deux domaines

Non implémenté. Si le site et l’API avaient chacun leur domaine :

1. Dans `frontend/Dockerfile`, construire avec `VITE_API_URL=https://api.exemple.org` (argument de build).
2. Dans `compose.prod.yaml`, remplacer `CORS_ORIGINS: ''` par l’origine exacte du site.
3. Dans `deploy/Caddyfile`, un bloc par domaine, sans `handle_path /api/*`.

`--proxy-headers` et `--forwarded-allow-ips` ne changent pas.

## Ce qui a été testé

Docker n’est pas disponible sur le poste de développement. Les tests tournent donc sur un runner GitHub Actions (workflow `Déploiement à blanc`), avec `DOMAIN=localhost` et un certificat interne de Caddy. `deploy/test-stack.sh` et `deploy/test-backup-restore.sh` peuvent aussi être lancés sur une machine avec Docker. **Ils détruisent des données et ne doivent jamais viser un serveur réel** (le second refuse de démarrer si `DOMAIN` n’est pas `localhost`).

Vérifié : construction des images, déploiement en une commande (deux fois de suite), redirection HTTPS, en-têtes de sécurité, API et base non publiées, utilisateurs non privilégiés, absence du mot de passe dans les images, quota séparé par visiteur, `X-Forwarded-For` ignoré hors du proxy, absence d’adresses IP et de jetons dans les logs, cycle sauvegarde puis restauration avec comparaison d’empreinte.

Non vérifié : un vrai certificat Let’s Encrypt, un vrai VPS, un retour arrière entre deux versions réellement différentes, la tâche `cron`.

## Limites connues

- Pas de politique de sécurité de contenu (CSP) : `index.html` charge ses polices avec un attribut `onload` en ligne, à revoir avant d’en ajouter une.
- Un seul worker uvicorn : le quota est en mémoire. Passer à plusieurs instances demanderait un quota partagé.
- Les images de base suivent des étiquettes (`caddy:2-alpine`, `postgres:17-alpine`), pas des empreintes figées : `deploy.sh` récupère leurs mises à jour.
