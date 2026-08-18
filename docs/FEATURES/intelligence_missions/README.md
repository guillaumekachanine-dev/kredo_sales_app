# KREDO — Hub projet « Missions d'intelligence »

> **Statut** : **cadrage terminé, implémentation à démarrer (lot L0)** — architecture actée en ADR-0020 (**Accepté**)
> **Créé le** : 18 août 2026
> **Objet** : centraliser la conception du moteur d'intelligence transverse de Kredo.

## Rôle de ce dossier

Source documentaire canonique du chantier visant à faire évoluer Kredo d'une
juxtaposition de fonctionnalités IA vers un **moteur unique de missions d'intelligence
pilotées par l'intention**.

Principe produit :

**Corpus + Mission + Contraintes → Livrable**

Les modules Kredo ne reconstruisent pas leur propre moteur IA. Ils exposent leurs données
et contextes ; un orchestrateur transverse résout le corpus, exécute la mission et archive
un livrable traçable.

## Documents

| Document | Statut | Rôle |
|---|---|---|
| [`00-VISION-FONDATRICE.md`](./00-VISION-FONDATRICE.md) | **Canonique** | Note d'intention, philosophie produit, principes, périmètre initial |
| [`01-AUDIT-EXISTANT.md`](./01-AUDIT-EXISTANT.md) | **Factuel** | Inventaire mesuré : code, 19 workflows n8n, base live. Chiffres du 2026-08-18 |
| [`02-CRITIQUE-ET-PERIMETRE.md`](./02-CRITIQUE-ET-PERIMETRE.md) | **Proposition** | Critique de la vision, 6 mises en garde, périmètre soutenable, charge de travail |
| [`03-ARCHITECTURE-CIBLE.md`](./03-ARCHITECTURE-CIBLE.md) | **Proposition v1** | Contrat de mission, résolveur, workflow générique, lots. **Amendé sur 5 points par la revue du 18/08** |
| [`../../adr/ADR-0020-missions-intelligence.md`](../../adr/ADR-0020-missions-intelligence.md) | **Accepté** | 🔴 **Fait foi en cas de divergence.** 7 décisions normatives + arbitrage de la revue contradictoire |
| [`05-HANDOFF-IMPLEMENTATION.md`](./05-HANDOFF-IMPLEMENTATION.md) | **Opérationnel** | 🎯 **Point d'entrée de tout agent entrant** — avancement, config par lot (skills/MCP/modèle/réflexion), pièges vérifiés, prompt du lot en cours |
| `04-UX-MISSIONS.md` | À produire | Parcours Desktop/Mobile détaillés — utile seulement si le lot L4 est retenu, décidé après L5 |

Des sous-dossiers `decisions/` et `handoffs/` ne seront créés que lorsqu'ils deviendront
nécessaires. **Pas de structure documentaire vide par anticipation.**

## Ordre de lecture

**Pour implémenter** — commencer par `05-HANDOFF-IMPLEMENTATION.md`, puis l'ADR-0020.
Les documents `00` à `02` ne sont pas nécessaires : leur substance est reprise dans l'ADR.

**Pour comprendre la genèse** :
1. `00` — l'intention.
2. `01` — ce qui existe vraiment (contredit plusieurs intuitions de `00`, notamment §11).
3. `02` — les arbitrages proposés.
4. `03` — la solution technique.

`02` et `03` **ne sont pas canoniques** : ils ont été écrits pour être challengés — ils
l'ont été, et amendés. **En cas de divergence, l'ADR-0020 fait foi.**
`01` est canonique tant que ses chiffres sont revérifiés.

## Les cinq points structurants — tranchés le 18/08

Passés en revue contradictoire (ChatGPT, 18/08). **Cinq objections, cinq acceptées.**
Détail de l'arbitrage : ADR-0020 §5.

| # | Question | Décision | Réf. |
|---|---|---|---|
| 1 | Le métier vit-il en TypeScript ou dans n8n ? | **TypeScript** — n8n devient un exécuteur sans métier | M-1 |
| 2 | Sur quels corpus valider la V1 ? | **Veille + documents (137) + compte (112 / 839)**, pas les 3 corpus vides de `00` §11 | `02` §3.1 |
| 3 | Redécouper les 16 RPC d'hydratation ? | **Non** — mais `rpc_context` est **supprimé du contrat** : providers nommés par le métier, la mission n'a jamais connaissance d'une RPC | ADR §5.1 |
| 4 | Une mission peut-elle écrire dans le métier ? | **Non** — `resultType` **retiré du preset**, imposé par le callback. Plus aucune configuration à compromettre | ADR §5.4 |
| 5 | Composeur UX en V1 ? | **Coupé** — décidé après la preuve du pilote | `02` §7.2 |

