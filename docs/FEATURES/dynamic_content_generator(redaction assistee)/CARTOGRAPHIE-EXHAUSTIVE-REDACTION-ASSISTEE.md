# Cartographie exhaustive — Rédaction assistée / INTEL-020

**État observé : `main`, audit du 20 août 2026.**  
**Nature : photographie read-only de l’existant.**  
**Périmètre : Rédaction assistée / workflow `intel-020-communication`, de ses points d’entrée UI jusqu’à l’archivage dans Rapports & rédaction.**

> Ordre d’autorité appliqué : code courant `main` → sources canoniques désignées par le code → artefacts générés/workflow → Supabase live → ADR/documentation → rapports de lots historiques. Les divergences ne sont pas réconciliées silencieusement ; elles sont recensées en §14.

---

# 1. Résumé exécutif

Rédaction assistée est le moteur transversal de communication de KREDO. Il ne se limite plus au mail : le contrat courant produit trois **finalités techniques** (`written_message`, `spoken_pitch`, `structured_briefing`) couvrant des messages écrits, des scripts oraux et des fiches de préparation. Ces finalités sont configurées par un `CommunicationBrief` structuré en quatre blocs — **QUOI / QUI / COMMENT / CONTEXTE** — puis envoyées au workflow n8n `intel-020-communication`. `src/lib/n8n/types.ts:L558-L780`.

Le catalogue fonctionnel courant comporte **92 scénarios**, répartis dans **6 catégories canoniques** : `commerce_prospection`, `commerce_actif`, `delivery`, `recrutement`, `management_consultants`, `internal_staff`. Les scénarios opèrent sur **3 scopes** : `account`, `collaborator`, `internal`. La registry TypeScript est la source de vérité du catalogue ; les options réellement disponibles sont dérivées par `communication-options-resolver.ts` en fonction du scope, du contexte réellement chargé et des contraintes de chaque scénario. `src/lib/communication/communication-scenario-registry.ts:L1-L1160`; `src/lib/communication/communication-options-resolver.ts:L1-L320`.

Le flux d’exécution est : point d’entrée UI → `CommunicationComposerHost` → `CommunicationBriefForm`/resolver → `/api/n8n/trigger` → création de `ai_intelligence_runs` → webhook n8n → validation → hydratation du contexte → résolution de l’émetteur → assemblage du prompt → appel Anthropic → parsing/validation → QA → callback → `ai_intelligence_results` → auto-archivage dans `intelligence_documents` + version et liens → consultation dans `/reports`. `src/components/communication/CommunicationComposerHost.tsx:L1-L1010`; `src/app/api/n8n/trigger/route.ts:L1-L350`; `n8n/workflows/intel-020-communication.json:L1-L420`; `src/app/api/n8n/callback/route.ts:L1-L330`.

Le contexte métier est hydraté principalement par trois RPC live : `public.get_communication_context(...)`, `public.get_pitch_context(...)` et `public.get_collaborator_communication_context(...)`. À cela s’ajoutent les références choisies dans le brief, les listes personnelles `preferredCollectionIds`, et un éventuel `knowledgeScope` (Liste ou Corpus), dont les références sont recalculées côté serveur avant l’appel n8n. `src/lib/communication/communication-context-loader.ts:L1-L260`; `src/features/content-collections/data/resolve-knowledge-scope.ts:L1-L130`; `src/app/api/n8n/trigger/route.ts:L210-L275`.

La construction de prompt réellement exécutée dans n8n comporte quatre couches techniques : **règles globales**, **contrat/formats par `outputKind`**, **garde-fous catégorie/scope**, **mission du scénario**. Viennent ensuite, dans le `userPrompt`, le destinataire, le style, le contexte hydraté et les préférences utilisateur. **21 scénarios** ont une mission bespoke dans `FLAGSHIP_MISSIONS`; les **71 autres** utilisent un fallback générique dérivé du manifeste. `n8n/workflows/intel-020-communication.json:L115-L300`.

Les résultats réussis sont persistés avec `phase=5`. Le `result_type` est `communication` pour un écrit ; pour un pitch/briefing, `commercial_pitch` si la catégorie est `commerce_prospection` ou `commerce_actif`, sinon `prise_de_parole`. Ces trois types sont éligibles à l’auto-sauvegarde documentaire. `n8n/workflows/intel-020-communication.json:L220-L320`; `src/lib/communication/communication-result-documents.ts:L1-L105`; `src/app/api/n8n/callback/route.ts:L250-L320`.

---

# 2. Sources de vérité

| Domaine | Source canonique | Sources dérivées | Consommateurs |
|---|---|---|---|
| Types wire INTEL-020 | `src/lib/n8n/types.ts:L558-L820` | aliases/normalisation legacy | registry, UI, API, n8n, archivage |
| Catalogue scénarios | `src/lib/communication/communication-scenario-registry.ts:L1-L1160` | `SCENARIO_REGISTRY`, groupes par catégorie/scope/output | resolver, picker, manifest, tests |
| Contraintes dynamiques | `communication-scenario-registry.ts` + `communication-options-resolver.ts:L1-L320` | options résolues et brief normalisé | `CommunicationBriefForm` |
| Modèle du formulaire | `src/lib/communication/communication-brief-form-model.ts:L1-L300` | visibilité champs/sources et purge refs | `CommunicationBriefForm.tsx` |
| Intents contextuels | `src/lib/communication/communication-entry-intents.ts:L1-L620` | presets de `CommunicationBrief` | boutons contextuels / menus |
| Finalité | `src/lib/communication/communication-purpose.ts:L1-L190` | libellés UI et bascule d’outputKind | switcher/composer |
| Manifeste scénarios | registry TS | `n8n/workflows/intel-020-communication.manifest.json` | `Assemble Prompt` |
| Synchronisation manifest | `scripts/generate-communication-manifest.mjs:L1-L125` | JSON + bloc inliné entre `MANIFEST:START/END` | tests de drift / n8n |
| Exécution | `n8n/workflows/intel-020-communication.json:L1-L420` | prompt/schema/callback | Anthropic, Supabase, callback |
| Contexte compte | `public.get_communication_context(...)` live | JSONB | Host + n8n `Hydrate Context` |
| Contexte pitch/offre | `public.get_pitch_context(...)` live | JSONB | Host + n8n `Hydrate Context` |
| Contexte collaborateur | `public.get_collaborator_communication_context(...)` live | JSONB | Host + n8n `Hydrate Context` |
| Knowledge Scope | `content_collections` / `content_collection_items` + `resolveKnowledgeScope` | refs revalidées serveur | `/api/n8n/trigger` puis n8n |
| Résultat document | `communication-result-documents.ts` | titre, présentation, liens, scope JSON | callback / Reports |
| Archivage | `save-as-document.ts` + `reports-actions.ts` | `intelligence_documents`, versions, links | `/reports` |

## 2.1 Synchronisation registry → manifest → n8n

`scripts/generate-communication-manifest.mjs` importe `SCENARIO_REGISTRY`, sérialise pour chaque scénario `id`, `category`, `label`, `description`, `allowedOutputKinds`, `defaultOutputKind`, `defaultObjective`, `requiresOffer`, trie par ID, écrit `intel-020-communication.manifest.json`, puis inline exactement ce tableau dans le nœud `Assemble Prompt`. Le mode `--check` compare l’artefact JSON et le bloc inliné à la registry et sort en erreur en cas de drift. `scripts/generate-communication-manifest.mjs:L1-L125`.

**Contrôle effectué pendant l’audit : PASS structurel — 92 entrées registry, 92 entrées manifest, 92 entrées dans le manifeste inliné ; contenu structurel concordant.** Le binaire local du repository n’étant pas disponible dans l’environnement d’audit, la commande `node scripts/generate-communication-manifest.mjs --check` n’a pas été exécutée littéralement ; le contrôle a été réalisé par inspection des trois sources.

---

# 3. Arborescence fonctionnelle globale

```text
Rédaction assistée / INTEL-020
├─ Finalité technique
│  ├─ written_message
│  ├─ spoken_pitch
│  └─ structured_briefing
├─ Scope
│  ├─ account
│  ├─ collaborator
│  └─ internal
├─ Catégorie d'activité
│  ├─ commerce_prospection
│  ├─ commerce_actif
│  ├─ delivery
│  ├─ recrutement
│  ├─ management_consultants
│  └─ internal_staff
├─ Scénario (92)
├─ Objectif
├─ Destinataire
│  ├─ type
│  ├─ persona / relation (account)
│  └─ rôle / relation interne / domaine (internal)
├─ Forme
│  ├─ canal
│  ├─ longueur / profondeur / durée
│  └─ langue + formalité
├─ Style
│  └─ ton (11)
├─ Contexte
│  ├─ références CRM
│  ├─ 11 sources contextuelles fixes
│  ├─ listes personnelles
│  ├─ Knowledge Scope Liste/Corpus
│  └─ mustInclude / mustExclude / angle / reprise
├─ Prompt
│  ├─ règles globales
│  ├─ contrat outputKind
│  ├─ règles catégorie/scope
│  ├─ mission scénario bespoke ou générique
│  ├─ destinataire + style
│  ├─ contexte hydraté
│  └─ préférences utilisateur
└─ Résultat
   ├─ communication
   ├─ commercial_pitch
   └─ prise_de_parole
```

Sources : `src/lib/n8n/types.ts:L558-L820`; `src/lib/communication/communication-scenario-registry.ts:L1-L1160`; `n8n/workflows/intel-020-communication.json:L115-L320`.

---

# 4. Catalogue exhaustif des dimensions

## 4.1 Scopes

| ID | Définition réelle | Catégories exposées par le resolver | Source |
|---|---|---|---|
| `account` | contexte CRM / compte | `commerce_prospection`, `commerce_actif`, `delivery`, `recrutement` | `communication-options-resolver.ts:L55-L90` |
| `collaborator` | collaborateur interne sans compte obligatoire | `management_consultants` | idem |
| `internal` | destinataire Staff, aucune entité pivot obligatoire | `internal_staff` | idem |

Le scope est inféré depuis `facts.scope`, puis la présence d’un collaborateur, puis les attributs internes, puis les références compte ; à défaut, le scope courant du brief est conservé. `communication-options-resolver.ts:L35-L75`.

## 4.2 Catégories et profils de contraintes

Les codes **CP / CA / DEL / REC / MGMT / INT** sont réutilisés dans la matrice maîtresse pour éviter de recopier 92 fois les mêmes règles. Ils représentent exactement les contraintes dérivées de `CATEGORY_CONSTRAINTS`. `communication-scenario-registry.ts:L1030-L1105`.

| Code | Catégorie | Destinataires | Faits requis | Faits optionnels | Réfs requises | Réfs optionnelles | Sources requises | Sources optionnelles | Tons suggérés | Tons exclus |
|---|---|---|---|---|---|---|---|---|---|---|
| CP | `commerce_prospection` | `prospect`, `partner` | `account_lifecycle` | `contact_role`, `market_signal` | — | `signalRef`, `contactId` | `account_profile` | `crm_contacts`, `signal_intelligence`, `offer_catalog` | `direct`, `warm`, `business_roi` | `disappointed_confused` |
| CA | `commerce_actif` | `active_client`, `former_client` | `account_lifecycle` | `opportunity_status`, `mission_status` | — | `opportunityRef`, `missionRef`, `profileRef`, `offerRef` | `account_profile` | `crm_contacts`, `opportunity_context`, `mission_context`, `offer_catalog` | `direct`, `diplomatic`, `business_roi` | — |
| DEL | `delivery` | `active_client` | `mission_status` | `delivery_risk`, `milestone_status` | — | `missionRef`, `opportunityRef` | `mission_context` | `account_profile`, `interaction_history` | `diplomatic`, `prudent`, `assertive` | `enthusiastic_confident` |
| REC | `recrutement` | défaut catégorie : `candidate`, `active_client`; overrides scénario ci-dessous | `candidate_or_opportunity_context` | `availability`, `salary_expectation` | — | `profileRef`, `opportunityRef` | `candidate_profile` | `account_profile`, `opportunity_context` | `warm`, `direct`, `diplomatic` | `disappointed_confused` |
| MGMT | `management_consultants` | `collaborator` | `collaborator_context` | `assignment`, `performance_context`, `availability` | `collaboratorId` | `collaboratorRef`, `missionRef` | `collaborator_context` | `mission_context` | `diplomatic`, `prudent`, `warm` | `business_roi` |
| INT | `internal_staff` | `internal` | `internal_request_context` | `linked_entity`, `resource_need` | — | `companyRef`, `opportunityRef`, `missionRef`, `collaboratorRef`, `offerRef` | — | `account_profile`, `opportunity_context`, `mission_context`, `source_document` | `business_roi`, `assertive`, `prudent` | `disappointed_confused` |

