# HANDOFF — DYNAMIC PLAYBOOKS — LOT 3
## Configurateur Situation + contrats

**Agent :** A2 — Situation & contrats
**Date :** 23 août 2026
**HEAD de départ :** `b6747c58` (`feat(cockpit): bouton Recruter du Cockpit Intelligence compte mobile (P0-B)`)

---

## 1. Statut

**DONE** — sous réserve de la QA visuelle, réservée à Guillaume (`CLAUDE.md` §8). Toutes les
validations automatiques sont vertes, **build webpack compris**.

Aucun appel LLM, aucun appel n8n, aucune écriture Supabase : le CTA « Générer le pitch » valide,
construit le brief et s'arrête sur un état `prêt`. Le raccord réseau est le périmètre du Lot 4.

⚠️ **Activité concurrente dans le répertoire de travail**, sans rapport avec ce lot et non touchée :
`src/components/veille/**` (5 fichiers + 1 test) et
`src/features/source-management/__tests__/source-management-components.test.ts`. Elles étaient déjà
modifiées à l'ouverture du lot et **ne sont pas dans le commit**.

---

## 2. Fichiers

### Créés (6)

| Fichier | Rôle | Nature |
|---|---|---|
| `playbooks/battle-situation-contract.ts` | Contrat `BattleSituation` figé au Lot 0 §5.2 | **types purs, zéro export runtime, zéro import** |
| `playbooks/battle-situation-options.ts` | Résolveurs d'options (persona, enjeu, angle, timing, objection, ROI, offre), validation, purge, résumé, projection vers le contrat | fonctions pures |
| `playbooks/battle-situation-brief.ts` | Construction du `CommunicationBrief` canonique | fonction pure |
| `playbooks/BattleSituationPickers.tsx` | Primitives présentationnelles (badge de provenance, bloc, carte d'option, état vide) | présentationnel |
| `playbooks/BattleSituationKnowledgePicker.tsx` | Picker léger de listes personnelles (`preferredCollectionIds`) | client |
| `playbooks/__tests__/battle-situation-options.test.ts` · `…-brief.test.ts` | 44 tests | vitest |

### Modifié (1)

| Fichier | Nature |
|---|---|
| `playbooks/BattleSituationView.tsx` | Corps réécrit. **La signature `BattleSituationViewProps` livrée par le Lot 1 est inchangée, à l'octet près.** |

### Non touchés — vérifié par `git status`

```
SectorPlaybooksModal.tsx · BattleWorkspace.tsx · BattleCardsSection.tsx
BattleAccountRail.tsx · BattleModeSwitcher.tsx · battle-workspace-model.ts
IntelligenceSplitModalShell.tsx · src/lib/n8n/types.ts
communication-scenario-registry.ts · src/lib/communication/** · n8n/** · supabase/**
package.json (aucune dépendance ajoutée)
```

---

## 3. Contrat `BattleSituation`

Repris **tel quel** du Lot 0 §5.2, sans un champ de plus ni de moins :

```ts
type BattleSituationSource = "account" | "sector"
type BattleSituationChoice = { id?: string; label: string; source: BattleSituationSource }

type BattleSituation = {
  competitiveEntryId: string      // competitive_map_entries.id
  segmentId: string               // sector_intelligence.id (niveau segment)
  issue: BattleSituationChoice    // obligatoire
  angle: BattleSituationChoice    // obligatoire
  timing?: BattleSituationChoice
  objection?: { label: string; response?: string }
  roiArgument?: string
  personaLabel?: string           // UNIQUEMENT si aucun contact CRM
}
```

Aucun champ canonique n'y est dupliqué : ni `companyId`, ni `contactId`, ni `offerRef`, ni
`preferredCollectionIds`, ni tone/length/language/formality. **Un test l'asserte** (« ne duplique
aucun champ déjà canonique dans battleSituation »).

Les clés absentes sont **absentes**, pas à `undefined` : un `timing` non choisi ne crée pas la clé.

---

## 4. Sources de chaque picker

