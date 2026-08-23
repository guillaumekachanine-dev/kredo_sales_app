# HANDOFF — DYNAMIC PLAYBOOKS — LOT 0
## Audit de raccordement et gel du contrat

**Agent :** A0 — Lead / Architecte / Orchestrateur
**Date :** 23 août 2026
**Nature :** audit read-only. Aucun fichier applicatif modifié.
**Références :** `00-NOTE-CADRAGE-BATTLE-CARDS-INTERACTIVES.md` · `01-ROADMAP-MULTI-AGENTS.md`

---

## 1. Statut

**DONE.**

Les douze questions du gate (Q1→Q12) sont tranchées sur preuve de code, de workflow et de
base live. Aucun blocage n'interdit de lancer L1 et L3.

---

## 2. HEAD audité

| | |
|---|---|
| **HEAD** | `95c0762c7c210a7c4886211410925ddfa5df29c3` |
| **Message** | `fix(bi-mobile): corriger le contraste blanc sur blanc de la vue concurrence` |
| **Date** | 2026-08-23 09:11:00 +0200 |
| **Branche** | `main` |
| **Baseline citée par les deux documents de cadrage** | `2464e0c9f927db8817dacd938d08b14450347589` |

### 2.1 `git status` au moment de l'audit

4 fichiers, tous des suppressions de documentation déjà actées (déplacement `v1_DISMISSED`) :

```
 D docs/FEATURES/DYNAMIC_PLAYBOOKS/v1_DISMISSED/CLAUDE_KREDO_Analyse_Playbook_Commercial_V1.md
 D docs/FEATURES/DYNAMIC_PLAYBOOKS/v1_DISMISSED/KREDO_Note_precadrage_Playbook_Commercial.md
 D docs/FEATURES/DYNAMIC_PLAYBOOKS/v1_DISMISSED/KREDO_PLAYBOOK_Perimetre_et_Roadmap_V1.md
 D docs/FEATURES/DYNAMIC_PLAYBOOKS/v1_DISMISSED/note_synthese_dynamic_playbooks_kredo.md
```

Aucun fichier applicatif modifié ou non commité. L'arbre de travail est propre côté `src/` et `n8n/`.

### 2.2 Écarts à la baseline `2464e0c9`

6 commits, 42 fichiers, +3420/−448. Trois d'entre eux touchent le périmètre du chantier :

| Commit | Impact sur ce chantier |
|---|---|
| `865aa70e` fix(content-collections) | **Pertinent.** Réécrit `KnowledgeLibraryPane.tsx` (+658/−?) et `ManageCollectionsDesktop.tsx` (+201) ; ajoute `fetchAllIntelligenceDocuments` et étend les contrats. La mécanique Knowledge auditée au §9 est **celle d'après ce commit**, pas celle décrite dans la note de cadrage. |
| `9e0b73e9` feat(business-intelligence) | Refonte accueil segment + catalogue (`SegmentCatalogLanding*`, `SegmentHomeDashboard*`, `flatten-catalog-segments.ts`, `sector-icon-map.ts`). N'entre pas dans le Playbook mais **change le chemin d'entrée** vers la modale. |
| `95c0762c` fix(bi-mobile) | Contraste des composants `mobile/Competitive*`. Ne touche pas les Battle Cards. |

**Point capital pour A1 :** `SectorPlaybooksModal.tsx` et `BattleCardsSection.tsx` **n'ont pas
bougé depuis la baseline**. La description qu'en fait la note de cadrage (§4.1, §4.2) est
exacte. Ce qui a bougé, c'est Knowledge (§9 de ce handoff) et le catalogue BI.

---

## 3. Conclusion exécutive

Le cadrage est implémentable **intégralement** sur l'existant. Zéro table, zéro migration, zéro
workflow, zéro route API, zéro duplication du Composer. Le brief INTEL-020 accepte un bloc
`battleSituation` dans `context` : il traverse `input_snapshot` → n8n → `brief_json` du document
sans une ligne de plomberie. `commercial_pitch` est produit **automatiquement** dès que la
catégorie du scénario est commerciale — le pipeline documentaire est déjà branché. Le CTA
« Ouvrir dans Rapports » se fait avec la Server Action `saveResultAsDocument({resultId})`
(idempotente) et `/reports?doc=<id>`. Trois points appellent une décision plutôt qu'un constat :
(1) **`brief.context.angle` est du code mort** — aucun producteur, aucun lecteur, y compris dans
le prompt n8n : ne pas s'appuyer dessus ; (2) **`get_communication_context` lit la connaissance
sectorielle par `companies.sector_id`, donc à la maille MACRO**, alors que le Playbook affiche la
maille SEGMENT — d'où l'obligation de porter des snapshots texte dans `battleSituation` ;
(3) **imbriquer deux `IntelligenceSplitModalShell`** (Battle + « Gérer la connaissance ») produit
un double `onClose` sur Escape — configuration inédite dans le repo, à traiter au L3/L5. Réalité
data : sur 23 entrées de cartographie, **1 seul segment sur 3 a un `profile_json` riche** et
**15 comptes sur 23 n'ont aucun contact CRM** — le fallback persona est le cas majoritaire, pas
un cas limite.

---

## 4. Architecture confirmée

Flux final validé, chaque flèche vérifiée dans le code :

```text
BusinessIntelligenceDesktop / Mobile
  └─ workspace.competitiveMap.actors : CompetitiveMapActor[]      ← déjà chargé serveur
     └─ SectorPlaybooksModal (IntelligenceSplitModalShell)
        ├─ PlaybookMode  (7 sections actuelles)
        └─ BattleWorkspace                                        ← L1 (flip)
           ├─ BattleRevisionView    ← actor.details (profile_json projeté)   L2
           └─ BattleSituationView                                            L3
              ├─ contacts       : requête client `contacts` (RLS)   — compte actif seul
              ├─ offres         : getSuggestedOffers(companyId)      — Server Action
              ├─ enjeux SECTEUR : knowledge.painPoints (id + resolvedLevel)
              ├─ enjeux COMPTE  : account_issues (lazy, compte actif seul)
              ├─ knowledge      : fetchCollectionsSummary() + ManageCollections*
              └─ « Générer le pitch »
                 └─ POST /api/n8n/trigger                                     L4
                    { workflowId:"intel-020-communication",
                      entityType:"company", entityId:companyId,
                      companyId, input: CommunicationBrief }
                    → triggerN8nRun → createRun (input_snapshot = brief)
                    → webhook n8n
                       Validate Brief → Update Run Status → Hydrate Context
                       → Resolve Sender → Assemble Prompt → Call LLM
                       → Parse & Validate → Quality Check → Prepare Callback
                          resultType = 'commercial_pitch'  (dérivé, pas configuré)
                    → POST /api/n8n/callback (HMAC)
                       → saveResult → ai_intelligence_results (resultId)
                       → isEligibleDocumentResultType('commercial_pitch') = true
                       → saveResultAsDocumentWithSupabaseClient
                          → intelligence_documents (source_result_id = resultId,
                            brief_json = input_snapshot, links → company/contact)
                 └─ useRunTracker({runId}) → onSucceeded({id, contentJson})    L5
                    → BattlePitchResult (SpokenPitchOutput)
                    → « Ouvrir dans Rapports » :
                       saveResultAsDocument({resultId}) → documentId
                       → /reports?doc=<documentId>
```

**Invariants confirmés dans le code :**

- `CompetitiveMapActor.companyId` provient de la jointure `companies` du snapshot
  (`present-competitive-map-workspace.ts:170` — un acteur sans compte est **écarté** par le
  `flatMap`). En base, `competitive_map_entries.company_id` est `NOT NULL`. **D6 est garanti,
  pas espéré.**
- `CompetitiveMapActor.id` = `competitive_map_entries.id` → c'est le `competitiveEntryId`.
- `SectorPlaybooksModal` reçoit `competitiveActors={workspace.competitiveMap?.actors ?? []}`
  depuis les deux hôtes (`BusinessIntelligenceDesktop.tsx:170`, `BusinessIntelligenceMobile.tsx:150`).
  Le segment actif n'est jamais un état local : il vient de `workspace.segment`. **D5 tient sans
  effort** tant qu'aucun nouveau state n'est introduit.
- `CommunicationComposerHost` est monté globalement dans `src/app/(app)/layout.tsx` via
  `AppOverlayHosts`. Il est donc **disponible** sur `/intelligence` — mais le mode Situation ne
  doit pas l'ouvrir (cf. §8.2).

---

## 5. Contrat `BattleSituation`

### 5.1 Méthode

Le shape proposé dans la note (§9.2) a été confronté au contrat réel de `CommunicationBrief`
(`src/lib/n8n/types.ts:845-936`). Trois corrections :

1. **`issue` / `angle` / `timing` doivent porter leur provenance**, pas seulement un libellé.
   Le cadrage exige (§8.1, R2) que « un enjeu sectoriel ne soit jamais présenté comme un fait
   spécifique au compte » — une chaîne nue ne le permet pas.
2. **`angle` n'a pas de champ canonique utilisable.** `CommunicationBrief["context"].angle`
   existe dans le type mais est **du code mort vérifié** : `grep` sur `src/` ne trouve **aucun
   producteur** (le seul site qui manipule un `angle`, `ContextualCommunicationButton.tsx:200`,
   le replie dans `mustInclude`) et le nœud `Assemble Prompt` **ne le lit jamais** (les seules
   clés de `brief.context` consommées par le prompt sont `mustInclude` et `mustExclude`).
   S'appuyer dessus ferait disparaître l'angle silencieusement.
3. **`segmentId` est nécessaire**, pas confortable : le contexte hydraté par n8n est à la maille
   MACRO (§10.3). Sans `segmentId`, la trace du run perd totalement la maille segment et la
   situation devient non auditable.

Le contrat ci-dessous n'introduit **aucun champ déjà porté par le brief** : ni `contactId`, ni
`offerRef`, ni `preferredCollectionIds`, ni `tone`/`length`/`language`/`formality`, ni
`companyId` (porté par `entityId`/`run.company_id`).

