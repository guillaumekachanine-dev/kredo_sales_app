# KREDO — Dynamic Playbooks
## Roadmap d'implémentation multi-agents — Battle Cards interactives

**Version :** 1.0  
**Date :** 23 août 2026  
**Statut :** roadmap d'exécution  
**Référence fonctionnelle :** `00-NOTE-CADRAGE-BATTLE-CARDS-INTERACTIVES.md`  
**Baseline initiale :** `2464e0c9f927db8817dacd938d08b14450347589`

---

# 1. Objectif de cette roadmap

Permettre à plusieurs agents IA d'intervenir sur le chantier sans :

- dupliquer l'architecture ;
- modifier les mêmes fichiers en parallèle ;
- créer un nouveau workflow n8n inutile ;
- réintroduire une seconde source de vérité Business Intelligence ;
- casser INTEL-020 ;
- multiplier les migrations ou abstractions non nécessaires.

La stratégie est volontairement séquentielle sur les zones à fort couplage et parallèle uniquement lorsque les périmètres de fichiers sont réellement disjoints.

---

# 2. Principe d'organisation des agents

## 2.1 Rôles

Les noms ci-dessous désignent des **rôles**, pas des fournisseurs obligatoires.

| Rôle | Mission | Profil recommandé |
|---|---|---|
| **A0 — Lead / Orchestrateur** | Maintient le cadrage, séquence les lots, arbitre les écarts, vérifie les handoffs | agent de raisonnement fort avec bonne lecture repo |
| **A1 — Frontend Workspace** | Shell, retournement, navigation Battle, Révision Desktop | agent code ancré repo / React |
| **A2 — Situation & contrats** | Modèle de situation, résolveurs d'options, wiring compte/Playbook/offres | agent TypeScript/data |
| **A3 — INTEL-020 / n8n** | Nouveau scénario, contrat brief, prompt, tests workflow | agent expérimenté n8n + contrats |
| **A4 — Mobile** | Variantes Mobile dédiées, UX tactile, bottom sheets/pickers | agent frontend mobile |
| **A5 — Reviewer / QA indépendant** | Revue de non-régression, tests, build, E2E, cohérence docs | agent différent des auteurs |

Un même outil IA peut tenir plusieurs rôles à des moments différents. Ce qui est obligatoire est la **séparation des responsabilités et des revues**, pas le nombre de fournisseurs.

## 2.2 Règle d'ownership

À tout instant :

> **un seul agent écrivain par zone de fichiers.**

Un autre agent peut auditer ou commenter en read-only, mais ne doit pas modifier les mêmes fichiers tant que le lot n'est pas handoffé.

---

# 3. Préflight obligatoire avant chaque lot

Chaque agent commence par :

1. lire `AGENTS.md` ;
2. lire les sections pertinentes de `CLAUDE.md` ;
3. lire `00-NOTE-CADRAGE-BATTLE-CARDS-INTERACTIVES.md` ;
4. lire ce document ;
5. lire le handoff du lot précédent ;
6. vérifier le HEAD réel ;
7. inspecter le diff depuis la baseline/handoff ;
8. vérifier que les fichiers autorisés n'ont pas été modifiés par un autre agent depuis le handoff.

Si le HEAD a avancé : l'agent **rebase mentalement son plan sur le code actuel** avant d'écrire. Il ne doit jamais appliquer mécaniquement un ancien patch.

---

# 4. Contrat de handoff commun

Chaque lot se termine par un handoff contenant exactement :

```md
# HANDOFF — DYNAMIC PLAYBOOKS — LOT X

## 1. Statut
DONE / PARTIAL / BLOCKED

## 2. Objectif du lot
...

## 3. Fichiers modifiés
- ...

## 4. Décisions prises
- ...

## 5. Écarts au cadrage
- Aucun
ou
- ... + justification

## 6. Data / Supabase
- lecture effectuée
- migration : oui/non
- si oui : justification et nom

## 7. n8n
- modifié : oui/non
- workflow : intel-020-communication uniquement
- import VPS requis : oui/non

## 8. Tests exécutés
- commande → résultat

## 9. QA manuelle
- ...

## 10. Warnings / dette
- ...

## 11. Commit
SHA ou « aucun commit »

## 12. Instructions pour l'agent suivant
- ...
```