Pour `internal_staff`, les rôles autorisés sont `manager_n1`, `recruitment`, `practice_lead`, `presales`, `finance_admin`, `delivery_management`, `executive_management`, `peer_business_manager`, `other`; relations internes : `hierarchical_up`, `peer`, `cross_functional`, `executive_committee`, `team`; domaines : `commercial`, `staffing`, `recruitment`, `delivery`, `practice`, `presales`, `finance`, `operations`, `strategy`. `src/lib/n8n/types.ts:L730-L780`; `communication-scenario-registry.ts:L1060-L1105`.

## 4.3 Finalités / `outputKind`

| ID | Libellé UI | Canaux compatibles | Source |
|---|---|---|---|
| `written_message` | Rédiger un mail | `email`, `linkedin_invitation`, `linkedin_message`, `internal_note` | `communication-purpose.ts:L15-L70`; registry |
| `spoken_pitch` | Élaborer un pitch | `spoken_pitch_30s` | idem |
| `structured_briefing` | Préparer un RDV | `meeting_briefing` | idem |

## 4.4 Canaux

`email`, `linkedin_invitation`, `linkedin_message`, `internal_note`, `spoken_pitch_30s`, `meeting_briefing`. `src/lib/n8n/types.ts:L558-L570`.

Libellés UI : **Email**, **Invitation LinkedIn**, **Message LinkedIn**, **Note interne**, **Pitch oral 30 s**, **Fiche de préparation RDV**. `src/components/accounts-contacts/intelligence/communication-brief-options.ts:L25-L70`.

## 4.5 Longueurs

Valeurs autorisées dans toutes les catégories : `ultra_short`, `concise`, `standard`, `detailed`. `communication-scenario-registry.ts:L1020-L1035`.

Pour les écrits, les bornes prompt sont respectivement **40–80**, **80–140**, **140–220**, **220–400 mots**. Pour un briefing, les niveaux deviennent Flash / Synthétique / Standard / Approfondi. Pour `spoken_pitch`, le prompt convertit la longueur en durée/cible de mots. `n8n/workflows/intel-020-communication.json:L115-L210`.

## 4.6 Destinataires

Types : `prospect`, `active_client`, `former_client`, `partner`, `candidate`, `collaborator`, `internal`. Personas account : `ceo`, `cto_cio`, `ciso`, `business_director`, `purchasing`, `hr_talent`, `technical`, `operational`, `other`. Relations account : `unknown`, `cold`, `warm`, `established`, `active_client`, `former`. `src/lib/n8n/types.ts:L710-L790`.

Le type de destinataire est normalisé par le resolver. Pour un scope `collaborator`, il est forcé à `collaborator`; pour `internal`, à `internal`. Pour `account`, il est choisi parmi les types éligibles du scénario selon les faits disponibles. `communication-options-resolver.ts:L120-L245`.

## 4.7 Objectifs

Valeurs présentes : `get_meeting`, `get_reply`, `get_feedback`, `present_offer`, `submit_profile`, `accelerate_decision`, `reactivate`, `confirm_next_steps`, `invite_to_interview`, `send_offer`, `reject_candidate`, `align_internal`, `request_action`, `secure_payment`, `escalate_issue`, `summarize_decisions`, `announce_change`, `repair_relationship`, `manage_expectations`, `de_escalate_tension`, `close_candidate`, `advocate_for_candidate`, `negotiate_terms`, `acknowledge_contribution`, `deliver_difficult_news`, `address_performance_issue`, `secure_resources`. `src/lib/n8n/types.ts:L790-L840`.

Dans l’état actuel de la registry, aucun seed n’utilise un override `allowedObjectives`; `allowedObjectives` est donc, pour chaque scénario, le singleton `[defaultObjective]`. `communication-scenario-registry.ts:L1090-L1145`.

## 4.8 Émetteur

Rôles canoniques : `business_manager`, `agency_director`, `practice_lead`, `recruiter`, `delivery_manager`, `consultant`, `general_management`. Le défaut du brief est `business_manager`. Le nom est dérivé du profil de l’utilisateur ; n8n relit `profiles.full_name,email,role` au nœud `Resolve Sender`. `src/lib/n8n/types.ts:L700-L725`; `communication-brief-options.ts:L185-L260`; `n8n/workflows/intel-020-communication.json:L100-L145`.

## 4.9 Style

`formality`: `vous` ou `tu`, défaut `vous`. `language`: `fr` ou `en`, défaut `fr`. `tone`: 11 valeurs détaillées au §6. `src/lib/n8n/types.ts:L850-L930`; `communication-brief-options.ts:L185-L260`.

## 4.10 Références et contexte libre

Champs de `CommunicationBrief.context` réellement transportés : `mustInclude`, `mustExclude`, `signalRef`, `companyRef`, `opportunityRef`, `interactionRef`, `missionRef`, `profileRef`, `sourceDocumentId`, `sourceRunId`, `previousMessage`, `reuseMode`, `angle`, `offerRef`, `collaboratorRef`, `disabledContextSources`, `preferredCollectionIds`, `knowledgeScope`. `src/lib/n8n/types.ts:L880-L960`.

## 4.11 Sources de contexte fixes

Les 11 IDs sont : `account_profile`, `crm_contacts`, `signal_intelligence`, `opportunity_context`, `interaction_history`, `mission_context`, `candidate_profile`, `collaborator_context`, `offer_catalog`, `source_document`, `previous_generation`. Le formulaire peut les rendre `locked_on`, `optional_on`, `optional_off` ou `unavailable`. Les sources requises ne sont pas désactivables. `CommunicationBriefForm.tsx:L45-L145`; `communication-brief-form-model.ts:L75-L170`.

## 4.12 Listes personnelles et Knowledge Scope

- `preferredCollectionIds`: multi-sélection de collections, indépendante des 11 sources fixes ; n8n relit le contenu canonique.
- `knowledgeScope`: une Liste ou un Corpus unique ; le navigateur transmet l’ID et des métadonnées, mais `/api/n8n/trigger` recalcule les refs côté serveur depuis `content_collections` / `content_collection_items` avant l’envoi n8n.

`src/features/content-collections/data/resolve-knowledge-scope.ts:L1-L130`; `src/app/api/n8n/trigger/route.ts:L220-L270`.

---

# 5. Matrice maîtresse des scénarios

## 5.1 Légende de compression

Pour les colonnes **Faits**, **Références**, **Sources contexte** et les contraintes de tons/destinataires qui sont strictement héritées d’une catégorie, la cellule indique le code du profil du §4.2 : **CP, CA, DEL, REC, MGMT, INT**. Cela représente la combinaison exacte `required/optional/suggested/excluded`, et non un produit cartésien.

`WM` = `written_message`; `SP` = `spoken_pitch`; `SB` = `structured_briefing`.  
Canaux : `E`=`email`, `LI`=`linkedin_invitation`, `LM`=`linkedin_message`, `IN`=`internal_note`, `S30`=`spoken_pitch_30s`, `MB`=`meeting_briefing`.  
Longueurs pour toutes les lignes : `ultra_short | concise | standard | detailed`.  
`B` dans Mission = mission bespoke de `FLAGSHIP_MISSIONS`; `G` = fallback générique dérivé du manifeste.

