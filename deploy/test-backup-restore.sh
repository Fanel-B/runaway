#!/usr/bin/env bash
# Real cycle on the compose PostgreSQL: create data through the public API, back up, destroy,
# restore, compare. Needs a stack started by deploy/deploy.sh with a throwaway .env.prod.
# NEVER run it against real data: it empties the trips table.
set -euo pipefail

cd "$(dirname "$0")/.."
ENV_FILE=.env.prod
compose() { docker compose --env-file "$ENV_FILE" -f compose.prod.yaml "$@"; }
sql() { compose exec -T db sh -c 'psql -X -A -t -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <<< "$1"; }
fingerprint() { sql "SELECT count(*) || ' ' || coalesce(md5(string_agg(t::text, '|' ORDER BY id)), 'vide') FROM trips t;"; }
# A client inside the edge network, with its own address, seen by the proxy like a visitor.
client() { local ip="$1"; shift; docker run --rm --network runaway_edge --ip "$ip" --add-host "localhost:172.30.0.10" curlimages/curl:latest --silent --insecure --max-time 20 "$@"; }

: "${BACKUP_DIR:?Définir BACKUP_DIR}"
export BACKUP_DIR
case "$(grep '^DOMAIN=' "$ENV_FILE")" in
  DOMAIN=localhost) ;;
  *) echo "Refus : ce test détruit des données, il exige DOMAIN=localhost." >&2; exit 1 ;;
esac

echo "== Création de données par l'API publique"
BODY='{"departure":"paris","destination":"Normandie","start_date":"2027-06-12","end_date":"2027-06-14","travelers":3,"budget_cents":45000,"style":"nature"}'
READ_TOKEN=""
TRIP_ID=""
CREATED=0
for block in 110 111 112 113 114; do
  for _ in 1 2; do
    RESPONSE="$(client "172.30.0.$block" -X POST -H 'content-type: application/json' -d "$BODY" https://localhost/api/trips)"
    TRIP_ID="$(printf '%s' "$RESPONSE" | sed -E 's/.*"id":"([^"]+)".*/\1/')"
    READ_TOKEN="$(printf '%s' "$RESPONSE" | sed -E 's/.*"read_token":"([^"]+)".*/\1/')"
    CREATED=$((CREATED + 1))
    EDIT_TOKEN="$(printf '%s' "$RESPONSE" | sed -E 's/.*"edit_token":"([^"]+)".*/\1/')"
  done
done
LINES='{"expected_revision":1,"lines":[{"key":"transport","low":1000,"central":2000,"high":3000,"shared":false}]}'
client 172.30.0.115 -o /dev/null -w '' -X PUT -H "Authorization: Bearer $EDIT_TOKEN" -H 'content-type: application/json' -d "$LINES" "https://localhost/api/trips/$TRIP_ID/budget"
BEFORE="$(fingerprint)"
VERSION_BEFORE="$(sql 'SELECT version_num FROM alembic_version;')"
echo "Voyages créés : $CREATED. Empreinte : $BEFORE. Migration : $VERSION_BEFORE"

echo "== Sauvegarde"
START=$(date +%s%N)
FILE="$(deploy/backup.sh test)"
BACKUP_MS=$((($(date +%s%N) - START) / 1000000))
SIZE="$(stat -c %s "$FILE")"
MODE="$(stat -c %a "$FILE")"
echo "Fichier : $FILE, $SIZE octets, droits $MODE, en $BACKUP_MS ms"
[ "$MODE" = "600" ] || { echo "ÉCHEC : la sauvegarde est lisible par d'autres." >&2; exit 1; }

echo "== Destruction"
sql 'TRUNCATE trips;' > /dev/null
DESTROYED="$(sql 'SELECT count(*) FROM trips;')"
echo "Voyages après destruction : $DESTROYED"
[ "$DESTROYED" = "0" ] || { echo "ÉCHEC : la destruction n'a pas eu lieu." >&2; exit 1; }
STATUS="$(client 172.30.0.116 -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $READ_TOKEN" "https://localhost/api/trips/$TRIP_ID")"
echo "Lecture d'un voyage détruit : $STATUS"
[ "$STATUS" = "404" ] || { echo "ÉCHEC : attendu 404." >&2; exit 1; }

echo "== Refus sans confirmation"
if deploy/restore.sh "$FILE" 2> /dev/null; then echo "ÉCHEC : restauration sans --yes." >&2; exit 1; fi
echo "Restauration sans --yes refusée."

echo "== Restauration"
START=$(date +%s%N)
deploy/restore.sh "$FILE" --yes
RESTORE_MS=$((($(date +%s%N) - START) / 1000000))
AFTER="$(fingerprint)"
VERSION_AFTER="$(sql 'SELECT version_num FROM alembic_version;')"
echo "Empreinte avant : $BEFORE"
echo "Empreinte après : $AFTER"
echo "Migration avant : $VERSION_BEFORE, après : $VERSION_AFTER"
[ "$BEFORE" = "$AFTER" ] || { echo "ÉCHEC : les données diffèrent." >&2; exit 1; }
[ "$VERSION_BEFORE" = "$VERSION_AFTER" ] || { echo "ÉCHEC : version de migration différente." >&2; exit 1; }

echo "== Le service relit les données restaurées"
compose restart proxy > /dev/null
sleep 3
STATUS="$(client 172.30.0.117 -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $READ_TOKEN" "https://localhost/api/trips/$TRIP_ID")"
echo "Lecture avec l'ancienne clé après restauration : $STATUS"
[ "$STATUS" = "200" ] || { echo "ÉCHEC : attendu 200." >&2; exit 1; }

echo
echo "RÉSULTAT : $CREATED voyages, sauvegarde de $SIZE octets en $BACKUP_MS ms, restauration en $RESTORE_MS ms, empreinte identique ($AFTER)."
