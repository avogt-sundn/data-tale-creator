# Test-2

## Test-2 nutzt faker.js

```console
npm install @faker-js/faker --save-dev
```

Danach starten mit:
```console
./script.sh
```

Das Skript generiert immer einen bob_0 und einen dog_0. So können wir testen, ob die Regeln funktionieren.

```python
pet_is_adopted if data.pet_attributes[input.pet].adopted == true
```

sucht dann mit diesem input.json nach dog_0.

```python
{
    "user": "bob_0",
    "action": "read",
    "pet": "dog_0"
}
```