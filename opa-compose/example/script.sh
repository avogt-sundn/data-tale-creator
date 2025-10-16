#!/bin/bash

EXAMPLE=example


# Function to check if container is running

if docker ps -q -f name=opa | grep -q .; then
    echo "Container opa is already running"
    # Do nothing or perform actions
else
    echo "Starting container opa"
    docker compose -f ../docker-compose.yml up -d
fi

MAX_ATTEMPTS=10
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ping -c1 -W1 opa >/dev/null 2>&1 && host="opa" || host="localhost"
    echo "🚀 OPA gefunden unter hostname $host"

    if curl -s -o /dev/null -w "%{http_code}" http://$host:8181/health | grep -q "200"; then
        host="opa"
        echo "OPA service found at $host"
        break
    else
        echo "Waiting for OPA service... Attempt $((ATTEMPT + 1))/$MAX_ATTEMPTS"
        ATTEMPT=$((ATTEMPT + 1))
        sleep 2
    fi
done

echo "Prüfe auf vorhandene Policies auslesen unter dem Namen '$EXAMPLE' ..."

status=$(curl -X GET -s -w "%{http_code}" -o /dev/null http://$host:8181/v1/policies/$EXAMPLE)
if [ "$status" -eq 200 ]; then
    echo "  ** Gefunden! Policy '$EXAMPLE' wird gelöscht. "
    status=$(curl -X DELETE -s -w "%{http_code}" -o /dev/null http://$host:8181/v1/policies/$EXAMPLE)
    if [ "$status" -eq 200 ]; then
     echo "  ** Policy '$EXAMPLE' wurde gelöscht."
    fi
else
    echo "  ** Keine Policies gefunden unter '$EXAMPLE' "
fi

echo "Policies laden von attrbased-rules.rego unter dem Namen '$EXAMPLE' ..."
curl >/dev/null 2>&1 -X PUT --data-binary @attrbased-rules.rego -H "Content-Type: text/plain" http://$host:8181/v1/policies/$EXAMPLE


echo "Daten laden von data.json"
curl -s -X PUT -H "Content-Type: application/json" --data-binary @data.json http://$host:8181/v1/data

echo "Regeln auswerten zu input.json"
cat <<EOF > v1-data-input.json
{
    "input": $(cat input.json)
}
EOF
result=$(curl http://$host:8181/v1/data/app/abac -s --data-binary @v1-data-input.json -H 'Content-Type: application/json'|jq)

echo "Ergebnis:"
echo $result|jq