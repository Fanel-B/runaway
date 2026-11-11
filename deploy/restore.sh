#!/usr/bin/env bash
# Restores a backup, replacing the whole current database.
# Usage: deploy/restore.sh <file.dump> --yes
# Without --yes nothing happens. A safety backup of the current state is taken first.
set -euo pipefail

cd "$(dirname "$0")/.."
ENV_FILE=.env.prod
compose() { docker compose --env-file "$ENV_FILE" -f compose.prod.yaml "$@"; }

FILE="${1:-}"
[ -n "$FILE" ] && [ -f "$FILE" ] || { echo "Usage : deploy/restore.sh <fichier.dump> --yes" >&2; exit 1; }
if [ "${2:-}" != "--yes" ]; then
  echo "Ceci remplacera toute la base par $FILE. Relancer avec --yes pour confirmer." >&2
  exit 1
fi

compose exec -T db pg_restore --list < "$FILE" > /dev/null || { echo "Sauvegarde illisible : $FILE" >&2; exit 1; }

SAFETY="$(deploy/backup.sh avant-restauration)"
echo "Copie de sécurité de l'état actuel : $SAFETY" >&2

compose stop api
compose exec -T db sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE \"$POSTGRES_DB\" WITH (FORCE)" -c "CREATE DATABASE \"$POSTGRES_DB\""'
compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --single-transaction --exit-on-error' < "$FILE"
compose up -d --wait api
echo "Restauration terminée depuis $FILE" >&2