### 5.2 Type cible proposé

À créer **au Lot 3** dans
`src/features/business-intelligence/playbooks/battle-situation-contract.ts`
(aucun fichier n'est modifié par le présent lot) :

```ts
/** D'où vient l'élément choisi — jamais présenter du sectoriel comme un fait compte. */
export type BattleSituationSource = "account" | "sector"

/**
 * Un choix de situation. `id` n'est présent QUE lorsque la source porte un
 * identifiant stable en base ; les éléments issus du playbook JSON ou de
 * profile_json n'en ont aucun (ce sont des éléments de tableau, pas des lignes).
 */
export type BattleSituationChoice = {
  id?: string
  label: string
  source: BattleSituationSource
}

export type BattleSituation = {
  /** competitive_map_entries.id — identifie la Battle Card et son snapshot. */
  competitiveEntryId: string
  /** sector_intelligence.id (niveau segment) — maille réelle du playbook affiché. */
  segmentId: string
  /** Obligatoire. */
  issue: BattleSituationChoice
  /** Obligatoire. */
  angle: BattleSituationChoice
  /** Facultatif — trigger compte, échéance réglementaire ou événement sectoriel. */
  timing?: BattleSituationChoice
  /** Facultatif — objection du playbook + sa réponse préparée. Jamais d'id. */
  objection?: { label: string; response?: string }
  /** Facultatif — argument ROI du playbook, texte seul, jamais un chiffre fabriqué. */
  roiArgument?: string
  /**
   * Facultatif — libellé de persona du playbook. Renseigné UNIQUEMENT quand
   * `who.recipient.contactId` est absent (aucun contact CRM sur le compte).
   */
  personaLabel?: string
}
```

Porté dans le brief à **une seule** adresse :

```ts
// src/lib/n8n/types.ts — CommunicationBrief["context"], ajouté au Lot 4 par A3
battleSituation?: BattleSituation
```

### 5.3 Matrice des champs

| Champ | Obligatoire | Source | ID ou texte | Destination INTEL-020 | Raison de sa présence |
|---|---|---|---|---|---|
| `competitiveEntryId` | oui | `CompetitiveMapActor.id` (= `competitive_map_entries.id`) | **ID stable** | trace `input_snapshot` + `brief_json` | Seul moyen de retrouver **quelle** Battle Card et **quel** `study_snapshot_date` ont produit ce pitch. Ne sert pas au prompt. |
| `segmentId` | oui | `workspace.segment.id` | **ID stable** | trace + rendu prompt (nom du segment) | La connaissance hydratée par n8n est macro (§10.3). Sans ce champ, la maille segment disparaît de la trace. |
| `issue.id` | non | `account_issues.id` ou `sector_pain_points.id` | ID quand disponible | trace | `painPoints[].id` et `account_issues.id` sont des uuid réels ; permettent de recalculer l'enjeu plus tard. |
| `issue.label` | **oui** | `account_issues.title` / `knowledge.painPoints[].title` | snapshot texte | **prompt** (bloc SITUATION) | Le libellé doit survivre à la mutation/suppression de la ligne source. |
| `issue.source` | **oui** | `account` si issu de `account_issues`, `sector` si issu de `painPoints` | énum | **prompt** + UI | Exigence R2 du cadrage. Le prompt doit savoir qu'un enjeu sectoriel est une hypothèse, pas un fait du compte. |
| `angle.label` | **oui** | `actor.angleEntree` · `actor.details.traductionCommerciale[]` · `parsePlaybookEntryPoints()[].angle` | **texte seul** | **prompt** | Aucune de ces trois sources ne porte d'identifiant (`angle_entree` est une colonne texte ; les entryPoints sont des éléments d'un tableau JSON). |
| `angle.source` | **oui** | `account` (actor) / `sector` (playbook) | énum | **prompt** + UI | Même raison que `issue.source`. |
| `angle.id` | non | — | jamais peuplé en V1 | — | Documenté comme structurellement absent : ne pas fabriquer d'identifiant synthétique. |
| `timing.id` | non | `sector_regulatory_items.id` / `sector_events.id` | ID quand disponible | trace | Ces deux tables ont des uuid ; les triggers de `profile_json` non. |
| `timing.label` | si `timing` | `details.triggers[]` · `knowledge.regulatory[].name` · `knowledge.events[].title` | snapshot texte | **prompt** | — |
| `timing.source` | si `timing` | `account` (triggers `profile_json`) / `sector` (regulatory, events) | énum | **prompt** + UI | Un trigger d'entreprise et une échéance réglementaire n'ont pas le même statut de preuve. |
| `objection.label` | non | `parsePlaybookObjections()[].objection` | **texte seul** | **prompt** | Élément de tableau JSON, aucun id possible. |
| `objection.response` | non | `parsePlaybookObjections()[].response` | **texte seul** | **prompt** | Réponse validée par KREDO : la fournir évite que le LLM en invente une. |
| `roiArgument` | non | `parsePlaybookRoiArguments()[].argument` | **texte seul** | **prompt** | Aucun id. Texte uniquement, **jamais** un chiffre recalculé ou extrapolé. |
| `personaLabel` | non | `parsePlaybookPersonas()[].role` | **texte seul** | **prompt** | Voir §5.4 : 15 comptes sur 23 n'ont aucun contact CRM. |

### 5.4 Trois arbitrages à ne pas rejouer

**a) Pourquoi `personaLabel` et pas `who.recipient.displayName`.**
`displayName` désigne une personne réelle ; le nœud `Quality Check` s'en sert (`recipient_name`,
branche message écrit) pour vérifier que le **nom de famille** du destinataire apparaît dans le
corps. Y écrire « DSI / responsable SI » est sémantiquement faux et poserait un flag parasite le
jour où le même brief servira un `written_message`. `who.recipient.persona` (énum
`CommunicationPersona`) reste renseigné en parallèle — il porte la persona grossière, pas le
libellé du playbook.

**b) Pourquoi `angle` n'utilise pas `context.angle`.**
Champ mort vérifié des deux côtés (front et n8n). Le réanimer imposerait de toute façon d'ajouter
son rendu dans `Assemble Prompt`, donc le même coût, pour un champ sans provenance et au
sémantisme ambigu. Les six dimensions de Situation restent groupées dans **un seul bloc
auditable**, rendu par **un seul bloc de prompt**. `context.angle` reste inchangé et non utilisé.

**c) Pourquoi pas de `companyId` ni de `study_snapshot_date` dans `battleSituation`.**
`companyId` est déjà porté trois fois (`entityId`, `companyId` du body, `run.company_id`).
`study_snapshot_date` se dérive de `competitiveEntryId` par une jointure. Toute duplication ouvre
la porte à une divergence.

---

## 6. Contrat `battle_situation_pitch`

### 6.1 Un scénario existant suffirait-il ?

Non. Les quatre candidats ont été examinés :

| Candidat | Pourquoi il ne convient pas |
|---|---|
| `cold_call_pitch` | `requiresOffer: true`, `spoken_pitch` — le plus proche. Mais sa mission flagship n'existe pas (il retombe sur `buildTemplateMission`) et son intitulé (« Cold call prospect ») ment sur l'usage : Battle sert aussi la relance, l'objection et le cross-sell. Le réutiliser rendrait impossible de distinguer, dans `/reports` et dans les stats, un pitch Battle d'un pitch d'appel à froid. |
| `signal_based_pitch` | `requiresOffer: false` — contredit frontalement §8.1 et §9.1 (« offre obligatoire »). Ancre sur un signal, pas sur une situation à six dimensions. |
| `why_us_now_pitch` | `requiresOffer: false`, centré urgence. Ne couvre ni objection ni persona. |
| `sector_persona_pitch` | `defaultOutputKind: structured_briefing` (fiche RDV, pas pitch oral). Mauvaise finalité. |

**Le coût d'une entrée de registre est d'exactement deux fichiers TypeScript + un manifeste
régénéré** (§6.3). La lisibilité métier justifie largement cette entrée.

### 6.2 Configuration exacte recommandée

Seed à ajouter dans `SCENARIO_SEEDS`, bloc « Commerce · Prospection » de
`src/lib/communication/communication-scenario-registry.ts` :

```ts
{
  value: "battle_situation_pitch",
  label: "Pitch de situation (Battle Card)",
  description: "Pitch oral construit à partir d'une situation commerciale : interlocuteur, enjeu, angle, timing, objection et offre.",
  activityCategory: "commerce_prospection",
  useCase: "pitch",                         // dérivé automatiquement
  defaultOutputKind: "spoken_pitch",
  defaultChannel: "spoken_pitch_30s",
  defaultObjective: "get_meeting",
  allowedObjectives: ["get_meeting", "present_offer", "accelerate_decision"],
  eligibleRecipientTypes: ["prospect", "partner", "active_client", "former_client"],
  requiresOffer: true,                      // via OFFER_REQUIRED_SCENARIOS, cf. ci-dessous
  requiredScopes: ["account"],
}
```

