> 🟡 **ARCHIVE — raisonnement conservé, application interdite** — statut fixé par [`docs/MASTER-STUDY/README.md`](/docs/MASTER-STUDY/README.md) §5 (13/08/2026).
> Conserve l'arbitrage `sector_id` et les 8 amendements au modèle. À lire avant de toucher au schéma des tables `value_chain_*`.
> **Référence à appliquer : `MASTER-STUDY/09-ETAPE-E6-CHAINE-DE-VALEUR.md`**

---

# DÉCISION — Modèle de données des chaînes de valeur sectorielles

**Étapes 0 et 1 du §8 du brief.** Rédigé le 09/08/2026 · Base `Kredo_Sales_App` (`jvzgmhvwirsbdkjpmvla`)
Statut : **validé par le commanditaire le 09/08/2026, migration `value_chain_foundation` appliquée.**
Les deux arbitrages du §5 ont été tranchés dans le sens recommandé : le négoce passe en maillon ①·2, et les comptes classés dans d'autres macro-secteurs sont positionnés sur la chaîne BTP.

---

## 1. État réel de la base (étape 0)

Relevé par requêtes, pas par lecture de documentation.

| Constat | Valeur | Conséquence pour la mission |
|---|---|---|
| Tables existantes | 87 objets `public`, dont 51 tables et 15 vues | Aucune table de chaîne de valeur n'existe. Le brief a raison : **Vinci, NGE, Hoffmann Green n'ont aujourd'hui aucun endroit où vivre en base** |
| Macro BTP | `btp-construction-immobilier`, `level='macro'`, `status='active'`, **11 comptes en `sector_id`** | La fiche BTP visible dans l'app compte 11 comptes, pas 12 |
| Segments BTP | 7.1 / 7.2 / 7.3 / 7.4, `status='development'`, 3 comptes chacun = **12 comptes en `segment_id`** | L'écart 11 vs 12 est **Torbel Industrie** : `segment_id` = 7.3 BTP mais `sector_id` = Industrie Manufacturière. C'est l'un des 11 déplacements de macro en attente d'arbitrage (`journal-migration.md`) |
| `tier` manquant sur le BTP | Griesser, Torbel Industrie | Deux acteurs sans dimensionnement — le champ `poids` de la table acteurs restera vide, à afficher comme tel |
| `revenue` | texte libre non normalisé (`"240 M€"`, `"5M€/centre"`, `"1,4M€"`) | Le générateur SVG **ne calculera rien** sur `revenue`. Le dimensionnement se fera sur un champ `poids` textuel saisi, jamais sur un parsing |
| RLS | activée sur **toutes** les tables concernées, isolation par `workspace_id = private.current_workspace_id()` | Contrainte structurante — voir amendement A1 |
| Conventions | `private.set_updated_at()` en trigger, index de couverture sur chaque FK, `grant` par défaut à `anon`/`authenticated`/`service_role` | À reproduire à l'identique |
| Workspace | unique : `98dcd39d-f87b-4f9d-add9-ce76d635953a` | — |

### Le constat qui change la conception

J'ai interrogé les 96 comptes hors macro BTP en cherchant ceux qui ont une place légitime sur la chaîne BTP. Il y en a **au moins onze** :

| Rôle sur la chaîne BTP | Comptes Kredo classés ailleurs |
|---|---|
| Maîtrise d'ouvrage / client final | CASA, Préfecture 06, Université Nice Côte d'Azur, Aéroport Nice Côte d'Azur, ESCOTA (VINCI) |
| Amont — déchets et économie circulaire | Pizzorno Environnement |
| Composants du bâtiment | Schneider *(électrique)* |
| Financement | **Banque Populaire Méditerranée** *(client)* |
| Technologie | Appolonia *(éditeur, `vertical_client={immobilier}`)*, Experis France *(pair-partenaire)* |
| Main-d'œuvre | Adecco, Interima — la pénurie de main-d'œuvre est le 4ᵉ enjeu commun de l'étude BTP |

**C'est le résultat le plus important de l'étape 0.** La chaîne de valeur BTP ne contient pas 12 comptes Kredo mais une vingtaine, dont **deux clients** (Audemard et Banque Populaire Méditerranée) au lieu d'un. Il ne s'agit pas de reclasser ces comptes — le référentiel est intact — mais de les **positionner**. La distinction est le cœur de la décision qui suit.

