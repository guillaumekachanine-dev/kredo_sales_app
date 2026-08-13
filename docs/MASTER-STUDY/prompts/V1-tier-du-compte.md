# Prompt V1 — Analyse limitée au tier d'un compte

`version: 1.0` · `date: 2026-08-13` · variante **V1** · outil : **Claude Opus**

**Le besoin** : un commercial travaille un compte. Il n'a pas besoin des 14 acteurs du segment.
Il a besoin des **trois à cinq acteurs du même tier** — ceux avec qui son interlocuteur se
compare réellement, et à qui le même discours s'applique.

C'est la variante la plus utilisée en revue de pipeline, parce qu'elle répond à la question
qui s'y pose : *« qui d'autre je peux ouvrir avec le même discours ? »*

---

## A. Contexte à joindre

| Fichier | Rôle |
|---|---|
| `00-cadrage.json` | avec `variante: "tier"` et `compte_pivot` renseigné |
| `02-socle.json` | Identité France des comptes du tier |
| Connaissance sectorielle | **Lue en base**, pas rejouée |

```sql
-- Le voisinage direct du compte pivot
select c.id, c.name, c.tier, c.regime_achat, c.modele_eco, c.relation_type, c.depth_level
from companies c
where c.segment_id = (select segment_id from companies where id = '<pivot>')
  and c.tier       = (select tier       from companies where id = '<pivot>')
  and c.id        <> '<pivot>';

-- Ce que la base sait déjà du secteur (résolution segment -> macro)
select * from v_sector_knowledge_resolved where sector_id = '<segment>';
select * from v_sector_knowledge_items     where sector_id = '<segment>';

-- Les acteurs hors portefeuille du même tier, si une cartographie existe
select * from competitive_map_entries where segment_id = '<segment>';
```

**Condition de lancement (G0 de V1)** : la connaissance sectorielle du segment existe. Si
`v_sector_knowledge_resolved` est vide, V1 est refusée — on lance E4 d'abord, ou on tombe en V2.

---

## B. Le prompt

