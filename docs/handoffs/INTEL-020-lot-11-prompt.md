# INTEL-020 — Lot 11 : prompts n8n et contrôle qualité (version réécrite)

> Cette version **remplace** le prompt initial. Le préambule ci-dessous liste les
> divergences avec la version précédente et pourquoi. Le reste est le contrat
> d'exécution à suivre.

---

## Préambule — divergences avec la version initiale

La version initiale est bonne sur le squelette (4 couches, 3 finalités, garde-fous
métier, fixtures déterministes). Elle sous-spécifie exactement les 5 points qui
décident si « la customisation qu'on vend » produit un résultat réellement
différencié ou un texte générique. Divergences :

| # | Version initiale | Cette version | Pourquoi |
|---|---|---|---|
| **D1** | « éviter le prompt monolithique et les duplications » (intention, sans méthode) | **Missions dérivées d'un manifeste registry** + bespoke pour ~15 scénarios flagship seulement + **test de couverture bloquant** qui asserte que *chaque* scénario du registry résout vers une mission non-vide et cohérente | 92 scénarios écrits à la main = 1500 lignes non-testables qui pourrissent. Aujourd'hui ~28/92 couverts, le reste retombe sur `''`. C'est **la** cause racine du « 90 % générique ». |
| **D2** | Qualité = « produire des résultats réellement adaptés » (aspirationnel) | **Contextualisation érigée en garde-fou mécanique** : un `context_anchoring` QA qui échoue si la sortie ne cite aucun fait hydraté (nom compte, secteur, contact, mission, signal). Un résultat démontrablement générique est **rejeté**, pas livré comme succès. | On ne peut pas rendre le LLM brillant par décret ; on peut garantir (a) que chaque scénario reçoit un prompt vraiment différent et chargé de contexte, et (b) qu'une sortie générique est attrapée. C'est l'équilibre attente/terrain. |
| **D3** | §2 liste les 4 durées mais sans les relier à des cibles | **Tables `SPOKEN_DURATION_TARGETS` / `BRIEFING_DEPTH`** qui pilotent *à la fois* l'interpolation du system prompt *et* la bande QA | Bug LIVE : le prompt oral est codé « 30 s / 80-100 mots » en dur, la QA teste 60-130 mots fixe. Un pitch « 5 minutes » est aujourd'hui généré comme un 30 s et flaggé trop long. |
| **D4** | §7 « retourner une erreur explicite, ne pas persister comme succès » (sans *comment*) | **Rejet bloquant routé vers la branche `Prepare Failure Callback` existante**, portant `qaFlags` + une raison *lisible et sans fuite technique*, + **1 touche UI autorisée** pour afficher cette raison | Rester dans n8n = zéro scope creep sur le callback route. Et l'exigence explicite du owner : l'UI doit montrer *pourquoi* ça a échoué (aujourd'hui : « Vérifie les logs n8n », inutile pour un BM). |
| **D5** | §3 couvre l'adaptation métier mais ne signale pas l'état réel du chemin écrit | **Chemin `written_message` doit recevoir le branchement par catégorie ET une QA scope-aware** | Bug LIVE : tout l'écrit passe par un seul `SYSTEM_PROMPT` « rédacteur commercial », et la QA `cta_present` exige un CTA `rendez-vous|appel` sur **tout** message écrit → un message de reconnaissance consultant ou une note interne est mal généré *et* faux-flaggé. |
| **D6** | §5 « les consignes libres ne doivent pas contourner scope/sécurité » | **Reformulation du texte libre de « INSTRUCTIONS IMPÉRATIVES » vers préférences subordonnées + énoncé de préséance + check QA d'injection** | Le libellé actuel « impératives » invite littéralement le modèle à obéir au texte libre au-dessus des règles = vecteur d'injection. C'est un point de sécurité, pas un détail de wording. |
| **D7** | (implicite) | **Identité + no-invention factorisés en couche globale unique** | Aujourd'hui copiés-collés dans 6 system prompts. Le bénéfice concret des 4 couches : énoncer une fois. |
| **D8** | (non mentionné) | **Tiering Haiku/Sonnet explicitement HORS scope** (Sonnet partout) | Verrouiller pour éviter le scope creep ; c'est acté hors-scope par ADR-0015. |

**Décisions d'architecture figées (validées par le owner) :**

1. Échec QA bloquant → statut `failed` via la branche d'échec **n8n existante** (pas de `needs_review`, qui exigerait de toucher callback + Realtime + UI = lot séparé).
2. Raison d'échec **lisible et sûre** persistée (`ai_intelligence_runs.error_message` + `qa_flags` du result row) et **affichée dans l'UI** (unique exception au hors-périmètre, bornée).
3. Anti-duplication = **données + test**, jamais 92 paragraphes manuels.
4. Anti-générique = **garde-fou QA + prompts par-scénario prouvés par test**, assumé honnêtement (on borne le risque, on ne promet pas un miracle LLM).

**Corrections intégrées après revue (6 points imposés, tous acceptés) :**

- **C1 — Manifeste exclusivement généré.** Pas de JSON maintenu à la main. Un script committé lit la registry TS et **émet** l'artefact consommé par n8n. Comme un nœud Code n8n ne peut pas importer le TS au runtime (sandbox VPS), la génération est **au build/commit-time** : artefact généré **commité** + **test de drift** (régénérer ⇒ zéro diff, sinon échec). Le fallback « sinon un JSON versionné » de la première version est supprimé (§2).
- **C2 — Contextualisation non naïve.** L'ancrage ne se fait pas par simple sous-chaîne. Jetons **distinctifs** uniquement (entités multi-mots, noms propres, termes sectoriels, chiffres/dates du contexte ; filtrer les tokens courts/communs), combiné à la validation des `source_refs`, blocage **conservateur**, plus un garde-fou contre l'ancre **hallucinée** (§9).
- **C3 — Aucun second appel LLM implicite.** La réparation légère est **déterministe uniquement** (trim, strip fences, reformat). Un échec de contenu (générique, sans preuve, ancrage nul) est **bloqué** — pas de re-génération LLM cachée. L'utilisateur relance (une relance = un run neuf). Supprime le nœud le plus risqué (§8.2).
- **C4 — Identité d'entreprise non inventée.** Ne pas asserter « Kredo Digital, ESN premium spécialisée en Data/IA·Cloud·PM·Cyber » comme un fait : ce n'est nulle part dans la donnée, c'était codé en dur. Sourcer le nom depuis `workspaces` si dispo, sinon identité neutre ; **aucune liste de spécialisations affirmée** que le contexte ne prouve pas (incohérent avec l'interdiction d'inventer une capacité) (§2, couche 1).
- **C5 — Flagships explicitement définis.** Liste d'IDs réels ci-dessous (§2, couche 4), à réconcilier contre la registry (source de vérité) — signaler tout ID absent.
- **C6 — Commit Git ≠ déploiement n8n.** Committer le JSON ne le rend pas actif : validation par harnais Node uniquement (pas de LLM/VPS dans la session), le workflow reste **inerte** jusqu'à ré-import manuel sur le VPS. Mettre à jour la checklist du SETUP.md et l'écrire dans les limitations du rapport (§11-12).

---

## 0. Cadre

Travaille directement sur `main` dans `guillaumekachanine-dev/kredo_sales_app`.
Synchronise, implémente, teste, committe, pousse. Pas de branche ni de PR.

Workflow unique concerné : `intel-020-communication`. **Aucun nouveau workflow.**
Le contexte normalisé du Lot 10 (`Hydrate Context`, routage par scope, filtrage
réel des sources) reste l'unique entrée métier — ne pas le réécrire.

### Périmètre

**Dans le périmètre :** les nœuds Code `Assemble Prompt`, `Parse & Validate Output`,
`Quality Check`, `Prepare Callback`, `Prepare Failure Callback` du workflow ; un
éventuel module de manifeste/fixtures ; les tests n8n. **Une seule** modification
UI autorisée (§8.4).

**Hors périmètre (ne pas modifier) :** registry, résolveur, schéma Supabase,
points d'entrée, `callback/route.ts`, `runs.ts`, composants de résultat
(`CommunicationResult`/`PitchResult`), bibliothèque documentaire, **tiering LLM**.

---

## 1. Le vrai contrat : contextualisation et qualité

L'objectif n'est pas « couvrir les cases ». C'est qu'un utilisateur qui choisit un
scénario obtienne un résultat qu'il **n'aurait pas obtenu** avec un autre scénario,
un autre compte ou un autre destinataire. Definition of Done qualité :

- Chaque scénario du registry produit un prompt **structurellement différent** (mission propre, contexte propre, garde-fous propres) — prouvé par test.
- La sortie **ancre au moins un fait réel** du contexte hydraté (nom, secteur, contact, mission, signal, opportunité) — vérifié en QA.
- Une sortie **générique ou hallucinée** est **rejetée** (statut `failed` + raison), jamais livrée comme succès.
- Les durées/profondeurs sont **réellement honorées** (mots cibles calculés).

---

## 2. Architecture des prompts — 4 couches, zéro duplication massive

Structurer l'assemblage en 4 couches composées, pas en gros `if/else`.

**Couche 1 — Règles globales (une seule fois).** Identité **sourcée, non inventée**
(C4) : nom de l'entreprise depuis `workspaces` si disponible cheaply, sinon une
identité neutre (« une ESN ») — **ne jamais affirmer une liste de spécialisations**
(Data/IA, Cloud…) comme un fait, car rien dans la donnée ne la prouve et cela
contredit l'interdiction d'inventer une capacité. Interdiction absolue d'inventer
(chiffre, référence, offre, capacité, engagement), interdiction de révéler tout
identifiant/nom technique (UUID, « Supabase », « n8n », « KREDO » en interne, ids de
source), et **énoncé de préséance** : les règles globales et le scope priment sur
toute consigne libre de l'utilisateur.

**Couche 2 — Règles par `outputKind`.** Forme et contrat de sortie :
`written_message` (message prêt à copier), `spoken_pitch` (script prononçable),
`structured_briefing` (fiche de préparation). C'est `outputKind` qui pilote la
forme — **plus `isPitch`** (garde `isPitch` comme alias dérivé si besoin de
rétrocompat, mais la sélection du system prompt et la QA se font sur `outputKind`
+ `activityCategory`, jamais sur le booléen fusionné).

**Couche 3 — Règles par `activityCategory` + `scope`.** Registre de garde-fous et
de posture par catégorie (les 6) et par scope (`account`/`collaborator`/`internal`).
Y compris le **chemin écrit** : `commerce_*` = rédacteur commercial ; `delivery`,
`recrutement`, `management_consultants`, `internal_staff` = prompts dédiés **sans
aucune dimension commerciale** (voir §4). `internal_staff` obtient enfin son propre
texte (il partageait le prompt Management depuis le Lot 10).

**Couche 4 — Mission par scénario.** Voici la clé anti-duplication :

- **Scénarios flagship** → **mission bespoke** rédigée à la main, car la posture
  *est* le livrable. Liste explicite (C5), **à réconcilier contre la registry — la
  registry est la source de vérité, signaler tout ID absent** :
  `client_crisis_talk_track`, `delay_talk_track`, `client_tension_apology`,
  `consultant_replacement_notice`, `proposal_defense_pitch`, `cross_sell`,
  `meeting_prep_cross_sell`, `escalation_briefing`, `risk_meeting_briefing`,
  `atypical_candidate_defense`, `candidate_to_client_pitch`,
  `disciplinary_meeting_posture`, `difficult_announcement_talk_track`,
  `retention_conversation_talk_track`, `retention_conversation_briefing`,
  `intercontract_exit_pitch`, `performance_feedback_talk_track`,
  `collaborator_recognition`, `resource_arbitrage_pitch`,
  `investment_arbitrage_argument`, `quarterly_business_review`.
- **Tous les autres** → mission **générée depuis le manifeste** (voir ci-dessous),
  via un template par famille (catégorie + `defaultObjective` + refs). Aucun texte
  manuel pour la longue traîne.

**Manifeste — exclusivement généré (C1).** Un **script committé** lit la registry TS
et **émet** un artefact compact scénario → `{ category, allowedOutputKinds,
defaultOutputKind, requiresOffer, defaultObjective }`. Ce manifeste est la seule
source consommée par le nœud n8n *et* par les fixtures. Contraintes :

- **Pas** de JSON maintenu à la main (il dériverait). L'artefact généré est commité.
- La génération est **au build/commit-time** : un nœud Code n8n ne peut pas importer
  le TS de l'app au runtime (sandbox VPS). Le manifeste généré est donc inliné dans
  le nœud `Assemble Prompt` (ou un nœud de constantes) par le script.
- **Test de drift bloquant** : régénérer le manifeste et échouer si le diff est non
  vide (garantit registry ⇔ manifeste ⇔ n8n toujours synchrones — handoff §24.1).
- **Test de couverture bloquant** : chaque scénario de la registry résout vers une
  mission non-vide et cohérente avec sa catégorie (flagship bespoke OU template).

---

## 3. Finalités, durées et profondeurs (réellement honorées)

### `written_message`
Objet si le canal le justifie, corps structuré, CTA **adapté à l'objectif** (pas
forcément « prendre RDV » — une reconnaissance n'a pas de CTA commercial),
formulation naturelle, **aucune note méta** dans le résultat. Longueurs :
`ultra_short` 40-80 · `concise` 80-140 · `standard` 140-220 · `detailed` 220-400 mots.

### `spoken_pitch`
Oral, fluide, mémorisable, prononçable. Accroche → argumentation → conclusion.
Pas de style email. **Table de durée obligatoire** pilotant le system prompt ET la
bande QA (retirer le « 30 s » codé en dur) :

| `length` | Durée | Cible mots (indicative) |
|---|---|---|
| `ultra_short` | 30 s | ~60-90 |
| `concise` | 1 min | ~120-180 |
| `standard` | 2 min | ~250-350 |
| `detailed` | 5 min | ~650-850 |

### `structured_briefing`
Objectif, contexte, messages clés, arguments avec preuves, objections + réponses,
posture, questions à poser, résultat attendu, points de vigilance. **Profondeur
pilotée par `length`** (retirer le « exactement 3 arguments » codé en dur) :
`ultra_short` = Flash (l'essentiel) → `detailed` = Approfondi (arguments,
objections, postures étoffés). Un briefing n'est pas nécessairement commercial ni
lié à un RDV client.

---

## 4. Adaptation métier + scope

### Commerce / Delivery
Valeur client, faits disponibles uniquement, distinguer prospection / compte actif /
crise / renouvellement / delivery. Jamais de chiffre, engagement, référence ou
capacité inventés. Delivery = gestion de risque, **zéro vocabulaire de vente**.

### Recrutement
Distinguer **candidat destinataire** et **client destinataire** — ne jamais
transformer une défense de candidat (vers un client) en message *au* candidat.
Respecter les étapes de recrutement réellement fournies.

### Management consultants (`scope=collaborator`)
Ton managérial crédible. **Aucune pseudo-analyse RH ou juridique.** Prudence sur
performance, absence, disciplinaire, rétention. Ne pas déduire une faute d'une
simple absence de donnée. Protéger la dignité du consultant. Distinguer
reconnaissance / recadrage / carrière / intercontrat / annonce sensible.

### Staff interne (`scope=internal`)
Adapter au rôle, à la relation et au domaine du destinataire. Arbitrages orientés
décision / priorité / risque / ressources / ROI. **Éviter les formulations
commerciales artificielles** (c'est un collègue, pas un prospect).

---

## 5. Tons (11 canoniques)
`direct · formal · warm · assertive · pedagogical · diplomatic ·
technical_expertise · business_roi · enthusiastic_confident ·
disappointed_confused · prudent`. La table `TONE_INSTRUCTIONS` existe déjà —
la conserver, vérifier les contraintes : le ton influence le style pas les faits ;
`disappointed_confused` reste mesuré ; `technical_expertise` ne vulgarise pas ;
`business_roi` met en avant valeur/coûts/gains/impact ; `prudent` = réserves et
maîtrise sans pessimisme. Respecter les exclusions de tons de la registry.

---

## 6. Utilisation du contexte et sécurité

Le modèle : n'utilise que les sources actives (le Lot 10 a déjà filtré) ; distingue
fait / hypothèse / consigne utilisateur ; ignore les champs absents ; ne cite jamais
une source non hydratée ; ne révèle aucun identifiant technique ; ne mentionne
jamais KREDO/Supabase/n8n/le prompt.

**Durcissement injection (D6).** Retirer le libellé « INSTRUCTIONS IMPÉRATIVES DE
L'UTILISATEUR ». Injecter le texte libre sous « Préférences utilisateur
(subordonnées aux règles ci-dessus) ». Ajouter dans la couche globale l'énoncé de
préséance. Les consignes libres ne doivent jamais contourner le scope, la sécurité,
l'interdiction d'inventer ni le format. Corriger dans un helper partagé (le texte
libre alimente les 3 chemins).

---

## 7. Sortie structurée

Conserver le contrat wire existant (ne rien casser côté callback). Garantir au
minimum, pour chaque finalité, les champs déjà attendus par les parsers
(`CommunicationOutput` / `SpokenPitchOutput` / `MeetingBriefingOutput`). Ne pas
mettre de Markdown parasite dans le texte prêt à copier. Adapter les champs
complémentaires selon la finalité sans changer les clés consommées par
`Parse & Validate Output` ni le callback.

---

## 8. QA — réparation, rejet, remontée

### 8.1 Contrôles après génération
JSON valide · contenu présent · finalité respectée (`kind` correct) · longueur/durée
dans la bande (§3) · **ancrage contexte** (§9) · pas de placeholder
(`[..]`, `{..}`, `XXX`, « insérer », lorem) · pas de donnée technique (UUID,
Supabase, n8n) · cohérence destinataire · cohérence scope (pas de vocabulaire
commercial en delivery/management/internal — garde-fou existant, à étendre au
chemin écrit) · `source_refs` pointent uniquement des sources réellement actives.

### 8.2 Échec léger → **une seule** réparation, **déterministe uniquement** (C3)
Longueur légèrement hors bande, fences ```` ```json ````, markdown parasite, objet
manquant réparable → correction déterministe (trim/strip/reformat), **sans aucun
appel LLM**. **Interdit** : tout second appel LLM implicite (nœud de re-génération,
loop-back). Un échec de contenu réel (générique, sans preuve, ancrage nul) n'est
**pas** réparé par un re-prompt caché → il est **bloqué** (§8.3) et l'utilisateur
relance explicitement (une relance = un run neuf, un appel LLM propre). Cela
supprime le nœud le plus risqué, évite le doublement latence/coût sur le chemin qui
échoue, et est cohérent avec l'exigence d'honnêteté (bloquer plutôt que maquiller).

### 8.3 Échec bloquant → `failed`, jamais un faux succès
JSON invalide après nettoyage, `kind` faux, offre hallucinée, contenu vide,
placeholder persistant, injection obéie, **ancrage contexte nul après réparation**
→ router vers `Prepare Failure Callback`. Ce nœud doit porter :
- `status: 'failed'` (déjà le cas),
- `errorMessage` **lisible et sans fuite technique** (« La génération n'a pas pu être
  contextualisée : aucun fait exploitable / réponse hors format. Réessaie ou
  enrichis le contexte. » — pas de stack, pas de nom de nœud),
- `qaFlags` (les checks échoués) — **actuellement absents de la branche d'échec, à
  ajouter** pour que l'UI puisse détailler.

Conserver tous les signaux QA dans `qa_flags` (chemin succès **et** échec).

### 8.4 Remontée UI (unique exception au hors-périmètre)
Le callback persiste déjà `qa_flags` sur le result row (`runs.ts` `saveResult`) et
`error_message` sur le run. Le handler Realtime du drawer
(`IntelligenceActionDrawers.tsx`, branche `row.status === 'failed'`) affiche
aujourd'hui un texte codé en dur « Vérifie les logs n8n » et **ignore
`row.qa_flags`** (pourtant déjà destructuré). Modification autorisée et **bornée à
ça** : remplacer le message générique par les `detail` des `qa_flags` échoués quand
ils sont présents (fallback sur un message court sinon). Aucune autre UI touchée.
Respecter les primitives et tokens existants (pas de HEX, pas de shadow).

---

## 9. Enforcement de la contextualisation (le cœur anti-générique)

Au moment de la QA, `data.resolvedContext` est disponible. Construire un ensemble de
**jetons d'ancrage distinctifs** (C2 — non naïf) depuis le contexte hydraté : noms
propres et entités **multi-mots** (nom de compte, contact, consultant, titre de
mission/opportunité, titre de signal/actualité), termes sectoriels, **chiffres/dates
réels** du contexte. **Filtrer** les tokens courts ou communs (< 4 caractères, mots
outils, secteurs génériques mono-mot) qui matcheraient par accident. Le check
`context_anchoring` combine deux signaux, jamais une seule sous-chaîne fragile :

- **passe** si la sortie référence au moins un jeton **distinctif** réel **et/ou**
  cite ≥1 `source_ref` correspondant à une donnée **réellement hydratée** (valider
  que chaque `source_ref` pointe une entité présente dans `resolvedContext`) ;
- **échoue (bloquant)** si zéro jeton distinctif **et** zéro `source_ref` valide,
  **sur un contexte riche** (seuil conservateur : sur contexte pauvre/nouveau
  prospect, ne pas bloquer — un premier contact peut légitimement être peu ancré) ;
- **échoue (bloquant)** si la sortie affirme un ancrage **absent** du contexte
  (`source_ref` qui ne correspond à aucune entité hydratée = hallucination).

Pas de re-prompt (C3) : un échec d'ancrage est bloquant, l'utilisateur relance.

Être honnête sur la limite : ceci ne rend pas le LLM créatif, ça **empêche de vendre
comme “sur-mesure” un texte que le modèle aurait pu écrire sans le contexte**. C'est
le filet exigé — calibré conservateur pour ne pas bloquer un cas légitimement peu
ancré.

---

## 10. Tests (déterministes, sans LLM réel)

Étendre le harnais Node existant (`n8n/workflows/__tests__/…`). Deux familles :

**A. Assemblage** — pour chacune des fixtures ci-dessous : asserter le bon
`systemPrompt` sélectionné, la bonne mission (couche 4) présente, la bonne
cible de longueur/durée injectée, et **aucun identifiant technique** dans le
`userPrompt`. Plus le **test de couverture** : *chaque* scénario du registry résout
vers une mission non-vide et cohérente avec sa catégorie (échec bloquant sinon).

**B. QA** — feeder des sorties LLM fabriquées dans `Parse + Quality Check` :
valide ; JSON cassé → réparé ou rejeté ; placeholder → rejeté ; offre hallucinée →
rejeté ; ancrage nul sur contexte riche → réparé puis, si toujours nul, `failed` ;
injection obéie → rejeté ; trop long → réparé/flaggé ; ancien brief legacy → normalisé.

**Fixtures minimales :** email prospection · pitch 30 s · briefing découverte ·
crise client · message candidat · défense orale candidat · feedback consultant
sensible · entretien de rétention · arbitrage Staff orienté ROI · synthèse direction ·
un cas par nouveau ton métier (technical_expertise, business_roi,
enthusiastic_confident, disappointed_confused, prudent) · contexte incomplet ·
tentative d'injection dans les consignes libres · sortie invalide réparée ·
sortie invalide rejetée.

---

## 11. Validation

```bash
npx tsc --noEmit
npx eslint <fichiers modifiés>
npm test -- <tests ciblés n8n/QA>
git diff --check
node --check   # sur chaque nœud Code modifié (fonction englobante async)
```

Vérifier que le workflow JSON reste importable (recharger via `json.load`,
16 nœuds, `connections` intacts, aucun nœud renommé). Confirmer la non-régression
du chemin écrit `commerce_*` existant et des runs legacy.

**Commit Git ≠ déploiement n8n (C6).** Committer le JSON **ne le rend pas actif**.
Aucun accès LLM/VPS dans la session : la validation est **par harnais Node
uniquement**, jamais un run réel. Le workflow modifié reste **inerte** jusqu'à
ré-import manuel sur le VPS n8n. Mettre à jour la checklist d'import/activation dans
`intel-020-communication.SETUP.md` (nouveau §Lot 11) et l'écrire noir sur blanc dans
les limitations du rapport.

---

## 12. Livraison

Mettre le Lot 11 à `done` dans le ledger. Créer `docs/handoffs/INTEL-020-lot-11-report.md`.
Commit : `feat(intel-020): improve communication prompts and qa`. Pousser sur `main`.

Rapport final : prompts restructurés (4 couches) · stratégie anti-duplication et
manifeste · durées/profondeurs honorées · règles QA (réparation/rejet) et remontée
UI · enforcement contextualisation · scénarios/fixtures testés · nombre de tests ·
SHA · écarts éventuels.

**Ne commence pas le Lot 12.**
