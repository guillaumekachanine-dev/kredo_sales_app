# 05 — Handoff d'implémentation « Missions d'intelligence »

> **Statut** : opérationnel — document de reprise pour tout agent entrant.
> **Autorité** : `docs/adr/ADR-0020-missions-intelligence.md` (**Accepté** le 2026-08-18).
> En cas de divergence avec `02` ou `03`, **l'ADR fait foi**.
> **Dernière mise à jour** : 2026-08-18.

Ce document est **autoportant**. Un agent qui le lit doit pouvoir reprendre le chantier
sans relire la conversation de cadrage. Il donne : l'état d'avancement, la configuration
optimale par lot (skills, MCP, modèle, profondeur de réflexion), les pièges vérifiés, et
les invariants à ne jamais casser.

---

## 1. En une page — de quoi il s'agit

Kredo transforme son métier IA — aujourd'hui écrit en JavaScript **à l'intérieur de
fichiers JSON n8n importés à la main sur un VPS** — en **données déclaratives TypeScript
versionnées**, interprétées par un exécuteur unique.

```
1. MissionPreset (TypeScript, git)
        ↓
2. 3 CorpusProviders — veille · documents · compte
        ↓
3. Résolveur + budget + traçabilité   (dans /api/n8n/trigger EXISTANT)
        ↓
4. mission-001-run   (n8n : HMAC + statut + appel LLM + retry + callback)
        ↓
5. MissionReportV1   (validation TypeScript + intelligence_document)
```

### Le seul critère de succès

> **Ajouter une nouvelle intention d'analyse à Kredo ne demande aucun import n8n :
> une entrée de catalogue TypeScript, un test, un `git push`.**

Si un lot s'éloigne de ce critère, il faut s'arrêter et le signaler, pas continuer.

### Ce que le chantier n'est PAS

- Ce n'est **pas** une refonte : les 12 workflows métier existants ne sont pas migrés.
- Ce n'est **pas** un framework agentique : une mission = **un** appel LLM déterministe.
- Ce n'est **pas** une nouvelle infrastructure : zéro table nouvelle, une seule valeur
  d'enum ajoutée, la gateway de déclenchement existante est réutilisée.

---

## 2. État d'avancement

| Lot | Contenu | État | Sessions |
|---|---|---|---:|
| Cadrage | Vision, audit, critique, architecture, ADR | ✅ **Terminé** — ADR Accepté | — |
| Sécurité | Durcissement `get_manager_summary_facts` | ✅ **Livré** — migration `20260818092506` | — |
| **L0** | Contrats, catalogue TS, 1 preset, **garde M-4** | ✅ **Livré** | 1 |
| L1 | 3 CorpusProviders + budget + trace + garde service-role | ⬜ À faire | 2 |
| L2 | `mission-001-run` + harnais + **import VPS unique** | ⬜ À faire | 2 |
| L3 | Callback : aiguillage, validateur, enum `mission_report` | ⬜ À faire | 1 |
| L5 | Pilote : `intel-021` rejoué en preset + comparaison | ⬜ À faire | 1 |
| L4 | Composeur UX desktop + mobile | ⏸️ **Décidé après L5**, jamais avant | 2,5 |

**Total moteur + preuve (L0→L3 + L5) : 7 sessions réalistes, 5 optimiste.**
L'ordre `L0 → L1 → L2 → L3 → L5` est **strict** : chaque lot consomme le précédent.

---

## 3. Les 7 décisions normatives — à ne jamais renégocier en cours d'implémentation

Reprises de l'ADR §Décision. Un agent qui pense devoir en enfreindre une doit **s'arrêter
et le signaler**, pas contourner.

