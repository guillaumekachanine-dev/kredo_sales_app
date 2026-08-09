# Contrats Techniques Workflows n8n - Cockpit Intelligence

Ce document décrit les contrats techniques, les structures de données (payloads) et l'architecture cible pour l'externalisation des traitements longs d'intelligence commerciale du Cockpit Intelligence vers la plateforme de workflow n8n.

---

## 1. Vue d'ensemble

Les traitements d'intelligence artificielle longs du Cockpit Intelligence (scraping, requêtes LLM, génération de synthèse et de campagnes) ne doivent pas être exécutés directement au sein des fonctions Next.js pour éviter les timeouts Vercel (limite à 10-15s sur l'offre Hobby/Pro). Ils sont déportés de manière asynchrone sur n8n.

### Principes d'architecture :
- **Orchestration Next.js :** Le serveur Next.js sert de passerelle d'API courte (validation d'identité, auth utilisateur, vérification RLS Supabase et émission de requêtes HTTP POST sécurisées vers n8n).
- **Exécution n8n :** n8n exécute de manière asynchrone les workflows longs et réinjecte le résultat directement dans la base de données Supabase.
- **Source de vérité :** Supabase reste la source de vérité absolue. Les composants UI de Kredo consultent les données depuis Supabase (en polling court ou temps réel) après le déclenchement d'une action.
- **Sécurité client :** L'application cliente (navigateur) ne doit **jamais** appeler directement les webhooks n8n pour des raisons d'exposition de secrets et d'usurpation d'identité.

---

## 2. Workflows cibles

Le Cockpit s'articule autour de 4 workflows cibles :

### A. client_intelligence_refresh
- **Déclenché par :** L'action rapide **"Mettre à jour les données"** (Desktop et Mobile).
- **Objectif :** Lancer la collecte de signaux faibles, l'analyse de l'actualité du compte, le scan de nouveaux contacts, et mettre à jour le score IA.

### B. intel-020-communication (ex-pitch_mail_generation — voir INTEL-020-REDACTION-ASSISTEE-V1.md)
- **Déclenché par :** Le drawer **"Rédaction assistée"** (`PitchMailDrawerContent`), soumission du brief QUOI/QUI/COMMENT/CONTEXTE.
- **Objectif :** Produire un message commercial (Email, invitation LinkedIn, message LinkedIn ou note interne) contextualisé, sur l'un des 8 scénarios du cycle commercial ESN. Contrat détaillé, prompts par scénario et architecture des 13 nœuds n8n : `INTEL-020-REDACTION-ASSISTEE-V1.md` + `n8n/workflows/intel-020-communication.json`.
- **Payload réel (CORE-001)** : passe par le contrat générique `N8nTriggerPayload` (`src/lib/n8n/types.ts`) — `input` porte l'objet `CommunicationBrief`, pas le format `form`/`context` ci-dessous (obsolète, conservé pour mémoire historique) :

### C. client_summary_generation
- **Déclenché par :** Le drawer **"Synthèse client"** (soumission du formulaire).
- **Objectif :** Compiler et rédiger une fiche de synthèse exécutive, un mémo compte ou une fiche commerciale à partir des données de veille consolidées.

### D. campaign_creation
- **Déclenché par :** Le drawer **"Créer une campagne"** (soumission du formulaire).
- **Objectif :** Générer une séquence de prospection multi-canal personnalisée ciblant l'entreprise avec des directives spécifiques.

---

## 3. Contrats de Payload (Next.js → n8n)

Voici les spécifications précises des objets JSON que la passerelle Next.js transmettra aux webhooks d'entrée de n8n.

### A. client_intelligence_refresh
```json
{
  "companyId": "uuid-company-1234",
  "companyName": "Nom de l'Entreprise",
  "userId": "uuid-user-5678",
  "source": "kredo-client-intelligence",
  "requestedAt": "2026-06-12T15:30:00.000Z"
}
```

