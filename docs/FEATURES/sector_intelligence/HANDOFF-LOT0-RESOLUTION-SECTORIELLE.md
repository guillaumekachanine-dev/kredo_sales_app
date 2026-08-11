# Handoff — Lot 0 : résolution sectorielle héritée

> **Rédigé le 2026-08-12 par Claude (Opus 5)**, pour reprise par un agent ou un développeur.
> Ce document est un **instantané**. Il dérive dès que quelqu'un touche au repo ou à la base.
> Avant d'agir sur une affirmation, **vérifie-la à la source** — §3 donne les commandes exactes.
> C'est la doctrine du projet (`CLAUDE.md` § Méthode de travail, point 2), et ce fichier n'y échappe pas :
> sa rédaction a elle-même corrigé une conclusion fausse du rapport amont (cf. §2.3).

---

## 0. Lis d'abord ceci, dans cet ordre

1. **`CLAUDE.md`** — stack, conventions, état de la base, méthode. Interdictions fermes (pas de shadcn, pas de `tailwind.config.*`, pas de HEX en dur) et pièges documentés (purger `.next/`, `tsc` qui ne voit pas la frontière serveur/client).
2. **`docs/FEATURES/sector_intelligence/ARCHITECTURE-CONNAISSANCE-INTELLIGENCE.md`** — la colonne vertébrale du chantier. Lis au minimum §1 (état réel), §3 (nomenclature des 36 blocs), §7 (les décisions D-A à D-H) et §8 (les 9 lots). **Ce lot est le Lot 0.**
3. **`docs/adr/ADR-0019-profondeur-de-compte-et-ingestion-cartographie.md`** — court (~170 lignes). Gouverne `depth_level`, l'ingestion des cartographies et la maille « unité de décision d'achat ». Le Lot 2 du chantier en dépend directement.
4. **`docs/FEATURES/sector_intelligence/taxonomie-sectorielle/REFERENTIEL-CLASSIFICATION.md`** — fait autorité sur les 7 axes et la hiérarchie macro/segment. §9 (gouvernance des segments) et §12 (interdits) s'appliquent ici.

---

## 1. Le lot en une phrase

**Faire lire à l'application la maille `segment`, en héritant du `macro` parent quand le segment est vide — sans rien recopier en base.**

### Pourquoi maintenant, alors que l'effet à l'écran est faible

C'est un lot d'**infrastructure**, et il faut l'assumer comme tel : le jour de sa livraison, presque rien ne change visuellement, parce que le macro reste la seule source réellement remplie.

Il est néanmoins bloquant, pour une raison précise : **la méthode d'étude cible (docs `08` et `09`) produit au niveau segment.** Une étude sur « 5.1 Spatial, défense & systèmes critiques » écrite au bon niveau ne s'afficherait aujourd'hui **nulle part**. Le Lot 2 (ingestion des cartographies) livrerait des données invisibles. Ce lot est le prérequis de lecture de tous les autres.

Gain immédiat, modeste mais réel : les **19 comptes** rattachés à un macro vide cessent d'afficher un onglet muet sans explication et sont identifiés comme tels.

---

## 2. État vérifié le 12/08/2026

### 2.1 La taxonomie

| Fait | Valeur |
|---|---|
| `sector_intelligence` | 53 fiches : **15 macro** + **38 segment** |
| Comptes rattachés à un segment (`companies.segment_id`) | **98 / 98** |
| Comptes rattachés directement à un macro | **0** |
| `companies.sector_id` renseigné | **98 / 98** |
| `sector_id` pointe sur un macro | **98 / 98** |
| `sector_id` = `segment.parent_id` | **98 / 98** — 0 incohérence |
| Segments sans `parent_id` | **0** |

**La cohérence est maintenue par `public.apply_account_classification()`** (migration 068), qui écrit `segment_id` et `sector_id` dans le même `UPDATE`. C'est aujourd'hui le seul point d'écriture. Un `update` direct sur `companies` ferait diverger les deux colonnes en silence, sans qu'aucun test ne le voie.

### 2.2 Où vit la connaissance

| | Macro (15) | Segment (38) |
|---|---:|---:|
| Items réglementaires | **61** | 3 |
| Pain points | **77** | 6 |
| Événements | **47** | 5 |
| Actualités | **7** | 0 |
| Fiches avec `description` | 15/15 | **1/38** |
| Playbooks réellement remplis | **13/15** | **2/38** |

