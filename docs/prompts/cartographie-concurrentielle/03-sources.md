# 03 — Référentiel de sources

Ce référentiel est **sectoriellement neutre** : la colonne de droite indique comment l'adapter au secteur étudié. Les URL peuvent changer ; le nom de l'organisme et la nature de la donnée, non — c'est sur eux que repose la reproductibilité.

---

## Hiérarchie de fiabilité (les 4 tiers)

Cette hiérarchie est utilisée par la méthodologie de contrôle (`04-controle-qualite.md`) pour arbitrer les contradictions et calibrer le niveau de confiance.

| Tier | Nature | Exemples | Statut d'une donnée issue de ce tier |
|---|---|---|---|
| **T1** | Registres officiels, dépôts légaux, textes réglementaires | Registres d'entreprises et dépôts de comptes, journaux officiels français et européen, portails de marchés publics, autorité des marchés financiers, INSEE | **Fait**. Une seule source T1 suffit pour une donnée d'identité, de comptes déposés ou de texte réglementaire |
| **T2** | Publications de l'entreprise elle-même | Document d'enregistrement universel, rapport annuel, reporting de durabilité, communiqués de presse, plan stratégique, site institutionnel | **Fait déclaré**. Fiable sur les faits (chiffres, contrats, nominations), à traiter comme du discours sur les intentions et l'innovation |
| **T3** | Presse professionnelle et généraliste établie, études sectorielles, fédérations | Presse spécialisée du secteur, presse économique nationale, cabinets d'études, syndicats professionnels, analystes du marché des technologies | **Fait probable**. Une donnée décisive issue de T3 doit être corroborée par une seconde source indépendante |
| **T4** | Agrégateurs, sites d'avis, blogs, contenus produits par des fournisseurs, contenus générés par IA | Bases d'entreprises retraitées, avis employeurs, articles de blog d'éditeurs, comparateurs | **Indice**. Jamais suffisant seul. Utilisable pour orienter une recherche, jamais pour fonder une affirmation chiffrée |

**Règle de dégradation** : un chiffre repris par un site T4 en citant une source T1 vaut T1 **si et seulement si** on remonte à la source T1 et qu'on la cite. Sinon il reste T4. La reprise en chaîne est le principal vecteur de propagation d'erreurs sur les chiffres d'entreprises.

---

## Sources par type d'information

### 1. Identité juridique, financière et taille (T1)

| Ce qu'on cherche | Où | Remarques d'usage |
|---|---|---|
| Identifiant national, code d'activité, forme juridique, effectif, établissements | Base SIRENE de l'INSEE (données ouvertes, accessibles librement) ; Registre national des entreprises tenu par l'INPI | Le socle. Toujours partir de l'identifiant national, jamais du nom commercial : les homonymies et les filiales portant le nom du groupe sont la première cause d'erreur |
| Comptes annuels déposés (CA, résultat, effectif) | Dépôts au greffe, accessibles via les portails de données d'entreprises et les revendeurs de données légales | **Piège majeur** : depuis la loi Macron, les petites et moyennes entreprises peuvent demander la confidentialité de leurs comptes. Un CA introuvable n'est donc pas anormal — il se marque « comptes confidentiels », pas « non trouvé » |
| Actionnariat, liens capitalistiques, filiales | Registre national des entreprises, annonces légales (BODACC), documents d'enregistrement des sociétés cotées | Indispensable pour rattacher correctement une entité à un groupe |
| Sociétés cotées : comptes détaillés par branche, effectifs, plan stratégique | Document d'enregistrement universel déposé auprès de l'autorité des marchés financiers ; espace investisseurs du site de l'entreprise | **La source la plus riche de toute l'étude quand elle existe** : segmentation par branche et par géographie, facteurs de risque, feuille de route. Chercher directement « document d'enregistrement universel + nom de l'entreprise » |
| Événements de la vie des sociétés (cessions, procédures, changements de dirigeants) | BODACC, annonces légales | Utile pour détecter une fragilité avant d'investir du temps commercial |

### 2. Cadre réglementaire et social (T1)

| Ce qu'on cherche | Où | Remarques |
|---|---|---|
| Convention collective applicable et son identifiant | Legifrance (conventions collectives nationales) ; l'identifiant figure généralement sur les bulletins de paie et dans les accords d'entreprise publiés | Vérifier que la convention correspond à l'activité **réelle** et non au code d'activité déclaré : les deux divergent fréquemment |
| Nomenclature d'activité française en vigueur | INSEE (nomenclature d'activités françaises) | Le code déclaré peut être obsolète ou mal choisi ; le signaler plutôt que le corriger silencieusement |
| Textes et échéances réglementaires du secteur | Legifrance (droit français), EUR-Lex (droit européen), site du régulateur sectoriel compétent | **Aucune date d'échéance ne doit figurer dans le livrable sans confirmation sur une source de ce niveau.** C'est la règle de fiabilité la plus importante de l'étude : un prospect bien informé qui repère une échéance fausse cesse d'écouter |
| Accords d'entreprise publiés | Base nationale des accords collectifs | Source sous-utilisée : révèle l'organisation du travail, le télétravail, parfois les réorganisations en cours |