### B. pitch_mail_generation
```json
{
  "companyId": "uuid-company-1234",
  "userId": "uuid-user-5678",
  "action": "pitch_draft",
  "form": {
    "messageType": "email",
    "objective": "first_contact",
    "tone": "direct",
    "targetContactId": "uuid-contact-9999",
    "additionalContext": "Insister sur notre expertise cloud et DevOps."
  },
  "context": {
    "companyName": "Nom de l'Entreprise",
    "sector": "Services Numériques",
    "aiScore": 8.5,
    "contactsCount": 4,
    "hasClientAnalysis": "engine",
    "hasSectorAnalysis": "engine",
    "signalsCount": 3,
    "pitchesCount": 1
  }
}
```

### C. client_summary_generation
```json
{
  "companyId": "uuid-company-1234",
  "userId": "uuid-user-5678",
  "action": "client_summary",
  "form": {
    "format": "executive_brief",
    "includeSectorAnalysis": true,
    "includeSignals": true,
    "includeContacts": true,
    "includePitches": true,
    "additionalInstructions": "Mettre l'accent sur les enjeux de cybersécurité."
  },
  "context": {
    "companyName": "Nom de l'Entreprise",
    "sector": "Services Numériques",
    "aiScore": 8.5,
    "contactsCount": 4,
    "hasClientAnalysis": "engine",
    "hasSectorAnalysis": "engine",
    "signalsCount": 3,
    "pitchesCount": 1,
    "hasRoadmap": true
  }
}
```

### D. campaign_creation
```json
{
  "companyId": "uuid-company-1234",
  "userId": "uuid-user-5678",
  "action": "campaign_generation",
  "form": {
    "campaignName": "Campagne prospection - Nom de l'Entreprise",
    "channels": {
      "email": true,
      "linkedin": true,
      "phone": false
    },
    "additionalInstructions": "Cibler en priorité les profils DSI."
  },
  "context": {
    "companyName": "Nom de l'Entreprise",
    "sector": "Services Numériques",
    "contactsCount": 4
  }
}
```

---

## 4. Réponses attendues de n8n

Les webhooks n8n doivent répondre immédiatement avec un accusé de réception afin d'éviter tout timeout.

### A. Succès (Prise en charge asynchrone / File d'attente)
*Code de statut HTTP : `202 Accepted`*
```json
{
  "ok": true,
  "workflowRunId": "n8n-run-abc-123",
  "status": "queued"
}
```

### B. Succès synchrone (Uniquement si le traitement est < 5 secondes)
*Code de statut HTTP : `200 OK`*
```json
{
  "ok": true,
  "workflowRunId": "n8n-run-xyz-789",
  "status": "completed",
  "resultId": "uuid-result-999"
}
```

### C. Erreur
*Code de statut HTTP : `400 Bad Request` ou `500 Internal Server Error`*
```json
{
  "ok": false,
  "error": "Impossible d'initier le workflow n8n : token invalide ou erreur LLM."
}
```

---

## 5. Variables d'environnement futures

Les variables d'environnement suivantes devront être configurées dans le fichier `.env.local` et sur Vercel :

```bash
# Webhooks de production n8n
N8N_CLIENT_INTELLIGENCE_REFRESH_WEBHOOK_URL=
N8N_PITCH_MAIL_GENERATION_WEBHOOK_URL=
N8N_CLIENT_SUMMARY_GENERATION_WEBHOOK_URL=
N8N_CAMPAIGN_CREATION_WEBHOOK_URL=

# Jeton d'autorisation optionnel pour sécuriser l'appel Next.js -> n8n
N8N_API_BEARER_TOKEN=
```

> [!WARNING]
> Ces variables d'environnement ne doivent **pas** être préfixées par `NEXT_PUBLIC_` sous peine d'être exposées dans le build JavaScript envoyé au navigateur client.

---

## 6. Routes API futures

Ces routes d'API Next.js serviront de passerelles de sécurité et seront implémentées dans `src/app/api/intelligence/...` :