| # | Décision |
|---|---|
| **M-1** | Le métier vit en **TypeScript** (`src/features/intelligence-missions/`). Aucune logique métier dans n8n. |
| **M-2** | La sortie du LLM est validée **une seule fois, côté Next.js, dans le callback**. Aucun validateur en nœud n8n. |
| **M-3** | Un run de mission est une ligne `ai_intelligence_runs` ordinaire (`run_type = 'mission:<slug>'`). **Aucune table ni colonne nouvelle.** |
| **M-4** | Une mission écrit **`phase = 1`**. Les consommateurs de `phase` excluent `run_type LIKE 'mission:%'`. Pas de multi-étapes. |
| **M-5** | Corpus résolu **côté serveur, dans `/api/n8n/trigger`**. Chaque provider **déclare son mode d'exécution** ; tout provider service-role porte une **garde de workspace testée**. |
| **M-6** | `mission-001-run` est importé **une seule fois** et n'est plus jamais modifié. |
| **M-7** | Une mission produit **`MissionReportV1`** et le type documentaire **`mission_report`**. Le `resultType` **n'est pas configurable** — le callback le dérive du préfixe `mission:`. |

### L'invariant de sécurité, en clair

Le callback (`src/app/api/n8n/callback/route.ts`) aiguille sur `resultType` **en
service-role, hors RLS**, vers des écritures métier réelles — `materializeAccountIssues`
crée N lignes dans `account_issues`. Si une mission pouvait porter son propre `resultType`,
une intention rédigée en texte libre ferait écrire un LLM dans le CRM.

> 🔴 **Aucune mission ne doit jamais pouvoir produire un `resultType` autre que
> `mission_report`.** `account_issues_map` et `account_knowledge` restent la propriété
> exclusive des workflows dédiés.

---

## 4. Configuration optimale par lot

Légende **profondeur de réflexion** : `think` < `think hard` < `ultrathink`.
Le modèle se règle par `/model`, la profondeur en l'écrivant dans le prompt.

### Règle générale

- **Opus 5** quand la décision engage la suite (contrats, sécurité, refactor de code en
  production). Le coût est marginal face à une erreur de contrat propagée sur 5 lots.
- **Sonnet 5** pour le travail mécanique cadré (JSON n8n, UI, tests répétitifs).
- **Haiku 4.5** : jamais sur ce chantier — chaque lot touche des invariants.

---

### L0 — Contrats, catalogue, garde M-4

| Paramètre | Valeur |
|---|---|
| **Modèle** | **Opus 5** |
| **Réflexion** | **think hard** |
| **Skills** | `supabase` (migration de vue), `supabase:supabase-postgres-best-practices` |
| **MCP** | `supabase` — `execute_sql`, `apply_migration`, `list_migrations`, `generate_typescript_types` |
| **Agents** | aucun — le périmètre est cadré, un agent coûterait plus qu'il n'apporte |

**Pourquoi Opus** : les types écrits ici (`MissionSpec`, `CorpusSelector`,
`MissionReportV1`) sont consommés par les 4 lots suivants. Une erreur de forme se paie
cinq fois. C'est le lot le moins cher et le plus structurant.

**Pourquoi pas d'agent** : le périmètre de la garde M-4 est **déjà mesuré** (ADR §5.8) —
une seule vue. Lancer un `Explore` reviendrait à refaire un inventaire déjà fait.

---

### L1 — Résolveur de corpus, budget, traçabilité

| Paramètre | Valeur |
|---|---|
| **Modèle** | **Opus 5** |
| **Réflexion** | **ultrathink** |
| **Skills** | `supabase`, `supabase:supabase-postgres-best-practices`, `engineering:testing-strategy`, puis `security-review` en sortie |
| **MCP** | `supabase` — `execute_sql`, `get_advisors` (lint sécurité après toute RPC touchée) |
| **Agents** | `Explore` (« très minutieux ») **en amont uniquement**, pour cartographier les chemins de données de `veille_digests`/`veille_articles` et du compte |

**Le lot le plus dense et le plus risqué en sécurité.** Il porte :
- l'hydratation **de contenu** (elle n'existe nulle part aujourd'hui — le registre existant
  ne rend que des métadonnées d'affichage) ;
- le budget et la troncature **déterministe** ;
- la **garde de workspace** pour tout provider service-role.

**Pourquoi ultrathink** : 4 des 16 RPC ne sont pas exécutables par `authenticated`. Se
tromper de mode d'exécution = contourner la RLS en silence. C'est le seul endroit du
chantier où une erreur crée une faille.

---

### L2 — Workflow n8n générique