| Dimension | Source COMPTE | Source SECTEUR | ID stable | Obligatoire |
|---|---|---|---|---|
| **Interlocuteur** | `contacts` × `persons` du compte actif (requête client, RLS) | `playbook.personas[].fonction` via `parsePlaybookPersonas()` | oui côté compte | **oui** |
| **Enjeu** | `account_issues` (`status = 'open'`), avec `evidence_level` | `knowledge.painPoints[]`, avec `resolvedLevel` | oui des deux côtés | **oui** |
| **Angle** | `actor.angleEntree`, puis `actor.details.traductionCommerciale[]` | `parsePlaybookEntryPoints()[].angle` | **non** (aucune des 3) | **oui** |
| **Offre** | `getSuggestedOffers(companyId)` — Server Action existante | `suggestedPracticeSlugs` remonte les practices suggérées en tête | oui | **oui** |
| **Timing** | `actor.details.triggers[]` | `knowledge.regulatory[]`, `knowledge.events[]` | non / oui | non |
| **Objection** | — | `parsePlaybookObjections()` (+ réponse préparée) | non | non |
| **ROI** | — | `parsePlaybookRoiArguments()` — texte seul | non | non |
| **Knowledge** | — | — | `content_collections.id` | non |

**Trois règles de provenance tenues dans le code, pas seulement dans l'UI :**

- `source` est calculée à la construction de l'option, jamais devinée à l'affichage ;
- `evidence_level` d'un enjeu compte (`observed`/`inferred`/`weak`) est exposé : un enjeu `weak`
  n'est pas présenté comme un fait observé ;
- `resolvedLevel` (`segment`/`macro`) reste **orthogonal** à `source` — il n'est jamais replié
  dedans, il répond à une autre question.

**Lignes rouges ≠ objections.** `profile_json.a_ne_pas_dire` n'alimente aucun picker : ce sont des
interdits de discours, pas des arguments opposés par l'interlocuteur. Test dédié.

**Aucune matière ⇒ aucune génération.** `findUnsatisfiableRequirements()` bloque le CTA et
affiche un message net quand une dimension obligatoire n'a aucune option. Rien n'est inventé.

---

## 5. Fallback persona — chemin de première classe

Mesure du Lot 0 : **15 comptes sur 23 n'ont aucun contact CRM**. Le repli n'est donc pas un cas
dégradé, c'est le chemin majoritaire.

- Contacts CRM présents → options `kind: "contact"` : `contactId`, nom réel, persona dérivée par
  `personaFromJobTitle()` (appliquée par `buildDefaultBrief`).
- Aucun contact → options `kind: "playbook"`, et un simple bandeau explicatif (« Aucun contact CRM
  sur ce compte : personas du playbook sectoriel »), **jamais un état d'erreur**.
- Dans ce cas : `battleSituation.personaLabel = <rôle>`, `who.recipient.displayName` reste **vide**
  et `who.recipient.persona` reste `"other"`. Écrire « DSI » dans `displayName` serait faux —
  le nœud `Quality Check` de n8n y cherche un nom de famille (Lot 0 §5.4.a). Deux tests.

---

## 6. Construction du `CommunicationBrief`

`buildBattleSituationBrief()` — fonction pure, ordre imposé par le Lot 0 §7 :

1. `buildDefaultBrief({ company: {lifecycleStatus, name}, contacts, scope: "account", preset })` —
   type de destinataire, relation et persona dérivés du lifecycle et du contact. **Rien n'est
   recalculé ici** (`recipientTypeFromLifecycle` / `relationFromLifecycle` ne sont d'ailleurs pas
   exportés : contrairement à ce qu'indique le Lot 0 §8.2, on les obtient uniquement par
   `buildDefaultBrief`).
2. Imposition du bloc `what` : `scenario: battle_situation_pitch`, `outputKind: spoken_pitch`,
   `channel: spoken_pitch_30s`, `activityCategory: commerce_prospection`, `scope: account`,
   `length` choisie (défaut `concise`). Nécessaire : `buildDefaultBrief` cherche le scénario dans
   le registre et retombe sur `SCENARIO_REGISTRY[0]` tant que A3 ne l'y a pas ajouté.
