# Mutation UI Contract

> **Règle canonique KREDO** :
> **Une mutation utilisateur réussie doit être visible immédiatement dans le composant qui l'a initiée.**
> Le refresh serveur (`router.refresh()`) assure la convergence et la synchronisation en arrière-plan, **pas le feedback visuel primaire**.

---

## 1. Contexte & Problématique

Dans une application Next.js (App Router) reposant principalement sur des Server Components et Server Actions :
- Les **Server Components** injectent les données initiales via leurs props.
- Un **Client Component** peut conserver un snapshot ou un état local (ex. `useModuleSnapshot`, `useState(initialData)`).
- Lorsqu'une Server Action s'exécute avec succès sur Supabase, exécuter un simple `router.refresh()` **n'invalide pas** automatiquement l'état interne d'un composant client déjà monté.
- L'utilisateur devait alors fermer/rouvrir la modale ou recharger la page pour voir sa modification.

Ce contrat met fin à cette anomalie en formalisant trois stratégies de réactivité et un principe d'état client déterministe.

---

## 2. Le Cycle de Mutation KREDO

```text
ACTION UTILISATEUR (clic / formulaire / toggle)
      ↓
MUTATION SERVER ACTION (écriture Supabase)
      ↓
SUCCÈS CONFIRMÉ PAR LE SERVEUR
      ↓
MISE À JOUR IMMÉDIATE DE L'ÉTAT CLIENT (patch déterministe)
      ↓
CONVERGENCE ARRIÈRE-PLAN (router.refresh() ou refresh silencieux)
```

---

## 3. Les Trois Stratégies de Réactivité

### Stratégie 1 : Committed Local Update
**Usage** : Formulaires d'édition, renommage, modifications éditoriales, ajouts et suppressions de collections.

- **Draft local** : Les champs sont saisis localement.
- **Pending** : Pendant `isPending`, les boutons affichent un état de chargement/désactivé.
- **Confirmation serveur** : Dès que `await action(...)` retourne `{ success: true, ... }`, l'état client local ou le snapshot est mis à jour immédiatement avec la nouvelle valeur canonique via des helpers purs déterministes.
- **Convergence** : Un rafraîchissement silencieux (`onRefresh({ silent: true })` ou `router.refresh()`) resynchronise en arrière-plan sans flash de chargement.
- **Erreur** : Si l'action échoue, l'UI reste dans son état précédent, le formulaire reste ouvert et un message d'erreur est affiché.

### Stratégie 2 : Optimistic Update (`useOptimistic` ou setState avec rollback)
**Usage** : Switches, toggles d'activation, statuts binaires ou mutations légères réversibles.

- **Interaction** : Le switch bascule immédiatement à l'écran.
- **Mutation** : La Server Action est lancée en tâche de fond.
- **Succès** : La valeur est conservée.
- **Erreur** : En cas d'échec ou d'exception, rollback automatique vers l'état antérieur et affichage d'un toast/message d'erreur.

### Stratégie 3 : Realtime & Polling Spécialisé
**Usage** : Uniquement pour les données modifiées **hors de l'interface courante** (runs n8n, générations d'IA asynchrones, webhooks, modifications multi-utilisateurs distantes).

- Les opérations CRUD ordinaires de l'utilisateur ne doivent **pas** être déléguées à Supabase Realtime.

---

## 4. Règle pour les Server Actions

Les Server Actions de mutation ne doivent pas retourner uniquement `{ success: true }` si le client a besoin des données résultantes pour se réconcilier.

Elles doivent retourner un payload minimal contenant :
- Les identifiants modifiés (`id`, `sourceId`, `corpusId`, `removedItemId`).
- Les valeurs canoniques résultantes (`name`, `description`, etc.).
- Le statut d'erreur et message explicite le cas échéant.

```typescript
// Exemple canonique
export type UpdateCorpusEditorialResult =
  | { success: true; corpusId: string; name: string; description: string | null }
  | { success: false; error: string }
```

---

## 5. Règle pour les Snapshots Autoportants (`useModuleSnapshot`)

Pour les modules complexes gérant leur propre cycle de vie :
- Utiliser le contrôleur `useModuleSnapshot<T>(loader)` qui fournit `{ state, refresh, updateData }`.
- `updateData(updater)` permet au propriétaire du snapshot d'appliquer immédiatement un patch local déterministe.
- `refresh({ silent: true })` permet de rafraîchir les données en arrière-plan sans réinitialiser l'interface à l'état `loading`.

---

## 6. Interdictions Architecturales

- **Pas de cache entitaire global** (ni Redux, ni Zustand global, ni Apollo Cache).
- **Pas d'ajout de bibliothèques externes de synchronisation** (pas de TanStack Query, pas de SWR).
- **Pas de Realtime généralisé** pour des actions CRUD locales.
- **Supabase reste l'unique source de vérité** (Single Source of Truth).
