# INTEL-020 — Rapport Lot 10 — Validation et hydratation n8n par scope

## Baseline

- Branche : `main`
- SHA de départ : `6655654c32fde24f8e9104393922cb2cc5c576dc` (Lot 9 — formulaire Interne / Staff)
- Périmètre : workflow existant `intel-020-communication` exclusivement. Aucun nouveau workflow, aucun prompt éditorial réécrit, aucun format de résultat modifié, aucune bibliothèque documentaire touchée, aucun point d'entrée, aucune UI, aucune migration Supabase.

## Fichiers modifiés

- `n8n/workflows/intel-020-communication.json` — 5 nœuds Code modifiés (`Validate Brief`, `Hydrate Context`, `Assemble Prompt`, `Parse & Validate Output`, `Quality Check`).
- `n8n/workflows/intel-020-communication.SETUP.md` — nouveau §11 (Lot 10) + exception documentée au §3.
- `n8n/workflows/__tests__/intel-020-communication.test.js` (nouveau) — harnais Node persisté, 46 assertions.
- `docs/handoffs/INTEL-020-dynamic-implementation-ledger.md`, `docs/handoffs/INTEL-020-lot-10-report.md`.

## Routage par scope (remplace `isPitch ? get_pitch_context : get_communication_context`)

- **`account`** : `get_communication_context` toujours (si `companyId` présent), `get_pitch_context` **uniquement** si `requiresOffer` ou `offerRef` renseigné — fusion sans écrasement (seuls les champs propres à l'offre s'ajoutent par-dessus le contexte général).
- **`collaborator`** : `get_collaborator_communication_context` uniquement, avec `missionId` facultatif si `missionRef` est présent.
- **`internal`** : **zéro appel RPC** par défaut — contexte construit depuis `brief.who.recipient.{internalRole,internalRelationship,internalDomain,displayName}` uniquement. Enrichissement facultatif via les RPC `account`/`collaborator` **déjà existantes** (pas de RPC nouvelle) si `companyRef`/`collaboratorRef` est explicitement présent.

**Bug pré-existant corrigé en cours de route** : `Assemble Prompt`/`Parse & Validate Output`/`Quality Check` testaient encore `activityCategory === 'interne_management'` — une valeur que le front n'émet plus depuis les Lots 1-2 ADR-0013. Conséquence réelle et vérifiée : **tout** briefing `management_consultants`/`internal_staff` (donc tous les scénarios des Lots 8 et 9) retombait silencieusement sur le prompt commercial générique (`SYSTEM_PROMPT_MEETING_BRIEFING`, règles catalogue/tarif) au lieu de `SYSTEM_PROMPT_BRIEFING_MANAGEMENT`, et la validation `emotional_context`/`power_dynamic`/`no_commercial_language` ne s'appliquait jamais à ces catégories. Corrigé dans les 3 nœuds.

**Autre dérive corrigée** : `Validate Brief` n'exigeait `offerRef` que pour 3 scénarios (`cold_call_pitch`/`meeting_prep_cross_sell`/`renewal_pitch`) alors que le registre front en compte 6 depuis ADR-0013 Lot 1 (`offer_introduction`, `cross_sell`, `proposal_defense_pitch` manquaient) — resynchronisé.

## Filtrage des sources

`Validate Brief` calcule `activeSources` (les 11 identifiants de `CommunicationContextSourceId` moins `brief.context.disabledContextSources`) sans dupliquer la registry front — le front garantit déjà qu'une source verrouillée ne peut jamais être désactivée (Lot 7), donc `disabledContextSources` est la contrainte déjà résolue que n8n consomme telle quelle. `Hydrate Context` supprime ensuite, via `SOURCE_FIELD_MAP`, les champs de contexte correspondant à toute source non active — **avant** qu'`Assemble Prompt` ne les lise, donc avant qu'ils n'atteignent le prompt (réduction réelle de tokens, pas un filtrage cosmétique en aval). `mustExclude` n'est plus jamais utilisé comme mécanisme de désactivation (déjà retiré côté front au Lot 7).

## Décision d'architecture notable

`Hydrate Context` passe de `httpRequest` à **Code** (seul nœud de ce type dans ce workflow à changer de type) : le routage conditionnel par scope, la fusion à deux RPC et l'absence d'appel pour `internal` ne sont pas exprimables dans une seule expression d'URL/body d'un nœud HTTP Request. L'authentification reste **strictement identique** — même credential `supabaseApi`, via `this.helpers.httpRequestWithAuthentication` (l'équivalent officiel n8n du même mécanisme pour un nœud Code) — aucune reconfiguration VPS. Documenté explicitement au §3/§11 du SETUP.md car cela déroge à la note existante "HTTP Request partout" laissée par une session précédente.

## Cas testés (harnais Node, exécution réelle — pas seulement `node --check`)

