# INTEL-020 — Rapport Lot 7 — Formulaire dynamique Account, Delivery, Recrutement

## Baseline

- Branche : `main`
- SHA de départ : `b2468c0bf6d1684314a982678e5e6c595d83d6f7` (Lot 6 — navigation à trois finalités)
- Périmètre : `CommunicationBriefForm` rendu réellement dynamique pour `commerce_prospection`, `commerce_actif`, `delivery`, `recrutement`. Aucune modification du workflow n8n, des formulaires Management/Interne (Lots 8-9), des résultats ou des points d'entrée.

## Décisions et fichiers

### Modèle pur (aucune condition métier dupliquée en React)

- **`src/lib/communication/communication-brief-form-model.ts`** (nouveau) : `buildBriefFormModel(brief, resolution, sourceAvailability)` dérive de la registry + du résolveur quels champs afficher/requérir (catégorie, entité pivot compte/contact/opportunité/mission/candidat, offre, destinataire, objectifs/canaux/longueurs/tons disponibles). `buildContextSourceStates` classe chaque source contextuelle en `locked_on` (requise et disponible) / `optional_on` / `optional_off` / `unavailable` (indisponible, jamais masquée sans preuve négative réelle). `mergeCommunicationFacts` transforme les refs choisies manuellement dans le formulaire (opportunité/mission/candidat/offre/contact) en facts pour la résolution suivante — sans refetch Supabase à chaque sélection (borne assumée du lot). `purgeIncompatibleReferences` retire une référence (offre/opportunité/mission/candidat) devenue hors-sujet après un changement de catégorie/scénario, avec un ajustement tracé.

### Bug découvert et corrigé en cours de route

Le recrutement mélange des scénarios adressés au candidat et d'autres adressés au client. Le filtre de scénarios candidats du résolveur (`communication-options-resolver.ts`) s'appuie sur `facts.recipientType` — hérité du `lifecycle_status` du compte, qui n'est **jamais** `"candidate"`. Sans correctif, sélectionner un scénario recrutement candidat-destinataire (ex. `candidate_follow_up`) l'aurait fait écarter silencieusement de la liste des candidats internes du résolveur et remplacer par un autre scénario au hasard — un bug présent **avant ce lot** (la registry avait déjà `eligibleRecipientTypes` uniformes non compatibles avec "candidate" pour la catégorie), mais invisible faute de distinction candidat/client. Corrigé dans `mergeCommunicationFacts` : le fait `recipientType` n'est propagé au résolveur que hors catégorie recrutement — le résolveur déduit alors le destinataire du scénario réellement choisi. Testé par régression explicite (`communication-brief-form-model.test.ts`).