| Catégorie | Scenario ID | Libellé | Description | Scope autorisé | OutputKinds allowed → default | Canaux allowed → default | Objectif allowed → default | Longueurs | Destinataires | Tons suggérés / exclus | Offre requise | Faits req/opt | Réfs req/opt | Sources req/opt | Mission |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CP | `signal_outreach` | Premier contact (signal/actualité) | Prise de contact initiale en s'appuyant sur un signal ou une actualité récente. | account | WM→WM | E/LI/LM/IN→E | get_meeting→get_meeting | 4 | CP | CP | non | CP | CP | CP | G |
| CP | `follow_up_no_reply` | Relance sans réponse | Relance légère après un premier message resté sans réponse. | account | WM→WM | E/LI/LM/IN→E | get_reply→get_reply | 4 | CP | CP | non | CP | CP | CP | G |
| CP | `offer_introduction` | Présentation d'offre | Présente une offre ou une practice Kredo en partant du besoin client. | account | WM→WM | E/LI/LM/IN→E | present_offer→present_offer | 4 | CP | CP | **oui** | CP | CP + `offerRef` requis | CP | G |
| CP | `appointment_confirmation` | Confirmation de rendez-vous | Confirme un rendez-vous à venir avec les informations pratiques. | account | WM→WM | E/LI/LM/IN→E | confirm_next_steps→confirm_next_steps | 4 | CP | CP | non | CP | CP | CP | G |
| CP | `first_contact_after_nomination` | Prise de contact après nomination | Aborde un décideur nouvellement nommé sur un poste pertinent. | account | WM→WM | E/LI/LM/IN→E | get_meeting→get_meeting | 4 | CP | CP | non | CP | CP | CP | G |
| CP | `linkedin_to_email_bridge` | Bascule LinkedIn → email | Poursuit par email une conversation entamée sur LinkedIn. | account | WM→WM | E/LI/LM/IN→E | get_reply→get_reply | 4 | CP | CP | non | CP | CP | CP | G |
| CP | `event_invitation` | Invitation événement / webinar | Invite le destinataire à un événement ou un webinar Kredo. | account | WM→WM | E/LI/LM/IN→E | get_meeting→get_meeting | 4 | CP | CP | non | CP | CP | CP | G |
| CP | `sector_rebound` | Rebond sur actualité sectorielle | S'appuie sur une actualité du secteur du compte pour justifier la prise de contact. | account | WM→WM | E/LI/LM/IN→E | get_meeting→get_meeting | 4 | CP | CP | non | CP | CP | CP | G |
| CP | `discovery_meeting_request` | Demande de RDV découverte | Sollicite explicitement un premier rendez-vous de découverte. | account | WM→WM | E/LI/LM/IN→E | get_meeting→get_meeting | 4 | CP | CP | non | CP | CP | CP | G |
| CP | `cold_call_pitch` | Cold call prospect | Script de pitch oral pour un appel de prospection à froid ou tiède, 30 secondes environ. | account | SP→SP | S30→S30 | get_meeting→get_meeting | 4 | CP | CP | **oui** | CP | CP + `offerRef` requis | CP | G |
| CP | `meeting_prep_discovery` | Préparation RDV découverte | Fiche de préparation pour un premier rendez-vous de découverte, sans ancrage catalogue obligatoire. | account | SB→SB | MB→MB | get_meeting→get_meeting | 4 | CP | CP | non | CP | CP | CP | G |
| CP | `signal_based_pitch` | Pitch ancré sur un signal | Pitch oral construit autour d'un signal de veille précis plutôt qu'une offre catalogue. | account | SP→SP | S30→S30 | get_meeting→get_meeting | 4 | CP | CP | non | CP | CP | CP | G |
| CP | `sector_persona_pitch` | Pitch sectoriel / persona | Brief de RDV orienté par les enjeux du secteur et le persona du décideur ciblé. | account | SB→SB | MB→MB | get_meeting→get_meeting | 4 | CP | CP | non | CP | CP | CP | G |
| CP | `why_us_now_pitch` | Pitch « pourquoi nous maintenant » | Argumentaire oral sur l'urgence et la légitimité de Kredo à ce moment précis. | account | SP→SP | S30→S30 | get_meeting→get_meeting | 4 | CP | CP | non | CP | CP | CP | G |
| CP | `first_objection_bad_timing` | Réponse « pas le bon moment » | Réplique orale à l'objection de timing lors d'un premier contact. | account | SP→SP | S30→S30 | get_meeting→get_meeting | 4 | CP | CP | non | CP | CP | CP | G |
| CA | `post_meeting` | Suivi après rendez-vous | Remercie, résume les points clés et confirme les prochaines étapes après un RDV. | account | WM→WM | E/LI/LM/IN→E | confirm_next_steps→confirm_next_steps | 4 | CA | CA | non | CA | CA | CA | G |
| CA | `profile_submission_to_client` | Envoi de profil | Présente un profil consultant ou candidat en le contextualisant sur le besoin. | account | WM→WM | E/LI/LM/IN→E | submit_profile→submit_profile | 4 | CA | CA | non | CA | CA | CA | G |
| CA | `cross_sell` | Cross-sell / mission existante | Propose un service complémentaire chez un client dont une mission est déjà en cours. | account | WM→WM | E/LI/LM/IN→E | present_offer→present_offer | 4 | CA | CA | **oui** | CA | CA + `offerRef` requis | CA | **B** |
| CA | `reactivation` | Réactivation ancien client | Reprend contact avec un ancien client ou un contact devenu inactif. | account | WM→WM | E/LI/LM/IN→E | reactivate→reactivate | 4 | CA | CA | non | CA | CA | CA | G |
| CA | `proposal_follow_up` | Relance de proposition | Relance après l'envoi d'une proposition commerciale en facilitant la décision. | account | WM→WM | E/LI/LM/IN→E | accelerate_decision→accelerate_decision | 4 | CA | CA | non | CA | CA | CA | G |
| CA | `invoice_follow_up` | Relance de facture | Relance diplomatique d'une facture impayée ou en retard. | account | WM→WM | E/LI/LM/IN→E | secure_payment→secure_payment | 4 | CA | CA | non | CA | CA | CA | G |
| CA | `mission_renewal` | Renouvellement / extension de mission | Propose le renouvellement ou l'extension d'une mission en cours. | account | WM→WM | E/LI/LM/IN→E | accelerate_decision→accelerate_decision | 4 | CA | CA | non | CA | CA | CA | G |
| CA | `consultant_replacement_notice` | Annonce de remplacement consultant | Informe le client d'un changement de consultant sur la mission. | account | WM→WM | E/LI/LM/IN→E | announce_change→announce_change | 4 | CA | CA | non | CA | CA | CA | **B** |
| CA | `client_tension_apology` | Message d'apaisement tension client | Désamorce par écrit une tension ou une insatisfaction exprimée par le client. | account | WM→WM | E/LI/LM/IN→E | repair_relationship→repair_relationship | 4 | CA | CA | non | CA | CA | CA | **B** |
| CA | `delivery_delay_notice` | Annonce de retard de livraison | Informe le client d'un retard de livraison en gérant les attentes. | account | WM→WM | E/LI/LM/IN→E | manage_expectations→manage_expectations | 4 | CA | CA | non | CA | CA | CA | G |
| CA | `meeting_prep_cross_sell` | Préparation RDV cross-sell | Fiche de préparation pour un RDV chez un client actif visant une offre non encore consommée. | account | SB→SB | MB→MB | present_offer→present_offer | 4 | CA | CA | **oui** | CA | CA + `offerRef` requis | CA | **B** |
| CA | `proposal_defense_pitch` | Soutenance de proposition | Brief pour défendre une proposition commerciale à l'oral. | account | SB→SB | MB→MB | accelerate_decision→accelerate_decision | 4 | CA | CA | **oui** | CA | CA + `offerRef` requis | CA | **B** |
| CA | `renewal_pitch` | Pitch renouvellement / extension | Brief oral pour défendre un renouvellement ou une extension de mission. | account | SB→SB | MB→MB | accelerate_decision→accelerate_decision | 4 | CA | CA | **oui** | CA | CA + `offerRef` requis | CA | G |
| CA | `price_objection_pitch` | Réponse objection prix | Script oral pour répondre à une objection de prix en RDV. | account | SP→SP | S30→S30 | accelerate_decision→accelerate_decision | 4 | CA | CA | non | CA | CA | CA | G |
| CA | `client_crisis_talk_track` | Pitch de crise client | Trame orale pour gérer une crise ou un point de tension fort avec un client. | account | SB→SB | MB→MB | de_escalate_tension→de_escalate_tension | 4 | CA | CA | non | CA | CA | CA | **B** |
| CA | `delay_talk_track` | Annonce retard / difficulté livraison | Trame orale pour annoncer et gérer un retard ou une difficulté de livraison en RDV. | account | SB→SB | MB→MB | manage_expectations→manage_expectations | 4 | CA | CA | non | CA | CA | CA | **B** |
| CA | `tense_copil_briefing` | Brief comité de pilotage tendu | Prépare la posture et les messages clés pour un comité de pilotage sous tension. | account | SB→SB | MB→MB | summarize_decisions→summarize_decisions | 4 | CA | CA | non | CA | CA | CA | G |
| DEL | `project_alert_escalation` | Alerte projet / escalade client | Alerte le client sur un risque projet nécessitant une escalade. | account | WM→WM | E/LI/LM/IN→E | escalate_issue→escalate_issue | 4 | DEL | DEL | non | DEL | DEL | DEL | G |
| DEL | `steering_committee_minutes` | Compte-rendu de comité de pilotage | Synthétise les décisions et actions d'un comité de pilotage. | account | WM→WM | E/LI/LM/IN→E | summarize_decisions→summarize_decisions | 4 | DEL | DEL | non | DEL | DEL | DEL | G |
| DEL | `risk_communication` | Communication proactive de risque | Alerte le client en amont sur un risque identifié avant qu'il ne se matérialise. | account | WM→WM | E/LI/LM/IN→E | escalate_issue→escalate_issue | 4 | DEL | DEL | non | DEL | DEL | DEL | G |
| DEL | `milestone_validation_request` | Demande de validation de jalon | Sollicite la validation client d'un jalon projet. | account | WM→WM | E/LI/LM/IN→E | request_action→request_action | 4 | DEL | DEL | non | DEL | DEL | DEL | G |
| DEL | `escalation_briefing` | Brief avant escalade interne | Prépare la présentation d'un risque projet avant escalade interne. | account | SB→SB | MB→MB | escalate_issue→escalate_issue | 4 | DEL | DEL | non | DEL | DEL | DEL | **B** |
| DEL | `risk_meeting_briefing` | Brief avant point risque projet | Prépare la posture et les messages clés pour un point dédié à un risque projet. | account | SB→SB | MB→MB | escalate_issue→escalate_issue | 4 | DEL | DEL | non | DEL | DEL | DEL | **B** |
| REC | `candidate_interview_invitation` | Invitation à un entretien candidat | Invite un candidat à un entretien. | account | WM→WM | E/LI/LM/IN→E | invite_to_interview→invite_to_interview | 4 | **candidate** | REC | non | REC | REC | REC | G |
| REC | `candidate_follow_up` | Relance candidat | Relance un candidat resté sans réponse. | account | WM→WM | E/LI/LM/IN→E | get_reply→get_reply | 4 | **candidate** | REC | non | REC | REC | REC | G |
| REC | `candidate_offer` | Proposition d'embauche | Transmet une proposition d'embauche formelle à un candidat. | account | WM→WM | E/LI/LM/IN→E | send_offer→send_offer | 4 | **candidate** | REC | non | REC | REC | REC | G |
| REC | `candidate_rejection` | Refus candidat | Notifie un refus de candidature avec tact. | account | WM→WM | E/LI/LM/IN→E | reject_candidate→reject_candidate | 4 | **candidate** | REC | non | REC | REC | REC | G |
| REC | `candidate_availability_check` | Demande de disponibilité / préavis | Interroge un candidat sur sa disponibilité ou son préavis. | account | WM→WM | E/LI/LM/IN→E | request_action→request_action | 4 | **candidate** | REC | non | REC | REC | REC | G |
| REC | `candidate_post_interview_feedback` | Feedback après entretien | Transmet un retour au candidat après un entretien. | account | WM→WM | E/LI/LM/IN→E | get_feedback→get_feedback | 4 | **candidate** | REC | non | REC | REC | REC | G |
| REC | `candidate_cv_completion_request` | Demande de complément CV | Demande à un candidat de compléter son CV ou son portfolio. | account | WM→WM | E/LI/LM/IN→E | request_action→request_action | 4 | **candidate** | REC | non | REC | REC | REC | G |
| REC | `dormant_talent_pool_reactivation` | Relance vivier dormant | Réactive un candidat resté inactif dans le vivier. | account | WM→WM | E/LI/LM/IN→E | reactivate→reactivate | 4 | **candidate** | REC | non | REC | REC | REC | G |
| REC | `candidate_to_client_pitch` | Pitch candidat vers client | Présente un candidat à un client de façon structurée et argumentée à l'oral. | account, internal | SB→SB | MB→MB | present_offer→present_offer | 4 | **active_client, prospect** | REC | non | REC | REC | REC | **B** |
| REC | `opportunity_to_candidate_pitch` | Pitch opportunité vers candidat | Présente une opportunité à un candidat de façon structurée à l'oral. | account, internal | SB→SB | MB→MB | submit_profile→submit_profile | 4 | **candidate** | REC | non | REC | REC | REC | G |
| REC | `candidate_closing_pitch` | Pitch closing candidat | Script oral pour conclure un processus de recrutement avec un candidat. | account | SP→SP | S30→S30 | close_candidate→close_candidate | 4 | **candidate** | REC | non | REC | REC | REC | G |
| REC | `atypical_candidate_defense` | Défense d'un candidat atypique | Brief pour argumenter en faveur d'un candidat au profil atypique. | account | SB→SB | MB→MB | advocate_for_candidate→advocate_for_candidate | 4 | **active_client, prospect** | REC | non | REC | REC | REC | **B** |
| REC | `recruiter_briefing_pre_interview` | Brief recruteur avant entretien | Prépare le recruteur avant un entretien candidat. | account | SB→SB | MB→MB | align_internal→align_internal | 4 | **candidate** | REC | non | REC | REC | REC | G |
| REC | `mobility_salary_pitch` | Pitch mobilité / TJM / salaire | Script oral pour aborder la mobilité, le TJM ou le salaire avec un candidat. | account | SP→SP | S30→S30 | negotiate_terms→negotiate_terms | 4 | **candidate** | REC | non | REC | REC | REC | G |
| MGMT | `manager_collaborator_internal` | Communication manager/collaborateur | Message interne d'un manager à un collaborateur. | collaborator | WM→WM | E/LI/LM/IN→IN | align_internal→align_internal | 4 | MGMT | MGMT | non | MGMT | MGMT | MGMT | G |
| MGMT | `cra_absence_reminder` | Rappel CRA ou absence | Rappelle à un collaborateur de compléter son CRA ou de déclarer une absence. | collaborator | WM→WM | E/LI/LM/IN→E | request_action→request_action | 4 | MGMT | **direct,diplomatic / business_roi** | non | MGMT | MGMT | MGMT | G |
| MGMT | `one_on_one_alignment` | Préparation point 1:1 | Prépare les messages clés d'un point d'alignement 1:1 avec un collaborateur. | collaborator | SB→SB | MB→MB | align_internal→align_internal | 4 | MGMT | MGMT | non | MGMT | MGMT | MGMT | G |
| MGMT | `collaborator_recognition` | Félicitation / valorisation | Valorise par écrit la contribution d'un collaborateur. | collaborator | **WM,SP→WM** | E/LI/LM/IN/S30→IN | acknowledge_contribution→acknowledge_contribution | 4 | MGMT | **warm,enthusiastic_confident,direct / business_roi** | non | MGMT | MGMT | MGMT | **B** |
| MGMT | `assignment_change_notice` | Annonce changement de mission | Informe un collaborateur d'un changement de mission ou de planning. | collaborator | **WM,SP→WM** | E/LI/LM/IN/S30→IN | announce_change→announce_change | 4 | MGMT | MGMT | non | MGMT | MGMT | MGMT | G |
| MGMT | `performance_review_prep` | Préparation entretien annuel | Prépare la structure et les messages clés d'un entretien annuel. | collaborator | SB→SB | MB→MB | align_internal→align_internal | 4 | MGMT | MGMT | non | MGMT | MGMT | MGMT | G |
| MGMT | `difficult_announcement_talk_track` | Talk track annonce difficile | Trame orale pour une annonce difficile à un collaborateur (démission imprévue, PSE, réorganisation). | collaborator | **SP,SB→SB** | S30/MB→MB | deliver_difficult_news→deliver_difficult_news | 4 | MGMT | **diplomatic,prudent,formal / business_roi** | non | MGMT | MGMT | MGMT | **B** |
| MGMT | `disciplinary_meeting_posture` | Posture entretien de recadrage | Prépare la posture et les messages clés d'un entretien de recadrage. | collaborator | SB→SB | MB→MB | address_performance_issue→address_performance_issue | 4 | MGMT | **assertive,direct,diplomatic,prudent / business_roi** | non | MGMT | MGMT | MGMT | **B** |
| MGMT | `intercontract_exit_pitch` | Pitch sortie d'intercontrat | Prépare la discussion de sortie d'intercontrat avec un collaborateur. | collaborator | **SP,SB→SB** | S30/MB→MB | align_internal→align_internal | 4 | MGMT | **direct,prudent,pedagogical / business_roi** | non | MGMT | MGMT | MGMT | **B** |
| MGMT | `sensitive_meeting_briefing` | Brief avant point sensible | Prépare la posture avant un point sensible avec un collaborateur. | collaborator | SB→SB | MB→MB | align_internal→align_internal | 4 | MGMT | **diplomatic,prudent,formal / business_roi** | non | MGMT | MGMT | MGMT | G |
| MGMT | `performance_feedback_follow_up` | Suivi de feedback de performance | Formalise un suivi de feedback avec un collaborateur. | collaborator | WM→WM | E/LI/LM/IN→IN | address_performance_issue→address_performance_issue | 4 | MGMT | **direct,pedagogical,prudent / business_roi** | non | MGMT | MGMT | MGMT | G |
| MGMT | `intercontract_action_plan_message` | Plan d'action intercontrat | Communique les prochaines étapes d'un plan intercontrat. | collaborator | WM→WM | E/LI/LM/IN→IN | request_action→request_action | 4 | MGMT | **direct,prudent,pedagogical / business_roi** | non | MGMT | MGMT | MGMT | G |
| MGMT | `annual_review_follow_up` | Suivi d'entretien annuel | Récapitule les décisions après un entretien annuel. | collaborator | WM→WM | E/LI/LM/IN→IN | confirm_next_steps→confirm_next_steps | 4 | MGMT | MGMT | non | MGMT | MGMT | MGMT | G |
| MGMT | `consultant_retention_follow_up` | Suivi de rétention consultant | Formalise les engagements issus d'un échange de rétention. | collaborator | WM→WM | E/LI/LM/IN→IN | confirm_next_steps→confirm_next_steps | 4 | MGMT | **warm,diplomatic,prudent / business_roi** | non | MGMT | MGMT | MGMT | G |
| MGMT | `performance_feedback_talk_track` | Talk track feedback de performance | Prépare un échange oral de feedback. | collaborator | SP→SP | S30→S30 | address_performance_issue→address_performance_issue | 4 | MGMT | **direct,pedagogical,prudent / business_roi** | non | MGMT | MGMT | MGMT | **B** |
| MGMT | `retention_conversation_talk_track` | Talk track de rétention | Prépare une conversation orale de rétention. | collaborator | SP→SP | S30→S30 | manage_expectations→manage_expectations | 4 | MGMT | **warm,diplomatic,prudent / business_roi** | non | MGMT | MGMT | MGMT | **B** |
| MGMT | `career_opportunity_talk_track` | Talk track opportunité de carrière | Prépare la présentation orale d'une opportunité de carrière. | collaborator | SP→SP | S30→S30 | manage_expectations→manage_expectations | 4 | MGMT | **enthusiastic_confident,warm,pedagogical / business_roi** | non | MGMT | MGMT | MGMT | G |
| MGMT | `career_development_briefing` | Briefing développement de carrière | Prépare un entretien de développement de carrière. | collaborator | SB→SB | MB→MB | align_internal→align_internal | 4 | MGMT | **enthusiastic_confident,warm,pedagogical / business_roi** | non | MGMT | MGMT | MGMT | G |
| MGMT | `retention_conversation_briefing` | Briefing entretien de rétention | Prépare un entretien structuré de rétention. | collaborator | SB→SB | MB→MB | manage_expectations→manage_expectations | 4 | MGMT | **warm,diplomatic,prudent / business_roi** | non | MGMT | MGMT | MGMT | **B** |
| INT | `internal_arbitrage_request` | Demande d'arbitrage manager | Sollicite un arbitrage de la hiérarchie sur un sujet donné. | internal | WM→WM | E/LI/LM/IN→IN | request_action→request_action | 4 | INT | INT | non | INT | INT | INT | G |
| INT | `staffing_help_request` | Demande d'aide staffing | Sollicite de l'aide en interne pour résoudre une problématique de staffing. | internal | WM→WM | E/LI/LM/IN→IN | request_action→request_action | 4 | INT | INT | non | INT | INT | INT | G |
| INT | `handover_note` | Note de passation | Rédige une note de passation d'un dossier ou d'un compte. | internal | WM→WM | E/LI/LM/IN→IN | summarize_decisions→summarize_decisions | 4 | INT | INT | non | INT | INT | INT | G |
| INT | `internal_validation_before_send` | Demande de validation avant envoi client | Sollicite une validation interne avant l'envoi d'un message au client. | internal | WM→WM | E/LI/LM/IN→IN | request_action→request_action | 4 | INT | INT | non | INT | INT | INT | G |
| INT | `weekly_briefing_prep` | Préparation point hebdo | Prépare les messages clés d'un point hebdomadaire. | internal | SB→SB | MB→MB | summarize_decisions→summarize_decisions | 4 | INT | INT | non | INT | INT | INT | G |
| INT | `quarterly_business_review` | Business review trimestrielle | Prépare le discours et la posture pour une business review trimestrielle devant son manager. | internal | **SP,SB→SB** | S30/MB→MB | summarize_decisions→summarize_decisions | 4 | INT | **formal,business_roi,assertive / disappointed_confused** | non | INT | INT | INT | **B** |
| INT | `resource_arbitrage_pitch` | Pitch demande de moyens / arbitrage | Argumentaire oral pour obtenir des moyens ou un arbitrage. | internal | **SP,SB→SB** | S30/MB→MB | secure_resources→secure_resources | 4 | INT | INT | non | INT | INT | INT | **B** |
| INT | `internal_committee_pitch` | Pitch en comité interne | Prépare une prise de parole devant un comité interne. | internal | **SP,SB→SB** | S30/MB→MB | summarize_decisions→summarize_decisions | 4 | INT | INT | non | INT | INT | INT | G |
| INT | `investment_arbitrage_argument` | Argumentaire arbitrage investissement | Construit l'argumentaire oral pour un arbitrage d'investissement. | internal | **SP,SB→SB** | S30/MB→MB | secure_resources→secure_resources | 4 | INT | INT | non | INT | INT | INT | **B** |
| INT | `project_status_pitch` | Point d'avancement projet | Prépare un point d'avancement projet à l'oral. | internal | **SP,SB→SB** | S30/MB→MB | summarize_decisions→summarize_decisions | 4 | INT | INT | non | INT | INT | INT | G |
| INT | `direction_summary_pitch` | Synthèse orale pour direction | Prépare une synthèse orale à destination de la direction. | internal | **SP,SB→SB** | S30/MB→MB | summarize_decisions→summarize_decisions | 4 | INT | **formal,business_roi,assertive / disappointed_confused** | non | INT | INT | INT | G |
| INT | `manager_status_update` | Point de statut au manager | Communique une mise à jour de statut au manager. | internal | WM→WM | E/LI/LM/IN→IN | summarize_decisions→summarize_decisions | 4 | INT | INT | non | INT | INT | INT | G |
| INT | `cross_functional_coordination_request` | Demande de coordination transverse | Sollicite une coordination avec une équipe Staff. | internal | WM→WM | E/LI/LM/IN→IN | request_action→request_action | 4 | INT | **direct,diplomatic / disappointed_confused** | non | INT | INT | INT | G |
| INT | `internal_decision_summary` | Synthèse de décision interne | Récapitule les décisions et prochaines étapes internes. | internal | WM→WM | E/LI/LM/IN→IN | summarize_decisions→summarize_decisions | 4 | INT | INT | non | INT | INT | INT | G |
| INT | `internal_alert_escalation` | Escalade d'alerte interne | Alerte les parties prenantes Staff sur une situation à traiter. | internal | WM→WM | E/LI/LM/IN→IN | escalate_issue→escalate_issue | 4 | INT | **prudent,assertive / disappointed_confused** | non | INT | INT | INT | G |
| INT | `practice_support_pitch` | Pitch d'appui Practice | Prépare une demande orale d'appui Practice. | internal | SP→SP | S30→S30 | secure_resources→secure_resources | 4 | INT | **technical_expertise,business_roi,direct / disappointed_confused** | non | INT | INT | INT | G |
| INT | `presales_support_pitch` | Pitch d'appui avant-vente | Prépare une demande orale d'appui avant-vente. | internal | SP→SP | S30→S30 | secure_resources→secure_resources | 4 | INT | **technical_expertise,business_roi,enthusiastic_confident / disappointed_confused** | non | INT | INT | INT | G |
| INT | `staffing_priority_pitch` | Pitch de priorité staffing | Prépare une demande orale de priorisation staffing. | internal | SP→SP | S30→S30 | secure_resources→secure_resources | 4 | INT | INT | non | INT | INT | INT | G |
| INT | `cross_functional_alignment_briefing` | Briefing alignement transverse | Prépare un alignement entre fonctions Staff. | internal | SB→SB | MB→MB | align_internal→align_internal | 4 | INT | **direct,diplomatic / disappointed_confused** | non | INT | INT | INT | G |
| INT | `staffing_review_briefing` | Briefing revue staffing | Prépare une revue de staffing interne. | internal | SB→SB | MB→MB | summarize_decisions→summarize_decisions | 4 | INT | INT | non | INT | INT | INT | G |
| INT | `presales_kickoff_briefing` | Briefing lancement avant-vente | Prépare le lancement d'une mobilisation avant-vente. | internal | SB→SB | MB→MB | align_internal→align_internal | 4 | INT | **technical_expertise,business_roi,enthusiastic_confident / disappointed_confused** | non | INT | INT | INT | G |