46 assertions, tous les cas requis par la commande :
1. Compte sans offre — 1 appel RPC (`get_communication_context` seul).
2. Compte avec offre obligatoire — rejet sans `offerRef` puis 2 appels RPC fusionnés (accept).
3. Recrutement candidat — `profileRef` propagé, scope `account` confirmé.
4. Delivery avec mission — `missionRef` transmis au RPC.
5. Management consultant — 1 appel RPC (`get_collaborator_communication_context` seul, jamais les RPC compte), **et** sélection du bon system prompt (`SYSTEM_PROMPT_BRIEFING_MANAGEMENT`, pas le commercial) pour un briefing `disciplinary_meeting_posture`.
6/12. Staff interne sans référence — **zéro** appel RPC (absence d'hydratation inutile vérifiée explicitement).
7. Staff interne avec référence facultative — 1 appel RPC d'enrichissement, `ctx.internalRecipient` **et** `ctx.company` coexistent.
8. Source optionnelle désactivée — `ctx.sectorNews` absent après filtrage, `ctx.company` (source non désactivée) toujours présent.
9. Ancien brief legacy — 3 normalisations simultanées (`outputKind` déduit du canal, `profile_submission_to_client`, `interne_management`+`collaborator`→`management_consultants`).
10. Mauvais scope — 4 variantes rejetées (catégorie/scope incohérents ×2, `internalRole` manquant, `collaboratorRef` manquant).
11. Référence d'un autre workspace — chaque appel RPC est scopé par construction au `workspaceId` du run (`p_workspace_id`), vérifié sur tous les appels enregistrés.
- Extra (régression) : les 6 scénarios `requiresOffer` du registre front sont bien tous rejetés sans `offerRef` (corrige la dérive de 3 scénarios oubliés).

## Validation

- `node --check` (fonction englobante `async function` pour matcher le mode d'exécution réel des nœuds Code n8n) sur les 5 nœuds modifiés → EXIT 0 chacun.
- Harnais Node réel (`node n8n/workflows/__tests__/intel-020-communication.test.js`) → **46 passed, 0 failed**.
- JSON du workflow re-chargé après écriture (`json.load`), structure vérifiée (16 nœuds, mêmes noms, `connections` intact — clés par nom de nœud, jamais renommé).
- `npx tsc --noEmit` → EXIT 0 (aucun fichier TypeScript touché ce lot, vérifié sans régression).
- `npm test` (vitest) → 281/282, strictement identique à l'état d'avant ce lot (1 échec préexistant `mobile-account-custom-list.test.ts`, hors périmètre, documenté depuis le Lot 1).
- `git diff --check` → propre sur les fichiers de ce lot.

## Écarts au contrat / limitations assumées

- **`internal_staff` n'a pas de system prompt dédié** : faute d'un prompt éditorial existant à réutiliser (créer un nouveau texte est explicitement hors périmètre), `internal_staff` continue de partager `SYSTEM_PROMPT_BRIEFING_MANAGEMENT` avec `management_consultants` une fois le bug de catégorie corrigé — imparfait sémantiquement (ce prompt parle de "collaborateur", pas de collègue Staff) mais strictement meilleur que le prompt commercial utilisé jusqu'ici. Un prompt dédié est réservé au Lot 11 ("prompts et QA exhaustifs — couvrir tous les scénarios, durées, catégories et garde-fous"), qui est explicitement le lot suivant du roadmap.
- **Chemin `written_message` toujours sans différenciation de prompt par catégorie** — `SYSTEM_PROMPT` unique pour tous les messages écrits, pré-existant à ce lot, non traité (même raison : nécessiterait un nouveau texte éditorial). Réservé au Lot 11.
- **Candidat / document source** : `SOURCE_FIELD_MAP` mappe `candidate_profile` et `source_document` vers des listes de champs vides — aucune des deux RPC existantes n'expose aujourd'hui de section de contexte dédiée à un candidat référencé ou à un document source ; rien à filtrer côté n8n tant que ces sections n'existent pas côté hydratation (cohérent avec le même constat déjà documenté côté front, Lots 7-9).
- **Enrichissement `internal` par référence facultative** : décision interprétative documentée explicitement dans le SETUP.md — la commande dit "ne pas appeler de RPC spécifique" pour `internal`, interprété comme "pas de RPC nouvelle", pas "aucun appel possible". Si cette lecture s'avère trop permissive à l'usage, elle est isolée dans une seule fonction (`hydrateInternal`) et facile à durcir sans toucher au reste du nœud.
- **Test workflow réel non fait** : aucun accès VPS n8n dans cette session (comme tous les lots précédents) — validation par harnais Node uniquement, checklist d'import/test manuel consignée au §11 du SETUP.md.
- Fichiers non liés à ce lot repérés dans l'arbre de travail (`AccountsContactsViews.tsx`, `veille/page.tsx`, `VeilleActualitesMobile.tsx`, `ReportsMobileView.tsx` — modifications en cours côté utilisateur ; `public/icons_set/feature_redaction_assistee/*.png`, non suivi) : ni créés ni modifiés par ce lot, laissés intacts et exclus du commit.

## Statut

**done.**
