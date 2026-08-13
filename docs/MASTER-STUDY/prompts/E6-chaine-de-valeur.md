# Prompt E6 — Chaîne de valeur

`version: 1.0` · `date: 2026-08-13` · étape **E6** · outil : **Claude Opus**

**Étape conditionnelle.** Ne pas lancer sans avoir vérifié les trois conditions de
`09-ETAPE-E6-CHAINE-DE-VALEUR.md` §5 : une étude concurrentielle livrée, des comptes KREDO sur
au moins trois maillons, et une couche transverse portant une échéance datée.

---

## A. Contexte à joindre

| Fichier | Rôle |
|---|---|
| `04-secteur.json` | §maillons — le découpage vient de là, il ne se réinvente pas |
| `05-comptes.json` | Les acteurs cartographiés et leurs positions |
| Export SQL des comptes KREDO | **Tous macros confondus** — c'est là que se produit la découverte |

```sql
select c.id, c.name, c.relation_type, c.tier, si.name as segment, sim.name as macro
from companies c
left join sector_intelligence si  on si.id = c.segment_id
left join sector_intelligence sim on sim.id = si.parent_id
where c.depth_level <> 'mapped'
order by 5, 4;
```

---

## B. Le prompt — à copier tel quel

```text
========== MISSION E6 — MODÉLISATION DE CHAÎNE DE VALEUR ==========

RÔLE
Tu modélises la chaîne de valeur d'une filière, de l'amont à l'aval, pour qu'elle devienne un
OUTIL DE DÉCOUVERTE en rendez-vous commercial.

CE QUE C'EST, ET CE QUE CE N'EST PAS
Ce n'est pas un support de présentation. Le commercial ne le projette pas et ne le commente
pas : il le pose sur la table, à l'endroit, entre lui et son interlocuteur, et il se tait.
La règle du rendez-vous est « celui qui parle en premier a perdu » — le prospect corrige
toujours, et ce qu'il corrige est l'information qu'on est venu chercher.

Conséquence directe sur ce que tu produis : le schéma doit être ASSEZ PRÉCIS POUR ÊTRE
CORRIGÉ. Un schéma vague ne provoque aucune correction, donc ne produit aucune information.

RÈGLE ANTI-POSTER
Un maillon n'existe que s'il a AU MOINS DEUX acteurs nommés. Sinon il fusionne avec son
voisin. Un schéma à deux acteurs par maillon n'est pas une chaîne de valeur : c'est une
décoration, et un praticien du secteur le verra en dix secondes.

--------------------------------------------------------------------
ÉTAPE 1 — LES MAILLONS
--------------------------------------------------------------------
Reprends le découpage de 04-secteur.json §maillons. Tu peux le raffiner, jamais le réinventer :
s'il est faux, c'est l'étude sectorielle qu'il faut corriger, pas ce schéma.

Modèle : 5 slots de maillon maximum sur la chaîne principale, chacun pouvant porter jusqu'à
3 rangs (par exemple : 1·1 matériaux, 1·2 négoce).

Puis TROIS COUCHES TRANSVERSES, qui traversent tous les maillons :
   · PRESCRIPTEUR — régulateur, donneur d'ordre, normalisateur
   · FINANCEUR    — banques, fonds, financeurs publics
   · TECHNOLOGIE  — éditeurs, intégrateurs, plateformes

La couche prescripteur ne contient normalement AUCUN compte KREDO : on ne vend pas à un
régulateur. Mais c'est LA SEULE COUCHE DATÉE, donc celle qui porte le motif d'appel de tous
les autres maillons. Ne la néglige pas parce qu'elle n'est pas prospectable.

Pour chaque maillon, produis EN PLUS de sa description trois champs obligatoires :
   · maillons_cles        : ce qui se joue vraiment ici
   · dependances_critiques: de quoi ce maillon dépend, et qui pourrait le bloquer
   · points_vulnerabilite : où ça casse

--------------------------------------------------------------------
ÉTAPE 2 — LES ACTEURS
--------------------------------------------------------------------
Dans cet ordre, et l'ordre compte :

  1. LES COMPTES KREDO, TOUS MACRO-SECTEURS CONFONDUS.
     C'est ici que se produit le résultat le plus précieux de cette étape. Sur le pilote BTP,
     douze comptes de la filière n'étaient pas dans le macro BTP : douze comptes déjà
     qualifiés, invisibles dans toute lecture sectorielle. Cherche-les activement — un
     fabricant d'emballages peut appartenir à la filière parfumerie sans être classé
     « parfumerie ».
  2. LES ACTEURS DE 05-comptes.json, à leur maillon.
  3. LES ACTEURS MANQUANTS, hors portefeuille — CHACUN AVEC SA SOURCE.

  ⚠️ CONTRAINTE ABSOLUE : aucun acteur hors portefeuille sans source. Ce n'est pas une
  recommandation, c'est une contrainte de base de données (check company_id is not null or
  source is not null) et le générateur de schéma refuse de construire sans elle.

  Pour chaque acteur : nom, maillon, company_id si c'est un compte KREDO, source sinon,
  relation (client | prospect | pair_partenaire | hors_portefeuille), et confiance.
  Un acteur de confiance faible porte un marqueur : il ne sera JAMAIS cité en rendez-vous
  sans vérification.

--------------------------------------------------------------------
ÉTAPE 3 — LES DÉPENDANCES
--------------------------------------------------------------------
Chaque lien porte : maillon amont, maillon aval, nature (fournit | prescrit | finance |
outille), intensité de 1 à 3.
Ne trace que les dépendances STRUCTURANTES. Un schéma où tout dépend de tout n'informe rien.

--------------------------------------------------------------------
ÉTAPE 4 — LA CAPTATION DE VALEUR
--------------------------------------------------------------------
C'est le cœur du sujet, et le point faible connu de cet exercice.

Pour chaque maillon, indique où se trouve la marge — donc où se trouve le budget SI.
   · Si tu as une MARGE PUBLIÉE et sourcée : capture_valeur renseignée, confiance haute,
     capture_justification = le chiffre et sa source.
   · Si tu n'as qu'un raisonnement : capture_valeur renseignée, CONFIANCE FAIBLE, et
     capture_justification = le raisonnement, explicitement présenté comme tel.
   · Si tu n'as rien : capture_valeur = null. Une zone de captation sans justification est
     interdite par la base.

Sur le pilote BTP, une seule zone sur sept était adossée à un chiffre sourcé. Un directeur
financier du secteur voyait le trou en dix secondes. CHERCHE LES MARGES ACTIVEMENT : elles
sont publiées, secteur par secteur, par les fédérations et les observatoires.

--------------------------------------------------------------------
ÉTAPE 5 — LA LISTE DE PROSPECTION DÉDUITE
--------------------------------------------------------------------
Second livrable de cette étape, et souvent le plus utile.
Un tableau, trié par COUVERTURE CROISSANTE des maillons :
   priorité | maillon | comptes KREDO / acteurs du maillon | ce qui manque, nommé

Un maillon saturé où KREDO a peu de comptes n'est pas forcément une priorité : c'est peut-être
là que tout le monde se bat pour peu de marge. Croise avec l'étape 4 et dis-le.

--------------------------------------------------------------------
FORMAT DE SORTIE
--------------------------------------------------------------------
1. LE JSON conforme au schéma fourni, en premier, dans un unique bloc, parsable tel quel.
   "compteurs" obligatoire, avec l'invariant :
       acteurs_hors_kredo == acteurs_hors_kredo_sources
2. LA LECTURE DU SCHÉMA : trois observations qui sortent des données SANS interprétation —
   par exemple « ce maillon est saturé et pauvre », « la valeur est aux deux bouts »,
   « cette couche ne contient aucun compte et c'est normal ».
3. LA LISTE DE PROSPECTION DÉDUITE.

RÈGLES ABSOLUES
1. Aucun acteur hors portefeuille sans source.
2. Aucune zone de captation sans justification.
3. sector_id désigne le SUJET de la chaîne, jamais l'appartenance de ses acteurs. Un acteur
   positionné sur cette chaîne n'est PAS reclassé dans ce secteur.
4. Ne jamais inventer un acteur pour équilibrer un maillon.
5. Écrire en français, AVEC LES ACCENTS.
========== FIN DE LA MISSION ==========
```

---

## C. Sortie et rendu

**Fichiers** : `registre/<run>/06-chaine.json` · `06-prospection.md`
**Schéma** : `schemas/value-chain.schema.json`

```bash
python3 docs/FEATURES/sector_intelligence/chaine-de-valeur/build.py <secteur>
```

`build.py` **refuse de construire** si un acteur hors KREDO n'a pas de source, et affiche la
même alerte en rouge sous le schéma. C'est le seul contrôle qualité de ce corpus implémenté
dans l'outil de rendu.

**Le pilote reste un prototype tant qu'il n'a pas été montré à un compte client du secteur.**
C'est le seul test qui compte, et il est gratuit.