Et l'ajout de `"battle_situation_pitch"` à `OFFER_REQUIRED_SCENARIOS`
(`communication-scenario-registry.ts:1087`) — c'est ce `Set`, pas le champ du seed, qui pilote
réellement `requiresOffer` (`toScenarioDefinition` l'écrase : `requiresOffer:
OFFER_REQUIRED_SCENARIOS.has(seed.value)`).

| Paramètre | Valeur | Origine |
|---|---|---|
| `activityCategory` | `commerce_prospection` | Un scénario n'a qu'une catégorie statique. Voir §6.4. |
| `scope` / `requiredScopes` | `["account"]` | Battle part toujours d'un compte CRM (D6). |
| `outputKind` | `spoken_pitch` | Cadrage §9.1. |
| `channel` | `spoken_pitch_30s` | Seul canal de `OUTPUT_CHANNELS.spoken_pitch`. |
| `objective` | défaut `get_meeting` ; autorisés `get_meeting`, `present_offer`, `accelerate_decision` | Le configurateur change l'intention : objection → `accelerate_decision`, angle cross-sell → `present_offer`. Utilise le champ `allowedObjectives` du seed, déjà supporté. |
| `requiresOffer` | **`true`** | Cadrage §8.1/§9.1. Effet de bord décisif : `purgeIncompatibleReferences` supprimerait `offerRef` d'un brief `commerce_prospection` si l'offre n'était **ni requise ni optionnelle** (`optionalReferences` de la catégorie = `["signalRef","contactId"]` seulement). |
| `allowedLengths` | les 4, héritées de la catégorie | `allowedLengths` n'est pas surchargeable au niveau seed aujourd'hui. **Ne pas ajouter ce champ** : l'UI Battle expose `concise` / `standard` et le brief part avec `length: "concise"`. |
| `suggestedTones` | héritées : `direct`, `warm`, `business_roi` | Pas de surcharge — divergence gratuite. |
| `excludedTones` | héritées : `disappointed_confused` | — |
| `requiredReferences` | `["offerRef"]` | Calculé par le résolveur depuis `requiresOffer`. |
| `optionalReferences` | `["signalRef", "contactId"]` | Hérité de `CATEGORY_CONSTRAINTS.commerce_prospection`. |
| `requiredContextSources` | `["account_profile"]` | idem. |
| `optionalContextSources` | `["crm_contacts", "signal_intelligence", "offer_catalog"]` | idem. |

### 6.3 Ce que coûte réellement l'ajout — inventaire exhaustif

Mesuré par lecture des mappings, pas supposé :

| Fichier | Nature du changement | Réclamé par `tsc` ? |
|---|---|---|
| `src/lib/n8n/types.ts` | +1 valeur dans l'union `CommunicationScenario` | — (c'est la définition) |
| `src/lib/communication/communication-scenario-registry.ts` | +1 seed, +1 entrée dans `OFFER_REQUIRED_SCENARIOS` | non — mais indispensable |
| `src/lib/communication/communication-scenario-registry.test.ts:26` | `expect(ids).toHaveLength(92)` → **93** | **non — échec de test, pas de typecheck** |
| `n8n/workflows/intel-020-communication.manifest.json` | régénéré | non |
| `n8n/workflows/intel-020-communication.json` (bloc `MANIFEST` de `Assemble Prompt`) | ré-inliné | non |

**Aucun autre mapping n'est exhaustif sur `CommunicationScenario`.** Vérifié :
`SCENARIO_OPTIONS` est **dérivé** de `SCENARIO_REGISTRY` (`communication-brief-options.ts:63`),
`MULTI_OUTPUT_KINDS` est un `Partial<Record<…>>`, et le seul autre
`Record<CommunicationScenario, …>` du repo est ce `Partial`. Contrairement à
`intelligence_document_type` (qui casse le typecheck à 4 endroits, cf. `CLAUDE.md`), **ajouter un
scénario ne casse rien au typecheck — et c'est précisément le piège** : le seul garde-fou est le
test de compte et le `--check` du manifeste.

Commande de synchronisation (une seule) :

```bash
node scripts/generate-communication-manifest.mjs
```

Contrôle de non-dérive (à passer avant tout commit du lot 4) :

```bash
node scripts/generate-communication-manifest.mjs --check
```

### 6.4 Pourquoi `commerce_prospection` et pas une catégorie dynamique

Le cadrage §9.1 dit « catégorie commerciale dérivée du contexte compte ». **Ce n'est pas
réalisable** : `activityCategory` est une propriété statique d'un scénario dans le registre. Trois
options ont été pesées :

- deux scénarios (`…_pitch` prospection + `…_pitch_client` actif) → refusé, §14 « principe de
  légèreté » ;
- catégorie dynamique → refusé, exigerait de casser le modèle du registre ;
- **retenu :** une catégorie `commerce_prospection` + une surcharge `eligibleRecipientTypes` au
  niveau du seed (point d'extension **existant**, introduit au Lot 7 de l'ADR-0013) couvrant les
  quatre types commerciaux. Sans cette surcharge, `resolveCommunicationOptions` retomberait sur
  `definition.eligibleRecipientTypes[0]` et forcerait `recipientType: "prospect"` sur un compte
  client actif — faux, et visible dans le prompt.

Conséquence sans effet sur le livrable : `commerce_prospection` **et** `commerce_actif` sont
toutes deux dans `COMMERCIAL_CATEGORIES` du nœud `Prepare Callback` — le `result_type` reste
`commercial_pitch` dans les deux cas.

### 6.5 Effet de bord accepté

`battle_situation_pitch` apparaîtra dans le sélecteur générique du Composer
(`getScenarioPurposeGroups`, onglet « Élaborer un pitch », groupe Commerce · Prospection). Le
registre n'a **pas** de drapeau de masquage et en ajouter un serait une abstraction nouvelle
(§14). **Décision : on ne masque pas.** En contrepartie, le bloc de prompt du Lot 4 **doit
dégrader silencieusement** quand `brief.context.battleSituation` est absent (retour à la mission
template) — ce qui est de toute façon une exigence défensive. Point à réexaminer en QA au Lot 7
si Guillaume juge l'entrée confuse ; ce serait alors 4 lignes, pas une refonte.

---

## 7. Mapping Situation → `CommunicationBrief`

Le mode Situation construit un `CommunicationBrief` **complet et canonique**. Matrice champ par
champ :

| Dimension Situation | Champ du brief | Type | Notes |
|---|---|---|---|
| — | `what.channel` | `"spoken_pitch_30s"` | Imposé par `outputKind`. |
| — | `what.scenario` | `"battle_situation_pitch"` | — |
| — | `what.outputKind` | `"spoken_pitch"` | — |
| Longueur | `what.length` | `"concise"` (défaut) \| `"standard"` | UI n'expose que ces deux. |
| — | `what.activityCategory` | `"commerce_prospection"` | Depuis le registre. |
| — | `what.scope` | `"account"` | — |
| — | `who.sender.role` | `"business_manager"` | Défaut de `buildDefaultBrief`. |
| — | `who.sender.name` | `profiles.full_name` | Même lecture que `PitchMailDrawerContent` (`supabase.auth.getUser()` → `profiles`). |
| **Persona — contact CRM** | `who.recipient.contactId` | uuid `contacts.id` | **Chemin nominal.** |
| **Persona — contact CRM** | `who.recipient.displayName` | `persons.full_name` | Nom réel uniquement. |
| **Persona — contact CRM** | `who.recipient.persona` | énum `CommunicationPersona` | Via `personaFromJobTitle(jobTitle, relationshipRole)` — fonction existante de `communication-brief-options.ts`. |
| **Persona — fallback playbook** | `context.battleSituation.personaLabel` | texte | **Quand `contactId` est absent** (15/23 comptes). `persona` reste `"other"`. |
| — | `who.recipient.type` | `prospect` \| `partner` \| `active_client` \| `former_client` | Dérivé de `companies.lifecycle_status` par `recipientTypeFromLifecycle`. |
| — | `who.recipient.relation` | énum | `relationFromLifecycle`. |
| — | `who.recipient.companyName` | `actor.name` | — |
| Objectif | `who.objective` | `get_meeting` (défaut) | Dans `allowedObjectives`. |
| Ton | `how.tone` | `direct` (défaut) | Parmi `availableTones` du résolveur. |
| — | `how.formality` / `how.language` | `"vous"` / `"fr"` | Défauts. |
| **Offre** | `context.offerRef` | uuid `offers.id` | **Canonique. Jamais dans `battleSituation`.** Requis (`requiresOffer: true`). |
| **Knowledge** | `context.preferredCollectionIds` | `string[]` de `content_collections.id` | **Canonique.** Voir §9. |
| **Enjeu** | `context.battleSituation.issue` | `{id?, label, source}` | — |
| **Angle** | `context.battleSituation.angle` | `{label, source}` | — |
| **Timing** | `context.battleSituation.timing` | `{id?, label, source}` | Facultatif. |
| **Objection** | `context.battleSituation.objection` | `{label, response?}` | Facultatif. |
| **ROI** | `context.battleSituation.roiArgument` | texte | Facultatif. |
| — | `context.battleSituation.competitiveEntryId` / `.segmentId` | uuid | Traçabilité. |
| — | `context.mustInclude` / `.mustExclude` | **non utilisés par Battle** | Ne **pas** y replier la situation : ce serait perdre la structure et la provenance. |

### 7.1 Matrice des sources par paramètre Situation

Colonnes imposées par le cadrage du lot. « Source canonique » = le champ du `CommunicationBrief`
qui porte l'information (jamais `battleSituation` quand un champ canonique existe).

| Paramètre | Source canonique (brief) | Source compte | Source secteur | ID stable disponible | Fallback autorisé |
|---|---|---|---|---|---|
| **Persona** | `who.recipient.contactId` + `.displayName` + `.persona` | `contacts` × `persons` du compte (requête client, RLS) | `playbook.personas[].fonction` via `parsePlaybookPersonas()` | **Oui** côté compte (`contacts.id`) · **Non** côté secteur | **Oui** — `battleSituation.personaLabel` (texte) quand aucun contact CRM. **Cas majoritaire : 15/23 comptes.** |
| **Enjeu** | `context.battleSituation.issue` | `account_issues` (status `open`) — 12 lignes sur des comptes Battle | `v_sector_knowledge_items` → `knowledge.painPoints[]` (`sector_pain_points`) | **Oui des deux côtés** (`account_issues.id`, `sector_pain_points.id`) | **Non** — obligatoire. Si les deux sources sont vides, la génération est bloquée (aucun enjeu inventé). |
| **Angle** | `context.battleSituation.angle` | `competitive_map_entries.angle_entree` (**23/23 renseignés**) · `profile_json.traduction_commerciale` | `playbook.entry_points[]` via `parsePlaybookEntryPoints()` | **Non** — aucune des trois sources ne porte d'identifiant | **Non** — obligatoire, mais toujours satisfiable côté compte (`angle_entree` est universellement renseigné). |
| **Timing** | `context.battleSituation.timing` | `profile_json.trigger_events` (9/23 entrées) | `knowledge.regulatory[]` (`sector_regulatory_items`) · `knowledge.events[]` (`sector_events`) | **Non** côté compte · **Oui** côté secteur | **Oui** — champ facultatif, omis si aucune source. |
| **Objection** | `context.battleSituation.objection` | `profile_json.a_ne_pas_dire` = **lignes rouges, PAS des objections** — ne jamais confondre | `playbook.objections[]` via `parsePlaybookObjections()` | **Non** | **Oui** — champ facultatif. |
| **Offre** | **`context.offerRef`** (canonique) | `getSuggestedOffers(companyId)` → `get_pitch_context.suggestedPractices` / `deliveredPractices` | `knowledge.practicesFit` (indicatif d'affichage seulement) | **Oui** (`offers.id`) | **Non** — obligatoire (`requiresOffer: true`). |
| **ROI** | `context.battleSituation.roiArgument` | aucune source compte | `playbook.roi_arguments[]` via `parsePlaybookRoiArguments()` | **Non** | **Oui** — facultatif. **Aucun chiffre ne doit être fabriqué ni extrapolé** (cadrage §8.1). |
| **Knowledge** | **`context.preferredCollectionIds`** (canonique) | — | — | **Oui** (`content_collections.id`) | **Oui** — facultatif. |

**Trois règles de provenance à ne jamais assouplir :**

- `source: "sector"` désigne une **connaissance sectorielle** — une hypothèse applicable au
  segment, jamais un fait établi sur ce compte. L'UI l'étiquette `SECTEUR`, le prompt aussi.
- `source: "account"` désigne un **fait observé sur le compte** (`account_issues`,
  `angle_entree`, `trigger_events` de `profile_json`). L'UI l'étiquette `COMPTE`.
- `account_issues` porte en plus `evidence_level` (`observed` \| `inferred` \| `weak`) et
  `provenance` (`relational` \| `human_verified` \| `engine_researched` \| `folio_legacy` \|
  `inferred`). Un enjeu compte en `weak`/`inferred` **n'est pas un fait observé** : l'afficher
  comme tel contredirait R2 autant qu'un enjeu sectoriel présenté comme spécifique. À exposer
  en V1 au moins pour `evidence_level`.
- `knowledge.painPoints[].resolvedLevel` (`segment` \| `macro`) est une **troisième
  information**, orthogonale : elle dit si l'élément sectoriel vient du segment ou est hérité du
  macro parent. À conserver en V1 comme nuance d'affichage ; ne pas la replier dans
  `BattleSituationSource`, qui répond à une autre question.

**Règle de construction (L3) :** partir de `buildDefaultBrief({company, contacts,
communicationPreset:{scenario:"battle_situation_pitch", contactId, refs:{offerRef,
preferredCollectionIds, battleSituation}}}, senderName)`, puis passer par
`resolveCommunicationOptions(facts, brief, {scenario:"user"})` pour normaliser
canal/objectif/ton/longueur. Le `fieldSources.scenario = "user"` est **indispensable** : sans lui,
`preserveExplicitScenario` est faux et le résolveur peut basculer sur un autre scénario de la
catégorie.

---

## 8. Raccord INTEL-020

### 8.1 Point d'entrée exact

Aucun. **`POST /api/n8n/trigger` est la passerelle et elle accepte déjà le payload tel quel :**

```ts
await fetch("/api/n8n/trigger", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    workflowId: "intel-020-communication",
    entityType: "company",
    entityId: actor.companyId,
    companyId: actor.companyId,
    input: brief,               // CommunicationBrief complet
  }),
})
// → 202 { runId }
```

Preuve : `src/components/accounts-contacts/intelligence/IntelligenceActionDrawers.tsx:363-380`
fait exactement cela. La route ne connaît aucun scénario ; elle ne fait que trois choses sur
`intel-020-communication` : authentifier, résoudre le workspace, et **réécrire
`context.knowledgeScope.refs` côté serveur** (§9.3). `battleSituation` la traverse sans être lu.

Suivi du run : `useRunTracker({ runId, onSucceeded, onFailed, onTimeout })`
(`src/lib/n8n/use-run-tracker.ts`) — Realtime en accélérateur, sondage en garantie, arrêt à 5 min.
`onSucceeded` fournit `{ id (= resultId), contentJson (SpokenPitchOutput), qaFlags, title }`.

### 8.2 Le mode Situation appelle-t-il le Composer ou seulement ses primitives ?

**Ses primitives, jamais le Composer.** Trois raisons factuelles :

1. Le cadrage §10 impose que le résultat s'affiche **dans la même modale**. Le Composer rend son
   résultat dans son propre `AppDrawer` (`PitchMailDrawerContent` retourne `<PitchResult>` en
   remplacement du formulaire) — incompatible.
2. `openCommunicationComposer()` ouvre un `AppDrawer` (élément `<dialog>` natif, top layer) par
   dessus la modale Playbook : deux surfaces modales concurrentes, exactement le risque R4.
3. D8 l'exige : UI propre, **même contrat**. Or le contrat est atteignable sans le Composer —
   toutes les primitives nécessaires sont des fonctions pures ou des Server Actions exportées.

**Primitives à importer (aucune à modifier) :**

| Primitive | Fichier | Nature |
|---|---|---|
| `buildDefaultBrief` | `components/accounts-contacts/intelligence/communication-brief-options.ts` | fonction pure |
| `personaFromJobTitle`, `recipientTypeFromLifecycle`, `relationFromLifecycle` | idem | fonctions pures |
| `resolveCommunicationOptions` | `lib/communication/communication-options-resolver.ts` | fonction pure |
| `applyCommunicationPurposeToBrief` | `lib/communication/communication-purpose.ts` | fonction pure |
| `getScenarioRegistryItem` | `lib/communication/communication-scenario-registry.ts` | fonction pure |
| `getSuggestedOffers(companyId)` | `components/accounts-contacts/intelligence/get-suggested-offers.ts` | **Server Action** |
| `loadCommunicationContextForCurrentUser` | `lib/communication/communication-context-actions.ts` | **Server Action** (optionnel — voir note) |
| `useRunTracker` | `lib/n8n/use-run-tracker.ts` | hook client |
| `saveResultAsDocument({resultId})` | `components/accounts-contacts/intelligence/save-as-document.ts` | **Server Action** |
| `fetchCollectionsSummary` | `features/content-collections/data/content-collections-client-queries.ts` | requête client |
| `ManageCollectionsDesktop` / `ManageCollectionsMobile` | `features/content-collections/components/` | composants |
| `buildResultPresentationFromBrief` | `lib/communication/communication-result-documents.ts` | fonction pure (rendu du résultat) |

*Note sur `loadCommunicationContextForCurrentUser` :* elle appelle `get_communication_context` +
`get_pitch_context` **en service-role** pour produire des `facts` de résolution. Le mode Situation
peut s'en passer en V1 : il connaît déjà `lifecycle_status`, le contact et l'offre, donc peut
construire les `CommunicationContextFacts` localement. **Recommandation : s'en passer** — c'est un
aller-retour serveur de plus, sur des faits que la Battle Card possède déjà. Ne l'appeler que si
L3 découvre un besoin réel (à consigner dans son handoff).

*Contacts :* il n'existe **aucun helper exporté**. `CommunicationComposerHost.tsx:887-894` fait la
requête en ligne (`contacts` + embed `persons`, `order is_priority desc`, `limit 100`). A2
reproduira cette requête dans `battle-situation-*.ts` — RLS workspace, lecture client, patron
déjà utilisé ailleurs. Ne pas extraire le helper depuis le Host (zone non possédée).

### 8.3 Validations et résolutions automatiques déjà en place

| Où | Ce qui est validé |
|---|---|
| `resolveCommunicationOptions` (front) | scope → catégories → scénarios éligibles ; normalise `outputKind`, `objective`, `channel`, `length`, `tone`, `recipientType` et trace chaque `adjustment`. |
| `purgeIncompatibleReferences` (front, `communication-brief-form-model.ts:209`) | supprime `offerRef`/`opportunityRef`/`missionRef`/`profileRef`/`companyRef`/`collaboratorRef` non pertinents. **`battleSituation` et `preferredCollectionIds` ne sont pas dans `REFERENCE_CONTEXT_KEYS` : jamais purgés.** |
| `/api/n8n/trigger` | auth, workspace, `workflowId`+`input` présents, réécriture serveur de `knowledgeScope.refs`. |
| n8n `Validate Brief` | HMAC ; champs de payload ; `outputKind` canonique ; catégorie canonique ; **cohérence scope↔catégorie** ; `offerRef` si le scénario est dans son `SCENARIOS_REQUIRING_OFFER` ; références obligatoires par scope. **Ne valide PAS `scenario` contre une liste** — un scénario inconnu passe. |
| n8n `Quality Check` | ancrage contextuel (bloquant si contexte riche et zéro ancrage), exclusions utilisateur (bloquant), longueur, `ask` présent, engagement de prix. **Piloté par `outputKind`/`activityCategory`, jamais par `scenario` — aucune adaptation nécessaire.** |
| `/api/n8n/callback` | HMAC, champs obligatoires, run existant, run non annulé, upsert idempotent `UNIQUE(run_id, phase)`. |

### 8.4 Ce qu'il serait dangereux de dupliquer

- **`CommunicationBriefForm`** (1583 lignes) — D8. Le mode Situation n'en réutilise **rien** en
  JSX ; il réutilise les fonctions listées en §8.2.
- **La liste des scénarios exigeant une offre.** Elle existe **deux fois** :
  `OFFER_REQUIRED_SCENARIOS` (registre TS) et `SCENARIOS_REQUIRING_OFFER` (nœud n8n `Validate
  Brief`). Le SETUP.md §11 documente qu'elle a déjà dérivé une fois (3 scénarios oubliés).
  **A3 doit modifier les deux.**
- **Le résolveur.** Ne pas réimplémenter une normalisation « simplifiée » côté Battle : la cascade
  scope→catégorie→scénario→objectif→canal→ton est la seule garante de la cohérence du brief.
- **Le pipeline documentaire.** Aucun second bouton « Enregistrer » : le document existe déjà
  quand le résultat s'affiche (créé par le callback, §12).

---

## 9. Knowledge

### 9.1 Deux mécanismes, pas un — et ils ne font pas la même chose

| | `preferredCollectionIds` | `knowledgeScope` |
|---|---|---|
| Cardinalité | multi-sélection | **une seule** collection |
| Type | `string[]` (`content_collections.id`) | `{collectionId, kind, name, itemCount, refs?}` |
| Où sont résolues les références | **côté n8n**, nœud `Hydrate Context` (`resolvePersonalCollections`) | **côté serveur Next**, `/api/n8n/trigger` → `resolveKnowledgeScope` |
| Développe les références `knowledge_list` d'un Corpus | **NON** | **OUI**, sur un niveau |
| Clé injectée dans le contexte n8n | `ctx.personalCollections` | `ctx.knowledgeScope` |
| Rendu dans le prompt | `Assemble_Prompt.js:297-303`, **8 items max** | `Assemble_Prompt.js:305-309`, **12 items max** |
| Point d'entrée UI actuel | modale « Sources » de `CommunicationBriefForm` | onglet Connaissances, « Utiliser comme contexte » |

**Les deux sont réellement raccordés jusqu'au prompt** — rien n'est UI-only. Chaîne vérifiée bout
en bout pour `preferredCollectionIds` :

```
CommunicationBriefForm.toggleCollection()
  → brief.context.preferredCollectionIds
  → POST /api/n8n/trigger (traversé sans lecture)
  → n8n Hydrate Context : fetchRest('content_collection_items',
       {workspace_id: eq.<ws>, collection_id: in.(...)})     ← re-filtré workspace
    → dédup `${content_type}:${content_id}`
    → resolveEntriesForRefs → veille_articles | intelligence_documents
       (current_content_text tronqué à 300 car.)
  → ctx.personalCollections
  → Assemble Prompt, section « -- Listes personnelles -- » (8 items)
