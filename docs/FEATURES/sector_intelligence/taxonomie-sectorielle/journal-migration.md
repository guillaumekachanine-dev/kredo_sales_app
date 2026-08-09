# Journal de migration — application de la taxonomie en base

Projet `Kredo_Sales_App` · appliqué le 09/08/2026 · migration `taxonomie_segments_et_axes_orthogonaux`

## Principe retenu : additif, pas destructif

Par rapport à ce que je proposais initialement, **j'ai changé un point** : je ne repointe pas `sector_id` vers les segments.

La raison est concrète : le front lit `sector_id` et affiche les fiches sectorielles. Repointer 96 comptes vers 37 segments sans corpus aurait vidé les 14 fiches existantes — la règle `COALESCE(segment, parent)` que je préconise n'est pas encore implémentée côté application. J'ai donc ajouté **`segment_id` comme colonne distincte**.

Conséquence : **l'application fonctionne exactement comme avant.** La couche segment est disponible pour le jour où le front l'adoptera, et les segments sont créés en `status='development'` pour ne pas apparaître dans une liste filtrée sur `active`.

## Ce qui a été appliqué

### Schéma
| Table | Colonne ajoutée | Rôle |
|---|---|---|
| `sector_intelligence` | `parent_id`, `level` | Hiérarchie macro → segment par auto-référence |
| `companies` | `segment_id` | Rattachement au segment — **n'écrase pas `sector_id`** |
| `companies` | `vertical_client` (TEXT[]) | Marché servi par un fournisseur → canal d'héritage de corpus |
| `companies` | `regime_achat` | `commande_publique` / `regule` / `monaco` / `prive` |
| `companies` | `tier` | `grand_compte` / `eti` / `pme` |
| `companies` | `relation_type` | `prospect` / `client` / `ancien_client` / `pair_partenaire` |
| `companies` | `modele_eco` | 8 valeurs — cause n°2 des enjeux |
| `companies` | `moment` | 6 valeurs — cause n°3 des enjeux |

Index créés sur `segment_id`, `tier`, `regime_achat`, `parent_id`.

### Données
- **1 macro créé** : « Services aux entreprises & aux personnes » (`status='development'`)
- **36 segments créés** + Nutraceutique rétrogradé en segment enfant de Santé (sa fiche, son score 4,3 et ses pain points sont conservés)
- **96 comptes sur 96** rattachés à un segment
- **3 orphelins corrigés** : Iselection et Keller Williams France rattachés au BTP, Univet à la Santé. Ils étaient invisibles dans toute agrégation par secteur

### Taux de remplissage obtenu

| Attribut | Rempli | Commentaire |
|---|---|---|
| `segment_id` | **96 / 96** | |
| `regime_achat` | **96 / 96** | dont 20 commande publique, 24 régulé, **3 Monaco**, 49 privé |
| `relation_type` | **96 / 96** | 89 prospects, 6 clients, **1 pair-partenaire** (Experis France) |
| `modele_eco` | 95 / 96 | Giraudi laissé vide : groupe diversifié, activité dominante à trancher |
| `tier` | 78 / 96 | 18 comptes sans donnée de taille exploitable, dont Tournaire volontairement mis à NULL (CA/effectif incohérent) |
| `vertical_client` | 13 / 96 | Normal : seuls les fournisseurs servant une filière identifiée en portent un |
| `moment` | **1 / 96** | Voir ci-dessous |

## Le champ `moment` est vide à 99 %, et c'est un résultat

`moment` est, d'après l'analyse des 87 pain points, la **deuxième cause d'enjeux** après le régime de contrainte : six familles de secteurs sur quatorze portent un pain point d'intégration post-acquisition.

Pourtant je n'ai pu le renseigner que pour **un seul compte** — Petroineos, parce que le pain point « Intégration SI après rachat (INEOS, Paprec) » nomme explicitement INEOS. Partout ailleurs, l'information existe au niveau du secteur, pas du compte.

