> 🟡 **ARCHIVE — raisonnement conservé, application interdite** — statut fixé par [`docs/MASTER-STUDY/README.md`](/docs/MASTER-STUDY/README.md) §5 (13/08/2026).
> Brief du pilote BTP. Historique.
> **Référence à appliquer : `MASTER-STUDY/09-ETAPE-E6-CHAINE-DE-VALEUR.md`**

---

# BRIEF — Modélisation des chaînes de valeur sectorielles Kredo

**Document de lancement pour une session neuve.** Rédigé le 09/08/2026 à l'issue du chantier de classification.
Tout ce qui est nécessaire pour exécuter la mission est ici ou référencé ici. Aucune connaissance de la conversation précédente n'est requise.

---

## 1. Contexte en dix lignes

**Kredo** est l'outil de prospection d'un consultant indépendant qui vise des missions ou un poste en ESN / conseil, sur la zone PACA et Côte d'Azur. Il contient **96 comptes** (89 prospects, 6 clients, 1 pair-partenaire) et **14 fiches sectorielles** avec leurs pain points, calendrier réglementaire et playbooks.

Un chantier de classification vient d'aboutir : les 96 comptes sont rangés en **15 macro-secteurs / 38 segments**, avec **6 attributs orthogonaux** (`regime_achat`, `modele_eco`, `moment`, `tier`, `vertical_client`, `relation_type`). Le document qui fait foi est **`taxonomie-sectorielle/REFERENTIEL-CLASSIFICATION.md`** — **à lire en premier, intégralement.**

Le principe fondateur à retenir : *un enjeu a une cause, pas une catégorie*. Les quatre causes sont, dans l'ordre : le régime de contrainte, **le modèle économique et le rôle dans la chaîne de valeur**, le moment, la capacité. **La présente mission construit la représentation visuelle de la cause n°2.**

---

## 2. Objectif de la mission

Produire, pour un secteur donné, un **schéma de chaîne de valeur** qui montre :
- les **maillons** de la filière, de l'amont au client final ;
- les **acteurs** positionnés sur chaque maillon — comptes Kredo **et** concurrents identifiés dans les études, ces derniers n'ayant aujourd'hui aucun endroit où exister en base ;
- les **liens de dépendance** entre maillons ;
- les **zones de captation de valeur**, c'est-à-dire là où se trouve la marge, donc le budget informatique.

**Livrer un pilote sur un seul secteur, pas quatorze.** Si le pilote passe le test du rendez-vous, on industrialise ; sinon on aura perdu une demi-journée.

### À quoi ça sert, concrètement — à garder en tête pendant toute la conception

Par ordre de valeur décroissante :

1. **L'effet miroir en rendez-vous.** On pose le schéma sur la table : *« voilà comment je comprends votre filière — où est-ce que je me trompe ? »*. Le prospect corrige toujours. C'est le meilleur outil de découverte qui existe, et il n'existe qu'en visuel. **Tout choix de conception qui dégrade cet usage est un mauvais choix.**
2. **La remontée et la descente de filière.** Une référence chez un maillon ouvre les maillons adjacents. Exemple réel : Robertet est client (compositions B2B) ; Tournaire est un fournisseur d'emballage de cette filière ; Fragonard, L'Occitane et Groupe Arthes sont en aval. Une référence, trois voisins accessibles — à condition de savoir qu'ils sont voisins.
3. **Voir où est l'argent.** La marge, donc le budget SI, n'est pas répartie uniformément sur la chaîne. Dans le BTP, elle n'est pas chez le constructeur (4-5 % de marge opérationnelle) mais chez le négoce, le promoteur et le concessionnaire.
4. **Déduire la prospection.** Un maillon sans compte Kredo est une liste de cibles argumentée, pas subie.

---

## 3. Décisions de conception déjà prises

Elles ont été arbitrées et ne sont pas à rouvrir sans raison forte. Si vous pensez qu'une d'elles est mauvaise, dites-le explicitement avant de la contourner.

### 3.1 Une grammaire générique, pas quatorze designs

