# OPA mit NGinx (cors header)

### Starten mit docker compose up.

````bash
docker network create docker-default-network
docker compose -f opa-compose/docker-compose.yml up
````

### Testen mit curl localhost:8181 (von außerhalb VScode, falls VSCode im Devcontainer läuft):

````bash
curl localhost:8181                                                <pre>
 ________      ________    ________
|\   __  \    |\   __  \  |\   __  \
\ \  \|\  \   \ \  \|\  \ \ \  \|\  \
 \ \  \\\  \   \ \   ____\ \ \   __  \
  \ \  \\\  \   \ \  \___|  \ \  \ \  \
   \ \_______\   \ \__\      \ \__\ \__\
    \|_______|    \|__|       \|__|\|__|
</pre>
Open Policy Agent - An open source project to policy-enable your service.<br>
````

