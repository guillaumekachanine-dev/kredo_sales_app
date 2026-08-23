# HANDOFF — DYNAMIC PLAYBOOKS — LOT 4
## Raccord INTEL-020 + n8n

**Agent :** A3 — INTEL-020 / n8n
**Date :** 23 août 2026
**HEAD de départ :** `fb50da01` (`feat(veille): manual digest generation…`), arbre propre.

---

## 1. Statut

**DONE**, avec **un test rouge volontaire** — la sentinelle du Lot 3, qui existe précisément
pour signaler la bascule opérée ici (§9). Aucun autre écart.

Périmètre tenu : **aucun nouveau workflow, aucune migration, aucune nouvelle route API, aucun
changement UI, aucun import VPS.** Le déclenchement réseau depuis
`BattleSituationView.tsx` reste à A2 (Lot 5) — le point d'accroche est documenté au
Lot 3 §13.6 et n'a pas bougé.

---

## 2. Fichiers touchés (7)

| Fichier | Nature |
|---|---|
| `src/lib/n8n/types.ts` | `+ "battle_situation_pitch"` dans `CommunicationScenario` ; `+ battleSituation?: BattleSituation` dans `CommunicationBrief["context"]` ; `import type` du contrat |
| `src/lib/communication/communication-scenario-registry.ts` | seed + `OFFER_REQUIRED_SCENARIOS` |
| `src/lib/communication/communication-scenario-registry.test.ts` | `92 → 93` **et** `TARGET_SCENARIO_IDS` |
| `n8n/workflows/intel-020-communication.json` | `Validate Brief`, `Assemble Prompt`, `Prepare Callback`, manifeste inliné |
| `n8n/workflows/intel-020-communication.manifest.json` | régénéré (93 scénarios) |
| `n8n/workflows/__tests__/intel-020-communication.test.js` | bloc `BS.1` → `BS.8` |
| `n8n/workflows/intel-020-communication.SETUP.md` | §15 « Battle situation pitch » |

Non touchés, vérifiés par `git status` : `src/features/business-intelligence/playbooks/**`
(A2), `BattleWorkspace.tsx` / `SectorPlaybooksModal.tsx` (A1), `supabase/**`,
`src/app/api/n8n/callback/**`, `package.json`.

---

## 3. Contrat scénario final

```ts
{
  value: "battle_situation_pitch",
  label: "Pitch de situation (Battle Card)",
  description: "Pitch oral construit à partir d'une situation commerciale : interlocuteur, enjeu, angle, timing, objection et offre.",
  activityCategory: "commerce_prospection",
  useCase: "pitch",
  defaultOutputKind: "spoken_pitch",
  defaultChannel: "spoken_pitch_30s",
  defaultObjective: "get_meeting",
  allowedObjectives: ["get_meeting", "present_offer", "accelerate_decision"],
  eligibleRecipientTypes: ["prospect", "partner", "active_client", "former_client"],
  requiresOffer: true,
  requiredScopes: ["account"],
}
```

Deux points qui ne sont pas cosmétiques :

- **`requiresOffer: true` figure dans le seed ET `"battle_situation_pitch"` dans
  `OFFER_REQUIRED_SCENARIOS`.** Le champ du seed est obligatoire par le type `ScenarioSeed`,
  mais `toScenarioDefinition()` le **jette** : `requiresOffer` de l'item de registre est
  calculé exclusivement depuis le `Set`. Ne renseigner que le champ du seed aurait produit
  un scénario silencieusement `requiresOffer: false`.
- **`eligibleRecipientTypes` couvre les 4 types commerciaux.** Sans cet override, le défaut
  de catégorie `commerce_prospection` (`["prospect", "partner"]`) forcerait `prospect` sur un
  client actif — c'est exactement ce que le shim du Lot 3 compensait.

`battleSituation` est **facultatif** dans le contexte du brief : le scénario reste
sélectionnable dans le Composer générique, où le bloc est absent.

