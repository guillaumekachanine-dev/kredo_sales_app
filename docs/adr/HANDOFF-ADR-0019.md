# Handoff — Chantier ADR-0019 (profondeur de compte & cartographies concurrentielles)

> **Rédigé le 2026-08-10, par Claude (Opus 5), pour reprise par Gemini.**
> **Corrigé le 2026-08-11** — le workflow n8n livré le 2026-08-10 (patch Lot 4) **ne fonctionnait
> pas en production**. Guillaume l'a corrigé directement (VPS + réexport), et c'est **cette version
> corrigée qui est commitée et qui fait foi** (`abc5c635`). Ce document a été réajusté en
> conséquence — voir §5bis pour le détail du bug, du correctif, et surtout pour **pourquoi ma
> propre validation ne l'avait pas vu**, cette dernière partie étant la plus utile pour éviter de
> répéter l'erreur.
> **Commit HEAD à la date de cette correction : `abc5c635` sur `main`, poussé et déployé en
> production.** ⚠️ Le working tree local porte, au moment de cette correction, des modifications
> **non commitées et sans rapport avec ce chantier** (travail en cours de Guillaume sur
> `AccountScanDialog.tsx`, un nouveau `AccountScanIdentityConfirm.tsx`, `api/n8n/trigger/route.ts`,
> `api/intelligence/account-identity/`) — n'y touche pas, ce n'est pas dans le périmètre d'ADR-0019.
> Ce document est un instantané. Il **dérive** dès que quelqu'un touche au repo, à la base ou au VPS
> n8n après sa rédaction. Avant d'agir sur une affirmation ci-dessous, **vérifie-la à la source** —
> la section [Comment vérifier ce document](#comment-vérifier-ce-document) donne les commandes exactes.
> C'est la doctrine du projet (`CLAUDE.md` § Méthode de travail attendue, point 2) : ce fichier n'y
> échappe pas. **Ce document lui-même en est la preuve** : sa première version affirmait une
> validation complète qui s'est révélée insuffisante en production.

---

## 0. Lis d'abord ceci

1. **`/Users/dosta/Desktop/Projets-Dev/KREDO/kredo/CLAUDE.md`** — fait autorité sur la stack, les
   conventions, l'état de la base, et la méthode de travail attendue. **Lis-le en entier avant de
   toucher au code.** Il contient des interdictions fermes (pas de shadcn, pas de tailwind.config,
   pas de HEX en dur) et des pièges déjà documentés (purge `.next/` avant de conclure à une
   régression, `tsc` qui ne voit pas les violations de frontière serveur/client).
2. **`docs/adr/ADR-0019-profondeur-de-compte-et-ingestion-cartographie.md`** — le document de
   décision qui gouverne tout ce chantier. Contexte, décisions D-1 à D-6, ce qui a été écarté et
   pourquoi, tableau de suivi des lots. **Lis-le en entier**, il est court (~170 lignes).
3. **`docs/FEATURES/sector_intelligence/taxonomie-sectorielle/REFERENTIEL-CLASSIFICATION.md`** —
   fait autorité sur les 7 axes de classification (Lot 4). §5 (spécification des paramètres), §7
   (format de sortie attendu d'une IA), §9 (gouvernance des segments), §10 (contrôles obligatoires
   avant écriture), §12 (interdits absolus). **Toute décision touchant à la classification doit
   pouvoir se justifier par un numéro de section de ce document.**
4. **`docs/JOURNAL-SESSIONS.md`** — **lis les entrées dans cet ordre** : Session 36 (le correctif du
   2026-08-11, en tête de fichier — lis-la en premier, elle corrige ce qui suit), puis Session 35
   (Lot 4, ADR-0019 — anciennement numérotée « 34 », renumérotée le 2026-08-11 suite à une collision
   avec une session parallèle sans rapport), puis Session 33 (Lot 3). Ce handoff en est le résumé
   actionnable ; le journal en est la trace complète — **et la Session 36 doit primer sur tout ce que
   la Session 35 affirme concernant le nœud `Parse & Validate LLM Output`.**

---

## 1. Contexte projet (30 secondes)

**Kredo** est un outil B2B interne pour la gestion d'un centre de profit en ESN (CRM, pipe
commercial, finance, RH, recrutement IA). Stack : Next.js 16.2.7 (App Router), React 19, Tailwind v4
(`@theme` uniquement, pas de `tailwind.config.*`), Supabase (Postgres + RLS), n8n self-hosted pour
l'IA asynchrone. **Aucune bibliothèque de composants tierce** (pas de shadcn/Radix), composants
maison sur primitives `<dialog>` natives. `CLAUDE.md` détaille tout le reste — ne le re-découvre pas
par lecture de code, il est à jour et fait foi.

## 2. Ce qu'est ADR-0019

Deux besoins convergent vers le même objet — la fiche `companies` :

1. **Créer un compte ex nihilo** doit pouvoir aller du pense-bête jusqu'à l'analyse complète du
   cockpit, par paliers activables de façon asynchrone.
2. **Les cartographies concurrentielles** (étude sectorielle, ~10 comptes/secteur) doivent devenir
   visibles dans le CRM sans y être confondues avec de vrais comptes.

