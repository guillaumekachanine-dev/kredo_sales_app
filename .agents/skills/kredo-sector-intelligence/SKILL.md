---
name: kredo-sector-intelligence
description: RETIRÉ — ne pas utiliser. Ce skill conduisait le process d'étude sectorielle v1, dont l'application est désormais interdite (docs/MASTER-STUDY/README.md §5.2 classe son document d'autorité en ARCHIVE). Toute demande d'étude sectorielle, de cartographie concurrentielle, de playbook, de priorisation de comptes ou d'analyse de secteur passe par le skill kredo-master-study, seul déclencheur autorisé. Si ce skill se déclenche, bascule immédiatement sur kredo-master-study sans rien produire.
---

# RETIRÉ — voir `kredo-master-study`

**Ce skill ne doit plus conduire aucune production.** Si tu l'as ouvert, arrête-toi ici et
déclenche **`kredo-master-study`**.

## Pourquoi

Il déclarait comme autorité
`docs/FEATURES/sector_intelligence/_legacy_kredo_(studies_v1)/PROCESS-ETUDE-SECTORIELLE.md`, qui
porte le bandeau **« ARCHIVE — raisonnement conservé, application interdite »**, statut fixé par
`docs/MASTER-STUDY/README.md` §5.2.

Trois choses que le process v1 fait et que le corpus actuel interdit :

- **une fiche sectorielle unique** — le livrable est devenu sept fichiers JSON validés par schéma,
  produits par une chaîne E0→E7 ;
- **une grille /100 auto-administrée** — c'est exactement le défaut que G1 (script), G2 (red team
  hors contexte) et G3 (recette humaine) existent pour supprimer : le producteur n'est jamais son
  propre jury ;
- **une injection SQL directe** — l'ingestion de la cartographie passe par un bac d'arbitrage
  humain (`CompetitiveMapImportWizard`), la résolution d'entité produisant des `ambiguous` dont
  l'arbitrage est un jugement (ADR-0019).

## Ce qui a été conservé

Sa doctrine était bonne et n'est pas perdue : ses six règles ont été reprises dans
`docs/MASTER-STUDY/00-DOCTRINE.md`, et `kredo-master-study` en porte la version courante.

Les fichiers de ce dossier restent en place et **ne sont pas à supprimer** :

- `scripts/audit_fiche.py` — contrôle des fiches sectorielles v1, cité par
  `10-ETAPE-E7-GATES-ET-INGESTION.md` §3 comme l'un des deux ancêtres de
  `scripts/audit-master-study.py` (qui est G1 aujourd'hui) ;
- `references/` — le raisonnement d'origine, lisible à titre d'archive.
