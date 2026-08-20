# Architecture Decision Records (ADR)

Un ADR documente **une décision structurelle** : son contexte, les options envisagées, l'arbitrage et ses conséquences. On en écrit un quand un choix engage durablement le projet.

| ADR | Sujet | Statut |
|-----|-------|--------|
| [0001](ADR-0001-stack-technique.md) | Stack technique | Accepté |
| [0002](ADR-0002-monolithe-modulaire.md) | Monolithe modulaire vs outils spécialisés | Accepté |
| [0003](ADR-0003-supabase-projet-dedie-schema-unique.md) | Projet Supabase dédié + schéma unique | Accepté |
| [0004](ADR-0004-modele-pivot-opportunite.md) | Modèle de données du pivot Opportunité | Accepté |
| [0005](ADR-0005-navigation-deux-etages.md) | Navigation à deux étages | Accepté |
| [0006](ADR-0006-strategie-device-adaptive-cible.md) | Stratégie device adaptive ciblée | Accepté |
| [0007](ADR-0007-moteur-intelligence-commerciale.md) | Moteur d'intelligence commerciale (autonomie FOLIO) | Accepté |
| [0008](ADR-0008-client-intelligence-hub.md) | Client Intelligence Hub — surface BI par compte | Accepté |
| [0009](ADR-0009-generate-pitch.md) | Génération de pitch (script oral + fiche RDV), compte-centrée | Accepté |
| 0010 | *(cité partout, aucun fichier — seule trace : `docs/JOURNAL-SESSIONS.md`)* | — |
| 0011 | *(cité partout, aucun fichier — score de priorité commerciale, cf. journal)* | — |
| [0012](ADR-0012-cockpit-intelligence-chaine-decision.md) | Cockpit Intelligence : de l'espace documentaire à la chaîne de décision | Proposé |
| [0013](ADR-0013-communication-scenarios-catalog.md) | Catalogue de scénarios de communication (mail, pitch, prise de parole) | Proposé |
| [0014](ADR-0014-intelligence-actions-program.md) | Programme Intelligence Actions : features contextuelles + diagnostic macro | Proposé |
| [0015](ADR-0015-intel-020-dynamic-communication-architecture.md) | Architecture dynamique de communication INTEL-020 | Accepté |
| [0016](ADR-0016-realtime-notifications-cout-mesure.md) | Realtime et notifications : ne pas re-architecturer | Accepté |
| [0017](ADR-0017-cache-components-ppr-refuse.md) | Cache Components (PPR) : ne pas activer | Accepté |
| [0018](ADR-0018-refonte-shell-navigation-desktop.md) | Refonte du shell de navigation desktop (rail de section, 12 modules) | Proposé |
| [0019](ADR-0019-profondeur-de-compte-et-ingestion-cartographie.md) | Profondeur de compte et ingestion des cartographies concurrentielles | Accepté |
| [0020](ADR-0020-missions-intelligence.md) | Missions d'intelligence : moteur déclaratif transverse | Accepté |
| [0021](ADR-0021-master-study-ingestion-projections-distribution.md) | Master Study : ingestion canonique, projections et distribution | Accepté (v2.0) |

> Règle : un ADR accepté ne se modifie pas. Si la décision change, on crée un nouvel ADR qui *remplace* (Superseded) l'ancien.
> Un ADR **Proposé** reste amendable jusqu'à son acceptation — c'est à ce titre que l'ADR-0021 a été réécrit en v2.0.