Les handoffs sont stockés dans ce dossier avec le format :

`HANDOFF-LOT-X-<slug>.md`

---

# 5. Vue globale des lots

| Lot | Objet | Owner principal | Dépendance | Effort |
|---|---|---|---|---|
| **L0** | Audit de raccordement + contrat final | A0 | aucune | XS |
| **L1** | Shell Battle + retournement Playbook/Battle | A1 | L0 | S |
| **L2** | Refonte Révision | A1 | L1 | S |
| **L3** | Configurateur Situation + résolveurs | A2 | L1, contrat L0 | M |
| **L4** | Raccord INTEL-020 + n8n | A3 | L3 contrat figé | S/M |
| **L5** | Résultat + Knowledge + Rapports | A2/A1 | L4 | S |
| **L6** | Mobile adaptatif | A4 | L3-L5 stables | M |
| **L7** | Revue indépendante + E2E + clôture | A5 | tous | S/M |

---

# 6. LOT 0 — Audit de raccordement et gel du contrat

## Owner

**A0 — Lead / Orchestrateur**

## Nature

Read-only. Aucun code métier.

## Objectif

Confirmer dans le code actuel que le cadrage peut être implémenté sans :

- nouvelle table ;
- nouveau workflow ;
- nouvelle route serveur majeure ;
- duplication de `CommunicationBriefForm` ;
- nouvelle source de vérité BI.

## Fichiers à inspecter au minimum

```text
src/features/business-intelligence/playbooks/SectorPlaybooksModal.tsx
src/features/business-intelligence/playbooks/BattleCardsSection.tsx
src/features/competitive-map/data/competitive-map-workspace-types.ts
src/components/intelligence/IntelligenceSplitModalShell.tsx
src/components/communication/CommunicationComposerHost.tsx
src/components/accounts-contacts/intelligence/CommunicationBriefForm.tsx
src/components/accounts-contacts/intelligence/IntelligenceActionDrawers.tsx
src/lib/communication/communication-purpose.ts
src/lib/communication/communication-scenario-registry.ts
src/lib/communication/communication-options-resolver.ts
src/lib/communication/communication-context-loader.ts
src/lib/communication/communication-result-documents.ts
src/components/accounts-contacts/intelligence/save-as-document.ts
src/lib/n8n/types.ts
src/app/api/n8n/callback/route.ts
n8n/workflows/intel-020-communication.json
n8n/workflows/intel-020-communication.SETUP.md
```

## Supabase — read-only

Confirmer :

- schéma de `competitive_map_entries` ;
- `ai_intelligence_runs/results` ;
- `intelligence_documents` ;
- `content_collections` ;
- RPC `get_communication_context` ;
- RPC `get_pitch_context`.

## Livrable

`HANDOFF-LOT-0-AUDIT-CONTRAT.md`

Il doit fixer :

- le shape exact de `battleSituation` ;
- le scénario `battle_situation_pitch` ;
- la manière d'ouvrir INTEL-020 depuis Battle ;
- la manière d'injecter les listes Knowledge ;
- la manière d'identifier le document généré.

## Gate de sortie

L1-L3 ne démarrent pas tant que ces points ne sont pas figés.

---

# 7. LOT 1 — Shell Battle Cards et retournement

## Owner

**A1 — Frontend Workspace**

## Objectif

Faire de Battle Cards un mode à part entière du Playbook.

## Comportement

```text
Playbook
   ↓ Battle Cards
flip 0 → 90°
swap contenu
flip 90 → 0°
   ↓
Battle Workspace
```

Retour identique avec `Revenir au Playbook`.

## Fichiers autorisés

Principalement :

```text
src/features/business-intelligence/playbooks/SectorPlaybooksModal.tsx
src/features/business-intelligence/playbooks/*Battle*.tsx
```

Le shell partagé ne doit être modifié que si un besoin générique est démontré :

```text
src/components/intelligence/IntelligenceSplitModalShell.tsx
```

## Interdits du lot

- aucune donnée nouvelle ;
- aucun INTEL-020 ;
- aucun n8n ;
- aucune migration ;
- pas de refonte des autres sections Playbook.

## Critères d'acceptation

