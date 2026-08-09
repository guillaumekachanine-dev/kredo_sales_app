# KREDO — Standard d'établissement des sources sectorielles

**Version : 1.0**  
**Date : 9 août 2026**  
**Objet :** standardiser la constitution d'un référentiel de sources fiable, sectoriellement pertinent et exploitable par une automatisation d'étude concurrentielle orientée prospection ESN.

## Finalité

Ce dossier ne décrit pas comment réaliser toute l'étude concurrentielle. Il définit l'étape amont qui conditionne sa qualité : **identifier, qualifier, hiérarchiser et contrôler les sources qui serviront ensuite de corpus de recherche**.

Le principe directeur est simple : une étude utile à un directeur commercial d'ESN doit pouvoir répondre à quatre questions :

1. Quels comptes attaquer en priorité ?
2. Par quelle porte entrer ?
3. Quel discours crédible tenir ?
4. Pourquoi maintenant ?

Le référentiel de sources doit donc couvrir non seulement le marché et la concurrence, mais aussi la réglementation, les contrats, les chantiers technologiques, les achats, les signaux RH, les déclencheurs récents et les structures de décision.

## Contenu du dossier

| Fichier | Rôle |
|---|---|
| `01_METHODE_STANDARD_REFERENTIEL_SOURCES.md` | Méthode complète et reproductible de construction du référentiel |
| `02_CONTROLE_QUALITE_SOURCES_ET_FAITS.md` | Contrôle qualité des sources, des faits et des contradictions |
| `03_PROMPT_CANONIQUE_RECHERCHE_SOURCES.md` | Prompt autonome prêt à être utilisé par un humain, un agent ou n8n |
| `04_SCHEMA_SORTIE_REFERENTIEL_SOURCES.json` | Schéma JSON machine-readable du livrable |
| `05_TEMPLATE_REGISTRE_SOURCES.csv` | Modèle tabulaire pour le registre des sources |
| `06_TEMPLATE_JOURNAL_RECHERCHE.md` | Journal de recherche rejouable |
| `07_SCORECARD_VALIDATION.md` | Gate de validation avant usage du référentiel |
| `08_MODE_EMPLOI_N8N.md` | Intégration légère dans un workflow n8n |
| `example_btp/` | Exemple réel du secteur BTP / grands travaux / infrastructures |
| `references/` | Documents KREDO existants utiles à cette fonctionnalité |

## Règles cardinales

- **Le tier mesure la force probante ; le score d'utilité mesure la valeur opérationnelle. Ne jamais les confondre.**
- Une source T4 peut être très utile pour découvrir un signal, mais ne peut pas fonder seule une affirmation décisive.
- Une donnée qui vient d'une reprise n'hérite jamais du tier de la source primaire tant que la source primaire n'a pas été réellement consultée.
- Les sources doivent être choisies selon les besoins de l'étude, pas selon leur notoriété.
- Les trous sont documentés ; ils ne sont jamais comblés par une hypothèse présentée comme un fait.
- Une donnée décisive doit être traçable jusqu'à la source qui l'atteste.
- Le livrable final doit être rejouable : journal de recherche, date de consultation, statut des sources et critères de sélection sont conservés.

## Articulation avec KREDO

Les documents existants de KREDO rappellent que la recherche externe doit compléter un corpus interne, documenter systématiquement chaque chiffre et traiter la réglementation comme un bloc critique. Le référentiel défini ici devient la **couche de paramétrage sectoriel** de cette recherche : il indique où chercher, avec quel niveau de confiance et pour quel type d'information.

Le schéma Supabase actuel prévoit déjà des objets sectoriels de veille et de réglementation (`sector_news`, `sector_events`, `sector_regulatory_items`). Ce standard peut alimenter leur collecte sans imposer de nouvelle table dans sa V1 : le registre peut d'abord être persisté dans un résultat JSON de workflow, puis normalisé plus tard si le besoin est confirmé.
