# ADR-0012 — Cockpit Intelligence : de l'espace documentaire à la chaîne de décision commerciale

**Statut :** Proposé
**Date :** 2026-07-07
**Décideurs :** Guillaume (Owner)
**Liés :** [0007](ADR-0007-moteur-intelligence-commerciale.md) (moteur `ai_intelligence_*`), [0008](ADR-0008-client-intelligence-hub.md) (surface hub par compte), [0009](ADR-0009-generate-pitch.md) (génération de pitch), ADR-0011 (Score de Priorité Commerciale — non filé, en transcript). **Supersede partiellement** la taxonomie d'onglets d'ADR-0008 (§3) sans toucher à son socle data.

> Ce document est le cadre directeur du chantier le plus structurant de KREDO. Il tranche la **taxonomie décisionnelle** du cockpit, acte les **contrats de données**, fixe l'**architecture n8n + coûts**, et pose un **plan d'action séquencé en 8 lots**. Il s'appuie sur un audit live (Supabase + code) réalisé le 2026-07-07, dont les chiffres corrigent plusieurs hypothèses de la note de défrichage ChatGPT.

---

## 1. Contexte

### 1.1 Le vrai problème n'est pas le contenu, c'est la taxonomie

Le cockpit intelligence (`/prospection/accounts/[companyId]`) est **robuste techniquement** (moteur 0007, callback HMAC, Realtime, documents, scoring déterministe) mais **flou conceptuellement**. L'onglet « Analyses » agrège trois couches qui n'ont ni la même granularité, ni le même cycle de vie, ni la même finalité : ce qu'on sait du **compte**, du **secteur**, et des **process**. Cette confusion dilue l'information et empêche la décision — qui est le but ultime. Diagnostic partagé avec ChatGPT, validé.

Le risque n'est donc **pas de mal exécuter un workflow. C'est de bien exécuter une mauvaise taxonomie.**

### 1.2 État réel des étapes (code vérifié — `intelligence-process.ts`)

Les onglets actuels sont `accueil · analyses · enjeux · scoring · strategie · roadmap`.

| Étape | État réel vérifié |
|---|---|
| Analyses | Disponible, mais fourre-tout (compte + secteur + diagnostic) |
| Enjeux | **Placeholder** — jamais implémenté |
| Scoring | Étape de nav, alors qu'ADR-0011 en a fait une capacité **transverse** (badge + modale, moteur déterministe) |
| Stratégie | Partiel — génère des pitchs (ADR-0009), pas d'atelier enjeux↔offres |
| Roadmap | **Placeholder** — jamais implémenté |

### 1.3 Audit live des assets et lacunes (Supabase, 2026-07-07)

**Ce qu'on a vraiment (assets) :**

| Asset | Volume | Qualité |
|---|---|---|
| FOLIO `analysis_data` (compte) | **93 / 95 comptes** | 5 clés : `identite`, `positionnement`, `signaux`, `contexte_sectoriel`, `synthese_consultant`. **Sans source, import unique du 2026-06-09** |
| FOLIO `sector_analysis` (marché) | **81 comptes** | 7 clés : marché, segments, acteurs, chaîne de valeur, normatif, concurrence, synthèse |
| FOLIO `pitches` | 24 comptes | Legacy, lecture seule |
| `account_signals` | **735 lignes / 93 comptes** | Backfill ADR-0011 Lot 1 — **bon asset, exploitable immédiatement** |
| Catalogue offres | **41 offres · 8 practices · 120 lignes grille tarifaire** | Solide, déjà exploité par `get_pitch_context` |
| Relationnel propre | **644 contacts · 90 interactions · 16 opps (15 comptes) · 19 missions** | Vérité KREDO, haute confiance |
| Plomberie n8n | trigger → HMAC → callback → results → Realtime | Prouvée 3× (intel-020 : 27 succès ; report-* ; pitch : 6) |
| Scoring déterministe | 6 runs | ADR-0011 Lots 0-4 livrés |

