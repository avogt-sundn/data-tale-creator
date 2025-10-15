#!/bin/bash
set -e

# Host bestimmen
ping -c1 -W1 opa >/dev/null 2>&1 && host="opa" || host="localhost"
echo "🚀 OPA gefunden unter hostname $host"

# -----------------------------
# Policy neu laden
# -----------------------------
POLICY_ID="lasttest"
PACKAGE_PATH="app/abac"

echo "📄 Policy aktualisieren..."
status=$(curl -X GET -s -w "%{http_code}" -o /dev/null http://$host:8181/v1/policies/$POLICY_ID)
if [ "$status" -eq 200 ]; then
    curl -s -X DELETE http://$host:8181/v1/policies/$POLICY_ID >/dev/null
    echo "✅ Alte Policy gelöscht"
fi
curl -s -X PUT --data-binary @attrbased-rules.rego -H "Content-Type: text/plain" \
  http://$host:8181/v1/policies/$POLICY_ID >/dev/null
echo "✅ Neue Policy geladen unter ID '$POLICY_ID'"

# -----------------------------
# Daten neu laden
# -----------------------------
echo "🧩 Daten in OPA laden..."
curl -s -X PUT -H "Content-Type: application/json" --data-binary @data.json \
  http://$host:8181/v1/data >/dev/null
echo "✅ Daten geladen"

# -----------------------------
# Lasttest vorbereiten
# -----------------------------
echo "🧮 Generiere zufällige Requests..."
REQ_COUNT=1
TMP_REQS=reqs.ndjson
: > $TMP_REQS

for i in $(seq 1 $REQ_COUNT); do
  ACTION=$(shuf -n1 -e open open open open open delete)
  AUFGABE=$((1 + RANDOM % 10))
  AUFGABE=7
  ROLE=$(shuf -n1 -e admin SB SB SB SB SB)
  echo "{\"input\": {\"user\": {\"id\": \"u-$i\", \"role\": \"$ROLE\", \"attributes\": {\"aufgabenart\": \"aufgabenart-$AUFGABE\"}}, \"action\": \"$ACTION\"}}" >> $TMP_REQS
done
echo "✅ $REQ_COUNT Zufallsanfragen erzeugt"

# -----------------------------
# Lasttest starten
# -----------------------------
echo "🏁 Starte Lasttest mit $REQ_COUNT Requests..."
start=$(date +%s%N)
SUCCESS=0

while IFS= read -r req; do
  RESP=$(curl -s -X POST -H "Content-Type: application/json" \
    --data "$req" \
    http://$host:8181/v1/data/$PACKAGE_PATH | jq -r '.result.allow')
  [[ "$RESP" == "true" ]] && ((SUCCESS++))
done < $TMP_REQS

end=$(date +%s%N)
duration=$(( (end - start)/1000000 ))
rps=$(echo "$REQ_COUNT / ($duration/1000)" | bc -l)

echo ""
echo "📊 Ergebnisse:"
echo "-----------------------------"
echo "Requests gesamt:  $REQ_COUNT"
echo "Erlaubt (true):   $SUCCESS"
echo "Verweigert:       $((REQ_COUNT - SUCCESS))"
echo "Gesamtdauer:      ${duration} ms"
echo "Durchschnitt:     $((duration / REQ_COUNT)) ms pro Request"
printf "Durchsatz:        %.2f req/s\n" "$rps"
echo "-----------------------------"
