# Retour de test du prompt générique — run BTP / grands travaux

Run réel du 08/08/2026 · 24 requêtes de recherche · 5 tentatives d'ouverture de source primaire, toutes bloquées · 14 comptes cartographiés, 5 écartés.

---

## 1. Ce qui a fonctionné, avec la preuve

| Règle du prompt | Ce qu'elle a produit sur ce run |
|---|---|
| **Étape 0 — contrôle préalable** | A détecté immédiatement que l'environnement bloquait l'accès aux sources primaires. Sans elle, l'étude serait sortie avec la même apparence et un statut de fiabilité faussement élevé |
| **« Jamais un chiffre groupe pour une branche »** | A servi **trois fois** : Fayat (5,9 Md€ groupe tous métiers, dont matériel routier, contre 746 M€ pour le pôle travaux publics Razel-Bec) ; VINCI (41,3 % du CA groupe en France, part non transposable à la branche construction) ; Eiffage (agrégat « Travaux » ≠ branches Infrastructures + Construction). Sans cette règle, Fayat serait classé leader |
| **Test d'identité de l'entité** | A attrapé **ETPO**, qui est une filiale de Spie Batignolles depuis 2024 — il aurait été compté deux fois. A écarté **Eurovia** (intégré à VINCI Construction). A mis **Bessac** en réserve, un article de presse professionnelle le classant sous la rubrique VINCI |
| **Hiérarchie des tiers, règle T4** | A écarté les chiffres les plus vendeurs du corpus : « 30 à 50 % de presqu'accidents en moins », « port des EPI de 82 % à 97 % ». Tous issus de blogs d'éditeurs, sans étude source. C'est exactement le type de donnée qu'un DSI du secteur reconnaîtrait comme du contenu marketing |
| **Quota ajustable + justification** | A produit une **conclusion analytique réelle** : sur ce segment, il n'existe pas d'outsider émergent parmi les entreprises de travaux — les barrières à l'entrée l'interdisent. L'innovation à trajectoire ascendante est en amont, chez les matériaux. Un quota rigide aurait forcé deux faux positifs |
| **Requête « offres d'emploi »** | Annoncée comme la plus rentable de la méthode, confirmé : équipe Data & IA de ~20 personnes en recrutement chez VINCI Construction, poste Innovation et Digital chez NGE. Aucun communiqué ne dit ça |
| **Trigger events datés** | Ont produit les 3 comptes prioritaires. La nomination de la directrice de la transformation digitale de Colas au 01/05/2026 est, à elle seule, un meilleur motif d'appel que toute la partie analytique du rapport |

## 2. Ce qui a cassé, et le correctif

### F1 — L'étape 0 est binaire, la réalité a trois états ⚠ corrigé en v1.1
L'environnement autorisait la recherche mais bloquait l'ouverture des sources primaires. Le prompt ne prévoyait que « accès web oui / non », donc rien n'obligeait à déclarer ce cas intermédiaire — le plus dangereux, parce que l'étude *semble* sourcée alors qu'aucune donnée n'atteint le tier T1.
**Correctif** : trois états déclarés, et en mode « recherche seule », plafond de confiance à MOYENNE avec interdiction d'étiqueter une donnée T1.

### F2 — La table de décision suppose une donnée qui n'existe pas ⚠ corrigé en v1.1
La part relative se calcule sur un périmètre branche × France × exercice. **Aucun des trois leaders ne publie ce chiffre.** La règle de segmentation était donc inapplicable pour la catégorie la plus importante de la carte.
**Correctif** : un critère de substitution explicite est désormais prévu — la présence sur les groupements et attributions majeurs du segment, qui est un fait observable. Sur ce run, la composition du groupement retenu pour le génie civil des EPR2 (Vinci, Bouygues, Eiffage, puis NGE et Fayat) a segmenté le haut de marché plus finement que n'importe quel chiffre d'affaires.