Les 36 segments en `development` portent un playbook aux **4 clés présentes et aux 4 tableaux vides** (`personas`, `objections`, `entry_points`, `roi_arguments`). Squelette de migration, pas de la connaissance : ne pas le confondre avec un playbook rempli lors des tests.

**Trois macros sont à zéro sur tout** — « Secteur public, Enseignement supérieur & Recherche » (10 comptes), « Services aux entreprises & aux personnes » (8), « Non rattaché — à qualifier » (1). **19 comptes sur 98** ne verront rien même après ce lot : c'est le Lot 3 (calendrier réglementaire) qui les traite, pas celui-ci. Ne pas essayer de compenser ici.

### 2.3 Correction d'une affirmation fausse du rapport amont

La première version de `ARCHITECTURE-CONNAISSANCE-INTELLIGENCE.md` affirmait qu'« aucune vue ne fait le pont » et qu'un compte « ne voit aucune échéance réglementaire ». **C'est faux** : la dénormalisation `companies.sector_id` fait le pont, et un compte du segment « 5.1 Spatial » voit bien les 5 items réglementaires et 6 pain points de son macro. Le document a été corrigé le 12/08.

Le vrai défaut est plus fin, et c'est lui qu'il faut traiter : **la lecture est exclusivement macro**, donc (a) trois comptes spatiaux voient la même chose que n'importe quel compte aéronautique, et (b) la maille de production future est aveugle.

---

## 3. Comment re-vérifier avant d'agir

```bash
git log --oneline -5
git status --short
npm run typecheck && npm test && npm run check:server-boundary
```

```sql
-- Cohérence sector_id / segment.parent_id — doit renvoyer 98 / 98 / 0
select
  (select count(*) from companies where segment_id is not null)                      as avec_segment,
  (select count(*) from companies c join sector_intelligence sg on sg.id = c.segment_id
     where c.sector_id = sg.parent_id)                                               as coherents,
  (select count(*) from companies c join sector_intelligence sg on sg.id = c.segment_id
     where c.sector_id is not null and c.sector_id is distinct from sg.parent_id)    as incoherents;

-- Répartition de la connaissance par niveau
select s.level,
       count(*)                                                                       as fiches,
       (select count(*) from sector_regulatory_items r
          join sector_intelligence x on x.id = r.sector_id where x.level = s.level)   as reglementaire,
       (select count(*) from sector_pain_points p
          join sector_intelligence x on x.id = p.sector_id where x.level = s.level)   as pain_points
from sector_intelligence s group by s.level;

-- Dernière migration appliquée — attendu 20260810204816 ou plus récent
select version from supabase_migrations.schema_migrations order by version desc limit 3;
```

Si un contrôle diverge de ce document, **fais confiance au contrôle**.

---

## 4. Le contrat à livrer

### 4.1 Deux vues, `security_invoker = true`

La convention du projet est explicite (migrations 060 et 067) : toute vue exposée au client porte `with (security_invoker = true)` pour que la RLS de l'appelant s'applique. Ne pas l'oublier — c'est la cause d'une fuite de workspace autrement.

**`v_sector_knowledge_resolved`** — une ligne par fiche `sector_intelligence` de niveau `segment`, avec les champs scalaires et le `playbook` résolus.

| Colonne | Règle de résolution |
|---|---|
| `segment_id`, `segment_name`, `segment_slug` | la fiche segment |
| `macro_id`, `macro_name`, `macro_slug` | `parent_id` |
| `description`, `attractiveness_score`, `market_size_eur_bn`, `market_growth_pct`, `digital_maturity`, `avg_tjm_min/max` | `coalesce(segment.x, macro.x)` |
| `playbook` | fusion **par clé** : pour chacune des clés, le tableau du segment s'il est non vide, sinon celui du macro |
| `practices_fit` | idem, fusion par clé |
| `description_level`, `playbook_level` | `'segment'` ou `'macro'` — **obligatoire**, c'est ce qui permet à l'UI de dire d'où vient l'information |
| `has_segment_knowledge` | booléen — vrai si au moins un champ vient du segment |

**`v_sector_knowledge_items`** — une ligne par item, avec sa provenance.