```

### 9.2 Ce que le mode Situation doit faire

**Réutiliser `preferredCollectionIds`, exactement comme `CommunicationBriefForm`.** Aucun
deuxième système Knowledge. Concrètement, trois éléments à recopier depuis
`CommunicationBriefForm` (lignes 391-393, 555-568, 770-777, 1313-1329) :

1. `fetchCollectionsSummary()` en **chargement paresseux** — jamais au montage de Situation, mais
   à l'ouverture du picker (le formulaire le fait à l'ouverture de la modale « Sources »).
2. `toggleCollection(id)` → `brief.context.preferredCollectionIds` (`undefined` si vide).
3. `<ManageCollectionsDesktop open onOpenChange={…}/>` (resp. `Mobile`) pour « Gérer la
   connaissance », avec `refreshPersonalCollections()` à la fermeture.

**Ne pas utiliser `knowledgeScope` en V1.** Il suppose une sélection unique venue de l'onglet
Connaissances et une resolution serveur dédiée ; le cadrage (§8.2) parle de « listes
personnelles », c'est-à-dire du premier mécanisme.

### 9.3 Deux limites à connaître (signalées, non corrigées par ce chantier)

- **`preferredCollectionIds` ne développe pas les Corpus contenant des Listes.** Dans
  `Hydrate Context`, `resolveEntriesForRefs` ignore silencieusement toute ref dont le
  `contentType` n'est pas dans `PERSONAL_COLLECTION_CONTENT_ADAPTERS` (`veille_article`,
  `intelligence_document`) — donc `knowledge_list` est écarté sans avertissement. Un utilisateur
  qui sélectionne un **Corpus** de Listes via `preferredCollectionIds` n'en recevra que les items
  directs. **Conséquence UI recommandée pour L3 :** le picker Battle affiche `kind` (Liste /
  Corpus) et `itemCount` — déjà présents dans `CollectionSummary` — sans prétendre couvrir les
  Listes imbriquées.
- **Plafond de 8 items** dans le prompt pour `personalCollections`. Sélectionner cinq listes
  volumineuses ne donne pas plus de matière. À dire à l'utilisateur plutôt qu'à contourner.

---

## 10. Supabase

### 10.1 Tables inspectées (lecture seule, `information_schema` + `pg_proc` + comptages)

| Table | Constat |
|---|---|
| `competitive_map_entries` | 23 colonnes. `company_id uuid NOT NULL`, `profile_json jsonb NOT NULL`, `segment_id uuid NULL`, `study_snapshot_date date NOT NULL`, `id uuid PK`. **Tout ce dont `BattleSituation` a besoin existe.** |
| `ai_intelligence_runs` | `run_type text NOT NULL`, **`input_snapshot jsonb NOT NULL`**, `primary_entity_type/id`, `company_id`. Le brief entier (donc `battleSituation`) y est persisté par `createRun`. |
| `ai_intelligence_results` | `content_json jsonb NOT NULL`, `result_type text NOT NULL`, `phase smallint NOT NULL`, `qa_flags`, `source_refs`, `context_snapshot`, `title`. `UNIQUE(run_id, phase)`. |
| `intelligence_documents` | `source_result_id` → `ai_intelligence_results.id` (FK) — **c'est la clé de rattachement résultat↔document**. `brief_json` reçoit `run.input_snapshot`. |
| `intelligence_document_versions` | Historique append-only, alimenté par `saveAsDocumentWithClient`. Rien à faire. |
| `intelligence_document_links` | Alimentée par `buildDocumentEntities` : `company` (primaire), `contact` (depuis `recipient.contactId`), etc. `competitiveEntryId` n'est **pas** un `IntelligenceEntityType` → aucun lien créé, la traçabilité passe par `brief_json`. **C'est suffisant et voulu.** |
| `content_collections` | `id, workspace_id, created_by, name, description, kind, item_type`. |
| `content_collection_items` | `id, workspace_id, collection_id, content_type, content_id, added_by, position`. |

### 10.2 RPC inspectées

| RPC | Signature | Constat |
|---|---|---|
| `get_communication_context` | `(p_workspace_id, p_company_id, p_contact_id, p_opportunity_id, p_mission_id) → jsonb`, `LANGUAGE sql STABLE`, `SECURITY INVOKER`, `search_path='public'` | Retourne `company`, `contact` (**un seul**, par `p_contact_id`), `recentInteractions`, `activeOpportunities`, `activeMissions`, `sectorIntelligence`, `sectorNews`, `previousCommunications`. **Ne retourne PAS la liste des contacts du compte.** |
| `get_pitch_context` | `(p_workspace_id, p_company_id, p_offer_id, p_opportunity_id, p_mission_id) → jsonb` | Retourne `company`, `offer`, `pricingGrid`, `engagementTypes`, `deliveredPractices`, `suggestedPractices`, `anchorOpportunity`, `activeOpportunities`, `anchorMission`, `activeMissions`, `recentInteractions`, `sectorIntelligence`, `sectorNews`, `legacyPitches`, `previousPitches`. |

### 10.3 🔴 Divergence de maille sectorielle — à connaître, pas à corriger ici

Les deux RPC résolvent la connaissance sectorielle par :

```sql
join public.companies c on c.sector_id = si.id     -- MACRO
```

Or `CLAUDE.md` pose que « la connaissance sectorielle d'un compte se lit par
`companies.segment_id`, jamais par `companies.sector_id` ». **Le contexte que n8n injecte dans le
prompt est donc à la maille MACRO**, tandis que le Playbook et la Battle Card affichent la maille
SEGMENT (`v_sector_knowledge_resolved`).

Mesure live sur les 23 comptes de cartographie : **23/23 ont `sector_id`, 23/23 ont `segment_id`,
23/23 ont un `playbook` macro non vide.** La divergence est donc systématique, pas marginale.

**Trois conséquences, toutes déjà absorbées par le contrat proposé :**

1. `battleSituation` porte des **snapshots texte** — le prompt n'a jamais à re-dériver l'enjeu ou
   l'angle depuis le contexte hydraté.
2. `battleSituation.segmentId` conserve la maille réelle dans la trace du run.
3. Le prompt du Lot 4 doit poser **explicitement** que les choix de Situation priment sur le
   contexte hydraté (déjà exigé par §9.3 du cadrage — cette divergence en est la justification
   technique).

**Corriger ces RPC est hors périmètre** : elles servent tous les scénarios INTEL-020 et leur
modification serait une régression potentielle sur 92 scénarios. À inscrire comme dette dans le
handoff final.

### 10.4 Réalité des données (live, 2026-08-23)

```
competitive_map_entries : 23 lignes · 3 segments · 5 profile_json vides
```

| Segment | Entrées | `profile_json` vide | `trigger_events` | `traduction_commerciale` | `couche_esn` | `a_ne_pas_dire` | Comptes avec contact CRM | Snapshot |
|---|---|---|---|---|---|---|---|---|
| Compositions & ingrédients B2B | 8 | 0 | 8 | 8 | 8 | 8 | 5 | 2026-08-14 |
| Spatial, défense & systèmes critiques | 10 | 0 | 1 | 0 | 0 | 1 | 2 | 2026-08-10 |
| Hébergement & résidences de tourisme | 5 | **5** | 0 | 0 | 0 | 0 | 1 | 2026-08-10 |

Autres compteurs : `account_issues` = 46 (8 comptes), dont **12 sur des comptes Battle** ;
`account_signals` sur comptes Battle = 125 ; `offers` = 41 ; `angle_entree` renseigné sur **23/23**.

**Ce que cela impose au cadrage :**

- La note dit « la majorité des entrées disposent d'un `profile_json` exploitable » (§4.2).
  **C'est vrai d'un segment sur trois.** Un seul segment permet une démonstration riche.
- **15 comptes sur 23 n'ont aucun contact CRM.** Le « fallback persona Playbook » de §8.1 n'est
  pas un cas dégradé : c'est le chemin majoritaire. Il doit être traité en première classe dans
  l'UI de L3, pas en état d'erreur.
- `angle_entree` est renseigné partout → l'angle obligatoire est toujours satisfiable.

**Jeux d'essai désignés pour le Lot 7 (E2E) :**

| Cas | Compte | `company_id` | Profil |
|---|---|---|---|
| **A — Battle Card riche** | Robertet (Compositions & ingrédients B2B) | `67b346ff-68c8-4f36-a510-13024955856f` | `profile_json` complet, 5 enjeux ouverts, 12 contacts |
| **A bis** | Voyage Privé | `e5f8fd19-7433-4e44-b759-400f4256545d` | 6 enjeux, 6 contacts |
| **B — Battle Card partielle** | Payan Bertrand ou Aromatech Group | `d1856994-…` / `dc5f1670-…` | profil renseigné, **1 seul contact** |
| **B bis — sans contact** | n'importe quel acteur « Spatial, défense » hors Exail/ACRI-ST | — | 0 contact → fallback persona obligatoire |
| **C — aucune Battle Card exploitable** | les 5 entrées « Hébergement & résidences de tourisme » | — | `profile_json = '{}'` → état vide, aucune génération fantôme |

### 10.5 Conclusion

> ## **Migration Supabase nécessaire : NON**

Justification factuelle :
1. `battleSituation` est porté par `ai_intelligence_runs.input_snapshot` (`jsonb NOT NULL`),
   alimenté par `createRun` avec le brief tel quel — **aucune colonne à ajouter**.
2. `commercial_pitch` existe déjà dans l'énum `intelligence_document_type` (24 valeurs) et dans
   `RESULT_DOCUMENT_TYPE_BY_RESULT_TYPE` — **aucune valeur d'énum à créer**, donc aucun des
   8 sites de patch documentés dans `CLAUDE.md` n'est concerné.
3. Le rattachement au compte est assuré par `intelligence_documents` (primaryEntity `company`
   depuis `run.primary_entity_type/id`) et par `intelligence_document_links` — **déjà branché**.
4. La situation est conservée et auditable via `intelligence_documents.brief_json`
   (= `run.input_snapshot`) — **aucune table de session Battle**.
5. Toutes les données de Situation sont lisibles depuis des tables existantes :
   `competitive_map_entries`, `account_issues`, `sector_pain_points` / `sector_regulatory_items` /
   `sector_events` (via `v_sector_knowledge_*`), `contacts`/`persons`, `offers`,
   `content_collections`.

---

## 11. n8n

> ## **Nouveau workflow : NON**

`intel-020-communication` (16 nœuds) traite le scénario sans changement structurel.

### 11.1 Ce qui fonctionne déjà sans aucune modification

| Nœud | Pourquoi il est compatible d'emblée |
|---|---|
| `Webhook` / `Verify Signature` | Plomberie HMAC inchangée. |
| **`Validate Brief`** | **Ne valide pas `scenario` contre une liste.** Il valide `outputKind`, `activityCategory` (6 canoniques), `scope`, la cohérence scope↔catégorie, et `offerRef` via son propre `SCENARIOS_REQUIRING_OFFER`. Un scénario inconnu passe. |
| `Update Run Status` | Générique. |
| **`Hydrate Context`** | Routé par `scope` (`account`) → `hydrateAccount()` : `get_communication_context` + `get_pitch_context` (déclenché parce que `requiresOffer` est vrai). Résout déjà `preferredCollectionIds` → `ctx.personalCollections`. |
| `Resolve Sender` | Générique. |
| `Call LLM` / `Parse & Validate Output` | Pilotés par `outputKind` (`spoken_pitch` → `SPOKEN_SCHEMA`). |
| **`Quality Check`** | Pilote sur `outputKind` + `activityCategory`, jamais sur `scenario`. Les cibles de mots pour `concise` (90-220) s'appliquent telles quelles. |
| **`Prepare Callback`** | `resultType = isPitch && COMMERCIAL_CATEGORIES.includes(activityCategory) ? 'commercial_pitch' : …`. Avec `commerce_prospection`, **`commercial_pitch` est produit automatiquement**. `phase: 5`. Le titre est construit par `humanizeScenario()` → « Pitch oral — Battle Situation Pitch ». |
| `Sign Callback` / `Callback` / branche d'échec | Inchangés. |

### 11.2 Changements strictement nécessaires au Lot 4

**Trois, tous dans `n8n/workflows/intel-020-communication.json` :**

1. **`Assemble Prompt` — bloc `MANIFEST` régénéré.** Pas édité à la main :
   `node scripts/generate-communication-manifest.mjs` réécrit à la fois
   `intel-020-communication.manifest.json` et le bloc inliné entre
   `// MANIFEST:START` / `// MANIFEST:END`. Sans cela, `manifestEntry` est `null` et
   `buildTemplateMission(null)` produit une mission vide.
