# Handoff L4 — `SectorKnowledgeReadModel` + rebranchement BI (pour Gemini)

**Tâche** : corriger le défaut réel que L3 a mis en évidence — **Business Intelligence ne voit
pas la Master Study**, pour deux raisons distinctes, cumulatives, toutes deux dans ce lot :

1. `get-business-intelligence-snapshot.ts` lit `sector_intelligence` **en table brute**, jamais
   les vues résolues (`v_sector_knowledge_resolved`/`v_sector_knowledge_items`) — aucune
   résolution segment/macro, aucun verrou, aucune provenance n'atteint jamais BI.
2. Les comptes sont groupés par secteur en BI sur `company.sector_id` (la **projection macro**),
   jamais sur `company.segment_id` (le niveau réel de classification) — un compte se retrouve
   agrégé avec 3 à 10 autres comptes d'un macro entier au lieu d'être rattaché à son segment
   propre. Signalé depuis le Lot 0 sectoriel (`docs/FEATURES/sector_intelligence/`), jamais
   corrigé, explicitement délégué à L4 par l'ADR (§14 point 4).

**Ce lot livre** : un nouveau read model `SectorKnowledgeReadModel`, le démontage du chargement
global de BI, la correction du groupement macro→segment, et le repointage des deux presenters qui
en dépendent (`build-sector-playbook-model.ts`, `SectorStudiesModal.tsx` reste inchangé si son
contrat d'entrée est préservé).

**Ce lot NE fait PAS** : `AccountSectorPerspective` ni le redesign Cockpit > Secteur (**L5**),
extension `intelligence_source_links` (hors V1), correction de l'onglet **Environnement
concurrentiel** de BI (C1-C6, source E5/`account_facts`, non touché par ce lot — vérifier
seulement qu'il continue de fonctionner après le rebranchement).

**Avant de commencer, lire dans l'ordre** :
1. Ce fichier, en entier.
2. `docs/adr/ADR-0021-master-study-ingestion-projections-distribution.md` §4.1 (le contrat du
   read model), §4.3-4.4 (`MasterStudyReader` et le playbook, à repointer pas à réécrire), §8.1-8.2
   (ce que chaque destination consomme), §12.3 (invariants read model), §14 point 4 (le bug de
   groupement, déjà nommé dans l'ADR).
3. `docs/FEATURES/master-study/HANDOFF-L0-L1-ADR-0021.md` §4.7 — le défaut trouvé sur le pilote
   (status jamais promu) et sa correction, pour comprendre pourquoi seuls 2 segments sur 38 sont
   `active` aujourd'hui et ce que ça implique pour la recette de ce lot.
4. `src/lib/intelligence/sector-snapshot-data.ts` — **pas à réutiliser tel quel** (il sert le
   Cockpit compte-centric, hors périmètre ici), mais c'est le seul endroit du repo qui lit déjà
   correctement les deux vues résolues pour un segment donné. Copier le **patron de requête**, pas
   le fichier.
5. `supabase/tests/069_sector_knowledge_resolution.assertions.sql` — les invariants segment/macro
   à ne jamais violer côté lecture.

---

## 1. État vérifié en base avant ce lot — pour calibrer la recette, pas à re-découvrir

Vérifié par requête directe le 2026-08-20 :

| Fait | Valeur |
|---|---|
| Comptes total | 96 |
| Comptes avec `segment_id` renseigné | 96/96 — aucun NULL |
| Segments distincts portant au moins un compte | 38/38 |
| Macros distincts portant au moins un compte (regroupement actuel, bugué) | 15 |
| Segments `status = 'active'` | **2** : `seg-parfumerie-compositions-b2b` (10 comptes — le pilote, réellement ingéré via Master Study, `source_run_id` renseigné) et `nutraceutique-sante-naturelle` (2 comptes — antérieur à ce chantier, provenance non vérifiée ici, **ne pas supposer qu'il vient d'un run Master Study** : `source_run_id` probablement `NULL`, à vérifier avant de s'appuyer dessus) |
| Segments `status = 'development'` | 35 |
| Segments `status = 'watch'` | 1 (`seg-a-qualifier`) |

**Ce que la recette doit donc montrer après ce lot** : BI liste jusqu'à 38 secteurs distincts (pas
15 macros), le segment pilote affiche un contenu réellement riche (playbook, pain points,
calendrier — cf. §5 du prompt L3 pour les compteurs exacts), et aucun compte n'est plus regroupé
avec des comptes d'un autre segment du même macro.

---

## 2. Le read model — `SectorKnowledgeReadModel`

**Emplacement** : `src/features/master-study/data/get-sector-knowledge-read-model.ts` — ce domaine
possède déjà l'écriture (L2/L3), il possède maintenant la lecture. `import "server-only"`.

**Contrat, deux fonctions, pas une seule** (le besoin BI est double : une liste portefeuille-large
et un détail par segment — ne pas les confondre dans une seule fonction qui ferait du N+1) :

```ts
// Lecture "liste" — un appel, tous les segments demandés. Utilisée par le chargement BI
// pour peupler `sectors`/`windows`, jamais un aller-retour par segment.
export async function getSectorKnowledgeReadModels(
  segmentIds: string[],
): Promise<SectorKnowledgeReadModel[]>

// Lecture "détail" — un segment. Utilisée par SectorStudiesModal / MasterStudyReader quand
// l'utilisateur ouvre une étude précise. Peut être une simple projection du résultat de la
// fonction liste avec segmentIds: [segmentId], ne pas dupliquer la requête.
export async function getSectorKnowledgeReadModel(
  segmentId: string,
): Promise<SectorKnowledgeReadModel | null>
```

**Règle non négociable, vérifiée par test (§6)** : ce fichier ne lit **jamais** `sector_intelligence`,
`sector_pain_points`, `sector_events`, `sector_news`, `sector_regulatory_items` en table brute —
uniquement `v_sector_knowledge_resolved` et `v_sector_knowledge_items`, filtrées par
`.in("segment_id", segmentIds)`.

**Forme de `SectorKnowledgeReadModel`** — reprendre les colonnes exposées par les deux vues
(`v_sector_knowledge_resolved` : `segment_id, segment_name, segment_slug, segment_status,
macro_id, macro_name, macro_slug, macro_status, description, description_level,
attractiveness_score, attractiveness_score_level, market_size_eur_bn, market_size_eur_bn_level,
market_growth_pct, market_growth_pct_level, playbook, playbook_level, practices_fit,
practices_fit_level, key_players_paca, key_players_national, has_segment_knowledge` — vérifier la
liste exacte des colonnes en base avant d'écrire le type, ne pas la deviner ; `v_sector_knowledge_items`
: `segment_id, item_kind, item_id, resolved_level, title, description, source_url, authority,
kredo_practice, commercial_angle, is_commercial_window, deadline_date, urgency, event_type,
event_date, event_status, published_at, relevance_score, is_trigger_event, frequency_count,
source_company_ids, verbatim`) plus les items groupés par `item_kind` (`event | news | pain_point
| regulatory`).

**`effectiveStatus`** : reprendre exactement le calcul déjà fait dans `sector-snapshot-data.ts`
(`playbookLevel === "segment" ? resolved.segment_status : resolved.macro_status ?? resolved.segment_status`)
— ne pas réinventer une deuxième formule. C'est ce champ, pas `segment_status` brut, qui doit
alimenter `SectorActivationSector.status` en aval.

---

## 3. Rebranchement — `get-business-intelligence-snapshot.ts`

**À retirer** (lignes 87-93 actuelles) : les 5 requêtes directes sur `sector_intelligence`,
`sector_pain_points`, `sector_events`, `sector_news`, `sector_regulatory_items`.

**À la place** :
1. Dériver la liste des `segmentId` réellement présents dans le portefeuille depuis
   `portfolioSnapshot.accounts[].segmentId` (déjà porté par `ProspectionPortfolioAccount`,
   `src/lib/prospection/portfolio-account-metrics.ts:32` — **pas** `.sectorId`, c'est exactement
   le bug de §4), dédupliquée, `null` filtrés.
2. Un seul appel `getSectorKnowledgeReadModels(segmentIds)` — jamais une boucle avec un appel par
   segment.
3. Passer le résultat à `buildSectorActivationModel` à la place de `_rawSources` (§4 pour le détail
   du changement de forme attendu par ce modèle).

**Ne pas** interroger tous les 38 segments si le portefeuille n'en couvre qu'une partie — la liste
dérivée des comptes réels est la bonne portée, pas `sector_intelligence` entière (c'est exactement
le chargement global que ce lot démonte).

---

## 4. Le bug de groupement macro — `build-sector-activation-model.ts`

**Localisation exacte** (lignes actuelles, à revérifier avant d'éditer — un autre lot a pu décaler
les numéros) : `accountsBySectorId` est construit en itérant `account.sectorId`
(`build-sector-activation-model.ts:315-320`). C'est la projection macro. Remplacer par
`account.segmentId`.

**Ce changement a une conséquence en cascade à tracer, pas à ignorer** : toutes les lectures
`sectorById.get(row.sector_id)` / `accountsBySectorId.get(row.sector_id)` /
`painPointsBySectorId.get(painPoint.sector_id)` plus loin dans le fichier (occurrences multiples,
`grep -n "sector_id" build-sector-activation-model.ts` avant de commencer) supposent aujourd'hui
que `row.sector_id` (venant des tables brutes `sector_pain_points`/`sector_events`/...) est la clé
de regroupement. Une fois la source remplacée par `SectorKnowledgeReadModel` (§2-3), ces lignes
doivent lire `segment_id` (le nom de colonne exposé par `v_sector_knowledge_items`), et
**`sectorById`** doit devenir une map indexée sur l'id de **segment**, pas de macro — sinon le
bug de groupement reviendrait par un autre chemin dans la même fonction. Écrire un test qui
échouerait avec l'ancien comportement (deux comptes de deux segments différents du même macro ne
doivent jamais se retrouver dans le même `SectorActivationSector.linkedAccountIds`) avant de
considérer ce point clos.

**`SectorActivationSector.id`** doit devenir systématiquement un id de **segment** (jamais de
macro) — vérifier qu'aucun consommateur en aval (`build-sector-playbook-model.ts`,
`SectorStudiesModal.tsx`, les filtres de BI) ne suppose l'inverse. `slug`/`name` suivent (le nom du
segment, pas celui du macro — `seg-parfumerie-compositions-b2b` / « Compositions & ingrédients
B2B », pas « Parfumerie, Arômes & Cosmétique »).