**Lacunes préjudiciables (chiffrées) :**

| Lacune | Réalité terrain | Gravité |
|---|---|---|
| **Rattachement sectoriel** | **14 / 95 comptes** ont un `sector_id`. Seulement **3 `sector_intelligence`** structurés | 🔴 **Bloquant** — l'étape 2 est morte pour 85 % du parc |
| **Diagnostic process** | **N'existe PAS dans FOLIO.** 15 comptes ont un résultat moteur phase 3, mais **4 seulement** sont réellement structurés (cartographie/frictions/feuille de route) ; 3 ont la matrice d'impact ; 2 les interlocuteurs. Les 11 autres = un bloc `synthese` texte | 🟠 Ce n'est **pas un corpus**, c'est un prototype à 4 comptes |
| **Couche de preuve** | FOLIO est une **boîte noire sans URL ni date de fait**, déjà vieille d'un mois et qui se périme | 🔴 Mine la promesse « chaque info a une source » |
| **Champ `phase` pollué** | phase 1 héberge des **rapports** (`client_summary`, `activity_commercial`, `weekly_manager`), pas de l'analyse compte | 🟠 `phase` inexploitable — `result_type` est la vraie clé |
| **Runs zombies** | **~10 runs** `queued`/`running` bloqués depuis le 01-02/07 | 🟠 Faussent l'UI de fraîcheur, aucune reprise |
| **Étapes décisionnelles** | Enjeux = 0, Roadmap = 0, Stratégie = pitchs seulement | 🔴 Le cœur de valeur n'existe pas encore |
| **Contexte relationnel mince** | ~80 % des comptes sans opportunité ni mission | 🟠 Limite la richesse de la connaissance compte hors FOLIO |

---

## 2. Critique — l'existant ET la note ChatGPT

### 2.1 Ce que ChatGPT a juste (et que je valide)

