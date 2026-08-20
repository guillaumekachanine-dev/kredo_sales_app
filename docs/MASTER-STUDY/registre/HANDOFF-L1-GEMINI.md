# Handoff L1 — provenance et verrou de résolution (pour Gemini)

> ✅ **Exécuté le 2026-08-20, livré et vérifié indépendamment.** Ce fichier reste comme référence
> du prompt qui a produit L1 — utile pour calibrer un futur prompt L2. Compte-rendu de ce qui a
> réellement été livré : `docs/FEATURES/master-study/HANDOFF-L0-L1-ADR-0021.md` §2.

**Tâche** : migration additive (8 colonnes sur 6 tables) + réécriture de la vue
`v_sector_knowledge_resolved` pour distinguer *« hérité du macro »* de *« le segment a été étudié
et cette valeur n'est pas publiable »* + rejeu et extension des assertions SQL existantes + une
petite ripple TypeScript qui retire un pis-aller introduit au lot précédent.

**Avant de commencer, lire dans l'ordre** :
1. `docs/adr/ADR-0021-master-study-ingestion-projections-distribution.md` — sections **§5**
   (provenance atomique), **§6** (héritage macro/segment), **§10** (décisions normatives
   MS-9→MS-12), **§11** (plan de lots, ligne L1).
2. `docs/FEATURES/master-study/HANDOFF-L0-L1-ADR-0021.md` — ce que L0 a livré juste avant, et
   pourquoi §2.4 de ce fichier annonce que L1 doit retirer un mécanisme temporaire.
3. Ce fichier, en entier, avant d'écrire une ligne.

**Ce travail sera revérifié indépendamment après coup, directement contre la base live.** Ne pas
déclarer un point acquis sans l'avoir fait tourner réellement — un rapport qui décrit ce qui
*devrait* se passer n'est pas une livraison.

---

## 0. Ce que ce lot corrige, en une phrase

`v_sector_knowledge_resolved` résout aujourd'hui `attractiveness_score`, `market_size_eur_bn` et
`market_growth_pct` par un simple `COALESCE(segment, macro)` : si le segment vaut `NULL`, la
valeur macro s'affiche **sans que rien ne dise si c'est parce que le segment n'a jamais été
étudié, ou parce qu'il l'a été et que la valeur n'est explicitement pas publiable**. Le cas réel :
le segment pilote `seg-parfumerie-compositions-b2b` a une étude (`04-secteur.json`) qui déclare la
taille de marché **non publiée** — mais la vue, elle, remonte le chiffre macro (80 Md€, marché
mondial) comme s'il caractérisait le segment.

---

## 1. Vérifier l'état réel avant d'écrire quoi que ce soit

**Ne pas faire confiance aux exemples de timestamps de ce document** — ils datent du moment où
ce handoff a été rédigé (2026-08-20 après-midi). `CLAUDE.md` documente une dérive connue et
répétée entre le dépôt et la base (« piège rencontré 3 fois »). Avant de nommer votre fichier de
migration :

```sql
select version from supabase_migrations.schema_migrations order by version desc limit 5;
```

ou l'équivalent via l'outil `list_migrations` si vous disposez du MCP Supabase (projet
`jvzgmhvwirsbdkjpmvla`). Le timestamp de votre migration doit être **strictement supérieur** au
dernier enregistré. **Après application**, revérifiez le timestamp réellement enregistré et
renommez votre fichier local pour qu'il corresponde exactement — ne partez jamais du principe que
le timestamp que vous avez choisi est celui qui a été retenu.

Vérifiez aussi que rien n'a changé depuis la rédaction de ce handoff sur les objets suivants
(la requête doit retourner exactement ce qui est listé ici ; si ce n'est pas le cas, arrêtez-vous
et signalez l'écart plutôt que d'improviser) :