**`status`** (`SectorActivationSector.status`) doit venir de `effectiveStatus` du read model
(§2), pas de `sector.status` brut comme aujourd'hui.

---

## 5. Presenters en aval — repointer, pas réécrire

- **`build-sector-playbook-model.ts`** : consomme déjà `snapshot.sectors[i]` sous une forme proche
  de ce que le read model produira (`playbook`, `caveats`, `painPoints`, `keyPlayersPaca/National`,
  `marketSizeEurBn`, `marketGrowthPct`, `description`). Si §3-4 préservent ces noms de champs sur
  `SectorActivationSector`, ce fichier ne change quasiment pas. Vérifier chaque champ un par un
  avant de conclure qu'aucun changement n'est nécessaire — ne pas supposer.
- **`SectorStudiesModal.tsx`** : aucun changement attendu si `build-sector-playbook-model.ts`
  garde son contrat de sortie (`BusinessIntelligenceSectorProfile`). Le gate
  `profile.status !== "active"` (ligne 18 du composant) continuera de fonctionner correctement une
  fois `status` alimenté par `effectiveStatus`.
- **`MasterStudyReader`** : n'existe pas encore comme composant nommé — `SectorStudiesModal` EST
  aujourd'hui ce composant transverse au sens de l'ADR §4.3, juste pas encore renommé/déplacé. **Ne
  pas le renommer dans ce lot** sauf si le temps le permet clairement — le repointage sur le read
  model est le seul livrable requis ; un renommage est cosmétique et peut attendre L5 quand le
  Cockpit y ajoutera un point de montage (tiroir compte).

