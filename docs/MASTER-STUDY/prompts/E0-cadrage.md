# Prompt E0 — Cadrage

`version: 1.0` · `date: 2026-08-13` · étape **E0** · opérateur : **Guillaume, sans LLM**

Ce n'est pas un prompt au sens strict : c'est le formulaire que remplit un humain, et qui
devient l'en-tête de tous les prompts suivants. **Aucune étape ne redéclare un paramètre.**

---

## A. Ce qui se lit en base avant de remplir

```sql
-- 1. Le segment cible existe-t-il, et quel est son macro parent ?
select s.id, s.slug, s.name, s.level, s.display_code,
       p.slug as macro_slug, p.name as macro_name
from sector_intelligence s
left join sector_intelligence p on p.id = s.parent_id
where s.slug = '<segment-slug>';

-- 2. Combien de comptes, et sont-ils classés ?
select count(*) total,
       count(*) filter (where regime_achat is not null
                          and modele_eco  is not null
                          and tier        is not null) classes,
       count(*) filter (where depth_level = 'mapped')  mapped
from companies where segment_id = '<segment-id>';

-- 3. Le catalogue réel — JAMAIS saisi à la main
select p.slug as practice, o.slug as offer, o.name
from offers o join offer_practices p on p.id = o.practice_id
order by 1, 2;

-- 4. Le corpus déjà disponible, segment ET macro parent
select 'regulatory' k, count(*) from sector_regulatory_items where sector_id in ('<seg>','<macro>')
union all select 'pain_points', count(*) from sector_pain_points     where sector_id in ('<seg>','<macro>')
union all select 'events',      count(*) from sector_events          where sector_id in ('<seg>','<macro>')
union all select 'competitive', count(*) from competitive_map_entries where sector_id in ('<seg>','<macro>');
```

La requête 4 est celle qui empêche l'étude de repartir d'une page blanche. **Une étude qui
déclare sa rubrique « échéances communes » vide alors que la base en contient est un échec de
chaînage, pas de recherche.**

---

## B. Le formulaire

```text
========== PARAMÉTRAGE DE L'ÉTUDE ==========
DATE_SNAPSHOT          : <JJ/MM/AAAA>
VARIANTE               : master | tier | compte_unique | trimestriel | chaine_de_valeur

--- Périmètre ---
SEGMENT_SLUG           : <slug existant dans sector_intelligence, level='segment'>
SEGMENT_NOM            : <libellé, SANS numérotation d'affichage>
MACRO_SLUG             : <déduit de parent_id, jamais saisi>
DEFINITION_DU_MARCHE   : <2 phrases : quelle offre, pour quels clients, sur quelle géographie.
                          C'est le test d'inclusion de tous les acteurs.>
HORS_CHAMP             : <ce qui est explicitement exclu. Obligatoire : une définition qui
                          n'exclut rien n'est pas un test d'inclusion.>
GEOGRAPHIE             : <défaut : France entière, métropole + DROM>

--- Calibrage ---
COMPTE_ETALON          : <un acteur qu'on connaît déjà — client, ancien prospect, référence>
MOTIF_DU_CHOIX         : <pourquoi celui-là. S'il est mal choisi, on ne peut rien calibrer.>
QUOTAS                 : leaders=3 ; challengers=3 ; mid_market=3 ;
                         outsiders_emergents=2 ; outsiders_niche=3
PROFONDEUR_HISTORIQUE  : <défaut : trajectoire 10 ans, ambitions à 5 ans>
EXERCICE_DE_REFERENCE  : <défaut : dernier exercice clos publié>

--- Contexte KREDO (LU EN BASE, jamais saisi) ---
OFFRE_KREDO_PRACTICES  : <coller la sortie de la requête 3>
OFFRE_KREDO_OFFERS     : <idem>
LU_EN_BASE_LE          : <JJ/MM/AAAA>
REFERENCES_SECTEUR     : <références déjà détenues, même partielles — sinon "aucune">

--- Intention ---
OBJECTIF_COMMERCIAL    : ouverture | appels_offres | extension | angle_sectoriel
COMPTES_EXCLUS         : <clients, pairs-partenaires, NDA, conflits — sinon "aucun">
CE_QUE_J_EN_FERAI      : <une phrase. Si elle ne vient pas, ne pas lancer l'étude.>
========== FIN DU PARAMÉTRAGE ==========
```

---

## C. Contrôles avant de passer à E1

| # | Contrôle | Rejet si |
|---|---|---|
| 1 | `SEGMENT_SLUG` existe, `level='segment'`, `parent_id` non nul | Le slug n'existe pas → E1 §4.2, jamais une création à la volée |
| 2 | `DEFINITION_DU_MARCHE` tient en 2 phrases **et** `HORS_CHAMP` est rempli | Une définition qui n'exclut rien ne teste rien |
| 3 | `COMPTE_ETALON` est connu de KREDO ou publiquement documenté | Aucun calibrage possible |
| 4 | `OFFRE_KREDO_*` est un copier-coller de la base, avec sa date | Saisi à la main → toute la colonne « fit offre » sera notée contre le mauvais catalogue |
| 5 | `CE_QUE_J_EN_FERAI` est une phrase concrète | « mieux connaître le secteur » n'est pas un usage |

**Sortie** : `registre/<AAAA-MM>-<segment-slug>/00-cadrage.json`, conforme à
`schemas/cadrage.schema.json`.
