# INTEL-020 — Rapport Lot 9 — Formulaire Interne / Staff

## Baseline

- Branche : `main`
- SHA de départ : `f15ad425897e2dcde8d19aad3f6773a28a735e2a` (Lot 8 — formulaire Management consultants)
- Périmètre : composer pleinement opérationnel pour `scope=internal` / `activityCategory=internal_staff` / `recipientType=internal`. Aucun workflow n8n, aucun prompt, aucun résultat, aucune bibliothèque documentaire, aucun point d'entrée global, aucune migration Supabase.

## Fichiers modifiés/créés

### Nouveau

- `src/components/accounts-contacts/intelligence/InternalStaffFields.tsx` : `InternalRoleField` (rôle seul), `InternalRecipientDetailsFields` (relation/domaine/nom), `InternalRecipientFields` (compose les deux, desktop — "rôle, relation et domaine visibles ensemble", command §8) et `InternalReferencesFields` (compte/opportunité/mission/collaborateur facultatifs, command §4).

### Modifiés

- **`n8n/types.ts`** : `CommunicationBrief.context.companyRef?: string` ajouté — seule référence interne listée par le command (§4) qui n'avait pas d'équivalent dans le contrat wire existant. Changement additif, non cassant (les runs antérieurs sans ce champ restent valides).
- **`communication-scenario-registry.ts`** : `CATEGORY_CONSTRAINTS.internal_staff.optionalReferences` étendu à `["companyRef", "opportunityRef", "missionRef", "collaboratorRef", "offerRef"]` (candidateId volontairement absent, cf. écarts) ; `optionalContextSources` reçoit `source_document`. Tons scénario-spécifiques ajoutés (8 scénarios, handoff §15.2/command §6) : coordination transverse, escalade, appui Practice, appui avant-vente ×2, synthèse exécutive ×2. **Correctif** : `eligibleInternalRoles` omettait `"recruitment"` alors que le handoff §13.6 le cite explicitement comme destinataire réel de `staffing_help_request`/`cross_functional_coordination_request` — corrigé.
- **`communication-options-resolver.ts`** : même correctif que les Lots 7/8 pour `internalRole`/`internalRelationship`/`internalDomain` — un choix fait dans le formulaire (ou déjà présent dans le brief) prime désormais sur le fait hérité d'un preset d'ouverture, au lieu d'être systématiquement écrasé au resolve suivant.
- **`communication-brief-form-model.ts`** : `showInternalRecipient`/`showCompanyRef`/`showCollaboratorRef` ajoutés à `BriefFormModel` ; `REFERENCE_CONTEXT_KEYS` étendu à `companyRef`/`collaboratorRef` (purge générique, command §5 "toute référence devenue incompatible est purgée"). La neutralisation CRM déjà générique du Lot 8 (`scope !== "account"`) couvre nativement le scope internal — aucun changement nécessaire sur ce point précis.
- **`communication-brief-options.ts`** : `INTERNAL_ROLE_OPTIONS`/`INTERNAL_RELATIONSHIP_OPTIONS`/`INTERNAL_DOMAIN_OPTIONS` (labels français, valeurs canoniques exactes de `n8n/types.ts`) ; `defaultInternalRelationshipForRole`/`defaultInternalDomainForRole` (suggestion de defaults au changement de rôle, command §5, jamais imposée — l'utilisateur reste libre de la changer via ses propres sélecteurs).
- **`CommunicationBriefForm.tsx`** : bloc destinataire interne branché dans "Qui" (desktop, groupé) et en tête de flux mobile pour le rôle seul (command §8) avec relation/domaine/nom repliés dans "Plus d'options" ; bloc "Références internes" branché dans "Contexte" (desktop) et dans "Plus d'options" (mobile). `effectiveCompanyId` introduit (`companyId` prop ?? `context.companyRef`) pour que les pickers opportunité/mission (Lot 7, company-scoped) fonctionnent aussi quand le compte est choisi *dans* le formulaire internal plutôt que résolu en amont par le Host. Garde ajoutée sur `fieldOpportunity`/`fieldMission` génériques (`!model.showInternalRecipient`) pour éviter un doublon avec `InternalReferencesFields` dans le flux mobile principal.

## Rôles / relations / domaines couverts

Les 9 rôles, 5 relations et 9 domaines canoniques de `n8n/types.ts`, sans valeur inventée. Testés explicitement au niveau résolveur : N+1 hiérarchique (`manager_n1`/`hierarchical_up`), pair transverse (`peer_business_manager`/`peer`), Practice (`practice_lead`/`cross_functional`/`practice`), avant-vente (`presales`/`cross_functional`/`presales`), finance (`finance_admin`/`team`/`finance`), direction (`executive_management`/`executive_committee`/`strategy`).

## Scénarios couverts

Les 21 scénarios `internal_staff` de la registry (écrit/oral/briefing), avec vérification explicite en test des cas nommés par le command : demande d'arbitrage (`internal_arbitrage_request`), staffing (`staffing_help_request`), escalade (`internal_alert_escalation`), QBR (`quarterly_business_review`, testé aussi comme scénario multi-finalité écrit/oral/briefing).

## Tests

- **`communication-brief-form-model.test.ts`** (+6) : bloc destinataire interne affiché et champs CRM/offre masqués ; références internes optionnelles toutes exposées (candidateId explicitement absent) ; tons résolus par scénario ; aucune source verrouillée aujourd'hui pour internal_staff (fait vérifié, pas supposé) ; purge des champs CRM hérités ; conservation d'une référence compte pertinente vs purge théorique d'une offre non pertinente (non purgée ici car listée en optionalReferences, cf. écarts).
- **`communication-options-resolver.test.ts`** (+4) : les 6 destinataires nommés par le command résolvent correctement rôle/relation/domaine ; préservation d'un choix utilisateur contre un fait de preset périmé ; les 4 scénarios nommés (arbitrage/staffing/escalade/QBR) se résolvent sans dérive de catégorie ; QBR reste une entrée unique entre `structured_briefing` et `spoken_pitch`.
- **`communication-scenario-registry.test.ts`** (+2) : tons scénario-spécifiques exacts pour les 8 scénarios override + défaut de catégorie préservé ailleurs ; correctif `recruitment` vérifié ; les 21 scénarios internal_staff exposent bien les 5 références optionnelles sans jamais les rendre requises.
- **`communication-brief-options.test.ts`** (+2) : les 3 taxonomies (rôle/relation/domaine) contiennent exactement les valeurs canoniques attendues ; les defaults suggérés par rôle sont corrects et non forcés.
- `npx tsc --noEmit` → EXIT 0.
- `npx eslint` sur les 11 fichiers touchés/créés → 0 erreur, 0 warning.
- `npm test` ciblé communication → 92/92 (74 Lots 7-8 + 18 nouveaux au global communication, dont 4 dans `communication-brief-options.test.ts`). Suite complète → 281/282 (1 échec préexistant `mobile-account-custom-list.test.ts`, confirmé reproduit sur la baseline `main` avant tout changement — documenté depuis le Lot 1, non aggravé).
- `npm run build` → succès, 37 routes générées.
- `git diff --check` → propre.

## Smoke visuel

Pas de Chrome DevTools MCP disponible dans cette session (cf. mémoire [[feedback-no-chrome]]). `npm run build` valide l'arbre de routes complet. La vérification visuelle authentifiée du composer en scope internal (desktop + mobile, sélection rôle, cascade defaults, références facultatives repliables) reste à faire par Guillaume.

## Écarts au contrat / limitations assumées

- **`candidateId` non exposé** : command §4 liste `candidateId` parmi les 6 références internes valides, mais aucun sélecteur candidat company-agnostic n'existe dans le codebase (`getAccountCandidates`, Lot 7, requiert un `companyId`). Plutôt que de risquer un picker cassé (liste vide sans compte choisi), `profileRef` n'a pas été ajouté à `optionalReferences` d'internal_staff et aucune UI candidat n'est montée pour ce scope. Les 5 autres références (compte, opportunité, mission, collaborateur, offre) sont pleinement supportées.
- **`offerRef` sans UI dédiée** : ajouté à `optionalReferences` pour que le champ ne soit jamais purgé s'il arrive d'un futur point d'entrée (command §4 "transporter des références facultatives existantes"), mais aucun sélecteur d'offre n'est monté en scope internal — `model.showOffer` reste gouverné uniquement par `scenario.requiresOffer` (toujours faux en internal_staff), donc aucune offre catalogue ne s'affiche jamais (satisfait explicitement command §3 "ne jamais afficher : offre catalogue").
- **Sources contextuelles §7** : la liste command (commercial/staffing/recruitment/delivery/practice/presales/finance/operations/strategy/documents/agenda) reprend la taxonomie des 9 domaines internes, pas des identifiants de source réels — `CommunicationContextSourceId` (contrat wire) n'a que `account_profile`/`opportunity_context`/`mission_context`/`source_document` de pertinents ici. Même décision que le Lot 8 : pas de nouvel identifiant de source inventé sans migration/changement de contrat n8n (hors périmètre explicite). Le domaine métier choisi par l'utilisateur reste porté comme donnée structurée (`internalDomain`), pas comme case à cocher de source.
- **Aucune source verrouillée aujourd'hui** : `internal_staff.requiredContextSources` est vide dans la registry actuelle — command §7 ("les sources requises sont activées et verrouillées") est un énoncé conditionnel, vérifié vrai par construction (zéro source requise à ce jour), pas une obligation inventée.
- Fichiers non liés à ce lot repérés dans l'arbre de travail (`AccountsContactsViews.tsx`, `veille/page.tsx`, `VeilleActualitesMobile.tsx`, modifications en cours côté utilisateur ; `public/icons_set/feature_redaction_assistee/*.png`, non suivi) : ni créés ni modifiés par ce lot, laissés intacts et exclus du commit.

## Statut

**done.**