**Cinq maillons**, réutilisables sur tous les secteurs :

```
① Amont / ressources → ② Transformation → ③ Intégration & réalisation
   → ④ Distribution & mise sur le marché → ⑤ Usage / client final
```

**Trois couches transverses**, qui traversent tous les maillons et portent l'essentiel de la valeur commerciale :
- **Prescripteurs et normalisateurs** — qui édicte la règle. C'est le régime de contrainte rendu visible.
- **Donneurs d'ordre et financeurs** — qui paie réellement.
- **Fournisseurs de technologie** — où une ESN se situe, et qui est déjà en place chez le compte.

### 3.2 Règle anti-poster

**Un maillon n'existe que s'il porte au moins un acteur réel** — compte Kredo ou concurrent identifié dans une étude. Pas de maillon théorique, pas de case vide « pour la complétude ».

### 3.3 Périmètre volontairement restreint

Ne pas viser l'exhaustivité « de la carrière à l'agence immobilière ». **5 à 7 maillons, sur le périmètre où Kredo a des comptes.** La valeur n'est pas l'exhaustivité, c'est la position relative des comptes qu'on travaille.

### 3.4 Rendu généré, jamais dessiné

Le SVG est **généré depuis les données**, comme la matrice concurrentielle existante (`prompts/cartographie-concurrentielle/assets/matrice-concurrentielle.html`, à reprendre comme référence de style et de structure). Un schéma dessiné à la main est un schéma mort au premier changement.

### 3.5 Codage visuel imposé

| Élément | Codage |
|---|---|
| Compte Kredo | Forme pleine |
| Concurrent identifié sans fiche | Contour seul |
| Client | Accent de couleur distinct |
| Pair-partenaire | Marqueur spécifique — ce n'est pas un prospect |
| Lien de dépendance | Épaisseur = intensité |
| Zone de captation de valeur | Marqueur sur le maillon, 3 niveaux |
| Confiance du maillon | Visible — un schéma faux se montre en rendez-vous, il ne se corrige pas comme un paragraphe |

### 3.6 Le pilote est le BTP

Contre-intuitif puisque la parfumerie a le meilleur corpus. Le BTP gagne pour trois raisons :

1. **Les 12 comptes Kredo couvrent déjà toute la chaîne**, littéralement des granulats à l'agence immobilière :

| Maillon | Comptes Kredo |
|---|---|
| ① Amont / matériaux | Audemard *(client — béton, granulats)* |
| ② Transformation / composants | Griesser, Sepalumic, Torbel Industrie |
| ③ Réalisation & promotion | Groupe IDEC, Groupe Trecobat, Renaudi |
| ④ Distribution / négoce | Ciffreo Bona, Richardson |
| ⑤ Commercialisation & transaction | Iselection, Keller Williams France, Pilatus Groupe |

2. **La couche « concurrents » est déjà documentée** dans `etudes/2026-08-btp-travaux-publics/` : Vinci Construction, Bouygues Construction, Colas, Eiffage, NGE, Fayat/Razel-Bec, Spie Batignolles, Demathieu Bard, GCC, Léon Grosse, Hoffmann Green Cement, Néolithe, Charier, Baudin Châteauneuf, Bessac, ETPO — avec leurs chiffres, leur catégorie et leurs sources. **Les deux jeux de données se rencontrent : c'est la démonstration recherchée.**

3. **Un client dans la chaîne** (Audemard) permet de faire valider le schéma par quelqu'un qui sait.

---

## 4. Modèle de données proposé — à valider, pas à appliquer aveuglément

Trois tables. La lacune qu'elles comblent est importante : **aujourd'hui, les concurrents identifiés dans les études n'ont aucun endroit où vivre en base.** Vinci, NGE ou Hoffmann Green existent dans un fichier markdown et nulle part ailleurs.