| Colonne | Contenu |
|---|---|
| `segment_id` | le segment pour lequel l'item est visible |
| `item_kind` | `regulatory` \| `pain_point` \| `event` \| `news` |
| `item_id`, `title`, `description`, `source_url` | l'item |
| `deadline_date`, `urgency`, `is_commercial_window`, `commercial_angle`, `kredo_practice` | spécifiques au réglementaire, `null` ailleurs |
| `event_date`, `published_at`, `frequency_count` | spécifiques aux autres familles |
| `resolved_level` | `'segment'` ou `'macro'` |

**Règle d'union, pas de substitution** : pour les *items* (réglementaire, pain points, événements, actualités), on **cumule** segment + macro. Un item de segment ne masque pas un item de macro — ce sont des faits distincts, pas des versions d'un même champ. La substitution ne s'applique qu'aux champs **scalaires** et au `playbook` de la vue `_resolved`.

### 4.2 Ce que la fusion `playbook` doit faire, précisément

```
pour chaque clé k de {personas, objections, entry_points, roi_arguments, ...}
  si segment.playbook->k est un tableau non vide  → prendre celui du segment
  sinon                                           → prendre celui du macro
```
Une clé, pas le blob entier. Les 36 segments ont les 4 clés présentes mais vides : une fusion « blob entier, segment prioritaire » écraserait les 13 playbooks macro remplis par du vide. **C'est le piège n°1 de ce lot.**

---

## 5. Les consommateurs à basculer

Quatre loaders lisent `companies.sector_id` en dur. Tous doivent passer par `segment_id` + résolution.

