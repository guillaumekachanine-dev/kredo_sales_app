# ADR-0009 — Génération de pitch (oral 30 s + fiche de préparation RDV)

**Statut :** Proposé
**Date :** 2026-07-04
**Décideurs :** Guillaume (Owner)
**Successeur potentiel de :** rien ne l'est pour l'instant — s'appuie sur ADR-0007 (moteur intelligence), ADR-0008 (client intelligence hub) et INTEL-020 V1 (rédaction assistée).

---

## 1. Contexte

### 1.1 Ce qu'on a livré (INTEL-020 V1 — Session 15)

- `CommunicationBrief` (what/who/how/context) → 18 scénarios (email, LinkedIn, note interne).
- Workflow `intel-020-communication` : Webhook HMAC → Validate → Hydrate → LLM (Claude Sonnet) → QA → Callback signé.
- Sortie normalisée `CommunicationOutput` : `subjects/body/key_points/source_refs/warnings`.
- UI unique : `CommunicationBriefForm` (accordéons QUOI/QUI/COMMENT/CONTEXTE), rendue polymorphe par channel côté UX.
- Réservoir de données déjà exploité : `companies`, `contacts`, `sector_news`, `interactions`, `missions`, `opportunities`, `profiles`.

Deux scénarios de `CommunicationScenario` déjà taxonomisés — `cross_sell` et `offer_introduction` — mais leur sortie reste un **email écrit**. C'est le trou fonctionnel.

### 1.2 Ce que le catalogue permet maintenant (Session 19 — validé live)

Live sur Supabase :

| Table | Rows | Rôle pour le pitch |
|---|---|---|
| `offer_practices` | **8 actives** | Cloud Engineering · Cybersecurity · Data & AI · Digital Business Solutions · Digital Experience · Legacy Systems & Mainframe · Project & Agile Delivery · Quality Engineering & Testing |
| `offers` | **41 actives** | `short_description`, `typical_deliverables[]`, `typical_profiles[]`, `use_cases[]`, `keywords[]` → **le pitch ne peut plus parler dans le vide** |
| `offer_engagement_types` | **5** | Régie (3-24 m) · Forfait (1-6 m) · Centre de Compétences (6-36 m) · Conseil (2-8 sem) · Audit (2-4 sem) |
| `offer_pricing_grids` | **120** | TJM min/max/reco par (job_profile × engagement × séniorité) — l'ancre chiffrée qu'il manquait |
| `job_profiles` | **19** | Fiches profils avec `main_mission`, `responsibilities[]`, `tech_stack[]`, `embedding` (pgvector prêt côté profil, pas côté offre) |

**Absent (verrou pgvector) :** `offers.embedding` n'existe pas. Le matching offre↔compte reste **par règles** en v1, embeddings v2.

### 1.3 État commercial live (à date)

- **Comptes** : 88 prospects · 6 clients actifs · 1 ancien. Ratio d'amorçage classique.
- **Opportunités ouvertes (16)** : qualif (4), contractualisation (3), recherche_profil (3), cv_envoyés (3), entretien_client (3).
- **Projets forfait** : 3 · **Missions actives** : 19 · **Interactions historiques** : 84.
- **Cross-sell exploitable immédiatement** :
  - Voyage Privé (7 missions Digital + PM + QA) → **7 offres Cloud/Cyber/Data & AI/Legacy non consommées** = terrain cross-sell le plus riche.
  - Ascoma (Cloud + Data) → Cybersecurity (client bancaire, NIS2/DORA) et Digital Experience évidents.
  - Robertet (Digital seul) → Data & AI (parfum = R&D formulation, RAG documentaire) et Cloud (ERP moderne).
  - Banque Populaire Méditerranée (Data + Digital) → Cybersecurity + Legacy Modernization (secteur bancaire → mainframe résiduel).
- **Héritage FOLIO** : `companies.metadata.pitches` contient des drafts email markdown historiques (ex. Ascoma DG panafricain 8-12 %/an) — **utile en few-shot pour le ton de voix, pas comme source de vérité**.

### 1.4 Ce qu'un pitch **n'est pas**

