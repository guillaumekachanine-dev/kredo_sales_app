# 11 — Variantes du master process

> **Une variante n'est jamais une méthode allégée : c'est un périmètre réduit sur la même
> méthode.** Les axiomes, les gates et les schémas de sortie sont identiques. Ce qui change,
> ce sont les étapes exécutées, le nombre de comptes et le budget de recherche.
>
> Si une variante devait assouplir un axiome pour tenir dans son budget, c'est le budget qui
> est faux, pas l'axiome.

---

## Tableau de décision

| Variante | Quand | Étapes | Comptes | Durée | Prompt |
|---|---|---|---|---|---|
| **V0 — Master Study** | Nouveau segment, ou refonte à 24 mois | E0→E7 | 10-14 | 2 j + 0,5 j humain | `E4` + `E5` |
| **V1 — Tier d'un compte** | On travaille un compte, on veut son voisinage direct | E0 E1 E5' E7 | 3-5 | 4 h | `V1-tier-du-compte.md` |
| **V2 — Compte unique** | Préparation d'un rendez-vous nommé | E0 E2 E5'' E7 | 1 (+3 concurrents) | 2 h | `V2-compte-unique.md` |
| **V3 — Mise à jour trimestrielle** | Tous les 3 mois sur un secteur étudié | E2 E5''' G1 E7 | tous les prioritaires | 30 min/compte | `V3-mise-a-jour.md` |
| **V4 — Rafraîchissement annuel** | À 12 mois : chiffres et catégories | E2 E4' E5 E7 | tous | 1 j | `E4` + `E5` en mode diff |
| **V5 — Chaîne de valeur seule** | Secteur déjà cartographié, chaîne manquante | E6 | — | 4 h | `E6-chaine-de-valeur.md` |

---

## V1 — Analyse limitée au tier d'un compte

**Le besoin** : un commercial travaille un compte. Il n'a pas besoin de la carte des 14
acteurs du segment — il a besoin des **trois à cinq acteurs du même tier**, ceux avec qui son
interlocuteur se compare réellement.

**Ce qui change**
- Le périmètre d'entrée n'est pas un segment mais **un compte + son `tier`** (`grand_compte` /
  `eti` / `pme`, colonne de la migration 068).
- La longlist est filtrée : mêmes `segment_id` et même `tier`, plus les acteurs hors
  portefeuille de ce tier issus d'une cartographie existante.
- E4 n'est **pas rejoué** : la connaissance sectorielle est lue en base (résolution
  segment → macro). Si elle est absente, V1 est refusée — c'est G0.
- Les fiches sont produites en **blocs B3 + B4 + B5 seulement**. B1 est reçu de E2, B2 est lu
  depuis `account_facts`.

**Ce qui ne change pas** : le plancher de preuve, la formule d'appétence /35, l'obligation de
la couche B4 sur les comptes prioritaires, les gates.

**Sortie** : un `05-comptes.json` partiel, ingéré par le même wizard, avec
`meta.variante = "tier"` et `meta.compte_pivot` renseigné.

**Valeur réelle** : c'est la variante qui sert le plus souvent, parce qu'elle répond à la
question posée en revue de pipeline — *« qui d'autre je peux ouvrir avec le même discours ? »*

---

## V2 — Analyse concentrée sur un seul compte

**Le besoin** : un rendez-vous dans huit jours.

**Ce qui change**
- Un seul compte étudié en profondeur, **plus une demi-page sur ses trois concurrents
  directs** — c'est cette demi-page qui crédibilise le discours en rendez-vous, et elle n'est
  pas optionnelle.
- E2 est **obligatoire** et exécuté en premier : identité, échéances de son segment, intensité
  SI. Sans lui, la fiche est une page de généralités.
- La couche B4 est renseignée à 100 %, y compris par qualification humaine — c'est le cas
  d'usage où les 45 minutes se justifient sans discussion.
- E4 n'est pas rejoué : la connaissance sectorielle est lue.

**Sortie supplémentaire** : une **battle card d'une page**, le seul format qu'un commercial lit
réellement avant un rendez-vous, et un rappel des trois formulations de la chaîne de valeur si
le secteur en a une (E6 §4.4).

**Contrôle spécifique** : la question G3 devient *« est-ce que j'entre en rendez-vous avec
ça ? »*. Un « non vérifié » sur le canal d'achat rend la variante inutile — c'est précisément
ce qu'on est venu chercher.

---

## V3 — Mise à jour trimestrielle

**Le besoin** : les triggers et les chantiers technologiques périment en trois mois. La
segmentation, non.

**Ce qui change**
- **Entrée : le JSON de la version précédente.** On ne demande que le **différentiel**.
- Trois blocs seulement sont rejoués : `trigger_events`, `chantiers_observes`, et la composante
  `moment` de l'appétence.
- Le score est **recalculé**, jamais réécrit à la main : seule `moment` bouge, mais elle compte
  double, donc le classement peut changer — et c'est l'information.
- 30 minutes par compte prioritaire.

**Sortie** : un **tableau des changements**, qui est en soi un excellent support de réunion
commerciale mensuelle. C'est le livrable le plus lu de tout le dispositif pour un coût
marginal.

**Contrôle** : G1 uniquement, sur l'invariant « aucun trigger de plus de 12 mois ne subsiste »
et « le classement recalculé est cohérent avec les composantes ».

**Automatisable** : partiellement. Quand E2 est branché sur France Travail et les marchés
publics, la moitié de V3 devient un cron — et c'est le meilleur retour sur investissement du
socle déterministe.

---

## V4 — Rafraîchissement annuel

À 12 mois : les chiffres financiers ont été republiés, les catégories ont pu bouger, la couche
ESN est périmée.

- E4 est rejoué **en mode différentiel** sur les sections 2.1, 2.7 et 2.8 (économie,
  chronologie, risques). Les sections 2.2 à 2.5 (modèles, chaîne, fronts, dépendances) ne
  bougent qu'à 24 mois, sauf rupture déclarée.
- E5 est rejoué intégralement : la segmentation est revue, les scores recalculés.
- Toute recatégorisation est **justifiée en une ligne** contre la version précédente.

---

## V5 — Chaîne de valeur seule

E6 exécuté sur un secteur déjà cartographié. Conditions de lancement en `09-ETAPE-E6…` §5.
C'est la seule variante qui n'exige ni E3 ni E4 : elle les consomme.

---

## Ce qui reste identique dans toutes les variantes

| Élément | Pourquoi c'est non négociable |
|---|---|
| Les 12 axiomes | Ce sont eux qui rendent deux runs comparables |
| Le plancher de preuve (A7) | Une variante rapide qui score un compte inconnu produit un faux classement, pas un classement approximatif |
| La formule /35 et les notes 1/3/5 | Deux échelles différentes rendraient les variantes incomparables entre elles |
| Le format de sortie et les schémas | L'ingestion est la même pour toutes |
| G1 | C'est un script, il ne coûte rien à rejouer |
| L'estampillage et la péremption calculée | Un livrable non daté pourrit en silence |

**Ce qui peut légitimement sauter** : G2 (red team) sur V2 et V3, à condition que le verdict
soit `usable_with_caveats` et jamais `production_ready`. G3 ne saute jamais — c'est la variante
la plus rapide qui a le plus besoin d'un œil humain, parce que c'est celle qui part le plus
vite en rendez-vous.
