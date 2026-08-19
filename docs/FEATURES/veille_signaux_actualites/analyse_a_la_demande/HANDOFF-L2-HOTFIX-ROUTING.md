# HANDOFF — HOTFIX INTEL-021 : Correction du routage n8n V1 / V2 (Switch natif)

**Date** : 2026-08-19  
**Baseline** : `03467ee8099081ff09c743295ca6a0d03d513c93`  
**Statut** : Hotfix validé avec succès. Lot L4 non commencé.

---

## 1. Incident observé & Message runtime exact

Lors d'un run réel V2 (`triggerMode: "manual_custom"`) exécuté sur la plateforme n8n runtime **2.0.3**, le workflow `INTEL-021` a échoué brusquement au niveau du nœud `Route Schema Version` avec le message d'erreur suivant :

```text
Code doesn't return items properly

Please return an array of objects, one for each item you would like to output.
```

---

## 2. Cause racine & Ancien mécanisme invalide

Le nœud versionné `Route Schema Version` était un nœud Code JS (`n8n-nodes-base.code` version 2) configuré avec `"mode": "runOnceForAllItems"` et le code JavaScript :

```js
const item = $input.first().json;

if (item.schemaVersion === 2) {
  return [ [], [{ json: item }] ];
}

return [ [{ json: item }], [] ];
```

- **Incompatibilité runtime n8n 2.x** : Dans le runtime n8n 2.x, le retour d'un tableau d'outputs pour un Code node `runOnceForAllItems` exige une structure spécifique d'objets item par branche et rejette les matrices de tableaux vides/imbriqués sous ce format.
- **Faux positif du harnais de test L2** : Le test unitaire Node.js (`executeCodeNode`) exécutait le code via `AsyncFunction` en JavaScript pur, assimilant la matrice retournée `[ [], [{ json }] ]` à un retour valide sans simuler la validation stricte de structure d'items du runtime n8n.

---

## 3. Nouveau mécanisme : Switch natif n8n

Le nœud Code a été intégralement remplacé par un nœud Switch natif n8n (`n8n-nodes-base.switch` version 3).

### Définition JSON du nœud Switch (`Route Schema Version`)

```json
{
  "parameters": {
    "mode": "rules",
    "rules": {
      "values": [
        {
          "conditions": {
            "options": {
              "caseSensitive": true,
              "leftValue": "",
              "typeValidation": "strict"
            },
            "conditions": [
              {
                "leftValue": "={{ $json.schemaVersion }}",
                "rightValue": 1,
                "operator": {
                  "type": "number",
                  "operation": "equals"
                }
              }
            ],
            "combinator": "and"
          },
          "renameOutput": true,
          "outputKey": "V1"
        },
        {
          "conditions": {
            "options": {
              "caseSensitive": true,
              "leftValue": "",
              "typeValidation": "strict"
            },
            "conditions": [
              {
                "leftValue": "={{ $json.schemaVersion }}",
                "rightValue": 2,
                "operator": {
                  "type": "number",
                  "operation": "equals"
                }
              }
            ],
            "combinator": "and"
          },
          "renameOutput": true,
          "outputKey": "V2"
        }
      ]
    }
  },
  "id": "route-schema-version",
  "name": "Route Schema Version",
  "type": "n8n-nodes-base.switch",
  "typeVersion": 3,
  "position": [730, 280]
}
```

---

## 4. Connexions du workflow

```text
Webhook — Monthly Watch
           │
     Verify Signature
           │
     Validate Input
           │
Route Schema Version [Switch]
      ├── Sortie 0 (V1 : schemaVersion === 1) ──> Mark Run Running (V1)
      └── Sortie 1 (V2 : schemaVersion === 2) ──> Mark Run Running V2
```

- **Routage V1 (sortie 0)** : `Route Schema Version` (main[0]) → `Mark Run Running`.
- **Routage V2 (sortie 1)** : `Route Schema Version` (main[1]) → `Mark Run Running V2`.
- **Branches fonctionnelles V1 & V2** : Intactes et inchangées.
- **Chemin d'échec (`Prepare Failure Callback`)** : Connexions d'erreur (`onError: "continueErrorOutput"`) de l'ensemble des nœuds amont/aval préservées sans altération.

---

## 5. Correction du harnais de test

Dans [`n8n/workflows/__tests__/intel-021-monthly-watch-analysis.test.js`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/n8n/workflows/__tests__/intel-021-monthly-watch-analysis.test.js) :
1. **Suppression du test faux-positif** qui exécutait `executeCodeNode('Route Schema Version', ...)`.
2. **Ajout d'une suite de validations statiques** sur le JSON du workflow :
   - Présence du nœud `Route Schema Version` avec `type = "n8n-nodes-base.switch"` (typeVersion 3).
   - Confirmation que ce n'est plus un Code node JS.
   - Présence de deux règles explicites pour `schemaVersion === 1` et `schemaVersion === 2`.
   - Connexion formelle de la sortie 0 à `Mark Run Running` (V1) et de la sortie 1 à `Mark Run Running V2` (V2).

---

## 6. Validation & Résultats des tests

| Commande de validation | Résultat | Détails |
|---|---|---|
| `node n8n/workflows/__tests__/intel-021-monthly-watch-analysis.test.js` | ✅ VERTE | 20 assertions validées avec succès |
| `npm run test:n8n` | ✅ VERTE | 114 harnais d'intégration n8n validés, 0 échec |
| `npm test` | ✅ VERTE | 162 fichiers de test, 1618 tests unitaires/intégration verts |
| `npm run typecheck` | ✅ VERTE | 0 erreur TypeScript (`tsc --noEmit`) |
| `npm run check:server-boundary` | ✅ VERTE | Frontière serveur/client respectée (`server-only`) |
| `npm run build` | ✅ VERTE | Compilation Next.js Turbopack de production réussie (Exit code 0) |

---

## 7. Périmètre des fichiers modifiés

1. [`n8n/workflows/intel-021-monthly-watch-analysis.json`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/n8n/workflows/intel-021-monthly-watch-analysis.json)  
   *Remplacement du nœud Code par le nœud Switch natif `n8n-nodes-base.switch`.*
2. [`n8n/workflows/__tests__/intel-021-monthly-watch-analysis.test.js`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/n8n/workflows/__tests__/intel-021-monthly-watch-analysis.test.js)  
   *Remplacement de l'exécution runtime du Code node par la vérification statique du Switch et des connexions V1/V2.*
3. [`docs/FEATURES/veille_signaux_actualites/analyse_a_la_demande/HANDOFF-L2-HOTFIX-ROUTING.md`](file:///Users/dosta/Desktop/Projets-Dev/KREDO/kredo/docs/FEATURES/veille_signaux_actualites/analyse_a_la_demande/HANDOFF-L2-HOTFIX-ROUTING.md)  
   *Ce document de handoff d'incident.*

---

## 8. Instructions d'action manuelle pour n8n (Guillaume)

Le workflow reste versionné dans le repository avec `"active": false`. Aucun déploiement ni modification sur l'instance VPS n8n n'a été effectué par l'agent.

Pour appliquer la correction sur n8n :

1. **Réimporter / Remplacer** le workflow `INTEL-021` dans l'interface n8n avec le fichier JSON corrigé (`n8n/workflows/intel-021-monthly-watch-analysis.json`).
2. **Vérifier / Réaffecter** les credentials (`supabaseApi`, `anthropicApi`) si n8n demande une réassignation lors de la mise à jour.
3. **Sauvegarder** le workflow.
4. **Activer** le workflow si la version précédente était active.
5. **Rejouer** le run V2 qui avait échoué à l'étape `Route Schema Version`.