La décision structurante (D-1) : un axe **`companies.depth_level`** dédié, monotone croissant,
`mapped → noted → qualified → active`, distinct de `knowledge_state` (provenance), `relation_type`
(statut commercial) et `lifecycle_status` (projection de `relation_type`, ne jamais l'écrire
directement).

## 3. État du chantier — tableau de suivi

| Lot | Contenu | État | Commit |
|---|---|---|---|
| 0 | ADR + migrations 066/067 + vue `v_crm_account_list` + loader + normalisation des actions | **Fait** | antérieur à cette session |
| 1 | Groupement de la liste comptes sur la taxonomie | Fait (commit `07b49c88`), à revalider | antérieur |
| 2 | `promoteAccountDepth` + modale « Créer et qualifier » | **Fait** | antérieur |
| 3 | Étape 0 « Socle » dans le cockpit + action recommandée unique (D-6) | **Fait** | `9e8109dd` |
| 4 | Scan affiné : 7 axes de classification ajoutés au contrat INTEL-010 | **Fait et validé en production** — le patch initial (`bd7d89c3`) avait un bug réel, corrigé par Guillaume directement sur le VPS puis réexporté (voir §5bis) | `bd7d89c3` puis correctif `abc5c635` |
| 5 | Contrat `CompetitiveMapOutput` + ingestion + bac d'arbitrage | **À faire — prochaine étape recommandée** | — |
| 6 | Sous-section `mapped` dans la liste + drawer minimal + « Convertir » | À faire | — |
| 7 | Modularisation INTEL-030 | Différé (contrat non stabilisé, hors scope) | — |

Les Lots 3 et 4 ont été livrés dans **cette session** (avant ce handoff). Le reste de ce document
documente précisément ce qui a été construit, pour que Lot 5 puisse s'appuyer dessus sans
redécouvrir l'architecture.

---

## 4. Lot 3 — Étape 0 « Socle » + action recommandée unique (commit `9e8109dd`)

### Ce qui existait déjà avant cette session (Lots 0-2)
- `companies.depth_level`/`origin`/`name_normalized` (migration `20260810110343_067_account_depth_socle.sql`).
- `src/features/account-lifecycle/domain/depth-level.ts` — domaine pur (`AccountDepthLevel`,
  `isPromotion`, `isAccountDepthLevel`).
- `src/features/account-lifecycle/actions/promote-account-depth.ts` — **le seul point d'écriture**
  de `depth_level` (D-2). Idempotent, ne démote jamais.
- `AccountScanDialog` (`src/components/accounts-contacts/scan/AccountScanDialog.tsx`) déjà branché
  dans `CompanyIdentityDrawer.tsx`, dont l'application de propositions appelle
  `promoteAccountDepth(companyId, "qualified")`.

### Ce qui a été ajouté cette session
Le cockpit intelligence (`/prospection/accounts/[companyId]`) ne lisait **aucun** de ces champs et
n'exposait aucune UI. Livré :

- **`src/lib/intelligence/intelligence-data.ts`** — `ClientIntelligenceData.company` étendu :
  `siren`, `nafCode`, `sectorId`, `depthLevel`, `origin`, `legalName`. Lus directement depuis
  `companies`, aucune nouvelle requête réseau.
- **`src/components/accounts-contacts/intelligence/intelligence-process.ts`** :
  - Nouvelle étape `"socle"` en tête de `INTELLIGENCE_PROCESS_STEPS` (avant `"connaissance"`).
  - `getProcessStepStatus("socle", data)` : `qualified`/`active` → « Disponible » (success),
    `mapped` → « Citation » (neutral), `noted` → « À qualifier » (neutral).
  - **`getRecommendedProcessStep(data): ProcessStepKey`** — implémente D-6. Première étape de la
    séquence dont le statut est `neutral` ; si tout est au moins `success`/`warning`, retombe sur
    `roadmap` (dernière étape, action de clôture).
- **`src/components/accounts-contacts/intelligence/ClientIntelligenceSocleTab.tsx`** (nouveau,
  partagé Desktop/Mobile — c'est une fiche simple, ADR-0006 dit responsive CSS, pas d'adaptive
  plein) : affiche SIREN/NAF/taille/taxonomie + badge de palier, réutilise `AccountScanDialog` tel
  quel (aucune deuxième logique de scan créée).
- **ProcessRail** (`ClientIntelligenceHomeTab.tsx`) : l'étape recommandée par
  `getRecommendedProcessStep` reste en pleine opacité avec liseré `brand-brass` + badge
  « Recommandé » ; les autres passent à `opacity-60` mais restent cliquables (D-6 : « le
  séquencement est une suggestion forte, pas un menu bloquant »).
- Sidebar (`ClientIntelligenceSidebar.tsx`) et vue mobile branchées avec le nouvel onglet.