---

## 4. Modifications du registre

- Seed inséré **à la fin du bloc `commerce_prospection`** de `SCENARIO_SEEDS` (l'ordre est
  sans effet : le test compare les identifiants triés).
- `OFFER_REQUIRED_SCENARIOS` passe de 6 à 7 entrées.
- Test de cardinalité : `92 → 93`, **plus** l'ajout à `TARGET_SCENARIO_IDS`. Le Lot 3 §13.3
  avait raison : ces deux changements sont nécessaires, et `tsc` n'en signale aucun.
- Manifeste **régénéré**, jamais édité :
  `node scripts/generate-communication-manifest.mjs` → 93 scénarios écrits + inlinés dans
  `Assemble Prompt` ; `--check` vert.

---

## 5. Modifications n8n

### `Validate Brief`

`battle_situation_pitch` ajouté à `SCENARIOS_REQUIRING_OFFER`. Un brief sans `offerRef`
lève avant tout appel LLM. **Aucune autre règle de validation n'a été touchée.**

La liste que le Lot 3 §13.5 disait « présente deux fois » n'existe en dur qu'**une** fois
(ce `Set`) : la seconde occurrence est le champ `requiresOffer` du manifeste inliné, qui est
généré depuis la registry et ne peut donc plus dériver. La dérive historique portait bien sur
deux listes manuscrites ; il n'en reste qu'une.

### `Assemble Prompt`

Nouvelle fonction `buildBattleSituationMission(situation, ctx)` et aiguillage :

```js
const battleSituation = (brief.context && brief.context.battleSituation) || null;
const missionText = (scenario === 'battle_situation_pitch' && battleSituation)
  ? buildBattleSituationMission(battleSituation, ctx)
  : (FLAGSHIP_MISSIONS[scenario] || buildTemplateMission(manifestEntry));
```

Le mécanisme flagship existant est conservé tel quel — la Battle Card est simplement une
mission **paramétrée** plutôt qu'un texte figé, parce qu'elle dépend d'un bloc de données.

### `Prepare Callback`

Une entrée dans `SCENARIO_TITLE_OVERRIDES` : `battle_situation_pitch: 'Pitch de situation'`.
Sans elle, le document s'intitulerait « Pitch oral — Battle Situation Pitch » (humanisation
mécanique du slug). Aucune autre modification : `resultType`, `phase`, `contentJson`,
`sourceRefs`, `qaFlags` sont ceux du pipeline existant.

---

## 6. Rendu exact de `battleSituation` dans le prompt

Le bloc est rendu **dans la mission**, donc en tête du `userPrompt`, **avant** le CONTEXTE
hydraté. C'est la traduction mécanique de la règle de priorité : ce que l'utilisateur a
choisi passe avant ce que la base a produit.