3. Défauts : `objective: get_meeting`, `tone: direct`, `formality: vous`, `language: fr`.
4. `context` : `offerRef` (canonique), `preferredCollectionIds` (canonique, omis si vide),
   `battleSituation`.
5. `resolveCommunicationOptions(facts, brief, { scenario: "user", scope: "user", offerId: "user" })`
   — la cascade officielle. `fieldSources.scenario = "user"` est indispensable, sinon
   `preserveExplicitScenario` est faux.
6. Shim pré-Lot 4 (§7).

`mustInclude` / `mustExclude` **ne sont pas utilisés** : y replier la situation ferait perdre la
structure et la provenance.

---

## 7. Cast temporaire — un seul, et où il est

```ts
// battle-situation-brief.ts
export const BATTLE_SITUATION_SCENARIO = "battle_situation_pitch" as CommunicationScenario
```

C'est le **seul** cast du lot. Aucun `any` ne circule dans l'UI, qui ne manipule que des types
exacts. A3 le supprime au Lot 4 : la constante redeviendra un littéral de l'union.

Le bloc `battleSituation` lui-même **ne demande aucun cast à l'écriture** : le contexte est typé
`CommunicationBrief["context"] & { battleSituation: BattleSituation }`, et un objet ainsi typé est
assignable au contexte du brief (le contrôle des propriétés excédentaires ne s'applique qu'aux
littéraux). Seule la **relecture** en a besoin, centralisée dans `readBattleSituation(brief)`.

### Shim `enforceBattleScenarioIdentity` — à connaître avant d'écrire le Lot 4

Tant que `battle_situation_pitch` n'est pas dans le registre, `getScenarioDefinition` renvoie
`undefined`, `preserveExplicitScenario` est faux et `chooseDefinition` retombe sur le **premier**
scénario éligible de `commerce_prospection` : le résolveur remplacerait silencieusement le
scénario, le canal, le type de sortie, et forcerait `recipientType: "prospect"` sur un client
actif.

Le brief est donc repassé par une imposition d'identité **uniquement** quand
`scenarioRegistered === false` : scénario, `outputKind`, canal, catégorie, longueur demandée, et
type de destinataire quand celui dérivé du lifecycle fait partie des 4 types commerciaux. Tout le
reste (objectif, ton, références) reste ce que le résolveur a décidé.

**Dès que A3 enregistre le seed, cette fonction rend le brief du résolveur tel quel** — le
comportement de production s'active sans changer une ligne ici. Le drapeau `scenarioRegistered` est
retourné par le builder et asserté en test (`expect(scenarioRegistered).toBe(false)` **aujourd'hui**
— ce test passera au rouge au Lot 4, c'est voulu : il signalera à A3 que la bascule a eu lieu et
qu'il doit inverser l'assertion).

---

## 8. Décision Knowledge — arbitrage R-A

**`ManageCollectionsDesktop/Mobile` n'est PAS monté dans le Battle Workspace.** Ces composants sont
eux-mêmes des `IntelligenceSplitModalShell` ; le Battle Workspace vit déjà dans un
`IntelligenceSplitModalShell`, dont l'écouteur est posé sur `window`. Les imbriquer ferait fermer
les **deux** modales sur `Échap` et créerait deux pièges à focus concurrents (Lot 0 §14 R-A).
Corriger cela suppose de toucher au shell partagé — 12 modales, décision A0, hors de ce lot.

**Livré à la place :**

- un **picker léger inline** : listes personnelles avec nom, nature (Liste / Corpus) et
  `itemCount`, sélection/désélection, chargement paresseux `fetchCollectionsSummary()` **à
  l'ouverture du picker** (pas au montage de Situation) ;
- le CTA « Gérer la connaissance ↗ » pointe vers `/knowledge` **dans un nouvel onglet** : la
  situation en cours reste intacte, aucun shell imbriqué, aucune modification du shell partagé ;
- deux limites affichées honnêtement plutôt que contournées (Lot 0 §9.3) : un Corpus n'apporte que
  ses items directs, et le prompt plafonne à 8 éléments de listes personnelles.