2. **`Assemble Prompt` — mission flagship + rendu de la situation.**
   - une entrée `battle_situation_pitch` dans `FLAGSHIP_MISSIONS` (préséance des choix
     structurés, timing/objection intégrés naturellement, lien avec l'offre, **aucun chiffre ni
     ROI inventé**, pitch oral exploitable — cadrage §9.3) ;
   - une section de contexte rendant `brief.context.battleSituation`, **avec dégradation
     silencieuse quand le bloc est absent** (§6.5). C'est **indispensable** : le prompt actuel ne
     lit de `brief.context` que `mustInclude` et `mustExclude` — sans ce bloc, les six dimensions
     de Situation n'atteignent jamais le modèle.
   - la section doit **étiqueter la provenance** : `source: "sector"` rendu comme hypothèse
     sectorielle, `source: "account"` comme fait du compte (§10.3).
3. **`Validate Brief` — `SCENARIOS_REQUIRING_OFFER` += `'battle_situation_pitch'`**, pour rester
   le miroir de `OFFER_REQUIRED_SCENARIOS`. La dérive de cette paire de listes est un incident
   déjà survenu (SETUP.md §11).

**Plomberie explicitement non touchée :** webhook, HMAC, callback, cycle de vie du run, routage
des résultats, variables d'environnement.

