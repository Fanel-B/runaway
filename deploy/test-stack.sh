#!/usr/bin/env bash
# Checks a stack started by deploy/deploy.sh with DOMAIN=localhost and RATE_LIMIT_CREATIONS_PER_IP=3.
set -uo pipefail

cd "$(dirname "$0")/.."
ENV_FILE=.env.prod
compose() { docker compose --env-file "$ENV_FILE" -f compose.prod.yaml "$@"; }
FAILURES=0
check() { # label expected actual
  if [ "$2" = "$3" ]; then echo "OK    $1 ($3)"; else echo "ÉCHEC $1 : attendu $2, obtenu $3"; FAILURES=$((FAILURES + 1)); fi
}
curl_in() { # network ip [host mapping is localhost -> proxy] curl arguments
  local network="$1" ip="$2"; shift 2
  docker run --rm --network "$network" --ip "$ip" --add-host "localhost:172.30.0.10" curlimages/curl:latest --silent --insecure --max-time 20 "$@"
}
create() { # ip [extra curl arguments]
  local ip="$1"; shift
  curl_in runaway_edge "$ip" -o /dev/null -w '%{http_code}' -X POST "$@" https://localhost/api/trips/example
}

echo "== Site et API derrière un seul domaine"
check "HTTP redirigé vers HTTPS" 308 "$(curl -s -o /dev/null -w '%{http_code}' http://localhost/)"
check "page d'accueil" 200 "$(curl -sk -o /dev/null -w '%{http_code}' https://localhost/)"
curl -sk https://localhost/ | grep -q 'id="root"'; check "le site servi est l'application" 0 "$?"
check "API /api/health" 200 "$(curl -sk -o /dev/null -w '%{http_code}' https://localhost/api/health)"
check "API /api/ready (base migrée)" 200 "$(curl -sk -o /dev/null -w '%{http_code}' https://localhost/api/ready)"
HEADERS="$(curl -skI https://localhost/)"
printf '%s' "$HEADERS" | grep -qi '^strict-transport-security:'; check "en-tête HSTS" 0 "$?"
printf '%s' "$HEADERS" | grep -qi '^x-content-type-options: nosniff'; check "en-tête nosniff" 0 "$?"
printf '%s' "$HEADERS" | grep -qi '^server:'; check "pas d'en-tête Server" 1 "$?"

echo "== Rien d'autre n'est exposé"
check "API non publiée sur l'hôte" 000 "$(curl -s -m 3 -o /dev/null -w '%{http_code}' http://127.0.0.1:8000/health)"
check "base non publiée" "" "$(compose port db 5432 2> /dev/null | grep -v '^:0$')"
check "base injoignable depuis le réseau public" 1 "$(docker run --rm --network runaway_edge postgres:17-alpine sh -c 'pg_isready -h db -t 3 > /dev/null 2>&1; [ $? -eq 0 ] && echo 0 || echo 1')"

echo "== Utilisateurs non privilégiés"
for service in api web; do
  ID="$(compose exec -T "$service" id -u | tr -d '\r')"
  [ "$ID" != "0" ]; check "$service sans root (uid $ID)" 0 "$?"
done

echo "== Pas de secret dans les images"
for image in "runaway-api:$RUNAWAY_VERSION" "runaway-web:$RUNAWAY_VERSION"; do
  PASSWORD="$(sed -n 's/^POSTGRES_PASSWORD=//p' "$ENV_FILE")"
  docker image inspect "$image" --format '{{json .Config.Env}}' | grep -q "$PASSWORD"; check "mot de passe absent de la configuration de $image" 1 "$?"
  docker history --no-trunc "$image" | grep -q "$PASSWORD"; check "mot de passe absent de l'historique de $image" 1 "$?"
  echo "      taille de $image : $(docker image inspect "$image" --format '{{.Size}}' | awk '{printf "%d Mo", $1/1000000}')"
done
docker run --rm --entrypoint sh "runaway-api:$RUNAWAY_VERSION" -c 'python -c "import pytest" 2> /dev/null'; check "pas d'outils de test dans l'image API" 1 "$?"
docker run --rm --entrypoint sh "runaway-api:$RUNAWAY_VERSION" -c 'pip check > /dev/null'; check "dépendances de l'image API cohérentes" 0 "$?"

echo "== Quota par visiteur derrière le proxy (limite : 3)"
for attempt in 1 2 3; do check "visiteur A, création $attempt" 201 "$(create 172.30.0.101)"; done
check "visiteur A, au-delà du quota" 429 "$(create 172.30.0.101)"
check "visiteur B garde son propre quota" 201 "$(create 172.30.0.102)"
check "visiteur A ne contourne pas le quota avec un faux X-Forwarded-For" 429 "$(create 172.30.0.101 -H 'X-Forwarded-For: 198.51.100.7')"

echo "== X-Forwarded-For ignoré hors du proxy"
direct() { curl_in runaway_edge 172.30.0.103 -o /dev/null -w '%{http_code}' -X POST -H "X-Forwarded-For: 198.51.100.$1" http://api:8000/trips/example; }
for attempt in 1 2 3; do check "accès direct $attempt, adresse usurpée différente" 201 "$(direct "$attempt")"; done
check "accès direct : le quota suit la vraie adresse" 429 "$(direct 4)"

echo "== Logs"
API_LOGS="$(compose logs --no-color --no-log-prefix api 2>&1)"
PROXY_LOGS="$(compose logs --no-color --no-log-prefix proxy 2>&1)"
printf '%s' "$API_LOGS" | grep '"message": "request"' | head -1
for address in 172.30.0.101 172.30.0.102 172.30.0.103 198.51.100; do
  printf '%s' "$API_LOGS" | grep -q "$address"; check "adresse $address absente des logs de l'API" 1 "$?"
  printf '%s' "$PROXY_LOGS" | grep -q "$address"; check "adresse $address absente des logs du proxy" 1 "$?"
done
printf '%s' "$API_LOGS" | grep -qi 'bearer'; check "aucun jeton dans les logs de l'API" 1 "$?"

echo
if [ "$FAILURES" -eq 0 ]; then echo "RÉSULTAT : tout est conforme."; else echo "RÉSULTAT : $FAILURES échec(s)."; fi
exit "$FAILURES"
