# INTEL-020 — Rapport Lot 8 — Formulaire Management consultants

## Baseline

- Branche : `main`
- SHA de départ : `c46ed4cb8aa513cb16e4ecb396c79fdc15c65f34` (Lot 7 — formulaire dynamique Account/Delivery/Recrutement)
- Périmètre : composer pleinement opérationnel pour `scope=collaborator` / `activityCategory=management_consultants` / `recipientType=collaborator`. Aucun formulaire Staff interne, aucune modification n8n, aucun nouveau point d'entrée applicatif, aucune migration Supabase.

## Fichiers modifiés/créés

### Nouveaux

- `src/lib/communication/communication-collaborator-context.ts` (+ test) : fonctions pures dérivant du JSON de `get_collaborator_communication_context` (Lot 4) — `missionOptionsFromCollaboratorContext` (mission courante en tête, dédupliquée des missions récentes) et `collaboratorSummaryLine`. Extraites de `ManagementConsultantFields.tsx` pour rester testables (le repo n'a pas de RTL/jsdom).
- `src/components/accounts-contacts/intelligence/get-collaborator-options.ts` : Server Action `getWorkspaceCollaborators()` — identité/titre/practice/séniorité/statut/disponibilité, RLS session utilisateur (pas de service_role, pas de donnée de rémunération confidentielle).
- `src/components/accounts-contacts/intelligence/CollaboratorSelect.tsx` : sélecteur natif `<select>`, même famille que `ContactSelector`/`EntityRefSelect` — le filtrage clavier natif suffit à une recherche fluide sur ~20 collaborateurs.
- `src/components/accounts-contacts/intelligence/ManagementConsultantFields.tsx` : sous-composant dédié (command §4) — sélecteur consultant, mission (courante par défaut + missions récentes), panneau "Profil consultant" repliable en lecture seule (profil métier, manager, compétences, absences récentes).

### Modifiés

- **`communication-scenario-registry.ts`** : `ScenarioSeed.suggestedTones` optionnel, appliqué par `toScenarioDefinition` en override du défaut de catégorie. 8 scénarios management reçoivent des tons scénario-spécifiques (handoff §15.2) : `collaborator_recognition`, `cra_absence_reminder`, `performance_feedback_follow_up`/`performance_feedback_talk_track`, `disciplinary_meeting_posture`, `difficult_announcement_talk_track`, `sensitive_meeting_briefing`, `consultant_retention_follow_up`/`retention_conversation_talk_track`/`retention_conversation_briefing`, `intercontract_action_plan_message`/`intercontract_exit_pitch`, `career_opportunity_talk_track`/`career_development_briefing`. `business_roi` reste exclu partout (défaut de catégorie inchangé).
- **`communication-brief-form-model.ts`** (+ tests) : `showConsultant`/`showPersonaRelation` ajoutés à `BriefFormModel` (persona/relation sont des concepts CRM, sans objet hors scope `account` — command §5). `purgeIncompatibleReferences` étendue : neutralise `persona`→`other`/`relation`→`unknown` et efface `contactId`/`companyName` dès que `scope !== "account"`, avec ajustement tracé (`recipientCrmFields`) — sans les supprimer du type (compatibilité historique, même principe que `buildDefaultBrief`).
- **`CommunicationBriefForm.tsx`** : contexte collaborateur rafraîchi via un vrai appel RPC (`loadCommunicationContextForCurrentUser`) déclenché à chaque sélection de consultant — différence assumée vs le Lot 7 (où les refs pivot ne faisaient que patcher des booléens client) car command §2 exige explicitement "charger son contexte via le RPC du Lot 4" après sélection. `applyStructuralChange` et le modèle utilisent désormais ce contexte rafraîchi (`effectiveFacts`/`effectiveReferences`/`effectiveSourceAvailability`) en priorité sur les props initiales. Nouveau bloc `fieldConsultant` remplace opportunité/mission/candidat/contact quand `scope=collaborator` (desktop "Qui" et mobile, positionné en premier sur mobile — command §8). Description de la source `collaborator_context` enrichie pour refléter honnêtement son contenu (identité, poste, compétences, activité, absences) sans créer de nouvelles sources dans le contrat wire (aucune migration).
- **`CommunicationComposerHost.tsx`** : nouveau `ComposerCollaboratorSelector` (symétrique à `ComposerAccountSelector`) — le scope `collaborator` ouvert sans consultant pré-résolu n'est plus un cul-de-sac silencieux (avant ce lot : message d'erreur sans action possible). `handleCollaboratorSelect` re-hydrate avec le consultant choisi.

## Scénarios couverts

Les 19 scénarios `management_consultants` de la registry (écrit/oral/briefing), avec vérification explicite en test des cas nommés par le command : reconnaissance (`collaborator_recognition`), changement de mission (`assignment_change_notice`, multi-finalité écrit/oral), feedback de performance (`performance_feedback_follow_up`/`performance_feedback_talk_track`), intercontrat (`intercontract_action_plan_message`/`intercontract_exit_pitch`), entretien annuel (`annual_review_follow_up`/`performance_review_prep`), rétention (`consultant_retention_follow_up`/`retention_conversation_*`), évolution de carrière (`career_opportunity_talk_track`/`career_development_briefing`), annonce difficile (`difficult_announcement_talk_track`), one-to-one (`one_on_one_alignment`), entretien sensible/disciplinaire (`sensitive_meeting_briefing`/`disciplinary_meeting_posture`).

