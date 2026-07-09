# ADR-0013 — Catalogue de scénarios de communication : mail, pitch et prise de parole

**Statut :** Proposé
**Date :** 2026-07-10
**Décideurs :** Guillaume (Owner)
**Liés :** [0008](ADR-0008-client-intelligence-hub.md) (surface hub par compte), [0009](ADR-0009-generate-pitch.md) (génération de pitch initiale). **Supersede partiellement ADR-0009 §6** (règle « un pitch = une offre catalogue obligatoire »).

> Ce document rebat les cartes de deux fonctionnalités déjà en production — la **rédaction assistée de mail** (INTEL-020, Session 15) et la **génération de pitch** (ADR-0009, Session 20) — en actant leur **découplage conceptuel**, en **structurant leur catalogue de scénarios** (21 existants → ~69 après extension), et en **cartographiant les 30+ surfaces d'app** où ces deux fonctionnalités doivent être disponibles. Il s'appuie sur un audit live du code (2026-07-10) qui corrige plusieurs affirmations d'une note de défrichage ChatGPT.

---

## 1. Contexte

### 1.1 Ce qui existe et fonctionne

Deux flux tournent en production, tous deux servis par le **même workflow n8n** `intel-020-communication` (16 nœuds, HMAC, Realtime, callback signé), avec **auto-sauvegarde en bibliothèque documentaire** :

- **Rédaction assistée de mail** — sortie `CommunicationOutput` (subjects/body/key_points), 18 scénarios écrits (email/LinkedIn/note interne).
- **Génération de pitch** — sortie `PitchOutput` discriminée (`SpokenPitchOutput` script minuté 30s, `MeetingBriefingOutput` fiche RDV), 3 scénarios oraux (`cold_call_pitch`, `meeting_prep_discovery`, `meeting_prep_cross_sell`), **obligatoirement ancré sur une offre catalogue** (ADR-0009 §6).

Le composer est **globalement monté** dans l'app (`AppOverlayHosts` → `CommunicationComposerHost`), déclenchable par événement custom (`openCommunicationComposer`) depuis n'importe quel bouton. 31 call-sites `openCommunicationComposer` + 38 `ContextualCommunicationButton` recensés.

### 1.2 Ce qui ne marche pas et pourquoi

Trois défauts structurels bloquent l'extension du périmètre fonctionnel voulue :

**Défaut 1 — Le composer refuse tout usage sans compte.** [`CommunicationComposerHost.tsx:427-435`](../../src/components/communication/CommunicationComposerHost.tsx:427) et [`:505-508`](../../src/components/communication/CommunicationComposerHost.tsx:505) forcent la résolution d'un `companyId` avant tout, sinon on affiche « La rédaction assistée nécessite un compte CRM existant. » C'est un bloqueur direct des nouveaux usages voulus par le métier : **business review devant le manager, brief avant un recadrage de collaborateur, pitch d'annonce d'un départ imprévu, argumentaire d'arbitrage interne** — aucun de ces cas n'a de compte pivot.

**Défaut 2 — La distinction mail / pitch est déduite du canal.** [`communication-brief-options.ts:31-35`](../../src/components/accounts-contacts/intelligence/communication-brief-options.ts:31) définit `PITCH_CHANNELS = ["spoken_pitch_30s", "meeting_briefing"]` et [`CommunicationBriefForm:101`](../../src/components/accounts-contacts/intelligence/CommunicationBriefForm.tsx:101) déduit le rendu de résultat + l'obligation d'offre par `isPitchChannel(channel)`. C'est une confusion de modèle : **le canal (email/LinkedIn/note/oral)** et le **type de livrable (message écrit / script oral / briefing structuré)** sont deux dimensions orthogonales, pas la même. Combinaisons absurdes possibles aujourd'hui : `scenario = meeting_prep_discovery` + `channel = internal_note`.

**Défaut 3 — L'offre catalogue est obligatoire quel que soit le pitch.** [`OfferPicker.tsx:8-14`](../../src/components/accounts-contacts/intelligence/OfferPicker.tsx:8) porte la règle en dur : « ADR-0009 no-go : un pitch ne peut jamais s'ancrer hors catalogue ». C'était vrai pour **pitch commercial d'offre**, c'est faux pour **pitch de crise client, préparation RDV découverte, business review manager, pitch sortie d'intercontrat** — aucun de ces cas ne parle d'une offre du catalogue Kredo.

### 1.3 Ce qui manque à l'échelle de l'app