### Fichiers touchés (Lot 3)
```
src/lib/intelligence/intelligence-data.ts
src/features/account-lifecycle/domain/depth-level.ts               (labels ajoutés)
src/components/accounts-contacts/intelligence/intelligence-process.ts
src/components/accounts-contacts/intelligence/intelligence-process.test.ts
src/components/accounts-contacts/intelligence/ClientIntelligenceSidebar.tsx
src/components/accounts-contacts/intelligence/ClientIntelligenceSidebar.test.ts
src/components/accounts-contacts/intelligence/ClientIntelligenceSocleTab.tsx   (nouveau)
src/components/accounts-contacts/intelligence/ClientIntelligenceDesktopView.tsx
src/components/accounts-contacts/intelligence/ClientIntelligenceMobileView.tsx
src/components/accounts-contacts/intelligence/ClientIntelligenceHomeTab.tsx
```
Aucune migration SQL dans ce lot (tout existait déjà côté base).

---

## 5. Lot 4 — 7 axes de classification (commit `bd7d89c3`, corrigé en `abc5c635`)

> ⚠️ **Lis §5bis avant de te fier à quoi que ce soit ci-dessous concernant le nœud
> `Parse & Validate LLM Output`.** Tout le reste de cette section (domaine TypeScript, migration
> SQL, UI, les 4 autres nœuds patchés) reste exact et n'a pas eu besoin de correction.

### Décision structurante — à ne jamais recréer sans relire ceci

**La classification s'applique comme un bloc atomique, jamais via `enrichment_proposals`.**

Fait vérifié à la source (lu en base avant de décider, pas supposé) : la fonction
`private.perform_proposal_apply` applique **une proposition par attribut, indépendamment des
autres**. Or le REFERENTIEL-CLASSIFICATION §10 pose quatre contrôles **bloquants et inter-champs**
(le macro doit être le parent du segment ; trois axes sont obligatoires *ensemble* ; la note dépend
de la confiance globale). Une file de propositions unitaires permettrait d'appliquer `segment_id`
sans son `sector_id` parent et violerait le contrôle 2 par construction. D'où une RPC dédiée.

**Corollaire pour Lot 5+** : si un futur lot est tenté d'ajouter un 8ᵉ axe (ou de modifier un des 7),
ça se passe dans `apply_account_classification()` (migration SQL) + le domaine TypeScript
(`account-classification.ts`), **jamais** en élargissant la whitelist de `crm_attribute_is_allowed`.

### Architecture livrée

```
┌─────────────────────────────────────────────────────────────────────┐
│ n8n intel-010-refresh (workflow — corrigé et actif sur le VPS,       │
│   fichier repo = INTEL-010 — intel-010-refresh-account-infos.json)   │
│   Validate & Route → ... → Assemble Extraction Prompt (LLM prompt)   │
│   → Parse & Validate LLM Output (valide, rejette avec warning)       │
│   → Reconcile & Prepare Writes → Prepare Callback                    │
│   Produit : ai_intelligence_results.content_json.classification      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ AccountScanDialog.tsx (client)                                       │
│   → AccountScanClassificationPanel.tsx (revue, checkboxes par axe)   │
│   → applyAccountClassification({resultId, companyId, acceptedAxes})  │
└─────────────────────────────────────────────────────────────────────┘
                              │  (Server Action — envoie l'id, jamais une valeur)
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ apply-account-classification.ts (Server Action)                      │
│   Vérifie workspace/compte/résultat, puis appelle la RPC             │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ public.apply_account_classification(p_result_id, p_accepted_axes,    │
│   p_reason) — SECURITY DEFINER, migration 068                        │
│   Relit content_json, applique les contrôles §10, écrit companies    │
└─────────────────────────────────────────────────────────────────────┘
```

### Le domaine — `src/features/account-lifecycle/domain/account-classification.ts`

Module pur, aucune dépendance Supabase. Fait autorité sur :
- `CLASSIFICATION_AXES` = `["segment", "regime_achat", "modele_eco", "moment", "tier", "vertical_client", "relation_type"]`
- `MANDATORY_CLASSIFICATION_AXES` (const tuple) = `["segment", "regime_achat", "modele_eco", "relation_type"]`
- Domaines de valeurs typés (`RegimeAchat`, `ModeleEco`, `Moment`, `ClassificationConfiance`) —
  miroir exact des `CHECK` constraints de `companies` (migration `20260809142701`).
- `validateClassificationProposal(proposal, acceptedAxes, current?)` — rejoue les contrôles §10
  vérifiables **hors base** côté client (feedback immédiat), avant l'aller-retour serveur qui reste
  seul juge. Ne vérifie PAS (impossible hors base, fait par la RPC) : existence du segment (§10.1),
  `sector_id` = parent (§10.2, garanti par construction côté RPC), doublon de compte (§10.8), le
  garde-fou relationnel §12.9.
- **`§10.3` porte sur l'état FINAL de la fiche, pas sur la sélection** : écarter un axe est licite
  si la colonne le porte déjà en base (paramètre `current: CurrentClassificationState`). Les 96
  comptes du parc sont déjà classés — un rescan ne doit pas forcer à réécrire ce qui est juste.
- `defaultAcceptedAxes(proposal)` — pré-coche les 4 axes obligatoires + les facultatifs renseignés ;
  un `moment` sans preuve n'est **jamais** pré-coché (§12.5).

16 tests dans `account-classification.test.ts` couvrent tout ça, y compris la nuance §10.3
compte-neuf-vs-compte-déjà-classé.

