# Spécification Technique — Workflow n8n : Veille Spécifique Compte (INTEL-033-account-watch-refresh)

Ce document décrit en détail l'architecture, la configuration et le comportement du workflow n8n chargé d'exécuter la veille client ciblée sur un compte. Il est directement exploitable pour la création du workflow sur le VPS n8n.

---

## 1. Objectif Fonctionnel
* **Surveiller** activement les comptes prioritaires définis dans KREDO selon les paramètres personnalisés (sources officielles, presse, marchés publics, offres d'emploi, etc.).
* **Détecter** les événements ou opportunités business pertinents (signaux d'achat, mouvements clés).
* **Alimenter** de manière structurée les tables de base de données Supabase `intelligence_sources`, `account_signals` et `intelligence_source_links` pour stockage et restitution dans le cockpit client.

---

## 2. Déclencheurs (Triggers)
Le workflow peut être initié par deux canaux d'entrée distincts :
1. **Appel manuel (Web-Hook API)** : Déclenché par l'action "Mettre à jour maintenant" depuis l'UI KREDO (route `/api/intelligence/accounts/[companyId]/watch-refresh`).
2. **Cron Scheduler (Automatique)** : Un trigger temporel configuré dans n8n (par exemple, chaque jour à 04:00) qui identifie les comptes avec une veille active dont la cadence est échue, et lance le processus en boucle.

---

## 3. Payload Entrant (Webhook POST)
Le webhook de réception attend le schéma JSON suivant :
```json
{
  "runId": "uuid-du-run-kredo",
  "workspaceId": "uuid-du-workspace",
  "companyId": "uuid-du-compte",
  "userId": "uuid-de-l-utilisateur-declencheur",
  "triggerMode": "manual",
  "watchLevel": "priority",
  "settings": {
    "isEnabled": true,
    "watchLevel": "priority",
    "cadence": "daily",
    "includeOfficialSite": true,
    "includeNews": true,
    "includeJobs": true,
    "includePublicRecords": true,
    "includeTenders": true,
    "includeSocialManual": false,
    "queryAliases": ["Nom Entreprise", "Filiale A"]
  },
  "callbackUrl": "https://kredo.app/api/n8n/callback"
}
```

---

## 4. Description Node par Node

### [Node 01] **Webhook Receive**
* **Type** : Webhook (n8n Core)
* **Configuration** :
  * HTTP Method : `POST`
  * Path : `intel-033-account-watch-refresh`
  * Authentication : `Header Auth` (clé secrète partagée)

### [Node 02] **Validate Payload**
* **Type** : Code (JavaScript)
* **Description** : Vérifie la présence des paramètres requis (`runId`, `companyId`, `workspaceId`, `settings`). Si une clé essentielle manque, lance une exception pour orienter vers le Error Handler.

### [Node 03] **Supabase: Update Run status -> Running**
* **Type** : Supabase Node (ou HTTP Request calling REST API)
* **Description** : Met à jour la table `ai_intelligence_runs` pour indiquer au front KREDO que le run a démarré.
  * `status` = `'running'`
  * `started_at` = `now()`

### [Node 04] **Supabase: Load Company Details**
* **Type** : Supabase Node
* **Description** : Récupère les données clés du compte (`name`, `website`, `sector`, `description`, `metadata`).

### [Node 05] **Supabase: Load Watch Settings**
* **Type** : Supabase Node
* **Description** : Charge les derniers paramètres enregistrés de la table `account_watch_settings` pour double vérification.

### [Node 06] **Supabase: Load Recent Signals**
* **Type** : Supabase Node
* **Description** : Récupère les signaux récemment validés ou écartés sur ce compte pour éviter les doublons fonctionnels en aval.

### [Node 07] **Build Targeted Queries**
* **Type** : Code (JavaScript)
* **Description** : Génère des requêtes de recherche spécifiques en combinant le nom de l'entreprise, ses alias (`settings.queryAliases`) et des mots-clés sectoriels (ex: *"nom_compte recruitment"*, *"nom_compte reorganise"*).

### [Node 08] **Router: Check Settings Options**
* **Type** : Switch / Router
* **Description** : Embranche les flux de collecte selon les booléens de `settings`.

### [Node 09a] **Collect Official Site & Newsroom**
* **Type** : HTTP Request / Scraper
* **Description** : Analyse la page d'actualités/presse du site officiel du compte (si `includeOfficialSite` est vrai) via une requête HTTP ou un parser RSS.

### [Node 09b] **Collect Careers & Job Boards**
* **Type** : HTTP Request / API Google Jobs API or Similar
* **Description** : Recherche les dernières offres d'emploi ouvertes (si `includeNews` est vrai) pour détecter des tensions de recrutement ou de nouvelles compétences recherchées.

### [Node 09c] **Collect News Media**
* **Type** : HTTP Request (NewsAPI ou équivalent RSS de presse)
* **Description** : Recherche des mentions du compte dans les médias nationaux et sectoriels.

### [Node 09d] **Collect Public Records**
* **Type** : HTTP Request (API d'annonces légales, ex: Pappers/Bodacc)
* **Description** : Récupère les modifications statutaires ou financières publiées légalement.

### [Node 09e] **Collect Tenders**
* **Type** : HTTP Request (BOAMP / APIs marchés publics)
* **Description** : Récupère les attributions ou appels d'offres récents.

### [Node 10] **Normalize Items**
* **Type** : Code (JavaScript)
* **Description** : Agrège et uniformise toutes les données collectées dans un schéma commun contenant le titre, la description, la date de publication et l'URL source.

### [Node 11] **Deduplicate Items**
* **Type** : Code (JavaScript)
* **Description** : Compare les éléments collectés avec l'historique et élimine les doublons stricts (par URL ou par similarité de titre).

### [Node 12] **LLM Batch Qualification**
* **Type** : OpenAI / Anthropic Node (LLM-chain)
* **Description** : Envoie les éléments normalisés en batch au LLM. Le prompt qualifie chaque élément selon la taxonomie et calcule des scores initiaux.
* **Format attendu en sortie** : Un tableau d'objets JSON contenant la catégorie de signal, le résumé, et une justification.

### [Node 13] **Supabase: Upsert intelligence_sources**
* **Type** : Supabase Node
* **Description** : Insère ou met à jour les sources de preuves collectées.

### [Node 14] **Supabase: Upsert account_signals**
* **Type** : Supabase Node
* **Description** : Insère les signaux dans `account_signals` avec `primary_source_id` référençant le Node 13.

### [Node 15] **Supabase: Insert intelligence_source_links**
* **Type** : Supabase Node
* **Description** : Lie les signaux et les sources de manière explicite dans la table de pivot.

### [Node 16] **Supabase: Update watch settings**
* **Type** : Supabase Node
* **Description** : Enregistre le succès du run dans `account_watch_settings` (`last_status = 'succeeded'`, `last_run_at = now()`).

### [Node 17] **Callback KREDO**
* **Type** : HTTP Request
* **Description** : Envoie une requête POST signée HMAC au `callbackUrl` KREDO pour notifier de la réussite et actualiser l'interface utilisateur.

### [Node 18] **Error Handler**
* **Type** : n8n Error Trigger
* **Description** : En cas de défaillance à n'importe quelle étape, met à jour `ai_intelligence_runs` (`status = 'failed'`), logue l'erreur dans `account_watch_settings.last_error`, et envoie le callback à KREDO pour débloquer l'état de chargement dans le client.

---

## 5. Taxonomie V1 des Signaux
Le LLM de qualification [Node 12] doit catégoriser les signaux détectés selon la taxonomie exclusive suivante :
* **`leadership_change`** : Nomination ou départ de décideurs clés (C-Level, DSI, Directeurs Métiers).
* **`growth_event`** : Levée de fonds, fusion-acquisition, expansion géographique ou signature de contrat majeur.
* **`it_transformation`** : Lancement d'un grand projet informatique, migration Cloud, refonte ERP ou projet Data/IA.
* **`cyber_risk`** : Incident de sécurité publique, fuite de données ou audit réglementaire critique.
* **`regulatory_window`** : Date limite de conformité à une nouvelle réglementation européenne ou nationale.
* **`public_tender`** : Publication d'un marché public d'assistance technique ou d'intégration.
* **`hiring_signal`** : Campagne massive de recrutement sur des technologies ou expertises cibles de KREDO.
* **`market_pressure`** : Baisse de rentabilité, restructuration ou plan de sauvegarde de l'emploi (PSE).
* **`partnership_or_vendor`** : Partenariat technologique stratégique ou remplacement d'un prestataire concurrent.
* **`weak_signal`** : Fait divers, rumeur de marché ou communication institutionnelle d'intérêt secondaire.

---

## 6. Moteur de Scoring V1
Les scores de chaque signal doivent être calculés selon la pondération des critères suivants par le LLM ou par un script de post-processing :
1. **Pertinence ESN (35 %)** : Alignement du sujet avec le modèle d'une ESN (régie, forfait, conseil technologique).
2. **Fraîcheur (20 %)** : Âge du signal (1.0 pour moins de 48h, décroissant jusqu'à 0.0 au-delà de 30 jours).
3. **Urgence (20 %)** : Présence d'un calendrier strict ou d'une échéance imminente.
4. **Fit Practice KREDO (15 %)** : Corrélation avec les offres actives de KREDO (Cloud, Data, Dev, Cyber).
5. **Fiabilité Source (10 %)** : Fiabilité intrinsèque du site émetteur (ex: BOAMP = 1.0, site média généraliste = 0.6).

Le score global calculé est stocké sous forme décimale comprise entre `0.000` et `1.000`.

---

## 7. Format des Sorties vers Supabase

### Table `intelligence_sources`
* `source_type` : `'news_media'`, `'official_site'`, `'job_board'`, `'public_tender'`, ou `'professional_profile'`
* `collection_method` : `'api'` ou `'scrape'`
* `reliability_score` : Entre 0.0 et 1.0.

### Table `account_signals`
* `status` : `'new'` (prêt à être analysé par l'humain).
* `global_score`, `urgency_score`, `confidence_score` renseignés avec la note pondérée.
* `detected_at` : Timestamp de la capture.
* `expires_at` : `detected_at + 60 jours` (ou date de fin de l'offre d'emploi/marché public).

### Table `intelligence_source_links`
* `object_type` : `'signal'`
* `link_role` : `'supporting'`

---

## 8. Règles de Sécurité
* **Service Role Key** : Les requêtes d'écriture et de lecture émises par n8n vers la base de données Supabase s'exécutent avec le rôle `service_role` (bypass RLS) pour permettre des opérations en masse sans jeton utilisateur persistant.
* **Signature Callback** : Toutes les requêtes HTTP de callback émises vers KREDO doivent inclure une signature HMAC-SHA256 dans l'en-tête `x-n8n-signature` calculée sur le corps du payload pour éviter les injections malveillantes.
* **Zéro Secret Front-End** : KREDO n'effectue aucun appel direct aux API tierces. Toute l'authentification et les secrets API (clés de recherche, tokens) résident uniquement dans les variables d'environnement du VPS n8n.
* **LinkedIn/X Guardrail** : Aucun scraping direct ou authentifié n'est réalisé sur LinkedIn ou X afin d'éviter le blocage d'adresses IP ou la suspension de comptes de test. Les sources d'informations de profils se cantonnent exclusivement aux données indexées publiquement ou saisies manuellement.

---

## 9. Règles de Qualité des Données
* **Lien de Preuve Obligatoire** : Tout signal enregistré dans la table `account_signals` doit obligatoirement être rattaché à une source valide existante dans `intelligence_sources` via la clé `primary_source_id`.
* **Curation Précise (Pas d'Hallucination)** : Le LLM ne doit pas inventer de données financières ou statistiques qui ne figurent pas explicitement dans l'extrait de source normalisé.
* **Statut de Doute** : Si un signal présente un score de confiance inférieur à 0.40, son statut est défini sur `'needs_review'` pour modération humaine au lieu de `'new'`.
* **Aucun Automatisme Commercial** : KREDO ne déclenche aucun envoi automatique d'email ou de message à ce stade. Tout signal qualifié sert d'aide à la décision pour le commercial.

---

## 10. Traitement des Cas d'Erreur & Remédiation
* **Source Inaccessible (404/500/Timeout)** : Passer à la source suivante sans interrompre le workflow. Enregistrer l'avertissement dans les logs internes.
* **Aucun Signal Trouvé** : Si la collecte ne produit aucun fait saillant, le run se termine avec un statut `'succeeded'` mais n'enregistre aucune ligne. Le cockpit KREDO affichera simplement "0 signaux".
* **Timeout LLM** : Si le node LLM ne répond pas dans les 45 secondes, couper la connexion, marquer le run comme `'failed'`, et notifier KREDO avec le motif de l'échec.
* **Échec du Callback KREDO** : n8n retentera d'émettre le callback jusqu'à 3 fois avec un intervalle d'attente exponentiel. Au-delà, l'erreur est consignée dans les logs n8n.
* **Source trop bruyante** : Si une source génère plus de 20 signaux en un seul run, le workflow applique un filtre de pertinence plus strict et ne conserve que les 5 signaux ayant le score global le plus élevé pour éviter la pollution de l'interface.