- `POST /api/intelligence/accounts/[companyId]/refresh`
- `POST /api/intelligence/accounts/[companyId]/pitch`
- `POST /api/intelligence/accounts/[companyId]/summary`
- `POST /api/intelligence/accounts/[companyId]/campaign`

### Spécifications communes de sécurité :
1. **Authentification obligatoire :** Extraction et validation de la session utilisateur Supabase via `createServerClient`.
2. **Autorisations RLS :** Requête préalable dans la table `companies` avec le rôle utilisateur pour s'assurer qu'il a le droit d'accéder aux données de `companyId`.
3. **Appel en arrière-plan :** Requête `fetch` HTTP POST vers la variable `N8N_..._WEBHOOK_URL` correspondante avec un Bearer Token d'authentification.
4. **Non-blocant :** Timeout configuré bas (max 3-5 secondes) pour l'appel n8n. Réponse renvoyée à l'UI sous forme de statut `202 Accepted`.

---

## 7. Persistance Supabase future

Lors de la finalisation des traitements par n8n, les résultats devront être persistés dans les tables Supabase existantes ou créées pour l'occasion.

### Intégration sur les tables existantes :
- **`ai_intelligence_results`** : Contient déjà les résultats d'analyses IA. Il est recommandé de stocker les pitchs, synthèses et campagnes ici en utilisant la colonne `result_type` (ex: `pitch_draft`, `client_summary`, `marketing_campaign`).
- **`ai_intelligence_runs`** : Utilisée pour suivre l'historique des exécutions du moteur IA.
- **`v_ai_intelligence_summary`** : Vue de synthèse à mettre à jour si nécessaire.

### Tables additionnelles envisageables :
Si la structure de données des campagnes ou des pitchs devient trop complexe pour un simple stockage JSON dans `ai_intelligence_results` :
- `commercial_campaigns` : Stockage des en-têtes de campagne.
- `commercial_campaign_steps` : Séquences d'étapes (Email J+0, LinkedIn J+2, Relance J+5).

---

## 8. Sécurité

Pour préserver l'intégrité de la plateforme Kredo, les garde-fous de sécurité suivants doivent être respectés :
- **Aucun webhook exposé :** n8n ne doit accepter de requêtes que depuis l'adresse IP du serveur Next.js ou via la présence du header `Authorization: Bearer <token>`.
- **Règles RLS Supabase :** n8n effectuera ses écritures avec un rôle privilégié (`service_role`), mais le déclenchement initial doit impérativement être validé sous le contexte utilisateur dans la route d'API.
- **Minimisation des données dans les logs :** Ne pas loguer les données sensibles des clients ou les clés d'API dans la console Next.js ou dans l'historique d'exécution de n8n.
- **Sanitisation des instructions utilisateur :** Les invites libres insérées par les utilisateurs dans les formulaires (ex: `additionalContext`, `additionalInstructions`) doivent être échappées pour éviter des injections de prompts (Prompt Injection) dans les workflows LLM n8n.

---

## 9. Ordre recommandé d'implémentation future

Pour simplifier les phases de test, il est conseillé de brancher les modules dans l'ordre suivant :

1. **Socle & Refresh :**
   - Configurer le workflow n8n minimal pour `client_intelligence_refresh`.
   - Écrire la route API `POST /api/intelligence/accounts/[companyId]/refresh`.
   - Brancher l'action rapide "Mettre à jour" de l'UI Kredo sur cette route API.
2. **Module Pitch/Mail (Unitaire) :**
   - Créer le workflow de génération de message dans n8n.
   - Écrire la route API `/api/intelligence/accounts/[companyId]/pitch`.
   - Câbler l'UI du tiroir Pitch et ajouter la persistance de l'output.
3. **Module Synthèse (Consolidation) :**
   - Implémenter le workflow de synthèse d'informations dans n8n.
   - Câbler la route et l'UI associée.
4. **Module Campagne (Multi-canal) :**
   - Implémenter le workflow de création de campagne séquentielle.
   - Câbler la route et l'UI associée.