```sql
select column_name, data_type from information_schema.columns
where table_name = 'sector_intelligence'
  and column_name in ('attractiveness_score','market_size_eur_bn','market_growth_pct',
                       'source_run_id','study_snapshot_date','resolution_locks');
-- attendu : les 3 premières colonnes existent (numeric), les 3 dernières n'existent PAS encore.

select relname, reloptions from pg_class
where relname in ('v_sector_knowledge_resolved','v_sector_knowledge_items');
-- attendu : les deux portent reloptions = {security_invoker=true}

select count(*) from pg_depend
join pg_rewrite on pg_depend.objid = pg_rewrite.oid
join pg_class dv on pg_rewrite.ev_class = dv.oid
join pg_class st on pg_depend.refobjid = st.oid
where st.relname = 'v_sector_knowledge_resolved' and dv.relname <> 'v_sector_knowledge_resolved';
-- attendu : 0 — aucune vue ne dépend de v_sector_knowledge_resolved, le DROP+CREATE est sûr
```

---

## 2. Migration — fichier unique, additive

Créer `supabase/migrations/<TIMESTAMP_VÉRIFIÉ>_master_study_provenance_columns.sql`.

### 2.1 Les 8 colonnes

```sql
-- Master Study — provenance et verrou de résolution (ADR-0021 §5, §6, MS-10, MS-12).
-- Additif uniquement : aucune table créée, aucune donnée existante modifiée.

alter table public.sector_intelligence
  add column source_run_id uuid references public.ai_intelligence_runs(id) on delete set null,
  add column study_snapshot_date date,
  add column resolution_locks jsonb not null default '{}'::jsonb;

alter table public.sector_events
  add column source_run_id uuid references public.ai_intelligence_runs(id) on delete set null;

alter table public.sector_pain_points
  add column source_run_id uuid references public.ai_intelligence_runs(id) on delete set null;

alter table public.sector_regulatory_items
  add column source_run_id uuid references public.ai_intelligence_runs(id) on delete set null;

alter table public.value_chain_nodes
  add column source_run_id uuid references public.ai_intelligence_runs(id) on delete set null;

alter table public.competitive_map_entries
  add column source_run_id uuid references public.ai_intelligence_runs(id) on delete set null;

-- Index : le rollback d'un run (ADR §5.3 — « supprimer/remplacer les lignes du
-- source_run_id concerné ») filtre ces 5 tables par ce champ.
create index if not exists sector_events_source_run_id_idx on public.sector_events(source_run_id);
create index if not exists sector_pain_points_source_run_id_idx on public.sector_pain_points(source_run_id);
create index if not exists sector_regulatory_items_source_run_id_idx on public.sector_regulatory_items(source_run_id);
create index if not exists value_chain_nodes_source_run_id_idx on public.value_chain_nodes(source_run_id);
create index if not exists competitive_map_entries_source_run_id_idx on public.competitive_map_entries(source_run_id);

comment on column public.sector_intelligence.resolution_locks is
  'ADR-0021 §6 — verrou de résolution par champ scalaire. Clé = nom de colonne
   (''attractiveness_score'' | ''market_size_eur_bn'' | ''market_growth_pct''), valeur = motif
   (''explicit_unknown'' | ''not_applicable''). Une clé présente BLOQUE l''héritage macro dans
   v_sector_knowledge_resolved, même si la colonne source vaut NULL. Écrit uniquement par
   l''importeur Master Study (L2) — jamais par le client. NE JAMAIS stocker ce mécanisme dans
   `caveats` : cette colonne est résolue par substitution du blob ENTIER, y écrire efface les
   caveats du macro (même défaut que la migration 071 a corrigé pour `playbook`).';
```

**Ne pas** ajouter de `CHECK` contraignant les valeurs de `resolution_locks` (ni sur les clés, ni
sur les valeurs `explicit_unknown`/`not_applicable`). La validation de forme appartient à
l'importeur (L2), qui validera contre `docs/MASTER-STUDY/schemas/sector-knowledge.schema.json`
avant d'écrire — c'est la frontière système, pas cette colonne. Un `CHECK` ici validerait un
scénario qui n'arrive jamais tant qu'aucun écrivain n'existe (l'importeur n'est pas encore écrit),
ce qui est exactement le sur-contrôle que les conventions du projet demandent d'éviter.

### 2.2 Deux fonctions de résolution — schéma `private`