Source de la matrice : `src/lib/communication/communication-scenario-registry.ts:L1-L1160`. Les contraintes `requiresOffer` finales proviennent de `OFFER_REQUIRED_SCENARIOS`; les canaux sont dérivés de `OUTPUT_CHANNELS`; les scénarios multi-finalités proviennent de `MULTI_OUTPUT_KINDS`. `communication-scenario-registry.ts:L1030-L1145`.

**Comptage : 92 scénarios = 15 CP + 17 CA + 6 DEL + 14 REC + 19 MGMT + 21 INT.**

---

# 6. Matrice des tons

| Tone ID | Libellé UI | Instruction réellement envoyée au LLM | Scénarios/catégories concernés | Restrictions |
|---|---|---|---|---|
| `direct` | Direct | « Direct : va à l'essentiel, phrases courtes, aucune formule creuse. » | suggéré CP ; CA ; REC ; overrides MGMT/INT | exclu seulement si le scénario/catégorie l’exclut via resolver |
| `formal` | Formel | « Formel : registre soutenu, vouvoiement strict, distance professionnelle. » | disponible globalement ; suggéré sur plusieurs scénarios sensibles/direction | aucune exclusion catégorielle directe |
| `warm` | Chaleureux | « Chaleureux : cordial et humain, tout en restant professionnel. » | suggéré CP, REC, MGMT | aucune exclusion directe |
| `assertive` | Assertif | « Assertif : affirme la valeur avec assurance, sans agressivité. » | suggéré DEL, INT et recadrage | aucune exclusion directe |
| `pedagogical` | Pédagogue | « Pédagogue : explique clairement, sans jargon inutile, en guidant le lecteur. » | overrides management | aucune exclusion directe |
| `diplomatic` | Diplomatique | « Diplomatique : mesuré, tactique, ménage les susceptibilités sur les sujets sensibles. » | CA, DEL, REC, MGMT | aucune exclusion directe |
| `technical_expertise` | Technique / expertise | « Technique : précis et direct, sans vulgarisation excessive, pour un interlocuteur de haut niveau technique. Évite la pédagogie inutile. » | surtout appui Practice/avant-vente | aucune exclusion directe |
| `business_roi` | Business / ROI | « Business/ROI : oriente vers la valeur métier, les coûts, les gains, la productivité, la réduction du risque et l'impact opérationnel. Pour un décideur économique. » | CP, CA, INT | **exclu MGMT** |
| `enthusiastic_confident` | Enthousiaste / confiant | « Enthousiaste et confiant : optimiste, tourné vers les perspectives, avec une confiance crédible. Jamais d'exagération commerciale ni de ton naïf. » | carrière/reconnaissance/presales | **exclu DEL** |
| `disappointed_confused` | Déçu / incompréhension | « Déçu / interrogatif : exprime une déception ou une incompréhension de manière SOBRE et maîtrisée. Suffisamment clair pour être compris, sans agressivité ni dramatisation. » | disponible hors exclusions | **exclu CP, REC, INT** |
| `prudent` | Prudent | « Prudent : mesuré, met en avant réserves, risques ou incertitudes SANS être pessimiste. Véhicule la maîtrise et la sagesse, pas la peur. » | DEL, MGMT, INT | aucune exclusion directe |

