# 02 — Méthode opératoire reproductible

Objectif de ce document : que **deux personnes différentes, lançant l'étude sur le même secteur à la même date, aboutissent à la même segmentation et aux mêmes comptes prioritaires**. C'est le seul test valable de reproductibilité.

Durée totale : **6 à 9 heures** pour une étude complète (14 comptes étudiés), dont environ 2 heures d'intervention humaine réelle si l'assistant fait le gros du travail de recherche.

---

## Vue d'ensemble

| Phase | Objet | Time-box | Budget recherche | Critère de sortie |
|---|---|---|---|---|
| 0 | Cadrage et paramétrage | 20 min | 0-2 requêtes | Le bloc de paramétrage est rempli et la définition du marché tient en 2 phrases non ambiguës |
| 1 | Longlist | 45 min | 6-10 requêtes | 25 à 40 acteurs, chacun avec identifiant, CA, effectif, source |
| 2 | Segmentation | 30 min | 2-4 requêtes | Chaque acteur classé, chaque affectation justifiée par la table de décision |
| 3 | Compte étalon | 45 min | 6-8 requêtes | Fiche double-longueur, trajectoire sur 10 ans documentée |
| 4 | Approfondissement des comptes | 3-4 h | 3-6 requêtes/compte | 14 fiches en 5 blocs, aucune rubrique vide sans mention explicite |
| 5 | Analyse transverse | 45 min | 2-4 requêtes | 6 questions traitées, chacune avec sa ligne « DONC, commercialement » |
| 6 | Contrôle qualité | 45 min | 2-6 requêtes de vérification | Scorecard passée, aucun critère critique en échec |
| 7 | Mise en forme et diffusion | 30 min | 0 | 10 blocs de sortie produits, JSON valide, matrice générée |

**Budget total : 30 à 45 requêtes.** En dessous de 25, l'étude est nécessairement de mémoire. Au-delà de 60, on tombe dans la recherche sans fin : ce qui n'est pas trouvé au bout de 3 tentatives ciblées est marqué « non trouvé », c'est une information en soi.

---

## Phase 0 — Cadrage

Trois décisions déterminent tout le reste. Prenez-les explicitement, ne les laissez pas à l'assistant.

**1. La définition du marché.** C'est le test d'inclusion de tous les acteurs. Elle doit répondre à : *quelle offre, pour quels clients, sur quelle géographie*. Contre-exemple à éviter : « le BTP » (trop large : 400 000 entreprises, aucune segmentation utile). Exemple utilisable : « la conception et la réalisation d'ouvrages d'infrastructure et de bâtiment de plus de 50 M€, pour des maîtres d'ouvrage publics ou de grands comptes privés, en France ».

**2. Le compte étalon.** Choisissez un acteur que vous connaissez déjà un peu (un client, un ancien prospect, un compte sur lequel vous avez une référence). L'étalon sert à calibrer : si la fiche de l'étalon vous paraît juste, vous pouvez faire confiance aux autres ; si elle est fausse sur ce que vous savez déjà, arrêtez l'étude et corrigez la méthode.

**3. L'objectif commercial.** Il oriente le bloc 4 : ouvrir des comptes neufs privilégie l'accessibilité et les triggers ; répondre à des appels d'offres privilégie le référencement et les canaux d'achat ; étendre sur l'existant privilégie les chantiers technologiques visibles.

> **Point de contrôle** : si vous ne savez pas dire en une phrase ce que vous ferez du livrable lundi matin, ne lancez pas l'étude.

---

## Phase 1 — Longlist

La qualité de toute l'étude dépend de la longlist : un acteur oublié à cette étape ne réapparaît jamais.