---

## 6. Test obligatoire — la garde anti-lecture-directe

Patron déjà utilisé dans le repo (`src/lib/intelligence/client-intelligence-sector.test.ts`,
`readFileSync` + `not.toContain`) : dans
`src/features/master-study/data/get-sector-knowledge-read-model.test.ts`, un test qui lit le
fichier source de `get-sector-knowledge-read-model.ts` et vérifie qu'il ne contient aucune des
chaînes `.from("sector_intelligence")`, `.from("sector_pain_points")`, `.from("sector_events")`,
`.from("sector_news")`, `.from("sector_regulatory_items")` — seulement
`.from("v_sector_knowledge_resolved")` et `.from("v_sector_knowledge_items")`.

Tests fonctionnels supplémentaires (mock Supabase, patron `sector-snapshot-data.test.ts`) :
- `getSectorKnowledgeReadModels([a, b])` fait **un seul** aller-retour réseau par vue (2 au total),
  jamais un par segment.
- Un `segmentId` sans aucune connaissance propre hérite du macro (`resolved_level` reflète
  `'macro'`), cohérent avec L0/L1.
- Un `segmentId` verrouillé (`resolution_locks`) ne renvoie jamais la valeur macro à la place —
  non-régression directe du défaut que L0 a corrigé, à ne pas réintroduire côté BI.