Factoriser la logique en fonctions, **au même patron que
`private.merge_sector_playbook`/`private.sector_playbook_source_level`** (migration 069) — pas de
`CASE` dupliqué trois fois dans le corps de la vue. Cela les rend testables directement en
assertion, comme le sont déjà les fonctions de fusion du playbook.

```sql
create or replace function private.sector_resolve_scalar(p_segment numeric, p_macro numeric, p_locked boolean)
returns numeric language sql immutable parallel safe set search_path = '' as $$
  select case when p_locked then null else coalesce(p_segment, p_macro) end;
$$;

comment on function private.sector_resolve_scalar(numeric, numeric, boolean) is
  'ADR-0021 §6 — résout un scalaire segment/macro. Un verrou (p_locked=true) force NULL même si
   le segment ou le macro porte une valeur : le verrou l''emporte toujours.';

create or replace function private.sector_scalar_level(p_segment numeric, p_locked boolean)
returns text language sql immutable parallel safe set search_path = '' as $$
  select case when p_locked then 'locked' when p_segment is not null then 'segment' else 'macro' end;
$$;

comment on function private.sector_scalar_level(numeric, boolean) is
  'ADR-0021 §6 — provenance d''un scalaire résolu : locked (segment étudié, non publiable),
   segment (le segment porte sa propre valeur), macro (hérité).';

grant execute on function private.sector_resolve_scalar(numeric, numeric, boolean) to authenticated, service_role;
grant execute on function private.sector_scalar_level(numeric, boolean) to authenticated, service_role;
```

### 2.3 Réécriture de la vue — `DROP` + `CREATE`, pas `CREATE OR REPLACE`

**Pourquoi pas `CREATE OR REPLACE VIEW`** : Postgres interdit d'insérer une colonne ailleurs qu'à
la fin de la liste existante avec `CREATE OR REPLACE`. La migration 069 originale utilise déjà
`drop view if exists ... ; create view ...` — suivre exactement ce patron, pas un autre.
**Vérifié en §1 : aucune vue ne dépend de celle-ci, le `DROP` est sûr.** Le `DROP` supprime aussi
les `GRANT` existants : les réémettre à la fin, sans quoi les requêtes applicatives échoueront en
« permission denied » de façon peu visible en test.