**Ordre d'attaque des sources** (détail dans `03-sources.md`) :
1. **Classements de la presse professionnelle du secteur** — c'est le raccourci le plus rentable, ces palmarès sont annuels et déjà classés par CA.
2. **Fédérations professionnelles** — leurs annuaires d'adhérents donnent la queue de distribution que les classements ignorent (les mid-market et les niches).
3. **Registres d'entreprises par code d'activité** — pour vérifier les identifiants, les effectifs et repérer les acteurs absents des deux premières sources.
4. **Attributions de marchés et communiqués** — pour repérer les entrants récents et les acteurs étrangers implantés.

**Règle des quatre familles** : un acteur qui n'apparaît que dans une seule famille de sources doit être vérifié spécifiquement avant d'entrer dans la shortlist. C'est souvent soit un doublon (filiale d'un acteur déjà listé), soit une entreprise homonyme.

**Format de sortie de la phase** : un tableau brut, non commenté. Nom | identifiant | CA + exercice | effectif | rayon | source | inclus O/N | motif d'exclusion.

---

## Phase 2 — Segmentation

Appliquez la table de décision du prompt **littéralement**, dans l'ordre des critères. C'est ce qui rend l'étude reproductible : sans seuils, la segmentation devient une opinion.

**Le calcul de la part relative** : CA de l'acteur ÷ CA du premier acteur du segment, tous deux sur le même périmètre (branche + géographie) et le même exercice. Si les deux chiffres ne sont pas comparables, la part relative n'est pas calculable : classez alors par un critère qualitatif documenté (capacité à porter les projets majeurs, présence sur les appels d'offres de premier rang) et dites-le.

**Trois pièges récurrents** :
- *Le groupe qui écrase le segment* : un conglomérat dont la branche pertinente est modeste ne doit pas être classé leader parce que le groupe est gros. Le périmètre décide.
- *L'entrant médiatique* : une entreprise très visible dans la presse tech peut être minuscule sur le segment. C'est un outsider émergent, pas un challenger.
- *La filiale comptée deux fois* : vérifiez les identifiants nationaux, pas les noms commerciaux.

**Point de contrôle** : après la segmentation, relisez la liste des leaders. Si un praticien du secteur trouverait la liste surprenante, l'erreur est presque toujours dans le périmètre, pas dans les chiffres.

---

## Phase 3 — Compte étalon

Trois questions à traiter avec plus de profondeur que pour les autres comptes :
1. **Décomposition par branche** : quelle part de l'activité relève réellement du segment étudié ?
2. **Trajectoire sur 10 ans** : croissance organique ou par acquisition, recentrages, cessions. C'est ce qui révèle la logique stratégique de l'acteur, et donc ses besoins à venir.
3. **Plan stratégique en cours** : ce qu'il implique concrètement en matière de systèmes d'information. Un plan qui promet de doubler l'activité de maintenance implique une refonte des outils de terrain ; un plan qui promet de la décarbonation implique de la mesure, donc de la donnée.

**Point de contrôle de calibrage** : confrontez la fiche étalon à ce que vous savez déjà de ce compte. Chaque écart est un symptôme de la méthode, pas un accident.

---

## Phase 4 — Approfondissement

C'est la phase la plus longue ; elle se traite **compte par compte, jamais en parallèle**, sous peine d'homogénéisation (l'assistant produit alors des fiches interchangeables où seuls les noms changent).

**Séquence par compte, 3 à 6 requêtes** :
1. Une requête « identité » (registre d'entreprises) → blocs 1
2. Une requête « publications de l'entreprise » (résultats, plan stratégique, rapport annuel) → blocs 2, 3-1, 3-6
3. Une requête « presse professionnelle 12 derniers mois » → blocs 2 (contrats), 3-3, 4 (triggers)
4. Une requête « offres d'emploi et technologies » → bloc 4 (chantiers technologiques). **C'est la requête la plus rentable de toute l'étude** : les offres publiées révèlent la feuille de route réelle, à la différence des communiqués qui révèlent la feuille de route souhaitée.
5. Une requête « intelligence artificielle + nom de l'acteur » → bloc 3-4
6. Optionnelle : une requête de levée de doute sur un point contradictoire

**Discipline de l'écart annonce/déploiement** : notez systématiquement ce qui est *annoncé* (communiqués, interviews de dirigeants) et ce qui est *déployé* (offres d'emploi, références éditeurs, retours d'expérience en conférence). L'écart entre les deux est l'information la plus vendeuse de l'étude — un acteur qui communique massivement sur l'IA sans recruter un seul profil correspondant a un besoin, pas une solution.

---

## Phase 5 — Analyse transverse

Ne la déléguez pas à un résumé automatique des fiches : c'est ici que se crée la valeur qu'un commercial ne peut pas produire seul.

**Méthode** : pour chacune des six questions, alignez les 14 comptes sur une colonne, cherchez le motif récurrent, puis testez sa solidité en cherchant le contre-exemple. Un enjeu qui vaut pour 12 comptes sur 14 est un enjeu sectoriel ; un enjeu qui vaut pour 4 comptes est un enjeu de segment ; un enjeu qui vaut pour 1 compte est une caractéristique de ce compte.

**La ligne « DONC, commercialement » est obligatoire** et doit être écrite au niveau d'un commercial qui n'a pas lu le reste : « donc, face à un mid-market de ce secteur, on n'ouvre pas sur la transformation mais sur la mise en conformité, parce qu'ils n'ont pas d'équipe dédiée ».

---

## Phase 6 — Contrôle qualité

Voir `04-controle-qualite.md`. Cette phase n'est pas optionnelle et ne doit pas être exécutée par la même passe que la production : demandez explicitement à l'assistant de relire son propre livrable **en changeant de posture** (« tu es maintenant le directeur des systèmes d'information d'un des acteurs cartographiés, tu lis ce document »).

---

## Phase 7 — Mise en forme et diffusion

1. Générer la matrice avec `assets/matrice-concurrentielle.html` à partir du JSON.
2. Extraire les battle cards (gabarit dans `05-templates-livrables.md`) — une page par compte prioritaire, c'est le seul format que les commerciaux liront vraiment.
3. Injecter le JSON dans le CRM.
4. Estampiller : secteur, date de snapshot, version, auteur, date de péremption recommandée.
5. Diffuser en deux temps : la synthèse et la matrice à toute l'équipe, les fiches complètes aux seuls porteurs de comptes.

---

## Cadence de rafraîchissement

| Bloc d'information | Péremption | Action |
|---|---|---|
| Trigger events, nominations | 3 mois | Mise à jour trimestrielle, 30 min par compte prioritaire |
| Chantiers technologiques (offres d'emploi) | 3 mois | Même passage |
| Contrats et projets majeurs | 6 mois | Revue semestrielle |
| Chiffres financiers | 12 mois | Après publication des comptes du secteur |
| Segmentation, catégories | 12-18 mois | Étude complète rejouée |

**Mécanique de mise à jour** : fournir en entrée le JSON de la version précédente et ne demander que le différentiel. On obtient un tableau des changements, qui est en soi un excellent support de réunion commerciale mensuelle.

---

## Rôles et responsabilités

| Rôle | Qui | Charge |
|---|---|---|
| Commanditaire — cadre, arbitre le périmètre, valide | Directeur commercial | 1 h |
| Opérateur — exécute le prompt, itère, met en forme | Marketing, avant-vente ou business manager | 4-6 h |
| Relecteur métier — passe la scorecard, challenge | Un consultant ayant déjà travaillé dans le secteur, ou le commercial le plus expérimenté sur ce marché | 1 h |
| Utilisateurs | Commerciaux, business managers | 20 min de lecture, puis usage continu |

Le rôle de **relecteur métier** est celui qu'on saute en premier et celui qu'il ne faut jamais sauter : c'est la seule barrière qui attrape les erreurs plausibles, celles qu'aucune vérification de source ne détecte parce qu'elles sont correctement sourcées mais mal interprétées.