Un pitch dans le contexte KREDO **n'est pas un email**. C'est un des deux artefacts oraux :

1. **Pitch oral 30 s** — script d'accroche téléphonique pour un cold call ou un follow-up voix.
2. **Fiche de préparation RDV** — briefing d'entretien commercial (talking points, arguments, objections, angles cross-sell, données à citer).

Les deux ne sortent pas au format `CommunicationOutput` (subjects/body). Ils ont besoin d'un contrat sortie **distinct**.

---

## 2. Décision

### 2.1 Une seule surface, deux canaux nouveaux

Étendre `CommunicationChannel` avec :

- `spoken_pitch_30s` — sortie orale ~80-100 mots (~30 s à 150 mots/min).
- `meeting_briefing` — sortie briefing structuré, pas un texte à lire.

**Refus** de créer un nouveau workflow n8n `intel-021-pitch` séparé. Le pattern INTEL-020 (Webhook HMAC → Validate → Hydrate → LLM → QA → Callback signé) est déjà validé en production. On l'étend par **branchement sur `channel` dans le nœud "Assemble Prompt"** — 2 nouveaux templates de prompt système, tout le reste inchangé (traçabilité, Realtime, `saveResult`, coûts).

### 2.2 Trois scénarios pitch

Ajouter à `CommunicationScenario` :

| Scénario | Canal par défaut | Objectif | Angle |
|---|---|---|---|
| `cold_call_pitch` | `spoken_pitch_30s` | `get_meeting` | Cold call à un prospect — accroche + valeur + ask |
| `meeting_prep_discovery` | `meeting_briefing` | `get_meeting` (préparation) | RDV de découverte prospect ou client dormant |
| `meeting_prep_cross_sell` | `meeting_briefing` | `present_offer` | RDV chez un client actif avec objectif cross-sell offre non consommée |

Trois est suffisant en v1. Le `follow_up_pitch_after_meeting` peut attendre — on a déjà `post_meeting` en email qui couvre 80 % des cas.

### 2.3 Contrat sortie dédié

```ts
// src/lib/n8n/types.ts — ajout
export type SpokenPitchOutput = {
  hook: string                    // Accroche 1-2 phrases (le "pourquoi vous m'écoutez")
  problem_recognition: string     // La preuve qu'on connaît leur contexte (signal, secteur, actualité)
  offer_link: string              // L'offre catalogue qu'on positionne, en langage client
  ask: string                     // L'appel à l'action mesurable ("15 min la semaine prochaine ?")
  alt_close: string               // Repli si "pas maintenant" ("Un point en septembre ?")
  timing_seconds: number          // Estimation ~28-32 s
  word_count: number              // 80-100 en cible
  tone_notes: string[]            // Instructions de prononciation ("marquer une pause après X")
}

export type MeetingBriefingOutput = {
  objective: string               // 1 phrase — l'objectif du RDV
  key_message: string             // La proposition de valeur en 1 phrase
  arguments: Array<{              // Exactement 3 arguments ancrés
    title: string
    evidence: string              // Ancrage concret (signal, mission passée, offre référence)
    source_ref?: string           // Optionnel : id d'une interaction/mission/offre
  }>
  expected_objections: Array<{    // 3 objections avec réponse prête
    objection: string
    response: string
    fallback?: string
  }>
  cross_sell_hypotheses: string[] // Ponts vers d'autres offres du catalogue (uniquement si scénario cross_sell)
  data_points_to_mention: string[]// Chiffres clés à glisser (TJM référence, durée, delivery similaire)
  close_options: string[]         // 2-3 sorties possibles du RDV
  do_not_say: string[]            // Sujets à éviter (prix ferme, engagement, promesses)
}
```

Ces contrats sont **disjoints** de `CommunicationOutput`. Le callback n8n route sur `content_json.type` (`spoken_pitch` | `meeting_briefing` | `communication`).

### 2.4 Matching offre ↔ compte — v1 par règles

`offers.embedding` n'existe pas. Refus d'ajouter la colonne dans ce lot (chantier séparé v2). En v1 :

