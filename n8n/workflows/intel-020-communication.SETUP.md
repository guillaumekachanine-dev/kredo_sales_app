# INTEL-020 — intel-020-communication : import & configuration VPS

## 1. Import
1. n8n → **Workflows → Import from File** → sélectionner `intel-020-communication.json`.
2. Ne pas activer tout de suite (`active: false` par défaut) — configurer d'abord les points ci-dessous.

## 2. Variables d'environnement n8n (sur le VPS, pas dans le workflow)

| Variable | Valeur | Doit être identique à |
|---|---|---|
| `SUPABASE_URL` | `https://jvzgmhvwirsbdkjpmvla.supabase.co` | `NEXT_PUBLIC_SUPABASE_URL` (Vercel) |
| `SUPABASE_SERVICE_ROLE_KEY` | clé service_role du projet | `SUPABASE_SERVICE_ROLE_KEY` (Vercel) |
| `N8N_WEBHOOK_SECRET` | secret partagé HMAC | `N8N_WEBHOOK_SECRET` (Vercel) — **doit être exactement la même valeur des deux côtés**, sinon le nœud "Validate & Extract Brief" rejette tout (signature invalide) et le callback final échoue aussi |
| `ANTHROPIC_API_KEY` | clé API Anthropic | — |

Ces variables se déclarent dans le fichier `.env` du conteneur n8n (ou les variables d'environnement du service selon l'hébergement), **pas** dans l'UI "Credentials". Le workflow y accède via `$env.NOM_VARIABLE` dans les nœuds Code et dans les expressions des nœuds HTTP Request.

⚠️ **Point d'attention critique** : par défaut, n8n **bloque** l'accès de `$env` et de `require()` aux modules Node natifs (`crypto`) depuis les nœuds Code, pour des raisons de sécurité. Sur le conteneur n8n, il faut positionner :
```
N8N_BLOCK_ENV_ACCESS_IN_NODE=false
NODE_FUNCTION_ALLOW_BUILTIN=crypto
```
Sans ça, les nœuds "Validate & Extract Brief", "Hydrate Context", "Prepare Callback" et "Prepare Failure Callback" échoueront immédiatement (`$env is not defined` ou `crypto is not defined`).

## 3. Pourquoi pas de Credentials Supabase/Anthropic natives ?

Le contrat INTEL-020 (§7.3) proposait initialement le nœud Supabase natif pour "Update Run Status" et "Resolve Sender Identity". Ce workflow utilise **HTTP Request partout** (au lieu de mixer nœud natif + Code) pour deux raisons :
- Un seul pattern d'accès Supabase = plus prévisible à déboguer.
- Le nœud Supabase natif de n8n a un schéma de paramètres qui varie selon la version installée — HTTP Request direct contre `/rest/v1/...` avec la clé `service_role` est stable dans le temps.

⚠️ **Exception introduite au Lot 10 (§11)** : "Hydrate Context" est devenu un nœud **Code** (au lieu de HTTP Request). Le routage par scope (0, 1 ou 2 appels RPC selon `account`/`collaborator`/`internal`, fusion compte+offre, zéro appel pour `internal` sans référence facultative) n'est pas exprimable dans une seule expression d'URL/body de nœud HTTP Request. **Correction (§13, bug live)** : l'affirmation initiale « aucune reconfiguration VPS requise » était fausse — `this.helpers.httpRequestWithAuthentication` n'est pas supporté dans le sandbox Code node sur les versions n8n < 1.42.0, donc le credential `supabaseApi` n'est **pas** accessible depuis ce nœud. L'authentification est désormais construite à la main via `SUPABASE_SERVICE_ROLE_KEY` (§2, ci-dessus — déjà documentée, jamais câblée avant §13).

## 4. Le "signal épinglé" (`brief.context.signalRef`) n'est pas branché en V1

Le document d'origine suppose une table de signaux adressable par UUID que l'utilisateur peut épingler depuis l'UI. Dans le code actuel, les signaux affichés dans le Cockpit (`ClientIntelligenceData.signals`) sont de simples chaînes de texte extraites d'un JSON d'analyse (`ai_intelligence_results.content_json`), pas des lignes de table avec un id. Le nœud "Hydrate Context" ne cherche donc **pas** `signalRef` — à la place, il va chercher automatiquement les 3 actualités les plus récentes de `sector_news` pour le secteur du compte (`companies.sector_id`). Le champ `signalRef` reste dans le type TypeScript `CommunicationBrief` pour compatibilité V1.5 (quand un vrai sélecteur de signal existera), mais il est ignoré par ce workflow.

## 5. Gestion des erreurs — écart volontaire avec le document

Le document (§7.3, nœud 11) proposait un "Error Trigger" séparé configuré via *Workflow Settings → Error Workflow*. En pratique, un Error Trigger démarre une **exécution neuve et isolée** : il ne reçoit que `{ execution, workflow }`, pas les données de l'exécution qui a échoué — donc pas moyen de récupérer `runId`/`callbackUrl` pour notifier Next.js de l'échec.

