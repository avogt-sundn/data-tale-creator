# Aufgabenstellung

## attributbasierte-zugriffskontrolle


## Entwurf

### Definitionen

1. Benutzer eines Systems werden hier Subjekt genannt.
1. Ressourcen, auf die Zugriff genommen wird durch ein Subjekt, werden Objekt genannt.
1. Die AZK soll den Zugriff eines Subjekts auf ein Objekt entscheiden.
1. Dazu greift sie auf Attribute sowohl des Subjekt als auch des Objekts zu.
1. Ein Attribut hat einen eindeutigen Schlüssel und wird in einem Katalog definiert.
1. Ein Attribut hat einen Wert, wenn es am Subjekt oder Objekt deklariert wird.
1. Ein Attributwert kann ein Einzelwert oder eine Wertemenge sein.
1. Der erhaltene Zugriff wird in Form von Policies unterschieden.
1. Die Entscheidung wird entlang gegebener Policy-Regeln getroffen.
1. Die das Subjekt beschreibenden und vom Subjekt besetzten Attribute können mittels Vererbung von Attributcontainern über beliebig viele Stufen geerbt werden.
1. Subjekte können in Subjektcontainer zusammengefasst werden mit dem Ziel, sie mit denselben Attributen auszustatten.
1. Objekte können in Objektcontainern zusammengefasst werden mit dem Ziel, sie mit denselben Attributen auszustatten.

### Wahrheiten

1. Policy-Regeln bewerten Attribute direkt am Subjekt oder Objekt genauso wie die von Containern geerbten Attribute.
2. Policy-Regeln können hinzugefügt und geändert und gelöscht werden.

### Ziele

1. Die Menge der Objekte, auf die ein Subjekt Zugriff gemäß einer Policy hat, ändert sich.
1. Änderungen entstehen durch Änderungen in Attributen oder Containern.
1. Änderungen entstehen durch Änderungen in den Policy-Regeln.
1. Die AZK trifft Aussagen über die resultierenden Liste von Subjekt-Policy-Objekt Relationen.

