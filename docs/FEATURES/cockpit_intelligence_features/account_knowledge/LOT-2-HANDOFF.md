# LOT 2 — Document de reprise (HANDOFF)

> **STATUT : LOT 2 TERMINÉ — EN ATTENTE DE VALIDATION HUMAINE**
> Dernière mise à jour : 2026-08-05 CEST
> Commit de départ : `443a9a80 Document FOLIO design QA and archive workflows`

## Périmètre effectivement livré

Contrat technique TypeScript strict pour l'artefact `account_knowledge` V3 :
type `AccountKnowledgeContentV3`, sous-types de sections, `AccountKnowledgeClaimV3`
(avec `attribution` explicite), `AccountKnowledgeVerificationResultV3`,
constantes `ACCOUNT_KNOWLEDGE_V3_SCHEMA_VERSION` et
`ACCOUNT_KNOWLEDGE_V3_SECTION_ORDER`, helper de parcours canonique
`collectAccountKnowledgeV3Claims`, validateurs runtime dédiés, extension du
parseur versionné à `schema_version: 3`, garde de type `isAccountKnowledgeV3`,
extension de l'union `AccountKnowledgeArtifact`.

Compat V1/V2 préservée : les deux validateurs historiques n'ont pas été
touchés, les fixtures existantes restent valides et le parseur ne promeut
jamais silencieusement un V1 ou un V2 en V3.

## Fichiers modifiés

- `src/lib/intelligence/account-intelligence-contracts.ts` — ajout du bloc V3 (types + helper de collecte des claims).
- `src/lib/intelligence/intelligence-validators.ts` — validateurs V3 stricts, extension du parseur, garde de type.
- `src/lib/intelligence/intelligence-validators.test.ts` — 25 nouveaux tests V3 (claim, résultat, artefact minimal/dense, rejets, ordre canonique, versionnage).
- `src/lib/intelligence/account-knowledge-ingest.ts` — rejet explicite de `schema_version: 3` (ingestion réservée au Lot 4, sans quoi le narrowing V2 casserait).
- `docs/intelligence/INTEL-030-ACCOUNT-KNOWLEDGE-V3-CONTRACT.md` — mention de l'atterrissage du Lot 2.
- `docs/intelligence/LOT-2-HANDOFF.md` — ce document.

## Structure V3 retenue

Sept sections dans l'ordre fixé par le contrat fonctionnel :
`account_summary → identity → market_positioning → offers_and_customers →
value_chain → regulatory_environment → trends_and_news`. Aucune section
supplémentaire ; les anciens blocs `organisation`, `commercial_relationship`
et `operational_activities` sont explicitement bloqués côté validateur.
`regulatory_environment` contient exclusivement `current_regulations`,
`required_certifications` et `compliance_risks` — `upcoming_regulations`
(et variantes) est refusé. `trends_and_news` porte un paragraphe analytique
et au maximum trois `significant_signal_ids` uniques ; les signaux ne sont
jamais recopiés dans l'artefact.

## Invariants de sourcing et vérification

- Chaque `AccountKnowledgeClaimV3` conserve les règles héritées de `Claim` :
  texte non-placeholder, `source_refs` non vide et UUID valides, confiance
  bornée `[0, 1]`, date de vérification ISO ou `null`.
- Attribution `institutional` réservée aux prises de parole du compte
  (`nature: fact` uniquement) ; l'association `institutional + analysis`
  est refusée.
- Chaque claim publié possède exactement un `AccountKnowledgeVerificationResultV3`
  ciblant son chemin canonique — pas de doublon, pas d'orphelin, pas de
  chemin inexistant.
- Seul le verdict `confirmed` figure dans un artefact publié ; les verdicts
  `contradicted` et `insufficient_evidence` restent modélisés pour le futur
  workflow de vérification (Lot 3) mais retirent l'affirmation du contenu.
- Un verdict confirmé exige au moins une source de confirmation et interdit
  toute source contradictoire.

## Compatibilité V1/V2

- `AccountKnowledgeContent` (V1) et `AccountKnowledgeContentV2` inchangés.
- `parseAccountKnowledgeArtifact` route par `schema_version` explicite ; un
  V1 ou un V2 ne devient jamais un V3, et un V3 invalide n'est jamais réparé
  avec des valeurs par défaut.
- Le rejet V3 dans `account-knowledge-ingest.ts` est intentionnel : le
  contrat interdisait de brancher l'ingestion dans ce lot, la branche V3
  renvoie donc `ok: false` avec un message explicite (« réservée au Lot 4 »).

## Résultat des validations

- `npm run typecheck` → EXIT 0.
- `npm run lint` (fichiers touchés) → 0 erreur, 0 warning.
- `npm test` → 870/870 passés (dont 25 nouveaux tests V3, `intelligence-validators.test.ts`).
- `npm run build` → EXIT 0, toutes routes générées.
- `git diff --check` propre.

## Confirmations

- Aucune migration Supabase, RPC, type généré ou DDL.
- Aucun workflow n8n modifié.
- Aucun composant Desktop/Mobile, style ou token modifié.
- Aucun loader applicatif touché en dehors du rejet défensif V3 dans l'ingest.
- Aucun secret manipulé, aucun fichier `.env*` modifié.
- Aucun commit, push ou déploiement effectué.

## Points transmis au Lot 3

- Le contrat V3 attend un workflow qui produit lui-même les
  `verification_results` — chaque affirmation publiée doit être confirmée par
  une source distincte. Un verdict non confirmé retire l'affirmation, il ne
  la laisse pas dans l'artefact avec un flag.
- `identity.dynamic` reste `DeterministicIndicator | null` et n'est pas un
  Claim : le futur workflow doit émettre `null` ici, l'injection reste la
  responsabilité de l'ingestion (comme en V2).
- Les `significant_signal_ids` doivent être choisis parmi les
  `account_signals` existants ; leur validation d'existence relève du Lot 4
  (ingestion), pas du contrat.
- Les données relationnelles Supabase restent prioritaires sur les
  générations LLM — cette priorité s'appliquera dans les loaders (Lots 4-5)
  et n'a pas été codée en dur dans le contrat.
- `account-knowledge-ingest.ts` rejette V3 explicitement ; le Lot 4 devra
  remplacer ce rejet par un chemin d'ingestion complet (vérification des
  sources, des signaux, et recalcul du `source_coverage`).