- **Client actif** : proposer en cross-sell les practices **absentes des missions actives**. Requête déterministe :
  ```sql
  SELECT p.* FROM offer_practices p
  WHERE p.is_active
    AND p.id NOT IN (
      SELECT DISTINCT of.practice_id FROM offer_practices of
      WHERE of.slug = ANY(SELECT LOWER(practice) FROM missions WHERE company_id=$1 AND status='active')
    );
  ```
  (Le mapping `missions.practice` texte-libre → `offer_practices.slug` est heuristique. Ajouter une FK `missions.practice_id → offer_practices.id` est un chantier de dette, hors scope pitch.)
- **Prospect** : lire `sector_intelligence.practices_fit` (JSONB par secteur) + croiser avec `sector_pain_points` fréquents. Fallback si `sector_id NULL` : top-3 practices "generic entry" (Data & AI, Cybersecurity, Cloud Engineering) — celles qui ont un ROI-message universel.
- **Toujours** : n'accepter qu'une **offre du catalogue** comme `context.offerId` — le LLM ne peut pas inventer.

### 2.5 Hydratation contexte — nouveau RPC

Créer `get_pitch_context(company_id, opportunity_id, mission_id, offer_id)` — analogue à `get_communication_context` mais renvoie **en plus** :

- L'offre sélectionnée (short/full description, deliverables, profiles, use_cases, keywords).
- La grille tarifaire pour l'engagement type par défaut (TJM min/reco/max sur les profils typiques).
- Les missions actives du compte (pour éviter cross-sell d'une practice déjà en place).
- Les 3 dernières interactions non-triviales (pour éviter de répéter un angle).
- 2-3 `sector_news`/`sector_events` frais si `sector_id` présent.
- Les FOLIO pitches historiques du compte (`companies.metadata.pitches`) — **injectés en few-shot ton de voix seulement**, jamais comme faits.

### 2.6 QA flags spécifiques pitch

Ajouts au bloc "Quality Check" du workflow :

- `has_offer_ref` — offre catalogue référencée (bloquant).
- `word_count_in_target` — 80-100 mots pour `spoken_pitch_30s`, souple pour `meeting_briefing`.
- `has_call_to_action` — un ask explicite (bloquant sur `cold_call_pitch`).
- `no_price_commitment` — le pitch ne s'engage pas sur un TJM ferme sans y être invité (bloquant).
- `no_offer_hallucination` — chaque offre citée doit exister dans `offers.name` du contexte (bloquant).
- `arguments_have_evidence` — chaque argument du `meeting_briefing` a une `evidence` non vide (warning).

Un flag bloquant → `status=needs_review`, l'UI le signale mais n'empêche pas la lecture.

### 2.7 UI — extension `CommunicationBriefForm`

- Nouveau composant `PitchChannelPicker` en **étape préalable** du drawer `generate_pitch` : deux grosses cartes (mockup textuel) — "Pitch oral 30 s" vs "Fiche de préparation RDV". Après choix, `CommunicationBriefForm` s'ouvre en mode adapté (accordéons masquent les champs non pertinents : pas de "longueur" pour 30 s, pas de "ton chaleureux" pour un briefing).
- Nouveau composant `OfferPicker` obligatoire dans QUOI : liste des offres suggérées par règles + filtre par practice. **Le formulaire refuse la soumission sans `offerId`.**
- Nouveau composant de rendu résultat `PitchResult` :
  - Mode `spoken_pitch_30s` — carte "Script 30 s" avec timer visuel (barre de progression 30 s), les 5 blocs (hook/problem/offer/ask/alt) sur cartes empilées, bouton "Copier tout" + "Copier hook seul".
  - Mode `meeting_briefing` — sections déroulées : Objectif · Message clé · 3 arguments · 3 objections · Ponts cross-sell · Chiffres à citer · Options de sortie · À éviter. Bouton "Exporter PDF" (v2).
- **Réutilisation** : le drawer existant `PitchMailDrawerContent` devient `PitchDrawerContent` — la boîte à outils Realtime, `saveResult`, callback, sauvegarde bibliothèque reste identique (contrat Realtime déjà branché sur `ai_intelligence_results`).

### 2.8 Persistance

Aucune nouvelle table.

- `ai_intelligence_runs.run_type` : ajouter `pitch_generation` à la contrainte CHECK existante.
- `ai_intelligence_results.result_type` : ajouter `spoken_pitch` et `meeting_briefing` à la contrainte CHECK.
- `intelligence_document_type` (enum) : ajouter `pitch_script` et `meeting_briefing`.
- `save-as-document.ts` : étendre `mapResultTypeToDocumentType` et l'auto-sauvegarde en bibliothèque (via `isEligibleDocumentResult`).

Migration unique, ~15 lignes SQL.

---

## 3. Options étudiées

### Option A — Étendre INTEL-020 (retenue)

| Dimension | Évaluation |
|---|---|
| Complexité | **Faible** — réutilise 90 % du workflow, du UI, de la persistance |
| Coût | **Faible** — 1 migration, 2 nouveaux templates de prompt, 1 nouveau composant UI, 1 nouveau RPC |
| Scalabilité | Bonne — le pattern intel-020 est déjà éprouvé |
| Familiarité équipe | **Maximale** — pattern rôdé Session 15 |

**Pour :** Une seule source de vérité pour la génération de contenus. Un seul callback, un seul HMAC, une seule Realtime UI. Le catalogue d'offres devient l'ancrage systématique.
**Contre :** Le workflow n8n devient un peu plus dense. Le prompt system reste raisonnable si on le splitte par channel.

### Option B — Workflow n8n dédié `intel-021-pitch`

| Dimension | Évaluation |
|---|---|
| Complexité | Moyenne — duplication de la plomberie |
| Coût | Moyen — 1 workflow entier, un second contrat callback, plus de code à maintenir |
| Scalabilité | Neutre |
| Familiarité équipe | Bonne |

**Pour :** Séparation nette, itération indépendante.
**Contre :** Dette de plomberie doublée, deux endroits à corriger quand HMAC/traçabilité évoluent, deux nœuds Crypto à re-configurer sur le VPS. **Rejetée.**

### Option C — Table dédiée `pitch_generations`

**Rejetée d'entrée.** Contredit ADR-0008 § "content_json = source unique". Recrée la dette FOLIO qu'on a fuie.

### Option D — Matching offre pgvector v1

**Rejetée en v1.** `offers.embedding` n'existe pas. L'ajouter demande : 1) une migration pgvector, 2) un job de vectorisation initial (41 offres, coût négligeable), 3) un embedding compte à construire à la volée à partir de multi-signaux (métier, secteur, missions, interactions) — ~une semaine de travail bien fait. Le matching par règles couvre 80 % des cas immédiatement. Ré-évaluer après 20+ pitches générés.

