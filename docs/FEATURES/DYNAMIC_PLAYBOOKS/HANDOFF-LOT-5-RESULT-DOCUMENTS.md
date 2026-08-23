# HANDOFF — DYNAMIC PLAYBOOKS — LOT 5
## Résultat + Sauvegarde + Rapports

**Agent :** A2 — Result UX & Documents
**Date :** 23 août 2026

---

## 1. Statut

**DONE.**

Tous les livrables du Lot 5 sont intégrés, validés par tests unitaires, typecheck TypeScript, linter ESLint et compilés avec succès par le build Next.js.

Le parcours complet est opérationnel :
`Configuration de la situation` → `Génération via n8n (INTEL-020)` → `Suivi en vol (useRunTracker)` → `Affichage premium de résultat` → `Sauvegarde & récupération du document` → `Ouverture dans Rapports & Rédaction`.

---

## 2. Fichiers touchés (3)

| Fichier | Nature | Rôle |
|---|---|---|
| `playbooks/BattlePitchResult.tsx` | **Création** | Composant de rendu de résultat premium sur surface claire (Edito Bright) avec chargement asynchrone du document et actions associées. |
| `playbooks/BattleSituationView.tsx` | **Modification** | Raccordement du configurateur à la vue de résultat lors du statut de succès du run. |
| `playbooks/__tests__/battle-pitch-result.test.ts` | **Création** | Tests ciblés de non-régression (préservation du scénario, éligibilité du type de résultat, URL Rapports). |

---

## 3. Cycle du résultat

1. L'utilisateur configure les 4 dimensions obligatoires et les dimensions facultatives.
2. Le bouton « Générer le pitch » compile le `CommunicationBrief` et appelle `POST /api/n8n/trigger`.
3. L'état de chargement s'affiche pendant que `useRunTracker` suit l'exécution du workflow en temps réel (via WebSockets et polling de repli).
4. Dès le passage au statut `succeeded`, l'objet `generatedPitch` est renseigné avec `{ resultId, contentJson }` et le composant bascule immédiatement sur la vue `BattlePitchResult`.

---

## 4. Récupération idempotente du `documentId`

Pour ouvrir le pitch dans le module Rapports, l'application requiert un `document_id` issu de la table `intelligence_documents`. 
Le workflow n8n déclenche automatiquement la création de ce document via le callback serveur. Afin d'obtenir l'identifiant de ce document de manière robuste et sécurisée :
- Dès l'affichage de `BattlePitchResult`, un effet appelle la Server Action existante `saveResultAsDocument({ resultId })`.
- Cette action étant **strictement idempotente**, elle vérifie si le document existe déjà (cas nominal créé par le callback) et renvoie son `documentId` ; dans le cas contraire, elle le crée à la volée.
- Durant cette requête, le bouton « Ouvrir dans Rapports » affiche un état de chargement discret, puis devient pleinement cliquable dès la réception de l'identifiant.

---

## 5. Intégration Rapports

Le CTA principal « Ouvrir dans Rapports » redirige l'utilisateur vers la route standard :
```text
/reports?doc=<documentId>
```
Le module Rapports (`src/app/(app)/reports/page.tsx`) est pré-configuré pour intercepter le paramètre `doc` et charger instantanément le document en détail au centre de l'écran, tant sur Desktop que sur Mobile.

---

## 6. Tracabilité Knowledge

Le mécanisme de listes personnelles `preferredCollectionIds` et son picker inline livrés au L3 restent actifs et parfaitement propagés.
Les listes sélectionnées sont injectées dans le brief (`brief.context.preferredCollectionIds`), stockées dans le snapshot d'entrée, et transmises au prompt de génération LLM. La traçabilité de bout en bout est assurée.

---

## 7. Golden Case & Tests

Le fichier `battle-pitch-result.test.ts` assure le verrouillage de non-régression :
- `battle_situation_pitch` est conservé dans le registre de communication.
- `resultId` (type `commercial_pitch`) est correctement qualifié comme type de résultat éligible à la bibliothèque de documents de type `commercial_pitch`.
- Le format de l'URL de redirection Rapports utilise correctement le `documentId`.

---

## 8. UX Desktop & Mobile (Lot 6)

### Desktop
- Surface de lecture claire premium (`bg-white text-edito-ink rounded-xl border border-edito-border shadow-md`) contrastant élégamment avec le fond sombre du cockpit Battle.
- Espacement et hiérarchie éditoriale stricte (Edito Bright) respectant une largeur de lecture idéale.

### Mobile
- Composant adapté et isolé en JS via la prop `isMobile` (aucune information n'est simplement masquée en CSS).
- Trame de lecture continue empilée avec des séparateurs fins.
- CTAs d'action empilés verticalement à hauteur tactile de 44px (`min-h-11`).

---

## 9. Commit recommandé

```bash
feat(dynamic-playbooks): lot 5 battle pitch result
```