```sql
drop view if exists public.v_sector_knowledge_resolved;

create view public.v_sector_knowledge_resolved
with (security_invoker = true) as
select
  s.workspace_id,
  s.id as segment_id, s.name as segment_name, s.slug as segment_slug, s.status as segment_status,
  m.id as macro_id, m.name as macro_name, m.slug as macro_slug, m.status as macro_status,

  coalesce(nullif(btrim(s.description), ''), m.description) as description,

  private.sector_resolve_scalar(s.attractiveness_score, m.attractiveness_score,
    s.resolution_locks ? 'attractiveness_score') as attractiveness_score,
  private.sector_resolve_scalar(s.market_size_eur_bn, m.market_size_eur_bn,
    s.resolution_locks ? 'market_size_eur_bn') as market_size_eur_bn,
  private.sector_resolve_scalar(s.market_growth_pct, m.market_growth_pct,
    s.resolution_locks ? 'market_growth_pct') as market_growth_pct,

  coalesce(nullif(btrim(s.digital_maturity), ''), m.digital_maturity) as digital_maturity,
  coalesce(s.avg_tjm_min, m.avg_tjm_min) as avg_tjm_min,
  coalesce(s.avg_tjm_max, m.avg_tjm_max) as avg_tjm_max,
  case when private.jsonb_is_filled(s.key_players_paca)
       then s.key_players_paca else m.key_players_paca end as key_players_paca,
  case when private.jsonb_is_filled(s.key_players_national)
       then s.key_players_national else m.key_players_national end as key_players_national,
  case when private.jsonb_is_filled(s.caveats)
       then s.caveats else m.caveats end as caveats,
  private.merge_sector_playbook(s.playbook, m.playbook) as playbook,
  private.merge_sector_practices_fit(s.practices_fit, m.practices_fit) as practices_fit,

  case when nullif(btrim(s.description), '') is not null then 'segment' else 'macro' end as description_level,
  private.sector_playbook_source_level(s.playbook, m.playbook) as playbook_level,
  private.sector_practices_fit_source_level(s.practices_fit, m.practices_fit) as practices_fit_level,
  private.sector_scalar_level(s.attractiveness_score, s.resolution_locks ? 'attractiveness_score') as attractiveness_score_level,
  private.sector_scalar_level(s.market_size_eur_bn, s.resolution_locks ? 'market_size_eur_bn') as market_size_eur_bn_level,
  private.sector_scalar_level(s.market_growth_pct, s.resolution_locks ? 'market_growth_pct') as market_growth_pct_level,

  s.source_run_id,
  s.study_snapshot_date,

  (
    nullif(btrim(s.description), '') is not null
    or s.attractiveness_score is not null
    or s.market_size_eur_bn is not null
    or s.market_growth_pct is not null
    or nullif(btrim(s.digital_maturity), '') is not null
    or s.avg_tjm_min is not null
    or s.avg_tjm_max is not null
    or private.jsonb_is_filled(s.key_players_paca)
    or private.jsonb_is_filled(s.key_players_national)
    or private.sector_playbook_source_level(s.playbook, m.playbook) = 'segment'
    or private.sector_practices_fit_source_level(s.practices_fit, m.practices_fit) = 'segment'
    or s.resolution_locks ?| array['attractiveness_score','market_size_eur_bn','market_growth_pct']
  ) as has_segment_knowledge
from public.sector_intelligence s
left join public.sector_intelligence m on m.id = s.parent_id
where s.level = 'segment';

comment on view public.v_sector_knowledge_resolved is
  'Lot 0 (migration 069) + L1 ADR-0021 (provenance/verrou). 1 ligne par fiche sector_intelligence
   de niveau segment. Les 3 champs scalaires portent désormais un niveau à 3 valeurs
   (segment/macro/locked) : locked signifie « le segment a été étudié, la valeur n''est pas
   publiable », distinct de macro (« pas de connaissance segment »). Ne jamais confondre les
   deux dans l''UI.';

grant select on public.v_sector_knowledge_resolved to authenticated, service_role;
```

**Point d'attention non négociable** : la dernière ligne du `has_segment_knowledge` — le fait
qu'un segment étudié-mais-non-publiable (`resolution_locks` non vide) compte comme
« connaissance segment » **au même titre qu'une valeur publiée**. C'est délibéré : une étude qui
dit explicitement « non publié » a produit un fait, pas un silence. Ne pas retirer cette clause en
la jugeant redondante.

`v_sector_knowledge_items` (deuxième vue de la même migration 069) **n'est pas concernée par ce
lot** — ne pas y toucher.

---

## 3. Assertions SQL — étendre `supabase/tests/069_sector_knowledge_resolution.assertions.sql`

Le fichier existant porte 14 assertions (9 sur la fusion de playbook, 5 sur les vues). **Ne pas
créer de nouveau fichier** : ajouter à la suite du second bloc `do $$ ... end $$;`, avant son
`raise notice` final, ou dans un troisième bloc séparé — au choix, tant que le fichier reste
rejouable tel quel (aucune écriture, échec à la première assertion fausse).

Ajouter au minimum ces quatre invariants :

