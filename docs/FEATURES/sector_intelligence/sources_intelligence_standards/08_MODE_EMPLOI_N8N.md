# 08 — Mode d'emploi n8n : intégration légère

## Objectif

Implémenter la fonctionnalité sans créer une architecture parallèle : un workflow produit un **référentiel de sources JSON versionné**, puis les workflows d'étude sectorielle consomment ce référentiel comme configuration de recherche.

## Entrée minimale

```json
{
  "sector": "",
  "segment": "",
  "market_definition": "",
  "geography": "",
  "reference_account": "",
  "example_actors": [],
  "esn_offer": [],
  "commercial_objective": "",
  "snapshot_date": "YYYY-MM-DD"
}
```

## Pipeline recommandé — V1

1. **Validate Input**  
   Vérifie secteur, segment, définition du marché, géographie.

2. **Research / Browse**  
   Exécute le prompt canonique avec accès web réel.

3. **Parse Structured Output**  
   Extrait le JSON final.

4. **Validate JSON Schema**  
   Contrôle contre `04_SCHEMA_SORTIE_REFERENTIEL_SOURCES.json`.

5. **Quality Gate**  
   Applique `07_SCORECARD_VALIDATION.md`.

6. **Persist Result**  
   Persiste le JSON comme résultat de workflow / artefact sectoriel versionné.

7. **Expose to Study Workflow**  
   Le workflow d'étude reçoit le `minimum_pack`, puis élargit au `extended_pack` si un besoin reste non couvert.

## Ce qu'il ne faut pas construire en V1

- pas de nouvelle table dédiée avant validation de l'usage ;
- pas de crawler maison générique ;
- pas de scraping massif de réseaux professionnels ;
- pas de scoring IA opaque ;
- pas de réconciliation automatique des contradictions sans règles explicites ;
- pas de « source de secours » inventée si une famille reste vide.

## Persistance pragmatique

KREDO dispose déjà de mécanismes de résultats de workflows et de tables d'intelligence sectorielle. La V1 peut stocker le référentiel dans un JSON de résultat, identifié par :

```text
result_type = sector_source_registry
schema_version = 1
sector / sector_id
snapshot_date
content_json = référentiel complet
```

Une table normalisée dédiée ne devient utile que si l'UI doit ensuite permettre :

- l'édition source par source ;
- la désactivation d'une source ;
- le suivi historique de disponibilité ;
- la mutualisation de la même source entre plusieurs secteurs ;
- la mesure de performance de collecte par source.

## Stratégie de mise à jour

- **Création initiale** : recherche complète.
- **Refresh léger** : vérifier disponibilité, fraîcheur, régulateur, presse, fédérations, changements de domaine.
- **Refresh complet** : si segmentation change, nouvelle réglementation structurante, source majeure disparue ou gap critique non résolu.

## Gate avant consommation par l'étude

Le workflow d'étude ne doit utiliser un référentiel que si :

```text
quality.verdict != draft
```

Si `usable_with_caveats`, les gaps doivent être transmis au prompt de l'étude pour empêcher le modèle de les combler implicitement.
