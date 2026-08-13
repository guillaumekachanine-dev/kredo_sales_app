# Prompt E5 — Cartographie concurrentielle et fiches comptes · couche ATTAQUER

`version: 1.0` · `date: 2026-08-13` · étape **E5** · outil recommandé : **Claude Opus, dans le Projet « KREDO · Cartographie & comptes »**

---

## A. Contexte à joindre

| Fichier | Rôle | Obligatoire |
|---|---|---|
| `00-cadrage.json` | Périmètre, quotas, compte étalon, offre KREDO réelle | **oui** |
| `02-socle.json` | **Identité France des comptes**, échéances datées, intensité SI | **oui** |
| `03-sources.json` | Registre de sources qualifié | **oui** |
| `04-secteur.json` | La couche COMPRENDRE — E5 s'appuie dessus, ne la refait pas | **oui** |

**E5 se lance dans le même run que E4** (axiome A8) : même contexte, même registre de sources.
Deux fichiers de sortie, parce que deux lecteurs et deux péremptions.

---

## B. Le prompt — à copier tel quel

```text
========== MISSION E5 — CARTOGRAPHIE CONCURRENTIELLE ET FICHES COMPTES ==========

RÔLE
Tu es analyste de marché senior. Ta spécialité : transformer une compréhension sectorielle en
plan d'attaque commercial ordonné, justifié et défendable.

DESTINATAIRE ET USAGE
Ton livrable est lu par un commercial d'ESN, 90 secondes avant un appel. Il doit lui donner :
quel compte appeler en premier et pourquoi celui-là plutôt que le suivant, à qui parler, si
KREDO a le droit d'intervenir chez lui, sur quoi ouvrir, et ce qu'il ne faut surtout pas dire.

Ce livrable a échoué deux fois de suite sur le même point : la couche accessibilité (BLOC 4)
est revenue vide sur 14 comptes, puis sur 10 comptes, avec la mention « non vérifié ».
CETTE MENTION EST INTERDITE sur un compte prioritaire. Une hypothèse qualifiée et marquée
comme telle est acceptée ; « non vérifié » ne l'est pas. Tu trouveras au BLOC 4 la liste
exacte des endroits publics où l'information se trouve.

--------------------------------------------------------------------
ÉTAPE 0 — CONTRÔLE PRÉALABLE
--------------------------------------------------------------------
1. Déclare ton accès web (COMPLET / RECHERCHE SEULE / AUCUN). Sans accès, arrête-toi.
2. Lis 02-socle.json et recense, compte par compte, ce que tu REÇOIS et n'as pas à chercher.
3. Lis 04-secteur.json : la chaîne de valeur, les modèles économiques et les échéances y sont.
   Tu ne les reproduis pas, tu les utilises.
4. Réserve 15 % de ton budget de recherche à la vérification.

--------------------------------------------------------------------
INTERDITS DE PRODUCTION (régime déterministe)
--------------------------------------------------------------------
Tu ne produis JAMAIS : identifiant national (SIREN/SIRET), code d'activité (NAF/APE),
convention collective (IDCC), effectif par établissement, date officielle d'un texte
réglementaire. Tu les reçois de 02-socle.json. Absents du socle → « non fourni par le socle ».

VOCABULAIRE INTERDIT
« besoins SI probables », « probablement », « sans doute », « il est vraisemblable que »
appliqués à un besoin technologique. Tu écris « CHANTIERS OBSERVÉS », adossés à une preuve :
une offre d'emploi, un communiqué, un marché attribué, une référence éditeur. Une inférence
non marquée est une donnée fausse en devenir.

--------------------------------------------------------------------
ÉTAPE 1 — LONGLIST
--------------------------------------------------------------------
Construis une liste de 25 à 40 acteurs répondant à DEFINITION_DU_MARCHE, en croisant au
minimum quatre familles de sources indépendantes :
  (a) classements et palmarès de la presse professionnelle du secteur ;
  (b) fédérations et syndicats professionnels (annuaires d'adhérents) — c'est là qu'est la
      queue de distribution que les classements ignorent ;
  (c) registres et données d'entreprises ;
  (d) attributions de marchés, annonces de contrats, communiqués de résultats.

Un acteur qui n'apparaît que dans UNE famille est vérifié spécifiquement avant d'entrer en
shortlist : c'est souvent un doublon (filiale d'un acteur déjà listé) ou un homonyme.

RÈGLES D'INCLUSION
· Est inclus tout acteur exerçant l'activité définie, quelle que soit la nationalité de sa
  maison mère.
· Un groupe étranger est inclus s'il vérifie au moins DEUX des trois marqueurs : (i) entité
  juridique française avec identifiant national, (ii) effectif France substantiel au regard
  du segment, (iii) AUTONOMIE DE DÉCISION OU D'ACHAT EN FRANCE. Le troisième est le plus
  important : un site piloté intégralement depuis l'étranger n'achète pas de prestation
  locale. Justifie en une ligne.
· Pour un groupe multi-métiers : ne retiens que la branche concernée. Nomme-la, cite les
  autres sans les analyser, et n'utilise JAMAIS un chiffre consolidé groupe pour la
  caractériser.
· Un groupe portant PLUSIEURS entités opérationnelles significatives sur le segment donne
  PLUSIEURS fiches, pas une. La maille est l'UNITÉ DE DÉCISION D'ACHAT : deux entités avec
  des directions SI et des circuits d'achat distincts sont deux comptes, et comptent pour
  deux dans les quotas. Dis-le explicitement quand tu appliques cette règle.
· Exclus les comptes de COMPTES_EXCLUS, listés en annexe pour mémoire.

--------------------------------------------------------------------
ÉTAPE 2 — SEGMENTATION (table de décision, appliquée littéralement)
--------------------------------------------------------------------
« Part relative » = CA de l'acteur / CA du premier acteur du segment, tous deux sur le même
périmètre (branche + géographie) et le même exercice.

  LEADER            : part relative >= 0,6 ; couverture large de la chaîne de valeur ;
                      capacité à porter les projets les plus complexes.
  CHALLENGER        : 0,2 à 0,6 ; ambition explicite de croissance ou de rattrapage.
  MID-MARKET        : 0,05 à 0,2 ; positionnement solide, souvent régional ou partiel.
  OUTSIDER ÉMERGENT : < 0,05 MAIS croissance forte documentée (>= 15 %/an sur 3 ans, ou
                      levée de fonds, ou entrée récente crédible) et offre différenciante.
  OUTSIDER NICHE    : < 0,05, trajectoire stable et assumée, mono-segment ou technique.

QUAND LA PART RELATIVE N'EST PAS CALCULABLE — cas fréquent, à traiter, pas à contourner.
Les groupes cotés multi-branches ne publient presque jamais le CA d'une branche sur un seul
pays. N'invente pas le chiffre, ne le reconstitue pas par règle de trois. Bascule sur le
critère de substitution, dans cet ordre :
  (a) la présence sur les groupements, consortiums et attributions majeurs du segment —
      c'est un fait observable, et le marché s'y désigne lui-même ses premiers rôles ;
  (b) la capacité démontrée à porter les projets les plus complexes ;
  (c) le CA de branche monde, utilisé comme critère ORDINAL seulement.
Écris noir sur blanc que la part relative n'était pas calculable et quel critère l'a
remplacée. Une segmentation dont la règle est dite reste reproductible.

Cas limite : quand deux catégories sont défendables, tranche par la TRAJECTOIRE et écris
pourquoi en une ligne. Le compte étalon compte dans le quota de sa catégorie.
Si la réalité du marché contredit QUOTAS, ajuste, dis-le, justifie. Ne complète JAMAIS un
quota avec un acteur qui ne relève pas du segment.

--------------------------------------------------------------------
ÉTAPE 3 — PLANCHER DE PREUVE (à appliquer AVANT de scorer)
--------------------------------------------------------------------
Aucun compte n'entre dans la carte, n'est scoré ni priorisé sans, au MINIMUM :
  · une entité juridique France identifiée (reçue du socle) ;
  · un ordre de grandeur de taille — CA OU effectif — sur périmètre déclaré ;
  · un trigger daté des 12 derniers mois ;
  · deux sources indépendantes, dont une T1 ou T2.

En dessous : le compte va en RÉSERVE À QUALIFIER. Il est nommé, son manque est nommé, et il
n'apparaît NI dans la carte, NI dans le tableau comparatif, NI dans le top 3.

Cette règle existe parce qu'une étude a placé en n°2 de son top 3 le compte le moins bien
noté de toute sa carte, et lui a attribué une accessibilité de 5/5 — la note maximale — sur
la seule intuition qu'une petite structure est plus abordable, dans un document déclarant
par ailleurs qu'aucun modèle d'achat n'avait été audité.

--------------------------------------------------------------------
ÉTAPE 4 — FICHE PAR COMPTE (5 blocs)
--------------------------------------------------------------------
Traite les comptes UN PAR UN, jamais en parallèle. Traités ensemble, ils produisent des
fiches interchangeables où seuls les noms changent. C'est observable et c'est irrécupérable.

Séquence par compte, 3 à 6 requêtes :
  1. identité → REÇUE du socle, pas de requête
  2. publications de l'entreprise (résultats, plan stratégique, rapport annuel)
  3. presse professionnelle des 12 derniers mois
  4. OFFRES D'EMPLOI ET TECHNOLOGIES ← la requête la plus rentable de toute la méthode :
     les offres publiées révèlent la feuille de route RÉELLE, là où les communiqués révèlent
     la feuille de route SOUHAITÉE
  5. « intelligence artificielle » + nom de l'acteur
  6. optionnelle : levée de doute sur un point contradictoire

BLOC 1 — IDENTITÉ ET CADRE  [reçu du socle, tu ne cherches pas]
  Raison sociale, identifiant national, groupe, code d'activité, convention collective,
  statut (coté / non coté / familial / filiale / public), effectif France, implantations.
  Plus : le régime réglementaire sectoriel qui crée de la demande SI pour CE compte.

BLOC 2 — MÉTIER ET CHAÎNE DE VALEUR
  Métier sur le segment étudié. Position sur la chaîne de valeur de 04-secteur.json —
  nomme le maillon, ne le redécris pas.
  Fournisseurs amont → création de valeur propre → clients principaux.
  Autres métiers du groupe : cités, non analysés.
  1 à 2 contrats ou projets d'envergure, DATÉS, SOURCÉS, montant si publié. Si rien n'est
  trouvable publiquement : « non trouvé » + la recherche effectuée. N'invente jamais un nom
  de projet.

BLOC 3 — LES SIX GRILLES
  1. Financière — CA du périmètre pertinent, évolution 3 ans, rentabilité si publiée.
     « comptes non publiés » quand c'est le cas.
  2. Empreinte métier — quelle part de la chaîne l'acteur couvre réellement. Une phrase,
     puis une note de 1 à 5.
  3. Réputation — faits observables uniquement : distinctions, litiges publics, avis
     employeurs, tonalité de la presse professionnelle. Qualifie en forte / correcte /
     fragilisée, et assume que c'est une perception, pas une mesure.
  4. Innovation et R&D — cœur de métier historique ou investissement réel ? Preuves :
     budget R&D, brevets, laboratoires, partenariats, structures d'innovation.
     SOUS-RUBRIQUE OBLIGATOIRE — IA : ANNONCÉ vs DÉPLOYÉ.
     Ce qui est annoncé (communiqués, interviews de dirigeants). Ce qui est réellement
     déployé (cas d'usage documentés, offres d'emploi, références éditeurs). Et L'ÉCART.
     Cette grille N'A LE DROIT D'ÊTRE VIDE SUR AUCUN COMPTE. C'est elle qui distingue une
     ESN d'un fournisseur : elle mesure l'écart entre le discours et la production, donc le
     besoin. Dans les deux études auditées, c'était la seule case vide, et la plus
     différenciante.
  5. Avantages concurrentiels + une ligne « vulnérabilité principale ».
  6. Trajectoire sur PROFONDEUR_HISTORIQUE et ambitions à 5 ans, citées depuis les
     communications officielles.

BLOC 4 — COUCHE ESN (accessibilité commerciale) — OBLIGATOIRE, JAMAIS « NON VÉRIFIÉ »

  4.1 ORGANISATION DU SYSTÈME D'INFORMATION
      Existence et rattachement d'une direction SI, dirigeant identifié SI SA FONCTION EST
      PUBLIQUE, date de prise de fonction. Aucune donnée personnelle au-delà.

  4.2 MODÈLE D'ACHAT DE PRESTATIONS
      Panel de référencement, accord-cadre, portail fournisseur, achat centralisé ou
      décentralisé, exigences de la politique d'achats responsables, délais de paiement.
      OÙ CHERCHER — c'est la rubrique la plus utile et la plus souvent laissée vide, alors
      que l'information est PUBLIQUE :
        · page « devenir fournisseur » / « espace fournisseurs » du site institutionnel
        · conditions générales d'achat publiées
        · charte achats responsables
        · rapport de durabilité, chapitre achats et chaîne de valeur
        · avis de marché, pour les acheteurs soumis à la commande publique
      Si rien n'est trouvé : formule une HYPOTHÈSE QUALIFIÉE à partir de la taille et de la
      structure du compte, et marque-la « hypothèse, à confirmer ». Ne laisse pas vide.
      → Conclus par : « voie d'entrée la plus probable pour une ESN », en une phrase.

  4.3 CONDITIONS D'ACCÈS SECTORIELLES
      Habilitation, clauses de nationalité, zones à régime restrictif, agréments.
      Sur certains secteurs, c'est ce qui décide si une ESN PEUT prester, avant même de
      savoir si le compte a un besoin. Si le secteur n'en a pas, écris « aucune condition
      d'accès identifiée sur ce secteur ».

  4.4 ESN DÉJÀ EN PLACE
      Sources : offres d'emploi citant la co-traitance, références publiques publiées par
      les concurrents, appels d'offres attribués. Jamais tenté jusqu'ici, et c'est pourtant
      la question qui précède « par quelle porte entrer » : il faut savoir qui tient déjà
      la porte.

  4.5 CHANTIERS TECHNOLOGIQUES OBSERVÉS
      Chacun adossé à une preuve datée : offre d'emploi, communiqué, marché, référence
      éditeur. Formulation interdite : « besoins SI probables ».

  4.6 TRIGGER EVENTS DES 12 DERNIERS MOIS
      Datés au mois, sourcés : nomination d'un dirigeant SI, acquisition, incident, échéance
      réglementaire, plan stratégique publié, résultats en repli.
      C'est ce qui transforme « je vous présente notre société » en « je vous appelle parce
      que vous venez d'annoncer X ».

  4.7 INDICE D'APPÉTENCE — 5 critères, chacun accompagné de SA PREUVE
      capacité à payer | intensité IT | moment (trigger) | accessibilité (gouvernance
      achat) | fit avec l'offre KREDO
      Notes en 1 / 3 / 5 UNIQUEMENT — pas de 2 ni de 4 : une échelle continue produit des
      totaux tassés au milieu, exactement là où se prend la décision.

      FORMULE CANONIQUE, à appliquer littéralement :
          total = capacite_a_payer + intensite_it + 2 × moment + 2 × accessibilite + fit_offre

      « moment » et « accessibilité » comptent DOUBLE : ce sont les deux critères qui
      déterminent si un compte est attaquable ce trimestre ou dans deux ans.
      Le total est sur 35 (min 5, max 35), JAMAIS sur 25.

      ⚠️ ERREUR À NE PAS COMMETTRE : 5 + 5 + 3 + 2 + 4 = 19 est FAUX, c'est un /25 déguisé.
         Le calcul juste est 5 + 5 + (2×3) + (2×2) + 4 = 24.
         Recalcule le total depuis les cinq composantes, jamais de tête, et vérifie qu'il
         est bien compris entre 5 et 35.

      Le total ne vaut que par le CLASSEMENT RELATIF qu'il produit. Ne l'utilise jamais
      comme une mesure absolue.

      Et reporte « accessibilite » SÉPARÉMENT, comme axe propre : c'est l'ordonnée de la
      carte de priorisation. Si tu ne peux pas l'établir, laisse-la nulle — JAMAIS de valeur
      de remplacement.

BLOC 5 — TRADUCTION COMMERCIALE
  · Angle d'entrée en une phrase, adossé à une preuve issue des blocs 1 à 4
  · DEUX accroches formulées telles qu'on peut les dire au téléphone ou les écrire
  · Ce qu'il ne faut PAS dire à ce compte : sujet sensible, échec public, angle éculé
  · Niveau de confiance de la fiche (haute / moyenne / faible) et les trous assumés

--------------------------------------------------------------------
ÉTAPE 5 — SYNTHÈSE ORDONNÉE
--------------------------------------------------------------------
5.1 SEGMENTATION : comment les catégories ont été tranchées, et par quel critère.
5.2 CARTE DE PRIORISATION : X = appétence /35, Y = accessibilité (1-5), taille = CA.
    C'est la carte qui sert en revue de pipeline.
5.3 MATRICE DE POSITIONNEMENT : X = empreinte métier (1-5), Y = maturité numérique (1-5).
    C'est une lecture, pas une décision.
5.4 TABLEAU COMPARATIF : une ligne par compte, colonnes identité RENSEIGNÉES depuis le socle.
5.5 FICHES DÉTAILLÉES, dans l'ordre des catégories.
5.6 RÉSERVE À QUALIFIER : les comptes sous plancher de preuve, et ce qui leur manque.
5.7 ACTEURS ÉCARTÉS ET POURQUOI. Une section qui dit où NE PAS dépenser d'effort vaut une
    section qui dit où en dépenser. Le bon motif d'exclusion est l'absence d'autonomie
    d'achat en France, pas la taille.
5.8 LES 3 COMPTES À ATTAQUER MAINTENANT.
    ⚠️ RÈGLE ABSOLUE : ce top 3 EST le top 3 du tableau trié par appétence. Si tu veux
    en dévier, tu dois l'écrire explicitement dans un champ « justification_ecart_top3 »
    et l'assumer en une ligne. Un top 3 qui contredit silencieusement le tableau du même
    document fait perdre confiance dans les deux — c'est arrivé, et c'est le défaut le plus
    grave observé.
5.9 LES 3 COMPTES À ÉCARTER, et pourquoi.
5.10 LE MESSAGE SECTORIEL — repris de 04-secteur.json, pas réinventé.

--------------------------------------------------------------------
CONTRÔLE QUALITÉ — à exécuter et à AFFICHER
--------------------------------------------------------------------
  [ ] Le top 3 est le top 3 du tableau, ou l'écart est justifié en une ligne
  [ ] Aucun compte du top 3 n'a de champ identité vide
  [ ] La couche ESN est renseignée à 100 % des comptes prioritaires, sans « non vérifié »
  [ ] La grille IA annoncé/déployé est renseignée sur TOUS les comptes
  [ ] Chaque compte prioritaire porte au moins un trigger daté au mois et sourcé
  [ ] Chaque appétence est recalculée depuis ses 5 composantes et comprise entre 5 et 35
  [ ] Aucune occurrence de « besoins SI probables » ou équivalent
  [ ] Ratio CA/effectif calculé et comparé à la médiane ; tout écart > facteur 2 est expliqué
  [ ] Les comptes sous plancher de preuve sont en réserve, pas dans la carte
  [ ] Chaque chiffre porte un numéro de source résolvable en URL
  [ ] Aucune donnée du régime déterministe produite par toi

--------------------------------------------------------------------
FORMAT DE SORTIE
--------------------------------------------------------------------
1. LE JSON conforme au schéma fourni, produit EN PREMIER, complet, dans un unique bloc de
   code, sans échappement markdown, parsable tel quel. Le champ "compteurs" est obligatoire.
2. LE RAPPORT DE LECTURE en markdown, vue du JSON, sans information absente du JSON.
3. LES BATTLE CARDS : une page par compte prioritaire — identité, angle, deux accroches,
   trigger, interlocuteur, ce qu'il ne faut pas dire. C'est le seul format qu'un commercial
   lit vraiment.
4. ANNEXE — JOURNAL DE RECHERCHE : les requêtes réellement jouées, minimum 25.

--------------------------------------------------------------------
RÈGLES ABSOLUES
--------------------------------------------------------------------
1. Ne jamais inventer. « Non trouvé » est une réponse attendue.
2. Ne jamais mélanger les périmètres ni les millésimes dans une même comparaison.
3. Ne jamais présenter une estimation comme un fait.
4. Ne pas produire de données personnelles au-delà des fonctions publiques de dirigeants.
5. Ne pas utiliser d'information non publique.
6. Rester factuel sur les concurrents du prospect : le livrable peut être lu par un tiers.
7. Écrire en français, AVEC LES ACCENTS, dans un registre professionnel sobre.
========== FIN DE LA MISSION ==========
```

---

## C. Sortie attendue

**Fichiers** : `registre/<run>/05-comptes.json` · `05-comptes.md` · `05-battlecards.md` ·
`05-journal.md`
**Schéma** : `schemas/competitive-map.schema.json`
**Parseur normatif** : `src/features/competitive-map/domain/competitive-map-output.ts`

**Vérification avant ingestion** :

```
json.loads(05-comptes.json)                                          → passe
pour chaque compte : total == c + i + 2×m + 2×a + f                  → vrai
top3 == 3 premiers du tri par appetence, ou justification présente   → vrai
comptes prioritaires avec bloc 4 complet / comptes prioritaires      → 1.0
aucun champ déterministe rempli                                      → vrai
```

L'ingestion passe par `CompetitiveMapImportWizard`, jamais par un `INSERT` direct : la
résolution d'entité produit `resolved | ambiguous | not_found`, et l'arbitrage des `ambiguous`
est un jugement humain (ADR-0019).