### 3. Activité, contrats et carnet de commandes (T1/T2/T3)

| Ce qu'on cherche | Où | Remarques |
|---|---|---|
| Marchés publics remportés (avis d'attribution) | BOAMP pour la France ; TED pour les marchés européens ; profils d'acheteurs des grands donneurs d'ordre publics | **Le moyen le plus fiable de documenter « 1 à 2 contrats d'envergure »** dans tout secteur exposé à la commande publique. Les avis d'attribution donnent l'attributaire, l'objet, le montant et la date |
| Contrats privés et projets majeurs | Communiqués de l'entreprise, presse professionnelle du secteur, rapports annuels (rubrique carnet de commandes) | Pour les secteurs peu exposés à la commande publique, c'est la seule voie. Toujours dater |
| Carnet de commandes, prises de commande | Communiqués de résultats trimestriels des groupes cotés | Meilleur indicateur avancé d'activité que le CA, qui est rétrospectif |

### 4. Trajectoire, innovation et technologie (T2/T3)

| Ce qu'on cherche | Où | Remarques |
|---|---|---|
| Feuille de route technologique réelle | **Offres d'emploi publiées** : site carrières de l'entreprise, plateformes d'emploi généralistes et cadres, réseaux professionnels | **La source la plus révélatrice et la plus sous-exploitée.** Une entreprise ment rarement dans une offre d'emploi : les technologies citées, les intitulés de poste et le volume de recrutement décrivent le SI réel et les projets en cours. Un décalage entre communication et recrutement est un signal commercial fort |
| Innovation, R&D, brevets | Bases de brevets nationale et européenne ; rapports annuels (budget R&D) ; dispositifs publics de soutien à la recherche et à l'innovation ; annonces de partenariats académiques | Le dépôt de brevets qualifie une R&D réelle par opposition à une communication d'innovation |
| Politique et déploiements d'intelligence artificielle | Communiqués et interviews de dirigeants (l'annonce) **croisés avec** les offres d'emploi et les références publiées par les éditeurs et intégrateurs (le déploiement) | Ne jamais retenir l'annonce seule. L'écart annonce/déploiement est une donnée en soi et doit être formulé comme tel |
| Partenariats technologiques et intégrateurs en place | Pages « références clients » et « études de cas » des éditeurs et des ESN concurrentes ; programmes partenaires ; interventions en conférences sectorielles | Renseigne à la fois la maturité technologique et le paysage concurrentiel côté fournisseurs |
| Levées de fonds, acquisitions | Bases de financement de start-up, presse économique, communiqués | Critère décisif pour la catégorie « outsider émergent » |

### 5. Marché, taille et dynamique sectorielle (T3)

| Ce qu'on cherche | Où | Remarques |
|---|---|---|
| Taille du marché, croissance, structure | Études sectorielles des cabinets spécialisés ; statistiques publiques sectorielles de l'INSEE ; notes de conjoncture des fédérations professionnelles | Les synthèses publiques et communiqués de presse des cabinets d'études suffisent le plus souvent : les rapports complets sont payants et rarement nécessaires pour cet usage |
| Classements et palmarès d'acteurs | Presse professionnelle du secteur (palmarès annuels), presse économique nationale | Le raccourci le plus rentable pour construire la longlist |
| Annuaires d'acteurs | Fédérations et syndicats professionnels du secteur ; chambres de commerce ; pôles de compétitivité et clusters régionaux | Indispensable pour ne pas rater les mid-market et les niches, absents des palmarès |
| Dynamique des dépenses technologiques | Analystes du marché des technologies ; syndicats professionnels du numérique ; baromètres publiés par les grandes ESN | Utile pour calibrer un discours, à ne jamais présenter comme un chiffre propre au compte |

### 6. Réputation et perception (T3/T4)

| Ce qu'on cherche | Où | Remarques |
|---|---|---|
| Image professionnelle | Tonalité de la presse professionnelle sur 12 mois, distinctions sectorielles, litiges et contentieux publics | Se limiter aux faits observables |
| Image employeur | Sites d'avis employeurs, classements employeurs, volume et ancienneté des offres non pourvues | T4 : indice de climat interne et de tension de recrutement, jamais une conclusion. Une entreprise qui n'arrive pas à recruter est un prospect ESN par définition |
| Engagement extra-financier | Reporting de durabilité, notations extra-financières, politique d'achats responsables | À vérifier au cas par cas selon le périmètre d'obligation applicable à l'entreprise et à l'exercice concerné, réglementation en cours d'évolution |