**Nouvelle variable d'environnement n8n : aucune.**

### 11.3 Validation exigée au Lot 4 (AGENTS.md + roadmap §10.5)

```bash
node --check <chaque nœud Code modifié extrait>
node n8n/workflows/__tests__/intel-020-communication.test.js   # lire le compteur final
node scripts/generate-communication-manifest.mjs --check
npm run test:n8n
npm run n8n:status                                              # informatif
```

⚠️ `CLAUDE.md` : **lire le compteur final du harnais, jamais le seul code de sortie** — une
exception dans un nœud Code fait sauter les assertions restantes en silence.

Cas à couvrir : payload nominal · `timing`/`objection`/`roiArgument` absents · `battleSituation`
**totalement absent** (dégradation) · `offerRef` absent (rejet attendu) · sortie valide · sortie
invalide · **non-régression d'au moins un scénario de chaque famille** (`signal_outreach` écrit,
`cold_call_pitch` oral commercial, `sector_persona_pitch` briefing).

### 11.4 Import VPS

**Requis : OUI**, manuellement par Guillaume, après le Lot 4.
Fichier : `n8n/workflows/intel-020-communication.json`.
`n8n/workflows/intel-020-communication.SETUP.md` doit recevoir une section « Lot — Battle
situation pitch » décrivant le changement et la procédure de test avant activation.
⚠️ `npm run n8n:status` **ne détectera pas cette dérive** : il compare des compteurs de nœuds, or
seul du code interne change.

---

## 12. Pipeline documentaire

### 12.1 Chaîne complète, vérifiée nœud par nœud

```
n8n Prepare Callback
  resultType = 'commercial_pitch'         ← dérivé de activityCategory, pas configuré
  phase = 5 · title = 'Pitch oral — Battle Situation Pitch'
       ↓ HMAC
POST /api/n8n/callback
  ├─ verifyHmac
  ├─ lecture du run (company_id, workspace_id, owner_id, run_type, input_snapshot)
  ├─ portail account_knowledge : non concerné
  ├─ portail mission (isMissionRunType) : non concerné (run_type = 'intel-020-communication')
  ├─ saveResult(...)                       → ai_intelligence_results  → resultId
  ├─ updateRunStatus('succeeded', {phase})
  ├─ materializeAccountIssues : non concerné
  ├─ isEligibleDocumentResultType('commercial_pitch') === true
  │    → saveResultAsDocumentWithSupabaseClient(supabase, resultId)
  │        mapResultTypeToDocumentType('commercial_pitch') = 'commercial_pitch'
  │        buildCommunicationDocumentTitle(...)   ← préfixe « Pitch oral — <scénario> »
  │        buildDocumentEntities(...)             ← primaryEntity company + link contact
  │        briefJson = run.input_snapshot         ← contient battleSituation
  │        → intelligence_documents (source_result_id = resultId)
  │        → intelligence_document_versions
  │        → intelligence_document_links
  └─ revalidatePath(`/prospection/accounts/<company_id>`)
```

**Le document existe donc déjà** au moment où `useRunTracker` livre le résultat à l'UI. Aucun
second mécanisme de sauvegarde. D7 tient sans code supplémentaire.

### 12.2 Réponses opérationnelles

