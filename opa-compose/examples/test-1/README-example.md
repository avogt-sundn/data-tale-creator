# Beispiel 1

https://play.openpolicyagent.org/

- Beispiel "Attribute-based"

Die Regeln des package `app/abac`werden alle ausgewertet, indem das package in der url benannt wird:

`````bash
curl http://$host:8181/v1/data/app/abac -s --data-binary @v1-data-input.json -H 'Content-Type: application/json'|jq

# {
#   "result": {
#     "action_is_read": true,
#     "allow": true,
#     "pet_is_adopted": true,
#     "user_is_employee": true,
#     "user_is_senior": true
#   }
# }
`````

Eine einzelne Regel kann per URL Pfad auch ausgewertet werden:

`````bash
curl http://$host:8181/v1/data/app/abac/user_is_employee --data-binary @v1-data-input.json -H 'Content-Type: application/json'

# {
#   "result": true
# }
````