### La migration — `supabase/migrations/20260810204816_068_account_classification_apply.sql`

Déjà **appliquée en production** (vérifiée : `20260810204816` est bien le dernier `version` de
`supabase_migrations.schema_migrations`).

Deux fonctions :

1. **`private.classification_relation_conflict(p_company_id uuid, p_relation_type text) returns text`**
   (`STABLE`) — garde-fou §12.9. Retourne un message d'erreur (non-NULL) si `p_relation_type` vaut
   `prospect` ou `pair_partenaire` alors que le compte porte une mission `active` ou une opportunité
   `gagne`. Vérifié sur données réelles (Ascoma) avant écriture.

2. **`public.apply_account_classification(p_result_id uuid, p_accepted_axes text[], p_reason text default null) returns jsonb`**
   (`SECURITY DEFINER`) — le point d'écriture unique. Séquence :
   - `require_authenticated_user()` + `require_current_workspace()` (fonctions existantes, Lot 0
     de l'audit sécurité).
   - Relit `ai_intelligence_results.content_json -> 'classification'` pour le `result_id` donné
     (`result_type = 'account_scan'`, `status = 'succeeded'`, scopé workspace).
   - Valide chaque axe accepté contre son domaine (les mêmes valeurs que le module TS).
   - Pour `segment` : résout `sector_intelligence.slug = segmentSlug AND level='segment'`, lit
     `parent_id` comme macro. Si le segment n'existe pas → `unknown_segment` (§9, une IA ne crée
     jamais de segment). Si pas de parent → `segment_without_macro` (§10.2).
   - Pour `moment` : refuse si accepté sans `momentPreuve` (§10.6/§12.5).
   - Pour la confiance : `note_required` si `≠ haute` sans note (§10.4) ; `confidence_inconsistent`
     si `haute` avec un test en échec (§12.8).
   - §10.3 : si un axe obligatoire est écarté ET vide en base → exception bloquante.
   - §12.9 : si `relation_type` est en conflit, **retiré silencieusement de `v_accepted`** et
     rapporté dans `skippedAxes` — non bloquant pour le reste de la transaction.
   - Écrit `companies` en une seule instruction `UPDATE` (`CASE WHEN axe accepté THEN ... ELSE
     colonne_actuelle END` par colonne). **`companies.sector` (texte libre) et `lifecycle_status`
     ne sont JAMAIS dans cette liste de colonnes** (§12.3, projection par trigger).
   - Retourne `{companyId, appliedAxes, skippedAxes, segmentId, sectorId, confiance}`.

   `revoke all ... from public; grant execute ... to authenticated, service_role;`

**Dry-run effectué avant application réelle** : 5 scénarios en transaction `ROLLBACK` sur données de
prod (nominal + §12.9 sur Ascoma, segment inventé, `moment` sans preuve, confiance haute + test KO,
confiance moyenne sans note) — tous rejetés avec le bon code avant que la migration ne soit
réellement appliquée via `mcp__supabase__apply_migration`.

**Piège rencontré et déjà corrigé au moment de l'application** : le fichier local a été créé avec
le nom `20260810193000_068_...`, mais le timestamp réel enregistré par Supabase après application
était `20260810204816`. Le fichier a été **renommé pour matcher** (piège documenté 3 fois dans
`CLAUDE.md` § Nouvelle migration DB, point 6). Si tu ajoutes une migration 069+, attends-toi au même
décalage et vérifie `mcp__supabase__list_migrations` (ou `schema_migrations`) après application.

### Le contrat de transport — `src/lib/n8n/types.ts`

```ts
export type AccountScanClassification = AccountClassificationProposal & {
  sourceKeys: string[]
}

export type AccountScanOutput = {
  // ... champs existants inchangés ...
  classification?: AccountScanClassification | null  // absent sur les résultats antérieurs à ce lot
}

export type AccountScanTriggerInput = {
  // ... champs existants inchangés ...
  requestClassification?: boolean
  classificationReferential?: { segments: { slug: string; name: string; macroSlug: string }[] }
}
```

`AccountClassificationProposal` est importé depuis le module de domaine — **un seul type, deux
usages** (contrat n8n et validation UI), jamais deux définitions qui pourraient diverger.

### L'UI — `AccountScanClassificationPanel.tsx` + branchement dans `AccountScanDialog.tsx`