Cartographie de surface (voir §7) : le composer est **absent de modules P0 entiers** :
- **Recrutement** (0 call-site) — alors que 12 scénarios candidat sont pertinents.
- **Consultants** (0 call-site) — alors que c'est là que se joue « préparer un 1:1 », « annoncer une démission », « pitch sortie d'intercontrat ».
- **Agenda** (0 call-site) — porte d'entrée naturelle pour « je prépare mon RDV de demain » et « brief avant point sensible ».
- **Missions actives — onglets Suivi et Risque** (0 call-site) — c'est là que se déclenche la comm de crise et les briefings COPIL.

Le pitch en particulier n'est branché que sur **4 surfaces sur ~30** (cockpit intelligence + reports + prospection accounts + playbook sectoriel).

### 1.4 Ce que dit le catalogue actuel

`SCENARIO_OPTIONS` compte **21 entrées** aplaties, avec un champ `family: sales | recruitment | delivery | internal` **non exposé dans l'UI** — l'utilisateur voit une liste à plat de 21 scénarios dans un `<select>`. C'est déjà limite. Avec les ~48 scénarios que le métier veut ajouter (§8), on passe à **~69 scénarios** : ingérable en `<select>` à plat.

---

## 2. Décision

Refonte en **6 lots séquencés** actant :

- **D-1** — Séparation du modèle de données : `channel` (comment on transmet) reste distinct de `outputKind` (nature du livrable, 3 valeurs).
- **D-2** — Introduction d'un `scope` explicite (compte / collaborateur / interne) qui débloque les usages sans compte pivot.
- **D-3** — Taxonomie à **5 catégories** : Commerce·Prospection · Commerce·Périmètre actif · Delivery · Recrutement · Interne·Management.
- **D-4** — **2 CTAs utilisateur** : « Rédiger un mail » et « Générer un pitch ». Le CTA « pitch » englobe le pitch commercial ET les prises de parole non commerciales (crise, business review, recadrage) — l'`outputKind` (spoken / structured_briefing) discrimine automatiquement le rendu.
- **D-5** — L'obligation d'ancrage sur une offre catalogue est **conditionnelle au scénario** (`scenario.requiresOffer === true`), plus au canal. **Supersede ADR-0009 §6.**
- **D-6** — Registry TypeScript versionnée dans le repo (~69 scénarios classés), **aucune migration DB**. La catégorie et le scope sont persistés dans `ai_intelligence_runs.input_snapshot.what` (JSON déjà là) pour monitoring futur.
- **D-7** — Un seul workflow n8n `intel-020-communication` étendu (routeur de prompts + ~8 nouveaux templates), pas de nouveau workflow.
- **D-8** — Modale de sélection scénario `ScenarioPickerModal` = **copie contrôlée** d'`OfferPickerModal` (partage des classes d'animation `.kredo-relief-hover` / `.kredo-offer-card-in/out` + timing `BACK_COLLAPSE_MS`), pas de composant générique abstrait.

---

## 3. Options considérées

### 3.1 Modélisation mail vs pitch

**Option A — Statu quo : distinction via `channel`.**
Pros : rien à changer. Cons : bloque tous les usages voulus, combinaisons absurdes possibles, `OfferPicker` obligatoire dans tous les pitchs.
→ **Rejeté** (le problème est justement là).

**Option B — 5 valeurs `outputKind` (proposition ChatGPT).**
`written_message | spoken_pitch | meeting_briefing | crisis_talk_track | business_review_briefing`.
Pros : très explicite. Cons : mélange encore la **forme** du livrable (script / briefing) et le **contexte métier** (crise / business review). `crisis_talk_track` et `business_review_briefing` ont exactement la même **structure de sortie** (objectif + messages + arguments + réponses aux objections + postures + choses à ne pas dire) — seul le prompt change.
→ **Rejeté** (mélange les préoccupations).

**Option C — 3 valeurs `outputKind` (retenue).**
```ts
outputKind: "written_message" | "spoken_pitch" | "structured_briefing"
```
Pros : chaque valeur correspond à **une forme technique de sortie** stable, versionnable, testable. `structured_briefing` couvre RDV découverte, cross-sell, crise, business review, recadrage — la structure est identique, seuls le prompt et le contexte hydraté changent. Cons : le champ `MeetingBriefingOutput` doit s'enrichir de quelques optionnels (`postures?`, `emotional_context?`) pour couvrir les cas non commerciaux, mais rétro-compatible.
→ **Retenu (D-1).**

### 3.2 Taxonomie catégories