---

## 2. Arbitrage `sector_id` : **macro**, confirmé

`value_chain_nodes.sector_id` pointe vers un macro-secteur (`level='macro'`). Trois raisons, par ordre de force :

1. **La chaîne traverse les segments, c'est sa définition.** La chaîne BTP relie 7.2 Matériaux → 7.3 Composants → 7.1 Constructeurs → 7.4 Immobilier. Rattachée à un segment, elle n'aurait plus rien à traverser et perdrait son objet.
2. **Le référentiel le dit déjà.** §5.1 : le macro est le **conteneur de corpus** ; §5.2 : le segment est **l'unité de playbook**. Une chaîne de valeur est un corpus, pas un playbook. Elle se range avec les études et les pain points, au niveau macro.
3. **Le relevé de l'étape 0 le prouve.** Onze acteurs de la chaîne BTP ne sont pas dans le macro BTP, et deux d'entre eux (Torbel, Schneider) ne sont même pas d'accord avec eux-mêmes sur leur macro. Aucun `segment_id` n'aurait pu les accueillir sans arbitraire.

### Le corollaire, qui doit être écrit noir sur blanc

> **`value_chain_nodes.sector_id` désigne le sujet de la chaîne, jamais l'appartenance de ses acteurs.**
> Aucune contrainte ne vérifie que `companies.sector_id = value_chain_nodes.sector_id`, et c'est **délibéré**. Un acteur positionné sur la chaîne BTP n'est pas reclassé en BTP : `value_chain_actors` n'écrit jamais dans `companies`. C'est précisément ce découplage qui produit la valeur n°2 du brief — la remontée et la descente de filière.