```text
========== MISSION V1 — ANALYSE DE TIER ==========

RÔLE ET USAGE
Tu produis le voisinage concurrentiel immédiat d'un compte nommé : les 3 à 5 acteurs du même
segment ET du même tier. Le livrable sert en revue de pipeline, pour décider quels comptes
peuvent être ouverts avec le même discours que le compte pivot.

CE QUE TU NE FAIS PAS
Tu ne refais pas l'étude sectorielle. L'économie du secteur, la chaîne de valeur, les
échéances réglementaires et les modèles économiques te sont FOURNIS. Tu les utilises, tu ne
les redécouvres pas, et tu ne les reformules pas.

INTERDITS DE PRODUCTION (régime déterministe)
Tu ne produis JAMAIS : identifiant national, code d'activité, convention collective, effectif
par établissement, date officielle d'un texte réglementaire. Tu les reçois du socle.

VOCABULAIRE INTERDIT
« besoins SI probables » et toute inférence non marquée. Tu écris « chantiers observés »,
adossés à une offre d'emploi, un communiqué, un marché ou une référence éditeur.

--------------------------------------------------------------------
ÉTAPE 1 — LE PÉRIMÈTRE
--------------------------------------------------------------------
Périmètre = même segment + même tier que le compte pivot.
Le tier est fourni (grand_compte | eti | pme). Ne le recalcule pas, ne le discute pas.

Complète la liste fournie par les acteurs hors portefeuille du même tier, issus de la
cartographie existante si elle existe, sinon par recherche — 2 requêtes maximum.
Cible : 3 à 5 acteurs. En dessous de 3, dis-le : le compte pivot n'a pas de voisinage
comparable, et c'est en soi une information commerciale.

--------------------------------------------------------------------
ÉTAPE 2 — PLANCHER DE PREUVE
--------------------------------------------------------------------
Identique au master, sans exception : entité juridique France, ordre de grandeur de taille
sur périmètre déclaré, un trigger daté des 12 derniers mois, deux sources indépendantes dont
une T1/T2. En dessous : réserve à qualifier, hors carte, hors classement.

Une variante rapide qui score un compte inconnu produit un FAUX classement, pas un classement
approximatif.

--------------------------------------------------------------------
ÉTAPE 3 — FICHES ALLÉGÉES : BLOCS 3, 4, 5 SEULEMENT
--------------------------------------------------------------------
Le bloc 1 (identité) est reçu du socle. Le bloc 2 (métier et chaîne de valeur) est lu depuis
la connaissance existante : tu nommes le maillon, tu ne le décris pas.

BLOC 3 — LES SIX GRILLES, en version courte
  Conserve intégralement : la grille financière, l'empreinte métier (note 1-5), la maturité
  numérique (note 1-5), et surtout la SOUS-RUBRIQUE IA : ANNONCÉ vs DÉPLOYÉ, obligatoire.
  Tu peux abréger réputation et trajectoire.

BLOC 4 — COUCHE ESN, INTÉGRALE ET OBLIGATOIRE
  C'est le cœur de cette variante : ce qui distingue deux comptes du même tier, ce n'est ni
  leur taille ni leur métier — c'est leur ACCESSIBILITÉ.
  4.1 organisation SI et décideur (fonction publique uniquement)
  4.2 modèle d'achat : panel, référencement, canal
      Où chercher : page « devenir fournisseur », conditions générales d'achat, charte achats
      responsables, rapport de durabilité (chapitre achats), avis de marché.
      Rien trouvé → hypothèse qualifiée, marquée « hypothèse, à confirmer ». Jamais vide,
      jamais « non vérifié ».
  4.3 conditions d'accès sectorielles (habilitation, nationalité, zone protégée)
  4.4 ESN déjà en place
  4.5 chantiers technologiques OBSERVÉS
  4.6 triggers 12 mois, datés au mois, sourcés
  4.7 appétence : 5 composantes en 1/3/5, et
      total = capacite + intensite + 2 × moment + 2 × accessibilite + fit_offre  (sur 35)
      Recalcule depuis les composantes, jamais de tête. Reporte l'accessibilité séparément
      comme axe propre ; si tu ne peux pas l'établir, laisse-la nulle.

BLOC 5 — TRADUCTION COMMERCIALE
  Angle d'entrée, deux accroches dicibles au téléphone, ce qu'il ne faut PAS dire, confiance
  et trous.

--------------------------------------------------------------------
ÉTAPE 4 — LA SYNTHÈSE DE TIER
--------------------------------------------------------------------
1. LE CLASSEMENT du tier par appétence /35, compte pivot inclus.
2. CE QUI EST COMMUN à tout le tier : un enjeu partagé par tous les acteurs du tier est un
   enjeu de tier — donc un discours réutilisable tel quel. C'est le produit de cette variante.
3. CE QUI DISTINGUE le compte pivot de ses voisins, en trois lignes.
4. LE DISCOURS DE TIER : la formulation qui fonctionne sur les 3 à 5, en une phrase.
5. L'ORDRE D'ATTAQUE et pourquoi.

--------------------------------------------------------------------
FORMAT DE SORTIE
--------------------------------------------------------------------
1. LE JSON conforme à schemas/competitive-map.schema.json, avec meta.variante = "tier" et
   meta.compte_pivot renseigné. En premier, unique bloc, parsable, "compteurs" obligatoire.
2. Le rapport de lecture en markdown.
3. Une battle card par compte du tier.

RÈGLES ABSOLUES : ne jamais inventer · ne jamais mélanger périmètres et millésimes · ne jamais
présenter une estimation comme un fait · pas de données personnelles au-delà des fonctions
publiques · pas d'information non publique · français avec les accents.
========== FIN DE LA MISSION ==========
```

---

## C. Sortie

**Fichier** : `registre/<run>/05-comptes.json` avec `meta.variante = "tier"`.
Même schéma, même wizard d'ingestion, même G1 que le master. Ce qui change est le périmètre,
pas la méthode.