---

## 4. Analyse trade-off

- **Vitesse vs justesse d'ancrage** : le v1 par règles est rapide mais peut proposer une offre "évidente" (cross-sell le plus proche) plutôt qu'une offre "surprenante mais pertinente". Acceptable : le BM peut toujours forcer l'`offerId` via le picker.
- **Un seul workflow vs deux** : chaque nouveau channel densifie le prompt assembler. À 4-5 channels, le nœud devient un swich case ingérable — c'est le seuil au-delà duquel on splittera. Pas encore.
- **Autonomie n8n vs déterminisme SQL** : le RPC `get_pitch_context` fait le gros de la sélection. Le LLM n'a plus qu'à **rédiger**, pas à **choisir**. C'est le pattern qui rend la sortie prévisible et coach-able.
- **FOLIO few-shot vs risque de plagiat** : injecter les 1-2 pitches historiques du compte donne au ton de voix un ancrage utile. Les injecter avec la mention explicite "exemples de style à imiter, pas à copier" dans le prompt.

---

## 5. Conséquences

**Devient plus facile**
- Générer un pitch en 1 clic depuis `IntelligencePanel` (l'action `generate_pitch` est déjà câblée dans le registre, il ne reste qu'à re-router son contenu).
- Suggérer un cross-sell explicite par différence practices actives / catalogue.
- Ancrer chaque argument dans une offre du catalogue existant.