Contrôle associé, à passer après tout peuplement (aucune contrainte SQL ne peut l'exprimer) :

```sql
-- Un nœud de chaîne doit pointer vers un macro, jamais vers un segment
select n.id, n.label, s.slug, s.level
from value_chain_nodes n join sector_intelligence s on s.id = n.sector_id
where s.level is distinct from 'macro';
```

---

## 3. Validation du modèle à 3 tables : **retenu, avec 8 amendements**

Le modèle à trois tables du §4 du brief est le bon. Les amendements ci-dessous ne changent ni le nombre de tables ni leur rôle : ils rendent mécaniques des règles que le brief pose comme déclaratives, et corrigent deux points qui casseraient à l'usage.

### A1 — `workspace_id` sur les trois tables *(bloquant)*

Le brief ne le met que sur `value_chain_nodes`. Or **toutes** les tables de la base, y compris les tables purement filles (`opportunity_contacts`, `account_score_components`, `intelligence_document_versions`), portent `workspace_id` et quatre policies RLS. Sans cette colonne, `chain_actors` et `chain_links` seraient soit non protégées, soit protégées par une policy avec jointure — coûteuse et hors convention.

### A2 — `position` → `maillon` *(nommage)*

`position` est un mot-clé SQL et une fonction Postgres. Il passe comme nom de colonne, mais c'est un piège à la première génération de types ou au premier ORM. `maillon` est en outre le mot que le brief lui-même emploie partout.

### A3 — `maillon` nullable pour les couches transverses *(correction d'une contradiction du brief)*

Le brief impose simultanément `position not null check (position between 1 and 5)` et `couche in ('chaine','prescripteur','financeur','technologie')`. **Les deux ne peuvent pas être vrais ensemble** : une couche transverse *traverse* les maillons par définition, elle n'en occupe aucun. Avec la contrainte du brief, il faudrait coller arbitrairement la DGFiP au maillon 3.

Remplacé par une contrainte conditionnelle : `maillon` est **obligatoire si et seulement si** `couche = 'chaine'`.

### A4 — `rang` : plusieurs nœuds par maillon *(le seul amendement de fond)*

**Le problème.** La grammaire générique du §3.1 est : ① Amont → ② Transformation → ③ Intégration & réalisation → ④ Distribution & mise sur le marché → ⑤ Usage / client final. Or la table BTP du §3.6 range le négoce (Ciffreo Bona, Richardson) en ④ « Distribution » et la transaction immobilière en ⑤ « Commercialisation » — ce qui laisse ⑤ « Usage / client final » sans occupant et place le négoce **en aval du chantier qu'il fournit**. La grammaire et son application BTP ne se recouvrent pas.

C'est un point que je signale plutôt que de le contourner, comme le §3 du brief le demande.

**Ce qui est vrai dans le BTP** : le négoce de matériaux est **en amont** du chantier. Ciffreo Bona et Richardson vendent au constructeur ; ils ne distribuent pas l'ouvrage fini. L'aval de l'ouvrage, c'est la promotion et la transaction (Iselection, Keller Williams, Pilatus), et le client final, c'est le maître d'ouvrage (CASA, Aéroport Nice, ESCOTA, Université).

**La correction, sans casser la grammaire** : garder les 5 slots génériques — ils sont ce qui rend deux secteurs comparables — et ajouter `rang`, qui autorise **plusieurs nœuds dans un même maillon** quand la filière s'y dédouble. Le BTP donne alors 6 nœuds sur 5 slots, dans la fourchette « 5 à 7 » du §3.3 :

| Maillon | Rang | Nœud | Comptes Kredo |
|---|---|---|---|
| ① Amont / ressources | 1 | Extraction & production de matériaux | **Audemard** *(client)* |
| ① Amont / ressources | 2 | Négoce & distribution de matériaux | Ciffreo Bona, Richardson |
| ② Transformation | 1 | Composants & équipements du bâtiment | Griesser, Sepalumic, Torbel Industrie, Schneider |
| ③ Intégration & réalisation | 1 | Constructeurs, promoteurs & ingénierie | Groupe IDEC, Groupe Trecobat, Renaudi |
| ④ Distribution & mise sur le marché | 1 | Promotion, commercialisation & transaction | Iselection, Keller Williams France, Pilatus Groupe |
| ⑤ Usage / client final | 1 | Maîtrise d'ouvrage & exploitation | CASA, Préfecture 06, Université Nice, Aéroport Nice, ESCOTA |

Le négoce reste ainsi **là où est l'argent et là où il est vraiment** : le brief note lui-même (§2.3) que la marge du BTP n'est pas chez le constructeur mais chez le négoce, le promoteur et le concessionnaire. Sur ce schéma, le marqueur de captation de valeur ①·2 se lit juste avant le maillon ③ à 4-5 % de marge. C'est exactement la lecture commerciale recherchée.

`rang` est plafonné à 3 : au-delà, ce n'est plus une filière, c'est un poster.

### A5 — Source obligatoire pour tout acteur hors Kredo *(contrainte du brief rendue mécanique)*

Le §6.2 du brief l'exige ; le DDL proposé ne l'impose pas. Devient un `CHECK` : `company_id is not null or source is not null`. Un concurrent sans source ne peut plus entrer en base, même par inadvertance.

### A6 — Captation de valeur justifiée, confiance obligatoire

Le critère d'acceptation demande des zones de captation « visibles et **justifiées**, pas décoratives », et le §3.5 impose une confiance visible sur chaque maillon. Or les deux colonnes sont nullables dans le brief, et il n'existe nulle part où écrire *pourquoi* la marge est là. Donc :
- `confiance` **NOT NULL** sur tous les nœuds ;
- `capture_valeur` **obligatoire** sur les nœuds de la couche `chaine` ;
- nouvelle colonne `capture_justification`, **obligatoire dès que `capture_valeur` est renseignée**.

### A7 — Anti-doublon et anti-boucle

Sans clés uniques, chaque régénération duplique silencieusement nœuds, acteurs et liens — et le §7 exige un schéma régénérable. Ajoutés : unicité `(sector_id, maillon, rang)` sur la couche chaîne, `(sector_id, couche, label)` sur les transverses, `(node_id, nom)` sur les acteurs, `(node_amont, node_aval, nature)` sur les liens, plus `node_amont <> node_aval`.

### A8 — Préfixe de nommage cohérent

`chain_actors` / `chain_links` → **`value_chain_actors` / `value_chain_links`**. Le schéma préfixe systématiquement les familles (`sector_*`, `account_*`, `company_*`, `opportunity_*`). C'est le seul moment où ce renommage est gratuit : avant que la moindre ligne existe.

### Ce que je n'amende pas

- Les **quatre valeurs de `couche`** et les **quatre valeurs de `nature`** : elles suffisent, elles sont bornées, elles ne coûtent rien.
- `poids` reste **du texte libre**. `companies.revenue` est déjà du texte non normalisé ; en faire un numérique ici créerait une deuxième vérité incohérente avec la première. Le chantier de normalisation de `revenue` est ouvert par ailleurs (référentiel §13, chantier 4).
- `nom` reste **toujours renseigné**, même quand `company_id` existe. C'est ce qui permet au générateur de rendre le schéma sans jointure, et de survivre à un renommage de compte.

---

## 4. DDL soumis à validation

```sql
-- ============================================================
-- value_chain_nodes — les maillons et les couches transverses
-- ============================================================
create table public.value_chain_nodes (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid not null references public.workspaces(id) on delete cascade,
  sector_id             uuid not null references public.sector_intelligence(id) on delete cascade,
  couche                text not null check (couche in ('chaine','prescripteur','financeur','technologie')),
  maillon               smallint check (maillon between 1 and 5),
  rang                  smallint not null default 1 check (rang between 1 and 3),
  label                 text not null,
  description           text,
  capture_valeur        smallint check (capture_valeur between 1 and 3),
  capture_justification text,
  confiance             text not null check (confiance in ('haute','moyenne','faible')),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  -- A3 : maillon obligatoire si et seulement si le nœud est sur la chaîne
  constraint vcn_maillon_ssi_chaine     check ((couche = 'chaine') = (maillon is not null)),
  -- A6 : captation obligatoire sur la chaîne, et toujours justifiée
  constraint vcn_capture_si_chaine      check (couche <> 'chaine' or capture_valeur is not null),
  constraint vcn_capture_justifiee      check (capture_valeur is null or capture_justification is not null)
);

comment on column public.value_chain_nodes.sector_id is
  'MACRO-secteur (sector_intelligence.level = macro). Désigne le SUJET de la chaîne, jamais l''appartenance de ses acteurs : un acteur positionné ici n''est pas reclassé.';
comment on column public.value_chain_nodes.maillon is
  '1..5 = grammaire générique (amont, transformation, réalisation, distribution, usage). NULL sur les couches transverses.';
comment on column public.value_chain_nodes.rang is
  'Ordre à l''intérieur d''un maillon, quand la filière s''y dédouble (BTP : production puis négoce de matériaux).';

-- A7 : anti-doublon
create unique index vcn_unique_chaine     on public.value_chain_nodes (sector_id, maillon, rang) where couche = 'chaine';
create unique index vcn_unique_transverse on public.value_chain_nodes (sector_id, couche, label) where couche <> 'chaine';
create index vcn_sector_idx    on public.value_chain_nodes (sector_id, couche, maillon, rang);
create index vcn_workspace_idx on public.value_chain_nodes (workspace_id);

-- ============================================================
-- value_chain_actors — comptes Kredo ET concurrents sans fiche
-- ============================================================
create table public.value_chain_actors (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  node_id      uuid not null references public.value_chain_nodes(id) on delete cascade,
  company_id   uuid references public.companies(id) on delete cascade,
  nom          text not null,
  role         text,
  poids        text,
  source       text,
  confiance    text check (confiance in ('haute','moyenne','faible')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- A5 : aucun acteur hors Kredo sans sa source
  constraint vca_source_obligatoire_hors_kredo check (company_id is not null or source is not null)
);

comment on column public.value_chain_actors.company_id is
  'NULL = concurrent identifié dans une étude, sans fiche compte. C''est la lacune que cette table comble.';
comment on column public.value_chain_actors.nom is
  'Toujours renseigné, même quand company_id existe : le générateur rend le schéma sans jointure.';

create unique index vca_unique        on public.value_chain_actors (node_id, nom);
create index        vca_node_idx      on public.value_chain_actors (node_id);
create index        vca_company_idx   on public.value_chain_actors (company_id);
create index        vca_workspace_idx on public.value_chain_actors (workspace_id);

-- ============================================================
-- value_chain_links — les dépendances entre nœuds
-- ============================================================
create table public.value_chain_links (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  node_amont   uuid not null references public.value_chain_nodes(id) on delete cascade,
  node_aval    uuid not null references public.value_chain_nodes(id) on delete cascade,
  nature       text not null check (nature in ('fournit','prescrit','finance','outille')),
  intensite    smallint not null check (intensite between 1 and 3),
  libelle      text,
  created_at   timestamptz not null default now(),
  constraint vcl_pas_de_boucle check (node_amont <> node_aval)
);

create unique index vcl_unique         on public.value_chain_links (node_amont, node_aval, nature);
create index        vcl_amont_idx      on public.value_chain_links (node_amont);
create index        vcl_aval_idx       on public.value_chain_links (node_aval);
create index        vcl_workspace_idx  on public.value_chain_links (workspace_id);

-- ============================================================
-- Conventions du schéma : updated_at, RLS, grants
-- ============================================================
create trigger trg_value_chain_nodes_updated_at  before update on public.value_chain_nodes
  for each row execute function private.set_updated_at();
create trigger trg_value_chain_actors_updated_at before update on public.value_chain_actors
  for each row execute function private.set_updated_at();

alter table public.value_chain_nodes  enable row level security;
alter table public.value_chain_actors enable row level security;
alter table public.value_chain_links  enable row level security;

-- Isolation par workspace, à l'identique de sector_intelligence
create policy workspace_isolation on public.value_chain_nodes  for all
  using (workspace_id = (select private.current_workspace_id()))
  with check (workspace_id = (select private.current_workspace_id()));
create policy workspace_isolation on public.value_chain_actors for all
  using (workspace_id = (select private.current_workspace_id()))
  with check (workspace_id = (select private.current_workspace_id()));
create policy workspace_isolation on public.value_chain_links  for all
  using (workspace_id = (select private.current_workspace_id()))
  with check (workspace_id = (select private.current_workspace_id()));

grant select, insert, update, delete
  on public.value_chain_nodes, public.value_chain_actors, public.value_chain_links
  to anon, authenticated, service_role;
```

### Rollback

La migration est **strictement additive** : trois tables neuves, aucune colonne ajoutée à une table existante, aucune donnée touchée. Le rollback est donc total et sans effet de bord.

```sql
begin;
drop table if exists public.value_chain_links  cascade;
drop table if exists public.value_chain_actors cascade;
drop table if exists public.value_chain_nodes  cascade;
commit;
```

### Vérifications à passer juste après la migration

```sql
-- 1. Les 3 tables existent, RLS activée, 1 policy chacune
select c.relname, c.relrowsecurity,
       (select count(*) from pg_policies p where p.tablename = c.relname) as policies
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname like 'value_chain_%';

-- 2. Aucune table existante n'a bougé : 96 comptes, 11 sur la fiche BTP, 14 fiches macro actives
select (select count(*) from companies)                                          as comptes,
       (select count(*) from companies c join sector_intelligence s on s.id = c.sector_id
         where s.slug = 'btp-construction-immobilier')                           as btp_fiche,
       (select count(*) from sector_intelligence where level = 'macro'
          and status = 'active')                                                 as fiches_actives;
```

---

## 5. Ce qui reste à trancher par le commanditaire

| # | Question | Ma recommandation |
|---|---|---|
| 1 | Amendement A4 : accepter que le négoce de matériaux passe en maillon ①·2 plutôt qu'en ④, contre la table du §3.6 du brief | **Oui.** Le négoce fournit le chantier ; le placer en aval le rendrait faux aux yeux du premier praticien du BTP qui verra le schéma |
| 2 | Positionner sur la chaîne BTP les 11 comptes classés dans d'autres macro-secteurs | **Oui**, et c'est la démonstration principale du pilote. Aucune écriture dans `companies` : ce sont des positions, pas des classifications |
| 3 | Renommage A8 des deux tables filles | **Oui**, c'est gratuit maintenant et payant ensuite |
| 4 | Torbel Industrie : `sector_id` toujours sur Industrie Manufacturière | **Ne rien faire dans cette mission.** C'est l'un des 11 déplacements de macro en attente, un arbitrage distinct. Le pilote n'en dépend pas : la chaîne référence les comptes explicitement, pas par leur `sector_id` |

---

## 6. Journal

| Version | Date | Contenu |
|---|---|---|
| 1.0 | 09/08/2026 | Étapes 0 et 1. Arbitrage `sector_id` = macro. Modèle à 3 tables validé avec 8 amendements. Migration en attente de validation |
| 1.1 | 09/08/2026 | Arbitrages 1 et 2 tranchés dans le sens recommandé. Migration `value_chain_foundation` appliquée et vérifiée : 3 tables, RLS active, 1 policy et 5 index chacune, aucun nouvel avertissement de sécurité. Base inchangée — 96 comptes, 11 sur la fiche BTP. Pilote BTP peuplé : 10 nœuds, 50 acteurs (24 Kredo / 26 externes, 26 sources sur 26), 20 liens |