1. **La bascule mentale** : cesser de penser « études IA » pour penser **chaîne de transformation** `Faits → Compréhension → Enjeux → Angles → Actions`. C'est le bon cadre.
2. **La séquence cible en 5 étapes** : Connaissance compte → Intelligence sectorielle → Cartographie des enjeux → Stratégie commerciale → Roadmap commerciale.
3. **Scoring hors du processus** (ADR-0011 l'a déjà acté) + veille, rédaction, synthèse, campagne = **transverses**.
4. **Secteur mutualisé** : un compte *consomme* l'intelligence sectorielle, il ne la duplique pas. Fin du doublon « étude sectorielle FOLIO » vs « approche sectorielle KREDO ».
5. **Roadmap = draft avant matérialisation** : l'IA propose, le manager valide, KREDO matérialise.

### 2.2 Là où ChatGPT s'appuie sur des hypothèses que le terrain contredit

**C-1 — La décomposition du « diagnostic process » repose sur un corpus fantôme.**
ChatGPT consacre une table entière à « éclater le diagnostic process » (interlocuteurs → connaissance compte, frictions → enjeux, ROI → stratégie…). **Mais ce diagnostic n'existe que pour 4 comptes réellement structurés.** On ne décompose pas ce qui n'existe pas. Conséquence directe (voir décision D-2) : le diagnostic devient une **action d'enrichissement premium à la demande**, pas le carburant de l'étape 1.

**C-2 — L'« evidence ledger » est présenté comme acquis, alors que la donnée de base est sans source.**
« Chaque information a une source » est le différenciateur central. Mais FOLIO est un import sans provenance. **On ne peut pas rétro-attribuer une source à une boîte noire.** ChatGPT n'adresse pas cette contradiction. Ma réponse (D-3) : rendre la **confiance honnête et visible** via un enum de provenance, plutôt que de simuler des sources.

**C-3 — La boucle de curation humaine est limitée à la roadmap.**
ChatGPT ne met le garde-fou humain qu'à la dernière étape. Or un **fait faux en connaissance compte empoisonne tout l'aval** (enjeux → stratégie → tâches réelles dans l'agenda). La curation doit exister **à chaque étape** (D-4). C'est précisément ce qui rend KREDO « meilleur qu'un CRM » : la boucle homme-machine, pas le volume de texte.

**C-4 — « Aucune table nouvelle » est vrai pour les artefacts, faux pour la colonne vertébrale.**
Garder les analyses en `content_json` (ADR-0008) est juste : ce sont des documents lus en bloc. Mais les **enjeux** et les **actions de roadmap** sont des **entités opérationnelles à cycle de vie** (ouvert/écarté/converti ; à faire/fait/reprogrammé), *mutées individuellement* et *requêtées transversalement* (brief hebdo « top enjeux du portefeuille », scoring, cockpit global). Un blob JSON ne se filtre pas, ne se joint pas, ne se met pas à jour ligne à ligne. → D-5 : normaliser la **spine** (issues + roadmap actions), garder les analyses en JSON. ADR-0011 a déjà créé ce précédent (`account_score_runs`/`components` normalisés).

**C-5 — La dimension financière est totalement absente.** Guillaume l'a explicitement demandée. Un refresh complet = 3-4 appels LLM lourds × jusqu'à 95 comptes. FOLIO se périme. ChatGPT ne dit rien du budget tokens, du refresh incrémental, du tiering de modèle, ni de ce qui doit rester déterministe (donc gratuit). → D-6.

**C-6 — « Un seul workflow paramétré par targetStage » va créer un monstre branchu.** Les étapes ont des formes trop différentes (déterministe vs LLM vs recherche multi-étapes). → D-7 : workflows fins **par étape** partageant le squelette éprouvé, + deux étapes **100 % déterministes sans workflow**.

---

## 3. Décision

### D-1 — Le nouveau processus (colonne vertébrale)

Le Cockpit Intelligence devient une chaîne de **5 étapes ordonnées**, chacune produisant un livrable qui nourrit la suivante :

```
1. Connaissance compte  →  2. Intelligence sectorielle  →  3. Cartographie des enjeux
        →  4. Stratégie commerciale  →  5. Roadmap commerciale
```

**Capacités transverses** (orbitent, ne sont pas des étapes) : **Scoring** (badge header, ADR-0011), **Veille & signaux**, **Rédaction assistée** (ADR-0009/INTEL-020), **Synthèse compte** (report-account-summary), **Campagne**.

Règle de séparation qui tranche tous les cas limites :
> **Une étape est un maillon de la chaîne de décision par compte.** Une capacité transverse est un outil réutilisable qui peut être invoqué à tout moment, indépendamment de l'avancement de la chaîne.

### D-2 — Le diagnostic process est repositionné en enrichissement premium, pas en fondation

`account_knowledge` (étape 1) se construit **d'abord sur le relationnel propre KREDO** (contacts, interactions, opps, missions, `account_signals`) — haute confiance — **puis** sur FOLIO `analysis_data` en complément basse confiance. Le **diagnostic process** (cartographie interlocuteurs, frictions, goulots) devient une **action d'approfondissement à la demande** (« Lancer un audit process »), générée par compte quand le commercial en a besoin, et qui **alimente rétroactivement** connaissance compte + enjeux. On ne bloque pas l'étape 1 sur un asset qui n'existe que pour 4 comptes.

### D-3 — Provenance explicite plutôt que fausse traçabilité

Chaque fait/enjeu/mapping porte un champ `provenance` :

| Valeur | Sens | Confiance |
|---|---|---|
| `relational` | Issu de la base KREDO (contact, opp, mission, interaction) | Haute |
| `human_verified` | Saisi/confirmé par le manager | Haute |
| `engine_researched` | Recherche n8n avec **URL + date** | Moyenne-haute |
| `folio_legacy` | Import FOLIO 2026-06-09, sans source | **Basse — affichée comme telle** |
| `inferred` | Déduction LLM non sourcée | Basse |

L'UI ne présente **jamais** un fait `folio_legacy` ou `inferred` comme une vérité moteur. La confiance devient un **signal de premier plan**, honnête. C'est le vrai différenciateur : pas « plus de texte », mais « du texte dont on connaît la fiabilité ».

### D-4 — Boucle de curation à chaque étape

Dès l'étape 1, le manager peut, sur chaque item : **confirmer** (→ `human_verified`), **corriger**, **écarter**, **épingler**. Ces actions sont des mutations légères (pas de re-génération LLM) et remontent la confiance de l'aval. C'est la mécanique qui transforme une génération jetable en **base de connaissance qui s'améliore**.

### D-5 — Ligne de partage data : artefacts en JSON, entités opérationnelles normalisées

| Nature | Stockage | Exemples |
|---|---|---|
| **Artefact de génération** (lu en bloc, régénéré d'un coup) | `ai_intelligence_results.content_json` + `result_type` + `content_json.schema_version` | `account_knowledge`, `sector_snapshot`, `commercial_strategy`, `commercial_pitch` |
| **Entité opérationnelle** (mutée ligne à ligne, requêtée cross-compte, cycle de vie) | **Table normalisée dédiée** | `account_issues` (enjeux), `account_roadmap_actions` |

Critère de tri, sans ambiguïté : *« le manager mute-t-il des lignes individuelles ET d'autres modules requêtent-ils transversalement ? »* → Oui = table. Non = JSON. Cela **respecte ADR-0008** (les analyses restent en `content_json`) tout en modélisant correctement la spine décisionnelle — cohérent avec le précédent ADR-0011.

Nouveaux `result_type` (le champ `phase`, pollué, est **déprécié comme clé fonctionnelle** ; conservé pour compat) :
`account_knowledge` · `sector_snapshot` · `commercial_strategy` · `commercial_pitch` (existe) · `commercial_roadmap` (draft avant normalisation).

### D-6 — Économie : incrémental, déterministe par défaut, LLM en dernier recours

1. **Deux étapes restent 100 % déterministes (coût zéro token)** : l'**intelligence sectorielle** (contextualisation = lecture des tables `sector_*` + jointure compte, en TypeScript) et le **scoring** (ADR-0011, déjà déterministe). Seules **connaissance compte, enjeux, stratégie, roadmap** appellent un LLM.
2. **Refresh incrémental, jamais « tout régénérer »** : chaque étape a une fraîcheur propre. Un événement d'entrée (nouvelle interaction, nouvelle opp, signal, MAJ secteur) marque l'aval **`stale`** (dirty-flag) sans le régénérer. Le manager régénère à la demande, étape par étape.
3. **Tiering de modèle** : Haiku pour l'extraction/normalisation, Sonnet réservé au raisonnement (priorisation d'enjeux, stratégie). Réduction directe de la facture.
4. **Télémétrie budget** : `ai_intelligence_logs` (déjà là) trace coût/tokens par run. Garde-fou de budget mensuel visible.

### D-7 — n8n : workflows fins par étape, deux étapes sans workflow

- **Étapes LLM (4 workflows fins)** : `intel-030-account-knowledge`, `intel-031-issues-map`, `intel-032-strategy`, `intel-033-roadmap-draft`. Chacun réutilise le squelette prouvé `Webhook → HMAC → Hydrate(RPC dédiée) → LLM → QA → Callback signé`, avec son propre modèle/prompt/coût.
- **Étapes déterministes (0 workflow)** : sector snapshot + scoring = code TypeScript + RPC.
- **Orchestrateur** : *pas maintenant*. On ajoute un thin `intel-039-refresh-all` (qui appelle les sous-workflows en séquence) **seulement si** le besoin « rafraîchir tout en un clic » se confirme à l'usage. On évite le monstre branchu.
- **Hygiène** : `ops-004-run-recovery` (cron) — `queued > 15 min` ou `running > 30 min` → `failed_timeout` + bouton « relancer ». À faire dès le Lot 0 (les 10 zombies actuels polluent déjà l'UI).

### D-8 — Le rattachement sectoriel est un préalable bloquant, pas un « à côté »

Backfill `sector_id` sur les 81 comptes porteurs de `sector_analysis` (matching sur le libellé secteur → `sector_intelligence.slug`, création des fiches secteur manquantes). Sans ce lot, l'étape 2 et l'aval sectoriel des enjeux sont morts pour 85 % du parc. **Placé en Lot 0.**

---

## 4. Définition fonctionnelle des 5 étapes

> Format par étape : **Question métier · Entrées · Livrable · Stockage · Rendu Desktop/Mobile · Nourrit**. Les listes de sous-champs reprennent le cadrage ChatGPT là où il est bon, corrigées des découvertes d'audit.

### Étape 1 — Connaissance compte  *(livrable : Account Knowledge Base)*

- **Question :** « Qui est ce compte, comment fonctionne-t-il, qui compte vraiment, que sait-on **factuellement**, et où sont les zones d'incertitude ? »
- **Entrées :** relationnel KREDO (contacts + rôles/pouvoir, interactions, opps, missions) `relational` ; `account_signals` (735 dispo) ; FOLIO `analysis_data` `folio_legacy` ; diagnostic process **si généré** `engine_researched`. **Exclut** : macro-sectoriel, reco d'offres, roadmap, scoring.
- **Livrable :** dossier structuré en blocs — identité & positionnement · relation commerciale (chaleur, dernières actions) · **carte des interlocuteurs** (groupés rôle/pouvoir/relation) · organisation & process observés (si diagnostic) · frictions/signaux propres au compte · **hypothèses à valider** · **evidence/provenance ledger**. Pas de « méga-fiche » illisible : blocs factuels courts, chacun tagué de sa provenance.
- **Stockage :** `content_json` (`result_type=account_knowledge`, `schema_version`). Curation → mutations légères (D-4).
- **Desktop :** vue dense 6 blocs. **Mobile :** « Ce compte en 30 s » · 3 contacts à travailler · 3 faits utiles avant RDV · zones floues.
- **Nourrit :** enjeux, scoring, rédaction, synthèse, roadmap.

### Étape 2 — Intelligence sectorielle  *(déterministe, mutualisée)*

- **Question :** « Quelles contraintes et opportunités viennent du **secteur**, et comment KREDO s'y positionne ? »
- **Entrées :** `sector_intelligence` + `sector_pain_points` (22) + `sector_regulatory_items` (13) + `sector_events` + `sector_news`, **joints au compte via `sector_id`**. Aucune donnée compte-spécifique non prouvée.
- **Livrable :** **snapshot contextualisé** = lecture du secteur du compte (pain points triés par fréquence, calendrier réglementaire, fenêtres commerciales ouvertes, playbook consultable, comptes exposés). **Généré en TypeScript, pas par LLM** (coût zéro). Un `sector_snapshot` léger optionnel n'est produit que si le secteur a bougé.
- **Stockage :** vérité dans les tables `sector_*` (mutualisée). Le compte n'en stocke qu'une référence.
- **Desktop :** vue analytique secteur + playbook. **Mobile :** fenêtre commerciale active · pain point dominant · échéance réglementaire la plus urgente · angle conseillé.
- **Nourrit :** enjeux, stratégie, pitchs, campagnes, scoring (facteur secondaire).

### Étape 3 — Cartographie des enjeux  *(la spine décisionnelle — table normalisée)*

- **Question :** « Quels enjeux réels/probables, lesquels comptent vraiment, lesquels sont **actionnables par KREDO**, et avec quel **niveau de preuve** ? »
- **Entrées :** connaissance compte + intelligence sectorielle + diagnostic (si présent) + signaux + contacts + opps + échéances réglementaires + catalogue offres (**uniquement pour taguer l'actionnabilité**, pas encore pour vendre).
- **Structure d'un enjeu (`account_issues`) :** `title` · `category` (business/IT/data/cloud/cyber/delivery/regulatory/people) · `problem_statement` · `evidence_level` (observed/inferred/weak) · `provenance` + `source_refs` · notes 1-5 : `importance`/`urgency`/`criticality`/`business_impact`/`accessibility`/`kredo_fit` · `decision_contacts` · `recommended_next_probe` (question à poser en RDV) · `status` (open/dismissed/converted).
- **Livrable :** matrice importance × urgence · Top 3 · backlog triable/filtrable · questions de qualification · hypothèses faibles **marquées**.
- **Stockage :** **table `account_issues`** (D-5). Génération LLM → lignes ; curation manager → mutations ; feed scoring (composant C3/signaux) et roadmap.
- **Desktop :** matrice + tableau triable, colonnes « preuve » et « actionnabilité KREDO ». **Mobile :** top 3 · question à poser · contact à viser · offre probablement pertinente.
- **Nourrit :** stratégie, roadmap, rédaction, campagnes, scoring.

### Étape 4 — Stratégie commerciale  *(atelier / boîte de munitions)*

- **Question :** « Comment transformer les enjeux en **discours, offres et séquences** crédibles ? »
- **Entrées :** enjeux priorisés + catalogue offres + practices + playbook sectoriel + contacts + historique + pitchs déjà générés + objections + contraintes compte. Fondation déjà là : `get_pitch_context` (ADR-0009) fait déjà le matching offre↔compte.
- **Livrable :** **matrice enjeu ↔ offre ↔ persona ↔ preuve** · offres prioritaires par enjeu/contact · 2-4 angles d'approche · messages clés par persona · objections/réponses · **bibliothèque de pitchs du compte** (déjà branchée : `intelligence_documents` type `commercial_pitch`) · fiche de préparation RDV. Reprise du **playbook sectoriel** consultable ici (pas seulement dans l'approche sectorielle).
- **Stockage :** `content_json` (`commercial_strategy`) + pitchs en `intelligence_documents` (existant).
- **Desktop :** atelier commercial — matrice, playbook, biblio pitchs, boutons « générer pitch »/« préparer RDV »/« transformer en roadmap ». **Mobile :** angle recommandé · pitch 30 s · objection probable · réponse courte · copier.
- **Nourrit :** rédaction, roadmap, campagne, rapports, proposition commerciale future.

### Étape 5 — Roadmap commerciale  *(exécution — draft puis matérialisation gated)*

- **Question :** « Que fait-on concrètement, dans quel ordre, avec qui, quand, avec quel objectif mesurable ? »
- **Entrées :** stratégie + enjeux + contacts + agenda + capacité.
- **Livrable :** plan 30/60/90 j · actions proposées (`account_roadmap_actions`, status draft) · événements agenda proposés · campagne proposée + KPIs · rappels IA (cron ultérieur). **Rôle « coach »** : cadencement, objectifs d'appels/RDV/leads/offres présentées.
- **Stockage :** **table `account_roadmap_actions`** (D-5) pour le draft ; **matérialisation** = écriture dans `tasks` + `calendar_events` **uniquement après validation manager** (D-4, jamais automatique).
- **Desktop :** timeline + kanban actions + statut validation + « matérialiser »/« lancer campagne ». **Mobile :** prochaine meilleure action · actions du jour · contact à appeler · message prêt · « fait / reprogrammer ».
- **Nourrit :** `tasks`, `calendar_events`, `opportunities` (si validé), campagnes, notifications, cockpit global.

### Table de synthèse

| Étape | Question | Sortie | LLM ? | Stockage |
|---|---|---|---|---|
| 1. Connaissance compte | Que sait-on vraiment ? | Dossier sourcé | Oui (Haiku+Sonnet) | JSON |
| 2. Intelligence sectorielle | Que dit le secteur ? | Snapshot + fenêtres | **Non (déterministe)** | Tables `sector_*` |
| 3. Cartographie enjeux | Qu'est-ce qui compte ? | Matrice priorisée | Oui (Sonnet) | **Table `account_issues`** |
| 4. Stratégie | Que vendre, à qui ? | Angles/offres/pitchs | Oui (Sonnet) | JSON + documents |
| 5. Roadmap | Qu'est-ce qu'on fait ? | Plan validable | Oui (Sonnet) | **Table `account_roadmap_actions`** → tasks/agenda |

---

## 5. Architecture cible (data + n8n + UX)

### 5.1 Data
- **Artefacts** : `ai_intelligence_results.content_json` + nouveaux `result_type` + `schema_version` (D-5). `phase` déprécié comme clé.
- **Spine** : 2 tables normalisées `account_issues`, `account_roadmap_actions` (RLS workspace standard, provenance, status, source_refs jsonb, triggers `set_updated_at`/`log_audit`).
- **Provenance** : enum partagé (D-3), porté par chaque item.
- **RPC d'hydratation par étape** (pattern KREDO éprouvé : `get_pitch_context`, `get_account_summary_facts`, `get_account_score_context`) : `get_account_knowledge_context`, `get_issues_map_context`, etc.

### 5.2 n8n (D-7)
4 workflows fins LLM + 2 étapes déterministes + `ops-004-run-recovery`. Squelette commun réutilisé. HMAC déjà configuré côté VPS (depuis Session 19).

### 5.3 UX
Onglets desktop : **Accueil · Connaissance compte · Intelligence sectorielle · Enjeux · Stratégie · Roadmap**. Scoring sort des onglets → badge header (ADR-0011, déjà fait). Mobile : timeline verticale conservée, **sans scoring comme étape**, orientée action (résumé 30 s · top 3 enjeux · angle · prochaine action · boutons). Le point d'entrée « Lancer/actualiser » (aujourd'hui un simple message local, non câblé) devient un **déclencheur par étape**.

---

## 6. Plan d'action séquencé (8 lots)

> Re-séquencé vs ChatGPT : les préalables bloquants (sector_id, hygiène runs) passent en Lot 0 ; la matérialisation agenda (plus haut risque) est isolée en Lot 7.

| Lot | Objet | Durée | Dépend de | Risque |
|---|---|---|---|---|
| **0 — Assainissement & préalables** | Renommer la taxonomie (onglets + `INTELLIGENCE_PROCESS_STEPS`), sortir Scoring des étapes ; **`ops-004-run-recovery`** + purge des 10 zombies ; **backfill `sector_id`** (81 comptes) + création fiches `sector_intelligence` manquantes. Zéro LLM. | 1-1,5 j | — | Faible |
| **1 — Contrats & provenance** | Types TS des 5 artefacts + enum `provenance` + `schema_version` ; adapter `getClientIntelligence()` (lire `result_type`, garder fallback FOLIO) ; migration des 2 tables spine (vides). | 1,5-2 j | 0 | Faible |
| **2 — Connaissance compte V1 + curation** | RPC `get_account_knowledge_context` (relational-first) ; workflow `intel-030` ; onglet Connaissance compte desktop/mobile ; **couche curation** (confirmer/corriger/écarter/épingler). Diagnostic = action d'enrichissement optionnelle. | 4-5 j | 1 | Moyen |
| **3 — Intelligence sectorielle unifiée** | Contextualisation **déterministe** (TS) des tables `sector_*` par compte ; onglet + fenêtres commerciales ; suppression du doublon étude sectorielle FOLIO ↔ approche sectorielle. | 3-4 j | 0, 2 | Moyen |
| **4 — Cartographie des enjeux (spine)** | Table `account_issues` + RPC + workflow `intel-031` ; matrice + top 3 + backlog + curation ; **feed scoring** (C3). Première vraie couche décisionnelle. | 5-7 j | 2, 3 | Élevé |
| **5 — Stratégie commerciale** | Matrice enjeux↔offres (sur `get_pitch_context`) + playbook + biblio pitchs + objections + prépa RDV ; workflow `intel-032`. | 5-7 j | 4 | Élevé |
| **6 — Roadmap draft (read-only)** | Table `account_roadmap_actions` + workflow `intel-033` ; timeline/kanban ; **aucune écriture** dans tasks/agenda. | 4-5 j | 5 | Moyen |
| **7 — Matérialisation & campagne (gated)** | Validation manager → écriture `tasks`/`calendar_events`/`opportunities` ; campagne + KPIs + rappels cron. **Écriture dans l'agenda réel = classe de risque à part.** | 5-8 j | 6 | **Très élevé** |

**Chemin critique :** 0 → 1 → 2 → 4 (enjeux) est la colonne vertébrale de valeur. L'étape 3 (sectorielle) peut se paralléliser après le Lot 0. Total indicatif : **~30-40 jours-homme**, itérations d'ajustement incluses.

---

## 7. Conséquences

**Devient plus facile :** décider (info segmentée, sourcée, priorisée) ; auditer la fiabilité (provenance visible) ; brancher les modules transverses (scoring lit les enjeux, weekly brief lit le top portefeuille) ; maîtriser le coût (déterministe par défaut, incrémental).

**Devient plus difficile :** discipline des contrats `content_json` + `schema_version` (versionner sérieusement) ; maintenir la cohérence enum provenance sur toute la chaîne ; le Lot 7 (écriture agenda) exige un garde-fou UX solide.

**À revisiter :** normalisation éventuelle de `commercial_strategy` si le besoin de requêtes cross-compte émerge (V2) ; orchestrateur `intel-039` si « refresh tout » se confirme ; passage des snapshots sectoriels à une génération LLM si le déterministe montre ses limites.

---

## 8. Recommandation finale

Guillaume — trois convictions, dans l'ordre d'importance.

**1. Le différenciateur n'est pas l'IA, c'est la traçabilité honnête + la boucle de curation.** Un LLM générique produit du texte plausible. KREDO gagne en produisant du texte **dont on connaît la source et la fiabilité**, et qui **s'améliore quand le manager le corrige**. C'est pour ça que la provenance (D-3) et la curation à chaque étape (D-4) ne sont pas des détails : ce sont le produit. Ne les repousse pas en « plus tard ».

**2. Construis la spine avant les extrémités.** La valeur compound se joue au milieu (enjeux → stratégie), là où tes données propriétaires (offres, secteur, signaux) battent un LLM générique. Les extrémités sont les pièges : l'étape 1 hérite d'un FOLIO périmé et sans source (traite-la comme un point de départ basse confiance, pas comme une vérité) ; l'étape 7 écrit dans ton agenda réel (garbage-in amplifié en tâches réelles — c'est pourquoi elle est isolée, en dernier, et hard-gated).

**3. Discipline économique dès le premier jour.** Deux étapes restent gratuites (déterministes). Le refresh est incrémental, jamais massif. Le modèle est tieré. `ai_intelligence_logs` te donne le compteur. Sans cette discipline, un parc de 95 comptes × 4 stages LLM devient une facture que tu regarderas avec regret.

**Le geste d'ouverture, à faire cette semaine :** le **Lot 0**. Il ne coûte aucun token, règle immédiatement le flou conceptuel (renommage), nettoie les 10 runs zombies qui mentent à l'UI, et débloque 85 % du parc (backfill `sector_id`). C'est le socle sur lequel tout le reste tient. On attaque par là.

En selle. 🤠