| Fichier | Ce qu'il fait aujourd'hui | Ce qu'il doit faire |
|---|---|---|
| `src/lib/intelligence/sector-snapshot-data.ts` | `getSectorSnapshot(sectorId)` : 5 requêtes `.eq("sector_id", sectorId)` (fiche, pain points, réglementaire, événements, **liste des comptes du secteur**) | prendre un `segmentId` et lire les deux vues. **Décision de conception à appliquer : la liste des comptes pairs passe au niveau segment** (concurrents directs), avec repli macro si le segment compte moins de 3 comptes. Aujourd'hui un compte spatial voit tous les comptes aéro comme pairs. |
| `src/lib/intelligence/intelligence-data.ts` | ligne ~1101 `company.sector_id ? getSectorSnapshot(company.sector_id, …)` ; `select` ligne ~858 ; `sectorId` exposé ligne ~1460 | passer `company.segment_id` ; exposer `segmentId` **et** `sectorId` dans le contrat (`sectorId` reste utile pour l'affichage du macro) |
| `src/lib/intelligence/account-panel-data.ts` | ~ligne 517 : lit `sector_intelligence` par `company.sector_id` pour `hasStructuredSectorPlaybook` | lire `v_sector_knowledge_resolved` par `segment_id` — sinon le drapeau « playbook structuré » restera faux pour tout segment enrichi |
| `src/features/business-intelligence/data/get-portfolio-intelligence-snapshot.ts` | ligne 45 : `select("…,sector,sector_id,…")` | ajouter `segment_id` ; le regroupement BI passe au segment, le macro devient un niveau d'agrégation |

`src/features/business-intelligence/data/get-business-intelligence-snapshot.ts` (lignes 87-97) charge les tables `sector_*` **en entier** puis regroupe en mémoire. Deux options, à trancher par mesure : soit il consomme `v_sector_knowledge_items`, soit il garde son chargement de masse et applique la résolution côté TypeScript. **Préférer la vue** : la logique de résolution ne doit exister qu'à un seul endroit.

⚠️ **Commentaire périmé à corriger au passage** : `intelligence-data.ts` ligne ~366 affirme que la majorité du parc n'a pas de `sector_id`. C'était vrai avant la migration de taxonomie ; **c'est faux depuis** (98/98). Un commentaire faux dans un module de contrat coûte une session à quelqu'un.

---

## 6. Décisions déjà prises — ne pas les rouvrir

| # | Décision | Source |
|---|---|---|
| D-B | Résolution héritée à la **lecture**, jamais par recopie de données | rapport §1.1 |
| D-C | Toute donnée porte sa portée (`macro` / `segment` / `compte`) ; interdiction d'écrire une connaissance de segment sur un macro | rapport §7.2 |
| — | **Aucune nouvelle table.** Ce lot n'ajoute que des vues | rapport §11 |
| — | `sector_id` **n'est pas supprimé** : il reste une projection, écrite par `apply_account_classification` seule. Ce lot cesse simplement de le lire | §2.1 |
| §9 réf. classification | Une IA ne crée jamais de segment. Ce lot n'écrit dans aucune fiche | REFERENTIEL-CLASSIFICATION §9 |

---

## 7. Les pièges de ce lot

1. **Fusion du `playbook` en blob** → écrase 13 playbooks macro remplis par 36 squelettes vides. Fusionner **clé par clé**, et tester explicitement le cas « segment aux 4 clés vides ».
2. **Oublier `security_invoker = true`** → la vue s'exécute avec les droits du propriétaire et traverse la RLS workspace. Convention obligatoire du projet.
3. **Substituer au lieu d'unir sur les items** → un segment portant 1 item réglementaire masquerait les 5 du macro. Union pour les items, substitution pour les scalaires.
4. **Ne pas exposer `resolved_level`** → l'UI ne peut plus dire « cette information vient du macro-secteur », et l'utilisateur croit que c'est spécifique à son segment. C'est une régression de confiance, pas un détail cosmétique.
5. **`import "server-only"`** sur tout module important le client Supabase serveur, puis `npm run check:server-boundary`. Rappel : `tsc` ne voit pas cette violation, seul `build` la révèle.
6. **Le nom du fichier de migration dérive du timestamp réel** enregistré par Supabase. Piège rencontré 4 fois dans ce projet : après `apply_migration`, vérifier `schema_migrations` et **renommer le fichier local** si nécessaire.
7. **Dry-run en transaction `ROLLBACK`** avant toute application, même pour des vues : un `create or replace view` qui change l'ordre ou le type des colonnes échoue, et il faut alors `drop … cascade` — ce qui touche les consommateurs.

---

## 8. Hors périmètre — ne pas déborder

| Sujet | Renvoi |
|---|---|
| Remplir les 36 segments vides | Lot 3 et méthode d'étude 08/09 |
| Alimenter `competitive_map_entries` (0 ligne) | Lot 2 — ADR-0019 Lot 5, contrat `CompetitiveMapOutput` |
| Identité France, SIREN | Lot 1 |
| Les 19 comptes des 3 macros vides | Lot 3 |
| Modifier `apply_account_classification` | Interdit hors ajout d'axe (handoff ADR-0019 §5) |
| Toucher au shell / à la navigation | ADR-0018, chantier distinct |
| Supprimer `companies.sector_id` | Non. Projection conservée |

---

## 9. Boucle de validation

Dans cet ordre, sans en sauter (`CLAUDE.md` § Commandes) :

```bash
npm run typecheck
npm test
npm run check:server-boundary
npm run lint
npm run build
```

Migration : dry-run `ROLLBACK` sur données réelles **avant** `apply_migration`, puis vérification du timestamp et renommage du fichier si besoin.

**Tests à ajouter** (colocalisés en `__tests__/`, Vitest) :
- fusion `playbook` : segment vide → macro conservé ; segment partiel → fusion clé par clé ; segment complet → macro ignoré ;
- union des items : segment 1 item + macro 5 items → 6 lignes, `resolved_level` correct sur chacune ;
- repli de la liste des comptes pairs quand le segment compte moins de 3 comptes ;
- un compte d'un macro vide → snapshot non nul, avec drapeau explicite.

---

## 10. Critère de sortie

Le lot est fini quand, **et seulement quand** :

1. Les deux vues existent, portent `security_invoker = true`, et sont couvertes par les tests ci-dessus.
2. Les quatre loaders lisent `segment_id` ; plus aucune lecture de `companies.sector_id` comme source de connaissance sectorielle (`grep -rn 'sector_id' src/lib/intelligence src/features/business-intelligence` ne renvoie que des projections assumées).
3. `resolved_level` / `description_level` / `playbook_level` remontent jusqu'au contrat TypeScript et sont exploitables par l'UI.
4. Sur un compte du segment « 5.1 Spatial », l'onglet Secteur affiche les 5 items réglementaires du macro **marqués comme hérités**, et la liste des pairs est celle du segment.
5. Sur un compte de « Secteur public, ESR », l'onglet affiche un état vide **explicite** (« aucune connaissance sectorielle disponible pour ce segment ni son macro-secteur »), pas un écran muet.
6. La boucle de validation est verte, `build` compris.
7. Aucune régression sur les 98 comptes : ce qui s'affichait avant s'affiche toujours.

**Ce qui n'est pas un critère de sortie** : que les segments soient remplis. Ils ne le seront pas. Ce lot construit le tuyau, pas l'eau.
