# INTEL-020 — Rapport Lot 15 — E2E, n8n et stabilisation finale

## Statut

**partial**.

- Baseline demandée : `08bb036bbe477c5eda882e99c5d03080afd518fe`.
- `main` au démarrage : `162c0aa5a890ebd367a8a31105dbec4fd41d5a14`, synchronisée avec `origin/main`, avec deux commits Account Scan supplémentaires au-dessus de la baseline demandée.
- SHA final : `HEAD` (le commit qui contient ce rapport).
- Aucun nouveau lot n'a été commencé.

## Audit initial

- Lots 0 à 14 : `done` dans le ledger.
- Couverture initiale : 41 fichiers Vitest, un harnais Node n8n et aucun projet/spec Playwright configuré ou installé.
- Arbre local hors Lot 15 préservé : `src/app/(app)/prospection/accounts/actions.ts`, `src/components/accounts-contacts/CompanyIdentityDrawer.tsx` et `src/components/accounts-contacts/scan/`.
- Workflow local : `intel-020-communication`, 16 nœuds, 14 connexions, export `active: false` sans ID/version n8n (artefact d'import, pas preuve de l'état VPS).
- Le endpoint de base n8n configuré répond HTTP 200, mais aucun accès SSH, CLI ou administrateur n8n n'est disponible pour exporter, comparer ou importer le workflow actif.

## Matrice déterministe — Niveau A

La matrice est exécutée par `src/lib/communication/communication-flow-e2e-matrix.test.ts`. Chaque fixture vérifie l'intent/preset, le scénario et le brief normalisé, le scope, le destinataire, le contrat de sortie/document, `scope_json` et les liens documentaires. Les frontières externes restent simulées ; aucun appel LLM payant n'est requis.

| # | Parcours | Intent/preset initial | Sortie | Scope |
|---:|---|---|---|---|
| 1 | Mail basé sur un signal | `signal_outreach` | écrit | account |
| 2 | Cold call prospect | `signal_outreach` → `cold_call_pitch` | oral | account |
| 3 | Brief de découverte | `discovery_preparation` | briefing | account |
| 4 | Mail de renouvellement | `mission_renewal` | écrit | account |
| 5 | Pitch objection prix | `price_objection` | oral | account |
| 6 | Brief de soutenance | `proposal_defense` | briefing | account |
| 7 | Communication de risque | `delivery_risk_message` | écrit | account |
| 8 | Brief d’escalade | `delivery_risk_briefing` | briefing | account |
| 9 | Invitation candidat | `candidate_interview` | écrit | account |
| 10 | Présentation d’opportunité au candidat | `opportunity_to_candidate` | briefing | account |
| 11 | Brief recruteur avant entretien | `recruiter_preparation` | briefing | account |
| 12 | Message de reconnaissance | `consultant_recognition` | écrit | collaborator |
| 13 | Talk track changement de mission | `consultant_assignment_change` | oral | collaborator |
| 14 | Brief de recadrage | `consultant_disciplinary_meeting` | briefing | collaborator |
| 15 | Brief 1:1 | `consultant_one_to_one` | briefing | collaborator |
| 16 | Brief intercontrat | `consultant_intercontract_talk_track` | briefing | collaborator |
| 17 | Demande d’aide staffing | `staffing_help` | écrit | internal |
| 18 | Pitch d’arbitrage N+1 | `finance_resource_arbitrage` | oral | internal |
| 19 | Brief de business review | `manager_business_review` | briefing | internal |
| 20 | Appui avant-vente | `presales_support` | oral | internal |
| 21 | Synthèse direction | `direction_summary` | briefing | internal |

Résultat : **21/21**. Les six catégories, les trois `outputKind` et les trois scopes sont couverts. Le harnais n8n couvre en complément la signature HMAC, legacy, validation scope/catégorie, hydratation, sources désactivées, manifeste 92 scénarios, prompts, parsing, QA réussie/rejetée, callback et l'absence de boucle LLM : **81/81**.

## Correctifs

### Fuite de destinataire CRM

Cause racine : `buildCommunicationEntryPreset` choisissait le nom du destinataire dans une liste globale (`contact`, `candidate`, `collaborator`, interne) et transmettait aussi `contactId`/`companyName` quel que soit le scope. Un preset collaborateur ouvert avec un contact préchargé pouvait donc adresser le consultant par le nom CRM.

Correctif : les champs du destinataire sont désormais restreints au scope canonique. Les références CRM restent dans `context` pour l'hydratation et la bibliothèque. Test ajouté puis mis en échec avant correction : `does not leak CRM recipient fields into collaborator or internal presets`.

### Idempotence bibliothèque sur callback rejoué

Cause racine : `intelligence_documents.source_result_id` n'avait ni contrainte ni index unique, en dépôt comme en production. Deux callbacks simultanés pouvaient franchir le contrôle d'existence puis créer deux documents.