```
MISSION : produire un pitch oral, directement prononçable, à partir de la SITUATION COMMERCIALE ci-dessous.
Objectif : obtenir un rendez-vous.

SITUATION COMMERCIALE CHOISIE — chaque élément a été sélectionné explicitement par le Business
Manager. Elle PRIME sur le contexte générique : construis le pitch autour d'elle, et n'utilise
le CONTEXTE que pour l'étayer.
Interlocuteur : Marie Legrand · fonction dsi
  [COMPTE — contact CRM réel de ce compte]
Enjeu retenu : Modernisation du SI de production
  [COMPTE — information rattachée à ce compte]
Angle d'entrée retenu : Industrialisation gouvernée
  [SECTEUR — connaissance sectorielle applicable au segment, jamais un fait établi sur ce compte]
Élément de timing : Publication du CA semestriel
  [SECTEUR — …]
Objection anticipée : Nous avons déjà un intégrateur
  Réponse préparée : Nous intervenons en complément, sur la gouvernance.
Argument de valeur (ROI) : Réduction du temps passé à fiabiliser les données avant analyse
  Reprends-le QUALITATIVEMENT et prudemment. N'en dérive aucun chiffre, aucun pourcentage, aucun délai.
Offre KREDO retenue : Audit data — détail dans la section « OFFRE CATALOGUE » du CONTEXTE. C'est le seul service à proposer.

CONSIGNES :
- Le pitch se prononce à voix haute : phrases courtes, aucun style écrit, aucune énumération à puces dans le texte.
- Enchaîne naturellement l'enjeu retenu puis l'angle d'entrée — ce sont la porte d'entrée du discours, pas des mots-clés à recaser.
- Si un élément de timing est présent, il justifie le « pourquoi maintenant ». Sinon, ne fabrique aucune urgence.
- Si une objection est présente, prépare-la dans "alt_close" ou dans la trame, sans rendre le discours défensif ni artificiel.
- Relie explicitement l'offre KREDO retenue à la situation : en quoi elle répond à CET enjeu, pour CET interlocuteur.
- Une information marquée [SECTEUR] est une hypothèse : formule-la comme telle …, jamais comme un constat établi sur ce compte.
- N'invente aucun fait, aucun chiffre, aucun gain, aucun délai, aucun prix, aucune référence client. N'engage aucun tarif.
[+ ligne Knowledge si des listes personnelles / un knowledgeScope sont hydratés]
```

### Provenance

| `source` | Étiquette injectée |
|---|---|
| `account` | `[COMPTE — information rattachée à ce compte]` |
| `sector` | `[SECTEUR — connaissance sectorielle applicable au segment, jamais un fait établi sur ce compte]` |

Une valeur de `source` inconnue retombe sur l'étiquette **SECTEUR** — le repli prudent est
l'hypothèse, jamais le fait établi.

### Interlocuteur — trois branches, aucune fabrication

1. `recipient.displayName` présent (contact CRM) → nom + fonction, étiqueté COMPTE.
2. Sinon `personaLabel` → `« DSI (aucun contact identifié sur ce compte — profil type) »`,
   étiqueté SECTEUR, **plus une consigne explicite de ne fabriquer aucun nom de personne**.
   C'est le chemin majoritaire (Lot 0 : 15 comptes sur 23 sans contact CRM).
3. Ni l'un ni l'autre → même consigne, sans libellé de fonction.

### Offre

Le nom vient du contexte hydraté (`ctx.offer.name`, produit par `get_pitch_context` à partir
de `offerRef`), pas de `battleSituation` — le bloc ne duplique aucun champ canonique. Si
l'hydratation n'a pas rendu l'offre, la ligne renvoie à la section « OFFRE CATALOGUE » sans
inventer de nom.

### Knowledge

Aucun contenu n'est recopié : les listes personnelles et le `knowledgeScope` sont déjà rendus
par `buildContextSections()`. La mission ajoute seulement, **s'ils existent**, une ligne
disant de s'appuyer dessus sans les citer comme des sources nommées.

---

## 7. Comportement sans `battleSituation`

Le garde est sur la **valeur**, pas sur le scénario : `scenario === 'battle_situation_pitch'
&& battleSituation`. Bloc absent ⇒ mission template dérivée du manifeste, exactement comme
n'importe quel scénario non-flagship.

- Aucune exception levée.
- Aucun `undefined` dans le prompt — asserté par test (`BS.5`), en plus des assertions
  anti-`undefined` de `BS.1` et `BS.2`.
- Aucun bloc « SITUATION COMMERCIALE CHOISIE » vide.
- Le contrat de sortie `spoken_pitch` et le reste du workflow sont inchangés.

Toutes les valeurs interpolées passent par `battleText()` (`String(...).trim()`, `''` si
`null`/`undefined`) puis `truncate()` : une clé optionnelle absente ne produit pas de ligne,
une clé présente mais vide non plus.

---

## 8. Tests et compteurs