- Battle Cards n'apparaît plus comme simple section standard ;
- le retournement fonctionne dans les deux sens ;
- aucune dépendance animation ajoutée ;
- `prefers-reduced-motion` supporté ;
- Escape/focus trap restent fonctionnels ;
- le segment et le compte sélectionné ne sont pas modifiés par le flip.

## Tests minimum

- tests de rendu/état du mode si pattern existant ;
- typecheck ciblé puis global ;
- lint ciblé.

## Handoff

`HANDOFF-LOT-1-SHELL-FLIP.md`

---

# 8. LOT 2 — Refonte du mode Révision

## Owner

**A1 — Frontend Workspace**

Conserver le même owner que L1 afin d'éviter deux agents successifs sur les mêmes composants avant stabilisation du shell.

## Objectif

Transformer l'actuel `BattleCardsSection` en vue de révision immédiatement exploitable.

## Data

Strictement les données déjà disponibles dans `CompetitiveMapActor`.

Aucun fetch supplémentaire.

## UI cible Desktop

Rail gauche comptes + contenu principal :

- Pourquoi maintenant ;
- Angle d'entrée ;
- À qui parler ;
- Objections / lignes rouges ;
- Chantiers ;
- Forces / vulnérabilités ;
- À qualifier.

## Règles

- bullets ;
- surfaces ouvertes ;
- iconographie distinctive ;
- aucune invention ;
- empty states ;
- conserver provenance/confiance disponible ;
- pas de nouvelle palette ;
- respecter les tokens du design system réel du repo.

## Fichiers autorisés

```text
src/features/business-intelligence/playbooks/BattleCardsSection.tsx
src/features/business-intelligence/playbooks/BattleRevision*.tsx
src/features/business-intelligence/playbooks/BattleAccount*.tsx
```

## Interdits

- `src/lib/n8n/**` ;
- `n8n/workflows/**` ;
- Supabase writes ;
- catalogue offres ;
- CommunicationBrief.

## Gate de sortie

Révision Desktop stable avant de fusionner l'expérience Situation dans le même workspace.

## Handoff

`HANDOFF-LOT-2-REVISION.md`

---

# 9. LOT 3 — Configurateur Situation

## Owner

**A2 — Situation & contrats**

## Objectif

Construire le configurateur métier sans déclencher encore le LLM.

## 9.1 Contrat Situation

Le shape exact doit venir du Lot 0.

Cible minimale :

```ts
type BattleSituation = {
  competitiveEntryId?: string
  personaOrContact: ...
  issue: ...
  angle: ...
  timing?: ...
  objection?: ...
  offerRef: string
  roiArgument?: ...
  preferredCollectionIds?: string[]
}
```

Le contrat final doit éviter de recopier les champs déjà canoniques du `CommunicationBrief`.

## 9.2 Résolution des options

Créer des fonctions pures qui construisent les options à partir de :

- `CompetitiveMapActor` ;
- `SectorKnowledgeReadModel` ;
- parsers Playbook existants ;
- contacts du compte ;
- offres existantes.

Préférence : **fonctions déterministes testables**, séparées du JSX.

## 9.3 Provenance des enjeux

Chaque enjeu doit exposer :

```text
source = account | sector
```

L'UI doit afficher cette provenance.

## 9.4 Chargement

Le contexte spécifique doit être chargé pour le **compte actif uniquement**.

Interdit : précharger contacts/offres/contexte INTEL-020 pour tous les comptes du segment.

## 9.5 UI Desktop

Six blocs :

- Persona ;
- Enjeu ;
- Angle ;
- Timing ;
- Objection ;
- Offre & ROI.

Obligatoires :

- Persona/contact ;
- Enjeu ;
- Angle ;
- Offre.

Facultatifs :

- Timing ;
- Objection ;
- ROI ;
- Knowledge.

CTA encore inactif ou branché sur un mock d'événement local : `Générer le pitch`.

## 9.6 Knowledge

Réutiliser les primitives existantes :

- `content_collections` ;
- sélection de listes ;
- `ManageCollectionsDesktop` si besoin complet.

Ne pas créer un nouveau sélecteur de sources général.

## Fichiers probables

```text
src/features/business-intelligence/playbooks/BattleSituation*.tsx
src/features/business-intelligence/playbooks/battle-situation-*.ts
src/features/business-intelligence/playbooks/SectorPlaybooksModal.tsx
```

