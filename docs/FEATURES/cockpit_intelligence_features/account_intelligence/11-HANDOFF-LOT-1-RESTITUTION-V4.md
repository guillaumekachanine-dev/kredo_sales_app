# 11 — Handoff : Lot 1 (restitution V4) livré, reprise sur la structuration répétable

> **Statut** : ✅ **Lot 1 livré** — le renderer V4 existe, Desktop et Mobile, testé sur les deux
> artefacts V4 courants de production (SOS Oxygène `nominal`, Tournaire `internal_only`).
> QA visuelle : **Guillaume** (non faite par l'agent, conformément à `CLAUDE.md`).
> **Créé le** : 2026-09-11. **Remplace `10` comme point de reprise courant.**
> **Autorité normative** : corpus `00`→`09`, inchangé. Ce document est un point de reprise.

---

## 1. Ce qui a été livré

| Livrable (`08` §7 / `06` §5) | Où | Remarque |
|---|---|---|
| Rendu éditorial des `narrative[]` | `account-knowledge-v4/AccountKnowledgeV4Desktop.tsx` · `…Mobile.tsx` | Primitives FOLIO réutilisées (`FolioStudySummary`, `FolioStudySection`, `FolioNarrativeBlock`, `FolioSourceMarker`) — aucune bibliothèque de composants nouvelle |
| Badges `Établi · Déclaré · Déduit · Hypothèse` | `AccountKnowledgeV4Parts.tsx` → `QualificationBadge` | Un par statement ; le libellé porte l'information, la couleur la redouble ; l'hypothèse a une bordure en tirets |
| **Bandeau d'ancrage** | `AnchoringBanner` + `buildAccountKnowledgeV4Banner()` | Lu via `resolveAccountKnowledgeAnchoring()`, jamais `content.anchoring` en direct. `internal_only` ouvre sur la phrase exacte de `04` §8 |
| Disclosure `Sources` par statement | `StatementSourcesDisclosure` | Document, type, domaine, date de consultation, **date de publication et extrait** quand la source est une ligne `intelligence_sources` (INTEL-030) ; self-contained pour le canal externe |
| `knowledge_gaps` de section | `KnowledgeGapsBlock` | Toujours visibles. Une section sans récit ni statement mais avec une lacune **reste affichée** (cas « Implications pour KREDO » de SOS Oxygène) |
| Lecteur « Rapport complet » | `AccountKnowledgeV4ReportReader.tsx` | Voir §2.1 |
| Bouton **Vérifier** désactivé | `VerifyButton`, dans la disclosure de chaque statement | Place fixée, capacité au Lot 5 |
| *(hors liste, contrat `04` §4)* Modes Strict / Équilibré / Exploratoire | `EpistemicModeSelector` | Défaut **Équilibré** ⇒ les hypothèses sont masquées par défaut, **et le masquage est toujours annoncé** (« N affirmations masquées en mode équilibré ») |

**Toute la logique est dans un module pur testé** : `src/lib/intelligence/account-knowledge-v4-view.ts`
(24 tests, `account-knowledge-v4-view.test.ts`). Les composants ne font que du rendu.

**Branchements** : `ClientIntelligenceCompanyTab` (Desktop) et `ClientIntelligenceMobileView`
(Mobile) prennent la branche V4 quand `data.accountKnowledgeV4` est courant. Adaptive plein
(ADR-0006) déjà en place via `ClientIntelligenceView` — aucun composant chargé puis masqué.

**Data** : `intelligence-data.ts` expose `accountKnowledgeV4SourceEvidence` (extrait +
`published_at` des sources V4 qui sont des `intelligence_sources.id`), **dans la requête
`intelligence_sources` déjà existante** — zéro aller-retour supplémentaire. **Aucune migration,
aucun workflow touché.**

**Corrections annexes, même défaut que la revue Lot 4 sur V3** :
- `AccountKnowledgeUpdateControls` recevait `null` quand V4 était courant → plus de date ni de
  couverture. Il accepte désormais tout `AccountKnowledgeState` ; la couverture V4 est son
  ancrage (« 20/24 affirmations ancrées sur une source externe (83 %) »).
- `getProcessStepStatus("connaissance")` affichait **« À compléter »** avec un V4 courant. Il
  affiche « Disponible » pour un V4 `nominal` et **« Non ancrée »** (warning) pour `degraded` /
  `internal_only` — l'axiome A2 remonte jusqu'à la frise.
- 4 `as any` préexistants retirés de `ClientIntelligenceCompanyTab` (la discrimination par
  `version` suffit).

---

## 2. Décisions prises pendant le lot

### 2.1 — `content_text` n'a pas besoin d'être peuplé pour V4 (réponse à `10` §8.4)

Vérifié dans le code du nœud `V4 Prepare Callback` d'INTEL-030 et sur le run `e8dd6f22` :
`content_text` = `"# Connaissance entreprise — X"` + la **concaténation des `narrative[]`**, sans
les titres de section. C'est strictement dérivable de `content_json`.

Le lecteur « Rapport complet » repart donc de `content_json` : même texte, **titres de section
en plus**, lacunes et bibliographie numérotée, **rendu identique quel que soit le producteur**.
C'est une visualisation du même artefact (`02` §4), pas une seconde génération. Conséquences :
`content_text` n'est pas chargé par la page (pas de 13 Ko de plus par rendu), et le canal externe
n'a pas à le produire. **Ne pas ajouter de génération de `content_text` à l'import.**

### 2.2 — Numérotation globale des sources

`[n]` = position dans `sources[]`, identique dans les statements, la liste de section et le
lecteur. Une référence citée mais absente de `sources[]` est affichée (« Référence non
résolue ») et numérotée après, plutôt qu'ignorée ou fatale.

### 2.3 — INV-2 visible, pas seulement appliqué

Un agrégat `internal:*` cité par un statement reste affiché — le cacher mentirait sur ce que
l'artefact cite — mais porte une mise en garde en rouge : *« Agrégat de contexte KREDO — ne
désigne aucune ligne précise, n'est pas une preuve. »* ; `folio_legacy` : *« Étude historique —
indice de recherche, pas une preuve. »* Un `established`/`declared` sans aucune source externe
(artefacts antérieurs au Lot 0) affiche *« Aucune source externe — à ne pas tenir pour
acquis »*.

### 2.4 — Un `nominal` majoritairement non ancré alerte

`research_status: nominal` avec `anchoring_ratio < 0,5` passe le bandeau en ton d'alerte : des
documents ont été lus, mais la majorité des affirmations ne s'y adosse pas.

---

## 3. Preuve — les deux artefacts V4 courants de production

Chaîne réelle de la page (`deriveAccountKnowledgeFields` → `buildAccountKnowledgeV4View`), sur
`ai_intelligence_results` en lecture seule, le 11/09/2026 :

| | SOS Oxygène `ea552448…` | Tournaire `e8dd6f22…` |
|---|---|---|
| Producteur | Recherche externe approfondie, importée | Moteur KREDO |
| Illisibles | 0 | 0 |
| Bandeau | **`nominal`** — 15 documents · 20/24 ancrées (83 %) | **`internal_only`** — 1 document · 4/27 ancrées (15 %) |
| Sections rendues | 8 (dont « Implications pour KREDO » portée par sa lacune) | 8 |
| Strict / Équilibré / Exploratoire | 16 / 20 / 24 | 3 / 25 / 27 |
| Bibliographie | 15 externes | 5 agrégats marqués + 1 registre |

**Test d'acceptation `10` §7** : `/prospection/accounts/b8ad688f-1597-40b5-9c1d-d7ae7fb6808e` →
onglet Connaissance → le rapport importé s'affiche. **À faire valider visuellement par
Guillaume**, Desktop et Mobile.

Validation : `typecheck` ✅ · `test` ✅ 3 178 · `check:server-boundary` ✅ · `lint` (fichiers
touchés) ✅ · `build` ✅. Pas de `test:n8n` : aucun fichier `n8n/workflows/` touché.

---

## 4. Ce qui n'est PAS fait (volontairement)

- **Conflit de valeurs** (`04` §5) — le schéma V4 ne le porte pas ; il vit dans `account_facts`
  (`cardinality = 'multi'`), restitué par le Socle. Hors renderer.
- **Vérification** — bouton désactivé. Lot 5, qui commence par faire tourner INTEL-034 une fois.
- **Mode de lecture persistant** — le mode revient à « Équilibré » à chaque ouverture. C'est le
  défaut du contrat ; une préférence utilisateur (`profiles.ui_prefs`) viendra si le besoin est
  constaté, pas avant.
- **Onglets Secteur / Enjeux** — non touchés. Contrôle `02` §5 fait : ils lisent toujours leur
  propriétaire canonique (`sectorSnapshot`, `account_issues`), pas le JSON d'analyse.

---

## 5. Prochain chantier — inchangé depuis `10` §8

1. **§8.1 — Structuration répétable** du rapport Deep Research → JSON V4 (le vrai chantier
   restant : la conversion a été faite à la main deux fois). Le renderer donne désormais un
   retour visuel immédiat sur chaque artefact importé via `(dev)/account-knowledge-import`.
2. **§8.2 — Sort d'INTEL-035 / génération V4 d'INTEL-030** après 2-3 comptes de plus.
3. **§8.3 — Jeu de comptes de référence** (`07` §3).
4. **§8.4 — `trigger_source: external_llm_import`** dédié (le point `content_text` est tranché,
   §2.1 ci-dessus).

---

## 6. Fichiers

```
src/lib/intelligence/account-knowledge-v4-view.ts          ← logique de restitution (pure)
src/lib/intelligence/account-knowledge-v4-view.test.ts     ← 24 tests, fixtures de prod
src/components/accounts-contacts/intelligence/account-knowledge-v4/
  AccountKnowledgeV4Parts.tsx         ← badge, bandeau, modes, sources, lacunes, Vérifier
  AccountKnowledgeV4Desktop.tsx       ← vue Desktop
  AccountKnowledgeV4Mobile.tsx        ← vue Mobile (surface claire sous thème cockpit cobalt)
  AccountKnowledgeV4ReportReader.tsx  ← lecteur « Rapport complet » (AppDialog)
```
