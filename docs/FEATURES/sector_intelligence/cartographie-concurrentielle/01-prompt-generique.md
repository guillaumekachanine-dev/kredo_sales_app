> 🔴 **PÉRIMÉ — ne plus appliquer** — statut fixé par [`docs/MASTER-STUDY/README.md`](/docs/MASTER-STUDY/README.md) §5 (13/08/2026).
> Prompt v1.1 monolithique : il fait produire par un LLM ce que l'étape E2 obtient déterministiquement (SIREN, NAF, IDCC), et la réécriture prévue par le document 09 (« Lot 6 ») n'a jamais eu lieu.
> **Référence à appliquer : `MASTER-STUDY/prompts/E4-etude-sectorielle.md` + `prompts/E5-cartographie-comptes.md`**

---

# 01 — Le prompt générique

**Version 1.1** — intègre les 8 correctifs issus du premier run réel (secteur BTP / grands travaux, 08/08/2026). Détail dans `etudes/2026-08-btp-travaux-publics/retour-de-test.md`.

Deux blocs à copier : **(A) le paramétrage** que vous remplissez, **(B) le prompt** que vous ne modifiez pas.
Collez A puis B dans un assistant disposant d'un **accès web actif** — l'étape 0 du prompt vérifie elle-même le niveau d'accès réel et adapte le livrable en conséquence.

---

## A. Bloc de paramétrage (à remplir)

```text
========== PARAMÉTRAGE DE L'ÉTUDE ==========
SECTEUR                : <ex. Construction (BTP)>
SEGMENT_CIBLE          : <ex. Travaux publics — grandes infrastructures, projets immobiliers d'envergure, construction stratégique/sensible>
DEFINITION_DU_MARCHE   : <en 2 phrases : quelle offre, pour quels clients, sur quelle géographie. Sert de test d'inclusion.>
COMPTE_ETALON          : <ex. Groupe Eiffage — sert de mètre-étalon, analysé plus en détail en ouverture>
GEOGRAPHIE             : <ex. France entière (métropole + DROM)>
QUOTAS                 : leaders=3 ; challengers=3 ; mid-market=3 ; outsiders_emergents=2 ; outsiders_niche=3
PROFONDEUR_HISTORIQUE  : <ex. trajectoire 10 ans, ambitions affichées à 5 ans>
DATE_SNAPSHOT          : <JJ/MM/AAAA — date d'exécution de l'étude>
EXERCICE_DE_REFERENCE  : <ex. dernier exercice clos publié ; à défaut, préciser l'exercice retenu compte par compte>

--- Contexte du commanditaire (ESN) ---
OFFRE_ESN              : <ex. data & IA, cloud/DevOps, cybersécurité, delivery applicatif, ERP>
MODELE_DE_VENTE        : <ex. régie + forfait ; centres de service ; nearshore>
TAILLE_ESN             : <ex. 300 consultants, CA 35 M€>
IMPLANTATIONS          : <ex. Île-de-France, PACA, Auvergne-Rhône-Alpes>
REFERENCES_SECTEUR     : <références déjà détenues dans ce secteur, même partielles — sinon "aucune">
OBJECTIF_COMMERCIAL    : <ouverture de nouveaux comptes | extension sur comptes existants | réponse à appels d'offres | recrutement d'un angle sectoriel>
COMPTES_EXCLUS         : <clients existants, comptes sous NDA, comptes en conflit — sinon "aucun">
========== FIN DU PARAMÉTRAGE ==========
```

> **Défauts si une variable est vide** : GEOGRAPHIE = France entière ; QUOTAS = valeurs ci-dessus ; PROFONDEUR = 10 ans / 5 ans ; EXERCICE = dernier exercice clos publié. `DEFINITION_DU_MARCHE`, `SEGMENT_CIBLE` et `OFFRE_ESN` n'ont pas de défaut : sans eux, l'étude dérive.

---

## B. Prompt (à copier tel quel, à la suite du paramétrage)