| Paramètre | Valeur |
|---|---|
| **Modèle** | **Sonnet 5** |
| **Réflexion** | **think** (mais **think hard** sur la configuration de l'appel LLM) |
| **Skills** | **`claude-api` (OBLIGATOIRE** — ids de modèles, `max_tokens`, format Messages API), `n8n-builder` |
| **MCP** | ❌ **`n8n-mcp` est bloqué en session agent** — ne pas tenter |
| **Agents** | aucun |

**Pourquoi Sonnet** : le workflow ne contient **aucune logique métier** (M-1/M-2). C'est
de la plomberie JSON calquée sur 12 workflows existants. Opus n'apporterait rien.

**Pourquoi `claude-api` est obligatoire** : le nœud `Call LLM` porte l'id de modèle et les
paramètres de l'API Messages. Ne jamais les écrire de mémoire.

🔴 **Trois règles absolues sur ce lot :**
1. **L'import et l'activation sur le VPS sont manuels, faits par Guillaume.** Préparer
   **un seul aller-retour** : JSON généré par script Python, `node --check` sur chaque
   nœud `Code`, exécution réelle vérifiée par harnais.
2. **Ne jamais proposer de handoff terminal pour n8n** — approche explicitement rejetée
   par Guillaume (coût de contexte). Rester sur JSON + import manuel, toujours.
3. **`npm test` n'inclut PAS les harnais n8n.** Lancer `npm run test:n8n`, et **lire le
   compteur final d'assertions, jamais le seul code de sortie** : une exception dans un
   nœud `Code` (globale n8n absente du sandbox : `$execution`, `$workflow`, `$env`) fait
   sauter silencieusement toutes les assertions suivantes. `intel-020` et `intel-040` ont
   vécu ainsi avec 117 assertions muettes.

---

### L3 — Callback : aiguillage, validateur, enum

| Paramètre | Valeur |
|---|---|
| **Modèle** | **Opus 5** |
| **Réflexion** | **think hard** |
| **Skills** | `supabase` (migration d'enum), puis `code-review` en sortie |
| **MCP** | `supabase` — `apply_migration`, `execute_sql` |
| **Agents** | `feature-dev:code-reviewer` **après** le refactor, pour vérifier la non-régression des 4 chemins |

**Pourquoi Opus** : c'est un refactor de code **en production** qui aiguille des écritures
métier en service-role. Les 4 chemins (`account_knowledge`, `account_issues_map`,
document, `account_watch_refresh`) doivent conserver un **comportement strictement
identique**. C'est le lot où une régression silencieuse est la plus probable.

⚠️ **Piège certain** : `ALTER TYPE intelligence_document_type ADD VALUE 'mission_report'`
**casse le `typecheck`**, pas le build. Quatre `Record` exhaustifs le réclament aussitôt.
Méthode fiable : appliquer la migration, lancer `npm run db:types`, puis `npm run
typecheck` — le compilateur **désigne lui-même** les fichiers à patcher. Les corriger fait
partie du lot, pas d'un suivi.

---

### L5 — Pilote : `intel-021` rejoué en preset

| Paramètre | Valeur |
|---|---|
| **Modèle** | **Opus 5** |
| **Réflexion** | **think hard** |
| **Skills** | aucun spécifique |
| **MCP** | `supabase` — `execute_sql` (comparer les `content_json` ancien/nouveau) |
| **Agents** | aucun |

**Pourquoi Opus** : le livrable est un **jugement de qualité comparée**, pas du code. Il
faut savoir dire « le générique est moins bon » si c'est le cas — c'est précisément la
valeur du pilote.

**Critère de sortie** : sur **la même période déjà analysée**, la sortie générique couvre
les **six sections** d'`intel-021` (tendances, signaux faibles, réglementation,
opportunités, risques, actions) via `Finding.category`, à qualité au moins équivalente.

> `intel-021` a tourné **3 fois en tout**. Le migrer ne met aucune valeur en risque —
> c'est exactement pourquoi c'est le bon pilote.

---

### L4 — Composeur UX (⏸️ suspendu)

| Paramètre | Valeur |
|---|---|
| **Modèle** | **Sonnet 5** |
| **Réflexion** | **think** |
| **Skills** | `frontend-design`, `mobile-design`, `vercel:react-best-practices` |
| **MCP** | aucun |

**Ne pas démarrer avant la preuve du pilote L5.** Sans L4, chaque preset reste lançable
depuis `intelligence-registry.ts`.

> *Un moteur sans composeur reste un moteur ; un composeur sans moteur n'est qu'un
> formulaire.*

⚠️ Rappels : la **QA visuelle est faite par Guillaume** — ne pas ouvrir Chrome de sa
propre initiative. Et un canal Supabase Realtime souscrit **sans jeton** se souscrit « avec
succès » puis ne délivre jamais rien : `ensureRealtimeAuth()` avant `subscribe()`, sans
exception.

---

## 5. Faits vérifiés en base — ne pas les redécouvrir

Mesures live du 2026-08-18 sur `jvzgmhvwirsbdkjpmvla`. **Revérifier avant de s'appuyer sur
un chiffre**, mais ne pas refaire l'analyse.

| Fait | Valeur | Conséquence |
|---|---|---|
| `ai_intelligence_runs.run_type` | `text` libre, **20 valeurs**, aucun CHECK | M-3 tenable sans migration |
| `ai_intelligence_results` | `UNIQUE(run_id, phase)`, `CHECK phase 1..10` | Une mission = 1 ligne, `phase = 1` |
| Consommateurs sémantiques de `phase` | **1 seul** : `v_ai_intelligence_summary` | Garde M-4 = **un correctif de vue** |
| Code TS filtrant la colonne `phase` | **aucun** | Pas de balayage de composants |
| RPC non exécutables par `authenticated` | **4/16** | M-5 : mode d'exécution déclaré |
| RPC `SECURITY DEFINER` | **2/16** | Idem |
| Volumes corpus | `veille_articles` 31 · `veille_digests` 7 · `intelligence_documents` 137 · `companies` 112 · `account_signals` 839 | Périmètre pilote |
| Volumes à éviter | `content_collection_items` **5** · `source_corpora` **2** | **Ne pas piloter dessus** |
| Runs par workflow | `intel-010` 176 · `intel-020` 92 · **`intel-021` 3** | Ne jamais migrer les deux premiers |

### Les fichiers qui comptent

| Rôle | Chemin |
|---|---|
| Gateway de déclenchement (**à étendre**, ne pas dupliquer) | `src/app/api/n8n/trigger/route.ts` |
| Callback (aiguillage à extraire en L3) | `src/app/api/n8n/callback/route.ts` |
| Patron du résolveur, **déjà durci** | `src/features/content-collections/data/resolve-knowledge-scope.ts` |
| Patron de registre par type | `src/features/content-collections/domain/content-type-registry.ts` |
| Types n8n (à étendre) | `src/lib/n8n/types.ts` |
| Déclenchement n8n | `src/lib/n8n/trigger-run.ts`, `src/lib/n8n/runs.ts` |
| Points d'entrée UX (L4) | `src/lib/intelligence/intelligence-registry.ts` |
| Workflow pilote à migrer | `n8n/workflows/intel-021-monthly-watch-analysis.json` |
| Workflow de référence (anatomie type) | `n8n/workflows/intel-031-issues-map.json` |

---

## 6. Boucle de validation — non négociable

À la fin de **chaque** lot, dans cet ordre :

```bash
npm run typecheck && npm test && npm run check:server-boundary && npm run lint && npm run build
```

**Ajouter `npm run test:n8n` dès qu'un fichier de `n8n/workflows/` est touché** —
`vitest` n'inclut que `src/**/*.test.ts`, donc `npm test` reste vert même quand un
workflow est cassé.

### Quatre pièges documentés au prix d'une session perdue chacun

1. **`tsc` ne voit pas tout.** Un composant client important une *valeur* depuis un module
   `server-only` passe le typecheck et casse `next build`. Seul le build le révèle.
2. **`.next/` périmé** produit de faux `TS6200`/`TS2300`. Purger avant de conclure à une
   régression (`rm -rf .next`).
3. **`build:webpack`** est la seule application réelle de la frontière serveur/client —
   Turbopack la tolère en silence.
4. **Un harnais n8n qui « passe » peut n'avoir rien exécuté.** Lire le compteur
   d'assertions.

### Migrations

- Appliquer via le MCP `supabase` (`apply_migration`), qui assigne le **vrai timestamp**.
- Puis **créer le fichier local aligné sur ce timestamp** dans `supabase/migrations/`.
  Le fichier local dérive du remote dès sa création — piège rencontré 3 fois.
- Puis `npm run db:types`.
- **Ne jamais modifier une migration déjà appliquée.**

---

## 7. Contraintes de collaboration

- **L'import n8n sur le VPS est manuel, fait par Guillaume.** Le MCP n8n est bloqué en
  session agent. Ne jamais proposer d'automatisation ni de handoff terminal pour n8n :
  approche explicitement rejetée.
- **La QA visuelle est faite par Guillaume**, sauf s'il donne explicitement la main sur un
  navigateur. Ne pas ouvrir Chrome de sa propre initiative.
- **Trancher et assumer** plutôt que présenter un menu d'options. Ne pas pivoter en cours
  de route.
- **Vérifier à la source.** Ne jamais qualifier quelque chose de factice, absent ou cassé
  sans avoir ouvert le fichier et suivi ses imports.
- **En fin de session significative** : entrée en tête de `docs/JOURNAL-SESSIONS.md`, et ne
  remonter dans `CLAUDE.md` que ce qui devient une règle durable ou change l'état de la base.

---

## 8. Prompt de démarrage du lot L0

> À copier tel quel dans une session neuve, après avoir réglé `/model claude-opus-5`.
> Le prompt est autoportant : il ne suppose aucune connaissance de la conversation de
> cadrage.

```text
Contexte : chantier « Missions d'intelligence » de Kredo, cadré et acté dans
docs/adr/ADR-0020-missions-intelligence.md (statut Accepté). Lis d'abord, dans cet ordre :
  1. docs/adr/ADR-0020-missions-intelligence.md — les 7 décisions M-1 à M-7 font autorité
  2. docs/FEATURES/intelligence_missions/05-HANDOFF-IMPLEMENTATION.md — §3, §5, §6
  3. docs/FEATURES/intelligence_missions/03-ARCHITECTURE-CIBLE.md §2 et §4 — les contrats
Ne relis pas 00/01/02 : leur substance est reprise dans l'ADR.

Tu réalises le LOT L0, et RIEN d'autre. Ultrathink n'est pas nécessaire ; think hard suffit.

──────────────────────────────────────────────────────────────────────
PÉRIMÈTRE — trois livrables, aucun de plus
──────────────────────────────────────────────────────────────────────

A. LES CONTRATS TypeScript, dans src/features/intelligence-missions/domain/
   - mission-contracts.ts : MissionSpec, CorpusKind, CorpusSelector, CorpusItem,
     ResolvedCorpus, CorpusBudget, MissionReportV1, Finding, Recommendation, SourceRef.
     Reprendre les formes de 03-ARCHITECTURE-CIBLE.md §2 et §4.1, qui intègrent déjà les
     révisions de l'ADR.
     Contraintes dures :
       * CorpusKind = "veille_period" | "intelligence_document" | "account_context".
         PAS de "rpc_context" : un nom de RPC PostgreSQL ne remonte JAMAIS dans le
         contrat de mission (ADR §5.1).
       * MissionSpec ne porte AUCUN resultType, AUCUN outputSchema, AUCUN QaRule[].
         Toutes les missions produisent MissionReportV1 ; le callback impose lui-même
         resultType = documentType = "mission_report" (ADR §5.4 / M-7).
       * Finding porte un discriminant `category` couvrant les six sections d'intel-021 :
         tendance | signal_faible | reglementaire | opportunite | risque | autre.
         Ce champ existe pour que la comparaison du pilote L5 reste vérifiable (ADR §5.3).
       * CorpusProvider déclare `execution: "user_rls" | "service_role"` (ADR M-5).
   - mission-catalog.ts : UN SEUL preset, `veille-analyse-mensuelle`, calqué sur
     l'intention métier de n8n/workflows/intel-021-monthly-watch-analysis.json
     (lire son nœud « Assemble Prompt » pour le fond, pas pour la forme).
   - Tests colocalisés en __tests__/ : le catalogue est bien typé, les slugs sont uniques,
     le preset est complet. Fonctions pures uniquement — aucun accès base.

B. LA GARDE M-4 — le seul risque de régression du chantier
   Fait déjà mesuré, ne pas le réinventorier (ADR §5.8) :
     * AUCUN code TypeScript ne filtre ni n'interprète la colonne `phase` de
       ai_intelligence_results. Les `phase` vus dans src/components/ sont des états de
       machine UI ("tracking"/"succeeded"/...) ou des jalons project_phases : hors sujet.
     * UN SEUL consommateur sémantique, en SQL : la vue v_ai_intelligence_summary, qui
       fait bool_or(r.phase = 1) AS has_client_analysis (… = 2, 3, 4), filtrée uniquement
       sur company_id et status, jamais sur run_type.
   Problème : une mission ouverte depuis un compte écrit phase = 1 avec un company_id.
   Elle ferait passer has_client_analysis à true — un compte paraîtrait analysé sans l'être.
   Travail : migration corrigeant la sous-requête latérale de v_ai_intelligence_summary
   pour exclure les résultats dont le run porte run_type LIKE 'mission:%'.
   Vérifier d'abord le texte exact de la vue en base (information_schema.views), la
   recréer à l'identique hormis cette exclusion, et PROUVER la non-régression : mêmes
   valeurs de has_* / count_results pour tous les comptes avant et après (comparer les
   deux résultats, ne pas se contenter d'un "ça tourne").
   Appliquer via le MCP supabase apply_migration, puis créer le fichier local aligné sur
   le timestamp réellement assigné, puis npm run db:types.

C. LA CONVENTION de run_type
   Un helper pur exposant `buildMissionRunType(slug)` → `mission:<slug>` et
   `isMissionRunType(runType)`, testés. Aucun appel réseau, aucun accès base.

──────────────────────────────────────────────────────────────────────
HORS PÉRIMÈTRE — ne rien commencer de tout cela
──────────────────────────────────────────────────────────────────────
  ✗ Les CorpusProviders et le résolveur (L1)
  ✗ Toute modification de /api/n8n/trigger ou du callback (L1/L3)
  ✗ Tout JSON n8n (L2)
  ✗ L'enum mission_report et sa migration (L3)
  ✗ Toute UI (L4, suspendu)
  ✗ Toute migration d'un workflow existant

──────────────────────────────────────────────────────────────────────
MÉTHODE
──────────────────────────────────────────────────────────────────────
1. Lire avant d'écrire. Ne jamais qualifier quelque chose d'absent ou de cassé sans
   avoir ouvert le fichier.
2. Annoncer ce que tu vas faire et pourquoi, puis exécuter. Trancher, ne pas présenter
   un menu d'options.
3. Boucle de validation complète, dans l'ordre, avant de déclarer le lot fini :
   npm run typecheck && npm test && npm run check:server-boundary && npm run lint && npm run build
   (test:n8n est inutile ici : aucun fichier de n8n/workflows/ n'est touché.)
   Si .next/ produit de faux TS6200/TS2300, purger avec rm -rf .next avant de conclure.
4. Rapporter les résultats réels, échecs compris.
5. Terminer en mettant à jour le tableau d'avancement du §2 de
   docs/FEATURES/intelligence_missions/05-HANDOFF-IMPLEMENTATION.md (L0 → ✅), et en
   signalant tout écart constaté entre l'ADR et la réalité du code.

Critère de sortie du lot : les contrats compilent, les tests passent, et
v_ai_intelligence_summary renvoie EXACTEMENT les mêmes valeurs qu'avant pour tous les
comptes existants tout en étant désormais immunisée contre les runs de mission.
```

---

## 9. Journal du chantier

| Date | Événement |
|---|---|
| 2026-08-18 | Vision fondatrice reçue (`00`), audit mesuré (`01`), critique et périmètre (`02`), architecture v0 (`03`) |
| 2026-08-18 | Revue contradictoire (ChatGPT) : 5 objections, **5 acceptées** — dont une invalidant la rédaction initiale de M-5 |
| 2026-08-18 | **ADR-0020 Accepté**. Périmètre de la garde M-4 mesuré : un seul consommateur sémantique (§5.8) |
| 2026-08-18 | Hors périmètre, découvert en préparant l'ADR : faille `get_manager_summary_facts` **corrigée** (migration `20260818092506`, boucle de validation complète passée) |