Source UI : `communication-brief-options.ts:L70-L130`. Instruction LLM : nœud `Assemble Prompt`, `n8n/workflows/intel-020-communication.json:L115-L210`.

Le resolver accepte le ton courant s’il n’est pas dans `excludedTones`; sinon il choisit le premier `suggestedTone`. `communication-options-resolver.ts:L175-L230`.

---

# 7. Matrice des formats de sortie

## 7.1 `written_message`

- Canaux : `email`, `linkedin_invitation`, `linkedin_message`, `internal_note`.
- Longueur : 40–80 / 80–140 / 140–220 / 220–400 mots selon le niveau.
- Contrat JSON : `subjects: string[]`, `body: string`, `key_points: string[]`, `source_refs: string[]`, `warnings: string[]`.
- Invitation LinkedIn : `subjects=[]`; `body` limité par instruction à 300 caractères.
- Validation : `body` présent et longueur >= 20 caractères.
- `result_type`: `communication`.
- `content_json.kind`: **aucun champ `kind` requis** dans le contrat écrit.
- Document : `intelligence_document_type=communication`.

Sources : `src/lib/n8n/types.ts:L930-L1015`; `n8n/workflows/intel-020-communication.json:L115-L300`; `communication-result-documents.ts:L35-L90`.

## 7.2 `spoken_pitch`

- Canal unique : `spoken_pitch_30s`.
- Contrat JSON : `kind="spoken_pitch"`, `hook`, `problem_recognition`, `offer_link`, `ask`, `alt_close`, `word_count`, `tone_notes[]`, `source_refs[]`, `warnings[]`.
- Validation : `kind`, `hook`, `ask` obligatoires ; QA contrôle la longueur et la présence d’un ask.
- `result_type`: `commercial_pitch` pour CP/CA ; `prise_de_parole` pour DEL/REC/MGMT/INT.
- `content_json.kind`: `spoken_pitch`.
- Archivage : `commercial_pitch` ou `prise_de_parole`.

Sources : `src/lib/n8n/types.ts:L970-L1040`; `n8n/workflows/intel-020-communication.json:L150-L320`.

## 7.3 `structured_briefing`

- Canal unique : `meeting_briefing`.
- Contrat JSON : `kind="meeting_briefing"`, `objective`, `key_message`, `arguments[{title,evidence,source_ref?}]`, `expected_objections[{objection,response,fallback?}]`, `cross_sell_hypotheses[]`, `data_points_to_mention[]`, `close_options[]`, `do_not_say[]`, `source_refs[]`, `warnings[]`.
- Pour DEL/REC/MGMT/INT, le schéma exige en plus `postures[]`, `emotional_context`, `power_dynamic`; `cross_sell_hypotheses` doit rester vide d’après l’instruction du prompt.
- Validation : `kind`, `objective`, `key_message` et au moins un argument ; pour les catégories non commerciales, `emotional_context` et `power_dynamic` sont bloquants.
- `result_type`: `commercial_pitch` pour CP/CA ; `prise_de_parole` sinon.
- `content_json.kind`: `meeting_briefing`.
- Archivage : `commercial_pitch` ou `prise_de_parole`.

Sources : `src/lib/n8n/types.ts:L1015-L1065`; `n8n/workflows/intel-020-communication.json:L150-L320`.

## 7.4 Parsing et QA communs

Le nœud `Parse & Validate Output` refuse `stop_reason=max_tokens`; tente `JSON.parse`; seul mécanisme de réparation : retrait déterministe des fences ```json / ``` puis second `JSON.parse`. Aucun second appel LLM. `n8n/workflows/intel-020-communication.json:L150-L235`.

Contrôles QA bloquants observés : placeholders, fuite de données techniques, absence d’ancrage lorsqu’un contexte riche existe, violation de `mustExclude`. Contrôles non bloquants : mention KREDO, vocabulaire commercial dans une catégorie non commerciale, montant sans modalisateur, contrôles de longueur/ask/arguments/posture. `n8n/workflows/intel-020-communication.json:L190-L285`.

---

# 8. Cartographie des points d’entrée UI

Les **40 points d’entrée/configurations UI distincts** ci-dessous correspondent aux déclencheurs réellement trouvés chez les consommateurs du composer, y compris les menus où plusieurs actions sont exposées depuis une même zone.

| # | Page / zone | Composant / déclencheur | Configuration initiale / scénario | Contexte injecté | Source |
|---:|---|---|---|---|---|
| 1 | Consultant drawer | Message | `consultant_message` → `manager_collaborator_internal` | collaborateur + mission + `mustInclude` | `src/components/consultants/ConsultantDrawer.tsx` |
| 2 | Consultant drawer | Reconnaissance | `consultant_recognition` → `collaborator_recognition` | idem | idem |
| 3 | Consultant drawer | Point 1:1 | `consultant_one_to_one` → `one_on_one_alignment` | idem | idem |
| 4 | Consultant drawer | Feedback écrit | `consultant_feedback_follow_up` | idem | idem |
| 5 | Consultant drawer | Feedback oral | `consultant_feedback_talk_track` | idem | idem |
| 6 | Consultant drawer | Changement mission | `consultant_assignment_change` | idem | idem |
| 7 | Consultant drawer | Plan intercontrat | `consultant_intercontract_message` | collaborateur | idem |
| 8 | Consultant drawer | Rétention | `consultant_retention_briefing` | collaborateur + mission | idem |
| 9 | Consultant drawer | Entretien annuel | `consultant_annual_review` | collaborateur + mission | idem |
| 10 | Consultant drawer | Échange sensible | `consultant_sensitive_meeting` | collaborateur + mission | idem |
| 11 | Assistance / staffing | Demander de l’aide | `staffing_help` → `staffing_help_request` | besoin, compte, practice, candidat/collab refs | `src/components/staffing/AssistanceCaseDrawer.tsx` |
| 12 | Assistance / staffing | Faire prioriser | `staffing_priority` | idem | idem |
| 13 | Assistance / staffing | Préparer la revue | `staffing_review` | idem | idem |
| 14 | Assistance / staffing | Appui Practice | `practice_support` | idem | idem |
| 15 | Assistance / staffing | Appui avant-vente | `presales_support` | idem | idem |
| 16 | Assistance / staffing | Kickoff avant-vente | `presales_kickoff` | idem | idem |
| 17 | Agenda — événement candidat | Préparer | `recruiter_preparation` | événement + candidat | `src/components/agenda/EventDetailDrawer.tsx` |
| 18 | Agenda — EAD collab | Préparer | `consultant_annual_review` | événement + mission + collaborateur | idem |
| 19 | Agenda — suivi/préparation collab | Préparer | `consultant_one_to_one` | idem | idem |
| 20 | Agenda — entretien RH | Préparer | `consultant_sensitive_meeting` | idem | idem |
| 21 | Agenda — soutenance | Préparer | `proposal_defense` | compte + opportunité + événement | idem |
| 22 | Agenda — événement compte | Préparer | `discovery_preparation` | compte + événement | idem |
| 23 | Agenda — fallback | Préparer | `agenda_event_preparation` | métadonnées événement | idem |
| 24 | Recrutement liste | Inviter | `candidate_interview` | candidat + opportunité + compte + prochaine action | `src/components/recruitment/RecruitmentListView.tsx:L190-L280` |
| 25 | Recrutement liste | Client | `candidate_to_client` | candidat + besoin + compte | idem |
| 26 | Dossier candidat | Contacter | `candidate_contact` | candidat + profil + process actif | `src/components/recruitment/CandidateDrawer.tsx:L175-L245` |
| 27 | Playbook secteur | Rebond secteur | `sector_rebound` | secteur + compte pivot si disponible | `src/components/sector/PlaybookPage.tsx` |
| 28 | Playbook secteur | Préparation persona | `sector_persona_preparation` | secteur + compte/persona | idem |
| 29 | Signal compte desktop | Contacter | intent signal | `signalRef`, compte, source | `src/components/accounts-contacts/intelligence/AccountSignalDesktopActions.tsx` |
| 30 | Signal compte mobile | Contacter | intent signal | idem | `src/components/accounts-contacts/intelligence/AccountSignalMobileActions.tsx` |
| 31 | Cockpit intelligence mobile | action rédaction/pitch | preset compte/signal selon zone | compte actif | `src/components/accounts-contacts/intelligence/ClientIntelligenceMobileView.tsx` |
| 32 | Détail mission | action communication | intent mission/delivery | mission + compte | `src/components/missions/mission-detail/MissionDetailHeader.tsx` |
| 33 | Détail opportunité | action communication | intent opportunité | opportunité + compte | `src/components/missions/opportunity-detail/OpportunityStandingPanel.tsx` |
| 34 | Rapports & rédaction desktop | « Rédiger un mail » | `openCommunicationComposer({origin:"global"})` | aucun ; picker général | `src/components/reports/ReportsDesktopView.tsx` |
| 35 | Génération / support Mail | Mail | preset `channel=email` | aucun | `src/components/reports/report-supports-config.tsx` |
| 36 | Génération / support Pitch | Pitch | preset `scenario=signal_outreach` | aucun | idem |
| 37 | Document communication | Créer une variante | `reuseMode=variant` | brief source + texte précédent + instruction | `src/components/reports/DocumentCommunicationActions.tsx` |
| 38 | Document communication | Réutiliser pour ce compte | `reuseMode=reuse_account` | brief source + compte courant | idem |
| 39 | Document communication | Adapter à un autre contact | `reuseMode=adapt_contact` | brief source, contact réinitialisé | idem |
| 40 | Document communication | Relancer à partir du message | `reuseMode=follow_up`, scénario `follow_up_no_reply` | message précédent + instruction | idem |

À ces déclencheurs s’ajoute le **composer global** lui-même, monté une seule fois via `AppOverlayHosts`, et le `CommunicationPurposeSwitcher` qui permet de changer de finalité au sein du même flux ; ils sont des infrastructures de composition plutôt que des points d’entrée métier supplémentaires. `src/components/layout/AppOverlayHosts.tsx`; `src/components/communication/CommunicationComposerHost.tsx:L1-L1010`.

---

# 9. Cartographie du contexte

## 9.1 Sources fixes

| Source ID | Signification | Disponibilité/filtrage | Scopes/catégories déclarés | Origine | Champ n8n gouverné | Désactivable ? |
|---|---|---|---|---|---|---|
| `account_profile` | fiche compte | disponibilité `company` | CP, CA requis ; DEL/REC/INT optionnel | `get_communication_context` / `get_pitch_context`, `companies` | `company` | non si required, oui sinon |
| `crm_contacts` | contact CRM | `contact` | CP/CA optionnel | RPC + `contacts/persons` | `contact` | oui |
| `signal_intelligence` | actualités / intelligence secteur | mapper UI sans clé dédiée ; n8n filtre | CP optionnel | `sector_news`, `sector_intelligence` + signal injecté par Host | `sectorNews`, `sectorIntelligence` | oui |
| `opportunity_context` | opportunités | `opportunity` | CA/REC/INT optionnel | RPC + `opportunities` | `activeOpportunities`, `anchorOpportunity` | oui |
| `interaction_history` | interactions | `interactions` | DEL optionnel | `interactions` | `recentInteractions` | oui |
| `mission_context` | missions | `mission` | CA/DEL/MGMT/INT | RPC + `missions` | `activeMissions`, `anchorMission`, `currentMission`, `recentMissions` | non si required, oui sinon |
| `candidate_profile` | candidat | `candidate` | REC requis | `profileRef`/facts côté front | **aucun champ dans `SOURCE_FIELD_MAP`** | verrouillé par registry quand requis ; voir §14 |
| `collaborator_context` | collaborateur | `collaborator` | MGMT requis | `get_collaborator_communication_context` | `collaborator`, `person`, `managerProfile`, `jobProfile`, `skills`, `availability`, `recentActivity`, `recentAbsences` | non quand required |
| `offer_catalog` | offre/pricing | `offer` | CP/CA optionnel | `get_pitch_context`, offers/pricing | `offer`, `pricingGrid`, `suggestedPractices`, `deliveredPractices` | oui sauf effet d’un `offerRef` requis |
| `source_document` | document source | disponibilité `documents` | INT optionnel | métadonnée `sourceDocumentId` | **aucun champ dans `SOURCE_FIELD_MAP`** | selon UI ; voir §14 |
| `previous_generation` | générations précédentes | pas de clé availability dédiée | aucun profil requis ; activable dans UI | RPC compte | `previousPitches`, `previousCommunications`, `legacyPitches` | oui |

