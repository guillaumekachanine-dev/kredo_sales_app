# MISSION-001 — Exécuteur générique de mission d'intelligence

Workflow générique d'exécution des missions d'intelligence (ADR-0020). Il ne
contient **aucune logique métier** : il reçoit les prompts déjà assemblés et le
modèle depuis l'enveloppe Next.js (`MissionRunEnvelope`), appelle le LLM, et
reposte la réponse brute au callback. Il est importé **une seule fois** sur le
VPS et n'est plus jamais modifié (M-6).

## Contrat

- Webhook stable : `mission-001-run`
- `resultType` : `mission_report` (littéral figé, phase 1)
- Corps du callback : texte brut dans `contentJson.rawOutput`, sans `JSON.parse` ni validation côté n8n (M-2)
- Déclenchement : `POST /api/n8n/trigger`
- Payload reçu : `MissionRunEnvelope` (`src/lib/n8n/types.ts`) sous `body.input`

## Configuration avant activation

1. Importer le JSON dans n8n sans l'activer (`active: false` par défaut).
2. Remplacer le placeholder `REMPLACE_PAR_N8N_WEBHOOK_SECRET` par la valeur de
   `N8N_WEBHOOK_SECRET` dans les trois nœuds Crypto (`Verify Signature`,
   `Sign Callback`, `Sign Failure Callback`). **Un seul secret** signe les deux sens.
3. Affecter les credentials n8n aux nœuds concernés :
   - `supabaseApi` sur le nœud **"Mark Run Running"**
   - `anthropicApi` sur le nœud **"Call LLM"**
4. Tester un run manuel et vérifier la transition `queued → running → succeeded`
   ainsi que la réception du callback signé.
5. Tester le chemin d'échec (ex. enveloppe invalide ou erreur LLM) : vérifier que
   les sorties d'erreur (`onError: continueErrorOutput`) aboutissent au callback
   avec `status: "failed"`.

Le fichier est volontairement livré avec `active: false`. Aucun déploiement n8n
n'est réalisé par ce lot.