| Question | Réponse |
|---|---|
| Quel `result_type` ? | **`commercial_pitch`** — produit automatiquement, jamais à configurer. |
| Quel `document_type` ? | **`commercial_pitch`** — déjà dans l'énum. Aucune migration, aucun des 8 sites de patch d'énum. |
| Comment récupérer le `documentId` ? | **`saveResultAsDocument({ resultId })`** — Server Action existante, **idempotente** : si le document existe (cas nominal, créé par le callback), elle le retrouve par `source_result_id` et renvoie `{success:true, documentId, alreadyExists:true}` **sans rien écrire**. |
| Le frontend peut-il connaître automatiquement le document ? | **Oui, sans nouvelle API.** `useRunTracker.onSucceeded` fournit `resultId` ; un appel à `saveResultAsDocument({resultId})` renvoie le `documentId`. Appel unique, à la première ouverture du CTA (ou au succès du run si l'on veut afficher le statut « enregistré » tout de suite). |
| CTA « Ouvrir dans Rapports » ? | `router.push(\`/reports?doc=${documentId}\`)`. Patron confirmé : `ReportsDesktopView`, `VeilleActualitesDesktop:1253`, `PitchDocumentDialog:61`, et `reports/page.tsx:82` lit `searchParams.doc`. |
| Modification du callback nécessaire ? | **NON.** |
| Nouvelle route API nécessaire ? | **NON.** |

### 12.3 Comportement de la régénération

`saveResult` est un upsert sur `UNIQUE(run_id, phase)`. Une **régénération = un nouveau run**,
donc un nouveau `resultId` et un nouveau document. C'est le comportement canonique de tout
INTEL-020 ; **ne pas le modifier** pour Battle.

---

## 13. Ownership des lots suivants

Règle : **un seul agent écrivain par fichier à un instant donné.** Les zones ci-dessous sont
disjointes par construction.

### A1 — Frontend Workspace (L1 shell/flip, L2 Révision)

**Autorisé en écriture**
```
src/features/business-intelligence/playbooks/SectorPlaybooksModal.tsx
src/features/business-intelligence/playbooks/BattleCardsSection.tsx
src/features/business-intelligence/playbooks/Battle{Workspace,AccountRail,ModeSwitcher,Revision}*.tsx   (nouveaux)
src/features/business-intelligence/__tests__/sector-playbooks-modal.test.ts
```
**Interdit** : `src/lib/**`, `n8n/**`, `src/features/competitive-map/**`, `src/components/**`,
Supabase.

**Condition sur le shell partagé** : `src/components/intelligence/IntelligenceSplitModalShell.tsx`
n'est modifiable **que** si un besoin générique est démontré et inscrit au handoff. Il est utilisé
par **12 modales** — le modifier est une décision A0. Le flip et le bouton « Revenir au Playbook »
n'en ont pas besoin : le shell expose déjà `headerActions` / `headerRightActions` / `content` et
porte déjà `motion-reduce:` sur ses transitions.

**Contrat de sortie de L1 attendu par A2** : `SectorPlaybooksModal` expose un point de montage
pour la vue Situation (prop ou slot rendu par A1), de sorte qu'**A2 n'ait jamais à écrire dans
`SectorPlaybooksModal.tsx`**. Sans cela, L3 et L1/L2 entrent en collision — c'est le seul
recouvrement que la roadmap laissait ouvert (elle liste ce fichier à la fois en L1 et en L3).

### A2 — Situation & contrats (L3 configurateur, L5 résultat/Rapports)

**Autorisé en écriture**
```
src/features/business-intelligence/playbooks/battle-situation-contract.ts        (nouveau)
src/features/business-intelligence/playbooks/battle-situation-options.ts         (nouveau, résolveurs purs)
src/features/business-intelligence/playbooks/battle-situation-brief.ts           (nouveau, construction du brief)
src/features/business-intelligence/playbooks/BattleSituation*.tsx                (nouveaux)
src/features/business-intelligence/playbooks/BattlePitchResult*.tsx              (nouveaux)
src/features/business-intelligence/playbooks/__tests__/battle-situation-*.test.ts (nouveaux)
```
**Import autorisé, modification interdite** : `src/lib/communication/**`,
`src/components/accounts-contacts/intelligence/{communication-brief-options,get-suggested-offers,save-as-document}.ts`,
`src/lib/n8n/use-run-tracker.ts`, `src/features/content-collections/**`.

**Interdit en écriture** : `src/lib/n8n/types.ts`, `communication-scenario-registry.ts`,
`n8n/**`, `SectorPlaybooksModal.tsx` (A1), toute migration.

**Point d'articulation L3→L4** : `BattleSituation` est déclaré **par A2 au L3** dans
`battle-situation-contract.ts` (type pur, aucun import runtime). **A3 au L4** ajoute une seule
ligne à `CommunicationBrief["context"]` avec `import type`. Précédent identique dans le fichier :
`n8n/types.ts` importe déjà `AccountClassificationProposal` et `CorpusBudget` depuis
`@/features/**`. **L3 est donc livrable et testable avant L4**, avec un `battleSituation` typé
localement et transmis dans `context` via un cast documenté et localisé, retiré par A3.

### A3 — INTEL-020 / n8n (L4)

**Autorisé en écriture**
```
src/lib/n8n/types.ts                                        (+1 valeur d'union, +1 champ context)
src/lib/communication/communication-scenario-registry.ts     (+1 seed, +1 entrée OFFER_REQUIRED_SCENARIOS)
src/lib/communication/communication-scenario-registry.test.ts (92 → 93)
n8n/workflows/intel-020-communication.json
n8n/workflows/intel-020-communication.manifest.json          (généré, ne pas éditer à la main)
n8n/workflows/intel-020-communication.SETUP.md
n8n/workflows/__tests__/intel-020-communication.test.js
```
**Interdit** : tous les composants Battle, `src/features/business-intelligence/**` (sauf lecture
de `battle-situation-contract.ts`), toute migration, tout déploiement VPS.

**Reviewer obligatoire** : A5 ou un agent distinct (§15.5 du cadrage, §10 de la roadmap).

### Zones à un seul écrivain sur tout le chantier

`src/lib/n8n/types.ts` · `communication-scenario-registry.ts` ·
`n8n/workflows/intel-020-communication.json` → **A3 uniquement**.
`SectorPlaybooksModal.tsx` · `BattleCardsSection.tsx` → **A1 uniquement**.

---

## 14. Risques et points non résolus

### R-A · Imbrication de deux `IntelligenceSplitModalShell` — **problème réel, pas hypothétique**

`ManageCollectionsDesktop` **est lui-même** un `IntelligenceSplitModalShell`. L'ouvrir depuis le
Battle Workspace (déjà dans un `IntelligenceSplitModalShell`) crée une imbrication **qui n'existe
nulle part dans le repo aujourd'hui** : les 6 sites qui montent `ManageCollections*` le font depuis
un `AppDrawer` (`<dialog>` natif) ou depuis une page.

Le shell installe son écouteur sur **`window`** (`IntelligenceSplitModalShell.tsx:71-93`) :

- **Escape** → les deux écouteurs se déclenchent → `onClose()` des **deux** modales →
  la modale Playbook se ferme sous la modale Knowledge. Régression directe du critère
  « Escape/focus trap restent fonctionnels ».
- **Tab** → le shell interne n'étant pas porté par un portail, son DOM est **contenu** dans le
  `dialogRef` du shell externe : les deux `dialogRef.contains(activeElement)` sont vrais, les deux
  handlers calculent une destination et appellent `preventDefault()` + `focus()` → sauts de focus
  concurrents.
- `document.body.style.overflow` : sauvegarde/restauration bénignes.

**Piste recommandée à A2 (L3), à valider avant d'écrire :** privilégier un picker **léger et
inline** dans Situation (le cadrage R4 le dit déjà) et ne monter `ManageCollections*` que sur
demande explicite ; si l'imbrication reste nécessaire, la solution la plus légère est que le shell
externe **cesse d'écouter tant qu'un enfant modal est ouvert** — ce qui suppose de toucher au shell
partagé, donc **arbitrage A0**. Ne pas décider seul (roadmap §17.4).

### R-B · `brief.context.angle` est du code mort

Producteurs : aucun. Lecteurs : aucun, y compris `Assemble Prompt`. Un agent qui s'y fierait
verrait l'angle disparaître **sans aucune erreur**. Traité par le contrat §5 ; signalé ici pour
que personne ne « corrige » `battleSituation` en le repliant dans ce champ.

### R-C · Divergence de maille sectorielle macro/segment (§10.3)

Absorbée par les snapshots texte et `segmentId`. Reste une dette réelle des deux RPC, à consigner
au handoff final. **Ne pas la corriger dans ce chantier** — elle porte sur 92 scénarios.

### R-D · Ajouter un scénario ne casse pas le typecheck

Contrairement à `intelligence_document_type`. Les seuls garde-fous sont
`communication-scenario-registry.test.ts:26` et `generate-communication-manifest.mjs --check`.
Les deux doivent figurer dans la boucle de validation de L4, explicitement.

### R-E · Double liste « scénarios exigeant une offre »

`OFFER_REQUIRED_SCENARIOS` (TS) et `SCENARIOS_REQUIRING_OFFER` (n8n `Validate Brief`). Déjà
dérivées une fois. A3 doit modifier les deux dans le même lot.

### R-F · Matière réelle très inégale (§10.4)

Un seul segment sur trois permet une démonstration riche ; 15/23 comptes sans contact CRM. Le
fallback persona et les états vides ne sont pas des cas limites : ils **sont** l'expérience
majoritaire aujourd'hui. À concevoir comme tels en L2/L3, pas à traiter en erreur.

### R-G · Plafonds de contexte

`personalCollections` : 8 items dans le prompt. `knowledgeScope` : 12. Sélectionner davantage
n'apporte rien. À exposer honnêtement à l'utilisateur.

### Non résolu, laissé ouvert volontairement

- **Ergonomie du picker Knowledge dans Situation** (inline vs modale complète) — dépend de R-A.
  Tranché par A2 au L3, à documenter dans son handoff.
- **Faut-il appeler `loadCommunicationContextForCurrentUser` ?** Recommandation : non (§8.2). Si
  L3 démontre le contraire, l'inscrire au handoff.

---

## 15. Gate L1 · L2 · L3

| Lot | Verdict | Justification |
|---|---|---|
| **L1 — Shell Battle + flip** | **GO** | `SectorPlaybooksModal` et `BattleCardsSection` inchangés depuis la baseline. Le shell expose `headerActions`/`headerRightActions`/`content` et porte déjà `motion-reduce:` : le flip et le retour se font **sans le modifier**. `competitiveActors` et le segment arrivent déjà en props depuis les deux hôtes (D5 gratuit). Aucune donnée nouvelle, aucune dépendance d'animation. |
| **L2 — Refonte Révision** | **GO** | 100 % des champs des sections cibles existent dans `CompetitiveMapActor.details` (`triggers`, `traductionCommerciale`, `coucheEsn`, `lignesRouges`, `chantiersTechnologiques`, `trous`) + `angleEntree`/`forces`/`vulnerability`/`confidence`. Zéro fetch. **Condition ferme :** les états vides ne sont pas décoratifs — un segment entier (`Hébergement & résidences de tourisme`, 5 entrées) a `profile_json = '{}'`, un autre (`Spatial, défense`) n'a quasiment aucune section. Les tester en priorité, pas en dernier. |
| **L3 — Configurateur Situation** | **GO sous condition** | Contrat figé (§5), sources de données identifiées et mesurées (§7.1, §10.4), primitives exportées et réutilisables (§8.2), Knowledge tracée jusqu'au prompt (§9). **Trois conditions :** (a) `BattleSituation` déclaré dans `battle-situation-contract.ts` **par A2**, pas dans `n8n/types.ts` (A3 l'y branche au L4) ; (b) le chemin **sans contact CRM** est traité en première classe — 15/23 comptes ; (c) l'ouverture de `ManageCollections*` depuis la modale **ne doit pas être écrite avant l'arbitrage R-A**. Le CTA reste inactif (mock local) : L3 ne déclenche aucun LLM. |
| **L4 — INTEL-020 / n8n** | **GO après L3** | Contrat de scénario figé (§6), inventaire de patch exhaustif (§6.3), changements n8n délimités (§11.2). Attend le shape définitif produit par L3. |
| **L5 — Résultat & Rapports** | **GO après L4** | Pipeline documentaire entièrement existant (§12). Le lot doit **d'abord tester l'existant** : le document est déjà créé par le callback. |

