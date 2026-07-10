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