```sql
-- 15. Le verrou l'emporte toujours, même si une valeur brute existe des deux côtés
--     (défense contre un état incohérent que l'importeur ne devrait jamais produire,
--     mais que la vue ne doit jamais laisser passer si un bug le produit quand même).
if private.sector_resolve_scalar(4.9, 4.2, true) is not null then
  raise exception 'ASSERT 15a — le verrou devrait forcer NULL même avec une valeur segment ET macro';
end if;
if private.sector_scalar_level(4.9, true) <> 'locked' then
  raise exception 'ASSERT 15b — un segment verrouillé doit rester `locked` même s''il porte une valeur brute';
end if;

-- 16. Sans verrou, le comportement est inchangé (non-régression du COALESCE existant).
if private.sector_resolve_scalar(4.9, 4.2, false) <> 4.9 then
  raise exception 'ASSERT 16a — sans verrou, la valeur segment doit primer';
end if;
if private.sector_resolve_scalar(null, 4.2, false) <> 4.2 then
  raise exception 'ASSERT 16b — sans verrou et sans valeur segment, le macro doit passer';
end if;
if private.sector_scalar_level(4.9, false) <> 'segment' or private.sector_scalar_level(null, false) <> 'macro' then
  raise exception 'ASSERT 16c — provenance segment/macro incorrecte sans verrou';
end if;

-- 17. Aucune fiche existante n'est verrouillée avant la première ingestion Master Study
--     (resolution_locks doit valoir '{}' partout tant que L2/L3 n'ont encore rien écrit).
--     Cette assertion cessera d'être vraie après le premier import réel (L3) — c'est attendu,
--     elle vérifie l'état DE CETTE MIGRATION, pas un invariant permanent. Si elle échoue à ce
--     stade, quelque chose a écrit dans resolution_locks avant l'heure : investiguer avant de
--     continuer, ne pas l'assouplir en silence.
if (select count(*) from public.sector_intelligence where resolution_locks <> '{}'::jsonb) <> 0 then
  raise exception 'ASSERT 17 — resolution_locks non vide avant toute ingestion Master Study (L2/L3 pas encore livrés)';
end if;

-- 18. v_sector_knowledge_resolved expose bien les 3 nouvelles colonnes de niveau, avec des
--     valeurs dans le domaine attendu (jamais autre chose que segment/macro/locked).
if exists (
  select 1 from public.v_sector_knowledge_resolved
  where attractiveness_score_level not in ('segment','macro','locked')
     or market_size_eur_bn_level not in ('segment','macro','locked')
     or market_growth_pct_level not in ('segment','macro','locked')
) then
  raise exception 'ASSERT 18 — un niveau de provenance hors domaine (segment/macro/locked)';
end if;

raise notice 'L1 — provenance et verrou : 4/4 assertions supplémentaires vertes.';
```

**Les assertions 1 à 14 existantes doivent toujours passer sans modification** — en particulier
l'ASSERT 10 (`security_invoker`) et l'ASSERT 12 (une ligne résolue par fiche segment) : ce sont
elles qui détecteraient un DROP+CREATE mal fait.

**Comment rejouer** : ce fichier n'est pas dans `npm test` (Vitest ne couvre que
`src/**/*.test.ts`). Il se rejoue directement contre la base — via le SQL Editor du projet
Supabase, `psql`, ou l'outil `execute_sql` du MCP Supabase si vous l'avez. **Rapporter la sortie
`raise notice` complète**, pas seulement « ça a semblé passer ».

---

## 4. Partie TypeScript — retirer le pis-aller de L0

Le lot précédent (L0) a dû, faute de cette migration, deviner la provenance de chaque scalaire en
lisant la table brute `sector_intelligence` en parallèle de la vue, depuis TypeScript
(`sector-snapshot-data.ts`, fonction `scalarLevel()`). **Maintenant que la vue calcule la vraie
provenance — y compris `locked`, que le mécanisme TS ne pouvait pas connaître — ce pis-aller doit
être retiré.** Le laisser vivre à côté du calcul SQL créerait exactement la double vérité que
l'ADR interdit.

### 4.1 `src/lib/intelligence/client-intelligence-sector.ts`

Le type `SectorResolvedLevel` passe de deux à trois valeurs :

```ts
export type SectorResolvedLevel = "segment" | "macro" | "locked"
```

Aucun autre changement dans ce fichier n'est nécessaire : `attractivenessScoreLevel`,
`marketSizeLevel`, `marketGrowthLevel` sur `SectorIntelligenceSource` et
`ClientIntelligenceSectorView` gardent leur nom et leur type (`SectorResolvedLevel`), qui accepte
désormais la troisième valeur. `buildFolioFallbackSectorView` garde `"segment"` pour ces trois
champs (aucun concept de macro ou de verrou dans le repli FOLIO) — ne pas y toucher.

### 4.2 `src/lib/intelligence/sector-snapshot-data.ts`