Sources : `CommunicationBriefForm.tsx:L45-L145`; `communication-brief-form-model.ts:L75-L170`; `communication-context-mappers.ts:L1-L260`; nœud `Hydrate Context`, `n8n/workflows/intel-020-communication.json:L50-L150`.

## 9.2 RPC live Supabase

### `public.get_communication_context(p_workspace_id uuid, p_company_id uuid, p_contact_id uuid, p_opportunity_id uuid, p_mission_id uuid) → jsonb`

Vérifiée présente en live. Elle retourne :
- `company` depuis `public.companies` : identité, lifecycle, secteur/segment, localisation, effectif, priorité, score, description, site, prochaine action ;
- `contact` depuis `public.contacts` + `public.persons` ;
- 5 `recentInteractions` ;
- `activeOpportunities` non gagnées/perdues/abandonnées ;
- `activeMissions` ;
- `sectorIntelligence` ;
- 3 `sectorNews` ;
- 3 `previousCommunications` issus de `public.ai_intelligence_results` (`result_type='communication'`).

### `public.get_pitch_context(p_workspace_id uuid, p_company_id uuid, p_offer_id uuid, p_opportunity_id uuid, p_mission_id uuid) → jsonb`

Vérifiée présente en live. Retourne : fiche compte, offre + practice, `pricingGrid`, types d’engagement, practices déjà délivrées, practices suggérées, opportunité/missions ancres et actives, interactions, intelligence/news secteur, `legacyPitches`, 2 `previousPitches`, scores conviction/investment.

### `public.get_collaborator_communication_context(p_workspace_id uuid, p_collaborator_id uuid, p_mission_id uuid) → jsonb`

Vérifiée présente en live. Retourne : `collaborator`, `person`, `managerProfile`, `currentMission`, 5 `recentMissions`, `jobProfile`, jusqu’à 20 compétences, `availability`, 5 rapports d’activité récents, 5 absences récentes.

## 9.3 Contexte ajouté hors RPC

- Signal : `CommunicationComposerHost` relit `account_signals`, la source et la practice puis ajoute un bloc `[SIGNAL_CONTEXT]` à `mustInclude`. `CommunicationComposerHost.tsx:L760-L900`.
- Collaborateur : Host ajoute `[COLLABORATEUR_CONTEXT]` avec nom, poste, practice, séniorité, statut et consigne d’anti-invention. `CommunicationComposerHost.tsx:L620-L760`.
- Secteur pur : `[SECTEUR_CONTEXT]` lorsque l’entité primaire est un secteur sans compte. `CommunicationComposerHost.tsx:L810-L890`.
- Événements / écrans métier : les intents ajoutent des lignes factuelles dans `mustInclude`. `communication-entry-intents.ts` et consommateurs §8.

## 9.4 Listes personnelles

`preferredCollectionIds` est résolu dans `Hydrate Context` par lecture de `content_collection_items`. Les adaptateurs observés injectent réellement :
- `veille_article` depuis `veille_articles` ;
- `intelligence_document` depuis `intelligence_documents`, avec contenu texte tronqué.

Cette source est additive et n’est pas filtrée par `disabledContextSources`. `n8n/workflows/intel-020-communication.json:L50-L150`.

## 9.5 Knowledge Scope

`resolveKnowledgeScope` relit la collection avec le client Supabase authentifié :
- Liste : items directs ;
- Corpus : items directs + développement sur un niveau des `knowledge_list` référencées ;
- déduplication par `${contentType}:${contentId}`.

Les refs fournies par le navigateur sont ignorées et recalculées à partir de `collectionId` avant le lancement. `src/features/content-collections/data/resolve-knowledge-scope.ts:L1-L130`; `src/app/api/n8n/trigger/route.ts:L220-L270`.

---

# 10. Architecture des prompts

## 10.1 Ordre réel de précédence

L’implémentation du nœud `Assemble Prompt` documente quatre couches techniques ; la demande d’audit en dix couches se projette ainsi :

| Ordre conceptuel | Implémentation réelle | Activation | Rôle | Source |
|---:|---|---|---|---|
| 1 | `GLOBAL_RULES` | toujours | anti-invention, identité sourcée, interdiction UUID/KREDO/Supabase/n8n, préséance | workflow `Assemble Prompt` |
| 2 | `outputRules` + JSON schema | toujours selon `outputKind` | contrat écrit / spoken / briefing | workflow |
| 3 | `CATEGORY_RULES[activityCategory]` | catégorie reconnue | garde-fous métier | workflow |
| 4 | `missionText` | toujours | `FLAGSHIP_MISSIONS[scenario]` ou `buildTemplateMission(manifestEntry)` | workflow |
| 5 | `toneInstruction` | toujours | registre de ton | workflow |
| 6 | longueur/durée | toujours | longueur écrite, durée orale, profondeur briefing | workflow |
| 7 | bloc destinataire | toujours | rôle/type/persona/relation/interne | workflow |
| 8 | `buildContextSections(ctx)` | selon contexte hydraté | faits métier | workflow |
| 9 | préférences brief | si renseignées | `mustInclude`, `mustExclude`, `angle`, etc. selon assemblage | workflow |
| 10 | schema Anthropic | toujours | `output_config.format=json_schema` | `Call LLM` |

`n8n/workflows/intel-020-communication.json:L115-L300`.

## 10.2 Règles globales

Le prompt système ordonne notamment :
1. ne jamais inventer chiffre, date, référence client, résultat, projet, engagement ou capacité ;
2. ne jamais affirmer une spécialisation de l’entreprise non prouvée par le contexte ;
3. distinguer faits, hypothèses et préférences utilisateur ;
4. ne jamais révéler UUID/id technique ni « KREDO », « Supabase », « n8n » ni la mécanique de génération ;
5. les préférences utilisateur ne peuvent contourner ces règles ni changer le format demandé.

L’identité organisationnelle utilise le nom du workspace si hydraté ; sinon le prompt parle génériquement d’« une ESN ». `n8n/workflows/intel-020-communication.json:L115-L180`.

## 10.3 Règles par catégorie

- CP : valeur prospect, angle/bénéfice unique, pas de survente, pas de prix ferme.
- CA : relation/mission réelle ; cross-sell uniquement parmi les practices suggérées et non déjà délivrées ; pas de prix ferme.
- DEL : exécution et risque, pas de vocabulaire commercial (`offre`, `catalogue`, `tarif`, `TJM`), constat/attente/prochaine étape.
- REC : différencier candidat/client ; défense de profil jamais transformée en message candidat ; aucun TJM/salaire ferme ; argument fondé sur expérience/compétence réelle.
- MGMT : relation managériale interne ; aucune dimension commerciale ; aucune pseudo-analyse RH/juridique ; ne pas déduire une faute d’une absence de donnée ; protéger la dignité du consultant.
- INT : collègue Staff ; faits/analyse/recommandation/demande ; décision/priorité/risque/ressources/ROI ; pas de tournure de prospection.

Source : `n8n/workflows/intel-020-communication.json:L115-L230`.

## 10.4 Missions bespoke

21 scénarios ont une mission écrite à la main :

`client_crisis_talk_track`, `delay_talk_track`, `client_tension_apology`, `consultant_replacement_notice`, `proposal_defense_pitch`, `cross_sell`, `meeting_prep_cross_sell`, `escalation_briefing`, `risk_meeting_briefing`, `atypical_candidate_defense`, `candidate_to_client_pitch`, `disciplinary_meeting_posture`, `difficult_announcement_talk_track`, `retention_conversation_talk_track`, `retention_conversation_briefing`, `intercontract_exit_pitch`, `performance_feedback_talk_track`, `collaborator_recognition`, `resource_arbitrage_pitch`, `investment_arbitrage_argument`, `quarterly_business_review`.

Les 71 autres passent par `buildTemplateMission(entry)` : description de la registry + objectif lisible + consigne de rester spécifique au destinataire et de n’utiliser que les faits du contexte. `n8n/workflows/intel-020-communication.json:L115-L230`.

## 10.5 Appel LLM

Nœud `Call LLM` : modèle `claude-sonnet-5`, `max_tokens=4000`, thinking désactivé, `system=$json.systemPrompt`, un message `user`, et `output_config.format` en JSON Schema. Timeout 60 s. `n8n/workflows/intel-020-communication.json:L150-L175`.

---

# 11. Flux technique end-to-end

```mermaid
flowchart TD
  A[Point d'entrée UI] --> B[openCommunicationComposer / Intent]
  B --> C[CommunicationComposerHost]
  C --> D[loadCommunicationContext + RPC]
  D --> E[CommunicationBriefForm]
  E --> F[resolveCommunicationOptions]
  F --> G[CommunicationBrief normalisé]
  G --> H[POST /api/n8n/trigger]
  H --> I[resolveKnowledgeScope si présent]
  I --> J[triggerN8nRun]
  J --> K[(ai_intelligence_runs queued)]
  J --> L[Webhook INTEL-020]
  L --> M[Verify Signature]
  M --> N[Validate Brief]
  N --> O[Update Run Status running]
  O --> P[Hydrate Context]
  P --> Q[Resolve Sender]
  Q --> R[Assemble Prompt]
  R --> S[Call LLM]
  S --> T[Parse & Validate Output]
  T --> U[Quality Check]
  U --> V[Prepare + Sign Callback]
  V --> W[POST /api/n8n/callback]
  W --> X[(ai_intelligence_results)]
  W --> Y[(ai_intelligence_runs succeeded/failed)]
  X --> Z{result_type éligible ?}
  Z -- oui --> AA[saveResultAsDocument]
  AA --> AB[(intelligence_documents)]
  AA --> AC[(intelligence_document_versions)]
  AA --> AD[(intelligence_document_links)]
  AB --> AE[/reports - Rapports & rédaction]
```

## 11.1 UI → brief

Le composer reçoit un `CommunicationComposerRequest`, résout une éventuelle entité primaire, détermine le scope, charge le contexte, puis rend `PitchMailDrawerContent`/`CommunicationBriefForm`. Le formulaire applique chaque changement structurant via `resolveCommunicationOptions` puis `purgeIncompatibleReferences`. `communication-composer.ts:L1-L130`; `CommunicationComposerHost.tsx:L1-L1010`; `CommunicationBriefForm.tsx:L420-L750`.

## 11.2 Brief → API

Le déclenchement envoie `workflowId="intel-020-communication"`, l’entité, le brief dans `input`. `/api/n8n/trigger` authentifie, résout le workspace et revalide le Knowledge Scope le cas échéant. `src/app/api/n8n/trigger/route.ts:L140-L300`.

## 11.3 API → run → n8n

`triggerN8nRun` crée le run, construit `N8nTriggerPayload` (`runId`, workflow, entity, workspace, user, input, callbackUrl), attend uniquement l’accusé 202 du webhook, puis laisse n8n travailler asynchronement. `src/lib/n8n/trigger-run.ts:L1-L110`; `src/lib/n8n/types.ts:L20-L90`.

## 11.4 n8n

