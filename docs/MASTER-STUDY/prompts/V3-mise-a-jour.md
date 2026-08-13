# Prompt V3 — Mise à jour trimestrielle

`version: 1.0` · `date: 2026-08-13` · variante **V3** · outil : **Claude Opus**

**Le besoin** : les triggers et les chantiers technologiques périment en trois mois. La
segmentation, non. On ne rejoue donc que ce qui bouge.

**La sortie est un tableau des changements** — qui est, pour un coût marginal, le livrable le
plus lu de tout le dispositif : c'est le support de la réunion commerciale mensuelle.

---

## A. Contexte à joindre

| Fichier | Rôle |
|---|---|
| `05-comptes.json` **du run précédent** | La base de comparaison. Sans lui, ce n'est pas une mise à jour |
| `02-socle.json` **rafraîchi** | Échéances revalidées, intensité SI recomptée |

**Quand E2 est branché sur France Travail et les marchés publics, la moitié de V3 devient un
cron** — et c'est le meilleur retour sur investissement du socle déterministe.

---

## B. Le prompt

```text
========== MISSION V3 — MISE À JOUR TRIMESTRIELLE ==========

RÔLE ET USAGE
Tu produis le DIFFÉRENTIEL d'une cartographie existante, à trois mois. Le livrable est lu en
réunion commerciale mensuelle : ce qui compte est ce qui a CHANGÉ, pas ce qui est resté vrai.

CE QUE TU NE REJOUES PAS — et c'est la majeure partie du document
   · la segmentation et les catégories        (péremption 12 mois)
   · les chiffres financiers                  (péremption 12 mois)
   · l'économie du secteur, la chaîne, les modèles  (péremption 24 mois)
   · l'identité juridique                     (reçue du socle)
Tu les reprends TELS QUELS depuis le JSON précédent. Ne les reformule pas : une reformulation
crée un faux changement, et fait perdre du temps en réunion.

CE QUE TU REJOUES — trois blocs seulement
   1. TRIGGER EVENTS des 12 derniers mois
   2. CHANTIERS TECHNOLOGIQUES OBSERVÉS
   3. La composante « moment » de l'appétence

--------------------------------------------------------------------
ÉTAPE 1 — PURGE
--------------------------------------------------------------------
Retire tout trigger de plus de 12 mois. Un trigger périmé qui reste dans une carte donne un
motif d'appel qui fera perdre la face au commercial.

--------------------------------------------------------------------
ÉTAPE 2 — COLLECTE, 2 REQUÊTES PAR COMPTE PRIORITAIRE
--------------------------------------------------------------------
1. presse professionnelle des 3 derniers mois + nom du compte
2. offres d'emploi + nom du compte

Ne traite QUE les comptes prioritaires et ceux du top 5. Les autres gardent leur état.
30 minutes par compte, pas plus. Si tu ne trouves rien en 2 requêtes, écris « aucun changement
détecté » — c'est une information, pas un échec.

--------------------------------------------------------------------
ÉTAPE 3 — RECALCUL DU SCORE
--------------------------------------------------------------------
Seule la composante « moment » bouge. Mais elle compte DOUBLE, donc le classement peut changer
— et c'est exactement l'information qu'on cherche.

    total = capacite_a_payer + intensite_it + 2 × moment + 2 × accessibilite + fit_offre

Recalcule le total depuis les cinq composantes. Ne réécris jamais un total à la main.
Les quatre autres composantes sont reprises telles quelles, sauf si :
   · « intensite_it » : le socle a livré un nouveau comptage d'offres d'emploi → mets à jour
   · « accessibilite » : un changement de DSI ou de politique d'achat est documenté → mets à
     jour, et signale-le comme un changement majeur

--------------------------------------------------------------------
LE LIVRABLE — LE TABLEAU DES CHANGEMENTS
--------------------------------------------------------------------
C'est la sortie principale. Quatre sections :

1. NOUVEAUX TRIGGERS
   compte | date | fait | source | ce que ça ouvre commercialement

2. MOUVEMENTS DE CLASSEMENT
   compte | rang précédent | rang actuel | composante qui a bougé | pourquoi
   Un compte qui monte de trois rangs est le sujet numéro un de la réunion.

3. CHANTIERS TECHNOLOGIQUES NOUVELLEMENT OBSERVÉS
   compte | chantier | preuve datée | practice KREDO concernée
   Formulation interdite : « besoins SI probables ». On écrit ce qu'on observe.

4. CE QUI EST PÉRIMÉ ET RETIRÉ
   compte | trigger retiré | date d'origine
   Cette section a l'air anecdotique. Elle ne l'est pas : un commercial qui appelle sur un
   trigger de quinze mois perd sa crédibilité en une phrase.

Puis, en une ligne : LE COMPTE À APPELER CE MOIS-CI, et pourquoi celui-là.

--------------------------------------------------------------------
FORMAT DE SORTIE
--------------------------------------------------------------------
1. LE JSON complet et à jour (pas seulement le delta — le fichier doit rester autoportant),
   conforme à schemas/competitive-map.schema.json, avec meta.variante = "trimestriel" et
   meta.run_precedent renseigné. "compteurs" obligatoire.
2. LE TABLEAU DES CHANGEMENTS en markdown — c'est ce qui sera lu.

RÈGLES ABSOLUES : ne jamais inventer un trigger pour remplir · ne jamais produire un champ du
régime déterministe · toute donnée reprise du run précédent l'est à l'identique · français
avec les accents.
========== FIN DE LA MISSION ==========
```

---

## C. Contrôle

**G1 uniquement**, sur deux invariants :

```
aucun trigger de plus de 12 mois ne subsiste                     → vrai
pour chaque compte : total == c + i + 2×m + 2×a + f              → vrai
les champs non rejoués sont identiques au run précédent          → diff vide
```

Le troisième contrôle est le plus important : **un diff qui remonte des changements sur des
blocs non rejoués signale une reformulation**, pas une mise à jour. On redemande le JSON.