Second correctif ciblé dans **`communication-options-resolver.ts`** : le choix utilisateur du destinataire (ex. basculer `prospect`/`active_client` sur `candidate_to_client_pitch`) prime désormais sur le fait de lifecycle tant qu'il reste éligible pour le scénario résolu, au lieu d'être systématiquement écrasé — sans quoi la préservation des choix utilisateur valides (command §4, §9) était impossible pour ce champ. Vérifié compatible avec tous les tests resolver existants (aucun cas testé n'avait de divergence brief/fact préalable).

### Registry (`communication-scenario-registry.ts`)

`ScenarioSeed` accepte un `eligibleRecipientTypes` optionnel qui prime sur le défaut de catégorie (`toScenarioDefinition`). Les 14 scénarios recrutement sont classés : 12 candidat-destinataire (`eligibleRecipientTypes: ["candidate"]`) et 2 client-destinataire (`candidate_to_client_pitch`, `atypical_candidate_defense` → `["active_client", "prospect"]`). Aucun autre scénario ni catégorie touché ; les 92 identifiants du catalogue restent inchangés.

### Entités pivot (command §2/§3)

- **`get-account-crm-refs.ts`** (nouveau, Server Actions) : `getAccountOpportunities`/`getAccountMissions` (listes légères scoping compte, ≤25 lignes) ; `getAccountCandidates` (candidats déjà positionnés sur une opportunité du compte en priorité, repli sur le vivier récent du workspace — jamais un candidat inventé).
- **`EntityRefSelect.tsx`** (nouveau) : sélecteur générique `<Select>` réutilisé pour opportunité/mission/candidat (même pattern que `ContactSelector`).
- Compte : reste résolu en amont (Host), affiché en lecture seule via `contextMetaLabel` — pas de sélecteur dans ce lot (déjà conforme au contrat "lecture seule").
- Offre catalogue : corrige l'écart documenté (handoff §5.4) — `showOffer`/`offerRequired` pilotés uniquement par `scenario.requiresOffer`, plus par `outputKind !== "written_message"`.

### `CommunicationBriefForm.tsx` (réécriture ciblée)

Ordre fonctionnel command §1 respecté dans la structure QUOI/QUI/COMMENT/CONTEXTE existante (préservée, pas de refonte graphique) : sélecteur de catégorie (pastilles, visible seulement en scope `account`) → entité pivot (opportunité/mission/candidat, visibles seulement quand la registry les référence pour la catégorie active) → scénario (picker désormais restreint à la catégorie active, saute directement à l'étape scénarios quand une seule catégorie est éligible) → objectif/canal/longueur/ton (options filtrées par `resolution.available*`, repli sur la liste complète si vide) → offre → sources → consignes libres. Toute modification structurante (catégorie, scénario, destinataire, refs, offre) passe par `applyStructuralChange`, qui ré-exécute le résolveur + `purgeIncompatibleReferences` et affiche une note discrète (`structuralNotice`) quand un choix a été ajusté. `who.recipient.persona`/`relation` et le sélecteur de contact CRM sont masqués quand le scénario est candidat-destinataire (le destinataire n'est pas un contact CRM). Sources contextuelles : seules celles référencées (requises ou optionnelles) par le scénario résolu sont affichées ; requises = verrouillées ; indisponibles = désactivées avec explication ; `mustExclude` fake-disable retiré (`IntelligenceActionDrawers.tsx`), `context.disabledContextSources` reste la structure explicite transmise telle quelle (filtrage réel n8n = Lot 10).

### `ScenarioPicker.tsx` / `ScenarioPickerModal.tsx`

Props optionnelles `allowedCategories`/`allowedScenarios` (non fournies = comportement historique, seul consommateur reste `CommunicationBriefForm`). Formulaire n'utilise que `allowedCategories` (restriction à la catégorie déjà choisie) — `allowedScenarios` volontairement non branché ici : le préfiltrer via `resolution.availableScenarios` aurait réintroduit le bug `facts.recipientType` décrit plus haut au niveau de l'affichage du picker, pour un gain marginal (la catégorie seule suffit à éliminer l'essentiel du bruit). Auto-saut à l'étape scénarios quand une seule catégorie est éligible, implémenté via le pattern React "ajuster l'état pendant le rendu" (pas un `useEffect`, pour rester compatible avec la règle ESLint `react-hooks/set-state-in-effect` du repo).

## Tests

- **`communication-brief-form-model.test.ts`** (nouveau, 11 tests) : visibilité opportunité/mission par catégorie, offre visible/requise uniquement si `requiresOffer`, distinction candidat-destinataire vs client-destinataire, verrouillage/indisponibilité des sources contextuelles, purge de référence incompatible au changement de catégorie, conservation d'une référence toujours pertinente, régression du bug recipientType recrutement.
- **`communication-options-resolver.test.ts`** (+1 test) : préservation d'un destinataire choisi par l'utilisateur, repli sur le fait quand le choix devient invalide.
- **`communication-scenario-registry.test.ts`** (+1 test) : `eligibleRecipientTypes` correctement narrowés pour les 14 scénarios recrutement, sans toucher aux 92 identifiants existants.
- `npx tsc --noEmit` → EXIT 0.
- `npx eslint` sur tous les fichiers touchés/créés (9 fichiers) → 0 erreur, 0 warning.
- `npm test` ciblé (`src/lib/communication/`) → 54/54. Suite complète → 251/252 (1 échec préexistant, `mobile-account-custom-list.test.ts`, confirmé reproduit sur la baseline `main` avant tout changement de ce lot — hors périmètre INTEL-020, documenté dans le ledger depuis le Lot 1).
- `npm run build` → succès, 37 routes générées, aucune régression.
- `git diff --check` → propre.

## Smoke visuel

Pas de Chrome DevTools MCP disponible dans cette session. Le serveur de développement déjà lancé par l'utilisateur (port 3000) répond correctement (redirection `/login`) et `npm run build` valide l'arbre de routes complet. La vérification visuelle authentifiée du composer (desktop + mobile, sur les 4 catégories couvertes par ce lot) reste à faire par Guillaume, comme pour tous les lots précédents.

## Écarts au contrat / limitations assumées

- **Contact requis** (command §2 "contact requis uniquement lorsqu'un destinataire nominatif est nécessaire") : aucun scénario n'encode aujourd'hui cette obligation dans la registry ; le contact reste toujours optionnel (repli "Madame, Monsieur générique" déjà existant) — pas de fausse obligation inventée.
- **Consultant présenté** (distinct du candidat, ex. cross-sell d'un consultant KREDO déjà en poste) : le sélecteur `profileRef` couvre les candidats réels du vivier/positionnements, pas les collaborateurs. Aucun sélecteur de consultant-présenté n'a été ajouté ce lot (aucune UI existante à réutiliser, hors budget) — `profile_submission_to_client` reste fonctionnel via le contexte texte libre comme avant.
- **Rafraîchissement des facts après sélection d'entité** : choisir une opportunité/mission/candidat dans le formulaire alimente immédiatement le résolveur en booléens de présence (`hasOpportunity`, etc.) mais ne redéclenche pas les RPC Supabase (`get_communication_context`/`get_pitch_context`) pour enrichir `communicationFacts` avec le statut réel de l'entité choisie (étape, statut mission…). Choix assumé pour rester dans le périmètre client de ce lot ; un refetch serveur reste possible dans un lot ultérieur si le besoin se confirme.
- **`allowedScenarios`** : prop ajoutée à `ScenarioPicker`/`ScenarioPickerModal` mais non utilisée par `CommunicationBriefForm` (cf. section précédente) — disponible pour un lot futur une fois le filtrage recipientType consolidé.
- Fichiers non suivis pré-existants repérés en marge (`public/icons_set/feature_redaction_assistee/*.png`) : non créés par ce lot, non référencés par le code, laissés intacts sans les ajouter au commit.

## Statut

**done.**