**Option A — 4 catégories (proposition initiale utilisateur) :** Commerce·Prospection · Commerce·Actif · Recrutement · Interne.
Fusionne l'ancien `delivery` (client externe : COPIL, escalade, remplacement consultant) avec Management (collaborateur interne : 1:1, business review, recadrage) sous « Interne ». Simple à naviguer mais **mélange deux publics** aux enjeux et postures très différents. Rend le futur monitoring de la production Delivery (comm de crise proactive) illisible.
→ **Rejeté après discussion.**

**Option B — 5 catégories (retenue) :** Commerce·Prospection · Commerce·Périmètre actif · Delivery · Recrutement · Interne·Management.
Sépare le client externe (Delivery : COPIL, escalade, comm de crise client) du collaborateur interne (Interne·Management : 1:1, business review, recadrage, arbitrage). Plus lisible, permet de monitorer la **prospection** ET le **delivery** séparément. Coût : une carte de plus dans la modale de sélection — négligeable.
→ **Retenu (D-3).**

### 3.3 CTAs visibles utilisateur

**Option A — 3 CTAs distincts** : Mail / Pitch commercial / Préparer une prise de parole.
Pros : distinction visuelle claire entre pitch commercial (offre ancrée) et prise de parole non commerciale. Cons : triple le nombre de points d'entrée à câbler sur les 9 surfaces P0 (Recrutement, Consultants, Agenda, Missions actives…).
→ **Rejeté.**

**Option B — 2 CTAs (retenue)** : Mail / Pitch.
Le CTA « Générer un pitch » englobe pitch commercial + prises de parole via l'`outputKind` sélectionné automatiquement par le scénario. Moins d'options mentales pour l'utilisateur, moins de call-sites à câbler.
→ **Retenu (D-4).**

**Option C — 2 CTAs mais renommés** : Mail / Prise de parole (le pitch commercial devient un sous-cas).
Cohérent avec le diagnostic « le pitch n'est plus juste commercial » mais casse la nomenclature installée (« Générer un pitch » est déjà en prod partout).
→ **Rejeté** (churn UX inutile).

### 3.4 Mode sans compte