**Devient plus difficile**
- Ajouter un nouveau canal (`voice_memo`, `slide_deck`) au-delà de la 5e branche du prompt system — un refactor sera nécessaire.
- Modifier la structure du `CommunicationBrief` sans casser 3 canaux d'un coup.

**À revisiter**
- pgvector sur `offers.embedding` quand 20+ pitches auront été générés (mesure : combien de fois l'utilisateur override `offerId` proposé par les règles ? >30 % = signal fort de passer aux embeddings).
- FK `missions.practice_id → offer_practices.id` — dette actuelle qui pollue le matching cross-sell.
- Élargir `entity` du run : un pitch peut aussi être ancré sur une **opportunité** (le brief RDV d'entretien_client concerne une opp précise) — actuellement `entityType="company"`. La sig accepte déjà `opportunity`, il suffit de la câbler.

---

## 6. Doctrine — no-go's explicites

1. **Pas d'offre hors catalogue.** Le LLM ne peut pas inventer un service. Contrainte au prompt + QA `no_offer_hallucination` bloquant. Si le vrai besoin est hors catalogue → c'est une remontée au product, pas au pitch.
2. **Pas d'engagement de prix ferme.** Un pitch ne signe pas. TJM cités = "à partir de X€" ou "selon profil" tirés de la grille. QA `no_price_commitment` bloquant.
3. **Pas de calcul de score par le LLM.** Les scores conviction/investissement sont déterministes (RPC `compute_conviction_score_v1`, `compute_investment_score_v1` — Session 19 Lot 0). Le LLM peut les **commenter**, jamais les recalculer.
4. **Pas de duplication de formulaire.** `CommunicationBriefForm` reste la surface unique. Adaptation par channel via visibilité conditionnelle des champs.
5. **Pas de nouveau workflow n8n.** Extension d'INTEL-020 uniquement.
6. **Pas de nouvelle table.** `content_json` porte tout. Contrainte ADR-0008.
7. **Pas de PDF/DOCX en v1.** L'export peut attendre v2 — `meeting_briefing` s'affiche en HTML dans le drawer, copier-coller vers Notion/Google Docs suffit pour piloter les premiers RDV.

---

## 7. Optimisations recommandées (au-delà du plan minimum)

1. **Persona "shortcuts"** dans QUI : boutons "DSI banque" / "Direction métier industrie" / "RSSI mid-cap" qui préremplissent persona + tone + `mustInclude` avec un préambule d'objection typique. Zéro impact backend, gros gain UX.
2. **Une "boîte à munitions" par offre** : ajouter côté `offers` une colonne `pitch_ammo JSONB` — 3 accroches réutilisables, 3 preuves clients (anonymisées), 2 chiffres marché — servies au LLM en pré-cuisson. Meilleure convergence qualité vs regen aveugle. Chantier séparé, ~1 après-midi de contenu à écrire par offre.
3. **Feedback loop court** : ajouter à `PitchResult` deux boutons "Ça marche" / "À reformuler" qui écrivent dans `ai_intelligence_logs` avec un `feedback_reason`. Pas de traitement automatique — juste un journal exploitable pour ajuster le prompt system chaque mois. Coût dev : 30 min.
4. **Injection interactions récentes** : le prompt reçoit déjà les 3 dernières interactions. Ajouter une règle "si la dernière interaction < 15 jours et n'a pas eu de suivi, prioriser scenario `follow_up_no_reply` en pitch". Le LLM peut le suggérer dans `warnings`.
5. **Timer visuel côté UI** — la barre de progression de 30 s calibre le BM : sur un cold call, s'il lit trop vite, il perd l'interlocuteur ; trop lent, il se fait couper. C'est un vrai outil de coaching, pas du gadget.
6. **Preset "urgence signaux"** : quand le compte a un `sector_events.is_trigger_event=true` de moins de 7 jours, proposer un preset "Contact éclair" qui force `cold_call_pitch` + `direct` + `mustInclude` avec le signal. Automatisable via `applyCommunicationEntryPoint` (déjà existant).

---

## 8. Action items — plan d'exécution

Séquence proposée, chaque lot livrable indépendamment.

### Lot 0 — Schéma et types (~2 h)

- [ ] Migration `20260704xxxxxx_pitch_generation_schema.sql` :
  - `ai_intelligence_runs.run_type` CHECK : ajouter `pitch_generation`.
  - `ai_intelligence_results.result_type` CHECK : ajouter `spoken_pitch`, `meeting_briefing`.
  - `intelligence_document_type` enum : `pitch_script`, `meeting_briefing`.
- [ ] `src/lib/n8n/types.ts` : `CommunicationChannel` += `spoken_pitch_30s`/`meeting_briefing` ; `CommunicationScenario` += 3 nouveaux ; `SpokenPitchOutput` + `MeetingBriefingOutput`.
- [ ] `communication-brief-options.ts` : nouvelles entrées dans `CHANNEL_OPTIONS`/`SCENARIO_OPTIONS` + `applyCommunicationEntryPoint("account_row" | "signal_card" ...)` route vers pitch quand `context.pitchMode` présent.
- [ ] `src/lib/database.generated.ts` regénéré.

### Lot 1 — RPC hydratation (~3 h)

- [ ] Migration `20260704xxxxxx_pitch_context_rpc.sql` : `get_pitch_context(company_id, opportunity_id, mission_id, offer_id, workspace_id)`.
- [ ] Test SQL sur Voyage Privé (cross-sell Cloud), Ascoma (cross-sell Cyber), Arkopharma (prospect Data & AI/Cybersecurity).

### Lot 2 — Extension workflow n8n (~4 h)

- [ ] Ouvrir `n8n/workflows/intel-020-communication.json` (13 nœuds).
- [ ] Nœud "Hydrate Context" : brancher sur `get_pitch_context` quand `body.input.what.channel IN ('spoken_pitch_30s','meeting_briefing')`, sinon `get_communication_context` (actuel).
- [ ] Nœud "Assemble Prompt" : ajouter 2 templates `SYSTEM_PROMPT_SPOKEN_PITCH` et `SYSTEM_PROMPT_MEETING_BRIEFING` (contenu du prompt à trancher — je peux le rédiger en pair-writing lot suivant).
- [ ] Nœud "Parse & Validate" : ajouter les schémas de sortie `SpokenPitchOutput`/`MeetingBriefingOutput`.
- [ ] Nœud "Quality Check" : ajouter les 6 flags pitch.
- [ ] Fichier `intel-020-communication.SETUP.md` mis à jour avec les 2 nouveaux scénarios.

### Lot 3 — UI (~5 h)

- [ ] `PitchChannelPicker` (mockup avant `CommunicationBriefForm`).
- [ ] `OfferPicker` alimenté par un Server Action `getSuggestedOffers(companyId)` qui applique les règles § 2.4.
- [ ] `CommunicationBriefForm` : visibilité conditionnelle des champs sur `what.channel`.
- [ ] `PitchResult` (mode spoken avec timer / mode briefing en sections).
- [ ] Renommer `PitchMailDrawerContent` → `PitchDrawerContent`, brancher le picker.
- [ ] `save-as-document.ts` : étendre `mapResultTypeToDocumentType`.
- [ ] `api/n8n/callback/route.ts` : `isEligibleDocumentResult` étendu.

### Lot 4 — Test bout-en-bout (~2 h)

- [ ] Import du workflow n8n modifié sur le VPS (secret HMAC déjà configuré depuis Session 19 Lot 1).
- [ ] Test scénario 1 : cold call ACRI-ST (opportunité SAR hyperspectral en qualification) → `spoken_pitch_30s`, offre "AI, Machine Learning & MLOps" attendue.
- [ ] Test scénario 2 : RDV cross-sell Voyage Privé → `meeting_prep_cross_sell`, offre "SOC, Detection & Incident Response" ou "Cloud Migration & Application Modernization" attendues.
- [ ] Test scénario 3 : RDV découverte Arkopharma (prospect nutraceutique) → `meeting_prep_discovery`, offre "BI, Analytics & Decision Intelligence" attendue.
- [ ] QA : chaque sortie doit passer tous les flags bloquants.

**Total estimé : ~16 h de développement + 1 h test QA + 1 après-midi rédaction de contenu (préambules par persona / munitions par offre si on prend l'optimisation § 7.2).**

---

## 9bis. Addendum — architecture unifiée compte-centrée (2026-07-04, suite brainstorming)

Suite à une session de cadrage avec Guillaume, trois décisions structurantes remplacent des points ouverts du corps de l'ADR ci-dessus. Le corps du document reste la référence pour le contrat de sortie (§2.3), les QA flags (§2.6) et les no-go's (§6) — seuls l'emplacement UI, la priorité secteur/compte et le périmètre schéma changent.

### Ce qui a été tranché

1. **Le compte prime sur le secteur.** Le playbook sectoriel (prototype `PlaybookPage.tsx`, Session en cours) reste utile mais **descend en source de contexte**, pas en produit de premier plan. Il conserve ce qui bouge lentement : chaîne de valeur, cartographie concurrentielle, position de chaque compte dans la matrice, réglementation transverse au secteur. Son contenu actuel (`sector_intelligence.playbook.{personas,objections,roi_arguments,entry_points}`) **n'est pas raboté maintenant** — décision explicite (Q3) : on ajustera une fois la génération de pitch compte-centrée éprouvée en usage réel, pas avant.
2. **`generate_pitch` est la vue tactique, légère et versatile ; les Phases 4-5 du cockpit compte (roadmap + stratégie) sont l'aboutissement stratégique.** Les deux poursuivent le même but (la meilleure approche compte compte tenu des offres ESN) à deux altitudes différentes. Le pitch peut fonctionner en mode dégradé sans roadmap ; il s'enrichit quand elle existe.
3. **Le cadrage quick-win (mission de 3-6 semaines) est un objet séparé**, pas un canal de `generate_pitch` (Q2). Sa structure (livrables, jalons, budget, profils, ancrage `offer_engagement_types`/`offer_pricing_grids` fort) est trop différente d'un pitch conversationnel. Traité comme un chantier v2, hors scope immédiat.

### Découverte qui change le plan d'exécution — les emplacements existent déjà

L'audit de `ClientIntelligenceDesktopView.tsx` (fiche compte, `/prospection/accounts/[companyId]`) révèle que la barre à 6 onglets du cockpit compte réserve **déjà** les bons emplacements, vides (`ComingSoon`), avec les bonnes descriptions :

| Onglet (clé `TabKey`) | Lot | Description déjà écrite dans le code | Rôle dans l'architecture pitch |
|---|---|---|---|
| `analyses` | — | Phases 1-3 (client/secteur/process) — déjà livré | Source de contexte |
| `enjeux` | F | *"Cartographie enjeux × offres ESN"* | **Devient le matching offre↔compte (§2.4)** — la donnée que consomme le pitch |
| `scoring` | E | Score déterministe expliqué | Source de contexte (`compute_conviction_score_v1`) |
| `strategie` | H | *"Angle d'approche, messages clés, interlocuteurs prioritaires"* | **Devient le chez-soi de `generate_pitch`** — c'est littéralement sa description |
| `roadmap` | G | Phase 4 — *"prochaines actions, jalons, relances"* | Le grand frère stratégique, hors scope immédiat |

Conséquence directe : **pas de nouvel onglet "Génération" à inventer.** L'onglet `strategie` (lot H) devient la surface d'accès principale, conformément à la réponse Q1 (onglet dédié sur la fiche compte) mais sur l'emplacement qui existait déjà plutôt qu'un nouveau nom concurrent.

`getProcessStepStatus("strategie", data)` (dans `intelligence-process.ts`) est déjà écrit pour lire `data.pitches` (fallback FOLIO, `companies.metadata.pitches`) et afficher un badge "FOLIO" tant qu'aucune génération moteur n'existe. Le statut "Disponible" viendra naturellement une fois qu'un vrai résultat `commercial_pitch` existe pour le compte.

### Découverte qui réduit le Lot 0 à (presque) zéro migration

Vérification en base (`information_schema.columns`, `pg_constraint`) :

- `ai_intelligence_runs.run_type` et `ai_intelligence_results.result_type` sont des colonnes **`text` libres, sans CHECK constraint**. Seul `ai_intelligence_results.phase` a une contrainte (`BETWEEN 1 AND 10`). **Aucune migration requise** pour introduire de nouvelles valeurs de `run_type`/`result_type`.
- `intelligence_document_type` (enum) contient **déjà** `commercial_pitch` — et il est câblé bout en bout : `save-as-document.ts` (`mapResultTypeToDocumentType` reconnaît déjà `"commercial_pitch" | "pitch" | "pitch_mail"` → `commercial_pitch`), `api/n8n/callback/route.ts` (déjà dans la liste d'éligibilité auto-save), `document-display.ts`, `DocumentCard.tsx`, `DocumentMobileDetail.tsx`, `DocumentCommunicationActions.tsx`. Ce type a été anticipé et jamais nourri de contenu réel.

**Le Lot 0 de la section 8 est donc annulé** dans sa partie migration. Il ne reste que des ajouts TypeScript (types + options), sans toucher Supabase.

### Plan d'exécution révisé

- **Lot 0 (types uniquement, fait dans cette session)** : `src/lib/n8n/types.ts` — `CommunicationChannel` += `spoken_pitch_30s`/`meeting_briefing` ; `CommunicationScenario` += `cold_call_pitch`/`meeting_prep_discovery`/`meeting_prep_cross_sell` ; `CommunicationBrief.context` += `offerRef` ; nouveaux types `SpokenPitchOutput`/`MeetingBriefingOutput` (discriminés par `kind`). `communication-brief-options.ts` — nouvelles entrées `CHANNEL_OPTIONS`/`SCENARIO_OPTIONS`.
- **Lot 1 — RPC `get_pitch_context`** : inchangé par rapport au corps de l'ADR (§2.5), avec en plus la lecture de `offer_practices` déjà consommées par les missions actives (matching §2.4).
- **Lot 2 — Extension workflow n8n** : inchangé (§ Lot 2 original) — `intel-020-communication.json` branche sur `channel`, produit `result_type: "commercial_pitch"` (déjà éligible, pas de nouveau type à faire accepter côté callback).
- **Lot 3 — UI** : remplace le `ComingSoon` de l'onglet `strategie` (desktop + mobile) par : historique des générations passées pour ce compte (via `intelligence_documents` filtré `documentType=commercial_pitch` + `primary_entity_id=companyId`) + bouton "Nouvelle génération" → chooser (`PitchChannelPicker`) → `CommunicationBriefForm` adapté + `OfferPicker` + `PitchResult`. L'onglet `enjeux` (lot F) devient, dans la foulée ou en lot séparé, la vue qui expose le matching offre↔compte utilisé en contexte par le pitch — pas strictement bloquant pour livrer `strategie` en premier.
- **Lot 4 — Test bout-en-bout** : inchangé.

## 10. Ce que je n'ai pas fait (transparence)

- Je n'ai pas vérifié que **tous** les 41 offres ont bien `keywords`/`typical_deliverables` peuplés (spot-check sur 5 offres OK). À vérifier avant Lot 2 sinon le RPC renverra du vide sur certaines pratiques.
- Je n'ai pas relu le nœud "Assemble Prompt" du workflow n8n dans le détail (juste la structure) — la densité réelle du switch case pourrait me faire réviser mon "pas de nouveau workflow".
- Je n'ai pas mesuré la latence attendue : un `meeting_briefing` avec 3 arguments + 3 objections + cross-sell = ~1500 tokens de sortie contre ~600 pour un email — la QA UX devra vérifier que le Realtime UI garde l'utilisateur engagé (spinner, streaming ?).
- Je n'ai pas creusé le sujet **voix synthétique** : est-ce qu'à moyen terme le pitch 30 s doit sortir en audio ? Hors scope v1, mais influencerait la structure de `SpokenPitchOutput` (marqueurs SSML ?).
