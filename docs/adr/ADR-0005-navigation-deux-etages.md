# ADR-0005 : Navigation à deux étages — sidebar modules / onglets de section

**Statut :** Accepté  
**Date :** 2026-06-09  
**Décideur :** Dosta  

---

## Contexte

La config initiale de navigation exposait **91 destinations dans la sidebar**, dont 74 marquées "Bientôt" (désactivées). La sidebar décrivait la *vision produit entière* au lieu de servir la navigation de l'application courante.

Symptômes :
- 3 niveaux d'imbrication (groupe → module → sous-page) avec accordéon géré en state côté client.
- Le groupe "Ressources" seul affichait 28 liens désactivés.
- `MobileBottomNav` redéfinissait ses 5 items en dur, déconnectés de la config.
- `MissionsTabbedShell` répétait les labels de sous-pages dans un dictionnaire local.

## Décision

**Principe : la sidebar liste les modules. Les sous-pages d'un module vivent dans la barre d'onglets de section, jamais dans la sidebar.**

### Structure adoptée

```
sidebar (2 niveaux)           barre d'onglets de section (intra-module)
─────────────────────         ─────────────────────────────────────────
Cockpit                       [Vue d'ensemble] [Actives] [Opps] [Planning]
┄ Business ┄
Missions & Opps          →    onglets Missions derivés de `tabs[]`
Prospection Intelligence →    onglets Prospection dérivés de `tabs[]`
Proposal Intelligence    →    …
┄ Ressources ┄
Staffing         (Bientôt)    — aucun onglet tant que non livré
Consultants      (Bientôt)
Recrutement      (Bientôt)
┄ Pilotage ┄
Finance               →       onglets Finance dérivés de `tabs[]`
Knowledge Hub         →       …
Automations           →       …
Paramètres
```

### Source unique — `main-menu.config.ts`

Trois champs ajoutés à `MainMenuItem` :

| Champ | Rôle |
|---|---|
| `tabs?: SectionTab[]` | Onglets de section de ce module (non rendus en sidebar) |
| `primary?: boolean` | Inclus dans la bottom nav mobile |
| `shortLabel?: string` | Label court pour la bottom nav |

Utilitaire exporté :

```ts
getSectionTabsForPath(pathname: string): SectionTab[]
```

Retourne les onglets du module actif. Utilisé par `MissionsTabbedShell` et tout futur shell de section.

### Règles

1. **Sous-pages "Bientôt" → dans `tabs`, pas dans la sidebar.** La sidebar n'expose que les modules (même s'ils sont coming-soon).
2. **`MobileBottomNav` dérive de `primary: true`** dans la config. Pas de liste en dur.
3. **Tout nouveau module ship avec ses `tabs` déclarés dans la config** dès que ses sous-pages existent.
4. **Quand le copilot IA transverse est livré (Phase 5)**, la sidebar peut encore se simplifier car la navigation par intention (langage naturel) remplace une partie des liens.

## Options écartées

**Option A — maintenir la sidebar 3 niveaux avec accordéon.**  
Conserve la vision produit visible mais dégrade l'expérience de navigation (bruit, profondeur, state côté client complexe). Rejeté.

**Option B — masquer les modules "Bientôt" en CSS.**  
Viole la règle "on ne charge jamais le lourd pour le cacher". Rejeté.

## Conséquences

- ✅ Sidebar : 91 → 13 entrées. Accordéon et son state supprimés.
- ✅ `MobileBottomNav` est synchronisée avec la sidebar sans duplication.
- ✅ Labels de sections centralisés dans `getSectionTabsForPath` — plus de dictionnaire local.
- ✅ Fondation pour une `SectionNavBar` générique (sous-pages routées) à livrer module par module.
- ⚠️ Chaque nouveau module doit déclarer ses `tabs` dans la config lors de sa livraison.