```sql
create table value_chain_nodes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id),
  sector_id uuid not null references sector_intelligence(id),   -- le MACRO, pas le segment
  position smallint not null check (position between 1 and 5),  -- les 5 maillons
  couche text not null check (couche in ('chaine','prescripteur','financeur','technologie')),
  label text not null,
  description text,
  capture_valeur smallint check (capture_valeur between 1 and 3),
  confiance text check (confiance in ('haute','moyenne','faible')),
  created_at timestamptz default now()
);

create table chain_actors (
  id uuid primary key default gen_random_uuid(),
  node_id uuid not null references value_chain_nodes(id) on delete cascade,
  company_id uuid references companies(id),   -- NULL = concurrent sans fiche : c'est la clé
  nom text not null,                          -- toujours renseigné, même si company_id existe
  role text,                                  -- ce qu'il fait précisément sur ce maillon
  poids text,                                 -- CA ou taille, pour dimensionner
  source text,                                -- obligatoire pour un acteur hors Kredo
  created_at timestamptz default now()
);

create table chain_links (
  id uuid primary key default gen_random_uuid(),
  node_amont uuid not null references value_chain_nodes(id) on delete cascade,
  node_aval  uuid not null references value_chain_nodes(id) on delete cascade,
  nature text,        -- fournit | prescrit | finance | outille
  intensite smallint check (intensite between 1 and 3)
);
```

**Point à trancher au démarrage** : `sector_id` pointe-t-il vers le macro ou vers le segment ? Recommandation : **le macro**, parce qu'une chaîne de valeur traverse les segments d'un même secteur — c'est précisément ce qui la rend intéressante.

---

## 5. Livrables attendus

1. **La migration Supabase** (les 3 tables), appliquée et vérifiée.
2. **Le peuplement du pilote BTP** : maillons, acteurs Kredo et concurrents, liens.
3. **Le générateur SVG** : un fichier HTML autonome, sans dépendance externe, qui lit le JSON et produit le schéma. Reprendre la structure de `assets/matrice-concurrentielle.html`.
4. **Le schéma BTP rendu**, publié en artifact, lisible en A4.
5. **Une note d'exploitation courte** : comment un commercial s'en sert en rendez-vous, avec les formulations exactes de l'effet miroir.
6. **Un verdict honnête** : est-ce que ça tient ? Faut-il industrialiser sur les 13 autres secteurs, ou l'abandonner ?

---

## 6. Contraintes non négociables

1. **Ne rien casser dans l'application.** Toute modification de base est **additive**. `companies.sector`, `sector_id` et les 14 fiches existantes ne sont pas touchés. Fournir le rollback.
2. **Aucune donnée inventée.** Un acteur hors Kredo n'entre en base qu'avec sa source. Un chiffre non sourcé ne figure pas. « Non trouvé » est une réponse acceptable et attendue.
3. **Traçabilité** : chaque maillon porte son niveau de confiance, chaque acteur externe sa source.
4. **Se conformer au référentiel de classification** (`taxonomie-sectorielle/REFERENTIEL-CLASSIFICATION.md`) : ses interdits s'appliquent, notamment l'interdiction de créer une catégorie pour un cas isolé.
5. **Le schéma doit tenir sur une page A4 lisible.** Si le pilote BTP ne tient pas, réduire le nombre de maillons, pas la taille de police.

---

## 7. Critères d'acceptation

Le pilote est réussi si :

- [ ] Le schéma se lit en **moins de 30 secondes** sans explication verbale
- [ ] Les **12 comptes Kredo du BTP** y sont positionnés, et Audemard (client) est identifiable d'un coup d'œil
- [ ] Au moins **8 concurrents hors Kredo** y figurent, chacun avec sa source en base
- [ ] On voit immédiatement **quel maillon n'a aucun compte Kredo** — c'est la liste de prospection déduite
- [ ] Les **zones de captation de valeur** sont visibles et justifiées, pas décoratives
- [ ] Le schéma est **régénérable** : modifier une ligne en base et relancer suffit à le mettre à jour
- [ ] Un praticien du BTP le regarderait sans tiquer

---

## 8. Étapes suggérées

