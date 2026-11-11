#!/usr/bin/env bash
# Database backup, meant to run daily from cron (see docs/DEPLOIEMENT.md).
# Usage: deploy/backup.sh [label]. Prints the path of the backup on stdout, and nothing else.
# Settings: BACKUP_DIR (default /var/backups/runaway), BACKUP_KEEP_DAYS (default 14).
set -euo pipefail

cd "$(dirname "$0")/.."
ENV_FILE=.env.prod
compose() { docker compose --env-file "$ENV_FILE" -f compose.prod.yaml "$@"; }

LABEL="${1:-quotidienne}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/runaway}"
BACKUP_KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"

# A dump holds trips and key hashes: readable by its owner only.
umask 077
mkdir -p "$BACKUP_DIR"
TARGET="$BACKUP_DIR/runaway-$(date -u +%Y%m%dT%H%M%SZ)-$LABEL.dump"
PARTIAL="$TARGET.partial"
trap 'rm -f "$PARTIAL"' EXIT

# Variables are expanded inside the container: no password on this machine's command line.
compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner' > "$PARTIAL"

# An unreadable dump must fail now, not on the day it is needed.
compose exec -T db pg_restore --list < "$PARTIAL" > /dev/null
[ -s "$PARTIAL" ] || { echo "Sauvegarde vide : $PARTIAL" >&2; exit 1; }
mv "$PARTIAL" "$TARGET"

find "$BACKUP_DIR" -name 'runaway-*.dump' -type f -mtime "+$BACKUP_KEEP_DAYS" -delete
echo "$TARGET"