**À arbitrer au Lot 5** si Guillaume veut le gestionnaire complet *dans* la modale : la piste la
plus légère reste que le shell externe cesse d'écouter tant qu'un enfant modal est ouvert. Ce lot
n'a rien fait qui atténue R-A, et rien qui l'aggrave.

`knowledgeScope` n'est pas utilisé (mécanisme distinct, sélection unique venue de l'onglet
Connaissances — Lot 0 §9.2).

---

## 9. Data / Supabase

- **Lectures, compte actif UNIQUEMENT** : `contacts` (+ embed `persons`, `limit 100`),
  `account_issues` (`status = 'open'`, `limit 50`), `profiles.full_name` de l'utilisateur connecté
  — toutes en requête client, RLS workspace. Plus la Server Action `getSuggestedOffers(companyId)`.
  `fetchCollectionsSummary()` seulement à l'ouverture du picker Knowledge.
- **Jamais** de préchargement pour tous les comptes du segment.
- **Écriture Supabase : aucune. Migration : non. Appel n8n : aucun.**
- `loadCommunicationContextForCurrentUser` **n'est pas appelée** (recommandation Lot 0 §8.2
  confirmée) : elle produit des faits que la Battle Card possède déjà.
- Il n'existe aucun helper de contacts exporté ; la requête est reproduite dans la vue plutôt que
  d'extraire celle de `CommunicationComposerHost` (zone non possédée).

---

## 10. UX livrée

Configurateur en 8 blocs numérotés — 4 requis (Interlocuteur, Enjeu, Angle, Offre), 4 facultatifs
(Timing, Objection, ROI, Knowledge) — en 2 colonnes Desktop, 1 colonne Mobile, cartes
sélectionnables, labels courts, provenance visible, aucun formulaire dense. Les dimensions
facultatives se **désélectionnent** d'un second clic.

Résumé vivant en bas, recalculé à chaque changement :

> `DSI · Modernisation du SI de production · Industrialisation gouvernée · Publication du CA semestriel · offre Audit data`

Purement UI — il ne remplace pas le brief et n'est envoyé nulle part.

Le CTA reste désactivé tant que les 4 dimensions requises ne sont pas choisies ; le manque est
nommé explicitement (« Manque : Enjeu · Offre »).

Langage visuel repris du Lot 2 (petites cartes, brass, `motion-reduce:`) — **aucune couleur
nouvelle, aucun HEX en dur, aucune dépendance ajoutée**. Zones tactiles ≥ 44 px sur Mobile.

**Changement de compte :** le configurateur est monté avec `key={actor.id}` → une situation vierge,
sans effet de synchronisation. En complément, `pruneDraftAgainstOptions()` (valeur dérivée pendant
le rendu) purge toute sélection devenue orpheline quand les données arrivent en chargement
paresseux.

---

## 11. Tests

`npx vitest run src/features/business-intelligence/playbooks/__tests__/` → **44 tests**.

Les 9 cas prioritaires du lot, tous couverts : sans contact CRM (fallback playbook) · enjeu
`SECTEUR` · enjeu `COMPTE` · aucun enjeu (CTA bloqué) · timing absent (brief valide) · objection
absente (brief valide) · offre absente (CTA bloqué) · Knowledge → `preferredCollectionIds` · angle
présent **uniquement** dans `battleSituation.angle`.

En plus : identité complète du brief, défauts, longueur utilisateur, `recipientType` dérivé du
lifecycle, non-duplication des champs canoniques, traçabilité `competitiveEntryId`/`segmentId`,
`readBattleSituation`, ordre et non-duplication des angles, tri des offres suggérées, purge du
brouillon au changement de compte, résumé.

**Un bug réel trouvé par les tests, corrigé :** les clés d'options sans identifiant de base étaient
positionnelles (`actor-angle`). L'angle du compte A survivait donc à la purge sur le compte B et
serait parti dans le brief **avec le libellé du compte A**. Les clés sont désormais dérivées du
contenu ; un test le verrouille.

| Commande | Résultat |
|---|---|
| `npm run typecheck` | ✅ vert |
| `npm test` | ✅ **202 fichiers, 1996 tests** (avant le lot : 1952 — **+44**) |
| `npm run check:server-boundary` | ✅ vert |
| `npx eslint src/features/business-intelligence/playbooks/` | ✅ **0 problème** |
| `npm run build` (Turbopack) | ✅ exit 0 |
| `npm run build:webpack` | ✅ exit 0 — *« Compiled successfully in 12.1s »* |

