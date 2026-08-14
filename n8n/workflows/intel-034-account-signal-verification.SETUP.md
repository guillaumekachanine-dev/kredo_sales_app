# INTEL-034 — vérification indépendante d'un signal compte

## Rôle

Ce workflow reçoit un signal `account_signals` et son compte depuis la route
`POST /api/intelligence/accounts/[companyId]/signals/[signalId]/verify`. Il
recharge le signal dans Supabase, construit deux recherches via des moteurs
distincts (Google News RSS et Bing News RSS),
écarte explicitement la source initiale (nom et domaine), puis demande à
Anthropic de conclure `confirmed`, `contradicted` ou `insufficient_evidence` à
partir des seules sources secondaires collectées.

Une confirmation sans identifiant de preuve secondaire est rétrogradée
déterministiquement en `insufficient_evidence`. Si aucune source indépendante
n'est trouvée, aucun appel LLM n'est effectué et le signal n'est pas déclaré
vérifié. Le résultat est persisté par le callback KREDO sous
`result_type='account_signal_verification'`; le statut métier du signal n'est
jamais modifié par anticipation.

## Import et configuration VPS

1. Importer `intel-034-account-signal-verification.json` dans n8n.
2. Dans `Verify Signature`, `Sign Callback` et `Sign Failure Callback`, remplacer
   `REMPLACE_PAR_TON_N8N_WEBHOOK_SECRET` par la valeur du credential déjà utilisé
   pour `N8N_WEBHOOK_SECRET` côté Vercel.
3. Vérifier les credentials existants :
   `Supabase_Service_Role_KREDO` et `Anthropic API (KREDO)`.
4. Activer le workflow. Son webhook doit être accessible à
   `{N8N_WEBHOOK_BASE_URL}/webhook/intel-034-account-signal-verification`.

Aucun secret ni URL privée n'est transmis au navigateur : la route Next signe
le payload côté serveur et le callback est lui aussi signé.

## Vérification avant activation

```bash
node scripts/build-account-signal-workflows.mjs
node n8n/workflows/__tests__/intel-034-account-signal-verification.test.js
```

Puis, sur un compte de test :

1. déclencher `Vérifier` depuis `/veille` et confirmer une seule exécution n8n ;
2. vérifier que le domaine/la source initiale n'apparaît pas dans
   `independentEvidence` ;
3. tester un signal sans résultat secondaire : verdict attendu
   `insufficient_evidence`, jamais `confirmed` ;
4. vérifier le callback signé, le passage du run à `succeeded` et la restitution
   du verdict dans l'interface.

Le JSON est livré `active: false` conformément au processus KREDO : import et
activation sur le VPS restent manuels.
