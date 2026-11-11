#!/usr/bin/env bash
# One-command deployment: fetch, build, back up, migrate, restart, check.
# Usage, from anywhere in the repository on the server:
#   deploy/deploy.sh             deploys origin/main
#   deploy/deploy.sh <commit>    deploys this commit (also used to go back, see docs/DEPLOIEMENT.md)
set -euo pipefail

cd "$(dirname "$0")/.."
ENV_FILE=.env.prod
compose() { docker compose --env-file "$ENV_FILE" -f compose.prod.yaml "$@"; }

[ -f "$ENV_FILE" ] || { echo "Fichier $ENV_FILE absent : voir deploy/env.prod.example." >&2; exit 1; }
if [ -n "$(git status --porcelain)" ]; then
  echo "Des fichiers suivis ont été modifiés sur le serveur : déploiement annulé." >&2
  git status --short >&2
  exit 1
fi

echo "== Récupération"
git fetch --quiet origin
TARGET="${1:-origin/main}"
PREVIOUS="$(git rev-parse --short HEAD)"
git checkout --quiet --detach "$TARGET"
RUNAWAY_VERSION="$(git rev-parse --short HEAD)"
export RUNAWAY_VERSION
echo "Version précédente : $PREVIOUS, version déployée : $RUNAWAY_VERSION"

echo "== Construction des images"
compose build --pull

echo "== Base de données"
compose up -d --wait db

echo "== Sauvegarde avant migration"
BACKUP_FILE="$(deploy/backup.sh "avant-$RUNAWAY_VERSION")"
echo "$BACKUP_FILE"
printf '%s %s %s\n' "$(date -u +%FT%TZ)" "$PREVIOUS" "$BACKUP_FILE" >> deploy/.deploy-history

echo "== Migration"
compose run --rm --no-deps api alembic upgrade head

echo "== Redémarrage"
compose up -d --wait --remove-orphans

echo "== Vérification"
set -a
# shellcheck disable=SC1090
. "./$ENV_FILE"
set +a
if ! curl --silent --show-error --fail --insecure --max-time 20 \
  --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/api/ready" > /dev/null; then
  echo "ÉCHEC : /api/ready ne répond pas. Retour arrière : docs/DEPLOIEMENT.md." >&2
  echo "Version précédente : $PREVIOUS. Sauvegarde : $BACKUP_FILE" >&2
  exit 1
fi
echo "Déploiement réussi : $RUNAWAY_VERSION (précédente : $PREVIOUS)"