| Nœud | Entrée | Transformation | Sortie/dépendance |
|---|---|---|---|
| Webhook — Communication | payload | reçoit POST | Verify Signature |
| Verify Signature | body brut | HMAC SHA256 | Validate Brief |
| Validate Brief | payload+brief | normalise legacy, outputKind/scope/catégorie, offre, destinataire, activeSources | run context |
| Update Run Status | runId | PATCH `running` | Hydrate Context |
| Hydrate Context | refs + scope | RPC/REST + filtrage sources + listes/Knowledge Scope | `resolvedContext` |
| Resolve Sender | userId | GET `profiles` | sender profile |
| Assemble Prompt | brief+ctx+sender | manifeste + règles + schema | system/user prompt |
| Call LLM | prompts + schema | Anthropic | réponse structurée |
| Parse & Validate Output | réponse | JSON parse/fences + contrat | generatedOutput |
| Quality Check | output+ctx | flags + blocage éventuel | qaFlags |
| Prepare Callback | résultat | resultType, phase 5, title, metrics | JSON callback |
| Sign Callback | JSON | HMAC | Callback |
| Callback | signé | POST Next | `/api/n8n/callback` |
| Prepare Failure Callback | erreur | payload failed | Sign Failure Callback |
| Sign Failure Callback | failure JSON | HMAC | Callback Failure |
| Callback (Failure) | signé | POST Next, retry | `/api/n8n/callback` |

Source : `n8n/workflows/intel-020-communication.json:L1-L420`.

## 11.5 Callback → Supabase → document

Le callback valide HMAC, récupère le run, upsert le résultat, met à jour le run puis auto-sauvegarde tout `result_type` éligible via `saveResultAsDocumentWithSupabaseClient`. L’archivage est idempotent par `source_result_id`. `src/app/api/n8n/callback/route.ts:L1-L330`; `src/components/accounts-contacts/intelligence/save-as-document.ts:L1-L330`.

---

# 12. Dépendances techniques

## 12.1 Frontend

- `src/lib/communication/communication-composer.ts` — contrat d’ouverture global et événement navigateur.
- `src/components/communication/CommunicationComposerHost.tsx` — host desktop/mobile, résolution entités/scopes et chargement contexte.
- `src/components/accounts-contacts/intelligence/CommunicationBriefForm.tsx` — formulaire QUOI/QUI/COMMENT/CONTEXTE.
- `src/lib/communication/communication-scenario-registry.ts` — catalogue et contraintes.
- `src/lib/communication/communication-options-resolver.ts` — cascade de cohérence.
- `src/lib/communication/communication-brief-form-model.ts` — visibilité des champs et sources.
- `src/lib/communication/communication-entry-intents.ts` — presets contextuels.
- `src/lib/communication/communication-purpose.ts` — finalités.
- `src/lib/communication/communication-context-loader.ts` / mappers — facts/sourceAvailability.

## 12.2 API / backend

- `src/app/api/n8n/trigger/route.ts` — gateway authentifiée + Knowledge Scope.
- `src/lib/n8n/trigger-run.ts` — création run et webhook.
- `src/lib/n8n/client.ts` / `hmac.ts` / `runs.ts` — transport/signature/persistance.
- `src/app/api/n8n/callback/route.ts` — persistance résultat et auto-document.

## 12.3 n8n

Workflow versionné : `n8n/workflows/intel-020-communication.json`. Manifeste : `n8n/workflows/intel-020-communication.manifest.json`. Générateur : `scripts/generate-communication-manifest.mjs`. Setup historique : `n8n/workflows/intel-020-communication.SETUP.md`.

## 12.4 Supabase live

Objets centraux observés :
- `public.ai_intelligence_runs`
- `public.ai_intelligence_results` — contrainte unique `(run_id, phase)` et phase 1..10
- `public.intelligence_documents`
- `public.intelligence_document_versions`
- `public.intelligence_document_links`
- `public.content_collections`
- `public.content_collection_items`
- `public.companies`, `contacts`, `persons`, `interactions`, `opportunities`, `missions`
- `public.sector_intelligence`, `sector_news`
- `public.offers`, `offer_practices`, `offer_pricing_grids`, `offer_engagement_types`
- `public.collaborators`, `job_profiles`, `person_skills`, `skills`, `mission_activity_reports`, `collaborator_absences`
- `public.veille_articles`
- RPC : `public.get_communication_context(...)`, `public.get_pitch_context(...)`, `public.get_collaborator_communication_context(...)`.

Les enums live incluent `intelligence_document_type = communication | commercial_pitch | prise_de_parole | …`, confirmant les trois destinations INTEL-020.

## 12.5 Documents / consultation

`communication-result-documents.ts` transforme le snapshot du brief en modèle de présentation, titre, `scope_json` et liens d’entités. `save-as-document.ts` crée le document via `reports-actions.ts`; `/reports` affiche `commercial_pitch` et `prise_de_parole` avec `PitchDocumentContent`, et un écrit via le rendu texte/document. `src/lib/communication/communication-result-documents.ts:L1-L420`; `src/components/reports/ReportsDesktopView.tsx`; `src/app/(app)/reports/_data/reports-actions.ts`.

---

# 13. Compatibilité legacy

| Élément legacy | Normalisation / fallback actuel | Source |
|---|---|---|
| scénario `profile_submission` | → `profile_submission_to_client` | `communication-legacy-normalizer.ts:L1-L45`; `Validate Brief` n8n |
| catégorie `interne_management` | `collaborator`→`management_consultants`; `internal`→`internal_staff`; sinon non normalisable | idem |
| brief sans `outputKind` | déduit du canal : `spoken_pitch_30s`→SP, `meeting_briefing`→SB, sinon WM | n8n `Validate Brief` |
| brief sans `scope` | déduit de la catégorie ; fallback final `account` | n8n `Validate Brief` |
| anciens résultats `pitch` / `pitch_mail` | document type `commercial_pitch` | `communication-result-documents.ts:L35-L75` |
| anciens snapshots partiels | `normalizeLegacyBrief` backfill outputKind/activityCategory/scope pour reprise document | `reports-actions.ts` |
| anciennes générations compte | `previousCommunications`, `previousPitches`, `legacyPitches` restent hydratés | RPC live / n8n |

Aucune suppression de compatibilité n’est déduite de cet audit.

---

# 14. Divergences / ambiguïtés constatées

| # | Sujet | Source A | Source B | État observé |
|---:|---|---|---|---|
| 1 | `requiresOffer` dans les seeds | `offer_introduction`, `cross_sell`, `proposal_defense_pitch` ont `requiresOffer:false` dans le seed | `OFFER_REQUIRED_SCENARIOS` les inclut | la registry **dérivée** expose `true`; le champ seed est supersédé |
| 2 | Liste des scénarios nécessitant une offre dupliquée | `OFFER_REQUIRED_SCENARIOS` TS | `SCENARIOS_REQUIRING_OFFER` dans `Validate Brief` n8n | deux listes maintenues ; **synchronisées actuellement à 6 IDs** |
| 3 | Commentaire `useCase="both"` | commentaire de fin registry : « n’existe pas encore » | `MULTI_OUTPUT_KINDS` + `toScenarioDefinition` produisent `useCase="both"` | commentaire obsolète ; 10 scénarios ont plusieurs outputKinds |
| 4 | Scope `internal` de deux scénarios recrutement | registry : `candidate_to_client_pitch` et `opportunity_to_candidate_pitch` autorisent `account`,`internal` | resolver : scope `internal` n’autorise que catégorie `internal_staff` | scope `internal` déclaré dans la registry mais non atteignable via la cascade standard |
| 5 | Même portée dans le picker global | `requiredScopes` des deux scénarios REC | `CommunicationComposerHost.confirmGeneralSelection`: REC → `account` | picker général ne sélectionne pas `internal` pour ces scénarios |
| 6 | `candidate_profile` requis | REC : `requiredContextSources=['candidate_profile']` | `SOURCE_FIELD_MAP.candidate_profile=[]` dans n8n | source déclarée requise mais aucune clé hydratée n’est gouvernée par son filtre ; `profileRef` reste transporté |
| 7 | `source_document` optionnel INT | registry/UI exposent `source_document` | `SOURCE_FIELD_MAP.source_document=[]` | pas de champ de contexte n8n filtré par cet ID |
| 8 | Reprise de document / `previousMessage` | `reports-actions.ts` place `previousMessage`, `sourceDocumentId`, `sourceRunId` dans le brief | recherche dans `Hydrate Context`/`Assemble Prompt` courant : pas de lecture directe de ces champs | l’instruction de reprise est injectée via `mustInclude`; le texte `previousMessage` n’est pas explicitement injecté par ces nœuds |
| 9 | Disponibilité `previous_generation` | UI n’a pas de clé availability dédiée pour cet ID | n8n peut injecter `previousPitches`, `previousCommunications`, `legacyPitches`, éventuellement vides | l’UI ne reflète pas directement la présence réelle de ces données |
| 10 | Disponibilité `signal_intelligence` | UI traite l’ID sans clé availability unifiée | mapper distingue `news` et `sector_analysis` ; n8n filtre deux champs | disponibilité UI et disponibilité des sous-sources ne partagent pas le même discriminant |
| 11 | `source_document` dans le formulaire interne | INT le déclare optionnel | `sourceAvailability.documents=false` dans le mapper interne | source peut être déclarée par le scénario tout en étant rendue indisponible par le modèle de formulaire |
| 12 | Support « Pitch » de Rapports | label/support = Pitch | `report-supports-config.tsx` ouvre avec `scenario:"signal_outreach"`, dont le default est WM | preset initial du support correspond à un scénario écrit tant que la finalité n’est pas changée |
| 13 | Changement vers finalité écrite et `offerRef` | `offer_introduction`/`cross_sell` écrits exigent une offre | `applyCommunicationPurposeToBrief` efface `offerRef` quand `written_message` est choisi | état intermédiaire possible avec scénario écrit offer-required sans `offerRef`, que le formulaire doit ensuite résoudre |
| 14 | Commentaire de type historique | commentaire `N8nWorkflowId` décrit INTEL-020 « email/LinkedIn/note » | contrat courant inclut SP/SB et canaux oraux | commentaire de haut niveau plus étroit que le périmètre actuel |
| 15 | `resultType` du callback d’échec | succès : pitch non commercial → `prise_de_parole` | `Prepare Failure Callback` dérive seulement `commercial_pitch` ou `communication` via `isPitch` | un échec de pitch/briefing non commercial peut être étiqueté `commercial_pitch` dans le payload d’échec |

Sources principales : `communication-scenario-registry.ts:L1-L1160`; `communication-options-resolver.ts:L1-L320`; `communication-purpose.ts:L1-L190`; `CommunicationComposerHost.tsx:L1-L1010`; `n8n/workflows/intel-020-communication.json:L1-L420`; `reports-actions.ts`; `report-supports-config.tsx`.

---

# 15. Index exhaustif des fichiers impliqués

Le traçage de première passe (sources → consommateurs), complété par une seconde passe (consommateurs → sources), a identifié **101 fichiers impliqués** au sens large : code exécuté, consommateurs UI, routes, workflow/manifest, migrations/tests et documentation ayant servi à reconstituer ou vérifier INTEL-020. Les fichiers opérationnels sont détaillés individuellement ci-dessous ; les séries historiques sont listées comme fichiers distincts mais regroupées par rôle identique.

## 15.1 Contrats / types / configuration

| Fichier | Rôle |
|---|---|
| `src/lib/n8n/types.ts` | contrats wire `CommunicationBrief`, scénarios, dimensions et outputs |
| `src/lib/communication/communication-scenario-registry.ts` | source de vérité des 92 scénarios et contraintes |
| `src/lib/communication/communication-options-resolver.ts` | normalisation dynamique des options |
| `src/lib/communication/communication-brief-form-model.ts` | projection des options vers les champs UI |
| `src/lib/communication/communication-entry-intents.ts` | intents/presets contextuels |
| `src/lib/communication/communication-purpose.ts` | finalités et bascule outputKind |
| `src/lib/communication/communication-composer.ts` | contrat d’ouverture global du composer |
| `src/lib/communication/communication-legacy-normalizer.ts` | aliases et catégories legacy |
| `src/lib/communication/communication-result-documents.ts` | mapping résultat → document/presentation |
| `src/lib/communication/communication-context-mappers.ts` | JSON RPC → facts + sourceAvailability |
| `src/lib/communication/communication-context-loader.ts` | chargement RPC par scope |
| `src/lib/communication/communication-collaborator-context.ts` | contrat contexte collaborateur |
| `src/components/accounts-contacts/intelligence/communication-brief-options.ts` | labels UI, defaults, options de brief |

## 15.2 UI / points d’entrée / rendu

