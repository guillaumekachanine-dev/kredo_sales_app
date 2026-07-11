# HANDOFF — INTEL-020 Assistance rédactionnelle dynamique

**Projet :** KREDO — Super-assistant B2B pour le pilotage d'une ESN  
**Repository :** `guillaumekachanine-dev/kredo_sales_app`  
**Supabase :** `jvzgmhvwirsbdkjpmvla`  
**Workflow unique :** `intel-020-communication`  
**État audité :** 10 juillet 2026  
**Baseline Git observée :** `0b28735ded3516ab91ddfe30c8bbe20cf4964bdc` — `Enhance communication drawer controls`  
**Audience :** Codex, Claude Code, Gemini, développeur humain, agent QA  
**Statut :** handoff de référence avant découpage en prompts d'implémentation

**Documents de référence :** [ADR-0015 — Architecture dynamique de communication](adr/ADR-0015-intel-020-dynamic-communication-architecture.md) · [Ledger d'implémentation INTEL-020](handoffs/INTEL-020-dynamic-implementation-ledger.md)

---

## 0. Règle de lecture et ordre de préséance

Ce document est le contrat de continuité du chantier INTEL-020. Il consolide :

1. les décisions prises dans la discussion fonctionnelle ;
2. les matrices de paramètres et de scénarios validées ;
3. l'audit du code réellement présent dans `main` ;
4. l'audit de la base Supabase live ;
5. les écarts entre l'architecture historique et la cible désormais retenue ;
6. le plan de livraison en petits ou moyens lots contrôlables.

Ordre de préséance en cas de contradiction :

1. décision fonctionnelle explicitement validée dans ce handoff ;
2. code et schéma live au démarrage du lot ;
3. ADR mis à jour dans le lot concerné ;
4. anciens documents V1 ou ADR historiques.

Ce handoff **supersède partiellement** :

- `INTEL-020-REDACTION-ASSISTEE-V1.md`, limité initialement aux messages écrits ;
- `docs/adr/ADR-0013-communication-scenarios-catalog.md`, qui retient encore cinq catégories et deux CTA ;
- toute règle historique déduisant la nature du livrable depuis le canal ;
- la fusion actuelle `interne_management`.

Aucun agent ne doit réimplémenter une architecture parallèle. Le chantier enrichit le composer, les runs, les résultats et le workflow existants.

---

# 1. Finalité du projet

## 1.1 Problème métier

Le Business Manager d'une ESN doit continuellement :

- contacter et relancer des prospects ;
- développer des comptes clients ;
- défendre une proposition, une offre ou un profil ;
- gérer les risques et tensions de delivery ;
- échanger avec des candidats ;
- manager ses consultants ;
- obtenir des arbitrages ou mobiliser des collègues du Staff ;
- préparer des rendez-vous, comités, entretiens et annonces sensibles.

Le besoin n'est pas un générateur de texte générique. KREDO doit devenir un **assistant de communication contextuel** qui sélectionne les paramètres pertinents, exploite les vraies données du hub et empêche les combinaisons incohérentes.

## 1.2 Résultat attendu

L'utilisateur choisit une finalité et un contexte métier. KREDO :

1. détecte l'entité et le scope ;
2. résout les faits disponibles ;
3. propose uniquement les scénarios compatibles ;
4. déduit les valeurs automatiques ;
5. laisse l'utilisateur ajuster les choix légitimes ;
6. génère le bon type de livrable ;
7. conserve la traçabilité des données utilisées ;
8. stocke le run et le résultat dans l'infrastructure existante.

La chaîne de décision cible est :

```text
Finalité
→ contexte métier
→ scope
→ entité pivot
→ statut réel
→ destinataire
→ scénario compatible
→ objectif
→ format
→ longueur / durée / profondeur
→ ton
→ références et sources contextuelles
→ génération
```

## 1.3 Les trois finalités utilisateur

Les trois finalités doivent être **explicites dans l'interface** :

| Finalité UI | `outputKind` | Nature du résultat |
|---|---|---|
| Rédiger un mail | `written_message` | Message écrit prêt à relire, copier ou adapter |
| Élaborer un pitch | `spoken_pitch` | Script réellement prononçable |
| Préparer un RDV | `structured_briefing` | Fiche de préparation, arguments, objections et posture |

Le terme « mail » reste le libellé principal historique, mais `written_message` couvre aussi LinkedIn et la note interne lorsque le scénario l'autorise.

**Décision nouvelle :** l'interface ne doit plus regrouper le pitch oral et le briefing sous un seul mode « Pitch ». Cette décision supersède l'ancien ADR-0013 D-4.

## 1.4 Ce que la fonctionnalité ne fait pas

Hors scope du chantier :

- envoi automatique d'un email ou message ;
- campagnes multicanales ;
- séquences automatisées ;
- brouillons collaboratifs et versioning complet ;
- templates créés par les utilisateurs ;
- dashboard de monitoring des générations ;
- modèle LLM adaptatif ou tiering de coût ;
- conseil juridique RH ;
- remplacement du jugement humain.

---

# 2. Principes d'architecture retenus

## 2.1 Un seul composer

Conserver le composer global monté dans l'application :

- `CommunicationComposerHost` ;
- ouverture via `openCommunicationComposer(...)` ;
- drawer Desktop et bottom drawer Mobile ;
- formulaire `CommunicationBriefForm` ;
- résultat via `CommunicationResult` ou `PitchResult`.

Ne pas créer un composer dédié par module.

## 2.2 Un seul workflow n8n

Conserver exclusivement :

```text
intel-020-communication
```

Aucun workflow séparé pour :

- management consultant ;
- interne ;
- briefing ;
- recrutement ;
- delivery.

Le workflow devient un routeur contextuel selon `outputKind`, `activityCategory`, `scope` et `scenario`.

## 2.3 Supabase reste la source de vérité

Conserver :

- `ai_intelligence_runs` pour le run et `input_snapshot` ;
- `ai_intelligence_results` pour le résultat et `content_json` ;
- le pattern Next.js → run queued → webhook n8n → callback signé → Realtime.

Ne pas créer de table `communication_sessions`, `communication_templates` ou `communication_versions` dans ce chantier.

## 2.4 Registry TypeScript comme contrat métier

La registry doit devenir la source de vérité pour :

- les scénarios ;
- leurs catégories ;
- leurs scopes ;
- leurs finalités autorisées ;
- leurs formats ;
- leurs objectifs ;
- leurs longueurs ;
- leurs tons ;
- leurs faits et références nécessaires.

Les règles ne doivent pas être dupliquées dans de grands blocs conditionnels React.

## 2.5 Résolveur pur

La mécanique de dépendance doit être concentrée dans une fonction pure et testable, indépendante de React et de Supabase.

```ts
resolveCommunicationOptions(contextFacts, currentBrief)
```

Le front ne fait que :

- collecter les facts ;
- appeler le résolveur ;
- afficher les options retournées ;
- appliquer le brief normalisé.

## 2.6 Adaptive design réel

Desktop et Mobile partagent les contrats, pas nécessairement la même composition React.

- Desktop : analyse dense, valeurs déduites visibles, paramètres complets.
- Mobile : action rapide, champs essentiels, options secondaires dans un niveau avancé.
- Aucun composant Desktop lourd monté puis masqué en CSS.

---

# 3. Taxonomie canonique

## 3.1 Six catégories métier

```ts
type CommunicationActivityCategory =
  | "commerce_prospection"
  | "commerce_actif"
  | "delivery"
  | "recrutement"
  | "management_consultants"
  | "internal_staff"
```

Labels :

| Valeur | Label UI | Public principal |
|---|---|---|
| `commerce_prospection` | Commerce · Prospection | Prospect ou contact froid/tiède |
| `commerce_actif` | Commerce · Périmètre actif | Client, ancien client, opportunité |
| `delivery` | Delivery | Client externe en phase d'exécution |
| `recrutement` | Recrutement | Candidat ou interlocuteur client associé |
| `management_consultants` | Management consultants | Consultant placé sous la responsabilité du BM |
| `internal_staff` | Interne | Collègue Staff, N+1, Practice, avant-vente, finance, direction |

## 3.2 Séparation structurante

### Management consultants

Relation hiérarchique descendante du Business Manager vers un consultant de l'entreprise.

```ts
scope = "collaborator"
recipient.type = "collaborator"
activityCategory = "management_consultants"
```

Les notions de persona commercial, statut de compte et relation CRM ne s'appliquent pas.

### Interne

Relation fonctionnelle, transverse, pair-à-pair ou hiérarchique ascendante vers le Staff.

```ts
scope = "internal"
recipient.type = "internal"
activityCategory = "internal_staff"
```

Le destinataire interne est caractérisé par son rôle, sa relation et le domaine de la demande.

## 3.3 Scopes

```ts
type CommunicationScope = "account" | "collaborator" | "internal"
```

| Scope | Entité obligatoire | Compte obligatoire |
|---|---|---|
| `account` | compte ou entité rattachable à un compte | Oui, sauf contexte sectoriel explicitement géré |
| `collaborator` | `collaboratorId` | Non |
| `internal` | aucune | Non |

## 3.4 Destinataires

```ts
type CommunicationRecipientType =
  | "prospect"
  | "active_client"
  | "former_client"
  | "partner"
  | "candidate"
  | "collaborator"
  | "internal"
```

## 3.5 Rôles internes

```ts
type CommunicationInternalRecipientRole =
  | "manager_n1"
  | "recruitment"
  | "practice_lead"
  | "presales"
  | "finance_admin"
  | "delivery_management"
  | "executive_management"
  | "peer_business_manager"
  | "other"

type CommunicationInternalRelationship =
  | "hierarchical_up"
  | "peer"
  | "cross_functional"
  | "executive_committee"
  | "team"

type CommunicationInternalDomain =
  | "commercial"
  | "staffing"
  | "recruitment"
  | "delivery"
  | "practice"
  | "presales"
  | "finance"
  | "operations"
  | "strategy"
```

Stockage recommandé dans `brief.who.recipient` :

```ts
recipient: {
  type: CommunicationRecipientType
  persona: CommunicationPersona
  relation: CommunicationRelation
  contactId?: string
  collaboratorId?: string
  displayName?: string
  companyName?: string
  internalRole?: CommunicationInternalRecipientRole
  internalRelationship?: CommunicationInternalRelationship
  internalDomain?: CommunicationInternalDomain
}
```

`persona` et `relation` restent requis dans le contrat historique pour la compatibilité, mais doivent être ignorés ou normalisés à une valeur neutre pour `collaborator` et `internal`.

---

# 4. Compatibilité historique

## 4.1 Ancienne catégorie

La valeur :

```text
interne_management
```

ne doit plus être produite par un nouveau brief.

Normalisation de lecture :

```text
interne_management + scope collaborator → management_consultants
interne_management + scope internal     → internal_staff
```

Ne pas conserver `interne_management` dans le type canonique si cela permet au nouveau code de la réémettre. Préférer :

```ts
type LegacyCommunicationActivityCategory = "interne_management"
```

et une fonction d'entrée acceptant `string`.

## 4.2 Anciens runs

Les runs historiques peuvent ne pas contenir :

- `what.outputKind` ;
- `what.activityCategory` ;
- `what.scope`.

Fallback :

- `spoken_pitch_30s` → `spoken_pitch` ;
- `meeting_briefing` → `structured_briefing` ;
- autres canaux → `written_message` ;
- scope par type d'entité ou compte historique ;
- catégorie par registry du scénario, si disponible.

## 4.3 Canal oral historique

`spoken_pitch_30s` est conservé dans le wire contract pour ne pas casser les runs et le workflow.

Pour ce chantier :

- le libellé UI devient simplement « Pitch oral » ;
- `length` pilote 30 secondes, 1 minute, 2 minutes ou 5 minutes ;
- le nom technique historique n'impose plus une durée de 30 secondes.

Le renommage technique du canal est hors scope afin d'éviter un churn inutile.

---

# 5. Audit réel du code au 10 juillet 2026

## 5.1 Éléments déjà livrés

Le code possède déjà :

- le pattern asynchrone Next.js/n8n/Supabase ;
- le workflow `intel-020-communication` ;
- HMAC et callback ;
- Realtime sur les résultats ;
- `CommunicationOutput`, `SpokenPitchOutput`, `MeetingBriefingOutput` ;
- les trois `outputKind` ;
- les scopes `account`, `collaborator`, `internal` ;
- une registry d'environ 69 scénarios ;
- cinq catégories, encore fusionnées sur `interne_management` ;
- les onze tons ;
- une modale de sélection catégorie → scénario ;
- une modale des sources contextuelles ;
- la résolution primaire de `candidate`, `collaborator` et `sector` ;
- des prompts n8n commerciaux, delivery, recrutement et management ;
- les champs de briefing `postures`, `emotional_context`, `power_dynamic` ;
- le rendu de ces champs dans `PitchResult`.

## 5.2 Limites observées dans les types

`CommunicationActivityCategory` contient encore cinq valeurs et fusionne :

```text
interne_management
```

`CommunicationRecipientType` ne contient pas `collaborator`.

Les dimensions internes Staff n'existent pas.

Les nouveaux scénarios détaillés dans les matrices Management et Interne n'existent pas encore.

## 5.3 Limites observées dans la registry

La registry actuelle expose seulement :

- `activityCategory` ;
- `useCase` ;
- `defaultOutputKind` ;
- `defaultChannel` ;
- `defaultObjective` ;
- `requiresOffer` ;
- `requiredScopes`.

Elle ne contient pas encore :

- `allowedOutputKinds` ;
- `allowedChannels` ;
- `allowedObjectives` ;
- `allowedLengths` ;
- `eligibleRecipientTypes` ;
- `eligibleInternalRoles` ;
- `requiredFacts` ;
- `requiredRefs` ;
- `optionalRefs` ;
- `suggestedTones` ;
- `excludedTones`.

`useCase: mail | pitch` ne suffit plus à distinguer le pitch oral du briefing.

## 5.4 Limites observées dans le formulaire

Le formulaire affiche encore des options globales :

- tous les canaux ;
- tous les objectifs ;
- tous les tons ;
- tous les statuts de destinataire ;
- tous les personas ;
- toutes les relations.

Le changement de scénario applique uniquement quelques valeurs par défaut. Il n'effectue pas de cascade complète.

Le formulaire considère :

```ts
isPitch = outputKind !== "written_message"
```

Le briefing reste donc traité comme un pitch générique.

Le sélecteur de scénario est encore piloté par :

```ts
useCase: "mail" | "pitch"
```

Le sélecteur d'offre s'affiche pour tout livrable non écrit, alors qu'il ne devrait dépendre que du scénario et du contexte.

Les sources contextuelles peuvent être décochées, mais le front transforme actuellement cette action en instruction textuelle `mustExclude`. Les sources ne sont pas réellement supprimées de l'hydratation n8n.

## 5.5 Limites observées dans le host

Le host sait ouvrir les scopes sans compte, ce qui est positif.

Pour `collaborator`, il charge directement quelques champs et les concatène dans `mustInclude` :

- nom ;
- poste ;
- practice ;
- séniorité ;
- statut.

Il n'hydrate pas encore :

- mission active ;
- historique de missions ;
- job profile ;
- compétences ;
- disponibilité ;
- faits managériaux disponibles.

Le scope `internal` ouvre un contexte vide, sans dimensions Staff structurées.

Le header ne gère que :

```ts
"mail" | "pitch"
```

Le mode « Préparer un RDV » n'existe pas encore.

## 5.6 Limites observées dans les mappings

Le statut prospect est actuellement transformé en relation `warm` par défaut, ce qui est faux sans preuve.

Le persona mapping ne reconnaît correctement qu'une petite partie des rôles. Il doit exploiter `relationship_role` puis `job_title`.

Le statut de compte est encore éditable dans le formulaire alors qu'il doit être déduit de Supabase et présenté en lecture seule.

## 5.7 Limites observées dans n8n

Le workflow calcule bien `outputKind` avec fallback historique.

En revanche, l'hydratation choisit encore le RPC selon :

```text
isPitch ? get_pitch_context : get_communication_context
```

Conséquences :

- un briefing consultant appelle un RPC commercial avec `company_id = null` ;
- un contexte interne n'est pas réellement hydraté ;
- la nature du livrable pilote à tort la récupération des données ;
- les sources désactivées restent présentes dans le contexte résolu.

La liste des scénarios exigeant une offre est dupliquée en dur dans n8n. Elle doit rester synchronisée ou être générée depuis la registry.

Le prompt oral historique reste calibré sur 30 secondes ; il doit respecter la durée sélectionnée.

La validation non commerciale reconnaît encore `interne_management`.

## 5.8 Résultats et bibliothèque

Le workflow actuel prévoit :

- `communication` pour l'écrit ;
- `commercial_pitch` pour les pitchs/briefings commerciaux ;
- `prise_de_parole` pour les sorties non commerciales.

La base accepte `result_type` en texte, mais :

- aucun résultat live `prise_de_parole` n'existe encore ;
- l'enum `intelligence_document_type` ne contient pas `prise_de_parole` ;
- `save-as-document.ts` ne mappe pas ce type.

Donc une première génération non commerciale pourrait être stockée comme résultat mais échouer lors de l'enregistrement dans la bibliothèque.

Décision cible : compléter proprement `prise_de_parole` dans la bibliothèque plutôt que reclasser silencieusement ces contenus comme pitch commercial.

## 5.9 Anomalie de scope documentaire

`save-as-document.ts` cherche actuellement `input_snapshot.scope`, alors que le scope canonique est stocké dans :

```text
input_snapshot.what.scope
```

Le `scope_json` du document risque donc de rester vide. Ce point doit être corrigé dans le lot bibliothèque/traçabilité.

## 5.10 Rendu résultat à adapter

`PitchResult` affiche encore :

- « Pitch oral 30 s » ;
- « Fiche de préparation RDV » ;
- « Lien vers l'offre » ;
- « Cross-sell possible » ;
- « Chiffres à citer ».

Ces labels doivent devenir contextuels pour :

- un pitch managérial ;
- une annonce difficile ;
- un arbitrage interne ;
- un entretien annuel ;
- un briefing recrutement.

Le contrat de sortie peut rester identique, mais la présentation ne doit pas imposer du vocabulaire commercial.

---

# 6. Audit Supabase live

## 6.1 Volumétrie utile

Au moment de l'audit :

- `profiles` : 1 ;
- `collaborators` : 19 ;
- `missions` : 19 ;
- `candidates` : 30 ;
- `calendar_events` : 213.

## 6.2 Management des collaborateurs

`collaborators.manager_id` :

- référence `collaborators.id` ;
- représente donc un manager qui est lui-même collaborateur ;
- n'est renseigné sur aucun des 19 collaborateurs.

Il ne permet pas de rattacher proprement un consultant au Business Manager connecté, qui est porté par `profiles`.

Aucune colonne `manager_profile_id` n'existe.

## 6.3 RPC existants

Existants :

```text
get_communication_context(workspace, company, contact, opportunity, mission)
get_pitch_context(workspace, company, offer, opportunity, mission)
```

Absent :

```text
get_collaborator_communication_context(...)
```

## 6.4 Stockage IA

Le stockage existant est suffisant :

- `input_snapshot jsonb` ;
- `primary_entity_type` ;
- `primary_entity_id` ;
- `company_id` nullable ;
- `content_json jsonb` ;
- `context_snapshot jsonb` ;
- `source_refs jsonb` ;
- `qa_flags jsonb`.

Aucune nouvelle table de communication n'est nécessaire.

## 6.5 Runs live INTEL-020

Des runs récents utilisent déjà :

- `what.outputKind` ;
- `what.activityCategory` ;
- `what.scope`.

Les runs plus anciens ne les ont pas, ce qui confirme la nécessité du fallback legacy.

Résultats INTEL-020 observés :

- 32 `communication` ;
- 8 `commercial_pitch` ;
- 0 `prise_de_parole` à la date de l'audit.

## 6.6 Contraintes de sécurité pour la nouvelle RPC

Toute nouvelle fonction doit :

- définir `search_path` explicitement ;
- vérifier `workspace_id` sur chaque relation ;
- rester `STABLE` ;
- éviter `SECURITY DEFINER` sauf nécessité démontrée ;
- recevoir des grants cohérents avec les RPC existants ;
- ne jamais exposer un collaborateur d'un autre workspace.

Les warnings Supabase actuellement présents portent principalement sur d'autres modules. Le chantier ne doit pas les aggraver ni les mélanger à son périmètre.

---

# 7. Modèle Data cible

## 7.1 Rattachement hiérarchique applicatif

Ajouter :

```sql
collaborators.manager_profile_id uuid null
  references profiles(id)
  on delete set null
```

Index :

```sql
create index ...
on collaborators(workspace_id, manager_profile_id)
where manager_profile_id is not null;
```

Backfill sûr :

- si un workspace possède exactement un profil, rattacher ses collaborateurs à ce profil ;
- sinon ne rien deviner ;
- aucun UUID codé en dur.

Ne pas modifier la sémantique de `manager_id`.

## 7.2 RPC collaborateur

Créer :

```sql
get_collaborator_communication_context(
  p_workspace_id uuid,
  p_collaborator_id uuid,
  p_mission_id uuid default null
) returns jsonb
```

Sortie minimale :

```json
{
  "collaborator": {},
  "person": {},
  "currentMission": {},
  "recentMissions": [],
  "jobProfile": {},
  "skills": [],
  "availability": {},
  "recentActivity": [],
  "recentAbsences": []
}
```

Les blocs `recentActivity` et `recentAbsences` ne doivent être inclus que si les tables et données disponibles sont pertinentes, fiables et autorisées par RLS. Ne jamais inventer une évaluation de performance.

## 7.3 Type documentaire

Compléter l'enum documentaire avec :

```text
prise_de_parole
```

Puis :

- mapper `result_type = prise_de_parole` ;
- ajouter son libellé et son fallback title ;
- autoriser la sauvegarde en bibliothèque ;
- conserver `commercial_pitch` pour les scénarios commerciaux ;
- conserver `communication` pour les messages écrits.

## 7.4 Interlocuteurs Staff

Ne pas créer de table Staff dédiée dans ce chantier.

Tant qu'un collègue n'a pas de profil KREDO :

- rôle interne structuré ;
- nom libre optionnel ;
- relation structurée ;
- domaine structuré.

Quand plusieurs profils existeront, le même contrat pourra référencer un profil sans migration conceptuelle supplémentaire.

---

# 8. Contrat runtime — Context Facts

```ts
type CommunicationContextFacts = {
  outputKind: CommunicationOutputKind
  primaryEntityType?: N8nEntityType
  scope: CommunicationScope
  activityCategory?: CommunicationActivityCategory

  companyLifecycle?: string | null
  recipientType?: CommunicationRecipientType
  persona?: CommunicationPersona
  relation?: CommunicationRelation

  internalRole?: CommunicationInternalRecipientRole
  internalRelationship?: CommunicationInternalRelationship
  internalDomain?: CommunicationInternalDomain

  collaboratorStatus?: string | null
  candidateStatus?: string | null
  opportunityStage?: string | null
  missionStatus?: string | null
  eventType?: string | null
  eventStatus?: string | null

  hasContact: boolean
  hasPreviousMessage: boolean
  hasSignal: boolean
  hasUpcomingMeeting: boolean
  hasCompletedMeeting: boolean
  hasOpenOpportunity: boolean
  hasProposal: boolean
  hasActiveMission: boolean
  hasUpcomingMissionEnd: boolean
  hasDeliveryRisk: boolean
  hasCandidate: boolean
  hasCollaborator: boolean
  hasOffer: boolean
  hasSectorIntelligence: boolean
  openedFromFinance: boolean

  availableContextSources: CommunicationContextSourceId[]
}
```

Les facts doivent être factuels. Une absence de donnée produit `false`, `null` ou `unknown`, jamais une hypothèse présentée comme certaine.

---

# 9. Registry cible

```ts
type ScenarioRegistryItem = {
  value: CommunicationScenario
  label: string
  description: string

  activityCategory: CommunicationActivityCategory

  allowedOutputKinds: CommunicationOutputKind[]
  defaultOutputKind: CommunicationOutputKind

  requiredScopes: CommunicationScope[]
  eligibleRecipientTypes: CommunicationRecipientType[]
  eligibleLifecycleStatuses?: string[]
  eligibleInternalRoles?: CommunicationInternalRecipientRole[]

  allowedChannels: CommunicationChannel[]
  defaultChannel: CommunicationChannel

  allowedObjectives: CommunicationObjective[]
  defaultObjective: CommunicationObjective

  allowedLengths: CommunicationLength[]

  requiresOffer: boolean
  requiredFacts?: CommunicationContextFact[]
  requiredRefs?: CommunicationContextRef[]
  optionalRefs?: CommunicationContextRef[]

  requiredContextSources?: CommunicationContextSourceId[]
  optionalContextSources?: CommunicationContextSourceId[]

  suggestedTones: CommunicationTone[]
  excludedTones?: CommunicationTone[]
}
```

Pour éviter une registry répétitive :

- définir des defaults par `outputKind` ;
- définir des defaults par catégorie ;
- appliquer des overrides par scénario ;
- exposer un helper retournant une règle entièrement résolue.

`useCase` peut être conservé temporairement comme compatibilité calculée, puis supprimé des call-sites.

---

# 10. Résolveur dynamique

## 10.1 Signature

```ts
resolveCommunicationOptions(
  facts: CommunicationContextFacts,
  currentBrief: CommunicationBrief,
  fieldSources?: CommunicationFieldSources,
): CommunicationResolution
```

## 10.2 Sortie

```ts
type CommunicationResolution = {
  categories: CommunicationActivityCategory[]
  scenarios: ScenarioRegistryItem[]
  objectives: CommunicationObjective[]
  channels: CommunicationChannel[]
  lengths: CommunicationLength[]
  tones: CommunicationTone[]

  requiredRefs: CommunicationContextRef[]
  optionalRefs: CommunicationContextRef[]
  requiredContextSources: CommunicationContextSourceId[]
  optionalContextSources: CommunicationContextSourceId[]

  normalizedBrief: CommunicationBrief
  fieldSources: CommunicationFieldSources
  adjustments: CommunicationAdjustment[]
}
```

## 10.3 Origine des champs

```ts
type FieldSource = "auto" | "user"
```

Champs au minimum suivis :

- scénario ;
- objectif ;
- canal ;
- longueur ;
- ton ;
- persona ;
- relation ;
- rôle interne ;
- domaine interne ;
- formalité.

Règle :

- une valeur `auto` est recalculée quand un parent change ;
- une valeur `user` reste conservée si elle demeure autorisée ;
- une valeur `user` devenue invalide est remplacée et l'ajustement est signalé.

## 10.4 Cascades obligatoires

### Changement de finalité

Recalculer :

- scénarios ;
- format ;
- longueur ;
- objectifs ;
- sources ;
- offre éventuelle.

### Changement de catégorie

- Management → `scope=collaborator`, destinataire consultant.
- Interne → `scope=internal`, rôle Staff obligatoire.
- Purger les champs sans objet.

### Changement de compte

- purger contact, opportunité, mission, événement et signal de l'ancien compte ;
- recalculer lifecycle, type de destinataire et relation ;
- conserver langue et instructions libres.

### Changement de contact

- recalculer persona ;
- recalculer relation ;
- préserver le scénario s'il reste compatible.

### Changement de consultant

- recalculer statut, mission, practice, séniorité et disponibilité ;
- conserver les instructions libres ;
- remplacer un scénario devenu incompatible.

### Changement de rôle interne

- filtrer scénarios, objectifs et tons ;
- conserver le nom libre ;
- recalculer relation et domaine par défaut.

### Changement de scénario

- appliquer `defaultOutputKind`, canal, objectif, longueur et tons ;
- verrouiller les références et sources obligatoires ;
- purger les références incompatibles ;
- ne jamais désactiver une source obligatoire.

---

# 11. Matrice globale des paramètres

| Paramètre | Account | Management consultants | Interne | Source |
|---|---:|---:|---:|---|
| Finalité | Oui | Oui | Oui | utilisateur / preset |
| Catégorie | Oui | automatique ou choisie | automatique ou choisie | contexte |
| Compte | Oui | Non | Optionnel comme entité liée | Supabase |
| Statut compte | Lecture seule | Non | Non | `companies.lifecycle_status` |
| Contact | Selon scénario | Non | Non | Supabase |
| Consultant | Non, sauf réf profil client | Obligatoire | Optionnel comme entité liée | Supabase |
| Rôle Staff | Non | Non | Obligatoire | utilisateur / preset |
| Persona | Oui | Masqué | Masqué | contact + job title |
| Relation CRM | Oui | Masquée | Masquée | CRM |
| Relation interne | Non | implicite manager→consultant | Oui | rôle interne |
| Domaine interne | Non | Non | Oui | utilisateur / origine |
| Scénario | Oui, filtré | Oui, filtré | Oui, filtré | registry |
| Objectif | Oui, filtré | Oui, filtré | Oui, filtré | registry |
| Format | Oui, filtré | Oui, filtré | Oui, filtré | output kind + registry |
| Longueur / durée / profondeur | Oui | Oui | Oui | output kind |
| Offre | Conditionnelle | Non | Exceptionnel, généralement non | scenario.requiresOffer |
| Practice | Selon contexte | Déduite du consultant | Selon rôle/domaine | Supabase / utilisateur |
| Ton | Oui, filtré | Oui, filtré | Oui, filtré | matrice |
| Formalité | Oui | `tu` par défaut | selon relation | contexte |
| Langue | Oui | Oui | Oui | utilisateur |
| Sources | Oui, disponibles | sources collaborateur | sources liées aux refs | résolveur |
| Instructions | Oui | Oui | Oui | utilisateur |
| Exclusions | Oui | Oui | Oui | utilisateur |

---

# 12. Matrice des finalités

## 12.1 Message écrit

Canaux autorisables :

- `email` ;
- `linkedin_invitation` ;
- `linkedin_message` ;
- `internal_note`.

Longueurs :

- Ultra-court : 40–80 mots ;
- Concis : 80–140 mots ;
- Standard : 140–220 mots ;
- Détaillé : 220–400 mots.

LinkedIn est réservé aux contextes externes compatibles.

## 12.2 Pitch oral

Canal technique :

- `spoken_pitch_30s`, présenté comme « Pitch oral ».

Durées UI :

| `length` | Label |
|---|---|
| `ultra_short` | 30 secondes |
| `concise` | 1 minute |
| `standard` | 2 minutes |
| `detailed` | 5 minutes |

Le prompt et la QA doivent calculer la cible de mots selon la durée.

## 12.3 Briefing

Canal :

- `meeting_briefing`.

Profondeurs UI :

| `length` | Label |
|---|---|
| `ultra_short` | Flash |
| `concise` | Synthétique |
| `standard` | Standard |
| `detailed` | Approfondi |

Un briefing n'est pas nécessairement commercial ni lié à un rendez-vous client.

---

# 13. Catalogue cible par catégorie

## 13.1 Commerce · Prospection

### Message écrit

- `signal_outreach`
- `follow_up_no_reply`
- `offer_introduction`
- `appointment_confirmation`
- `first_contact_after_nomination`
- `linkedin_to_email_bridge`
- `event_invitation`
- `sector_rebound`
- `discovery_meeting_request`

### Pitch oral

- `cold_call_pitch`
- `signal_based_pitch`
- `why_us_now_pitch`
- `first_objection_bad_timing`

### Briefing

- `meeting_prep_discovery`
- `sector_persona_pitch`

## 13.2 Commerce · Périmètre actif

### Message écrit

- `post_meeting`
- `profile_submission_to_client`
- `cross_sell`
- `reactivation`
- `proposal_follow_up`
- `invoice_follow_up`
- `mission_renewal`
- `consultant_replacement_notice`
- `client_tension_apology`
- `delivery_delay_notice`

### Pitch oral

- `price_objection_pitch`

### Briefing

- `meeting_prep_cross_sell`
- `proposal_defense_pitch`
- `renewal_pitch`
- `client_crisis_talk_track`
- `delay_talk_track`
- `tense_copil_briefing`

Les scénarios de défense, renouvellement et crise peuvent autoriser `spoken_pitch` en complément lorsque la registry l'explicite.

## 13.3 Delivery

### Message écrit

- `project_alert_escalation`
- `steering_committee_minutes`
- `risk_communication`
- `milestone_validation_request`

### Briefing

- `escalation_briefing`
- `risk_meeting_briefing`

## 13.4 Recrutement

### Message écrit

- `candidate_interview_invitation`
- `candidate_follow_up`
- `candidate_offer`
- `candidate_rejection`
- `candidate_availability_check`
- `candidate_post_interview_feedback`
- `candidate_cv_completion_request`
- `dormant_talent_pool_reactivation`

### Pitch oral

- `candidate_closing_pitch`
- `mobility_salary_pitch`

### Briefing

- `candidate_to_client_pitch`
- `opportunity_to_candidate_pitch`
- `atypical_candidate_defense`
- `recruiter_briefing_pre_interview`

## 13.5 Management consultants

### Message écrit

| Scénario | Finalité |
|---|---|
| `manager_collaborator_internal` | Informer ou aligner un consultant |
| `cra_absence_reminder` | Demander une action administrative |
| `collaborator_recognition` | Féliciter et valoriser |
| `assignment_change_notice` | Annoncer un changement de mission ou planning |
| `performance_feedback_follow_up` | Formaliser un feedback après échange |
| `intercontract_action_plan_message` | Confirmer le plan d'action intercontrat |
| `annual_review_follow_up` | Formaliser décisions et objectifs annuels |
| `consultant_retention_follow_up` | Confirmer les engagements de rétention |

### Pitch oral

| Scénario | Finalité |
|---|---|
| `collaborator_recognition` | Félicitation orale structurée |
| `assignment_change_notice` | Annonce orale de changement |
| `difficult_announcement_talk_track` | Annonce sensible |
| `intercontract_exit_pitch` | Expliquer une sortie d'intercontrat |
| `performance_feedback_talk_track` | Donner un feedback difficile |
| `retention_conversation_talk_track` | Répondre à un risque de départ |
| `career_opportunity_talk_track` | Présenter une évolution ou opportunité |

### Briefing

| Scénario | Finalité |
|---|---|
| `one_on_one_alignment` | Préparer un point 1:1 |
| `performance_review_prep` | Préparer un entretien annuel |
| `disciplinary_meeting_posture` | Préparer un recadrage |
| `sensitive_meeting_briefing` | Préparer un point sensible |
| `difficult_announcement_talk_track` | Préparer une annonce difficile |
| `intercontract_exit_pitch` | Préparer une discussion d'intercontrat |
| `career_development_briefing` | Préparer un échange d'évolution |
| `retention_conversation_briefing` | Préparer un entretien de rétention |

`one_on_one_alignment` doit être reclassé depuis `written_message` vers `structured_briefing`.

## 13.6 Interne

### Message écrit

| Scénario | Destinataires principaux |
|---|---|
| `internal_arbitrage_request` | N+1, direction |
| `staffing_help_request` | Recrutement, BM pair |
| `handover_note` | Pair, manager, équipe transverse |
| `internal_validation_before_send` | N+1, Practice, avant-vente |
| `manager_status_update` | N+1, direction |
| `cross_functional_coordination_request` | Recrutement, Practice, avant-vente, delivery |
| `internal_decision_summary` | Équipe ou comité |
| `internal_alert_escalation` | N+1, direction, delivery |

### Pitch oral

| Scénario | Finalité |
|---|---|
| `quarterly_business_review` | Présenter la performance |
| `resource_arbitrage_pitch` | Obtenir des moyens |
| `internal_committee_pitch` | Défendre une position en comité |
| `investment_arbitrage_argument` | Obtenir une décision d'investissement |
| `project_status_pitch` | Présenter un avancement |
| `direction_summary_pitch` | Synthèse exécutive |
| `practice_support_pitch` | Obtenir un appui Practice |
| `presales_support_pitch` | Mobiliser l'avant-vente |
| `staffing_priority_pitch` | Faire prioriser un besoin |

### Briefing

| Scénario | Finalité |
|---|---|
| `weekly_briefing_prep` | Préparer le point N+1 |
| `quarterly_business_review` | Préparer la business review |
| `resource_arbitrage_pitch` | Préparer l'arbitrage de moyens |
| `internal_committee_pitch` | Préparer un comité |
| `investment_arbitrage_argument` | Préparer une décision d'investissement |
| `project_status_pitch` | Préparer une revue de projet |
| `direction_summary_pitch` | Préparer une présentation exécutive |
| `cross_functional_alignment_briefing` | Préparer une réunion transverse |
| `staffing_review_briefing` | Préparer une revue besoins/profils |
| `presales_kickoff_briefing` | Préparer un kickoff avant-vente |

## 13.7 Volumétrie cible

La registry actuelle comporte environ 69 scénarios uniques.

Scénarios nouveaux à ajouter dans le nouveau périmètre :

- Management consultants : 9 identifiants nouveaux ;
- Interne : 10 identifiants nouveaux.

Cible indicative : **environ 88 scénarios uniques**, certains acceptant plusieurs `allowedOutputKinds` sans duplication.

---

# 14. Matrices de filtrage métier

## 14.1 Lifecycle compte

```text
prospect                → prospect
client / client_actif   → active_client
ancien_client           → former_client
client_dormant          → former_client
partenaire              → partner
```

Le statut est déduit et affiché en lecture seule.

## 14.2 Relation CRM

Priorité :

1. client actif → `active_client` ;
2. ancien client → `former` ;
3. `contacts.relationship_level` ;
4. historique des interactions ;
5. `unknown`.

Mapping `relationship_level` :

```text
inexistant → cold
faible     → cold
moyen      → warm
fort       → established
```

Un prospect sans preuve ne doit plus être automatiquement `warm`.

## 14.3 Persona

Priorité :

1. `relationship_role` normalisé ;
2. `job_title` par mots-clés ;
3. `other`.

Mapping attendu :

```text
dsi / cio / cto / cdo                     → cto_cio
rssi / ciso                               → ciso
direction métier                          → business_director
achats / procurement                      → purchasing
rh / talent / recrutement                 → hr_talent
architecte / lead / engineering / expert  → technical
opérationnel / chef de projet / produit   → operational
dg / ceo / président                      → ceo
```

## 14.4 Opportunités

| Étape | Scénarios prioritaires |
|---|---|
| `qualification` | `offer_introduction`, `meeting_prep_discovery` |
| `recherche_profil` | `profile_submission_to_client`, `candidate_to_client_pitch` |
| `cv_envoyes` | `profile_submission_to_client`, `candidate_follow_up` |
| `entretien_client` | `post_meeting`, pitch candidat |
| `contractualisation` | `proposal_follow_up`, `proposal_defense_pitch` |

`proposal_follow_up` doit exiger une proposition ou un contexte de contractualisation identifiable.

## 14.5 Missions

| Fait | Scénarios prioritaires |
|---|---|
| mission active stable | `cross_sell`, `meeting_prep_cross_sell` |
| fin proche | `mission_renewal`, `renewal_pitch` |
| remplacement | `consultant_replacement_notice` |
| risque | `risk_communication`, `risk_meeting_briefing` |
| retard | `delivery_delay_notice`, `delay_talk_track` |
| escalade | `project_alert_escalation`, `escalation_briefing` |

`cross_sell` ne doit pas être proposé sans mission active.

## 14.6 Candidats

| Statut | Scénarios prioritaires |
|---|---|
| `nouveau` | invitation, disponibilité, pitch opportunité |
| `qualifie` | entretien, disponibilité, pitch opportunité |
| `en_process` | suivi, entretien, feedback, briefing recruteur |
| `propose` | offre, closing, mobilité/salaire |
| `refuse` | refus, feedback |
| `ko_manager` | refus, feedback |
| `vivier` | réactivation |
| `archive` | réactivation |
| `recrute` | bascule vers contexte collaborateur si disponible |

## 14.7 Agenda

| Type / statut | Preset cible |
|---|---|
| `rdv_prospection` scheduled | `meeting_prep_discovery` |
| `rdv_client_suivi` scheduled | briefing client selon mission/opportunité |
| `soutenance` scheduled | `proposal_defense_pitch` |
| `entretien_candidat` scheduled | `recruiter_briefing_pre_interview` |
| `appel_prospection` scheduled | `cold_call_pitch` |
| RDV client completed | `post_meeting` |
| COPIL completed | `steering_committee_minutes` |

Pour les événements management, l'entité doit être identifiable via métadonnées ou relation explicite ; ne pas deviner un consultant depuis le titre libre.

---

# 15. Tons

## 15.1 Valeurs canoniques

```text
direct
formal
warm
assertive
pedagogical
diplomatic
technical_expertise
business_roi
enthusiastic_confident
disappointed_confused
prudent
```

## 15.2 Management consultants

| Situation | Tons recommandés |
|---|---|
| reconnaissance | chaleureux, enthousiaste/confiant, direct |
| rappel CRA/absence | direct, diplomatique |
| feedback constructif | direct, pédagogique, prudent |
| recadrage | assertif, direct, diplomatique, prudent |
| annonce difficile | diplomatique, prudent, formel |
| évolution/mobilité | enthousiaste, chaleureux, pédagogique |
| intercontrat | direct, prudent, pédagogique |
| risque de départ | chaleureux, diplomatique, prudent |
| engagement non tenu | déçu/incompréhension, direct, diplomatique |

## 15.3 Interne par rôle

| Rôle | Tons recommandés |
|---|---|
| N+1 | direct, business/ROI, prudent, assertif |
| direction | business/ROI, formel, direct, prudent |
| recrutement | direct, chaleureux, diplomatique |
| Practice Lead | technique/expertise, direct, business/ROI |
| avant-vente | technique/expertise, business/ROI, enthousiaste |
| finance | business/ROI, formel, prudent |
| delivery | direct, technique/expertise, prudent |
| BM pair | direct, chaleureux, assertif |
| comité | formel, business/ROI, assertif, prudent |

## 15.4 Formalité

- externe et candidat : `vous` par défaut ;
- consultant : `tu` par défaut, modifiable ;
- interne Staff : déduit de la relation, généralement `tu`, formel pour direction/comité si nécessaire ;
- anglais : masquer le choix `tu/vous` dans l'UI et utiliser une formalité implicite.

---

# 16. Sources contextuelles

## 16.1 Sources existantes

- `account_profile`
- `crm_contacts`
- `signal_intelligence`
- `opportunity_context`
- `interaction_history`
- `mission_context`
- `candidate_profile`
- `collaborator_context`
- `offer_catalog`
- `source_document`
- `previous_generation`

## 16.2 Règles

- N'afficher que les sources disponibles et pertinentes.
- Une source obligatoire ne peut pas être décochée.
- Une source devenue indisponible est retirée du brief.
- Une désactivation utilisateur valide est préservée.
- n8n ne doit pas hydrater une source désactivée.
- Le texte `mustExclude` ne remplace pas le filtrage réel.

## 16.3 Exemples

| Scénario | Obligatoire | Optionnel |
|---|---|---|
| `signal_outreach` | signal, compte | contacts, interactions, secteur |
| `proposal_follow_up` | opportunité/proposition, compte | contacts, interactions |
| `cross_sell` | mission, compte | offre, secteur, interactions |
| `candidate_to_client_pitch` | candidat, opportunité si connue | compte, contacts |
| `one_on_one_alignment` | collaborateur | mission, compétences, activité récente |
| `resource_arbitrage_pitch` | instructions ou entité liée | finance, staffing, projet |

---

# 17. Contrats de sortie

## 17.1 Message écrit

Conserver `CommunicationOutput` :

- sujets ;
- corps ;
- points clés ;
- sources ;
- warnings.

## 17.2 Pitch oral

Conserver `SpokenPitchOutput` :

- `hook` ;
- `problem_recognition` ;
- `offer_link` ;
- `ask` ;
- `alt_close` ;
- `word_count` ;
- `tone_notes` ;
- sources ;
- warnings.

Interprétation non commerciale :

| Champ | Sens générique |
|---|---|
| `hook` | ouverture |
| `problem_recognition` | faits et contexte |
| `offer_link` | message, recommandation ou proposition |
| `ask` | attente concrète |
| `alt_close` | alternative ou prochaine étape |

Le rendu UI doit employer ces labels neutres lorsqu'il ne s'agit pas d'un pitch commercial.

## 17.3 Briefing

Conserver `MeetingBriefingOutput` avec :

- objectif ;
- message clé ;
- arguments avec preuves ;
- objections et réponses ;
- données à mentionner ;
- options de clôture ;
- choses à éviter ;
- postures ;
- contexte émotionnel ;
- dynamique de pouvoir ;
- sources ;
- warnings.

`cross_sell_hypotheses` reste vide et masqué dans les contextes non commerciaux.

---

# 18. UI cible

## 18.1 Header du composer

Options :

- Mail ;
- Pitch ;
- Préparer un RDV ;
- Rapport.

Le mode Rapport conserve son mécanisme existant et reste hors moteur INTEL-020.

## 18.2 Desktop — Account

Afficher :

- scénario ;
- objectif ;
- format ;
- compte et statut en lecture seule ;
- destinataire ;
- persona ;
- relation ;
- offre seulement si pertinente ;
- ton ;
- longueur/durée/profondeur ;
- formalité ;
- langue ;
- instructions ;
- sources.

## 18.3 Desktop — Management consultants

Sous-composant dédié :

```text
ManagementConsultantFields
```

Afficher :

- consultant ;
- statut ;
- poste ;
- séniorité ;
- practice ;
- mission active ;
- scénario ;
- objectif ;
- format ;
- ton ;
- longueur/durée/profondeur ;
- instructions ;
- sources.

Masquer :

- statut compte ;
- contact CRM ;
- persona ;
- relation CRM ;
- offre commerciale.

## 18.4 Desktop — Interne

Sous-composant dédié :

```text
InternalStaffFields
```

Afficher :

- nom du destinataire, optionnel ;
- rôle Staff ;
- relation interne ;
- domaine ;
- entité liée optionnelle ;
- scénario ;
- objectif ;
- format ;
- ton ;
- longueur/durée/profondeur ;
- instructions ;
- sources.

## 18.5 Mobile — Management

Champs principaux :

1. consultant ;
2. scénario ;
3. objectif ;
4. ton ;
5. durée ou profondeur ;
6. instructions.

Secondaires : statut, mission, practice, format, langue, sources.

## 18.6 Mobile — Interne

Champs principaux :

1. rôle du destinataire ;
2. scénario ;
3. objectif ;
4. ton ;
5. durée ou profondeur ;
6. instructions.

Secondaires : nom, relation, domaine, entité liée, format, langue, sources.

## 18.7 Rendu résultat

Le titre et les labels doivent dépendre de `outputKind`, `activityCategory`, `scenario` et `length`.

Exemples :

- « Pitch oral · 2 minutes » ;
- « Brief de préparation · Entretien annuel » ;
- « Brief d'arbitrage interne » ;
- « Préparation RDV découverte ».

---

# 19. Architecture n8n cible

## 19.1 Validation

Le nœud `Validate Brief` doit :

- vérifier HMAC ;
- accepter et normaliser les anciens briefs ;
- valider scénario, outputKind, scope et catégorie ;
- valider canal, objectif et longueur contre le contrat ;
- exiger les refs obligatoires ;
- exiger `offerRef` uniquement si le scénario le demande ;
- normaliser `interne_management`.

## 19.2 Hydratation par scope

La sélection du contexte ne doit plus dépendre de `isPitch`.

### Account

Choisir les données selon les sources actives :

- compte ;
- contact ;
- interactions ;
- opportunité ;
- mission ;
- signal ;
- secteur ;
- offre.

### Collaborator

Appeler le RPC collaborateur et utiliser :

- personne ;
- poste ;
- séniorité ;
- practice ;
- statut ;
- disponibilité ;
- mission ;
- job profile ;
- compétences ;
- activité réellement disponible.

### Internal

Utiliser :

- profil émetteur ;
- rôle du destinataire ;
- relation ;
- domaine ;
- entités explicitement référencées ;
- instructions utilisateur.

Ne jamais exiger un compte.

## 19.3 Routeur de prompts

Prévoir des instructions par catégorie :

- commerce prospection ;
- commerce actif ;
- delivery ;
- recrutement ;
- management consultants ;
- internal staff.

Puis des missions par scénario.

Les contrats de sortie restent sélectionnés par `outputKind`.

## 19.4 Garde-fous Management consultants

- protéger la dignité du consultant ;
- distinguer constat, attente et prochaine étape ;
- ne pas inventer une évaluation RH ;
- ne pas produire un conseil juridique ;
- éviter le vocabulaire commercial ;
- ne pas déduire une faute depuis une simple absence de donnée ;
- refléter la relation hiérarchique réelle.

## 19.5 Garde-fous Interne

- identifier la décision ou contribution attendue ;
- séparer faits, analyse, recommandation et demande ;
- adapter au rôle du destinataire ;
- privilégier ROI pour direction/finance ;
- privilégier faisabilité et expertise pour Practice/avant-vente ;
- éviter le ton commercial dans une coordination opérationnelle.

## 19.6 QA dynamique

### Pitch oral

- cible de mots selon durée ;
- demande concrète ;
- prononçabilité ;
- absence de jargon excessif sauf ton technique.

### Briefing

- arguments avec preuves ;
- objections ;
- prochaines étapes ;
- postures pour contexte sensible ;
- `power_dynamic` cohérent ;
- absence de vocabulaire commercial en management/interne.

### Écrit

- longueur ;
- formalité ;
- exclusions ;
- CTA adapté à l'objectif ;
- nom du destinataire uniquement lorsqu'il est connu.

---

# 20. Points d'entrée cibles

## 20.1 Déjà présents à préserver

- cockpit compte ;
- panneau intelligence global ;
- reports ;
- prospection comptes ;
- approche sectorielle ;
- plusieurs drawers compte/contact/opportunité/mission.

## 20.2 Priorité P0

- `/prospection/suivi` ;
- onglet suivi mission active ;
- risque/alerte mission ;
- recruitment workspace ;
- candidate drawer ;
- consultant drawer ;
- alertes intercontrat ;
- agenda event drawer commercial ;
- agenda management lorsque l'entité est fiable.

## 20.3 Priorité P1

- veille signal ;
- opportunity standing panel ;
- mission detail header ;
- comité de pilotage projet ;
- recruitment planning ;
- fiche mission consultant ;
- finance relance facture ;
- cockpit mobile ;
- playbook sectoriel.

## 20.4 Principe

Ne pas ajouter un bouton par scénario.

Un point d'entrée :

- exprime une intention naturelle ;
- résout une entité ;
- fournit un preset ;
- laisse le catalogue complet disponible dans le picker.

---

# 21. Segmentation de livraison retenue

Les futurs prompts doivent suivre ces lots. Chaque lot doit être autonome, vérifiable et assez petit pour être annulé ou corrigé sans contaminer la suite.

## Lot 0 — Gel du contrat et traçabilité

Objectif : placer ce handoff et la décision supersédant ADR-0013 dans le repository.

Livrables :

- handoff versionné ;
- ADR mise à jour ou nouvel ADR ;
- ledger des lots ;
- aucun code métier.

## Lot 1 — Types canoniques et compatibilité legacy

Objectif : six catégories, destinataire collaborateur, dimensions Staff, scénarios nouveaux déclarés, normalisation historique.

Sans UI, sans DB, sans n8n.

## Lot 2 — Registry exhaustive

Objectif : scinder les catégories, reclasser les scénarios, ajouter les 19 nouveaux identifiants, enrichir le contrat de registry.

Tests d'intégrité obligatoires.

## Lot 3 — Résolveur de dépendances

Objectif : créer les facts, le resolver, les cascades et la gestion `auto | user`.

Tests table-driven couvrant toutes les catégories et finalités.

## Lot 4 — Fondation Supabase Management

Objectif : `manager_profile_id`, index, backfill sûr, RPC collaborateur, types générés.

Pas d'UI.

## Lot 5 — Hydratation front et mappings factuels

Objectif : compte/contact/persona/relation, candidat, mission, collaborateur, agenda, interne.

Le resolver reçoit des facts fiables.

## Lot 6 — Navigation par trois finalités

Objectif : Mail / Pitch / Préparer un RDV dans le header et le picker.

Ne pas encore refondre tous les champs spécifiques.

## Lot 7 — Formulaire dynamique Account, Delivery, Recrutement

Objectif : remplacer les listes globales par les options résolues pour les catégories déjà proches du modèle existant.

Desktop et Mobile.

## Lot 8 — Formulaire Management consultants

Objectif : sous-composants dédiés, sélection consultant, contexte, scénarios, tons et sources.

## Lot 9 — Formulaire Interne

Objectif : rôle Staff, relation, domaine, entité liée, scénarios et tons.

## Lot 10 — n8n : validation et hydratation par scope

Objectif : normalisation, validation, RPC collaborateur, filtrage réel des sources.

Ne pas réécrire encore tous les prompts.

## Lot 11 — n8n : prompts et QA exhaustifs

Objectif : couvrir tous les scénarios, durées, catégories et garde-fous.

Fixtures contractuelles obligatoires.

## Lot 12 — Résultats et bibliothèque

Objectif : `prise_de_parole`, labels contextuels, correction du scope documentaire, sauvegarde.

## Lot 13 — Points d'entrée commerciaux, delivery et recrutement

Objectif : presets et call-sites P0/P1 de ces modules.

## Lot 14 — Points d'entrée Management, Interne et Agenda

Objectif : consultant, staffing, finance, N+1, comité, événements management.

## Lot 15 — E2E et stabilisation

Objectif : parcours complets, mobile, desktop, Supabase, n8n, bibliothèque, non-régression.

Aucune nouvelle fonctionnalité dans ce lot.

---

# 22. Protocole de continuité entre agents

## 22.1 Avant chaque lot

L'agent doit :

1. partir du `main` contenant le lot précédent ;
2. lire ce handoff ;
3. lire le ledger ;
4. auditer les fichiers concernés ;
5. vérifier le schéma live si le lot touche Supabase ;
6. signaler tout écart avant de coder.

## 22.2 Une branche par lot

Convention :

```text
feat/intel-020-dynamic-XX-slug
```

Aucun lot parallèle touchant les mêmes fichiers.

## 22.3 Rapport de fin de lot obligatoire

Chaque agent doit fournir :

- objectif du lot ;
- fichiers modifiés ;
- migrations créées/appliquées ;
- décisions prises ;
- écarts au handoff ;
- tests exécutés et résultats ;
- limitations restantes ;
- SHA du commit ;
- lien PR ;
- statut du lot : `done`, `blocked`, `partial`.

## 22.4 Ledger

Créer dans le repository un fichier du type :

```text
docs/handoffs/INTEL-020-dynamic-implementation-ledger.md
```

Colonnes :

| Lot | Agent | Branche | Commit | Migration | Tests | Statut | Notes |
|---|---|---|---|---|---|---|---|

Aucun agent ne réécrit l'historique d'un lot précédent. Il ajoute une entrée corrective si nécessaire.

## 22.5 Contrôle de périmètre

Un agent ne doit pas :

- commencer le lot suivant ;
- refondre le design global ;
- installer une nouvelle librairie ;
- créer un workflow parallèle ;
- corriger des advisors Supabase sans rapport ;
- modifier le modèle financier ou d'autres modules ;
- renommer massivement les fichiers sans nécessité.

---

# 23. Validation et non-régression

## 23.1 Commandes repository

Le repository expose :

```bash
npm run lint
npm test
npm run build
```

Pour TypeScript :

```bash
npx tsc --noEmit
```

Il n'existe pas de script npm `typecheck` à la date de l'audit.

## 23.2 Tests registry

Pour chaque scénario :

- ID unique ;
- catégorie canonique ;
- scope valide ;
- finalité par défaut autorisée ;
- canal par défaut autorisé ;
- objectif par défaut autorisé ;
- longueur autorisée ;
- tons valides ;
- refs cohérentes ;
- aucune catégorie active `interne_management`.

## 23.3 Tests resolver

Couvrir :

- trois finalités ;
- six catégories ;
- tous les scénarios ;
- tous les rôles internes ;
- lifecycle compte ;
- opportunités ;
- missions ;
- candidats ;
- consultant ;
- agenda ;
- changement de parent ;
- préservation d'une valeur utilisateur valide ;
- remplacement d'une valeur invalide.

Assertions clés :

- aucun LinkedIn en Management ou Interne ;
- aucun scénario Staff en scope collaborateur ;
- aucun scénario consultant en scope interne ;
- aucun briefing avec canal email ;
- aucun pitch avec canal LinkedIn ;
- aucune offre imposée sans scénario `requiresOffer` ;
- aucune source obligatoire désactivable.

## 23.4 Parcours E2E minimum

1. Mail basé sur signal.
2. Cold call prospect.
3. Brief découverte.
4. Mail renouvellement.
5. Pitch objection prix.
6. Brief soutenance.
7. Communication risque delivery.
8. Brief escalade.
9. Invitation candidat.
10. Pitch opportunité vers candidat.
11. Brief recruteur.
12. Message reconnaissance consultant.
13. Talk track changement de mission.
14. Brief recadrage.
15. Brief 1:1.
16. Brief intercontrat.
17. Demande aide staffing.
18. Pitch arbitrage N+1.
19. Brief business review.
20. Appui avant-vente.
21. Synthèse direction.

Pour chaque parcours :

- input snapshot ;
- scope ;
- primary entity ;
- company nullable correcte ;
- résultat ;
- QA ;
- sources ;
- document sauvegardé ;
- rendu Desktop ;
- rendu iPhone 14.

---

# 24. Risques identifiés

## 24.1 Duplication registry / n8n

Risque : divergence entre `requiresOffer`, scénarios et prompts.

Réponse : générer ou tester un manifest compact consommable par les fixtures n8n. À défaut, un test de cohérence doit échouer si un scénario registry n'est pas reconnu par n8n.

## 24.2 Explosion combinatoire

Risque : 88 scénarios × 3 finalités × 6 catégories.

Réponse : registry déclarative, defaults par famille, tests table-driven. Ne pas coder un composant ou un prompt complet par combinaison.

## 24.3 Sur-ingénierie des champs auto/user

Risque : construire une machine à états complexe.

Réponse : map légère de provenance de champs et fonction pure de normalisation.

## 24.4 Données RH sensibles

Risque : interprétation excessive d'absences, CRA ou activité.

Réponse : n'utiliser que les faits explicitement disponibles, ne pas générer de diagnostic RH, limiter les sources, garder validation humaine.

## 24.5 Internal sans profil destinataire

Risque : manque de données structurées.

Réponse : rôle, relation et domaine suffisent en V1 ; nom libre optionnel ; aucune fausse personne créée.

## 24.6 Premiers runs `prise_de_parole`

Risque : résultat stocké mais non sauvegardable en document.

Réponse : livrer le support documentaire avant l'ouverture large des points d'entrée non commerciaux.

---

# 25. Décisions définitivement retenues

1. Trois finalités explicites : mail, pitch, briefing.
2. Six catégories métier.
3. Séparation stricte Management consultants / Interne.
4. Un seul composer.
5. Un seul workflow n8n.
6. Une registry TypeScript comme source de vérité.
7. Un resolver pur pour toutes les dépendances.
8. Aucun nouveau système de stockage de communication.
9. Une migration étroite pour `manager_profile_id` et le support documentaire `prise_de_parole`.
10. Une RPC dédiée au contexte collaborateur.
11. Les sources désactivées doivent être réellement exclues de l'hydratation.
12. Les choix utilisateur valides sont préservés.
13. Les valeurs invalides sont remplacées explicitement.
14. Le statut de compte est déduit, non édité dans le composer.
15. Le workflow respecte les scopes, pas la dichotomie `isPitch`.
16. Les anciens runs restent lisibles.
17. Aucun envoi automatique.
18. Chaque lot est versionné, testé et tracé dans un ledger.

---

# 26. Fichiers pivots à auditer avant modification

## Contrats et registry

- `src/lib/n8n/types.ts`
- `src/lib/communication/communication-composer.ts`
- `src/lib/communication/communication-scenario-registry.ts`
- `src/components/accounts-contacts/intelligence/communication-brief-options.ts`

## UI

- `src/components/communication/CommunicationComposerHost.tsx`
- `src/components/accounts-contacts/intelligence/CommunicationBriefForm.tsx`
- `src/components/accounts-contacts/intelligence/ScenarioPicker.tsx`
- `src/components/accounts-contacts/intelligence/ScenarioPickerModal.tsx`
- `src/components/accounts-contacts/intelligence/IntelligenceActionDrawers.tsx`
- `src/components/accounts-contacts/intelligence/PitchResult.tsx`
- `src/components/accounts-contacts/intelligence/CommunicationResult.tsx`

## Trigger et stockage

- `src/app/api/n8n/trigger/route.ts`
- `src/lib/n8n/trigger-run.ts`
- `src/lib/n8n/runs.ts`
- `src/app/api/n8n/callback/route.ts`
- `src/components/accounts-contacts/intelligence/save-as-document.ts`

## n8n

- `n8n/workflows/intel-020-communication.json`
- documentation SETUP associée.

## Documentation

- `docs/adr/ADR-0013-communication-scenarios-catalog.md`
- `INTEL-020-REDACTION-ASSISTEE-V1.md` ou sa copie versionnée dans le repo.

---

# 27. Definition of Done globale

Le chantier est terminé lorsque :

- les trois finalités sont explicitement sélectionnables ;
- les six catégories sont actives ;
- tous les scénarios convenus sont présents ;
- les options sont dynamiques et cohérentes ;
- Management et Interne ont leurs propres champs ;
- le consultant est rattachable au manager connecté ;
- l'hydratation par scope fonctionne ;
- les sources sont réellement filtrées ;
- n8n couvre tous les scénarios ;
- les sorties sont correctement rendues ;
- `prise_de_parole` est sauvegardable ;
- les points d'entrée P0/P1 sont câblés ;
- les anciens runs restent lisibles ;
- aucun compte fantôme n'est créé ;
- les tests registry, resolver, build et E2E passent ;
- le ledger contient la trace complète de chaque lot.

---

# 28. Résumé exécutable pour le prochain agent

```text
Ne reconstruis rien.
Pars du composer global, de la registry, des runs Supabase et du workflow intel-020 existants.

Transforme le modèle actuel :
- 2 modes UI → 3 finalités explicites
- 5 catégories → 6 catégories
- interne_management → management_consultants + internal_staff
- listes globales → options résolues dynamiquement
- hydratation selon isPitch → hydratation selon scope et sources

Conserve :
- outputKind à 3 valeurs
- scope à 3 valeurs
- un seul workflow
- les contrats de sortie
- l'infrastructure run/callback/realtime
- les 11 tons

Ajoute :
- 19 scénarios uniques
- allowedOutputKinds et métadonnées registry
- resolver pur et tests
- manager_profile_id
- RPC collaborateur
- champs Staff structurés
- UI Management et Interne dédiées
- support documentaire prise_de_parole
- points d'entrée progressifs

Travaille lot par lot, mets à jour le ledger, ne commence jamais le lot suivant sans validation.
```