Ce workflow utilise à la place la sortie d'erreur native des nœuds (`onError: continueErrorOutput`) sur "Hydrate Context", "Call LLM" et "Parse & Validate Output" : en cas d'échec, ces nœuds routent vers "Prepare Failure Callback" **avec le contexte de l'exécution encore disponible** (`runId`, `callbackUrl`), qui notifie proprement `/api/n8n/callback` avec `status: "failed"`.

## 6. Test avant activation

1. Dans n8n, ouvrir le nœud "Webhook — Communication" → copier l'URL de test.
2. Depuis Kredo (dev), déclencher une génération depuis le drawer Rédaction assistée sur un compte réel — ça passe par `/api/n8n/trigger` qui signe et poste vers `{N8N_WEBHOOK_BASE_URL}/webhook/intel-020-communication`.
3. Vérifier dans n8n → **Executions** que les 8 nœuds du chemin nominal s'exécutent sans erreur.
4. Vérifier dans Supabase que `ai_intelligence_runs.status` passe à `succeeded` et qu'une ligne apparaît dans `ai_intelligence_results` avec `phase = 5`, `result_type = 'communication'`.
5. Vérifier que le drawer reçoit le résultat via Realtime (pas de refresh manuel nécessaire).
6. Tester un échec volontaire (couper `ANTHROPIC_API_KEY` temporairement) pour vérifier que le run passe à `failed` proprement au lieu de rester bloqué en `running`.

## 7. Activation