### Ce que la revue a corrigé, au-delà de la simplification

- 🔴 **Une erreur factuelle** : M-5 affirmait que les RPC d'hydratation étaient résolubles
  avec le client utilisateur sous RLS. Vérification live : **4 des 16 ne sont pas
  exécutables par `authenticated`**, **2 sont `SECURITY DEFINER`**. Chaque provider déclare
  désormais son mode d'exécution, et tout provider service-role porte une garde de
  workspace testée.
- **Une incohérence interne** : `03` plaçait la résolution dans `/api/n8n/trigger` mais
  listait aussi un `actions/launch-mission.ts`. Un seul chemin de lancement subsiste.
- **Une incohérence de l'audit** : `01` annonçait « aucun chiffre repris d'un document
  antérieur » alors que deux lignes venaient de `CLAUDE.md`. Remesuré live —
  `companies` 96 → **112**, `account_signals` 745 → **839**. L'écart **renforce**
  l'arbitrage n°2.
- **Un contrat de sortie unique** `MissionReportV1` remplace le schéma par mission et le
  DSL de QA. Ajout imposé par le pilote : `Finding.category` couvre les six sections
  d'`intel-021`, sans quoi la comparaison ancien/nouveau perdrait sa structure.
- **Estimation** : 7 sessions réalistes (5 optimiste), composeur exclu. Les coupes font
  gagner ~1 session, pas 4 — **aucune n'atteint L2**, l'import VPS manuel.

## Le test de sortie

Un seul critère décide du succès de la V1 :

> **Ajouter une nouvelle intention d'analyse à Kredo ne demande aucun import n8n :
> une entrée de catalogue TypeScript, un test, un `git push`.**

Aujourd'hui, toute nouvelle capacité IA exige d'écrire du JSON n8n puis un import manuel
sur le VPS, sans détection de dérive (`01` §11). C'est ce coût, et non le nombre de nœuds
dupliqués, qui limite l'extension de Kredo.

## Sources existantes à considérer avant toute décision

Réutilisation obligatoire, avec l'état réel mesuré en `01` :

- `src/lib/n8n/types.ts` et le patron `trigger → runId → callback → résultat` ;
- `ai_intelligence_runs` / `ai_intelligence_results` — **420 / 353 lignes, `run_type` libre
  portant déjà 20 valeurs : aucune migration nécessaire** (`01` §4) ;
- `intelligence_documents` / `_versions` / `_links` — 137 documents (`01` §7) ;
- `resolve-knowledge-scope.ts` — **le résolveur existe déjà en miniature, et il est
  correctement durci contre la falsification client** (`01` §5) ;
- les 16 RPC d'hydratation — **découpées par cas d'usage, donc non composables** (`01` §6) ;
- `intelligence-registry.ts` — le point d'entrée transverse existe à moitié (`01` §10) ;
- `intel-021-monthly-watch-analysis` — **3 runs en tout : pilote idéal parce que le migrer
  ne met aucune valeur en risque** (`02` §4).

> ⚠️ **Découvert hors périmètre en préparant l'ADR** : `public.get_manager_summary_facts`
> est `SECURITY DEFINER`, sans `search_path` fixé, et `EXECUTE` est accordé à `anon`.
> À traiter séparément — ADR-0020, action item 9.

## Règle de gouvernance

Toute nouvelle fonctionnalité IA transverse doit être challengée contre :

> **Est-ce réellement une nouvelle capacité, ou seulement une nouvelle mission utilisant
> des corpus et compétences déjà disponibles ?**

Si la seconde réponse suffit, **aucun nouveau moteur ni workflow métier parallèle ne doit
être créé**.

Corollaire issu de `02` §4, tout aussi contraignant :

> **Une généralisation ne rentabilise que les cas à venir.** Les 12 workflows métier déjà
> réglés ne se migrent pas : le moteur de missions est une addition, pas une refonte.
