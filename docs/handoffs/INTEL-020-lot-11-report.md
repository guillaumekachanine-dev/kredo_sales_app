# INTEL-020 — Rapport Lot 11 — Prompts n8n (4 couches) et contrôle qualité

## Baseline

- Branche : `main`
- SHA de départ : `d3d7665a` (Lot précédent — routage communication par scope).
- Périmètre : workflow existant `intel-020-communication` exclusivement + une touche
  UI bornée. Aucun nouveau workflow, aucune migration Supabase, aucun changement de
  contrat wire (callback inchangé), registry/résolveur/schéma non touchés.
- Spec de référence : `docs/handoffs/INTEL-020-lot-11-prompt.md` (version durcie
  après revue, 6 corrections intégrées).

## Fichiers modifiés / créés

- `n8n/workflows/intel-020-communication.json` — 5 nœuds Code réécrits
  (`Assemble Prompt`, `Parse & Validate Output`, `Quality Check`, `Prepare Callback`,
  `Prepare Failure Callback`) + manifeste inliné dans `Assemble Prompt`.
- `scripts/generate-communication-manifest.mjs` (nouveau) — générateur de manifeste.
- `n8n/workflows/intel-020-communication.manifest.json` (nouveau) — artefact généré.
- `package.json` — script `gen:comm-manifest`.
- `n8n/workflows/__tests__/intel-020-communication.test.js` — harnais étendu (46 → 81).
- `src/components/accounts-contacts/intelligence/IntelligenceActionDrawers.tsx` —
  affichage de la raison d'échec via `qa_flags` (touche UI unique autorisée).
- `n8n/workflows/intel-020-communication.SETUP.md` — §12 (Lot 11).

## Prompts restructurés (4 couches)

- **Couche 1 — global** : identité **sourcée** (nom workspace si hydraté, sinon
  neutre), **aucune spécialisation affirmée** (corrige une incohérence : les anciens
  prompts affirmaient « Data/IA · Cloud · PM · Cyber » alors que rien ne le prouve —
  contradictoire avec l'interdiction d'inventer une capacité). No-invention,
  no-leak, **préséance** des règles sur les préférences utilisateur.
- **Couche 2 — outputKind** : forme + contrat JSON par finalité (écrit / pitch oral /
  briefing). Le discriminant est désormais `outputKind`, plus `isPitch`.
