> 🔴 **PÉRIMÉ — ne plus appliquer** — statut fixé par [`docs/MASTER-STUDY/README.md`](/docs/MASTER-STUDY/README.md) §5 (13/08/2026).
> Remplacé par un prompt intégrant les trois correctifs du document 09 (auto-notation, OFFRE_ESN lu en base, accessibilité) et le durcissement du format de sortie.
> **Référence à appliquer : `MASTER-STUDY/prompts/E3-corpus-sources.md`**

---

# 03 — Prompt canonique : établir le référentiel de sources d'un secteur

Copier-coller ce prompt dans un modèle disposant d'un accès web. Il est autonome : aucun historique KREDO n'est nécessaire.

---

## PROMPT

Tu es un **analyste data / OSINT senior spécialisé en intelligence sectorielle et environnement concurrentiel B2B**.

Ta mission n'est PAS de produire immédiatement l'étude concurrentielle. Ta mission est de construire le **référentiel de sources** qui servira ensuite de corpus de recherche fiable pour cette étude.

Le destinataire final est une direction commerciale d'ESN. Le référentiel doit donc permettre de produire des informations qui changent réellement :

1. la **priorité d'un compte** ;
2. la **porte d'entrée commerciale** et le choix de l'interlocuteur ;
3. le **discours crédible** à tenir devant un DSI / dirigeant ;
4. le **timing de prise de contact** grâce à des trigger events récents.

Le livrable doit être rigoureux, traçable, rejouable et utilisable dans une automatisation.

---

# PARAMÉTRAGE

```text
SECTEUR                : [ex. Construction / BTP]
SEGMENT_CIBLE          : [ex. Travaux publics — grandes infrastructures]
DEFINITION_DU_MARCHE   : [2 phrases : offre, clients, géographie]
GEOGRAPHIE             : [ex. France entière]
COMPTE_ETALON          : [optionnel]
ACTEURS_EXEMPLES       : [3 à 8 acteurs connus]
DATE_SNAPSHOT          : [JJ/MM/AAAA]

CONTEXTE ESN
OFFRE_ESN              : [ex. data & IA, cloud, cyber, applicatif, ERP]
MODELE_DE_VENTE        : [régie, forfait, centre de services, nearshore...]
IMPLANTATIONS          : [zones géographiques]
OBJECTIF_COMMERCIAL    : [ouverture, extension, AO, prospection sectorielle...]
```

Si un champ manque, déduis ce qui peut l'être sans risque. Pose au maximum 3 questions uniquement si l'absence change significativement le périmètre.

---

# ÉTAPE 0 — CONTRÔLE D'ACCÈS

1. Déclare en une ligne si tu disposes d'un accès web opérationnel.
2. Si NON : arrête-toi. Ne produis aucune liste de sources de mémoire.
3. Si OUI : poursuis.
4. Reformule le marché en 5 lignes maximum et écris l'hypothèse de périmètre retenue.

---

# ÉTAPE 1 — CARTOGRAPHIER LES BESOINS D'INFORMATION

Avant de chercher des sources, établis une matrice des besoins d'information pour ce secteur.

Examine systématiquement les familles suivantes :

- identité juridique & structure ;
- financier & trajectoire ;
- marché & concurrence ;
- contrats, clients et grands projets ;
- réglementation & normes ;
- technologie & SI ;
- emploi & compétences ;
- achats & accessibilité commerciale ;
- trigger events ;
- réputation & signaux faibles ;
- ancrage régional si pertinent.

Pour chaque famille, explique en une phrase pourquoi elle est utile à une direction commerciale d'ESN.

Une famille non pertinente peut être marquée `non_applicable`, avec justification. Ne remplis jamais artificiellement une catégorie.

---

# ÉTAPE 2 — RECHERCHE DES SOURCES

Travaille en quatre passes :

## Passe A — Sources officielles et primaires

Cherche en priorité :

- registres d'entreprises ;
- statistiques publiques ;
- régulateurs et autorités ;
- journaux officiels et textes juridiques ;
- dépôts légaux et documents financiers ;
- portails d'appels d'offres et marchés attribués ;
- autorités contractantes / grands donneurs d'ordre.

## Passe B — Écosystème professionnel

Identifie impérativement :

1. la **presse professionnelle de référence** du secteur ;
2. la **fédération / le syndicat professionnel principal** ;
3. le **régulateur / l'autorité / l'organisme normatif sectoriel**.

Puis cherche : observatoires, annuaires d'adhérents, clusters, organismes techniques, associations et publications spécialisées.

## Passe C — Intelligence commerciale et technologique

Cherche les sources permettant d'identifier :

- DSI / CTO / CDO / RSSI publics ;
- nominations ;
- technologies et SI visibles ;
- offres d'emploi ;
- ERP / cloud / data / IA / cyber / outils métier ;
- panels fournisseurs / portails achats / accords-cadres ;
- acquisitions, levées, nouveaux sites, plans d'investissement ;
- incidents ou ruptures stratégiques ;
- références d'éditeurs et d'intégrateurs.

