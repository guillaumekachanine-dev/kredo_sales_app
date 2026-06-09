# ADR-0004 : Modèle de données du pivot Opportunité

**Statut :** Accepté
**Date :** 2026-06
**Décideur :** Dosta
**Migration :** `001_module_opportunite.sql`

## Contexte
Première brique à construire. L'opportunité est l'entité à laquelle se rattachent comptes, contacts, compétences, candidats, missions et forecasts.

## Décisions
- **L'opportunité est le pivot**, construite en premier (fixe ~60 % des relations).
- **Pas de multi-tenant** (`workspaces` supprimé) : outil mono-utilisateur, RLS simple `auth.uid() = owner_id`.
- **`stage` (position dans le tunnel) et `outcome` (issue : gagnée/perdue/abandonnée) séparés** → permet d'analyser à quelle étape les deals sont perdus.
- **Argent en `numeric`**, jamais `float`.
- **Pipe pondéré = colonne générée** (`estimated_gain × conviction / 100`) : calculé par la base, jamais faux.
- **Listes fermées en `enum`** (stage, priorité, importance) ; **timeline en `text` libre** (types d'événements évolutifs).
- **`on delete`** : `restrict` sur le compte (protège l'historique), `cascade` sur compétences/événements, `set null` sur le rattachement d'un contact.
- **Fiche de poste détaillée fusionnée** dans `sales_opportunities` (relation 1:1) ; sera extraite en Phase 3 pour la vectorisation.

## Conséquences
- ✅ Toutes les relations clés de l'app sont posées dès la première brique.
- ✅ Calculs commerciaux fiables côté base.
- 🔄 Extraction de `need_detail` vers une table dédiée à prévoir lors du branchement pgvector (matching CV).