### F3 — Le bloc le plus utile est le moins documentable ⚠ corrigé en v1.1
La couche ESN (modèle d'achat, panel de référencement, voie d'entrée) est ce qui distingue cette cartographie d'une étude de marché ordinaire. **Résultat du run : 0 compte sur 14 renseigné.** L'information existe pourtant (pages « devenir fournisseur », conditions générales d'achat, chartes achats responsables), le prompt ne disait simplement pas où chercher.
**Correctif** : liste de sources ajoutée, et à défaut, obligation de formuler une hypothèse qualifiée par la taille et la structure, marquée comme hypothèse.

### F4 — Rien ne tranchait le cas des groupes à plusieurs entités opérationnelles ⚠ corrigé en v1.1
Bouygues porte deux acteurs majeurs du segment, Bouygues Construction et Colas, avec des gouvernances numériques distinctes. Une fiche ou deux ? Le prompt ne disait rien ; j'ai produit deux fiches, ce qui porte la carte à 15 lignes pour 14 emplacements.
**Correctif** : la règle est désormais explicite — **on cartographie l'unité de décision d'achat**. Deux entités du même groupe avec des directions des systèmes d'information distinctes font deux fiches, et comptent pour deux dans le quota.

### F5 — Le budget de vérification se fait manger par la production ⚠ corrigé en v1.1
L'étape 6 prévoit des requêtes de vérification, mais sans budget réservé : à la fin du run, tout le budget était consommé par la production des fiches.
**Correctif** : 15 % du budget de recherche est désormais réservé à la vérification, et non utilisable en production.

### F6 — L'indice d'appétence discrimine mal ⚠ corrigé en v1.1
Cinq critères notés de 1 à 5 produisent des totaux tassés : sur ce run, 11 à 21 sur 25, avec sept comptes entre 16 et 19. Or c'est précisément dans cette zone que se prend la décision commerciale.
**Correctif** : notation en 1 / 3 / 5 uniquement (pas de 2 ni de 4), et pondération ×2 sur « moment » et « accessibilité » — les deux critères qui déterminent réellement si un compte est attaquable ce trimestre. Total sur 35.

### F7 — Le statut du compte étalon dans les quotas était ambigu ⚠ corrigé en v1.1
Le compte étalon compte désormais explicitement dans le quota de sa catégorie.

### F8 — L'échéance réglementaire commune manquait au niveau sectoriel ⚠ corrigé en v1.1
Le prompt demandait le cadre réglementaire compte par compte, mais pas au niveau du secteur — là où il est le plus utile. Sur ce run, **la facturation électronique au 01/09/2026 est le seul sujet qui permet d'ouvrir n'importe lequel des 14 comptes avec une échéance datée**, et elle n'est apparue qu'incidemment.
**Correctif** : rubrique dédiée en tête de l'analyse transverse.

### F9 — « 1 à 2 contrats d'envergure » n'est atteignable qu'en haut de marché *(non corrigé, limite assumée)*
Documenté pour les leaders (contrat SEDIF, lignes du Grand Paris Express, EPR2). Introuvable pour les mid-market et les acteurs de niche, qui ne communiquent pas et dont les marchés sont trop nombreux pour être suivis. La règle « écrire non trouvé » a joué correctement — mais un utilisateur pressé lira ces fiches comme moins riches alors qu'elles sont simplement moins bavardes. À surveiller lors du prochain run : ouvrir les avis d'attribution des marchés publics par attributaire résoudrait le problème, mais coûte plusieurs requêtes par compte.

## 3. Ce que le run dit du coût réel

| | Prévu par la méthode | Constaté |
|---|---|---|
| Requêtes | 30 à 45 | 24 recherches + 5 tentatives d'ouverture bloquées |
| Comptes cartographiés | 14 | 14 (+ 5 écartés documentés) |
| Rubriques non renseignées | « les trous sont visibles » | Modèle d'achat 0/14 · effectif France 4/14 · IDCC vérifié par entité 0/14 · contrats majeurs 4/14 |
| Confiance atteinte | ÉLEVÉE visée | **MOYENNE**, plafonnée par l'environnement |

**Conclusion sur la méthode** : elle tient. Les garde-fous ont tous servi au moins une fois, et deux d'entre eux (chiffre groupe/branche, identité de l'entité) ont empêché des erreurs qui auraient été invisibles à la relecture. Le point faible n'est pas la rigueur, c'est **la profondeur de la couche commerciale** : tant que le modèle d'achat n'est pas documenté, la cartographie dit qui viser mais pas par où entrer. C'est le chantier de la v1.2.

## 4. Ce qu'il faut faire avant d'utiliser ce rapport en clientèle

1. Rouvrir et lire les sources primaires des chiffres de la §5 du rapport — communiqués de résultats 2025 et rapports de gestion.
2. **Confirmer le groupement EPR2 par un acte** (avis d'attribution ou communiqué EDF). C'est le fait le plus structurant de la carte, et il n'est aujourd'hui adossé qu'à de la presse professionnelle.
3. **Vérifier l'échéance du 01/09/2026** sur la source officielle avant de la citer devant un prospect.
4. **Trancher l'actionnariat de Bessac** avant toute action commerciale.
5. Documenter les modèles d'achat des 3 comptes prioritaires — une demi-journée, et c'est ce qui transformera cette étude en plan d'attaque.