| Fichier | Rôle |
|---|---|
| `src/components/communication/CommunicationComposerHost.tsx` | host global adaptive |
| `src/components/communication/CommunicationIntentMenu.tsx` | menu d’intents |
| `src/components/communication/ContextualCommunicationButton.tsx` | bouton intent contextuel |
| `src/components/layout/AppOverlayHosts.tsx` | montage global du host |
| `src/components/accounts-contacts/intelligence/CommunicationBriefForm.tsx` | formulaire principal |
| `src/components/accounts-contacts/intelligence/QuoiHubModal.tsx` | sélection catégorie/scénario/objectif |
| `src/components/accounts-contacts/intelligence/IntelligenceActionDrawers.tsx` | contenu de génération/résultat |
| `src/components/accounts-contacts/intelligence/ContactSelector.tsx` | contact |
| `src/components/accounts-contacts/intelligence/EntityRefSelect.tsx` | références CRM |
| `src/components/accounts-contacts/intelligence/OfferPicker.tsx` | offre |
| `src/components/accounts-contacts/intelligence/ManagementConsultantFields.tsx` | champs scope collaborateur |
| `src/components/accounts-contacts/intelligence/InternalStaffFields.tsx` | champs scope interne |
| `src/components/accounts-contacts/intelligence/get-account-crm-refs.ts` | options opportunité/mission/candidat |
| `src/components/accounts-contacts/intelligence/get-collaborator-options.ts` | options collaborateur |
| `src/components/accounts-contacts/intelligence/get-suggested-offers.ts` | offres suggérées |
| `src/components/accounts-contacts/intelligence/AccountSignalDesktopActions.tsx` | entrée signal desktop |
| `src/components/accounts-contacts/intelligence/AccountSignalMobileActions.tsx` | entrée signal mobile |
| `src/components/accounts-contacts/intelligence/ClientIntelligenceMobileView.tsx` | entrées cockpit mobile |
| `src/components/cockpit/CockpitPitchMailDrawer.tsx` | délégation vers composer global |
| `src/components/intelligence/IntelligencePanel.tsx` | action compte/pitch dans rail Intelligence |
| `src/components/intelligence/IntelligenceFAB.tsx` | accès Intelligence |
| `src/components/recruitment/CandidateDrawer.tsx` | entrée « Contacter » candidat |
| `src/components/recruitment/RecruitmentListView.tsx` | entrées invitation / client |
| `src/components/recruitment/RecruitmentWorkspace.tsx` | workspace recrutement consommateur |
| `src/components/staffing/AssistanceCaseDrawer.tsx` | 6 intents staffing/internal |
| `src/components/consultants/ConsultantDrawer.tsx` | intents management collaborateur |
| `src/components/agenda/EventDetailDrawer.tsx` | intent dynamique selon événement |
| `src/components/missions/mission-detail/MissionDetailHeader.tsx` | entrée mission |
| `src/components/missions/opportunity-detail/OpportunityStandingPanel.tsx` | entrée opportunité |
| `src/components/sector/PlaybookPage.tsx` | entrées secteur |
| `src/components/reports/ReportsDesktopView.tsx` | entrée globale et consultation |
| `src/components/reports/report-supports-config.tsx` | supports Mail/Pitch |
| `src/components/reports/DocumentCommunicationActions.tsx` | 4 modes de reprise |
| `src/components/reports/PitchDocumentContent.tsx` | rendu pitch/briefing archivé |
| `src/components/reports/DocumentGenerationParameters.tsx` | paramètres stockés du document |
| `src/components/reports/DocumentVersionHistory.tsx` | versions documentaires |

## 15.3 API / backend / archivage

| Fichier | Rôle |
|---|---|
| `src/app/api/n8n/trigger/route.ts` | gateway de lancement |
| `src/lib/n8n/trigger-run.ts` | création run + webhook |
| `src/lib/n8n/client.ts` | client n8n |
| `src/lib/n8n/hmac.ts` | signature HMAC |
| `src/lib/n8n/runs.ts` | persistance runs/results |
| `src/app/api/n8n/callback/route.ts` | callback idempotent |
| `src/components/accounts-contacts/intelligence/save-as-document.ts` | auto-archivage |
| `src/app/(app)/reports/_data/reports-actions.ts` | CRUD documentaire + reprise |
| `src/app/(app)/reports/_data/reports-types.ts` | contrats Reports |
| `src/app/(app)/reports/_data/get-document-detail.ts` | détail document |
| `src/features/content-collections/data/resolve-knowledge-scope.ts` | résolution serveur Liste/Corpus |
| `src/features/content-collections/data/content-collections-client-queries.ts` | listes personnelles UI |
| `src/features/content-collections/domain/content-collections-contracts.ts` | types collections |

## 15.4 n8n / génération

| Fichier | Rôle |
|---|---|
| `n8n/workflows/intel-020-communication.json` | workflow exécuté/versionné |
| `n8n/workflows/intel-020-communication.manifest.json` | artefact généré des scénarios |
| `scripts/generate-communication-manifest.mjs` | génération/check/inline du manifest |
| `n8n/workflows/intel-020-communication.SETUP.md` | setup historique/exploitation |
| `n8n/workflows/__tests__/intel-020-communication.test.js` | tests structure n8n |
| `n8n/wokflows_patchs/intel-020-communication.json` | artefact patch historique, non source d’autorité face à `workflows/` |

## 15.5 Supabase / migrations / tests SQL

| Fichier | Rôle |
|---|---|
| `supabase/migrations/20260704180000_pitch_context_rpc.sql` | création/évolution `get_pitch_context` |
| `supabase/migrations/20260711192254_intel_020_collaborator_communication_context.sql` | RPC collaborateur |
| `supabase/tests/intel_020_lot4_collaborator_context_tests.sql` | tests RPC collaborateur |
| `src/types/database.generated.ts` | reflet généré des objets/enums DB utilisés |

L’état live a été vérifié directement dans Supabase ; les migrations sont une source historique secondaire par rapport au catalogue de fonctions live.

## 15.6 Tests TypeScript / déterminisme

| Fichier | Rôle |
|---|---|
| `src/lib/communication/communication-scenario-registry.test.ts` | cohérence registry |
| `src/lib/communication/communication-options-resolver.test.ts` | contraintes/options |
| `src/lib/communication/communication-brief-form-model.test.ts` | visibilité/purge |
| `src/lib/communication/communication-entry-intents.test.ts` | intents |
| `src/lib/communication/communication-context-loader.test.ts` | chargement contextes |
| `src/lib/communication/communication-legacy-normalizer.test.ts` | legacy |
| `src/lib/communication/communication-flow-e2e-matrix.test.ts` | matrice E2E déterministe 21 flux représentatifs |
| `src/lib/communication/communication-result-documents.test.ts` | mapping documents |

## 15.7 Documentation / historique INTEL-020

Ces fichiers sont des sources historiques, non prioritaires sur le code courant :

- `docs/adr/ADR-0009-generate-pitch.md` — introduction du pitch.
- `docs/adr/ADR-0013-communication-scenarios-catalog.md` — catalogue/scopes/outputKinds.
- `docs/adr/ADR-0014-intelligence-actions-program.md` — actions Intelligence contextuelles.
- `docs/FEATURES/dynamic_content_generator(redaction assistee)/HANDOFF_INTEL-020_ARCHITECTURE_DYNAMIQUE.md` — handoff dynamique.
- `docs/FEATURES/dynamic_content_generator(redaction assistee)/INTEL-020-dynamic-implementation-ledger.md` — ledger d’implémentation.
- `docs/FEATURES/dynamic_content_generator(redaction assistee)/INTEL-020-lot-01-report.md`
- `docs/FEATURES/dynamic_content_generator(redaction assistee)/INTEL-020-lot-02-report.md`
- `docs/FEATURES/dynamic_content_generator(redaction assistee)/INTEL-020-lot-03-report.md`
- `docs/FEATURES/dynamic_content_generator(redaction assistee)/INTEL-020-lot-04-report.md`
- `docs/FEATURES/dynamic_content_generator(redaction assistee)/INTEL-020-lot-05-report.md`
- `docs/FEATURES/dynamic_content_generator(redaction assistee)/INTEL-020-lot-06-report.md`
- `docs/FEATURES/dynamic_content_generator(redaction assistee)/INTEL-020-lot-07-report.md`
- `docs/FEATURES/dynamic_content_generator(redaction assistee)/INTEL-020-lot-08-report.md`
- `docs/FEATURES/dynamic_content_generator(redaction assistee)/INTEL-020-lot-09-report.md`
- `docs/FEATURES/dynamic_content_generator(redaction assistee)/INTEL-020-lot-10-report.md`
- `docs/FEATURES/dynamic_content_generator(redaction assistee)/INTEL-020-lot-11-report.md`
- `docs/FEATURES/dynamic_content_generator(redaction assistee)/INTEL-020-lot-12-report.md`
- `docs/FEATURES/dynamic_content_generator(redaction assistee)/INTEL-020-lot-13-report.md`
- `docs/FEATURES/dynamic_content_generator(redaction assistee)/INTEL-020-lot-14-report.md`
- `docs/FEATURES/dynamic_content_generator(redaction assistee)/INTEL-020-lot-15-report.md`
- `docs/FEATURES/cockpit_intelligence_features/client-intelligence-workflows.md` — cartographie historique des workflows.
- `docs/JOURNAL-SESSIONS.md` — traces de sessions ayant fait évoluer INTEL-020.

Le total **101** inclut également les consommateurs indirects localisés lors de la seconde passe (pages parentes, composants de détails et tests de rendu) qui ne portent pas eux-mêmes de règle métier INTEL-020 ; ils sont comptés comme impliqués dans le graphe de dépendances mais ne sont pas promus au rang de source de vérité.

---

## Annexe A — règles de résolution déterministes

1. Le scope est résolu avant la catégorie.
2. La catégorie est restreinte par le scope.
3. Le scénario doit être compatible catégorie/scope ; sinon fallback vers un scénario éligible.
4. `outputKind` doit appartenir aux `allowedOutputKinds`, sinon valeur par défaut.
5. Le canal doit appartenir aux canaux dérivés de l’outputKind, sinon défaut scénario.
6. L’objectif doit appartenir aux `allowedObjectives`, sinon défaut scénario.
7. La longueur doit appartenir à `allowedLengths`, sinon première valeur autorisée.
8. Le ton exclu est remplacé par le premier ton suggéré.
9. Le type de destinataire est forcé pour `collaborator`/`internal`, résolu parmi les destinataires éligibles pour `account`.
10. Les références devenues incompatibles sont purgées par `purgeIncompatibleReferences`.
11. Une offre est obligatoire uniquement pour les six scénarios de `OFFER_REQUIRED_SCENARIOS`.
12. Le formulaire recalcule le modèle après toute modification structurante.

Sources : `communication-options-resolver.ts:L1-L320`; `communication-brief-form-model.ts:L1-L300`; `CommunicationBriefForm.tsx:L420-L750`.

## Annexe B — état Supabase live vérifié

Les trois RPC de contexte existent avec les signatures suivantes :

```text
public.get_communication_context(
  p_workspace_id uuid,
  p_company_id uuid,
  p_contact_id uuid,
  p_opportunity_id uuid,
  p_mission_id uuid
) returns jsonb

public.get_pitch_context(
  p_workspace_id uuid,
  p_company_id uuid,
  p_offer_id uuid,
  p_opportunity_id uuid,
  p_mission_id uuid
) returns jsonb

public.get_collaborator_communication_context(
  p_workspace_id uuid,
  p_collaborator_id uuid,
  p_mission_id uuid
) returns jsonb
```

Les relations live pertinentes observées incluent :
- `ai_intelligence_results.run_id → ai_intelligence_runs.id`, avec `UNIQUE(run_id, phase)` ;
- `intelligence_documents.source_result_id → ai_intelligence_results.id` ;
- `intelligence_document_versions.document_id → intelligence_documents.id` et `source_result_id → ai_intelligence_results.id` ;
- `intelligence_document_links.document_id → intelligence_documents.id`, unique par `(document_id, entity_type, entity_id)` ;
- `content_collection_items.collection_id → content_collections.id`, unique par `(collection_id, content_type, content_id)`.

Au moment du contrôle live, des documents INTEL-020 existaient effectivement dans la bibliothèque pour les types `communication`, `commercial_pitch` et `prise_de_parole`, confirmant que la chaîne callback → document est utilisée en données réelles.