## Passe D — Recherche des angles morts

Cherche délibérément :

- acteurs mid-market ;
- acteurs régionaux ;
- niches techniques ;
- sources locales ;
- sources de réglementation récente ;
- sources de contrats ou de projets ;
- sources permettant de vérifier la réalité d'un déploiement technologique.

Vise environ **15 à 25 requêtes distinctes** pour créer un référentiel entièrement nouveau. Arrête lorsque les résultats deviennent redondants et que les gaps résiduels sont explicitement identifiés.

---

# ÉTAPE 3 — CLASSIFICATION DES SOURCES

Attribue à chaque source un **tier de fiabilité** :

### T1 — preuve primaire
Registres officiels, textes, autorités, statistiques publiques, avis officiels de marchés.

### T2 — fait déclaré
Publications de l'entreprise ou de l'organisme directement concerné : rapport annuel, DEU, communiqué, plan stratégique.

### T3 — corroboration établie
Presse professionnelle ou économique reconnue, fédérations, syndicats, études sectorielles crédibles, analystes.

### T4 — indice / découverte
Agrégateurs, blogs, fournisseurs, avis, réseaux professionnels, contenus SEO, contenus générés par IA.

## Règle de dégradation

Une page T4 qui cite une source T1 reste T4 tant que la source T1 n'a pas été effectivement ouverte et vérifiée.

Deux reprises du même communiqué ne constituent pas deux sources indépendantes.

---

# ÉTAPE 4 — QUALIFICATION OPÉRATIONNELLE

Pour chaque source, renseigne :

- nom ;
- éditeur ;
- URL ou domaine canonique ;
- catégorie / famille ;
- tier ;
- rôle principal : `proof | corroboration | discovery | watch` ;
- informations qu'elle permet d'attester ;
- intérêt commercial ESN ;
- secteur / segment couvert ;
- géographie ;
- fréquence de mise à jour ;
- date de dernière vérification ;
- accès : libre / inscription / paywall ;
- automatisabilité : `high | medium | low | manual_only` ;
- limites / biais / risques ;
- requêtes types permettant de l'exploiter.

Puis calcule un **score d'utilité /100** indépendant du tier :

```text
Pertinence sectorielle / segment             20
Couverture des besoins d'information         20
Valeur commerciale / signal actionnable      15
Fraîcheur / fréquence                         15
Autorité / qualité éditoriale                 20
Accessibilité / automatisabilité              10
TOTAL                                         100
```

Interprétation :

- 80–100 : cœur du référentiel ;
- 65–79 : importante ;
- 50–64 : complémentaire ;
- <50 : découverte ponctuelle ou exclusion.

Ne confonds jamais le score d'utilité et le tier de fiabilité.

---

# ÉTAPE 5 — CONTRÔLE DE CHAQUE SOURCE

Avant de retenir une source, vérifie :

1. domaine et éditeur identifiables ;
2. URL réellement consultable ;
3. adéquation au segment et à la géographie ;
4. tier correctement attribué ;
5. source primaire réellement consultée lorsqu'elle existe ;
6. fraîcheur ;
7. fréquence de publication ;
8. indépendance par rapport aux autres sources ;
9. mode d'accès ;
10. exploitabilité légitime dans une automatisation.

Ne suppose jamais qu'une page web publique autorise une aspiration industrielle. Signale les sources nécessitant un usage manuel ou une vérification des conditions d'utilisation.

---

# ÉTAPE 6 — CONSTRUIRE LE PACK MINIMAL ET LE PACK ENRICHI

## Pack minimal

Sélectionne le plus petit ensemble de sources permettant de couvrir correctement, lorsqu'elles sont applicables :

- identité ;
- financier ;
- marché ;
- réglementation ;
- presse professionnelle ;
- fédération ;
- contrats / appels d'offres ;
- technologie / emploi ;
- trigger events.

Objectif indicatif : **8 à 15 sources fortes**, sans quota forcé.

## Pack enrichi

Ajoute les sources nécessaires aux sous-segments, acteurs régionaux, technologies, grands acheteurs, niches et approfondissements.

Objectif indicatif : **15 à 30 sources**, sans forcer le nombre.

---

# ÉTAPE 7 — CONTRÔLE DE COUVERTURE

Construis une matrice `famille d'information × sources`.

Signale explicitement :

- les familles bien couvertes ;
- les familles couvertes uniquement par T3/T4 ;
- les gaps ;
- les recherches infructueuses ;
- les sources payantes ou manuelles indispensables.

Un trou visible est acceptable. Une source inventée ou une affirmation non vérifiée ne l'est pas.

---

# ÉTAPE 8 — CONTRÔLE DE LA QUALITÉ DES INFORMATIONS FUTURES

Établis les règles qui devront être appliquées lors de l'étude concurrentielle :

### Statuts possibles