- **Supprimer** : le type `RawSegmentScalarsRow`, la fonction `scalarLevel()`, la requête
  parallèle sur `sector_intelligence` (le `rawSegmentResult` dans le `Promise.all`), et la
  variable `rawSegment`. Revenir à un unique `await` sur `v_sector_knowledge_resolved`, comme
  avant L0.
- **Étendre** la chaîne `.select(...)` de cette requête pour inclure les 3 nouvelles colonnes :
  `attractiveness_score_level,market_size_eur_bn_level,market_growth_pct_level`.
- **Étendre** le type `SectorKnowledgeResolvedRow` avec ces 3 champs (`string`).
- **Ne pas** thread `source_run_id`/`study_snapshot_date` dans les types TypeScript à ce stade —
  rien ne les consomme encore côté écran ; ce sera fait au lot qui en a besoin (L4/L5), pas ici.
- **Ajouter** une fonction dédiée, à côté de `toResolvedLevel` existante — ne pas réutiliser
  `toResolvedLevel` telle quelle pour ces 3 champs, elle collapse tout ce qui n'est pas
  `"segment"` en `"macro"` et avalerait silencieusement `"locked"` :

  ```ts
  function toScalarLevel(value: string | null | undefined): SectorResolvedLevel {
    return value === "segment" || value === "locked" ? value : "macro"
  }
  ```

- Dans l'assemblage de l'objet `sector` transmis à `buildClientIntelligenceSectorView`, remplacer :

  ```ts
  attractivenessScoreLevel: scalarLevel(rawSegment?.attractiveness_score),
  marketSizeLevel: scalarLevel(rawSegment?.market_size_eur_bn),
  marketGrowthLevel: scalarLevel(rawSegment?.market_growth_pct),
  ```

  par :

  ```ts
  attractivenessScoreLevel: toScalarLevel(resolved.attractiveness_score_level),
  marketSizeLevel: toScalarLevel(resolved.market_size_eur_bn_level),
  marketGrowthLevel: toScalarLevel(resolved.market_growth_pct_level),
  ```

### 4.3 `src/components/accounts-contacts/intelligence/intelligence-parts.tsx`

`SectorLevelBadge` doit distinguer `"locked"` de `"macro"` — sans quoi un chiffre explicitement
non publiable affiche le badge « Hérité du macro-secteur », ce qui est faux et pire que l'absence
de badge :

```tsx
export function SectorLevelBadge({ level, macroName }: { level: SectorResolvedLevel; macroName?: string | null }) {
  if (level === "segment") return null
  if (level === "locked") {
    return (
      <span
        title="Secteur étudié — donnée non publiée pour ce segment"
        className="inline-flex shrink-0 items-center gap-1 rounded border border-warning/25 bg-warning/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-warning"
      >
        Non publié
      </span>
    )
  }
  return (
    <span
      title={macroName ? `Hérité du macro-secteur « ${macroName} »` : "Hérité du macro-secteur"}
      className="inline-flex shrink-0 items-center gap-1 rounded border border-border bg-surface-hover px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted"
    >
      Macro-secteur
    </span>
  )
}
```

(Palette : `text-warning`/`bg-warning/10`/`border-warning/25` — mêmes tokens `@theme` que le badge
FOLIO de `ProvenanceBadge` un peu plus haut dans le même fichier. Ne pas introduire de nouvelle
couleur.)

### 4.4 `src/components/accounts-contacts/intelligence/ClientIntelligenceSectorTab.tsx`

Piège à éviter : aujourd'hui, un stat dont la valeur est `null` **disparaît silencieusement** du
tableau affiché (`data.marketSizeEurBn !== null ? {...} : null`). Un champ `locked` a justement
une valeur `null` (la vue la force à `NULL`) — sans ce correctif, le badge « Non publié » que vous
venez d'écrire en §4.3 ne s'afficherait jamais, et le lot n'aurait rien changé à l'écran. Remplacer
le bloc `const stats = [...]` de `SectorIntroduction` par :