---

## 7. Vérification après implémentation

### 7.1 Boucle de validation standard

```bash
npm run typecheck
npm test
npm run check:server-boundary
npx eslint src/features/master-study/data/get-sector-knowledge-read-model.ts \
  src/features/business-intelligence/data/get-business-intelligence-snapshot.ts \
  src/features/business-intelligence/models/build-sector-activation-model.ts \
  src/features/business-intelligence/models/build-sector-playbook-model.ts
rm -rf .next && npm run build
```

### 7.2 Recette base — avant/après, avec les vrais chiffres de §1

Confirmer par un test ou un log temporaire (pas en production) que pour le portefeuille réel :
- Le nombre de `segmentId` distincts couverts par `getSectorKnowledgeReadModels` = nombre de
  segments distincts réellement présents dans `portfolioSnapshot.accounts` (≤ 38, jamais 15).
- `seg-parfumerie-compositions-b2b` ressort avec `status: "active"`, un `playbook` non vide, et
  ses 4 pain points / 2 items réglementaires / 7 événements (comptages du run L3, `run_id
  522cfe06-...`) — pas les items macro (les 3 exclus par L3 restent absents ici aussi, la vue fait
  déjà l'union correctement, ne pas les réintroduire par erreur de filtre).
- Deux comptes appartenant à deux segments différents du même macro (ex. deux segments BTP
  distincts, `seg-btp-constructeurs-promoteurs` et `seg-btp-materiaux`, tous deux avec des comptes
  réels d'après §1) apparaissent dans **deux** `SectorActivationSector` différents, jamais
  fusionnés.

### 7.3 Recette écran

Ouvrir BI (desktop et mobile), onglet **Étude sectorielle** : le segment pilote doit apparaître
dans les « Études opérationnelles » (pas « Secteurs en veille »), avec un contenu réellement
distinct de « Étude sectorielle en préparation ». Onglet **Calendrier réglementaire** : les 2
items segment + les items hérités du macro doivent apparaître, pas mélangés sans distinction.
Onglet **Environnement concurrentiel** : vérifier seulement qu'il n'a pas régressé (source E5,
hors périmètre de ce lot).

---

## 8. Rendu attendu

- `src/features/master-study/data/get-sector-knowledge-read-model.ts` + son test, avec la garde
  anti-lecture-directe.
- `get-business-intelligence-snapshot.ts` démonté des 5 requêtes brutes, rebranché sur le read
  model, portée limitée aux segments réellement présents dans le portefeuille.
- `build-sector-activation-model.ts` : groupement corrigé sur `segmentId`, toutes les occurrences
  en cascade tracées et corrigées (pas seulement la ligne 315-320), avec un test de non-régression
  explicite (deux segments d'un même macro ne fusionnent jamais).
- `build-sector-playbook-model.ts` et `SectorStudiesModal.tsx` : changements minimaux documentés
  champ par champ, pas une réécriture.
- Boucle de validation §7.1 entièrement verte, rapportée avec ses résultats réels.
- Recette §7.2 rapportée avec les chiffres obtenus (pas juste « ça marche »).
