# Architektur

## Open policy agent OPA

Im Kern der AZK ist der Open Policy Agent (OPA). OPA ist ein Open-Source-Tool, das
Policy-Entscheidungen auf Basis von
Policy-Regeln in der Rego-Sprache. OPA kann als Server oder als
Docker-Container betrieben werden.


## XACML

Die Verteilungsarchitektur orientiert sich an XACML:

-  eXtensible Access Control Markup Language (XACML) ist ein XML-Schema, das die Darstellung und Verarbeitung von Autorisierungs-Policies standardisiert.

### Folgende Komponenten
# Architektur

## Open policy agent

Im Kern der AZK ist der Open Policy Agent (OPA). OPA ist ein Open-Source-Tool, das
Policy-Entscheidungen auf Basis von
Policy-Regeln in der Rego-Sprache. OPA kann als Server oder als
Docker-Container betrieben werden.

## XACML

Die Verteilungsarchitektur orientiert sich an XACML:

-  eXtensible Access Control Markup Language (XACML) ist ein XML-Schema, das die Darstellung und Verarbeitung von Autorisierungs-Policies standardisiert.

### Folgende Komponenten

XACML definiert einen Policy Decision Point (PDP), Policy Information Point (PIP) und Policy Enforcement Point (PEP):

- PDP: Bewertet Zugangsanfragen anhand von Policies und gibt eine Entscheidung zurück.
- PIP: Stellt Attributwerte für den PDP bereit (z. B. Benutzerrollen, Ressourcenmetadaten).
- PEP: Setzt die Entscheidung um, indem der Zugriff erlaubt oder verweigert wird.

## Synthese

Der PDP enthält eine OPA Instanz. OPA kann als Docker Container eingebunden werden.


