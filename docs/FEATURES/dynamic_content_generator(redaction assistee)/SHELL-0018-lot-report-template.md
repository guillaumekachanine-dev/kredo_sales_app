# SHELL-0018 — Lot XX : {titre du lot}

> **Modèle.** Copier ce fichier en `SHELL-0018-lot-XX-report.md`, le remplir intégralement, puis
> mettre à jour la ligne du lot au §10 du [ledger](SHELL-0018-implementation-ledger.md).
> Aucun champ ne se laisse vide : écrire « aucune » ou « sans objet » plutôt que de supprimer une section.

| | |
|---|---|
| **Lot** | XX |
| **Agent** | {Claude Code · Codex · Gemini · humain} |
| **Date** | AAAA-MM-JJ |
| **Branche** | `feat/shell-0018-XX-slug` |
| **SHA de départ** | `{sha du main au moment du démarrage}` |
| **SHA de livraison** | `{sha final}` |
| **PR** | {URL ou « aucune »} |
| **Statut** | `done` · `partial` · `blocked` |

---

## 1. Audit préalable

> Ce qui a été **lu et vérifié dans le code** avant d'écrire quoi que ce soit.
> L'objectif est qu'un agent suivant sache sur quelle réalité ce lot s'est appuyé.

| Fichier audité | Ce qui a été constaté |
|---|---|
| | |

**Écarts entre le ledger et le code réel :**
> Aucun, ou la liste. Tout écart doit aussi être consigné au §11 du ledger.

**Vérifications Supabase (si la base est touchée) :**
> Requêtes réellement exécutées et résultats. Aucun identifiant de ligne, payload métier ou secret ne doit être reproduit.

---

## 2. Périmètre réalisé

### 2.1 Fichiers créés

| Chemin | Rôle | Lignes |
|---|---|---|
| | | |

### 2.2 Fichiers modifiés

| Chemin | Nature de la modification |
|---|---|
| | |

### 2.3 Fichiers supprimés

| Chemin | Pourquoi c'est sûr de le supprimer |
|---|---|
| | |

### 2.4 Migrations Supabase

> Nom exact du fichier de migration, statut d'application (locale / live), et
> **le timestamp réellement enregistré dans `supabase_migrations.schema_migrations`**
> — le nom local doit correspondre, cf. le piège de numérotation documenté dans CLAUDE.md.

---

## 3. Décisions prises pendant le lot

> Toute décision non prévue par ADR-0018. Si elle a une portée durable, elle doit
> devenir une décision numérotée (D-16, D-17…) dans l'ADR **avant** la clôture du lot.

| Décision | Alternative écartée | Pourquoi |
|---|---|---|
| | | |

---

## 4. Résultats de validation

> Coller les **résultats réels**. « OK » sans chiffre n'est pas un résultat.

| Porte | Commande | Résultat | Verdict |
|---|---|---|---|
| Types | `npx tsc --noEmit` | | |
| Build | `npm run build` | | |
| Tests | `npx vitest run` | `___ / ___` | |
| Frontière serveur | `npm run check:server-boundary` | | |
| Lint ciblé | `npx eslint {liste exacte}` | `___ erreurs, ___ warnings` | |

**Erreurs pré-existantes rencontrées sur les fichiers touchés :**
> Les constater (état avant modification), ne pas les corriger silencieusement.

**Tests ajoutés ou étendus :**

| Fichier | Cas couverts |
|---|---|
| | |

---

## 5. QA visuelle

> ⚠️ Aucun outil de capture automatisé n'est disponible côté agent (§8.6 du ledger).
> Si la QA n'a pas eu lieu, le statut du lot est `partial` — ne jamais déclarer une
> validation visuelle qui n'a pas été faite.

| Page | Point vérifié | Résultat |
|---|---|---|
| | | |

**Contrôle R1 (conteneur de scroll) — obligatoire dès qu'un layout est touché :**

Pour chaque page du module migré : ouvrir · scroller jusqu'en bas · vérifier que le rail
reste fixe et que seul le contenu défile.

| Page | Scroll correct ? |
|---|---|
| | |

---

## 6. Respect des invariants

| Réf. | Invariant | Respecté ? | Preuve |
|---|---|---|---|
| N-1 | Rail rendu seulement si ≥ 2 destinations | | |
| N-2 | Aucune imbrication de chapitres | | |
| N-3 | Chapitre = route, jamais `useState` | | |
| N-4 | `IntelligencePanel` en overlay quand le rail est monté | | |
| N-5 | Aucune Synthèse sans donnée réelle | | |
| N-6 | Pas de contenu cross-module dans une Synthèse | | |
| N-7 | Un outil déclaré une fois au registre | | |
| N-8 | Une surface de priorisation a un horizon propre | | |

> Les invariants sans objet pour le lot se marquent « s.o. ».

---

## 7. Limitations et dettes

| Type | Description | Suite prévue |
|---|---|---|
| | | |

**Non fait dans ce lot (et pourquoi) :**

---

## 8. Ce que le lot suivant doit savoir

> La section la plus importante du rapport. Écrite pour un agent qui **n'a pas participé** à ce lot.

- **État réel du code à la sortie :**
- **Ce sur quoi il peut s'appuyer sans revérifier :**
- **Ce qu'il doit revérifier lui-même :**
- **Pièges rencontrés dans ce lot :**
