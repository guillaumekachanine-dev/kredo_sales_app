# ADR-0015 — Architecture dynamique de communication INTEL-020

**Statut :** Accepté
**Date :** 2026-07-11
**Décideur :** Guillaume (Owner)
**Références :** [Handoff INTEL-020](../HANDOFF_INTEL-020_ARCHITECTURE_DYNAMIQUE.md) · [Ledger d'implémentation](../handoffs/INTEL-020-dynamic-implementation-ledger.md) · [ADR-0013](ADR-0013-communication-scenarios-catalog.md)

## Contexte

INTEL-020 étend le composer de communication existant sans créer d'architecture parallèle. Le contrat doit distinguer la forme du livrable, le contexte métier et l'entité pivot, tout en restant compatible avec les runs historiques.

## Décisions actées

- Trois finalités utilisateur explicites et distinctes : `written_message`, `spoken_pitch`, `structured_briefing`.
- Six catégories : `commerce_prospection`, `commerce_actif`, `delivery`, `recrutement`, `management_consultants`, `internal_staff`.
- Séparation stricte du management des consultants et des communications internes vers le Staff.
- Trois scopes : `account`, `collaborator`, `internal`.
- Un seul composer global et un seul workflow n8n : `intel-020-communication`.
- La registry TypeScript est la source de vérité des scénarios et de leurs contraintes.
- Un résolveur métier pur porte les dépendances, cascades et normalisations.
- L'obligation d'une offre est pilotée par le scénario, jamais déduite globalement du canal ou de la finalité.
- Les anciens runs restent lisibles grâce à une normalisation et à des fallbacks explicites.
- Desktop et Mobile partagent les contrats, avec des composants adaptés à l'intention et à la densité propres à chaque surface.
- Le stockage reste dans `ai_intelligence_runs` et `ai_intelligence_results` ; aucune nouvelle table de communication n'est créée.

## Supersession d'ADR-0013

Cette ADR supersède explicitement ADR-0013 pour :

- la taxonomie à cinq catégories ;
- la fusion `interne_management` ;
- le modèle limité à deux finalités utilisateur ;
- l'assimilation du briefing au pitch ;
- l'affirmation selon laquelle aucune évolution de base de données ne serait nécessaire pour l'ensemble du chantier.

La migration étroite ajoutant `manager_profile_id` et le RPC de contexte collaborateur sont décidés, mais différés au Lot 4. Cette décision n'autorise aucune migration dans le Lot 0.

## Hors scope

- envoi automatique ;
- campagnes multicanales ou séquences automatisées ;
- nouveau workflow n8n ;
- nouvelles tables de communication ;
- refonte graphique globale ;
- tiering LLM ;
- monitoring analytique.

## Conséquences

Les lots suivants doivent faire évoluer l'existant dans l'ordre défini par le handoff, conserver la compatibilité historique et documenter tout écart dans le ledger. Le Lot 0 reste exclusivement documentaire.