Les utilitaires communication existants peuvent être importés, pas modifiés sauf nécessité documentée.

## Tests

Tests unitaires des résolveurs :

- profil riche ;
- profil partiel ;
- aucun timing ;
- aucune objection ;
- enjeu compte + secteur ;
- offre requise ;
- changement de compte reset/normalise correctement la situation.

## Handoff

`HANDOFF-LOT-3-SITUATION.md`

---

# 10. LOT 4 — Raccord INTEL-020 + n8n

## Owner

**A3 — INTEL-020 / n8n**

## Reviewer obligatoire

**A5** ou un agent indépendant.

## Prérequis

Le shape de Situation et les besoins du frontend sont figés par L3.

## Objectif

Brancher `Générer le pitch` sur le pipeline existant, sans créer de workflow parallèle.

## 10.1 TypeScript

Étendre proprement :

```text
src/lib/n8n/types.ts
src/lib/communication/communication-scenario-registry.ts
```

Ajouter :

`battle_situation_pitch`

Puis mettre à jour les mappings exhaustifs réellement impactés :

- options resolver ;
- purpose/output kind ;
- labels/titres documents si nécessaire ;
- tests E2E matrice communication.

## 10.2 Workflow n8n

Modifier uniquement :

`n8n/workflows/intel-020-communication.json`

Ajouter le traitement du nouveau scénario dans les nœuds existants :

- validation ;
- `Assemble Prompt` ;
- éventuellement QA si un check spécifique apporte une vraie valeur.

Ne pas changer la plomberie :

- webhook ;
- HMAC ;
- callback ;
- run lifecycle ;
- result routing global.

## 10.3 Mission du prompt

Le prompt doit donner priorité aux choix explicites :

1. persona/contact ;
2. enjeu ;
3. angle ;
4. timing ;
5. objection ;
6. offre/ROI ;
7. contexte Knowledge.

Le reste du contexte sert à grounder et enrichir, pas à annuler les choix utilisateur.

## 10.4 Sortie

Cible :

`result_type = commercial_pitch`

Pas de nouveau document type.

## 10.5 Validation workflow

Conformément à `AGENTS.md` :

- extraire chaque nœud Code modifié ;
- `node --check` ;
- exécuter les nœuds sur mocks ;
- tester au moins : payload nominal, champ facultatif absent, offre absente, output valide, output invalide, non-régression scénario existant.

## 10.6 VPS

L'agent **ne déploie pas** sur le VPS n8n.

Il met à jour :

`n8n/workflows/intel-020-communication.SETUP.md`

avec les étapes d'import manuel nécessaires.

## Handoff

`HANDOFF-LOT-4-INTEL020.md`

Le handoff doit explicitement dire :

- fichier workflow à réimporter ;
- aucune nouvelle variable d'environnement OU liste des nouvelles variables si découverte indispensable ;
- tests de non-régression exécutés ;
- statut « prêt pour import manuel ».

---

# 11. LOT 5 — Restitution, Knowledge et Rapports

## Owner

**A2** pour le contrat / wiring, **A1** possible pour finition purement visuelle après handoff.

Pas de travail parallèle sur le même composant.

## Objectif

Afficher le pitch dans le Battle Workspace et confirmer sa persistance documentaire.

## Résultat UI

Surface claire superposée à la zone principale, conservant :

- compte actif ;
- retour Playbook ;
- retour « Modifier la situation ».

Actions :

- Copier ;
- Régénérer ;
- Modifier la situation ;
- Ouvrir dans Rapports.

## Persistance

Réutiliser exclusivement :

```text
src/app/api/n8n/callback/route.ts
src/components/accounts-contacts/intelligence/save-as-document.ts
src/lib/communication/communication-result-documents.ts
```

Le lot doit d'abord **tester l'existant**.

Modification de ces fichiers uniquement si le nouveau scénario n'est pas automatiquement couvert par le mapping `commercial_pitch` existant.

## Knowledge

Vérifier E2E qu'une ou plusieurs `preferredCollectionIds` sélectionnées dans Situation se retrouvent réellement dans le contexte envoyé à la génération.

Si ce chemin existe déjà : le réutiliser.