```tsx
const stats = [
  data.attractivenessScore !== null || data.attractivenessScoreLevel === "locked"
    ? {
        label: "Attractivité",
        value: data.attractivenessScoreLevel === "locked" ? "Non publié" : `${data.attractivenessScore}/5`,
        level: data.attractivenessScoreLevel,
      }
    : null,
  data.marketSizeEurBn !== null || data.marketSizeLevel === "locked"
    ? {
        label: "Taille marché KREDO",
        value: data.marketSizeLevel === "locked" ? "Non publié" : `${data.marketSizeEurBn} Md€`,
        level: data.marketSizeLevel,
      }
    : null,
  data.marketGrowthPct !== null || data.marketGrowthLevel === "locked"
    ? {
        label: "Croissance KREDO",
        value: data.marketGrowthLevel === "locked" ? "Non publié" : `${data.marketGrowthPct}%`,
        level: data.marketGrowthLevel,
      }
    : null,
  {
    label: data.peersLevel === "segment" ? "Pairs du segment" : "Pairs du macro-secteur",
    value: `${data.exposedAccountsCount} compte${data.exposedAccountsCount > 1 ? "s" : ""}`,
    level: null,
  },
].filter((item): item is { label: string; value: string; level: ClientIntelligenceSectorView["attractivenessScoreLevel"] | null } => Boolean(item))
```

Le rendu du `<dl>` (le `dt`/`dd` avec `SectorLevelBadge`) écrit au lot précédent n'a **pas** besoin
de changer — il consomme déjà `stat.level` tel quel.

### 4.5 Tests à mettre à jour

**`src/lib/intelligence/sector-snapshot-data.test.ts`** — le mock avait gagné, au lot précédent,
une branche `sector_intelligence` → `state.rawSegment`. Cette branche et `state.rawSegment`
**disparaissent** (plus de requête sur la table brute). À la place :

- Étendre `resolvedRow()` avec `attractiveness_score_level: "macro"`,
  `market_size_eur_bn_level: "macro"`, `market_growth_pct_level: "macro"` par défaut (cohérent
  avec le reste de la fixture, déjà construite comme un scénario « tout hérité du macro »).
- Remplacer le `describe("getSectorSnapshot — provenance par chiffre (L0)")` existant : ces tests
  vérifiaient le calcul de provenance lui-même, qui **vit maintenant en SQL**, pas en TypeScript —
  le retester ici serait redondant avec les assertions §3 et testerait la mauvaise couche. Ce
  fichier ne doit plus vérifier QUE le loader **transmet fidèlement** ce que la vue (mockée) lui
  donne, y compris la valeur `"locked"`. Trois tests suffisent :
  - la valeur par défaut du mock (`"macro"` partout) traverse sans altération jusqu'à
    `view!.marketSizeLevel` etc. ;
  - `state.resolved = resolvedRow({ market_size_eur_bn_level: "locked", market_size_eur_bn: null })`
    → `view!.marketSizeLevel === "locked"` et `view!.marketSizeEurBn === null`, **sans lever
    d'erreur** ;
  - une valeur `"segment"` traverse également sans altération (pas seulement `"macro"`/`"locked"`).

**`src/lib/intelligence/client-intelligence-sector.test.ts`** — la fixture `source()` porte déjà
`attractivenessScoreLevel: "segment"` etc. (ajoutés au lot précédent). Le type accepte maintenant
`"locked"` en plus : **aucune modification requise**, ces valeurs existantes restent valides.

**Ne pas créer de test pour `SectorLevelBadge` (`intelligence-parts.tsx`).** `vitest.config.ts`
n'inclut que `src/**/*.test.ts` — un fichier `.test.tsx` ne serait **jamais exécuté** par
`npm test`, et aucun composant présentational de ce dossier n'a de test dédié aujourd'hui (vérifié
par `grep`). Ajouter un tel fichier créerait une fausse impression de couverture. Si vous avez un
doute sur le rendu, vérifiez-le en lisant le JSX, pas en écrivant un test qui ne tournera jamais.

---

## 5. Ce qu'il ne faut PAS faire dans ce lot