- Panneau responsive CSS (pas de `DataTable`, pas d'adaptive plein — c'est une fiche de revue,
  ADR-0006 s'applique).
- 7 checkboxes (un par axe), pré-cochées par `defaultAcceptedAxes`. Rejoue
  `validateClassificationProposal` côté client pour un feedback immédiat, avant l'appel serveur qui
  reste seul juge.
- `AccountScanDialog.tsx` charge l'état courant du compte (`currentClassification`) via une requête
  Supabase directe à l'ouverture (4 colonnes : `segment_id, regime_achat, modele_eco,
  relation_type`) — nécessaire pour que §10.3 sache distinguer un compte neuf d'un compte déjà
  classé. Ni `IdentityData` (drawer) ni `ClientIntelligenceData` (cockpit) ne portaient ces
  colonnes ; les élargir pour un panneau optionnel aurait coûté plus que cette requête ciblée.
- `loadClassificationReferential()` charge les 38 segments (`sector_intelligence` où
  `level='segment'`, avec jointure sur le `parent_id` pour le `macroSlug`) et les transmet au
  trigger. **Si cette requête échoue ou renvoie 0 segment, `requestClassification` reste `false`** —
  le scan tourne sans classification plutôt que d'en produire une non vérifiable.
- `informationResultId` (nouvel état, distinct de `informationRunId`) — la RPC de classification
  s'applique depuis l'**id du résultat** (elle y relit le contenu), là où les propositions de champs
  s'appliquent depuis le **run**.

### Le workflow n8n — 5 nœuds patchés

Patch fait par **script Python** (`n8n/workflows/intel-010-refresh.json` réécrit programmatiquement,
jamais à la main — l'échappement JSON d'un `jsCode` multiligne est le mode d'échec classique, cf.
recette `CLAUDE.md` § Nouveau workflow n8n).

1. **`Validate & Route`** — propage `requestClassification` + `classificationSegments` depuis
   `input`.
2. **`Assemble Extraction Prompt`** — ajoute les règles de classification (résumé opérationnel des
   §5.3→5.8) au system prompt, injecte `segments_disponibles` (liste fermée) dans les PREUVES.
3. **`Parse & Validate LLM Output`** — valide le bloc `classification` renvoyé par le LLM et le
   **rejette avec un warning** (pas une exception qui ferait échouer tout le scan) si : segment hors
   référentiel (§9), `moment` sans preuve datée (§12.5), confiance `haute` avec un test en échec
   (§12.8), confiance non-haute sans note (§10.4). **⚠️ C'est ce nœud qui cassait en production —
   pas la partie classification elle-même, mais le nettoyage des fences Markdown en amont, du code
   préexistant jamais touché par ce patch. Détail complet en §5bis.**
4. **`Reconcile & Prepare Writes`** — ajoute `llmClassification`/`classificationWarnings` à l'objet
   retourné. **⚠️ Ce nœud reconstruit un objet EXPLICITE (pas de `...ctx`)** : tout champ non listé
   explicitement dans son `return` disparaît silencieusement. C'est le nœud qui avait déjà perdu
   `llmUsage` en juillet 2026 (correctif documenté dans le `.SETUP.md` du même workflow) — vérifie
   systématiquement ce nœud en premier si un futur champ semble « disparaître » sans erreur.
5. **`Prepare Callback`** — expose `classification` dans le `contentJson` du callback + ajoute le
   qaFlag `classification_segment_in_referential`.

**Validation faite au moment du patch initial** (pas seulement `node --check` — insuffisant, ça
n'aurait pas vu le piège du point 4 ci-dessus, celui-là bien réel et bien évité) :
- `node --check` sur les 17 nœuds `Code` du workflow → tous valides syntaxiquement.
- **Harnais Node d'exécution réelle** (mocks `$input`/`$`/`$execution`/`$workflow`) exécutant la
  vraie chaîne `Validate & Route → Assemble Extraction Prompt → Parse & Validate LLM Output →
  Reconcile & Prepare Writes → Prepare Callback`, avec :
  - Les 4 scénarios de rejet du point 3 ci-dessus, vérifiés un par un.
  - Vérification explicite que `Reconcile` propage bien `llmClassification` (ce test a réellement
    révélé et évité le piège du point 4 avant qu'il ne parte en prod — celui-là tient).
  - Cross-check du `contentJson` produit contre les 16 clés exactes du type TypeScript
    `AccountScanClassification` (aucune manquante, aucune en trop).
  - Rétrocompatibilité : un scan sans `requestClassification` produit `classification: null`.

**⚠️ Cette validation n'a PAS vu le bug qui a cassé en production** (point 3, nœud
`Parse & Validate LLM Output`) — et ce n'est pas un hasard, c'est un défaut structurel du harnais.
Voir §5bis pour l'explication complète et la leçon à en tirer avant tout futur patch similaire. Le
harnais tel que décrit ci-dessus n'est donc **pas suffisant** en l'état pour garantir qu'un patch de
nœud n8n qui parse une sortie LLM fonctionnera réellement en production.

### Fichiers touchés (Lot 4, état après correctif)
```
src/features/account-lifecycle/domain/account-classification.ts        (nouveau)
src/features/account-lifecycle/domain/account-classification.test.ts   (nouveau, 16 tests)
src/features/account-lifecycle/actions/apply-account-classification.ts (nouveau, Server Action)
src/components/accounts-contacts/scan/AccountScanClassificationPanel.tsx (nouveau)
src/components/accounts-contacts/scan/AccountScanDialog.tsx            (modifié)
src/components/accounts-contacts/scan/account-scan-utils.ts            (modifié — buildAccountScanInput)
src/lib/n8n/types.ts                                                   (modifié)
src/types/database.generated.ts                                        (régénéré — npm run db:types)
supabase/migrations/20260810204816_068_account_classification_apply.sql (nouveau, appliqué en prod)
n8n/workflows/INTEL-010 — intel-010-refresh-account-infos.json         (renommé depuis intel-010-refresh.json,
                                                                          contenu corrigé par Guillaume sur le VPS)
```
`n8n/workflows/intel-010-refresh.SETUP.md` a été **supprimé** (par Guillaume, sans remplacement) —
il n'y a plus de documentation `.SETUP.md` dédiée à ce workflow dans le repo. La Session 36 du
journal en tient lieu pour le correctif ; personne n'a recréé de `.SETUP.md` général depuis.

---

## 5bis. ⚠️ Post-mortem — pourquoi le patch initial ne fonctionnait pas en production

**Ne saute pas cette section.** Elle documente un vrai échec de validation de ma part (Claude, Lot 4
initial) et la leçon à en tirer avant tout futur patch de nœud n8n qui parse une sortie LLM.

### Le bug

Diff exact entre mon commit (`bd7d89c3`) et le fichier aujourd'hui en repo (`abc5c635`, réexporté du
VPS après correctif de Guillaume) — **un seul nœud sur les 5 patchés diverge**,
`Parse & Validate LLM Output`, et le code fautif est **préexistant, jamais écrit ni modifié par moi**
dans ce lot :

```js
// AVANT (cassait en prod) — code préexistant au Lot 4, non touché par mon patch :
const clean = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
parsed = JSON.parse(clean);
// catch : throw new Error('Réponse LLM non-JSON : ' + content.slice(0, 200))  — pas de e.message

// APRÈS (fix de Guillaume, en prod aujourd'hui) :
let clean = String(content || '').trim();
if (clean.startsWith('```json')) clean = clean.slice(7);
else if (clean.startsWith('```')) clean = clean.slice(3);
if (clean.endsWith('```')) clean = clean.slice(0, -3);
clean = clean.trim();
parsed = JSON.parse(clean);
// catch : throw new Error(`Réponse LLM non-JSON : ${e.message} | extrait=...`)  — diagnosticable
```

Le prompt allongé par les instructions de classification (§10 du référentiel, bloc JSON `moment`/
`tier`/`vertical_client`/etc. en plus dans le format de sortie demandé) a visiblement fait sortir
Claude d'un format que l'ancien remplacement regex global gérait mal en pratique. Le fix retire
aussi le contrôle strict `schema_version !== 1` (entièrement absent du code corrigé) — signe que ce
champ n'était plus émis de façon fiable une fois le schéma de sortie alourdi. **Sans le `e.message`
dans le message d'erreur d'origine**, il n'y avait que les 200 premiers caractères bruts pour
diagnostiquer — le fix ajoute la vraie raison du `JSON.parse` en échec, ce qui a très probablement
été la clé du diagnostic.

### Pourquoi ma validation ne l'a pas vu — le vrai défaut, pas une excuse

Le harnais Node d'exécution réelle (§5, « Validation faite ») exécutait bien la vraie chaîne de
nœuds. Mais son générateur de réponse LLM fictive produisait le contenu via `JSON.stringify({...})`
**directement**, sans jamais l'envelopper de fences Markdown, de prose parasite, ou d'espaces
superflus :

```js
const llmReply = (classification) => ({
  content: [{ type: "text", text: JSON.stringify({ schema_version: 1, ... }) }],
})
// JSON.stringify pur — ne peut STRUCTURELLEMENT PAS emprunter le chemin de nettoyage
// des fences, quel que soit le nombre de scénarios joués dessus.
```

Le harnais testait donc exclusivement la logique de VALIDATION du contenu (segments, contrôles §10),
jamais la robustesse du NETTOYAGE en amont — la portion de code qui a réellement cassé en
production. **Un test qui ne peut structurellement pas emprunter le chemin de code fautif ne le
valide pas, même vert à 100 %.** C'est le défaut méthodologique à retenir, pas « pas assez de
tests » — le nombre de scénarios était correct, leur *forme* ne l'était pas.

### Leçon pour tout futur patch de nœud `Code` n8n qui parse une sortie LLM

Les fixtures de test doivent inclure au minimum :
1. Un cas avec fences Markdown (```` ```json ... ``` ````) autour du JSON.
2. Un cas avec de la prose avant/après le JSON (le LLM ignore parfois l'instruction « JSON
   uniquement »).
3. Un cas avec un champ attendu absent de la réponse.

Ne jamais se contenter de `JSON.stringify(fixture)` comme seule source de contenu simulé — ça prouve
que la logique aval fonctionne sur une entrée déjà propre, jamais que le nettoyage en amont
transforme correctement une sortie réelle de LLM en cette entrée propre.

### Ce qui reste exact malgré ce bug

Tout le reste du Lot 4 n'a nécessité aucune correction : le domaine TypeScript
(`account-classification.ts`, 16 tests), la migration SQL (`apply_account_classification`, dry-run
+ 5 scénarios réels avant application), l'UI de revue (`AccountScanClassificationPanel.tsx`), et les
4 autres nœuds patchés (`Validate & Route`, `Assemble Extraction Prompt`,
`Reconcile & Prepare Writes`, `Prepare Callback`) sont identiques entre mon commit et la version qui
tourne en production — vérifié par diff, pas supposé.

### Point encore ouvert, sans lien avec ce bug

Le fichier committé par Guillaume compte **un nœud de moins** (`Resolve Source Ids`, un `httpRequest`
préexistant, sans rapport avec la classification) que ma version. Non expliqué, non bloquant. À
confirmer si l'occasion se présente — ne pas essayer de le « réparer » unilatéralement, ça a pu être
une simplification volontaire faite directement sur le canvas n8n.

---

## 6. Prochaine étape recommandée — Lot 5 : ingestion des cartographies concurrentielles

### Ce que dit l'ADR (D-5, D-3, D-4)

```
resolved existant  → rattachement de l'analyse, aucune création
ambiguous          → bac d'arbitrage
not_found          → création `mapped` + faits sourcés
```

- **D-3** : un compte `mapped` n'entre pas dans les stats du header, n'apparaît pas dans les
  combobox d'opportunité/mission, ne peut pas porter de contact. C'est la garantie que ~530 comptes
  potentiels (53 segments × ~10 concurrents) ne noient pas les 96 comptes réels. **Règle à appliquer
  à chaque nouveau consommateur de `companies`** — un `mapped` oublié dans une combobox et
  l'invariant tombe (avertissement explicite de l'ADR, § Conséquences négatives).
- **D-4** : les chiffres de cartographie (CA, effectif) sont « provisoires, non audités » dans les
  livrables — ils vont dans `account_facts` avec provenance et `intelligence_sources`, **jamais**
  dans les colonnes canoniques de `companies` avant conversion. L'analyse (catégorie, positionnement,
  forces, vulnérabilité, angle d'entrée, appétence /35) va dans `competitive_map_entries`, qui
  **ne porte délibérément aucun chiffre d'affaires ni effectif**.

### Ce qui existe déjà et qu'il faut réutiliser (ne pas redévelopper)

1. **Le mécanisme de résolution d'entité `AccountScanResolution`** (INTEL-010, déjà utilisé par le
   scan Lot 1) — types dans `src/lib/n8n/types.ts` : `AccountScanResolutionStatus`
   (`resolved|ambiguous|not_found`), `AccountScanResolutionCandidate`, `AccountScanResolution`.
   L'ADR dit explicitement : « Le mécanisme de résolution existe déjà (`AccountScanResolution`,
   INTEL-010) et est réutilisé plutôt que réinventé. »
2. **Deux protections déjà en base** (migration 067) :
   - `companies_siren_unique_idx` — unicité dure `(workspace_id, siren)` où `siren is not null`.
   - `companies.name_normalized` — colonne **générée** (minuscules, sans accent, ponctuation
     réduite), indexée (`companies_name_normalized_idx`), pour le rapprochement flou. C'est
     précisément ce qui aurait évité le doublon « Thalès Alénia Space » / « Thales Alenia Space »
     qu'une cartographie Spatial aurait pu produire.
3. **La table `competitive_map_entries`** existe déjà (migration 067) — colonnes : `company_id`,
   `sector_id`, `segment_id`, `is_benchmark_account`, `category` (`leader|challenger|mid_market|
   outsider_emergent|outsider_niche`), `positioning`, `forces`, `vulnerabilite`, `angle_entree`,
   `empreinte_metier` (1-5), `maturite_numerique` (1-5), `appetence_score` (0-35),
   `appetence_provisoire` (bool, doit rester visible tant que l'accessibilité n'est pas auditée),
   `confiance`, `source_document_id`, `study_snapshot_date`. `UNIQUE(company_id, sector_id,
   study_snapshot_date)` — une nouvelle passe crée une nouvelle ligne, n'écrase pas la précédente.
   RLS déjà posée (`workspace_isolation`).
4. **`companies.depth_level='mapped'` / `origin='competitive_map'`** — le domaine
   `src/features/account-lifecycle/domain/depth-level.ts` accepte déjà ces valeurs (distinct du
   domaine de classification du Lot 4). Rien à ajouter côté domaine pour ça.

### Ce qui manque et qu'il faut construire

- Le **contrat `CompetitiveMapOutput`** n'existe pas encore (mentionné dans le tableau de suivi de
  l'ADR comme le livrable du lot). À définir en miroir du format de sortie du skill sectoriel
  (`kredo-sector-intelligence`) qui produit ces cartographies — regarde
  `docs/FEATURES/sector_intelligence/` pour la forme actuelle du livrable Markdown à convertir.
- Le mécanisme d'ingestion lui-même : **l'ADR écarte explicitement un workflow n8n dès ce lot**
  (§ Ce qui a été écarté : « les cartographies sont produites à la main par le skill sectoriel, et 11
  workflows patchés attendent déjà d'être réimportés sur le VPS. Un import JSON manuel dans le bac
  d'arbitrage couvre le besoin réel sans allonger cette file. »). **Ne propose pas de workflow n8n
  pour ce lot** sauf si Guillaume le demande explicitement — ce serait revenir sur une décision déjà
  prise et documentée.
- Le **bac d'arbitrage** UI pour les cas `ambiguous`.

---

## 7. Après Lot 5 — Lot 6 (pour mémoire, pas la priorité immédiate)

Sous-section `mapped` dans la liste comptes + drawer minimal + bouton « Convertir ». Le bouton
« Convertir » doit appeler **la même Server Action** que les deux autres entrées déjà câblées (D-2 —
« une seule transition, trois portes d'entrée ») :
1. ✅ Déjà câblé : case « créer cockpit intelligence » à la création → `promoteAccountDepth`.
2. ✅ Déjà câblé : bouton « Créer et qualifier » du drawer (application du scan) → `promoteAccountDepth(id, "qualified")`.
3. ⬜ À câbler (Lot 6) : bouton « Convertir » sur un compte `mapped` → même `promoteAccountDepth`.

Ne construis **jamais** un parcours « convertir » distinct — l'ADR est explicite : « Construire
"convertir" comme un parcours distinct produirait deux vérités à maintenir. »

---

## 8. Comment vérifier ce document

Ce document affirme des faits datés. Avant d'agir dessus, reproduis ces vérifications :

```bash
# État git réel — doit montrer abc5c635 (ou plus récent) dans les 5 derniers commits de main
git log --oneline -5
git status --short   # attends-toi à voir des fichiers non commités sans rapport avec ADR-0019
                      # (travail concurrent en cours, cf. bandeau en tête de ce document)

# Suite de validation complète — doit être verte
npm run typecheck && npm test && npm run check:server-boundary
```

```sql
-- Via MCP Supabase (execute_sql) — doit montrer 20260810204816 en tête
select version from supabase_migrations.schema_migrations order by version desc limit 3;

-- La RPC doit exister
select proname from pg_proc where proname = 'apply_account_classification';
```

```bash
# Le fichier qui fait foi porte le nom d'export n8n, pas "intel-010-refresh.json" :
ls "n8n/workflows/INTEL-010 — intel-010-refresh-account-infos.json"

# Vérifie que le fix des fences Markdown (§5bis) est bien présent dans le fichier committé —
# s'il manque "clean.startsWith('\`\`\`json')", quelqu'un a réintroduit l'ancien code cassé :
grep -c "clean.startsWith" "n8n/workflows/INTEL-010 — intel-010-refresh-account-infos.json"
```

```bash
# Dérive n8n — RAPPEL : ce script ne voit que des compteurs de nœuds, jamais leur contenu.
# Il n'aurait pas non plus vu le bug documenté en §5bis. Ne t'y fie pas seul.
npm run n8n:status
```

Si l'un de ces contrôles diverge de ce que ce document affirme, **fais confiance au contrôle, pas au
document** — c'est la doctrine `CLAUDE.md` § Méthode de travail, point 2 : « Vérifier à la source,
pas dans ce document. »

---

## 9. Boucle de validation à respecter pour tout nouveau lot

Dans cet ordre, sans en sauter (`CLAUDE.md` § Commandes) :

```bash
npm run typecheck              # tsc --noEmit — purger .next/ d'abord si TS6200/TS2300 apparaissent
npm test                       # vitest run
npm run check:server-boundary  # invariant server-only
npm run lint                   # sur les fichiers touchés uniquement
npm run build                  # LA seule vraie vérification — Turbopack tolère en silence
                                # ce que build:webpack révèle sur la frontière serveur/client
```

Pour toute migration SQL : dry-run en transaction `ROLLBACK` sur les cas réels **avant**
`apply_migration`, comme fait pour la migration 068 (§5 ci-dessus). Après application, vérifie le
timestamp réel via `list_migrations`/`schema_migrations` et **renomme le fichier local** si besoin —
c'est un piège rencontré 3 fois d'après `CLAUDE.md`, et une 4ᵉ fois dans cette session.

Pour tout patch de workflow n8n : script Python (jamais d'édition manuelle du JSON),
`node --check` sur tous les nœuds Code touchés, **puis** un harnais d'exécution réelle si le patch
touche à la propagation de données entre nœuds (pas seulement à la syntaxe d'un seul nœud) — le piège
du point 4 (§5.3) n'aurait été vu par aucun `node --check`.

---

## 10. Environnement

- **Supabase** : projet `jvzgmhvwirsbdkjpmvla`, `https://jvzgmhvwirsbdkjpmvla.supabase.co`. 149
  migrations en prod à la date de rédaction.
- **Vercel** : projet `kredo` (org `guillaume-kasanins-projects`), alias production
  `https://kredo-green.vercel.app`. Déploiement production : par défaut confirmation explicite
  requise avant `vercel --prod` (blast radius large, affecte le site live) — sauf instruction
  contraire explicite de Guillaume dans le tour de conversation en cours (« déploie direct », déjà
  vu dans ce chantier). Ne pas généraliser une autorisation ponctuelle à un tour suivant.
- **n8n** : VPS self-hosted, workflows versionnés en JSON dans `n8n/workflows/`, import/activation
  **manuels par Guillaume** — le MCP n8n est bloqué en session agent. §5bis documente un cas concret
  où ce réimport manuel a aussi servi à corriger un bug que la validation automatisée n'avait pas vu
  : ne considère jamais un patch de workflow n8n comme définitivement validé avant confirmation
  qu'il tourne correctement en production, même après un harnais d'exécution réelle complet.
- **Git** : branche `main`, pas de branches de feature dans ce chantier — chaque lot est un commit
  direct sur `main` après validation complète, poussé puis déployé sur confirmation.