Remplir ce champ suppose une passe de recherche ciblée : acquisitions, plans de croissance annoncés, nominations, renouvellements de concession, sur 12 mois glissants. **C'est le chantier de recherche le plus rentable qui reste** — un `moment` renseigné produit directement un motif d'appel daté.

## Les 11 déplacements de macro encore en attente

Ces comptes ont un `segment_id` cohérent, mais leur `sector_id` pointe encore vers leur macro d'origine. Déplacer un compte entre deux fiches existantes est une décision qui a des conséquences visibles dans l'application — je ne l'ai pas prise seul.

| Compte | Macro actuel | Macro cible |
|---|---|---|
| Torbel Industrie | Industrie Manufacturière | BTP, Construction & Négoce |
| UNAPEI PACA | Santé, MedTech & Médico-social | EHPAD & Résidences Seniors |
| Adecco, Interima | Commerce, Distribution & Services | Services aux entreprises & aux personnes |
| Depil Tech, Maman Bulle | Commerce, Distribution & Services | Services aux entreprises & aux personnes |
| Euro Protection Surveillance | Commerce, Distribution & Services | Services aux entreprises & aux personnes |
| Nice Matin | Commerce, Distribution & Services | Services aux entreprises & aux personnes |
| CCI Cote d Azur | Secteur public, ESR | Services aux entreprises & aux personnes |
| European Society Of Cardiology | Santé, MedTech & Médico-social | Services aux entreprises & aux personnes |
| Autogrill | Tourisme, Hôtellerie & Loisirs | Transport & Mobilité régionale |

*(Arkopharma et Laboratoires INELDEA apparaissent aussi en écart, mais c'est un artefact : leur secteur Nutraceutique est devenu un segment enfant de Santé. Aucun déplacement à faire.)*

Effet de bord à connaître : ces 8 départs videraient « Commerce, Distribution & Services spécialisés » de 6 de ses 12 comptes. C'était l'objectif — mais la fiche associée devra être réécrite, pas seulement dépeuplée.

## Requêtes désormais possibles

```sql
-- Les comptes accessibles et solvables, tous secteurs confondus
select name, tier, modele_eco from companies
where regime_achat='prive' and tier in ('eti','grand_compte');

-- Le bloc commande publique : une seule motion commerciale, 20 comptes
select name, segment_id from companies where regime_achat='commande_publique';

-- Les comptes hors UE, à discours réglementaire distinct
select name from companies where regime_achat='monaco';

-- Sortir le pair-partenaire des listes de prospection
select name from companies where relation_type <> 'pair_partenaire';

-- Playbook transverse « réseau multi-sites », indépendant du secteur
select name, sector_id from companies where modele_eco='multi_sites';   -- 18 comptes, 9 macro-secteurs
```

## Rollback

```sql
begin;
update companies set segment_id=null, vertical_client=null, regime_achat=null,
       tier=null, relation_type=null, modele_eco=null, moment=null;
delete from sector_intelligence where level='segment' and slug like 'seg-%';
update sector_intelligence set level='macro', parent_id=null where slug='nutraceutique-sante-naturelle';
delete from sector_intelligence where slug='services-entreprises-personnes';
alter table companies drop column segment_id, drop column vertical_client, drop column regime_achat,
      drop column tier, drop column relation_type, drop column modele_eco, drop column moment;
alter table sector_intelligence drop column parent_id, drop column level;
commit;
```

Le rattachement des 3 orphelins (`sector_id` d'Iselection, Keller Williams et Univet) n'est pas annulé par ce rollback — c'est une correction de donnée, pas une modification de modèle.

## À vérifier dans l'application

1. L'onglet « Approche sectorielle » affiche toujours **14 fiches**, pas 51. Si les 36 segments en `status='development'` apparaissent, dites-le-moi : il faudra soit filtrer sur `level='macro'`, soit les passer en `status='watch'`.
2. Les comptes rattachés à chaque fiche sont inchangés, sauf 3 de plus (les orphelins corrigés).
3. La fiche Nutraceutique doit continuer de s'afficher normalement malgré son passage en `level='segment'`.