## Données collaborateur utilisées

Exclusivement celles renvoyées par `get_collaborator_communication_context` (Lot 4, migration `20260711192041`) : identité professionnelle, statut/disponibilité, manager applicatif (`manager_profile_id`), mission courante + 5 missions récentes, profil métier, jusqu'à 20 compétences classées, 5 dernières activités CRA et 5 dernières absences — toutes des faits structurés, jamais une inférence RH. Le "Profil consultant" du formulaire n'affiche que les blocs réellement présents dans la réponse (aucun texte fabriqué quand une donnée manque).

## Tests

- **`communication-collaborator-context.test.ts`** (nouveau, 6 tests) : options de mission (courante en tête + dédup, repli sur missions récentes, vide si intercontrat pur), ligne de résumé (contexte non chargé, champs partiels).
- **`communication-brief-form-model.test.ts`** (+9 tests) : visibilité consultant/mission/persona-relation en scope collaborator, tons scénario-spécifiques appliqués via le modèle, sources `collaborator_context` verrouillée / `mission_context` optionnelle, purge des champs CRM hérités (avec et sans état sale), non-régression du scope account.
- **`communication-options-resolver.test.ts`** (+2 tests) : résolution de bout en bout des 6 scénarios nommés par le command (reconnaissance, feedback difficile, intercontrat, entretien annuel, rétention, briefing sensible) — catégorie/destinataire corrects, mission jamais requise mais toujours optionnelle ; scénario multi-finalité (`assignment_change_notice`) reste une seule entrée entre écrit et oral.
- **`communication-scenario-registry.test.ts`** (+2 tests) : tons scénario-spécifiques exacts pour les 8 scénarios override + defaut de catégorie préservé pour les scénarios sans override ; les 19 scénarios management restent strictement scopés `collaborator`/`eligibleRecipientTypes=["collaborator"]`.
- `npx tsc --noEmit` → EXIT 0.
- `npx eslint` sur les 13 fichiers touchés/créés → 0 erreur, 0 warning.
- `npm test` ciblé communication → 78/78 (54 Lot 7 + 24 nouveaux). Suite complète → 267/268 (1 échec préexistant `mobile-account-custom-list.test.ts`, confirmé reproduit sur la baseline `main` avant tout changement — documenté depuis le Lot 1, non aggravé).
- `npm run build` → succès, 37 routes générées.
- `git diff --check` → propre.

## Smoke visuel

Pas de Chrome DevTools MCP disponible dans cette session (cf. mémoire [[feedback-no-chrome]]). `npm run build` valide l'arbre de routes complet ; le serveur de développement déjà lancé par l'utilisateur répond correctement. La vérification visuelle authentifiée du composer en scope collaborator (desktop + mobile, sélection consultant, panneau profil, cascade mission) reste à faire par Guillaume.

## Écarts au contrat / limitations assumées

- **Sources granulaires** (command §6 liste collaborator/mission/skills/jobProfile/availability/recentActivity/recentAbsences/agenda comme des "sources" distinctes) : le contrat wire `CommunicationContextSourceId` (n8n/types.ts) n'a que deux entrées pertinentes ici (`collaborator_context`, `mission_context`) — étendre l'enum est un changement de contrat hors périmètre de ce lot (pas de migration Supabase, pas de modification n8n). Les six éléments sont exposés comme description enrichie de `collaborator_context` et comme panneau "Profil consultant" en lecture seule, pas comme cases à cocher indépendantes.
- **Mission jamais obligatoire** : aucun scénario management ne déclare `missionRef` en référence requise dans la registry actuelle ; command §2 précise "seulement si la registry l'exige" — aucune obligation n'a donc été inventée. `assignment_change_notice` serait le candidat naturel pour une future obligation, non ajoutée ce lot faute de mécanisme de `requiredReferences` par scénario (seul `eligibleRecipientTypes`/`suggestedTones` ont ce mécanisme à ce stade).
- **Rafraîchissement à la sélection** : contrairement au Lot 7, la sélection du consultant déclenche un vrai appel RPC (`loadCommunicationContextForCurrentUser`) — mais ce même appel se redéclenche aussi au montage initial quand un consultant est déjà pré-résolu par le Host (ex. depuis `ConsultantDrawer`), même si les données sont déjà disponibles côté props. Un appel RPC redondant au premier rendu, pas une incorrection — accepté pour garder un chemin de code unique et cohérent.
- **`collaboratorMustInclude`** (texte narratif injecté par `CommunicationComposerHost.hydrate()` pour le scope collaborator, hérité d'ADR-0013 Lot 3) : conservé tel quel. Le retirer aurait régressé la génération réelle tant que le Lot 10 (hydratation n8n par scope) n'a pas câblé l'appel serveur au RPC collaborateur — le workflow live actuel dépend encore de ce texte pour connaître l'identité du consultant.
- Fichier non suivi pré-existant (`public/icons_set/feature_redaction_assistee/*.png`) et une modification en cours non liée à ce lot (`AccountsContactsViews.tsx`, repositionnement d'un `CompanyLogo` mobile) repérés dans l'arbre de travail : ni l'un ni l'autre créés par ce lot, laissés intacts et exclus du commit.

## Statut

**done.**
