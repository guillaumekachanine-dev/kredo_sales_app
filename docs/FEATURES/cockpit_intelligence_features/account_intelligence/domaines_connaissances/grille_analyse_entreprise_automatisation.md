# Synthèse de la Grille d'Analyse Stratégique d'Entreprise

## 1. Les 17 Piliers de la Connaissance Entreprise

### A. Fondamentaux Économiques et Marché
1. **Métier et activité réelle** : Proposition de valeur brute vs pitch marketing.
2. **Santé financière** : CA, marge, résultat, EBE, dette (historique 3-5 ans pour voir la trajectoire).
3. **Dynamique RH brute** : Effectif réel, localisation, ratio masse salariale interne / externe (sous-traitance).
4. **Actualités et signaux forts** : Fusions-acquisitions, investissements, lancements, litiges, amendes.
5. **Empreinte concurrentielle** : Position sur l'échiquier (leader, challenger, disrupteur, vache à lait).
6. **Écosystème de dépendance** : Concurrents directs, partenaires prescripteurs, distributeurs, actionnaires.
7. **Typologie clients** : Segmentation, risque de concentration (loi de Pareto 80/20), clients emblématiques.
8. **Modèle économique (Unit Economics)** : Mécanique de monétisation (licence, abonnement, services), avantages compétitifs.
9. **Chaîne de valeur** : Dépendances critiques (fournisseurs, matières premières, logistique, énergie).
10. **Pression macro-environnementale** : Vents porteurs ou contraires liés à la réglementation et aux tendances tech.

### B. Dimensions Humaines, Technologiques et Culturelles
11. **Gouvernance et pouvoir réel** : Décideurs effectifs vs organigramme, C-Level, luttes d'influence.
12. **Maturité technologique et "Stack"** : Logiciels utilisés, ERP, CRM, legacy vs cloud-native.
13. **Culture d'entreprise** : Philosophie de gestion (vertical, agile, orienté KPI, paternaliste).
14. **Processus d'achat** : Cycle de décision, comités d'engagement, influence Achats vs Métiers, cycles budgétaires.
15. **Résilience et historique** : Réaction face aux crises passées (Covid, cyberattaques, pertes de clients).
16. **Réalité RSE** : Contraintes réelles (carbone, inclusion) pesant sur le modèle d'affaires, au-delà du greenwashing.
17. **Attractivité RH et compétences** : Profils en tension, difficultés de recrutement (signaux de besoins en automatisation ou conseil).

---

## 2. Cartographie des Sources et Capacité d'Automatisation

La viabilité pour une automatisation (ex: via n8n, Make ou scripts Python custom) varie grandement. Voici le niveau d'accessibilité de chaque source.

| Source | Type d'Info | URL | Automatisation & Intégration (API / RSS / Scraping) |
| :--- | :--- | :--- | :--- |
| **Pappers** | Finances, Légal, Dirigeants, Actes | [pappers.fr](https://www.pappers.fr) | 🟢 **Excellente (API)** : API officielle complète. Parfait pour requêter automatiquement un SIREN et enrichir un CRM. |
| **BODACC / Data INPI** | Procédures, statuts, rachats | [bodacc.fr](https://www.bodacc.fr) | 🟢 **Bonne (API / RSS)** : L'INPI propose des API Open Data. Le BODACC permet de créer des alertes RSS personnalisées par mots-clés. |
| **Welcome to the Jungle / Indeed** | Stack Tech, Projets, RH | [welcometothejungle.com](https://www.welcometothejungle.com) | 🟡 **Moyenne (Scraping/API cachée)** : WTTJ utilise l'API Algolia en front, souvent requêtable en direct. Des flux RSS d'offres existent via des agrégateurs. |
| **BuiltWith / Wappalyzer** | Architecture web, technos | [builtwith.com](https://builtwith.com) | 🟢 **Excellente (API)** : API officielle payante très robuste pour profiler un domaine. |
| **Google Alerts / Dorks** | Signaux faibles, Actus, Docs | [google.fr/alerts](https://www.google.fr/alerts) | 🟢 **Excellente (RSS)** : Google Alerts permet d'exporter nativement toute requête de veille sous forme de flux RSS. |
| **Presse Éco/Tech (Usine N., Les Echos, Maddyness)** | Contexte marché, Projets | [usinenouvelle.com](https://www.usinenouvelle.com) | 🟢 **Excellente (RSS)** : La majorité des médias spécialisés exposent des flux RSS par thématique ou secteur d'activité, idéaux pour trigger des workflows. |
| **Wayback Machine** | Historique, Pivots | [archive.org](https://archive.org) | 🟢 **Bonne (API)** : API CDX disponible pour interroger programmatiquement l'historique d'un site. |
| **LinkedIn / Sales Nav** | Organigramme, Croissance RH | [linkedin.com](https://www.linkedin.com) | 🔴 **Complexe (Scraping bloqué)** : Demande l'usage de services tiers spécialisés (Apify, Phantombuster, Captain Data) ou des APIs B2B d'enrichissement (Proxycurl, Nubela). |
| **Glassdoor** | Climat social, Management | [glassdoor.fr](https://www.glassdoor.fr) | 🔴 **Complexe (Anti-Scraping)** : Fortement protégé par Cloudflare. L'automatisation requiert des outils de scraping avancés, pas d'API publique simple. |