Correctif : migration `20260712205857_intel_020_document_source_result_idempotency.sql` appliquée live, avec index unique partiel sur `source_result_id IS NOT NULL`. Le perdant d'une course relit maintenant le document gagnant et retourne un succès idempotent. Tests ajoutés puis mis en échec avant correction : course simulée de callback et présence de la migration.

## Supabase vérifié réellement

- Enum `intelligence_document_type` : `prise_de_parole` présent.
- `ai_intelligence_runs` et `ai_intelligence_results` : colonnes workspace, owner, statut, snapshots, QA et entité primaire présentes.
- Publication Realtime sur `ai_intelligence_results` : présente.
- RPC `get_collaborator_communication_context(uuid, uuid, uuid)` : présente.
- Historique INTEL-020 observé : 42 runs réussis, 14 échoués ; 38 résultats `communication`, 10 `commercial_pitch`, 1 `prise_de_parole`.
- Aucun doublon `intelligence_documents.source_result_id` avant migration ; index unique partiel présent après application.
- Migration Lot 15 alignée avec l'historique live sous `20260712205857`.

Écart préexistant relevé, non modifié : le fichier local Lot 4 est `20260711192041_intel_020_collaborator_communication_context.sql`, tandis que l'historique live porte `20260711192254_intel_020_collaborator_communication_context`. La RPC est présente, mais cet écart doit être réconcilié avant un `supabase db push` global.

## n8n — déploiement et smoke Niveau B

**Non validé réellement.** Le workflow actif VPS n'a pas pu être exporté/comparé/importé : pas d'accès admin n8n disponible dans la session. Aucun des six runs LLM réels n'a été lancé et aucune donnée E2E n'a été créée.

Checklist exacte avant passage à `done` :

1. Exporter l'actif `intel-020-communication` depuis le VPS et le sauvegarder hors Git.
2. Comparer ses nœuds, connexions et version avec `n8n/workflows/intel-020-communication.json`, sans exposer credentials ni secrets.
3. Importer le JSON du dépôt, conserver credentials/webhook et vérifier `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `N8N_WEBHOOK_SECRET`, `ANTHROPIC_API_KEY`, `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` et `NODE_FUNCTION_ALLOW_BUILTIN=crypto` dans le conteneur.
4. Vérifier les 16 nœuds et 14 connexions, puis activer la version importée.
5. Déclencher via `/api/n8n/trigger` un test HMAC contrôlé, jamais depuis le frontend directement.
6. Exécuter les six catégories dans un workspace isolé, couvrant les trois sorties/scopes, au moins un succès et un rejet QA, puis contrôler callback, Realtime, runs, résultats, documents et liens.
7. Supprimer tous les runs/résultats/documents/liens du workspace de test et consigner les IDs uniquement dans un canal sécurisé si nécessaire.

## Desktop, Mobile et accessibilité

- `next build` compile les routes et les composants modifiés.
- Un serveur Next existant répond : `/login` retourne 200 ; `/consultants`, `/staffing`, `/finance` et `/agenda` redirigent correctement vers `/login` sans session.
- Non testé visuellement : composer authentifié Desktop 1440×900, iPhone 14 390×844, clavier tactile, résultat long, focus/Escape, Realtime en drawer et bibliothèque. Le plugin Browser, Playwright et une session authentifiée locale ne sont pas disponibles ; aucune capture ou interaction protégée ne peut être revendiquée.
- La console du serveur partagé n'est pas déclarée propre : elle contient des avertissements préexistants de page login/hydratation et d'assets d'autres surfaces, sans reproduction sur un parcours INTEL-020 authentifié. Ils sont hors périmètre de ce lot et empêchent toute affirmation plus large.

## Validation

- `npm run gen:comm-manifest` puis diff de l'artefact : ✅, 92 scénarios ; warning Node historique `MODULE_TYPELESS_PACKAGE_JSON`.
- `npx tsc --noEmit` : ✅.
- ESLint ciblé des fichiers modifiés : ✅.
- Matrice Level A et tests de correctifs : ✅, 75 assertions ciblées.
- `node n8n/workflows/__tests__/intel-020-communication.test.js` : ✅, 81/81.
- `npm test` : ⚠️ 366/367 assertions ; seul échec préexistant `mobile-account-custom-list.test.ts`, hors INTEL-020.
- `npm run build` : ✅.
- `git diff --check` : ✅.

## Nettoyage

Aucune donnée de test Supabase/n8n/LLM n'a été créée. Aucun nettoyage de données n'est donc requis.

## Limites restantes

- Version n8n active, import VPS, HMAC réel et six runs LLM : non vérifiés.
- Session authentifiée, E2E navigateur Desktop/Mobile et accessibilité interactive : non vérifiés.
- L'échec Vitest mobile CRM historique reste hors périmètre et reproductible.

## État de production INTEL-020

**Prêt sous réserve d’une action listée.**

Avant production, un opérateur disposant de l'accès VPS n8n et d'une session applicative de test doit exécuter la checklist ci-dessus, confirmer les six smokes réels et nettoyer le workspace E2E. Sans cette action, le statut doit rester `partial`.