- `verified_fact` : T1 ou 2 sources T2/T3 indépendantes concordantes ;
- `declared_fact` : source T2 unique ;
- `single_source` : une seule T3 ;
- `estimate` : calcul ou déduction, méthode obligatoire ;
- `not_found` : recherche menée sans résultat ;
- `contradicted` : désaccord non résolu entre sources crédibles.

### Contrôles obligatoires

- périmètre juridique ;
- périmètre géographique ;
- exercice / date ;
- identité de l'entité ;
- fraîcheur ;
- cohérence de segmentation ;
- ratio CA/effectif lorsqu'il est calculable ;
- indépendance réelle des corroborations.

### Réglementation

Aucune échéance précise ne doit être publiée sans source officielle.

### Trigger events

Un événement >12 mois est du contexte, pas un motif d'appel actuel.

---

# ÉTAPE 9 — RED TEAM

Avant livraison, choisis trois sources et trois futurs types d'affirmation au hasard et demande :

1. La source prouve-t-elle réellement ce qu'on lui attribue ?
2. Le périmètre est-il correct ?
3. La source est-elle primaire ou seulement une reprise ?
4. Serait-elle défendable devant un expert du secteur ?

Puis liste les 3 points les plus fragiles du référentiel et corrige-les ou documente-les comme gaps.

---

# FORMAT DE SORTIE OBLIGATOIRE

## 1. Synthèse exécutive

- périmètre retenu ;
- logique de sélection ;
- 5 à 10 sources les plus structurantes ;
- principaux gaps ;
- verdict : `production_ready | usable_with_caveats | draft`.

## 2. Carte des besoins d'information

Tableau : famille | besoin | utilité commerciale | niveau de couverture.

## 3. Registre complet des sources

Tableau avec les colonnes :

```text
ID
Source
Éditeur
URL
Famille
Tier
Rôle
Ce qu'elle atteste
Intérêt commercial ESN
Segment couvert
Géographie
Fréquence
Accès
Automation fit
Score utilité /100
Risques / caveats
Date de vérification
```

## 4. Pack minimal

Liste priorisée et justification de chaque source.

## 5. Pack enrichi

Liste priorisée et justification.

## 6. Requêtes types

Regroupées par famille d'information.

## 7. Matrice de couverture

Famille × sources.

## 8. Gaps et limites

Inclure les recherches infructueuses.

## 9. Journal de recherche

Pour chaque requête : requête | date | résultats utiles | sources rejetées | raison.

## 10. Scorecard qualité

Exécuter et afficher les contrôles avant livraison.

## 11. Export JSON

Produire un JSON conforme au schéma suivant :

```json
{
  "meta": {
    "sector": "",
    "segment": "",
    "market_definition": "",
    "geography": "",
    "snapshot_date": "",
    "version": "1.0",
    "status": "production_ready|usable_with_caveats|draft"
  },
  "information_needs": [
    {
      "family": "",
      "need": "",
      "commercial_use": "",
      "coverage": "strong|medium|weak|gap|non_applicable"
    }
  ],
  "sources": [
    {
      "id": "SRC-001",
      "name": "",
      "publisher": "",
      "url": "",
      "domain": "",
      "family": "",
      "tier": 1,
      "primary_role": "proof|corroboration|discovery|watch",
      "attests": [""],
      "commercial_use": [""],
      "segment_scope": "",
      "geography": "",
      "update_frequency": "",
      "last_verified_at": "",
      "access": "open|registration|paywall|mixed",
      "automation_fit": "high|medium|low|manual_only",
      "utility_score": 0,
      "utility_score_detail": {
        "sector_relevance": 0,
        "information_coverage": 0,
        "commercial_value": 0,
        "freshness": 0,
        "authority": 0,
        "automation_access": 0
      },
      "risks": [""],
      "typical_queries": [""],
      "origin_chain": ""
    }
  ],
  "minimum_pack": ["SRC-001"],
  "extended_pack": ["SRC-001"],
  "gaps": [
    {
      "information_family": "",
      "description": "",
      "searches_attempted": [""]
    }
  ],
  "quality": {
    "critical_failures": [],
    "major_failures": [],
    "red_team_points": [],
    "verdict": "production_ready|usable_with_caveats|draft"
  }
}
```

---

# RÈGLES ABSOLUES

1. **Ne jamais inventer une source, une URL, une publication ou une institution.**
2. Ouvrir et vérifier les sources avant de les recommander comme références.
3. Remonter à la source primaire lorsqu'elle existe.
4. Ne jamais présenter deux reprises de la même source primaire comme deux corroborations indépendantes.
5. Une source T4 ne fonde jamais seule une affirmation décisive.
6. Une échéance réglementaire datée exige une source officielle.
7. Documenter les trous au lieu de les combler.
8. Ne pas produire l'étude concurrentielle complète : rester centré sur le **référentiel de sources**.
9. Toute recommandation de scraping ou d'automatisation doit respecter les conditions d'accès et d'utilisation du service.
10. Le livrable doit pouvoir être repris par un analyste qui n'a aucun historique de la mission.

## FIN DU PROMPT