---

## Requêtes normalisées

À reprendre telles quelles en remplaçant les variables. Elles constituent le socle du journal de recherche et rendent l'étude rejouable.

```text
LONGLIST
  "classement | palmarès [SECTEUR] France [ANNÉE]"
  "[fédération professionnelle du SECTEUR] annuaire adhérents"
  "principaux acteurs [SEGMENT] France"
  "[SEGMENT] appel d'offres attribution [ANNÉE]"

IDENTITÉ
  "[ACTEUR] SIREN chiffre d'affaires effectif"
  "[ACTEUR] document d'enregistrement universel [ANNÉE]"
  "[ACTEUR] convention collective applicable"

ACTIVITÉ
  "[ACTEUR] contrat remporté [ANNÉE]"
  "[ACTEUR] carnet de commandes résultats [ANNÉE]"

TECHNOLOGIE (les deux requêtes les plus rentables de l'étude)
  "[ACTEUR] offres d'emploi [technologie / data / SI / cybersécurité]"
  "[ACTEUR] intelligence artificielle projet déploiement"

TRIGGERS
  "[ACTEUR] nomination directeur des systèmes d'information | DSI | CTO | CDO"
  "[ACTEUR] acquisition | plan stratégique | résultats [ANNÉE]"

RÉGLEMENTAIRE
  "réglementation [SECTEUR] France obligation [ANNÉE+1]"
  "[nom de la réglementation] échéance calendrier application"
```

**Discipline du journal** : chaque requête exécutée est consignée avec ce qu'elle a produit — **y compris quand elle ne produit rien**. Les recherches infructueuses sont ce qui permet à un relecteur de distinguer « donnée absente » de « recherche non faite », et c'est exactement la distinction qui protège de l'invention.

---

## Sources payantes : quand elles se justifient

Aucune n'est nécessaire pour produire l'étude. Elles font gagner du temps, pas de la fiabilité.

| Type | Apport réel | Vaut le coût si |
|---|---|---|
| Bases de données d'entreprises enrichies | Comptes, liens capitalistiques, scoring financier, export en masse | Vous produisez plus de 4 études par an, ou vous avez besoin d'exports pour le CRM |
| Bases d'intelligence commerciale (signaux, contacts) | Nominations, organigrammes, signaux d'achat | Votre équipe est en prospection sortante intensive |
| Études sectorielles de cabinets spécialisés | Taille de marché et prévisions robustes | Vous devez défendre un plan d'investissement sur le secteur en interne |
| Analystes du marché des technologies | Cadrage des dépenses et des tendances technologiques | Vous construisez une offre sectorielle, pas seulement une action commerciale |

**Priorité d'investissement, si budget limité** : une base de données d'entreprises d'abord (elle fiabilise l'identité et les comptes, qui sont le socle de tout le reste), l'intelligence commerciale ensuite.

---

## Cadre juridique et déontologique

Ces règles ne sont pas décoratives : elles protègent l'ESN, et leur respect est vérifiable par un tiers qui lirait le livrable.

1. **Données personnelles** — Se limiter aux fonctions publiques de dirigeants (mandataires sociaux, nominations communiquées). Ne pas constituer dans le livrable de base de contacts nominatifs : c'est un traitement de données personnelles distinct, qui relève du CRM et suppose une base légale, une information des personnes et une durée de conservation définie.
2. **Conditions d'utilisation** — Pas d'extraction automatisée massive sur des plateformes qui l'interdisent. La consultation manuelle d'offres d'emploi publiques est licite ; l'aspiration industrialisée d'un réseau professionnel ne l'est pas.
3. **Information non publique** — Aucune information obtenue par un consultant en mission chez un acteur cartographié ne doit entrer dans l'étude, même de mémoire, même reformulée. C'est une clause de confidentialité, et c'est le risque le plus concret dans une ESN.
4. **Secret des affaires** — Le livrable ne doit contenir que de l'information publiquement accessible ou légitimement reconstituée par recoupement de sources publiques.
5. **Réutilisation des sources** — Citer les auteurs des études reprises. Un extrait court et attribué relève de la citation ; la reproduction d'un tableau complet d'une étude payante, non.
6. **Circulation du document** — Le livrable est interne. Il commente nommément des entreprises : partez du principe qu'il finira un jour sous les yeux de l'une d'elles, et écrivez en conséquence. C'est aussi ce qui garantit sa qualité.