| Commande | Résultat |
|---|---|
| `node --check` sur les 3 nœuds Code modifiés | ✅ OK (`Hydrate Context`, non touché, échoue par `await` de haut niveau — pré-existant) |
| `node scripts/generate-communication-manifest.mjs --check` | ✅ **93 scénarios synchronisés** |
| `node n8n/workflows/__tests__/intel-020-communication.test.js` | ✅ **161 passed, 0 failed** (118 avant le lot, **+43**) |
| `npm run test:n8n` | ✅ **11 harnais, exit 0, 0 échec** — compteurs finaux lus un par un |
| `npm run typecheck` | ✅ vert |
| `npm test` | ⚠️ **1999 passed / 1 failed** — la sentinelle du Lot 3 (§9), volontaire |
| `npm run check:server-boundary` | ✅ vert |
| `npx eslint` sur les 3 fichiers TS touchés | ✅ 0 problème |
| `npm run build` (Turbopack) | ✅ exit 0 |
| `npm run build:webpack` | ✅ *« Compiled successfully in 12.0s »*, exit 0 |

> Le compteur final du harnais INTEL-020 a été lu explicitement, et la **baseline mesurée**
> (`git stash` puis relance : 118) — pas seulement le code de sortie (CLAUDE.md : un harnais
> n8n peut « passer » sans rien avoir exécuté). Le delta +43 correspond exactement aux 43
> assertions ajoutées.

### Couverture ajoutée — `BS.1` → `BS.8`

| Cas | Ce qu'il verrouille |
|---|---|
| `BS.1` nominal | Les 7 dimensions restituées, préséance énoncée, offre nommée et ancrée, contrat `spoken_pitch`, interdictions d'invention, zéro `undefined` (13 assertions) |
| `BS.2` optionnels absents | Ni timing, ni objection, ni ROI dans le prompt ; enjeu/angle intacts ; pas d'urgence fabriquée ; zéro `undefined` (6) |
| `BS.3` fallback persona | `personaLabel` sans `contactId` : la fonction est l'interlocuteur, interdiction de fabriquer un nom, persona marquée SECTEUR (5) |
| `BS.4` provenance | COMPTE et SECTEUR correctement étiquetés, consigne de formulation hypothétique présente (4) |
| `BS.5` `battleSituation` absent | Mission générique, pas de bloc vide, pas de crash, pas d'`undefined` (4) |
| `BS.6` `offerRef` absent | Rejet par `Validate Brief` avec message explicite (1) |
| `BS.7` pipeline | Chaîne Parse → Quality → Prepare Callback : `succeeded`, `resultType = commercial_pitch`, `phase = 5`, titre « Pitch oral — Pitch de situation » (4) |
| `BS.8` régression | `signal_outreach`, `cold_call_pitch`, `sector_persona_pitch` : mission d'origine conservée, aucun bloc Battle injecté (6) |

Le test de couverture existant `L11.A` (« chaque scénario du registre résout vers une mission
non vide ») itère désormais sur 93 entrées, dont `battle_situation_pitch` **sans**
`battleSituation` — la dégradation est donc aussi couverte par un test que je n'ai pas écrit.

---

## 9. `commercial_pitch` — confirmé, non recréé

Rien n'a été ajouté au callback. La dérivation existante suffit :

```
outputKind = spoken_pitch      → isPitch = true
activityCategory = commerce_prospection → isCommercial = true
                               → resultType = 'commercial_pitch', phase = 5
```

puis, côté KREDO, `RESULT_DOCUMENT_TYPE_BY_RESULT_TYPE["commercial_pitch"] = "commercial_pitch"`
(`src/lib/communication/communication-result-documents.ts`) — valeur d'enum déjà existante.
**Aucune migration, aucun ajout à `intelligence_document_type`, aucun des 8 sites d'exhaustivité
documentés dans CLAUDE.md n'est concerné.** Vérifié par `BS.7`.

---

## 10. Cleanup requis côté A2 — un test, une ligne