| # | Étape | Sortie |
|---|---|---|
| 0 | Lire `REFERENTIEL-CLASSIFICATION.md` puis ce brief. Interroger la base pour l'état réel | Compréhension du modèle |
| 1 | Trancher `sector_id` macro ou segment, valider ou amender les 3 tables | Décision écrite |
| 2 | Appliquer la migration, vérifier | Tables créées + rollback fourni |
| 3 | Modéliser les maillons BTP — **5 à 7 max**, chacun avec au moins un acteur | Nœuds en base |
| 4 | Positionner les 12 comptes Kredo puis les concurrents de l'étude BTP, avec sources | Acteurs en base |
| 5 | Poser les liens et les zones de captation, avec justification | Liens en base |
| 6 | Écrire le générateur SVG autonome | Fichier HTML |
| 7 | Rendre, publier en artifact, passer les critères d'acceptation | Schéma + verdict |
| 8 | Commit et push sur la branche de travail | Historique propre |

---

## 9. Environnement

| | |
|---|---|
| **Dépôt** | `guillaumekachanine-dev/kredo` — branche de travail actuelle : `claude/generic-competitive-mapping-prompt-rmtoo6` (tout le chantier de classification y est) |
| **Supabase** | Projet `Kredo_Sales_App`, id `jvzgmhvwirsbdkjpmvla`. Workspace unique : `98dcd39d-f87b-4f9d-add9-ce76d635953a` |
| **Accès MCP Supabase** | `execute_sql` pour le DML, `apply_migration` pour le DDL |
| **Accès web** | `WebSearch` fonctionne ; **`WebFetch` est bloqué par la politique réseau** — impossible d'ouvrir une source primaire. Le déclarer si vous devez chercher, et plafonner la confiance en conséquence |

### Fichiers à connaître

| Fichier | Contenu |
|---|---|
| `taxonomie-sectorielle/REFERENTIEL-CLASSIFICATION.md` | **Document faisant foi.** À lire intégralement en premier |
| `taxonomie-sectorielle/journal-migration.md` | Ce qui a été appliqué en base, les requêtes types, le rollback |
| `taxonomie-sectorielle/classification-96-comptes.csv` | Les 96 comptes à plat |
| `etudes/2026-08-btp-travaux-publics/rapport.md` | L'étude BTP : concurrents, chiffres, sources — **la matière du pilote** |
| `etudes/2026-08-btp-travaux-publics/export.json` | Les 14 acteurs BTP en JSON normé |
| `prompts/cartographie-concurrentielle/assets/matrice-concurrentielle.html` | **Le modèle technique du générateur SVG** — structure, tokens, thème clair/sombre |
| `prompts/cartographie-concurrentielle/04-controle-qualite.md` | Les règles de sourcing et de contrôle à appliquer |

### Requêtes utiles pour démarrer

```sql
-- Les 12 comptes du BTP avec leur segment et leurs attributs
select c.name, s.name as segment, c.modele_eco, c.tier, c.relation_type, c.revenue, c.employee_count
from companies c
join sector_intelligence s on s.id = c.segment_id
where s.parent_id = (select id from sector_intelligence where slug='btp-construction-immobilier')
order by s.name, c.name;

-- L'arbre complet macro → segment → nombre de comptes
select coalesce(p.name, s.name) macro, case when s.level='segment' then s.name end segment, s.slug,
       (select count(*) from companies c where c.segment_id = s.id) nb
from sector_intelligence s left join sector_intelligence p on p.id = s.parent_id
order by macro, s.level desc, s.name;
```

---

## 10. Ce qu'il ne faut surtout pas produire

- Un **poster** : quatorze schémas magnifiques que personne n'ouvre. Le schéma sert en rendez-vous ou il n'existe pas.
- Un **schéma exhaustif** de la filière construction mondiale. Cinq à sept maillons, sur le périmètre Kredo.
- Un **dessin figé** impossible à régénérer.
- Une **modélisation générique** sans acteurs réels dessus : c'est le contraire de l'objectif.
- Un **schéma sans niveau de confiance** : il finira dans les mains d'un prospect qui connaît sa filière mieux que nous.