Si un petit adaptateur est requis : l'ajouter au niveau le plus bas possible, sans créer un nouveau modèle.

## Critères d'acceptation

- run `succeeded` ;
- résultat visible sans refresh manuel ;
- `ai_intelligence_results` présent ;
- document créé ;
- titre lisible ;
- lien au compte correct ;
- bouton Rapports ouvre/dirige vers le document correct ;
- régénération crée un nouveau résultat selon le comportement canonique existant.

## Handoff

`HANDOFF-LOT-5-RESULTAT-RAPPORTS.md`

---

# 12. LOT 6 — Mobile adaptatif

## Owner

**A4 — Mobile**

## Prérequis

Les contrats de L3-L5 sont stables.

## Objectif

Créer une expérience Mobile d'action, pas une réduction CSS du Desktop.

## Structure cible

```text
← Playbook       Battle Cards

[ Compte actif                 ▾ ]

[ Révision ] [ Situation ]

contenu mobile

[ Générer le pitch ]
```

## Révision Mobile

- sections progressives ;
- bullets ;
- aucune matrice/rail Desktop ;
- touch targets ≥ 44px.

## Situation Mobile

- blocs tactiles ;
- pickers via drawers/bottom sheets si nécessaire ;
- CTA principal facilement accessible ;
- paramètres facultatifs dans un niveau secondaire si la densité devient excessive.

## Résultat Mobile

- surface claire quasi plein écran ;
- copier ;
- modifier ;
- régénérer ;
- ouvrir Rapports.

## Fichiers

Créer de vraies variantes Mobile lorsque nécessaire.

Interdit :

`hidden md:block` pour charger une grosse vue Desktop et la cacher.

## QA minimale

- largeur 375/390px ;
- safe areas ;
- clavier virtuel ;
- scroll ;
- retour modale ;
- ouverture/fermeture Knowledge ;
- génération et restitution.

## Handoff

`HANDOFF-LOT-6-MOBILE.md`

---

# 13. LOT 7 — Revue indépendante, E2E et clôture

## Owner

**A5 — Reviewer / QA indépendant**

A5 ne doit pas être l'auteur principal de L4.

## 13.1 Revue architecture

Vérifier :

- aucun nouveau workflow ;
- aucune table Battle Cards ;
- aucune seconde source de segment ;
- aucun chargement portefeuille-wide ;
- pas de duplicated composer ;
- pas de nouvelle dépendance animation ;
- pas de secrets client ;
- pas de data sectorielle présentée comme spécifique compte sans badge.

## 13.2 Revue INTEL-020

Tester un scénario historique au minimum pour chaque famille impactée :

- message écrit ;
- pitch oral historique ;
- nouveau `battle_situation_pitch`.

## 13.3 E2E comptes

Tester au minimum :

### Cas A — Battle Card riche

- profil complet ;
- contact disponible ;
- plusieurs enjeux/angles ;
- offre ;
- timing ;
- objection ;
- liste Knowledge.

### Cas B — Battle Card partielle

- `profile_json` incomplet ;
- certaines sections absentes ;
- génération possible si minimum obligatoire disponible ;
- aucun contenu inventé.

### Cas C — absence de Battle Card exploitable

- état vide ;
- pas de fallback vers un autre compte ;
- pas de génération fantôme.

## 13.4 Commandes finales

Ordre canonique :

```bash
npm run typecheck
npm test
npm run check:server-boundary
npm run lint
npm run build
```

Puis :

```bash
git diff --check
npm run n8n:status
```

`npm run n8n:status` est informatif : l'import VPS reste manuel.

## 13.5 Livrable final

`HANDOFF-FINAL-DYNAMIC-PLAYBOOKS.md`

Il doit contenir :

- architecture finale ;
- fichiers ;
- contrats ;
- migrations : normalement aucune ;
- n8n : fichier à importer / version ;
- tests ;
- SHA ;
- checklist d'import VPS ;
- checklist QA production.

---

# 14. Séquencement conseillé des agents

## Phase 1 — Série obligatoire

```text
A0 / L0
   ↓
A1 / L1
   ↓
A1 / L2
```

L2 peut être mergé avant Situation. Cela donne une amélioration autonome et testable du Playbook.

## Phase 2 — Contrats et moteur