Une fois le test §6 validé de bout en bout : activer le workflow (toggle en haut à droite de l'écran n8n).

## 8. Extension ADR-0009 — génération de pitch (canaux `spoken_pitch_30s`/`meeting_briefing`)

Ce même workflow porte désormais aussi la génération de pitch (onglet "Stratégie" de la fiche compte). Rien de nouveau à importer/activer séparément — c'est le fichier `intel-020-communication.json` déjà présent qui a été étendu, réimporter la version à jour suffit.

- **Nœud "Hydrate Context"** : bascule automatiquement sur `get_pitch_context` (au lieu de `get_communication_context`) quand `brief.what.channel` est `spoken_pitch_30s` ou `meeting_briefing`. Cette RPC est déjà appliquée en base (migration `20260704180000_pitch_context_rpc.sql`) — rien à faire côté VPS.
- **`brief.context.offerRef` est obligatoire** pour ces deux canaux — le nœud "Validate Brief" rejette la requête sinon (no-go ADR-0009 : jamais de pitch sans offre catalogue confirmée).
- **Sortie** : `result_type: "commercial_pitch"` (déjà éligible à l'auto-sauvegarde bibliothèque côté `api/n8n/callback/route.ts`, aucun changement requis là non plus). `content_json.kind` vaut `spoken_pitch` ou `meeting_briefing` selon le canal.
- **QA flags additionnels** propres au pitch : `has_offer_ref`, `word_count_in_target` (spoken uniquement), `has_call_to_action`, `no_price_commitment`, `arguments_have_evidence` (briefing uniquement). Le check `no_price_commitment` est une heuristique de texte (montant en €, avec ou sans formulation d'ordre de grandeur) — pas une garantie absolue, un `needs_review` reste possible en faux positif/négatif occasionnel.
- **Test recommandé avant activation** (en plus du §6) : déclencher un pitch `cold_call_pitch` sur un prospect réel (ex. ACRI-ST) et un `meeting_prep_cross_sell` sur un client actif à missions multiples (ex. Voyage Privé) — vérifier que l'offre citée correspond bien à `context.offerRef` et qu'aucun TJM n'est présenté comme un prix ferme.

## 9. Extension ADR-0013 Lot 3 — scénarios mail/pitch catégorisés, briefings non commerciaux

Toujours le même fichier `intel-020-communication.json` — réimporter la version à jour suffit, aucun nouveau workflow.

- **`outputKind` remplace le canal comme signal de routage** — `brief.what.outputKind` (`written_message`/`spoken_pitch`/`structured_briefing`) est désormais la source de vérité, avec fallback channel-based pour les runs antérieurs au Lot 2 (sans casser les 21 scénarios historiques). `Validate Brief` calcule ce fallback une fois pour toute la chaîne.
- **`offerRef` n'est plus obligatoire pour tout canal pitch** — seulement pour les 3 scénarios `cold_call_pitch`/`meeting_prep_cross_sell`/`renewal_pitch` (`SCENARIOS_REQUIRING_OFFER` dans "Validate Brief", synchronisé à la main avec `requiresOffer` du registre front `communication-scenario-registry.ts` — **penser à mettre à jour les deux côtés si la liste évolue**). Supersede l'ancienne règle ADR-0009 §6 qui bloquait tout canal `spoken_pitch_30s`/`meeting_briefing` sans offre.
- **3 nouveaux system prompts** dans "Assemble Prompt", sélectionnés par `activityCategory` pour les scénarios `structured_briefing` non commerciaux : `SYSTEM_PROMPT_BRIEFING_DELIVERY` (delivery), `SYSTEM_PROMPT_BRIEFING_MANAGEMENT` (interne_management), `SYSTEM_PROMPT_BRIEFING_RECRUITMENT` (recrutement). Les catégories commerciales (`commerce_prospection`/`commerce_actif`) et les runs sans `activityCategory` continuent d'utiliser `SYSTEM_PROMPT_MEETING_BRIEFING` inchangé.
- **`MeetingBriefingOutput` enrichi** de 3 champs optionnels — `postures`, `emotional_context`, `power_dynamic` — **obligatoires** pour les 3 catégories non commerciales (validé par "Parse & Validate Output", qui rejette la génération sinon), absents/non requis pour les briefings commerciaux existants (non-régression).
- **Nouveau `result_type = "prise_de_parole"`** pour tout pitch/briefing non commercial (distinct de `commercial_pitch`), auto-sauvegarde en bibliothèque documentaire déjà câblée côté `api/n8n/callback/route.ts`/`save-as-document.ts`.
- **QA renforcé** : `has_offer_ref` ne se déclenche plus que si `brief.context.offerRef` est réellement présent (avant ce lot, il échouait systématiquement "À vérifier" pour tout pitch sans offre — trompeur). Nouveau check `no_commercial_language` pour les 3 catégories non commerciales : détecte les mentions catalogue/grille tarifaire/TJM/proposition commerciale qui n'ont rien à faire dans un briefing interne.
- **10 scénarios pitch/briefing flagship** ont une instruction MISSION bespoke dans `PITCH_SCENARIO_MISSIONS` (`client_crisis_talk_track`, `tense_copil_briefing`, `escalation_briefing`, `risk_meeting_briefing`, `quarterly_business_review`, `disciplinary_meeting_posture`, `difficult_announcement_talk_track`, `intercontract_exit_pitch`, `recruiter_briefing_pre_interview`, `candidate_to_client_pitch`) + 4 scénarios mail flagship dans `SCENARIO_MISSIONS` (`consultant_replacement_notice`, `client_tension_apology`, `one_on_one_alignment`, `collaborator_recognition`). Les ~50 autres scénarios du registre (sur 73) retombent sur une mission vide — dégradation déjà existante et sûre, la section OBJECTIF/CONTEXTE reste suffisante pour un premier jet correct. Complément possible dans un lot ultérieur selon retour d'usage.
- **Renommage `profile_submission` → `profile_submission_to_client`** dans `SCENARIO_MISSIONS` (mail) — synchronisé avec le rename côté TypeScript (`CommunicationScenario`, registre, `save-communication-interaction.ts`). Les runs déjà stockés en base avec l'ancien libellé restent inchangés (artefact historique figé, jamais ré-hydratés dans un `<select>`).
- **`Hydrate Context` inchangé** — testé en direct via `mcp__supabase__execute_sql` que `get_communication_context`/`get_pitch_context` avec `p_company_id = null` renvoient un JSON valide (`company: null`, tableaux vides), pas d'erreur. Les runs `scope="collaborator"`/`"internal"` (aucun compte) passent donc par les mêmes 2 RPC existantes sans modification du graphe de nœuds, avec un contexte compte vide — le grounding réel pour ces scopes vient de `brief.context.mustInclude` (faits collaborateur injectés côté front par `CommunicationComposerHost`, pas par une RPC dédiée — décision de scope Lot 3, pas une omission).
- **Test recommandé avant activation** : déclencher `difficult_announcement_talk_track` (scope collaborateur, depuis `ConsultantDrawer` une fois câblé au Lot 4) et `quarterly_business_review` — vérifier que `postures`/`emotional_context`/`power_dynamic` sont bien remplis et qu'aucune mention catalogue/TJM n'apparaît. Vérifier aussi qu'un `cold_call_pitch` existant produit toujours exactement le même type de sortie qu'avant ce lot (non-régression).
- **Validation réalisée avant import** : `node --check` sur les 5 nœuds Code modifiés + exécution réelle (pas seulement syntaxique) via harnais Node avec mocks — signature HMAC, gating `requiresOffer` (accept/reject), fallback `outputKind` sur run legacy, sélection du bon system prompt par catégorie, rejet d'un briefing non commercial incomplet, détection d'une fuite de vocabulaire commercial, routage `result_type` à 3 voies, non-régression du chemin `cold_call_pitch` existant, résolution du scénario renommé `profile_submission_to_client`. JSON final re-extrait et re-syntax-checké nœud par nœud après écriture pour exclure toute corruption d'échappement.

## 10. Changelog — 5 tons métier supplémentaires (INTEL-020, sans migration DB ni nouveau workflow)

Toujours le même fichier `intel-020-communication.json` — réimporter la version à jour suffit, aucun nouveau workflow, aucune migration Supabase (le champ `tone` transite uniquement par `input_snapshot`, il n'existe aucun enum DB `tone`).

- **5 nouveaux tons** ajoutés à `CommunicationTone` (front, `src/lib/n8n/types.ts`) et au sélecteur `TONE_OPTIONS` (`communication-brief-options.ts`), en plus des 6 tons historiques (`direct`/`formal`/`warm`/`assertive`/`pedagogical`/`diplomatic`, tous conservés) : `technical_expertise` (Technique / expertise), `business_roi` (Business / ROI), `enthusiastic_confident` (Enthousiaste / confiant), `disappointed_confused` (Déçu / incompréhension), `prudent` (Prudent).
- **Table de correspondance `TONE_INSTRUCTIONS`** ajoutée dans le nœud "Assemble Prompt" : elle traduit chaque identifiant technique de ton en une instruction textuelle explicite injectée dans le prompt (branches pitch **et** mail/message). Avant ce changement, `brief.how.tone` était injecté brut dans le prompt — les nouveaux identifiants (`technical_expertise`, `business_roi`, …) auraient risqué d'être mal interprétés par le LLM. Fallback sur la valeur brute pour tout ton non listé → rétrocompatibilité totale des 6 tons historiques et de tout run antérieur.
- **Aucun autre nœud modifié** : pas de validateur/enum côté n8n sur le ton, la valeur choisie continue de transiter telle quelle dans `brief.how.tone`.

## 11. Lot 10 — validation canonique et hydratation par scope

Toujours le même fichier `intel-020-communication.json` — réimporter la version à jour suffit, aucun nouveau workflow, aucune migration Supabase.

### Validate Brief — réécriture complète

- Normalisation legacy identique au front (`communication-legacy-normalizer.ts`) : `interne_management` + scope explicite → `management_consultants`/`internal_staff` (rejet si scope absent, jamais de devinette) ; `profile_submission` → `profile_submission_to_client` ; canal oral/briefing historique → `outputKind` (fallback déjà existant, inchangé).
- Validation stricte des 3 finalités et 6 catégories canoniques, et de la **cohérence scope/catégorie** (ex: `management_consultants` exige `scope="collaborator"`, rejeté sinon) — invariant qu'aucun run n'avait jamais besoin de respecter avant ce lot puisque `scope` n'était même pas lu.
- Champs obligatoires par scope (command §1) : `collaboratorRef` requis pour `scope="collaborator"`, `internalRole` requis pour `scope="internal"` — **aucune référence CRM requise** pour ces deux scopes (command §4).
- **Correctif de dérive** : `SCENARIOS_REQUIRING_OFFER` n'avait que 3 scénarios (`cold_call_pitch`/`meeting_prep_cross_sell`/`renewal_pitch`) alors que le registre front (`OFFER_REQUIRED_SCENARIOS`, `communication-scenario-registry.ts`) en compte 6 depuis ADR-0013 Lot 1 — `offer_introduction`, `cross_sell` et `proposal_defense_pitch` pouvaient passer sans offre catalogue depuis ce lot-là, sans jamais être bloqués côté n8n. Synchronisé. **Penser à recomparer les deux listes si le registre évolue.**
- `activeSources` calculé une fois pour toute la chaîne : les 11 identifiants de source moins `brief.context.disabledContextSources`. Aucune copie de `requiredContextSources`/`optionalContextSources` de la registry front : le front garantit déjà qu'une source verrouillée ne peut jamais atterrir dans `disabledContextSources` (`CommunicationBriefForm.tsx`, Lot 7 — `toggleContextSource` refuse tout `locked_on`/`unavailable`), donc `disabledContextSources` est la contrainte déjà résolue que n8n peut consommer telle quelle (command §1 "ne duplique pas manuellement toute la registry").

### Hydrate Context — routage par scope (remplace `isPitch ? ... : ...`)

- **`account`** : `get_communication_context` toujours (sauf sans `companyId`) ; `get_pitch_context` **uniquement** si `requiresOffer` ou `offerRef` présent, fusionné par-dessus sans écraser les champs généraux (seuls les champs propres à l'offre — `offer`, `pricingGrid`, `suggestedPractices`, `deliveredPractices`, `previousPitches`, `legacyPitches`, `scores`, `anchorOpportunity`, `anchorMission` — sont ajoutés).
- **`collaborator`** : `get_collaborator_communication_context` uniquement, avec `missionId` facultatif transmis si `brief.context.missionRef` est présent (Lot 8).
- **`internal`** : **aucun appel RPC par défaut** — le contexte vient exclusivement de `brief.who.recipient.{internalRole,internalRelationship,internalDomain,displayName}` (`ctx.internalRecipient`). Si une référence facultative compte/collaborateur est présente (`brief.context.companyRef`/`collaboratorRef`, Lot 9), elle est enrichie via les **mêmes** RPC déjà utilisées pour `account`/`collaborator` — pas une RPC nouvelle, conforme à "ne pas appeler de RPC spécifique" (command §2).
- **Filtrage réel des sources** (command §3) : chaque champ de contexte hydraté est rattaché à un identifiant de source (`SOURCE_FIELD_MAP`). Une source absente de `activeSources` (désactivée par l'utilisateur ou verrouillée-indisponible) voit ses champs supprimés de `ctx` **avant** qu'Assemble Prompt ne les lise — `mustExclude` n'est plus jamais utilisé comme mécanisme de filtrage (déjà retiré côté front au Lot 7, confirmé ici côté n8n).
- **Sortie compatible** (command §6) : les champs hydratés restent à la racine du JSON de sortie (`ctx.company`, `ctx.activeOpportunities`, `ctx.collaborator`, `ctx.internalRecipient`, …) exactement comme le faisait l'ancien nœud HTTP Request (réponse RPC brute) — Assemble Prompt continue de lire `$('Hydrate Context').item.json` sans aucune adaptation de ce côté. `normalizedContract` (command §5, forme `{outputKind, activityCategory, scope, scenario, objective, channel, length, tone, recipient, references, context, activeSources, instructions}`) s'ajoute en plus, prêt pour une consommation future (Lot 11+), sans rien remplacer.

### Assemble Prompt — 5 correctifs ciblés, aucun texte éditorial modifié

- **Bug corrigé** : le sélecteur de system prompt briefing testait encore `activityCategory === 'interne_management'` — une valeur que le front n'émet plus jamais depuis les Lots 1-2 ADR-0013. Conséquence réelle avant ce lot : **tout** briefing `management_consultants`/`internal_staff` (Lots 8-9) retombait sur `SYSTEM_PROMPT_MEETING_BRIEFING`, le prompt **commercial** (règles catalogue/tarif). Corrigé pour les deux catégories canoniques.
- **`recipientContextLine`** : bloc DESTINATAIRE rendu scope-aware (identité consultant pour `collaborator`, rôle/relation/domaine pour `internal`) au lieu des champs CRM `persona`/`relation`/`companyName` qui n'ont jamais eu de sens hors scope `account`. Repli strict sur le rendu historique (byte-for-byte identique) pour `scope="account"` — non-régression du chemin le plus emprunté vérifiée par le harnais.
- **Nouvelles sections CONTEXTE** additives (`if (ctx.X) sections.push(...)`, jamais déclenchées pour un run `account` existant) : profil consultant, mission actuelle, profil métier, compétences, manager (scope `collaborator`) ; rôle/relation/domaine (scope `internal`).
- **Non fait, assumé** : aucun nouveau system prompt éditorial (hors périmètre explicite command). `internal_staff` continue de partager `SYSTEM_PROMPT_BRIEFING_MANAGEMENT` avec `management_consultants` faute d'un prompt dédié — imparfait (le registre parle de collaborateur, pas de collègue Staff) mais strictement meilleur que le prompt commercial utilisé jusqu'ici. Le chemin `written_message` n'a **toujours aucune** différenciation de prompt par catégorie (`SYSTEM_PROMPT` unique, pré-existant à ce lot) — non traité ici, réservé au Lot 11 ("prompts et QA exhaustifs").

### Parse & Validate Output / Quality Check

- Même correctif de dérive que ci-dessus : `NON_COMMERCIAL_CATEGORIES` contenait `interne_management` (mort) au lieu de `management_consultants`/`internal_staff` — la validation `emotional_context`/`power_dynamic` obligatoire et le QA `no_commercial_language` ne s'appliquaient donc jamais à un vrai run Lot 8/9.

### `input_snapshot` (command §6)

Vérifié sans modification nécessaire : `saveRun()` (`src/lib/n8n/runs.ts`) stocke `input_snapshot = opts.input` — le brief **complet** tel que construit par le front (`what.outputKind`/`activityCategory`/`scope`, destinataire interne/collaborateur, `disabledContextSources`, toutes les références) — sans transformation. Le pattern run/résultat/callback signé/statuts/erreurs/Realtime n'a subi aucun changement.

### Test avant activation (en plus du §6)

1. Déclencher un scénario `account` simple sans offre (ex. `signal_outreach`) — vérifier une seule requête RPC dans les logs d'exécution n8n (`get_communication_context`).
2. Déclencher `offer_introduction` avec une offre choisie — vérifier deux requêtes RPC (`get_communication_context` puis `get_pitch_context`) et que `ctx.offer`/`ctx.pricingGrid` apparaissent dans `contextSnapshot` du résultat.
3. Déclencher un scénario `management_consultants` (ex. `collaborator_recognition`, depuis `ConsultantDrawer`) — vérifier une seule requête RPC (`get_collaborator_communication_context`), et que le contenu généré ne mentionne ni catalogue ni tarif.
4. Déclencher un scénario `internal_staff` sans référence facultative (ex. `internal_arbitrage_request`) — vérifier **zéro** requête RPC dans les logs d'exécution.
5. Désactiver une source optionnelle (ex. "Signaux et actualités") dans le composer avant de générer — vérifier dans `contextSnapshot` que `sectorNews`/`sectorIntelligence` sont absents du résultat stocké.
6. Non-régression : un `cold_call_pitch` existant continue de produire exactement le même type de sortie qu'avant ce lot.

### Validation réalisée avant import

`node --check` (fonction englobante `async function` pour matcher le mode d'exécution réel des nœuds Code n8n) sur les 5 nœuds modifiés (`Validate Brief`, `Hydrate Context`, `Assemble Prompt`, `Parse & Validate Output`, `Quality Check`) + exécution réelle via harnais Node avec mocks (`this.helpers.httpRequestWithAuthentication`, `$()`, `$env`) — 46 assertions couvrant compte sans offre, compte avec offre obligatoire (accept/reject + fusion), recrutement candidat, delivery avec mission, management consultant (routage RPC + sélection du bon system prompt), Staff interne sans référence (zéro appel RPC), Staff interne avec référence facultative (enrichissement via RPC existante), source optionnelle désactivée (filtrage réel), brief legacy (3 normalisations simultanées), scope incohérent avec la catégorie (rejeté, 3 variantes), champ obligatoire par scope manquant (rejeté, 2 variantes), isolation workspace (chaque appel RPC scopé par construction), et régression de la liste `SCENARIOS_REQUIRING_OFFER`. JSON final re-chargé et chaque nœud modifié re-extrait/re-syntax-checké après écriture pour exclure toute corruption d'échappement.

## 12. Lot 11 — prompts (4 couches) et QA (réparation / rejet / ancrage)

Réécriture éditoriale et QA des nœuds Code, sans nouveau workflow, sans migration.

### Manifeste de scénarios (généré, C1)

La registry TS (`src/lib/communication/communication-scenario-registry.ts`) est la
source de vérité. `scripts/generate-communication-manifest.mjs` (script npm
`npm run gen:comm-manifest`) en dérive :
- l'artefact versionné `n8n/workflows/intel-020-communication.manifest.json` ;
- un bloc `const SCENARIO_MANIFEST = [...]` inliné dans le nœud `Assemble Prompt`
  entre `// MANIFEST:START` / `// MANIFEST:END`.

Un nœud Code n8n ne peut pas importer le TS de l'app au runtime (sandbox VPS) :
le manifeste est donc matérialisé **au build-time**. **Après toute modification de
la registry, relancer `npm run gen:comm-manifest` et recommiter le workflow**, sinon
le test de drift échoue (`node scripts/generate-communication-manifest.mjs --check`).

### Assemble Prompt — 4 couches composées

1. Règles globales (identité **sourcée**, jamais inventée ; aucune spécialisation
   affirmée ; interdiction d'inventer ; préséance des règles sur les préférences).
2. Forme + contrat de sortie par `outputKind` (écrit / pitch oral / briefing).
3. Garde-fous par `activityCategory` (le chemin **écrit** est aussi différencié :
   commerce ≠ delivery ≠ recrutement ≠ management ≠ interne).
4. Mission par scénario : **21 flagship bespoke** + template dérivé du manifeste
   pour la longue traîne. Durées (`SPOKEN_DURATION`) et profondeurs (`BRIEFING_DEPTH`)
   réellement pilotées par `length` (fin du « 30 s » codé en dur).

### QA (Quality Check) — réparation déterministe, rejet bloquant, ancrage

- Réparation **déterministe uniquement** (fences ```` ```json ````) dans Parse —
  aucun second appel LLM.
- Checks : placeholders, données techniques, **ancrage contextuel non naïf**
  (jetons distinctifs + `source_refs`, seuil conservateur), exclusions, vocabulaire
  commercial hors commerce, engagement de prix, contrôles par finalité.
- Un échec **bloquant** (placeholder, fuite technique, exclusion violée, ancrage nul
  sur contexte riche) fait émettre à `Prepare Callback` un `status: 'failed'` avec
  `errorMessage` **lisible et sans fuite technique** + `qaFlags` — jamais un faux
  succès. L'UI (`IntelligenceActionDrawers.tsx`) affiche ces `qaFlags` au lieu du
  message générique « logs n8n ».

### Test avant activation (en plus des §6/§11)

1. `signal_outreach` sur un compte riche → générer, vérifier un texte réellement
   ancré (nom du compte / mission citée) et `status = succeeded`.
2. Forcer un contexte pauvre (nouveau prospect) → doit rester `succeeded` (ancrage
   non exigé).
3. Pitch oral `detailed` → vérifier une durée cible ~5 minutes (pas 30 s).
4. Briefing `management_consultants` → contenu sans vocabulaire commercial, avec
   posture/contexte émotionnel.
5. Message de reconnaissance consultant → ne doit PAS être flaggé pour absence de
   CTA commercial.

### Validation réalisée avant import

`node --check` sur les 5 nœuds Code modifiés + harnais Node réel
(`node n8n/workflows/__tests__/intel-020-communication.test.js`) → **81 assertions,
0 échec** : couverture des 92 scénarios (mission non vide), drift registry ⇔
manifeste ⇔ inliné, durée/profondeur pilotées, identité non inventée, injection
neutralisée, ancrage bloquant, placeholder/exclusion bloquants, réparation vs rejet,
routage `resultType`, 5 tons métier injectés. `npx tsc --noEmit` / `npm run build`
/ `eslint` verts.

> ⚠️ **Commit Git ≠ déploiement n8n.** Ce lot ne modifie que le JSON du workflow
> (inerte tant que non ré-importé sur le VPS), les tests, le générateur et une
> touche UI. Réimporter `intel-020-communication.json` sur le VPS pour activer les
> nouveaux prompts. Le secret HMAC est déjà configuré (Sessions 19+).

## 13. Correctif bug live — "Hydrate Context" incompatible avec le sandbox Code node

**Symptôme observé sur le VPS** (canvas d'exécution réelle) : le workflow bascule en branche d'échec au nœud `Hydrate Context`, message d'erreur :
```
The function "helpers.httpRequestWithAuthentication" is not supported in the Code Node
```

**Cause** : `this.helpers.httpRequestWithAuthentication` — utilisé pour réutiliser le credential natif `supabaseApi` depuis un nœud Code (introduit au Lot 10, §11 ci-dessus) — n'est pas exposé dans le sandbox du nœud Code sur les versions n8n **antérieures à 1.42.0**. C'est un problème connu et documenté côté n8n (corrigé en 1.42.0), pas une erreur de configuration côté KREDO. Le credential store natif n'est donc accessible qu'aux nœuds **HTTP Request** classiques (`Update Run Status`, `Resolve Sender`, `Call LLM`, `Callback`, `Callback (Failure)`, tous non affectés), jamais aux nœuds Code.

**Correctif** : `Hydrate Context` utilise désormais `this.helpers.httpRequest` (helper HTTP nu, sans wrapper d'authentification — supporté par le nœud Code sur toutes les versions n8n, confirmé par la doc/communauté n8n). L'authentification Supabase (`apikey` + `Authorization: Bearer`) est construite à la main dans le code du nœud à partir de `$env.SUPABASE_SERVICE_ROLE_KEY` — variable déjà exigée au §2 de ce document depuis le Lot 0, mais jamais effectivement lue par aucun nœud Code avant ce correctif.

**Action requise avant réimport** :
1. Vérifier que `SUPABASE_SERVICE_ROLE_KEY` est bien positionnée dans l'environnement du conteneur n8n (§2) — c'était déjà une exigence documentée, à confirmer concrètement si l'erreur ci-dessus s'est produite.
2. Réimporter `intel-020-communication.json` sur le VPS (le JSON committé n'est actif qu'après réimport — un commit Git ne déploie rien sur n8n).
3. Rejouer un scénario `account` simple (ex. `signal_outreach`) et vérifier que `Hydrate Context` s'exécute sans passer par la branche d'échec.

**Validation réalisée dans cette session** : harnais Node (`node n8n/workflows/__tests__/intel-020-communication.test.js`) mis à jour pour mocker `this.helpers.httpRequest` (plus `httpRequestWithAuthentication.call`) et pour exiger `SUPABASE_SERVICE_ROLE_KEY` dans l'environnement de test → **81 passed, 0 failed** (inchangé). `node --check` sur le nœud modifié → OK. JSON du workflow rechargé, 16 nœuds, connexions intactes. Aucun autre nœud Code de ce workflow ni d'aucun autre workflow du repo n'utilise `httpRequestWithAuthentication` (grep confirmé) — bug contenu à ce seul nœud.

## 14. Resolution des échecs récurrents « JSON invalide et non réparable » (Structured Outputs)

- **Cause des erreurs JSON intermittentes** : Le nœud `Call LLM` s'appuyait uniquement sur des consignes textuelles dans le prompt pour demander du JSON. Sur certaines générations (notamment `written_message`), le LLM produisait de la syntaxe malformée (guillemets internes mal échappés, newlines brutes dans des strings, etc.), entraînant l'échec bloquant `JSON invalide et non réparable` dans `Parse & Validate Output`.
- **Passage à Structured Outputs / JSON Schema** : L'appel LLM (`Call LLM`) est désormais contraint directement au niveau de l'API Anthropic via `output_config: { format: { type: "json_schema", schema: $json.outputSchema } }`. Le schéma `outputSchema` est construit dynamiquement par `Assemble Prompt` pour chacun des trois `outputKind` (`written_message`, `spoken_pitch`, `structured_briefing`), garantissant une sortie 100% conforme à la grammaire JSON.
- **Maintien d'un parser métier strict** : Le nœud `Parse & Validate Output` conserve `JSON.parse()`, le nettoyage défensif des fences Markdown, et toutes les validations métier strictes par `outputKind`. Aucune librairie de réparation complexe ou retry caché n'a été ajouté. Le diagnostic de parsing est enrichi pour remonter explicitement `stop_reason=max_tokens` ou l'absence de bloc textuel.
- **Absence de migration Supabase** : Aucune table, colonne ou RPC n'a été ajoutée ou modifiée.
- **Absence de changement de contrat UI** : La structure des objets JSON produits et consommés par KREDO reste strictement inchangée.


## 15. Battle situation pitch (Dynamic Playbooks — Lot 4)

### Scénario

`battle_situation_pitch` — 93e scénario du registre, catégorie `commerce_prospection`,
`outputKind = spoken_pitch`, canal `spoken_pitch_30s`, `requiresOffer = true`,
`requiredScopes = ["account"]`. Il est produit par le configurateur Situation de la
Battle Card (`/intelligence` → Playbooks → Battle Cards → Situation), et reste
sélectionnable dans le Composer générique.

### Contrat attendu

Le brief est un `CommunicationBrief` canonique. La situation commerciale choisie par
l'utilisateur voyage dans un bloc **additif**, `brief.context.battleSituation` :

```jsonc
{
  "competitiveEntryId": "…",       // competitive_map_entries.id
  "segmentId": "…",                // sector_intelligence.id (segment)
  "issue":  { "id": "…", "label": "…", "source": "account" | "sector" },  // requis
  "angle":  { "label": "…", "source": "account" | "sector" },             // requis
  "timing": { "label": "…", "source": "account" | "sector" },             // optionnel
  "objection": { "label": "…", "response": "…" },                          // optionnel
  "roiArgument": "…",                                                      // optionnel
  "personaLabel": "DSI"            // UNIQUEMENT si aucun contact CRM
}
```

`offerRef` reste **canonique** (`brief.context.offerRef`), jamais dupliqué dans le bloc.
Une clé optionnelle non choisie est **absente**, jamais à `undefined`.

### Modifications internes du workflow

| Nœud | Modification |
|---|---|
| `Validate Brief` | `battle_situation_pitch` ajouté à `SCENARIOS_REQUIRING_OFFER` → un brief sans `offerRef` est rejeté avant tout appel LLM. |
| `Assemble Prompt` | Nouvelle fonction `buildBattleSituationMission(situation, ctx)` + aiguillage du `missionText`. Le manifeste inliné passe de 92 à 93 entrées (régénéré, jamais édité à la main). |
| `Prepare Callback` | Inchangé : le titre du résultat suit l'humanisation mécanique du slug ; le titre du document est dérivé du libellé canonique du registre côté KREDO. |

Aucun nœud ajouté ou supprimé (16 nœuds), aucune connexion modifiée, aucune migration.

### Rendu dans le prompt

La situation est rendue **en tête du `userPrompt`**, dans le bloc mission — donc avant le
CONTEXTE hydraté — sous un intitulé « SITUATION COMMERCIALE CHOISIE » qui énonce
explicitement qu'elle **prime** sur le contexte générique. Chaque élément porte sa
provenance :

- `source: "account"` → `[COMPTE — information rattachée à ce compte]`
- `source: "sector"` → `[SECTEUR — connaissance sectorielle applicable au segment, jamais un fait établi sur ce compte]`

Une consigne dédiée impose de formuler tout élément `[SECTEUR]` comme une hypothèse.
`roiArgument` est repris **qualitativement**, avec interdiction explicite d'en dériver
un chiffre, un pourcentage ou un délai.

### Dégradation défensive

Si `brief.context.battleSituation` est absent (scénario choisi depuis le Composer
générique), `Assemble Prompt` retombe sur la mission template dérivée du manifeste :
aucun crash, aucun `undefined` injecté, aucun bloc SITUATION vide. Le reste du workflow
est strictement inchangé.

### Pipeline résultat

Aucun code nouveau : `outputKind = spoken_pitch` + `activityCategory = commerce_prospection`
→ `Prepare Callback` émet `resultType = commercial_pitch`, `phase = 5`, que
`communication-result-documents.ts` projette en `document_type = commercial_pitch`.

### Tests

`node n8n/workflows/__tests__/intel-020-communication.test.js` → **161 assertions, 0 échec**
(118 avant ce lot, **+43**). Bloc `BS.1` → `BS.8` : nominal, optionnels absents, fallback
persona, provenance sectorielle, `battleSituation` absent, `offerRef` absent (rejet),
chaîne complète jusqu'à `commercial_pitch`, et non-régression de `signal_outreach` /
`cold_call_pitch` / `sector_persona_pitch`.

`node scripts/generate-communication-manifest.mjs --check` → 93 scénarios synchronisés.

### Procédure d'import / validation VPS

**Import requis : OUI.** Le JSON committé est inerte tant qu'il n'est pas réimporté.

1. Réimporter `n8n/workflows/intel-020-communication.json` sur le VPS (import manuel,
   Guillaume — cf. AGENTS.md).
2. Vérifier dans l'éditeur que `Assemble Prompt` contient bien
   `SITUATION COMMERCIALE CHOISIE` et que le bloc `MANIFEST:START/END` porte 93 entrées.
3. Déclencher un pitch depuis une Battle Card (compte avec offre suggérée) et vérifier
   sur le canvas : `Validate Brief` OK, `Assemble Prompt` → `userPrompt` contenant la
   situation, callback `resultType = commercial_pitch`.
4. Contrôle négatif : déclencher le même scénario depuis le Composer générique **sans**
   situation → doit produire un pitch générique sans erreur.
5. `npm run n8n:status` pour mesurer la dérive résiduelle repo ↔ VPS (⚠️ il compare des
   compteurs de nœuds : il ne verra pas ce lot, qui ne change que du code interne).
