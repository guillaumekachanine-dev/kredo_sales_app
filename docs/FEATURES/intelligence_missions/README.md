# KREDO — Hub projet « Missions d'intelligence »

> **Statut** : **moteur livré et prouvé de bout en bout (L0 → L5), composeur UX livré (L4).
> Extension progressive du catalogue en cours.**
> **Créé le** : 18 août 2026 · **Dernière mise à jour** : 20 août 2026
> **Autorité normative** : `docs/adr/ADR-0020-missions-intelligence.md` (**Accepté**) — 🔴 fait foi en cas de divergence.
>
> 🎯 **Point d'entrée de tout agent entrant :**
> [`07-HANDOFF-L6-RENTABILITE-PORTEFEUILLE.md`](./07-HANDOFF-L6-RENTABILITE-PORTEFEUILLE.md).
> Il est autoportant : les documents `00` à `06` ne sont pas nécessaires pour travailler.

## Rôle de ce dossier

Source documentaire canonique du moteur d'intelligence transverse de Kredo.

Principe produit :

**Corpus + Mission + Contraintes → Livrable**

Les modules Kredo ne reconstruisent pas leur propre moteur IA. Ils exposent leurs données et
contextes ; un orchestrateur transverse résout le corpus, exécute la mission et archive un
livrable traçable.

## État réel du chantier

| Lot | Contenu | État |
|---|---|---|
| Cadrage | ADR-0020, décisions M-1 à M-7 | ✅ Terminé |
| L0 | Contrats, catalogue TypeScript, preset pilote | ✅ Livré |
| L1 | `CorpusProvider`s, budget, trace, assemblage de prompt | ✅ Livré |
| L2 | Exécuteur n8n générique `mission-001-run` | ✅ Livré et **figé** |
| L3 | Callback, validation stricte `MissionReportV1`, type `mission_report` | ✅ Livré |
| L4 | Composeur UX Desktop + Mobile | ✅ Livré (commit `08482338`) |
| L5 | Pilote `veille-analyse-mensuelle` rejoué sur juillet 2026 | ✅ Validé le 2026-08-20 |
| **L6** | **Mission #2 — `rentabilite-portefeuille`** | 🎯 Cadré, implémentation à démarrer → doc `07` |

**Catalogue actuel** : 1 mission (`veille-analyse-mensuelle`), dans
`src/features/intelligence-missions/domain/mission-catalog.ts`.

## Documents

| Document | Statut | Rôle |
|---|---|---|
| [`07-HANDOFF-L6-RENTABILITE-PORTEFEUILLE.md`](./07-HANDOFF-L6-RENTABILITE-PORTEFEUILLE.md) | 🎯 **Courant** | **Point d'entrée opérationnel.** Cadrage et roadmap de la mission #2, pièges vérifiés, condition d'arrêt |
| [`../../adr/ADR-0020-missions-intelligence.md`](../../adr/ADR-0020-missions-intelligence.md) | **Accepté** | 🔴 **Fait foi en cas de divergence.** 7 décisions normatives |
| [`06-HANDOFF-L5-INCIDENT.md`](./06-HANDOFF-L5-INCIDENT.md) | **Historique** | Incident L5 résolu + preuve du pilote veille. Ne plus utiliser comme état courant |
| [`05-HANDOFF-IMPLEMENTATION.md`](./05-HANDOFF-IMPLEMENTATION.md) | **Historique** | 65 Ko documentant précisément L0 → L3. Ne plus utiliser comme état courant |
| [`00-VISION-FONDATRICE.md`](./00-VISION-FONDATRICE.md) | **Fondateur** | Note d'intention et philosophie produit. Expose une vision, pas l'état de l'implémentation — ne pas le réécrire lot par lot |
| [`01-AUDIT-EXISTANT.md`](./01-AUDIT-EXISTANT.md) | **Instantané daté** | Inventaire mesuré le 18/08/2026. Ses volumétriques ont dérivé — sa valeur est d'être daté, pas d'être à jour |
| [`02-CRITIQUE-ET-PERIMETRE.md`](./02-CRITIQUE-ET-PERIMETRE.md) | **Proposition historique** | Critique de la vision et arbitrages proposés. L'ADR-0020 fait foi sur les arbitrages finaux |
| [`03-ARCHITECTURE-CIBLE.md`](./03-ARCHITECTURE-CIBLE.md) | **Proposition historique** | Architecture v1, amendée sur 5 points par la revue du 18/08. L'ADR et le code livré font foi |