**Parallélisation autorisée immédiatement :** A1 sur L1 ; A5 peut préparer la matrice de tests
avec les `company_id` de §10.4. **A2 ne démarre L3 qu'après le handoff L1** (point de montage
dans `SectorPlaybooksModal`).

---

## 16. Écarts au cadrage

Cinq, tous factuels, aucun n'invalide le GO.

1. **§9.1 « catégorie commerciale dérivée du contexte compte » — non réalisable tel quel.**
   `activityCategory` est statique dans le registre. Remplacé par : catégorie
   `commerce_prospection` + surcharge `eligibleRecipientTypes` au niveau du seed (§6.4). Effet
   métier nul sur le livrable : `commercial_pitch` est produit dans les deux cas.

2. **§9.2 — le shape proposé est incomplet.** Il manquait la provenance sur `issue` *et* sur
   `angle`/`timing` (exigée par §8.1 et R2), et `segmentId` (rendu nécessaire par §10.3). Il
   supposait aussi `angle: string` alors que `context.angle` est mort (R-B). Contrat corrigé
   au §5.

3. **§4.2 « la majorité des entrées disposent d'un `profile_json` exploitable » — inexact.**
   5 entrées sur 23 ont `profile_json = '{}'`, et un seul segment sur trois est réellement
   renseigné (§10.4). Sans conséquence sur l'architecture ; conséquence directe sur la conception
   des états vides et sur l'ordre des tests.

4. **§8.1 « Fallback persona si aucun contact précis » — présenté comme un cas limite, c'est le
   cas majoritaire.** 15 comptes sur 23 n'ont aucun contact CRM. D'où `personaLabel` en champ de
   première classe (§5.2) plutôt qu'un repli d'affichage.

5. **§11 « le retournement est une transition de mode » — compatible, mais l'écouteur `window` du
   shell est un angle mort du cadrage.** Le flip lui-même ne pose aucun problème ; l'imbrication
   de deux shells (Battle + Knowledge) en pose un, réel et vérifié (R-A). Le cadrage l'anticipait
   partiellement en R4 (« double modale / focus trap ») sans en identifier la cause.

**Aucun écart sur les invariants D1→D9 :** aucune table, aucun workflow, aucun moteur de
rédaction, aucune duplication du Composer, aucune seconde source de vérité BI, aucune route API.

---

## 17. Data / Supabase (format handoff roadmap §4)

- **Lecture effectuée :** oui — `information_schema.columns` (3 tables), `pg_proc` (2 RPC, corps
  intégral de `get_communication_context`, clés de sortie de `get_pitch_context`), comptages sur
  `competitive_map_entries`, `contacts`, `account_issues`, `account_signals`, `offers`,
  `companies`, `sector_intelligence`.
- **Écriture :** **aucune.** Aucun `INSERT`/`UPDATE`/`DELETE`/`ALTER`/`CREATE` n'a été émis.
- **Migration :** **non.**
- **Justification :** §10.5, cinq points.
- **Dette signalée (hors périmètre) :** `get_communication_context` et `get_pitch_context`
  résolvent la connaissance sectorielle par `companies.sector_id` (macro) alors que la doctrine du
  projet impose `segment_id`. Concerne les 92 scénarios INTEL-020, pas seulement Battle. À
  consigner dans `HANDOFF-FINAL-DYNAMIC-PLAYBOOKS.md`.

---

## 18. n8n (format handoff roadmap §4)

- **Modifié :** **non** — audit read-only.
- **Workflow concerné :** `intel-020-communication` **uniquement**. Aucun autre.
- **Nouveau workflow :** **non.**
- **Changements prévus au Lot 4 :** manifeste régénéré · mission flagship + rendu de
  `battleSituation` dans `Assemble Prompt` (avec dégradation silencieuse) ·
  `SCENARIOS_REQUIRING_OFFER` dans `Validate Brief`. Aucune modification de la plomberie
  (webhook, HMAC, callback, cycle de vie, routage des résultats).
- **Nouvelle variable d'environnement :** **aucune.**
- **Import VPS requis :** **oui, après le Lot 4**, manuellement par Guillaume.
  ⚠️ `npm run n8n:status` ne détecte pas cette dérive (compteurs de nœuds identiques).

---

## 19. Tests et vérifications exécutés

Tous read-only. État de référence du chantier :

| Commande | Résultat |
|---|---|
| `git rev-parse HEAD` | `95c0762c7c210a7c4886211410925ddfa5df29c3` |
| `git status --porcelain` | 4 suppressions de docs, aucun fichier applicatif |
| `git log --oneline 2464e0c9..HEAD` | 6 commits, 42 fichiers, +3420/−448 |
| `npm run typecheck` | ✅ **vert** (aucune sortie) |
| `npx vitest run src/lib/communication src/features/business-intelligence/__tests__/sector-playbooks-modal.test.ts` | ✅ **13 fichiers, 171 tests passés** |
| `node n8n/workflows/__tests__/intel-020-communication.test.js` | ✅ **118 passed, 0 failed** (compteur final lu, conformément à `CLAUDE.md`) |
| `node scripts/generate-communication-manifest.mjs --check` | ✅ **« Manifeste synchronisé (92 scénarios) »** |
| MCP Supabase — `information_schema` / `pg_proc` / comptages | 6 requêtes `SELECT`, **zéro écriture** |

`npm run build`, `npm run lint` et `npm run check:server-boundary` n'ont pas été exécutés :
aucun fichier applicatif n'a été modifié par ce lot, ils ne diraient rien de plus que le
typecheck. Ils redeviennent obligatoires dès L1.

**Après le Lot 4, la boucle de validation devient :**
```bash
npm run typecheck && npm test && npm run check:server-boundary && npm run lint && npm run build
node scripts/generate-communication-manifest.mjs --check
npm run test:n8n
```

---

## 20. Commit

**Message :** `docs(dynamic-playbooks): lot 0 audit contract`
**Parent :** `95c0762c7c210a7c4886211410925ddfa5df29c3`
**Contenu :** ce fichier **uniquement**. Aucun fichier applicatif, aucune migration, aucun
workflow — conformément à la contrainte read-only du lot.

Le SHA est communiqué avec la livraison du lot. Pour le retrouver depuis le dépôt :

```bash
git log --oneline -1 -- docs/FEATURES/DYNAMIC_PLAYBOOKS/HANDOFF-LOT-0-AUDIT-CONTRAT.md
```

---

## Annexe — Instructions pour l'agent suivant (A1, Lot 1)

1. Relire `AGENTS.md`, les sections « Adaptive Design » et « Design System » de `CLAUDE.md`, la
   note de cadrage, la roadmap, puis ce handoff.
2. Vérifier le HEAD réel : s'il a dépassé `95c0762c`, contrôler que
   `src/features/business-intelligence/playbooks/**` n'a pas bougé.
3. Lire **avant d'écrire** : `SectorPlaybooksModal.tsx` (557 l.), `BattleCardsSection.tsx`
   (299 l.), `IntelligenceSplitModalShell.tsx` (169 l.), `globals.css`.
4. Ne pas modifier `IntelligenceSplitModalShell.tsx` : `headerActions`, `headerRightActions`,
   `content` et les classes `motion-reduce:` suffisent au flip et au retour.
5. **Livrer un point de montage** pour la vue Situation dans `SectorPlaybooksModal` (prop ou
   slot) : sans lui, A2 devra écrire dans un fichier qui appartient à A1.
6. Ne pas toucher au segment actif : il vient de `workspace.segment`, jamais d'un state local
   (D5).
7. Tester en priorité les segments pauvres — `Hébergement & résidences de tourisme` (5 entrées,
   `profile_json = '{}'`) et `Spatial, défense` — avant le segment riche.
8. Handoff de sortie : `HANDOFF-LOT-1-SHELL-FLIP.md`, au format de la roadmap §4.