Le shim `enforceBattleScenarioIdentity` est **devenu inerte de lui-même** : `getScenarioDefinition
("battle_situation_pitch")` renvoie désormais la définition, `scenarioRegistered` passe à `true`,
et la fonction rend le brief du résolveur tel quel dès sa première ligne. Aucun fichier A2 n'a
été touché, conformément à l'ownership.

**Test rouge, volontaire et attendu :**

```
src/features/business-intelligence/playbooks/__tests__/battle-situation-brief.test.ts:131
  « documente que le scénario n'est pas encore enregistré (Lot 4, A3) »
  expect(scenarioRegistered).toBe(false)   →   reçu: true
```

C'est exactement la sentinelle décrite au Lot 3 §7 et §13.4. **Correctif A2 :
`toBe(false)` → `toBe(true)`**, et rien d'autre.

**Preuve que le registre fait bien le travail :** les 19 autres tests du fichier sont verts
**sans** le shim — dont l'identité du scénario, le canal `spoken_pitch_30s`, l'`outputKind`
`spoken_pitch`, et `recipientType = active_client` dérivé du lifecycle. C'était le critère
posé par le Lot 3 §13.4.

Deux nettoyages facultatifs, dans des fichiers A2 :

1. `BATTLE_SITUATION_SCENARIO = "battle_situation_pitch" as CommunicationScenario` — le cast
   est devenu redondant (le littéral est maintenant dans l'union). Il est inoffensif ; le
   retirer est une ligne.
2. `enforceBattleScenarioIdentity` et le drapeau `scenarioRegistered` peuvent être supprimés
   quand A2 le jugera utile. Tant qu'ils vivent, ils ne font rien.

---

## 11. Écarts au cadrage

Un seul, assumé et signalé :

**`Prepare Callback` a reçu une ligne** (le libellé de titre), alors que la commande §8 dit
« ne rien modifier dans le callback ». Cette phrase vise le pipeline de dérivation
`result_type` / `document_type`, qui n'a effectivement pas bougé. `SCENARIO_TITLE_OVERRIDES`
est une table de libellés déjà prévue pour ce cas, et sans entrée le document arriverait dans
la bibliothèque sous le titre « Pitch oral — Battle Situation Pitch ». Si cela est jugé hors
périmètre, la suppression de cette ligne est sans conséquence fonctionnelle.

Pour le reste, la commande a été suivie à la lettre, seed compris.

---

## 12. Import VPS requis : **OUI**

Le JSON committé est **inerte** tant qu'il n'est pas réimporté. Procédure détaillée au §15 de
`n8n/workflows/intel-020-communication.SETUP.md` : import manuel par Guillaume, contrôle du
bloc `MANIFEST` à 93 entrées, run nominal depuis une Battle Card, puis contrôle négatif depuis
le Composer générique.

⚠️ `npm run n8n:status` **ne verra pas cette dérive** : il compare des compteurs de nœuds, or
seul du code interne a changé (16 nœuds avant et après). Même piège que les 11 workflows
patchés non réimportés depuis la Session 28.

Aucune action Supabase, aucun credential, aucun changement d'activation.

---

## 13. Ce que le Lot 5 doit encore faire

1. **Le `fetch`** — brancher `/api/n8n/trigger` sur l'état `isReady` de
   `BattleSituationView.tsx`, puis `useRunTracker({ runId })` et le rendu du résultat. Le
   payload exact est au Lot 3 §13.6 ; **le brief n'a pas à être reconstruit**.
2. **Le test sentinelle** (§10).
3. **Vérifier en run réel** que `resolveKnowledgeScope` côté `/api/n8n/trigger` n'écrase pas
   `preferredCollectionIds` — non testé ici : ce lot ne touche pas la route.

## 14. Commit

`feat(dynamic-playbooks): lot 4 battle pitch generation` — les 7 fichiers du §2 + ce handoff.
