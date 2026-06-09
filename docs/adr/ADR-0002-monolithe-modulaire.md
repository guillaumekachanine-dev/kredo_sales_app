# ADR-0002 : Monolithe modulaire plutôt que plusieurs outils spécialisés

**Statut :** Accepté
**Date :** 2026-06
**Décideur :** Dosta

## Contexte
Hésitation initiale : un outil polyvalent unique, ou plusieurs outils spécialisés (un par domaine métier) ?

## Décision
**Un seul hub modulaire**, construit en tranches verticales (une feature complète Data→UI→n8n avant la suivante).

## Trade-off
- Plusieurs outils → duplication des données client/collaborateur, multiplication des authentifications, synchronisation permanente. **Incompatible avec la « single source of truth ».**
- Un hub modulaire → unité de la donnée, livraison incrémentale possible, une seule auth.

## Conséquences
- ✅ Les jointures cross-domaine (cœur de la valeur de Kredo) restent triviales.
- ✅ Livraison phase par phase sans casser l'ensemble.
- ⚠️ Discipline requise : ne pas tout construire d'un coup (risque « usine à gaz »).