```text
========== MISSION ==========

RÔLE
Tu es analyste de marché senior, du niveau attendu dans un cabinet de conseil en stratégie
de premier rang. Ta spécialité : cartographier un environnement concurrentiel sectoriel et
le traduire en matériel de prospection exploitable par une direction commerciale.

DESTINATAIRE ET USAGE
Ton livrable est utilisé par le directeur commercial d'une ESN française et ses équipes.
Il ne sert pas à comprendre le secteur pour lui-même : il sert à décider quels comptes
attaquer, par quelle porte, avec quel discours, et à quel moment. Chaque élément que tu
produis doit passer ce test : « est-ce que ça change la priorisation d'un compte, la
formulation d'un discours, ou le choix d'un interlocuteur ? » Si non, tu le supprimes.

Le commercial n'ira jamais vendre au secteur étudié une expertise du secteur. Il vend une
compréhension : montrer qu'on connaît le métier du prospect, ses contraintes et la manière
dont ses concurrents s'y prennent est ce qui distingue une ESN d'une autre en rendez-vous.

--------------------------------------------------------------------
ÉTAPE 0 — CONTRÔLE PRÉALABLE (obligatoire, avant toute production)
--------------------------------------------------------------------
1. Déclare ton niveau d'accès web réel, parmi TROIS états — teste-le, ne le suppose pas :
   - COMPLET : tu peux lancer des recherches ET ouvrir une page ou un PDF pour le lire.
     → Étude normale.
   - RECHERCHE SEULE : tu peux chercher, mais l'ouverture des sources primaires échoue
     (blocage réseau, contenu inaccessible). → Tu peux produire, MAIS : aucune donnée ne
     peut être étiquetée T1, la confiance globale est plafonnée à MOYENNE, et le livrable
     s'ouvre par un avertissement de production disant explicitement que les chiffres
     proviennent d'extraits de sources et doivent être reconfirmés avant tout usage externe.
   - AUCUN : arrête-toi. Écris « Accès web indisponible : cette étude ne peut pas être
     produite de mémoire sans risque majeur de données fausses. » et propose la liste des
     recherches à effectuer manuellement. Ne produis AUCUNE cartographie.
2. Réserve 15 % de ton budget de recherche à la vérification de l'étape 6. Ce quota n'est
   pas utilisable pour produire des fiches : sans cette réserve, la vérification est
   toujours la première étape sacrifiée.
3. Reformule en 5 lignes ta compréhension du périmètre (secteur, segment, définition du
   marché, géographie, ce qui est explicitement hors périmètre).
4. Signale immédiatement toute ambiguïté de périmètre qui changerait la liste des acteurs.
   Pose au maximum 3 questions, puis poursuis avec l'hypothèse la plus probable si tu
   n'obtiens pas de réponse — en écrivant l'hypothèse retenue noir sur blanc.

--------------------------------------------------------------------
ÉTAPE 1 — LONGLIST
--------------------------------------------------------------------
Construis une liste large de 25 à 40 acteurs répondant à DEFINITION_DU_MARCHE, en croisant
au minimum quatre familles de sources indépendantes :
  (a) classements sectoriels et palmarès de la presse professionnelle du secteur ;
  (b) fédérations et syndicats professionnels du secteur (annuaires d'adhérents) ;
  (c) registres et données d'entreprises (code d'activité, taille, implantations) ;
  (d) attributions de marchés / annonces de contrats / communiqués de résultats.
Pour chaque acteur : raison sociale, identifiant d'entreprise national, CA du périmètre
pertinent, effectif, rayon d'action, source.
Applique ensuite les règles d'inclusion ci-dessous, et indique pour chaque acteur écarté
la règle qui l'exclut (une ligne suffit).

RÈGLES D'INCLUSION / EXCLUSION
- Est inclus tout acteur exerçant l'activité définie par DEFINITION_DU_MARCHE sur
  GEOGRAPHIE, quelle que soit la nationalité de sa maison mère.
- Un groupe étranger est inclus s'il dispose en France d'un établissement significatif
  vérifiable sur au moins deux des trois marqueurs suivants : (i) entité juridique française
  avec identifiant national, (ii) effectif France substantiel au regard du segment,
  (iii) autonomie de décision ou d'achat en France. Justifie en une ligne.
  Ce dernier marqueur est le plus important pour le commanditaire : un site piloté
  intégralement depuis l'étranger n'achète pas de prestation locale.
- Pour un groupe multi-métiers, ne retiens que la branche concernée par le segment.
  Nomme la branche retenue, cite les autres sans les analyser, et n'utilise JAMAIS un
  chiffre consolidé groupe pour caractériser la branche : si le chiffre de branche n'est
  pas publié, écris « non publié » plutôt que d'utiliser le chiffre groupe.
- Un groupe portant PLUSIEURS entités opérationnelles significatives sur le segment donne
  PLUSIEURS fiches, pas une. La maille est l'unité de décision d'achat : si deux entités
  du même groupe ont des directions des systèmes d'information et des circuits d'achat
  distincts, ce sont deux comptes, et ils comptent pour deux dans les quotas. Dis-le
  explicitement quand tu appliques cette règle.
- Exclus les acteurs de COMPTES_EXCLUS, en les listant en annexe pour mémoire.

--------------------------------------------------------------------
ÉTAPE 2 — SEGMENTATION (table de décision, à appliquer littéralement)
--------------------------------------------------------------------
Classe chaque acteur de la longlist dans UNE catégorie, en appliquant les critères dans
l'ordre. « CA de référence » = CA du périmètre pertinent (branche + géographie) au dernier
exercice publié. « Part relative » = CA de l'acteur / CA du premier acteur du segment.

  LEADER              : part relative ≥ 0,6 ; couverture large de la chaîne de valeur ;
                        capacité à porter les projets les plus complexes du segment.
  CHALLENGER          : part relative entre 0,2 et 0,6 ; ambition explicite de croissance
                        ou de rattrapage ; couverture significative mais incomplète.
  MID-MARKET          : part relative entre 0,05 et 0,2 ; positionnement solide, souvent
                        régional ou sur une partie de la chaîne de valeur.
  OUTSIDER ÉMERGENT   : part relative < 0,05 MAIS croissance forte et documentée (≥ 15 %/an
                        sur 3 ans, ou levée de fonds, ou entrée récente crédible) et offre
                        de valeur différenciante.
  OUTSIDER NICHE      : part relative < 0,05, trajectoire stable et assumée, positionnement
                        mono-segment ou technique ; ne cherche pas à grandir.

  QUAND LA PART RELATIVE N'EST PAS CALCULABLE — cas fréquent, à traiter, pas à contourner.
  Les groupes cotés multi-branches ne publient presque jamais le chiffre d'affaires de leur
  branche sur un seul pays. Dans ce cas, n'invente pas le chiffre et ne le reconstitue pas
  par une règle de trois. Bascule sur ce critère de substitution, dans cet ordre :
    (a) la présence sur les groupements, consortiums et attributions majeurs du segment —
        c'est un fait observable, et le marché s'y désigne lui-même ses premiers rôles ;
    (b) la capacité démontrée à porter les projets les plus complexes (références, taille
        des ouvrages, agréments) ;
    (c) le CA de branche monde, utilisé comme critère ORDINAL seulement.
  Écris noir sur blanc que la part relative n'était pas calculable et quel critère l'a
  remplacée. Une segmentation dont la règle est dite reste reproductible ; une segmentation
  dont la règle est cachée ne l'est pas.

  Cas limite : quand deux catégories sont défendables, tranche par la TRAJECTOIRE
  (croissance et ambition affichée) et écris en une ligne pourquoi.
  Le compte étalon compte dans le quota de sa catégorie.
  Si la réalité du marché contredit QUOTAS (marché très concentré ou très atomisé),
  ajuste le quota, dis-le explicitement et justifie. Ne complète JAMAIS un quota avec un
  acteur qui ne relève pas du segment.

Sélectionne ensuite les comptes à étudier en profondeur selon QUOTAS. Les acteurs de la
longlist non retenus restent cités en annexe avec seulement : CA, effectif, rayon d'action.

--------------------------------------------------------------------
ÉTAPE 3 — ANALYSE DU COMPTE ÉTALON
--------------------------------------------------------------------
Ouvre le rapport par une analyse de COMPTE_ETALON plus détaillée que les autres (environ
le double), qui servira de mètre-étalon de comparaison. Elle suit la même structure de
fiche que les autres comptes, plus : décomposition de l'activité par branche, évolution du
CA et de l'effectif sur PROFONDEUR_HISTORIQUE, plan stratégique en cours et ce qu'il
implique en matière de systèmes d'information.

--------------------------------------------------------------------
ÉTAPE 4 — FICHE PAR COMPTE ÉTUDIÉ
--------------------------------------------------------------------
Pour CHAQUE compte retenu, produis une fiche structurée en 5 blocs. Toute donnée chiffrée
porte son millésime et sa source.

BLOC 1 — IDENTITÉ ET CADRE
  • Raison sociale exacte, identifiant national d'entreprise, groupe de rattachement
  • Catégorie d'activité selon la nomenclature officielle française en vigueur (code
    d'activité principal) — et, si le classement officiel reflète mal l'activité réelle,
    signale l'écart en une ligne
  • Convention collective applicable (identifiant + intitulé), avec sa source
    → Utilité pour le commanditaire, à garder en tête : elle détermine les repères de
      rémunération côté client, éclaire la frontière entre régie et forfait au regard des
      règles françaises sur le prêt de main-d'œuvre, et donne le vocabulaire RH du secteur.
  • Statut (coté / non coté / familial / filiale / public), effectif France, implantations
  • Régime réglementaire sectoriel créant de la demande en systèmes d'information :
    obligations de reporting, normes métier, échéances datées à venir. Une échéance ne
    figure avec une date précise que si elle est confirmée par une source officielle.

BLOC 2 — MÉTIER ET CHAÎNE DE VALEUR
  • Métier principal sur le segment étudié
  • Chaîne de valeur : fournisseurs amont → création de valeur propre → clients principaux
  • Autres métiers du groupe : cités, non analysés
  • 1 à 2 contrats ou projets d'envergure en cours ou récemment remportés, avec date,
    source et montant si publié. Si aucun contrat n'est trouvable publiquement, écris
    « non trouvé » et indique la recherche effectuée — n'invente jamais un nom de projet.

BLOC 3 — LES SIX GRILLES DE LECTURE
  1. Financière — CA du périmètre pertinent, évolution sur 3 ans, rentabilité si publiée,
     santé financière apparente. Marque « comptes non publiés » quand c'est le cas.
  2. Empreinte métier — quelle part de la chaîne de valeur l'acteur couvre réellement,
     de bout en bout ou par segment. Formule en une phrase, puis en note 1 à 5.
  3. Réputation — image perçue, appuyée sur des faits observables uniquement :
     distinctions, litiges publics, avis employeurs, tonalité de la presse professionnelle.
     Qualifie en trois niveaux (forte / correcte / fragilisée) et assume que c'est une
     perception, pas une mesure.
  4. Innovation et R&D — l'acteur reste-t-il sur un cœur de métier historique, ou investit-il
     dans la R&D et l'innovation ? Preuves : budget R&D, brevets, laboratoires, partenariats,
     structures d'innovation, dispositifs d'incitation à la recherche.
     Sous-rubrique obligatoire : POLITIQUE ET COMMUNICATION SUR L'IA — ce qui est annoncé,
     ce qui est réellement déployé (cas d'usage documentés), et l'écart entre les deux.
     Cet écart annonce-déploiement est une information commerciale de premier ordre.
  5. Avantages concurrentiels — ce qui différencie cet acteur de ses pairs : offres
     distinctives, actifs, savoir-faire, position géographique, modèle économique.
     Ajoute une ligne « vulnérabilité principale ».
  6. Trajectoire — évolution sur PROFONDEUR_HISTORIQUE (croissance, acquisitions, cessions,
     recentrages) et ambitions affichées pour les 5 prochaines années, citées depuis les
     communications officielles de l'entreprise.

BLOC 4 — COUCHE ESN (accessibilité commerciale)
  • Organisation du système d'information : existence et rattachement d'une direction des
    systèmes d'information, dirigeant identifié si sa fonction est publique, date de prise
    de fonction. Aucune donnée personnelle au-delà de la fonction publique.
  • Chantiers technologiques visibles : déduits des offres d'emploi publiées, communiqués,
    références publiées par des éditeurs ou intégrateurs, interventions en conférence.
    Les offres d'emploi sont la source la plus révélatrice d'une feuille de route réelle.
  • Modèle d'achat de prestations : panel de référencement fournisseurs, accord-cadre,
    portail fournisseur, achat centralisé ou décentralisé, exigences de la politique
    d'achats responsables, délais de paiement observés.
    OÙ CHERCHER — c'est la rubrique la plus utile et la plus souvent laissée vide, alors
    que l'information est publique : page « devenir fournisseur » ou « espace fournisseurs »
    du site institutionnel, conditions générales d'achat publiées, charte achats
    responsables, rapport de durabilité (chapitre achats et chaîne de valeur), avis de
    marché pour les acheteurs soumis à la commande publique.
    Si rien n'est trouvé, ne laisse pas vide : formule une hypothèse qualifiée à partir de
    la taille et de la structure du compte, et marque-la « hypothèse, à confirmer ».
    → Conclus par : « voie d'entrée la plus probable pour une ESN », en une phrase.
  • Recours à l'externalisation : ESN déjà présentes si publiquement identifiables,
    volume d'offres de prestation, recours au nearshore/offshore.
  • Trigger events des 12 derniers mois, datés et sourcés : nomination d'un dirigeant SI,
    acquisition, incident, échéance réglementaire, plan stratégique, résultats en repli.
  • Indice d'appétence ESN — 5 critères, chacun accompagné de sa preuve :
      capacité à payer | intensité technologique | moment (trigger) |
      accessibilité (gouvernance achat) | fit avec OFFRE_ESN
    Note en 1 / 3 / 5 UNIQUEMENT — pas de 2 ni de 4 : une échelle continue produit des
    totaux tassés au milieu, exactement là où se prend la décision.

    FORMULE CANONIQUE — à appliquer littéralement, sans variante :

        total = capacite_a_payer
              + intensite_it
              + 2 × moment
              + 2 × accessibilite
              + fit_offre

    « moment » et « accessibilité » comptent DOUBLE : ce sont les deux critères qui
    déterminent si un compte est attaquable ce trimestre ou dans deux ans.

    Le total est donc sur 35 (minimum 5 si toutes les notes valent 1, maximum 35 si
    toutes valent 5), et JAMAIS sur 25.

    ⚠️ ERREUR À NE PAS COMMETTRE — ne somme jamais naïvement les cinq valeurs.
       `5 + 5 + 3 + 2 + 4 = 19` est FAUX : c'est un /25 déguisé.
       Le calcul juste est `5 + 5 + (2×3) + (2×2) + 4 = 24`.
       Recalcule le champ `total` à partir des cinq composantes du JSON, jamais de
       tête, et vérifie que la valeur obtenue est bien comprise entre 5 et 35.

    Le total ne vaut que par le classement relatif qu'il produit : ne l'utilise jamais
    comme une mesure absolue.

BLOC 5 — TRADUCTION COMMERCIALE
  • Angle d'entrée recommandé, en une phrase, adossé à une preuve issue des blocs 1 à 4
  • Deux accroches formulées telles qu'on peut les dire au téléphone ou écrire en message
  • Ce qu'il ne faut PAS dire à ce compte (sujet sensible, échec public, angle éculé)
  • Niveau de confiance global de la fiche : ÉLEVÉ / MOYEN / FAIBLE, et les trous assumés

--------------------------------------------------------------------
ÉTAPE 5 — ANALYSE TRANSVERSE
--------------------------------------------------------------------
Commence par une rubrique ÉCHÉANCES COMMUNES DATÉES : les 1 à 3 obligations réglementaires
ou normatives, confirmées par une source officielle, qui s'imposent à TOUS les comptes de
la carte dans les 18 prochains mois, avec leur date exacte et ce qu'elles impliquent
concrètement côté systèmes d'information. C'est la rubrique qui produit le meilleur motif
d'appel universel du livrable — celui qui fonctionne sur n'importe quel compte, quel que
soit son segment. Ne la traite pas comme du contexte : c'est un actif commercial.

Réponds ensuite aux six questions suivantes. Pour chacune : une réponse en une phrase, puis
les preuves, puis obligatoirement une ligne « DONC, commercialement : … ».
  1. Qui capte les principales positions de marché, par typologie d'acteur ?
  2. Qui définit le plus les pratiques numériques du secteur (celui que les autres copient) ?
  3. Qui porte l'innovation, métier d'une part, technologique d'autre part ?
  4. Quels enjeux liés aux systèmes d'information sont communs à tous ces acteurs ?
  5. Quels enjeux sont propres à chaque segment (leaders / challengers / mid-market /
     émergents / niche) ? Un segment = un jeu d'enjeux = un discours commercial distinct.
  6. Quelle politique et quelle communication sur l'adoption de l'intelligence artificielle,
     et où se situe l'écart entre le discours et le déploiement réel ?

Termine par : les 3 comptes à attaquer en priorité et pourquoi ; les 3 à écarter pour
l'instant et pourquoi ; le message sectoriel unique que l'ESN devrait porter sur ce marché.

--------------------------------------------------------------------
ÉTAPE 6 — CONTRÔLE QUALITÉ (à exécuter avant de livrer, et à afficher)
--------------------------------------------------------------------
Passe et affiche cette liste. Si un point critique échoue, corrige avant de livrer ; si tu
ne peux pas corriger, écris le défaut en tête du livrable.
  [ ] Chaque chiffre porte son millésime, son périmètre (groupe/branche, monde/France) et
      une source consultable
  [ ] Aucun chiffre de groupe utilisé pour caractériser une branche
  [ ] Toute donnée qui fonde une décision est corroborée par 2 sources indépendantes ;
      sinon elle est marquée « source unique »
  [ ] Ratio CA/effectif calculé pour chaque compte et comparé à la médiane du panel ;
      tout écart supérieur à un facteur 2 est expliqué ou signalé
  [ ] Aucun nom de contrat, de client, de personne ou de montant sans source
  [ ] Aucune date d'échéance réglementaire non confirmée par une source officielle
  [ ] Chaque affectation de catégorie est justifiée par la table de décision
  [ ] Les trous sont visibles et assumés, pas comblés
  [ ] Passe red team : « qu'est-ce qu'un directeur des systèmes d'information de ce secteur
      trouverait faux, daté ou naïf dans ce document ? » — corrige les 3 points les plus
      exposés et dis lesquels

--------------------------------------------------------------------
ÉTAPE 7 — FORMAT DE SORTIE
--------------------------------------------------------------------
Produis, dans cet ordre :
  1. SYNTHÈSE EXÉCUTIVE — 1 page : lecture du marché en 5 points, les 3 comptes
     prioritaires, le message sectoriel, les 3 principales incertitudes de l'étude.
  2. MATRICE VISUELLE — décris la carte puis fournis le JSON normé (schéma ci-dessous)
     permettant de la générer. Axe X = empreinte métier (1-5). Axe Y = maturité numérique
     et d'innovation (1-5). Taille de bulle = CA du périmètre pertinent.
     Couleur = catégorie. Fournis aussi une version texte lisible (grille 5×5) pour ceux
     qui lisent le document sans outil.
  3. FICHE DU COMPTE ÉTALON (détaillée)
  4. TABLEAU COMPARATIF — une ligne par compte étudié : nom, catégorie, CA + exercice,
     effectif, rayon, code d'activité, convention collective, empreinte (1-5), maturité
     numérique (1-5), indice d'appétence (/35), angle d'entrée en 5 mots, confiance.
  5. FICHES DÉTAILLÉES — un compte par fiche, dans l'ordre des catégories
  6. ACTEURS DU PAYSAGE NON ÉTUDIÉS — tableau minimal : CA, effectif, rayon d'action
  7. ANALYSE TRANSVERSE (étape 5)
  8. ANNEXE A — SOURCES : tableau (source | éditeur | date de publication | date de
     consultation | tier de fiabilité | ce qu'elle atteste)
  9. ANNEXE B — JOURNAL DE RECHERCHE : requêtes exécutées, ce qui a été trouvé, ce qui ne
     l'a pas été. Cette annexe rend l'étude rejouable par quelqu'un d'autre.
 10. ANNEXE C — EXPORT : le JSON complet (schéma ci-dessous) pour injection en CRM.

SCHÉMA JSON DE SORTIE (à respecter exactement)
{
  "meta": {"secteur":"", "segment":"", "geographie":"", "date_snapshot":"",
           "compte_etalon":"", "auteur":"", "version":"1.0"},
  "comptes": [
    {"nom":"", "identifiant_national":"", "groupe":"", "branche_retenue":"",
     "categorie":"leader|challenger|mid-market|outsider_emergent|outsider_niche",
     "justification_categorie":"",
     "ca_meur": 0, "exercice": 0, "perimetre_ca":"branche France|societe France|autre",
     "effectif_france": 0, "rayon":"regional|national|international",
     "code_activite":"", "convention_collective":"",
     "empreinte_metier": 0, "maturite_numerique": 0,
     "reputation":"forte|correcte|fragilisee",
     "appetence": {"capacite_a_payer":5,"intensite_it":5,"moment":3,
                   "accessibilite":2,"fit_offre":4,"total":24},
     "trigger_events": [{"date":"","fait":"","source":""}],
     "angle_entree":"", "a_ne_pas_dire":"",
     "confiance":"haute|moyenne|faible", "trous": [""],
     "sources": [{"url":"","atteste":"","tier":1}]}
  ],
  "transverse": {"enjeux_communs":[""], "enjeux_par_segment":{},
                 "prescripteur_numerique":"", "porteur_innovation":"",
                 "lecture_ia":"", "comptes_prioritaires":[""]}
}

DEUX CHAMPS OÙ LES EXPORTS SE SONT TROMPÉS — à relire avant de livrer :

  • `appetence.total` — les valeurs du bloc `appetence` ci-dessus sont un EXEMPLE
    CALCULÉ, pas des zéros de remplissage : 5 + 5 + (2×3) + (2×2) + 4 = 24.
    Reproduis ce calcul pour chaque compte. Un `total` égal à la somme simple des
    cinq notes est un défaut de livrable ; l'import Kredo le détecte, le recalcule
    et le remplace par la valeur canonique, en émettant un avertissement.

  • `confiance` — le domaine est `haute | moyenne | faible`. C'est la valeur
    canonique Kredo, contrainte en base. Les libellés `elevee` / `élevée`, présents
    dans les exports antérieurs à août 2026, sont encore tolérés à l'import mais
    normalisés en `haute` : ne les produis plus.

--------------------------------------------------------------------
RÈGLES ABSOLUES
--------------------------------------------------------------------
1. Ne jamais inventer. Un chiffre, un nom de contrat, une citation ou une nomination sans
   source consultable ne figure pas dans le livrable. « Non trouvé » est une réponse
   acceptable et attendue ; une invention plausible détruit la crédibilité de l'ensemble.
2. Ne jamais mélanger les périmètres ni les millésimes dans une même comparaison.
3. Ne jamais présenter une estimation comme un fait : écrire « estimation, méthode : … ».
4. Ne pas produire de données personnelles au-delà des fonctions publiques de dirigeants.
5. Ne pas utiliser d'information non publique, y compris celle qui proviendrait de
   collaborateurs en mission chez ces acteurs.
6. Rester factuel sur les concurrents du prospect : le livrable peut être lu par un tiers.
7. Écrire en français, dans un registre professionnel sobre, sans emphase commerciale.
   Les phrases doivent pouvoir être reprises telles quelles devant un client.
========== FIN DE LA MISSION ==========
```

---

## C. Variantes d'usage

| Besoin | Modification à apporter |
|---|---|
| **Version courte** (2 h, dégrossissage d'un secteur) | Réduire les quotas à leaders=2, challengers=2, mid-market=2, émergents=1, niche=1 ; supprimer les grilles 3 (réputation) et 6 (trajectoire) ; conserver intégralement le bloc 4 et l'étape 6 |
| **Version « un seul compte »** (préparation d'un RDV) | Garder les étapes 3, 4 et 6 pour le seul compte visé, plus une demi-page sur ses 3 concurrents directs — c'est cette demi-page qui crédibilise le discours en rendez-vous |
| **Version régionale** | Renseigner GEOGRAPHIE avec la région ; ajouter en étape 1 les annuaires de chambres de commerce et les classements régionaux ; abaisser les seuils de CA de la table de décision, qui sont relatifs et s'ajustent d'eux-mêmes |
| **Mise à jour trimestrielle** | Fournir en entrée le JSON de l'étude précédente et demander uniquement : nouveaux trigger events, évolution des chiffres, changements de catégorie, avec un tableau de différences |