**Option A — Forcer un compte partout** (statu quo).
→ **Rejeté** : contredit directement la requête initiale (business review, crise démission, arbitrage interne n'ont pas de compte pivot).

**Option B — `scope` explicite dans le request** (retenue).
```ts
scope: "account" | "collaborator" | "internal"
```
Le composer exige un compte seulement si `scope === "account"`. Pour `scope === "collaborator"`, il exige un `collaboratorId` (résolu via `resolvePrimaryEntity`). Pour `scope === "internal"`, il n'exige rien — le contexte est fourni par le prompt utilisateur (mustInclude).
→ **Retenu (D-2).**

### 3.5 Contrainte offre catalogue

**Option A — Statu quo ADR-0009 §6** : offre toujours obligatoire pour tout pitch.
→ **Rejeté** : bloque exactement les nouveaux usages voulus.

**Option B — Suppression complète de la contrainte.**
Rétrogradation nette de l'ADR-0009. Risque : le pitch commercial d'offre catalogue (`cold_call_pitch` / `meeting_prep_cross_sell`) est justement le cas où l'offre EST le pivot — la rendre optionnelle affaiblit la qualité de sortie pour ce cas-là.
→ **Rejeté.**

**Option C — Conditionnelle au scénario (retenue).**
`OfferPicker` s'affiche et `context.offerRef` est obligatoire quand `scenario.requiresOffer === true`. Sinon caché et optionnel. La règle « pas d'offre hors catalogue » reste en prompt pour les scénarios concernés.
→ **Retenu (D-5).** Supersede ADR-0009 §6.

### 3.6 Réutilisation `OfferPickerModal`

**Option A — Extraction d'un composant générique `SelectionDrilldownModal`** (proposition ChatGPT).
`OfferPickerModal` fait 218 lignes dont ~30 spécifiques offres. Extraire un générique impose de gérer 5+ props types (carte carrée vs rectangulaire, avec/sans logo, 1 niveau vs 2 niveaux). Abstraction prématurée pour deux usages.
→ **Rejeté.**

**Option B — Copie contrôlée de la structure d'`OfferPickerModal`** (retenue).
`ScenarioPickerModal` en fichier séparé, structure et animations copiées, partage des classes CSS uniquement (`.kredo-relief-hover`, `.kredo-offer-card-in`, `.kredo-offer-card-out`, timing `BACK_COLLAPSE_MS = 130`). Extraction d'un composant générique différée au jour où on aura un 3ème usage.
→ **Retenu (D-8).**

---

## 4. Contrats de données

### 4.1 Registry TypeScript (source de vérité)

```ts
// src/lib/communication/communication-scenario-registry.ts

export type ActivityCategory =
  | "commerce_prospection"
  | "commerce_actif"
  | "delivery"
  | "recrutement"
  | "interne_management"

export type ScenarioOutputKind =
  | "written_message"
  | "spoken_pitch"
  | "structured_briefing"

export type ScenarioUseCase = "mail" | "pitch" | "both"

export type ScenarioScope = "account" | "collaborator" | "internal"

export type ScenarioRegistryItem = {
  value: CommunicationScenario
  label: string
  description: string
  activityCategory: ActivityCategory
  useCase: ScenarioUseCase
  defaultOutputKind: ScenarioOutputKind
  defaultChannel?: CommunicationChannel      // Optionnel — imposé par outputKind quand spoken/briefing
  defaultObjective: CommunicationObjective
  requiresOffer: boolean                      // ⚠️ Défaut FALSE — remplace ADR-0009 §6
  requiredScopes: ScenarioScope[]             // Ex: ["collaborator"] pour scénarios management ; ["account"] pour pitch commercial ; ["internal"] pour arbitrage interne
  allowedEntityTypes: N8nEntityType[]
}
```

### 4.2 Contrat `CommunicationBrief` étendu

```ts
export interface CommunicationBrief {
  what: {
    channel: CommunicationChannel
    scenario: CommunicationScenario
    outputKind: ScenarioOutputKind          // NEW — retiré de la déduction par channel
    length: CommunicationLength
    activityCategory: ActivityCategory      // NEW — persisté pour monitoring
    scope: ScenarioScope                    // NEW — pilote la résolution du composer
  }
  who: {
    sender: { ... }
    recipient: {                             // OPTIONNEL quand scope !== "account"
      type?: CommunicationRecipientType
      persona?: CommunicationPersona
      relation?: CommunicationRelation
      contactId?: string
      collaboratorId?: string                // NEW — quand scope === "collaborator"
      displayName?: string
      companyName?: string
    }
    objective: CommunicationObjective
  }
  how: { ... }
  context: {
    ...
    offerRef?: string                        // Obligatoire ssi scenario.requiresOffer
    collaboratorRef?: string                 // NEW — quand scope === "collaborator"
    // internalContextRef reste optionnel — pas d'entité pivot obligatoire
  }
}
```

### 4.3 Contrat de sortie — 3 formats

- `CommunicationOutput` (`outputKind === "written_message"`) — **inchangé**.
- `SpokenPitchOutput` (`outputKind === "spoken_pitch"`) — **inchangé**.
- `MeetingBriefingOutput` (`outputKind === "structured_briefing"`) — **enrichi** avec :
  ```ts
  postures?: Array<{ situation: string; posture: string }>       // NEW — utile crise/recadrage/BR
  emotional_context?: string                                      // NEW — court, avertit sur la charge émotionnelle
  power_dynamic?: "peer" | "subordinate" | "superior" | "client_external"  // NEW — pilote le ton du briefing
  ```
  Champs optionnels rétro-compatibles avec les briefings commerciaux déjà générés.

### 4.4 Aucune migration DB

Toutes les informations vivent dans `input_snapshot` (jsonb existant) côté `ai_intelligence_runs` et `content_json` (jsonb existant) côté `ai_intelligence_results`. **Zéro table nouvelle, zéro colonne nouvelle.** L'auto-sauvegarde documentaire (`intelligence_documents` avec `result_type = 'commercial_pitch'` ou `'communication'`) reste telle quelle.

---

## 5. Résolution d'entité étendue

`CommunicationComposerHost.resolvePrimaryEntity` [switch actuel lignes 282-344](../../src/components/communication/CommunicationComposerHost.tsx:282) gère 6 types. Il faut étendre à 3 types supplémentaires pour couvrir les P0 :

| N8nEntityType | Résolution actuelle | Résolution cible |
|---|---|---|
| `company` | ✅ | inchangée |
| `contact` | ✅ | inchangée |
| `opportunity` | ✅ | inchangée |
| `mission` | ✅ | inchangée |
| `project` | ✅ | inchangée |
| `calendar_event` | ✅ | inchangée |
| **`candidate`** | ❌ (default: `{}`) | Requête `candidates` → `person_id` + `default_opportunity_id`, `scope = "account"` si opportunité rattachée, sinon `"internal"` |
| **`collaborator`** | ❌ | Requête `collaborators` → `person_id`, `scope = "collaborator"`, `collaboratorRef` = id |
| **`sector`** | ❌ | Requête `sector_intelligence` → nom secteur, `scope = "account"` avec `companyId` **null** (contexte sectoriel pur) |

`interaction` reste hors scope V1 (aucun cas d'usage clair identifié).

---

## 6. Workflow n8n — extension et compatibilité

Un seul workflow `intel-020-communication`, actuellement 16 nœuds. **Aucun nouveau workflow.**

### 6.1 Nœuds à modifier

- **`Validate Brief`** — accepter `outputKind`, `activityCategory`, `scope`, `collaboratorRef`. Rejeter `offerRef` manquant seulement si le scénario le requiert (via table de correspondance côté n8n synchronisée manuellement avec la registry TS).
- **`Hydrate Context`** — hydrater selon `scope` :
  - `scope === "account"` : logique actuelle (compte + contacts + opportunités + missions + signaux).
  - `scope === "collaborator"` : `collaborators` + `person_skills` + `mission_activity_reports` récents + `collaborator_absences` + éventuellement `companies` de la mission active.
  - `scope === "internal"` : minimal — workspace + user profile + entités référencées dans `mustInclude` seulement.
- **`Assemble Prompt`** — étendre le routeur avec 3 nouveaux system prompts (un par `outputKind` × `activityCategory` pertinente) :
  - `structured_briefing × delivery` (COPIL tendu, escalade, comm crise client, annonce départ consultant)
  - `structured_briefing × interne_management` (business review, entretien 1:1, recadrage, arbitrage)
  - `structured_briefing × recrutement` (brief avant entretien, closing candidat, défense candidat atypique)
- **`Parse & Validate Output`** — accepter les nouveaux champs optionnels `postures`, `emotional_context`, `power_dynamic` de `MeetingBriefingOutput`.
- **`Quality Check`** — pour `structured_briefing` non commercial : vérifier absence de mentions produit/offre catalogue (les scénarios management ne doivent jamais vendre), présence du champ `postures` recommandée.
- **`Prepare Callback`** — route déjà en place : `commercial_pitch` pour les scénarios commerciaux (auto-sauvegarde), `communication` pour les autres. Ajouter un troisième `result_type = "prise_de_parole"` pour les briefings non commerciaux (interne / delivery) — auto-sauvegarde éligible, catégorisé dans la bibliothèque.

### 6.2 Rétro-compatibilité

Les 21 scénarios existants doivent continuer à produire exactement la même sortie qu'aujourd'hui. **Contrat de non-régression** :
- Les runs antérieurs à ce lot n'ont pas de champ `outputKind` dans `input_snapshot` → le workflow le dérive de `channel` (fallback vers la logique actuelle `isPitchChannel`).
- Les briefings commerciaux (`cold_call_pitch` / `meeting_prep_*`) continuent d'utiliser `result_type = "commercial_pitch"` et de passer par l'auto-sauvegarde documentaire.

### 6.3 Modèle et coûts

`claude-sonnet-4-6` reste le modèle par défaut. Aucune bascule tiering Haiku/Sonnet dans ce chantier — ce sera un lot séparé, cohérent avec ADR-0012 D-6 (différé après retour d'usage réel).

---

## 7. Cartographie exhaustive des surfaces — 30+ points d'entrée

Résultat de l'audit `grep openCommunicationComposer + ContextualCommunicationButton` (69 call-sites au total, 2026-07-10) croisé avec l'analyse des modules manquants.

| Module / Surface | Écran / composant | Mail | Pitch | Scénario par défaut | Priorité | Scope |
|---|---|---|---|---|---|---|
| Cockpit | Header desktop (`CockpitPitchMailDrawer`) | ✅ | ⚠️ | libre | — | account |
| Cockpit mobile | `CockpitContextSheet` + Prospection/Staffing | ✅ | ❌ | `signal_outreach` | **P1** | account |
| Prospection | `AccountsToActivateTable` | ✅ | ❌ | `reactivation` | **P1** | account |
| Prospection | `/prospection/suivi` | ❌ | ❌ | selon step | **P0** | account |
| Prospection | Cockpit intelligence (Connaissance/Enjeux/Stratégie) | ✅ | ✅ | `account_pitch` | — | account |
| Veille | `NewsSignalCard` + `IntelligenceReaderModal` | ✅ | ❌ | `signal_based_pitch` | **P1** | account |
| Missions/Opps | `OpportunityStandingPanel` + `OpportunityEditForm` | ✅ | ⚠️ | `proposal_follow_up` | **P1** | account |
| Missions actives | `MissionDetailHeader` | ✅ | ⚠️ | `cross_sell` | **P1** | account |
| Missions actives | Onglet Suivi (interactions/events) | ❌ | ❌ | `meeting_prep_cross_sell` | **P0** | account |
| Missions actives | Onglet Risque/Alerte | ❌ | ❌ | `client_crisis_talk_track`, `consultant_replacement_talk_track` | **P0 (nouveau cas)** | account |
| Missions projets | Comité pilotage | ❌ | ❌ | `tense_copil_briefing` | **P1** | account |
| Recrutement | `RecruitmentWorkspace` (liste/kanban/planning) | ❌ | ❌ | scénarios `candidate_*` | **P0** | account |
| Recrutement | `CandidateDrawer` | ❌ | ❌ | `candidate_follow_up`, `opportunity_to_candidate_pitch` | **P0** | account |
| Recrutement | `RecruitmentPlanningView` | ❌ | ❌ | `recruiter_briefing_pre_interview` | **P1** | account |
| Consultants | `ConsultantDrawer` — Synthèse/Activité | ❌ | ❌ | `one_on_one_alignment`, `disciplinary_meeting_posture` | **P0 (nouveau cas)** | collaborator |
| Consultants | Alerte activité / sortie intercontrat | ❌ | ❌ | `intercontract_exit_pitch`, `difficult_announcement_talk_track` | **P0 (nouveau cas)** | collaborator |
| Consultants | Fiche mission (Bench, CRA retard) | ❌ | ❌ | `cra_absence_reminder`, recadrage | **P1** | collaborator |
| Agenda | `AgendaEventDrawer` (RDV commercial) | ❌ | ❌ | `meeting_prep_discovery/cross_sell` selon `event_type` | **P0** | account |
| Agenda | `AgendaEventDrawer` (entretien client) | ❌ | ❌ | `recruiter_briefing_pre_interview` | **P1** | account |
| Agenda | Événement management (COPIL, 1:1) | ❌ | ❌ | `quarterly_business_review`, `sensitive_meeting_briefing` | **P1** | collaborator/internal |
| Finance | Relance facture | ❌ | — | `invoice_follow_up` | **P1** | account |
| Finance | Alerte anomalie bench | ❌ | ❌ | `resource_arbitrage_pitch` | **P2** | internal |
| Reports | Toolbar bibliothèque | ✅ | ✅ | libre | — | — |
| Approche sectorielle | `PlaybookPage` | ✅ | ⚠️ | `sector_persona_pitch` | **P1** | account |
| Contact drawer | `ContactIdentityDrawer` | ✅ | ❌ | `signal_outreach` | **P2** | account |
| Company drawer | `CompanyIdentityDrawer` (4 emplacements) | ✅ | ❌ | selon lifecycle | **P2** | account |
| Panneau global | `IntelligencePanel` + `IntelligenceFAB` | ✅ | ❌ | libre | — | — |

**Lecture** : 9 surfaces **P0 manquantes**, dont trois modules entiers (Recrutement, Consultants, Agenda). Le pitch est branché sur **4 surfaces / 30**. Ce sont les cibles du Lot 4.

---

## 8. Catalogue de scénarios — 21 existants + ~48 nouveaux = ~69

Structure : `[E]` existant · `[N]` nouveau · `[R]` renommé/désambigüé.

### 8.1 Commerce · Prospection

| Scénario | État | outputKind | requiresOffer |
|---|---|---|---|
| `signal_outreach` | E | written_message | — |
| `follow_up_no_reply` | E | written_message | — |
| `offer_introduction` | E | written_message | — |
| `appointment_confirmation` | E | written_message | — |
| `first_contact_after_nomination` | N | written_message | — |
| `linkedin_to_email_bridge` | N | written_message | — |
| `event_invitation` | N | written_message | — |
| `sector_rebound` | N | written_message | — |
| `discovery_meeting_request` | N | written_message | — |
| `cold_call_pitch` | E | spoken_pitch | ✅ |
| `meeting_prep_discovery` | E | structured_briefing | — |
| `signal_based_pitch` | N | spoken_pitch | — (le signal remplace l'ancrage) |
| `sector_persona_pitch` | N | structured_briefing | — |
| `why_us_now_pitch` | N | spoken_pitch | — |
| `first_objection_bad_timing` | N | spoken_pitch | — |

### 8.2 Commerce · Périmètre actif

| Scénario | État | outputKind | requiresOffer |
|---|---|---|---|
| `post_meeting` | E | written_message | — |
| `profile_submission_to_client` | R | written_message | — |
| `cross_sell` | E | written_message | — |
| `reactivation` | E | written_message | — |
| `proposal_follow_up` | E | written_message | — |
| `invoice_follow_up` | E | written_message | — |
| `mission_renewal` | N | written_message | — |
| `consultant_replacement_notice` | N | written_message | — |
| `client_tension_apology` | N | written_message | — |
| `delivery_delay_notice` | N | written_message | — |
| `meeting_prep_cross_sell` | E | structured_briefing | ✅ |
| `proposal_defense_pitch` | N | structured_briefing | — |
| `renewal_pitch` | N | structured_briefing | ✅ |
| `price_objection_pitch` | N | spoken_pitch | — |
| `client_crisis_talk_track` | N | structured_briefing | — |
| `delay_talk_track` | N | structured_briefing | — |
| `tense_copil_briefing` | N | structured_briefing | — |

### 8.3 Delivery

| Scénario | État | outputKind | requiresOffer |
|---|---|---|---|
| `project_alert_escalation` | E | written_message | — |
| `steering_committee_minutes` | E | written_message | — |
| `risk_communication` | N | written_message | — |
| `milestone_validation_request` | N | written_message | — |
| `escalation_briefing` | N | structured_briefing | — |
| `risk_meeting_briefing` | N | structured_briefing | — |

### 8.4 Recrutement

| Scénario | État | outputKind | requiresOffer |
|---|---|---|---|
| `candidate_interview_invitation` | E | written_message | — |
| `candidate_follow_up` | E | written_message | — |
| `candidate_offer` | E | written_message | — |
| `candidate_rejection` | E | written_message | — |
| `candidate_availability_check` | N | written_message | — |
| `candidate_post_interview_feedback` | N | written_message | — |
| `candidate_cv_completion_request` | N | written_message | — |
| `dormant_talent_pool_reactivation` | N | written_message | — |
| `candidate_to_client_pitch` | N | structured_briefing | ⚠️ optionnel (si opportunité rattachée) |
| `opportunity_to_candidate_pitch` | N | structured_briefing | ⚠️ optionnel |
| `candidate_closing_pitch` | N | spoken_pitch | — |
| `atypical_candidate_defense` | N | structured_briefing | — |
| `recruiter_briefing_pre_interview` | N | structured_briefing | — |
| `mobility_salary_pitch` | N | spoken_pitch | — |

### 8.5 Interne · Management

| Scénario | État | outputKind | requiresOffer | scope |
|---|---|---|---|---|
| `manager_collaborator_internal` | E | written_message | — | collaborator |
| `cra_absence_reminder` | E | written_message | — | collaborator |
| `one_on_one_alignment` | N | written_message | — | collaborator |
| `collaborator_recognition` | N | written_message | — | collaborator |
| `performance_review_prep` | N | structured_briefing | — | collaborator |
| `assignment_change_notice` | N | written_message | — | collaborator |
| `internal_arbitrage_request` | N | written_message | — | internal |
| `staffing_help_request` | N | written_message | — | internal |
| `handover_note` | N | written_message | — | internal |
| `weekly_briefing_prep` | N | structured_briefing | — | internal |
| `internal_validation_before_send` | N | written_message | — | internal |
| `difficult_announcement_talk_track` | N | structured_briefing | — | collaborator |
| `disciplinary_meeting_posture` | N | structured_briefing | — | collaborator |
| `quarterly_business_review` | N | structured_briefing | — | internal |
| `resource_arbitrage_pitch` | N | structured_briefing | — | internal |
| `intercontract_exit_pitch` | N | structured_briefing | — | collaborator |
| `sensitive_meeting_briefing` | N | structured_briefing | — | collaborator |
| `internal_committee_pitch` | N | structured_briefing | — | internal |
| `investment_arbitrage_argument` | N | structured_briefing | — | internal |
| `project_status_pitch` | N | structured_briefing | — | internal |
| `direction_summary_pitch` | N | structured_briefing | — | internal |

**Volumétrie finale** : 5 catégories · 21 existants + 48 nouveaux = **69 scénarios**. La modale à 2 niveaux (catégorie → scénario) affiche entre 6 et 21 items par catégorie — lisible.

---

## 9. Plan d'action séquencé — 6 lots

Séquence conçue pour **débloquer d'abord**, structurer ensuite, câbler enfin.

| Lot | Objectif | Migration DB | Workflow n8n | Effort estimé |
|---|---|---|---|---|
| **Lot 0 — Débloquer les usages sans compte** | `scope` explicite dans `CommunicationComposerRequest` ; `resolvePrimaryEntity` étendu à `candidate`, `collaborator`, `sector` ; `PitchMailDrawerContent` tolère `data.company === null` ; message d'erreur factuel « aucune entité résolue » quand attendu | Non | Non | 4-6 h |
| **Lot 1 — Registry + `ScenarioPickerModal`** | Création `communication-scenario-registry.ts` (69 scénarios classés) + `ScenarioPickerModal` (copie contrôlée d'`OfferPickerModal`, modale catégorie → scénario) + filtrage `useCase = mail \| pitch \| both` + remplacement du `<Select>` scénario dans `CommunicationBriefForm` | Non | Non | 8-10 h |
| **Lot 2 — Séparation modèle** | `outputKind` dans `brief.what` ; `activityCategory` + `scope` persistés dans `input_snapshot` ; retrait de `isPitchChannel` au profit de la registry ; `offerRef` obligatoire piloté par `scenario.requiresOffer` ; renommage `family` → `activityCategory` (migration TS pure) ; désambigüation `profile_submission` en 2 variantes | Non | Non (mais le workflow doit lire les nouveaux champs sans casser les anciens — fallback) | 6-8 h |
| **Lot 3 — Extension prompts n8n** | 3 nouveaux system prompts pour `structured_briefing × delivery/interne_management/recrutement` ; enrichissement `MeetingBriefingOutput` (postures / emotional_context / power_dynamic) ; QA renforcé (interdiction mention offre pour scénarios non commerciaux) ; nouveau `result_type = "prise_de_parole"` avec auto-sauvegarde documentaire ; test réel des 8-10 nouveaux prompts sur données KREDO | Non | ✅ Extension `intel-020-communication.json` | 10-12 h + config VPS |
| **Lot 4 — Points d'entrée P0** | Câblage sur les 9 surfaces P0 : Recrutement (kanban + drawer + planning), Consultants (drawer + alertes bench + intercontrat), Agenda (event drawer selon `event_type`), Missions actives (onglets Suivi + Risque), Prospection Suivi | Non | Non | 12-16 h |
| **Lot 5 — Points d'entrée P1-P2** | Câblage secondaire : Finance relance facture, Delivery COPIL, Contact drawer pitch, Company drawer pitch, Agenda événements management, Cockpit mobile pitch | Non | Non | 6-8 h |

**Total** : ~46-60 h de dev, **zéro migration DB**, un seul workflow n8n étendu. Les Lots 0-2 sont indépendants des Lots 3-5 et peuvent être validés en isolation (les nouveaux scénarios seront simplement non générables tant que Lot 3 n'est pas importé sur le VPS).

---

## 10. Non-régressions à garantir

- **Les 21 scénarios existants** doivent produire le même livrable qu'aujourd'hui — vérifier via replay d'au moins 3 runs archivés par scénario, avec diff `content_json` accepté seulement pour les champs optionnels ajoutés.
- **Les 69 call-sites actuels** doivent continuer à ouvrir le composer sans erreur — la registry doit couvrir 100 % des `entryPoint` de `ENTRY_POINT_SCENARIOS` actuel avec un scénario équivalent.
- **L'auto-sauvegarde documentaire** (`intelligence_documents`) doit continuer à cataloguer les pitchs commerciaux sous `commercial_pitch`. Les briefings non commerciaux sous `prise_de_parole` doivent aussi être auto-sauvegardés (extension de la logique existante, pas régression).
- **La règle « pas d'offre hors catalogue »** doit rester présente dans le prompt des scénarios `requiresOffer === true` — la contrainte n'est pas supprimée, elle est conditionnée.

---

## 11. Ce qui reste hors scope de cet ADR

- **Monitoring de la prospection** (dashboarding des runs par `activityCategory = "commerce_prospection"`) — la persistance dans `input_snapshot.what.activityCategory` prépare le terrain, mais l'UI de monitoring est un chantier séparé.
- **Tiering Haiku/Sonnet** — cohérent avec ADR-0012 D-6, différé.
- **Historique et duplication de scénario** (« reprendre le dernier mail envoyé à X et l'adapter ») — pas dans ce chantier.
- **Édition post-génération assistée** (« reformule ce paragraphe en plus court ») — pas dans ce chantier.
- **Intégration `interaction` comme entité pivot** — pas de cas d'usage clair, différé.

---

## 12. Décision

**Statut : Proposé, à valider par Guillaume.**

Une fois validé, exécution en séquence stricte Lot 0 → Lot 1 → Lot 2 → Lot 3 → Lot 4 → Lot 5, avec point de validation manuel entre chaque lot. `CLAUDE.md` sera mis à jour à la fin de chaque session significative selon les conventions du projet.