```text
A2 / L3
   ↓ contrat figé
A3 / L4
   ↓
review A5 sur L4
```

## Phase 3 — Restitution + Mobile

```text
A2/A1 / L5
       ↓
A4 / L6
```

## Phase 4 — Clôture

```text
A5 / L7
```

---

# 15. Parallélisation autorisée

La parallélisation est limitée.

## Peut être fait en parallèle

Après L3 figé :

- A3 peut travailler sur INTEL-020 ;
- A4 peut réaliser une **maquette/read-only exploration** Mobile à partir du contrat, sans modifier les composants partagés.

A5 peut préparer les matrices de tests en parallèle de n'importe quel lot.

## Ne doit pas être fait en parallèle

- L1 et L2 sur `SectorPlaybooksModal` / Battle components ;
- L3 et L5 sur le même `BattleSituationView` ;
- deux agents sur `src/lib/n8n/types.ts` ;
- deux agents sur `communication-scenario-registry.ts` ;
- deux agents sur `intel-020-communication.json` ;
- UI et refactor global du Playbook simultanément.

---

# 16. Politique de commits recommandée

Un commit cohérent par lot ou sous-lot validé.

Exemples :

```text
feat(dynamic-playbooks): add battle workspace flip shell
feat(dynamic-playbooks): redesign battle revision view
feat(dynamic-playbooks): add situation configurator
feat(intel-020): support battle situation pitch
feat(dynamic-playbooks): integrate generated pitch result
feat(dynamic-playbooks): add mobile battle experience
test(dynamic-playbooks): complete e2e coverage
```

Éviter les commits mélangeant :

- UI Battle ;
- migration non liée ;
- nettoyage historique ;
- modifications d'autres modules BI.

---

# 17. Critères de stop d'un agent

Un agent doit **s'arrêter et handoffer** plutôt que décider seul si :

1. une nouvelle table semble nécessaire ;
2. un nouveau workflow n8n semble nécessaire ;
3. le contrat actuel INTEL-020 semble impossible à étendre ;
4. une modification du shell générique risque d'impacter d'autres modales ;
5. le design system actuel est contradictoire avec une ancienne doc ;
6. une donnée attendue n'existe pas dans les sources ;
7. un agent précédent a modifié le même fichier depuis le handoff ;
8. un test historique INTEL-020 casse et la correction exige de changer son comportement canonique.

Ces cas nécessitent arbitrage A0/humain avant reprise.

---

# 18. Checklist de clôture du chantier

- [ ] Note de cadrage respectée
- [ ] Tous les handoffs présents
- [ ] Battle mode distinct du Playbook standard
- [ ] Flip aller/retour
- [ ] Révision redesignée
- [ ] Situation fonctionnelle
- [ ] Provenance compte/secteur visible
- [ ] 4 paramètres minimum suffisants
- [ ] Knowledge branché
- [ ] `battle_situation_pitch` branché
- [ ] `intel-020-communication` unique
- [ ] Aucun nouveau workflow
- [ ] Aucune table Battle Card
- [ ] Aucune migration non justifiée
- [ ] Résultat Realtime
- [ ] Auto-documentation Rapports
- [ ] Desktop validé
- [ ] Mobile validé
- [ ] Reduced motion validé
- [ ] Tests INTEL-020 historiques verts
- [ ] Typecheck vert
- [ ] Vitest vert
- [ ] Server boundary vert
- [ ] Lint vert
- [ ] Build vert
- [ ] `git diff --check` vert
- [ ] Workflow n8n prêt à import manuel
- [ ] Handoff final écrit

---

# 19. Definition of Done

Le chantier est terminé lorsqu'un commercial peut :

1. ouvrir le Playbook d'un segment ;
2. basculer vers Battle Cards ;
3. choisir un compte ;
4. réviser sa fiche ;
5. passer en Situation ;
6. choisir un interlocuteur, un enjeu, un angle et une offre ;
7. ajouter facultativement timing, objection et Knowledge ;
8. générer un pitch via INTEL-020 ;
9. consulter/copier le résultat ;
10. retrouver le livrable dans Rapports & rédaction ;
11. revenir au Playbook par le flip inverse ;

sans qu'aucune nouvelle source de vérité, table Battle Card ou workflow IA parallèle n'ait été introduit.
