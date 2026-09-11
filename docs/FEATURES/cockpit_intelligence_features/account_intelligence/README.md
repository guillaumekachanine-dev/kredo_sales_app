# Account Intelligence — corpus de référence

**Statut : NORMATIF.** Ce corpus fait autorité sur l'acquisition, la structuration et la
restitution de la connaissance compte depuis `/prospection/accounts/[companyId]`.

Il remplace, comme référence de cadrage, les documents de
`docs/FEATURES/cockpit_intelligence_features/account_knowledge/`, qui passent en **ARCHIVE**
(matière historique : ils documentent les V1→V4 et les raisons de leurs échecs, ce qui reste
précieux — mais aucun ne décrit la cible).

---

## Ordre de lecture

| # | Document | Ce qu'il fixe |
|---|---|---|
| **00** | `00-VISION-ET-PRINCIPES.md` | La finalité, le test d'acceptation, les axiomes non négociables |
| **01** | `01-CARTE-DE-LA-CONNAISSANCE-COMPTE.md` | **Le savoir**, indépendamment de son stockage et de son producteur |
| **02** | `02-DISTRIBUTION-DANS-KREDO.md` | Le propriétaire canonique de chaque connaissance. **Pièce maîtresse.** |
| **03** | `03-CONTRAT-NIVEAUX-ET-MODULES.md` | L1→L4, les modules, la couverture et la fraîcheur |
| **04** | `04-CONTRAT-EPISTEMIQUE-ET-SOURCES.md` | Ce qui peut être établi, déclaré, déduit, supposé — et à quel prix |
| **05** | `05-CONTRAT-SOURCE-PLAN-INTEL-035.md` | Le preflight de sources. **Lot fondateur.** |
| **06** | `06-ARCHITECTURE-TECHNIQUE.md` | Workflows, contrats TypeScript, séquencement des lots |
| **07** | `07-BENCHMARK-ET-GATES.md` | Les gates chiffrées qui autorisent le passage d'un lot au suivant |
| **08** | `08-HANDOFF-LOT-0-CLOTURE.md` | Clôture du Lot 0 (mesuré en prod), historique — lire `10` pour l'état courant |
| **09** | `09-PROJECT-INSTRUCTIONS-LLM-EXTERNE.md` | Gabarit du canal LLM externe (Deep Research Gemini/ChatGPT → JSON V4) |
| **10** | `10-HANDOFF-CANAL-LLM-EXTERNE.md` | **Point de reprise courant** — canal externe prouvé en réel, Lot 1 (renderer V4) à faire |

**Si tu ne lis qu'un document avant de coder : `02`.** C'est celui qui empêche de créer une
deuxième vérité. **Si tu ne lis qu'un document avant de décider : `07` §1** — l'état mesuré.

---

## Le fait qui a déclenché ce corpus

Le 07/09/2026, `intel-030-account-knowledge` en V4 a produit sur Tournaire une étude de
13 497 caractères, huit sections rédigées, prose de qualité FOLIO, citant Motion Equity
Partners, Vincent Monziols, le PPWR du 12 août 2026 et un objectif de 80 M€.

```json
"coverage": { "external_pages_fetched": 0 }
```

**Aucune page externe n'a été lue.** Ni sur ce run, ni sur les trois autres runs V4 réussis.
La seule source externe des quatre est `annuaire-entreprises.data.gouv.fr`, qui ne fournit que
le SIREN, le NAF et l'adresse. Les cinq autres « sources » sont des agrégats internes
(`internal:company:`, `internal:facts:`, `internal:signals:`, `internal:sector:`,
`internal:folio:`).

Le pipeline détecte pourtant la situation — il calcule `externalResearchStatus =
'external_research_degraded'` — **et publie quand même, en `succeeded`**.

> **Le problème d'Account Intelligence n'est pas la qualité de sa rédaction. C'est que sa
> rédaction n'est adossée à rien, et que rien à l'écran ne le dit.**

Tout ce corpus découle de là.

---

## Conventions

- Un chiffre cité ici est un **relevé daté**, jamais une valeur de référence. Les relevés
  portent leur date. Vérifier à la source avant de s'appuyer dessus.
- Un document de ce corpus ne décrit **jamais** un composant qui n'existe pas sans le marquer
  explicitement `[À CONSTRUIRE]`. L'erreur du cadrage V4 — décrire `AccountKnowledgeV4Desktop`
  comme s'il existait, alors qu'il n'a jamais été écrit — ne doit pas se reproduire.
- Les lots livrés portent leur SHA de commit dans `07-BENCHMARK-ET-GATES.md` §5.