- **Ne pas écrire l'importeur** (`scripts/ingest-master-study.mts`) — c'est L2.
- **Ne pas ingérer le segment pilote** — c'est L3. Aucune ligne de `sector_intelligence`,
  `sector_events`, etc. ne doit recevoir de `source_run_id` non nul à l'issue de ce lot (voir
  ASSERT 17 ci-dessus, qui vérifie exactement ça pour `resolution_locks` — le même principe
  s'applique à `source_run_id`, qui doit rester NULL partout).
- **Ne pas toucher** `src/features/competitive-map/actions/ingest-competitive-map.ts` — sa mise au
  régime RPC transactionnelle (MS-10) est documentée pour L2, avec l'importeur E4, pas avant.
- **Ne pas toucher** `v_sector_knowledge_items` (deuxième vue de la migration 069).
- **Ne pas ajouter** `budgets_18_36_mois` dans `docs/MASTER-STUDY/schemas/sector-knowledge.schema.json`
  ni y toucher — c'est un amendement déjà tranché (retiré) qui appartient à L2, sans lien avec ce
  lot.

---

## 6. Boucle de validation — dans cet ordre, sans en sauter aucune

```bash
npm run typecheck
npm test
npm run check:server-boundary
npx eslint src/lib/intelligence/client-intelligence-sector.ts \
  src/lib/intelligence/sector-snapshot-data.ts \
  src/lib/intelligence/client-intelligence-sector.test.ts \
  src/lib/intelligence/sector-snapshot-data.test.ts \
  src/components/accounts-contacts/intelligence/intelligence-parts.tsx \
  src/components/accounts-contacts/intelligence/ClientIntelligenceSectorTab.tsx
rm -rf .next && npm run build
```

`rm -rf .next` avant le build n'est pas optionnel : un `.next/` périmé produit de faux
`TS6200`/`TS2300` qui ressemblent à une régression et n'en sont pas (piège documenté dans
`CLAUDE.md`).

**Plus, spécifique à ce lot, puisqu'une migration DB est touchée** :

1. Rejouer `supabase/tests/069_sector_knowledge_resolution.assertions.sql` en entier contre la
   base après application de la migration — rapporter la sortie complète des deux `raise notice`
   (« Fusions : 9/9 » et le nouveau bloc « L1 — provenance et verrou : 4/4 »).
2. `npm run db:types` pour régénérer `src/types/database.generated.ts`.
3. Confirmer par requête (§1) que `security_invoker` est toujours vrai sur les deux vues après le
   `DROP`+`CREATE`.
4. Vérifier que le nom du fichier de migration correspond exactement au timestamp réellement
   enregistré dans `supabase_migrations.schema_migrations` (§1) — renommer si besoin.

---

## 7. Mise à jour de la documentation — attendue, pas optionnelle

`CLAUDE.md` §« Nouvelle migration DB » l'impose : après `db:types`, mettre à jour la section
**« Supabase — état de la base »** de `CLAUDE.md` :

- Ajouter une ligne au tableau des migrations avec le timestamp réel et le nom du fichier.
- Étendre la description de `sector_intelligence` (nouvelles colonnes) et de
  `v_sector_knowledge_resolved` (nouveau comportement `locked`) là où ce fichier les documente déjà.

Une entrée courte dans `docs/init-projet/DECISIONS_LOG.md` référençant ADR-0021 L1 suffit — la
décision elle-même est déjà documentée en détail dans l'ADR, pas la peine de la reformuler.

---

## 8. Rendu attendu

- Un fichier de migration, son nom aligné sur le timestamp réel.
- `supabase/tests/069_sector_knowledge_resolution.assertions.sql` étendu (18 assertions au lieu
  de 14), toujours rejouable tel quel.
- Les 5 fichiers TypeScript du §4, modifiés comme spécifié.
- `src/types/database.generated.ts` régénéré.
- `CLAUDE.md` et `docs/init-projet/DECISIONS_LOG.md` mis à jour.
- Un court rapport : sortie complète de la boucle de validation §6, sortie complète des
  assertions SQL §3 (les 14 existantes **et** les 4 nouvelles), et confirmation explicite que
  `resolution_locks`/`source_run_id` valent bien `{}`/`NULL` partout à l'issue du lot — la preuve
  que L1 pose l'infrastructure sans rien ingérer.