- **Couche 3 — activityCategory + scope** : garde-fous par catégorie appliqués aux
  **trois** finalités, y compris le **chemin écrit** (auparavant un unique prompt
  « rédacteur commercial » pour tout l'écrit) : commerce ≠ delivery ≠ recrutement ≠
  management ≠ interne. `internal_staff` a enfin son propre cadre (il empruntait
  celui du management depuis le Lot 10).
- **Couche 4 — scénario** : **21 missions flagship bespoke** (crise, recadrage,
  annonce difficile, rétention, arbitrage, défense candidat…) + **template dérivé du
  manifeste** pour les 71 autres. Fin des ~64 scénarios qui retombaient sur une
  mission vide.

### Anti-duplication (C1) — manifeste généré, pas maintenu à la main

La registry TS reste la source de vérité. `gen:comm-manifest` en dérive un artefact
JSON versionné **et** inline un `SCENARIO_MANIFEST` dans le nœud (build-time, car un
nœud n8n ne lit pas le TS au runtime). Un test de drift échoue si registry, artefact
et bloc inliné divergent.

### Durées / profondeurs réellement honorées

`SPOKEN_DURATION` (30 s / 1 min / 2 min / 5 min → cibles de mots) et `BRIEFING_DEPTH`
(Flash → Approfondi) pilotent le prompt **et** les bandes QA. Corrige un défaut
live : le pitch oral était calibré « 30 s » en dur quelle que soit la durée choisie.

## Règles QA ajoutées

- **Réparation déterministe uniquement** (fences ```` ```json ````) — **aucun second
  appel LLM** (C3). Un contenu générique/incomplet n'est pas re-prompté en douce :
  il est bloqué, l'utilisateur relance.
- **Ancrage contextuel non naïf** (C2) : jetons **distinctifs** (multi-mots, chiffres,
  noms propres ; tokens courts/communs filtrés) + validation des `source_refs`,
  **seuil conservateur** (ne bloque pas un premier contact légitimement peu ancré).
  C'est le filet anti-générique : une sortie qui ne reprend aucun fait réel du
  dossier, sur un contexte riche, est **rejetée** plutôt que vendue comme sur-mesure.
- Placeholders, fuite de données techniques, exclusions utilisateur, vocabulaire
  commercial hors commerce, engagement de prix, contrôles par finalité.
- **Chemin écrit scope-aware (D5)** : le CTA n'est plus exigé sur tout message écrit
  (corrige le faux-flag sur reconnaissance / note / synthèse) — attendu seulement
  selon l'objectif.

### Échec propre et lisible (exigence owner)

Un échec **bloquant** (placeholder, fuite technique, exclusion violée, ancrage nul
sur contexte riche) fait émettre à `Prepare Callback` un `status: 'failed'` (jamais
un faux succès) avec `errorMessage` lisible et sans fuite technique + `qaFlags`.
Choix d'architecture : passer par `Prepare Callback` plutôt que lever une exception
vers la branche d'échec **préserve les `qaFlags`**, que l'UI affiche pour expliquer
l'échec. `Prepare Failure Callback` (exceptions réelles) dépose aussi un `qaFlag`
lisible ; le message technique brut reste sur `run.error_message`.

## Scénarios testés (harnais Node, exécution réelle) — 81 assertions, 0 échec

Les 46 assertions Lot 10 (Validate Brief / Hydrate Context, inchangés) + 35 nouvelles :
- **Couverture** : les 92 scénarios du registry résolvent tous vers une mission non vide.
- **Drift** : registry ⇔ artefact JSON ⇔ bloc inliné identiques.
- **Assemblage** : durée `detailed` = 5 min (pas 30 s) ; profondeur `ultra_short` =
  Flash ; identité sans spécialisation inventée + préséance ; injection dans les
  consignes libres explicitement subordonnée (plus de « INSTRUCTIONS IMPÉRATIVES ») ;
  les 5 tons métier réellement injectés.
- **QA** : email valide ancré → succeeded ; sortie générique sur contexte riche →
  **failed** avec raison lisible + qaFlags ; contexte pauvre → non bloqué ;
  placeholder → bloqué ; exclusion violée → bloquée ; défense candidat orale →
  `prise_de_parole` ; briefing management sensible → contrat non commercial complet
  (postures/emotional_context/power_dynamic) ; briefing incomplet → rejeté ;
  réparation de fences → succeeded ; sortie non-JSON → rejetée.

## Validation

- `node n8n/workflows/__tests__/intel-020-communication.test.js` → **81 passed, 0 failed**.
- `node scripts/generate-communication-manifest.mjs --check` → drift OK (92 scénarios).
- `npx tsc --noEmit` → EXIT 0. `npm run build` → EXIT 0 (toutes routes). `eslint`
  sur les fichiers touchés → 0 erreur.
- `npm test` (vitest) → 281/282 — le seul échec (`mobile-account-custom-list.test.ts`)
  est préexistant et hors périmètre, documenté depuis le Lot 1.
- `git diff --check` → propre. JSON du workflow rechargé (16 nœuds, connexions
  intactes, aucun nœud renommé).

## Nombre de tests

Harnais n8n : **81 assertions**. Suite vitest inchangée (281 passants, 1 échec
préexistant hors périmètre).

## Écarts au contrat / limitations

- **Identité entreprise neutre** : le nom réel de l'ESN n'est pas hydraté
  (`Resolve Sender` ne lit que `profiles`) ; identité neutre en attendant une
  éventuelle hydratation `workspaces.name` (hors périmètre — pas de nouvelle
  hydratation ce lot).
- **Rejet bloquant via `Prepare Callback`** (status failed) plutôt que la branche
  d'échec : choix délibéré pour préserver `qaFlags` jusqu'à l'UI (exigence owner).
- **Ancrage** heuristique et volontairement conservateur : il empêche de vendre un
  texte générique comme sur-mesure, il ne garantit pas la brillance du LLM.
- **Commit Git ≠ déploiement n8n (C6)** : le workflow est **inerte** tant qu'il n'est
  pas ré-importé sur le VPS. Validation par harnais Node uniquement (pas d'accès
  LLM/VPS dans la session), checklist au §12 du SETUP.md.

## Statut

**done.**