**Pour implémenter** : `07`, puis l'ADR-0020 en cas de doute normatif. Rien d'autre.
**Pour comprendre la genèse** : `00` (l'intention) → `01` (le réel mesuré) → `02` (les
arbitrages) → `03` (la solution technique).

## Le test de sortie — et sa vérification en cours

Un seul critère décide du succès du chantier :

> **Ajouter une nouvelle intention d'analyse à Kredo ne demande aucun import n8n :
> une entrée de catalogue TypeScript, un test, un `git push`.**

Aujourd'hui, toute nouvelle capacité IA hors missions exige d'écrire du JSON n8n puis un import
manuel sur le VPS, sans détection de dérive. C'est ce coût, et non le nombre de nœuds dupliqués,
qui limite l'extension de Kredo. La dette est mesurable : 11 workflows patchés depuis la
Session 28 ne tournent toujours pas sur le VPS, et `npm run n8n:status` ne voit pas cette dérive
(il compare des compteurs de nœuds, or seul du code interne a changé).

**Vérification** : `n8n/workflows/mission-001-run.json` ne contient **aucune** occurrence de
« veille » — l'exécuteur est intégralement générique. La mission #2 (lot L6) doit donc se livrer
sans une ligne de JSON n8n ni aucun import VPS. **C'est L6 qui transforme ce test en preuve.**

## Les cinq points structurants — tranchés le 18/08

Passés en revue contradictoire. **Cinq objections, cinq acceptées.** Détail : ADR-0020 §5.

| # | Question | Décision | Réf. |
|---|---|---|---|
| 1 | Le métier vit-il en TypeScript ou dans n8n ? | **TypeScript** — n8n devient un exécuteur sans métier | M-1 |
| 2 | Sur quels corpus valider la V1 ? | **Veille + documents + compte**, pas les corpus vides de `00` §11 | `02` §3.1 |
| 3 | Redécouper les 16 RPC d'hydratation ? | **Non** — mais `rpc_context` est supprimé du contrat : providers nommés par le métier, la mission ne connaît jamais une RPC | ADR §5.1 |
| 4 | Une mission peut-elle écrire dans le métier ? | **Non** — `resultType` retiré du preset, imposé par le callback | ADR §5.4 |
| 5 | Composeur UX en V1 ? | Coupé au cadrage, **puis livré après la preuve du pilote** (L4, commit `08482338`) | `02` §7.2 |

## Règle de gouvernance

Toute nouvelle fonctionnalité IA transverse doit être challengée contre :

> **Est-ce réellement une nouvelle capacité, ou seulement une nouvelle mission utilisant des
> corpus et compétences déjà disponibles ?**

Si la seconde réponse suffit, **aucun nouveau moteur ni workflow métier parallèle ne doit être
créé**.

Et sa réciproque, tout aussi contraignante — **auditer l'existant avant de transformer une idée
en mission** : une capacité déjà servie par INTEL-020 (rédaction assistée, 79 scénarios) ou par
le hub compte (intel-030 / 031 / 032) n'est pas une mission, c'est une duplication. Le
raisonnement complet, feature par feature, est au §2.3 du document `07`.

Corollaire issu de `02` §4 :

> **Une généralisation ne rentabilise que les cas à venir.** Les 12 workflows métier déjà réglés
> ne se migrent pas : le moteur de missions est une addition, pas une refonte.

## Où vit le code

| Élément | Emplacement |
|---|---|
| Contrats, catalogue, validateur, budget | `src/features/intelligence-missions/domain/` |
| Providers de corpus, résolveur, assemblage de prompt | `src/features/intelligence-missions/data/` |
| Composeur Desktop / Mobile | `src/features/intelligence-missions/components/` |
| Lancement | `src/app/api/n8n/trigger/route.ts` (branche `missionSlug`) |
| Retour et validation | `src/app/api/n8n/callback/route.ts` |
| Exécuteur générique | `n8n/workflows/mission-001-run.json` — **figé, ne pas modifier** |
