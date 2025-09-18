#!/bin/bash

ping -c1 -W1  opa >/dev/null 2>&1 && host="opa" || host="localhost"
echo "OPA gefunden unter hostname $host"

echo "Policies löschen"
status=$(curl -X GET -s -w "%{http_code}" -o /dev/null http://$host:8181/v1/policies/example)
if [ "$status" -eq 200 ]; then
    echo "OK. Policy wird gelöscht. "
    curl -X DELETE http://$host:8181/v1/policies/example
    else
    echo "Status: $status"
fi

echo "Policies laden"
curl -X PUT --data-binary @attrbased-rules.rego -H "Content-Type: text/plain" http://$host:8181/v1/policies/example

echo "Daten laden"
cat <<EOF > v1-data-input.json
{
    "input": $(cat input.json)
}
EOF
curl -s -X PUT -H "Content-Type: application/json" --data-binary @data.json http://$host:8181/v1/data

echo "Regeln auswerten"
curl http://$host:8181/v1/data/app/abac -s --data-binary @v1-data-input.json -H 'Content-Type: application/json'|jq