`build:webpack` passé délibérément : c'est la seule application réelle de la frontière
serveur/client (`CLAUDE.md`). Deux imports sensibles le traversent — `SectorKnowledgeReadModel`
depuis un module `server-only` (en `import type`, effacé) et la Server Action `getSuggestedOffers`
(même patron que `IntelligenceActionDrawers.tsx`, déjà en production).

`npm run lint` global reste rouge sur sa baseline pré-existante (≈420 erreurs, surtout
`no-explicit-any` dans `src/lib/**`) — aucune sur les fichiers de ce lot.

### QA manuelle — **à faire par Guillaume**

`/intelligence` → segment **Compositions & ingrédients B2B** → Playbooks → Battle Cards → onglet
Situation.

| # | Compte | Attendu |
|---|---|---|
| 1 | **Robertet** (`67b346ff…`) | Contacts CRM listés (nom · fonction), enjeux `COMPTE` en tête puis `SECTEUR`, angle `angle_entree` en premier. |
| 2 | Un acteur **« Spatial, défense »** hors Exail/ACRI-ST | Aucun contact → bandeau « personas du playbook », **pas** un état d'erreur. |
| 3 | Un compte **sans enjeu** | CTA désactivé + message de blocage nommant la dimension manquante. |
| 4 | Segment **Hébergement & résidences de tourisme** | Le mode Battle n'est pas proposé (`isBattleModeAvailable`), donc Situation non atteignable. |
| 5 | N'importe quel compte | « + Ajouter du contexte » charge les listes **à l'ouverture**, jamais avant ; « Gérer la connaissance ↗ » ouvre `/knowledge` dans un nouvel onglet **sans fermer la modale**. |
| 6 | Changement de compte dans le rail | La situation repart vierge. |
| 7 | Mobile 390 px | 1 colonne, zones ≥ 44 px, CTA pleine largeur. |
| 8 | `Échap` / `Tab` | Comportement du shell inchangé (aucune modale imbriquée n'a été introduite). |

---

## 12. Écarts au cadrage

**Aucun écart de fond.** Trois précisions :

1. **Lot 0 §8.2 est inexact sur deux primitives** : `recipientTypeFromLifecycle` et
   `relationFromLifecycle` **ne sont pas exportées** par `communication-brief-options.ts`. On les
   obtient uniquement via `buildDefaultBrief`, ce qui est de toute façon le chemin canonique.
2. **CTA « Gérer la connaissance »** : livré en lien vers `/knowledge` dans un nouvel onglet plutôt
   qu'en modale imbriquée (§8) — c'est l'application de l'arbitrage R-A demandé par le lot.
3. **Sélecteur de longueur** (`Concis` / `Standard`) ajouté au résumé : le cadrage §9.1 prévoit
   « longueur par défaut courte/standard » et le Lot 0 §6.2 note que l'UI Battle expose ces deux
   valeurs. Deux options, pas quatre.

---

## 13. Ce que le Lot 4 (A3) doit faire — attentes précises

1. **`src/lib/n8n/types.ts`**
   - `+ "battle_situation_pitch"` dans l'union `CommunicationScenario` ;
   - `battleSituation?: BattleSituation` dans `CommunicationBrief["context"]`, via
     `import type { BattleSituation } from "@/features/business-intelligence/playbooks/battle-situation-contract"`
     (le module est **types purs**, aucune dépendance runtime créée) ;
   - puis retirer le cast de `BATTLE_SITUATION_SCENARIO` dans `battle-situation-brief.ts`
     (une ligne).

2. **`communication-scenario-registry.ts`** — le seed exact du Lot 0 §6.2, **et** l'ajout à
   `OFFER_REQUIRED_SCENARIOS` (c'est ce `Set`, pas le champ du seed, qui pilote `requiresOffer`).
   `eligibleRecipientTypes` doit couvrir les 4 types commerciaux, sinon le résolveur forcera
   `prospect` sur un client actif — le Lot 3 le compense aujourd'hui par un shim, plus après.

3. **`communication-scenario-registry.test.ts`** — **deux** changements, pas un :
   `expect(ids).toHaveLength(92)` → `93` (ligne 26) **et** l'ajout de `"battle_situation_pitch"` à
   la constante `TARGET_SCENARIO_IDS` du même fichier, que le test compare terme à terme (vérifié
   à la lecture le 2026-08-23 — le Lot 0 §6.3 ne mentionne que le compteur). Ajouter un scénario
   **ne casse pas le typecheck** : ce test et
   `node scripts/generate-communication-manifest.mjs --check` sont les seuls garde-fous
   (Lot 0 §R-D).

4. **Test à inverser** — `battle-situation-brief.test.ts`, cas « documente que le scénario n'est pas
   encore enregistré » : `expect(scenarioRegistered).toBe(false)` devient `true`. Il est écrit pour
   passer au rouge au Lot 4 : c'est le signal que le shim est devenu inerte. Vérifier au passage
   que les cas d'identité (scénario/canal/outputKind/`recipientType` `active_client`) restent verts
   **sans** le shim — ils prouvent alors que le registre fait le travail.

5. **n8n `intel-020-communication.json`** — `SCENARIOS_REQUIRING_OFFER` du nœud `Validate Brief`
   (la liste existe deux fois, elle a déjà dérivé une fois) et bloc de mission dans
   `Assemble Prompt` lisant `brief.context.battleSituation`, avec **dégradation silencieuse** quand
   il est absent (le scénario reste visible dans le sélecteur générique du Composer, Lot 0 §6.5).
   Rappel : ne jamais présenter un élément `source: "sector"` comme un fait du compte, et ne jamais
   transformer `roiArgument` en engagement chiffré.

6. **Point d'entrée du déclenchement** — rien à inventer, tout est déjà là :

```ts
const result = buildBattleSituationBrief({ actor, segmentId, senderName, draft })
if (!result.ok) return
await fetch("/api/n8n/trigger", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    workflowId: "intel-020-communication",
    entityType: "company",
    entityId: actor.companyId,
    companyId: actor.companyId,
    input: result.brief,
  }),
})
```

   Dans `BattleSituationView.tsx`, le point d'accroche est l'état `isReady` du bloc résumé : il
   remplace le panneau « Situation prête » par `useRunTracker({ runId })` puis
   `BattlePitchResult`. **Le brief n'a pas à être reconstruit.**

7. **Ne pas toucher** : `battle-situation-options.ts`, `BattleSituation*.tsx` (A2, Lot 5) et
   `BattleWorkspace.tsx` / `SectorPlaybooksModal.tsx` (A1).

---

## 14. Dette et points ouverts

1. **R-A non résorbé** — le gestionnaire Knowledge complet reste hors modale. Arbitrage A0 attendu
   au Lot 5 si l'ouverture in-modale est jugée nécessaire.
2. **R-C hérité** — `get_communication_context` hydrate la connaissance sectorielle à la maille
   **macro** (`companies.sector_id`) alors que le Playbook affiche la maille **segment**. Absorbé
   ici par les snapshots texte et par `segmentId` dans `battleSituation` ; la dette reste entière
   côté RPC et concerne 92 scénarios — **ne pas la corriger dans ce chantier**.
3. **Plafond de 8 items** sur les listes personnelles : affiché à l'utilisateur, non contourné.
4. **`account_issues` triés par `criticality`** décroissante, `limit 50` — aucun compte Battle n'en
   approche (12 lignes au total sur les comptes Battle au Lot 0).
5. **`what.length`** : le registre ne permet pas encore de restreindre `allowedLengths` au niveau
   du seed ; l'UI n'expose que `concise` / `standard`, ce qui suffit (Lot 0 §6.2).

---

## 15. Commit

`feat(dynamic-playbooks): lot 3 battle situation` — les 7 fichiers du lot + ce handoff, rien
d'autre. Les modifications concurrentes de `src/components/veille/**` et
`src/features/source-management/**` sont restées hors du commit.
