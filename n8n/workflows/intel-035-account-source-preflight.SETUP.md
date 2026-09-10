# INTEL-035 — preflight de sources Account Intelligence

## Rôle

Ce workflow constitue le **corpus** d'une analyse Account Intelligence, **avant** que
l'analyse ne soit lancée. Il résout l'entité légale, dérive les manques à couvrir depuis
le niveau et les modules demandés, découvre des sources sur ces seuls manques, puis
**récupère et extrait réellement** chaque document retenu.

Il ne propose que ce qu'il a lu. Un document qu'il n'a pas pu récupérer figure dans le
plan avec son **motif d'échec**, pour être vu — jamais pour être analysé.

> **Le défaut qu'il corrige.** Sur les quatre runs `intel-030` V4 réussis en production
> (07/09/2026), `external_pages_fetched` valait **0**. Le nœud `V4 Fetch Selected Pages`
> tentait six requêtes parallèles à `timeout: 6000`, échouait intégralement contre
> Cloudflare et les paywalls, marquait `external_research_degraded` — et **le pipeline
> continuait**, produisant un rapport de 13 500 caractères adossé à un seul registre légal.

Le workflow **n'écrit rien en base**. Il transmet ses documents bruts dans
`sourceDocuments[]` ; c'est `ingestAccountSourcePlan()` qui écrit
`account_source_documents`, applique la frontière tenant et publie le plan canonique.
Doctrine ADR-0020 : le métier vit en TypeScript, n8n est un exécuteur.

## Contrat

**Entrée** (`POST {N8N_WEBHOOK_BASE_URL}/webhook/intel-035-account-source-preflight`)

```jsonc
{
  "runId": "uuid", "workflowId": "intel-035-account-source-preflight",
  "entityType": "company", "entityId": "uuid",
  "workspaceId": "uuid", "userId": "uuid",
  "callbackUrl": "https://…/api/n8n/callback",
  "input": {
    "targetLevel": 2,                          // 1..4, défaut 2
    "includedModules": ["competition"],        // identifiants CANONIQUES uniquement
    "additionalUrls": ["https://…/strategy.pdf"],
    "corpusIds": ["uuid"]
  }
}
```

**Sortie** — callback `result_type = "account_source_plan"`, avec `sourceDocuments[]`
hors de `contentJson`.

## Ce que le workflow garantit

| Garantie | Mécanisme |
|---|---|
| **A1** — jamais d'étude d'un homonyme | `Resolve Entity` **lève** si la résolution n'est pas `resolved`. Aucune recherche n'est lancée |
| **A4** — subsidiarité | Le registre légal est ajouté d'office comme candidat prioritaire |
| **A7** — la connaissance acquise n'est pas rachetée | Un segment documenté supprime la recherche `sector_dynamics` / `competition` / `value_chain` / `regulatory`. Un fait courant non périmé retire son module du plan |
| **Modules canoniques** | Un libellé d'interface **fait échouer l'appel**. Pas de repli silencieux sur « étude complète » — c'est la régression V3 |
| **SSRF** | Garde `parseUrl` extrait verbatim d'`intel-030` : IPv4 privées, `.local`/`.internal`, moteurs de recherche |
| **Échec explicite** | Chaque document injoignable porte un `failure_reason` lisible (403, délai dépassé, contenu trop court) |
| **G0.7** | Le callback émet `tokensInput`/`tokensOutput`/`modelUsed`, même à zéro : aucun LLM n'est appelé, ce qui est une information, pas une absence |

**Budgets par niveau** — requêtes / documents : L1 `2/3` · L2 `8/8` · L3 `10/10` · L4 `14/12`.
L1 reste volontairement léger : on ne lance pas douze recherches pour un SIREN.

## Import et configuration VPS

1. Importer `intel-035-account-source-preflight.json` dans n8n.
2. Dans `Verify Signature`, `Sign Callback` et `Sign Failure Callback`, remplacer
   `REMPLACE_PAR_TON_N8N_WEBHOOK_SECRET` par la valeur du credential déjà utilisé pour
   `N8N_WEBHOOK_SECRET` côté Vercel.
3. Vérifier les credentials existants — aucun nouveau credential n'est requis :
   `Supabase_Service_Role_KREDO` (id `GBrm2aWU0dDf85QS`) et `SerpAPI_KREDO`
   (id `4FHmaQGaAytZHN4w`).
4. Activer le workflow.

> ⚠️ **Ordre de déploiement contraignant.** L'application doit être déployée **avant**
> l'import : sans la route qui connaît `account_source_plan` et le validateur qui accepte
> `anchoring`, tout callback est rejeté en 400 et le run bascule en `failed`.

## Vérification avant activation

```bash
python3 scripts/build-intel-035.py
node n8n/workflows/__tests__/intel-035-account-source-preflight.test.js
```

Le générateur valide la syntaxe de chaque nœud Code (`node --check`) ; le harnais les
**exécute** avec des mocks — 59 assertions. Lire le compteur final, jamais le seul code
de sortie : une exception dans un nœud Code fait sauter toutes les assertions restantes.

## Régénération

Le JSON est **généré**, pas édité à la main :

```bash
python3 scripts/build-intel-035.py
```

Deux blocs sont extraits à l'exécution plutôt que dupliqués, ce qui les empêche de
diverger — et le harnais asserte cette identité :

- la résolution d'entité, depuis `scripts/entity-resolution-node.js`, elle-même
  transcrite de `src/lib/intelligence/entity-resolution.ts` (source de vérité, testée) ;
- le garde SSRF `parseUrl`, depuis le nœud `V4 Fetch Selected Pages` d'`intel-030`.

Toute évolution de la résolution d'entité se fait **dans le TypeScript d'abord**, puis
dans la transcription partagée, puis on rejoue les générateurs.

## Limites connues de la V1

- **Corpus** : `corpusIds` est accepté et transmis, mais les items ne sont pas encore
  chargés depuis `source_corpus_items` — le nœud `Fetch Documents` sait déjà les traiter
  (`data.corpusItems`), il manque le nœud de lecture. Le contrat n'a pas à changer.
- **Un seul essai par document.** Pas de retry, pas de rendu JavaScript. Une page rendue
  côté client sort en `unreachable` avec le motif « contenu trop court ». C'est le poste
  où un service tiers de récupération (Bright Data, Firecrawl, Jina Reader) changerait la
  donne, et c'est le prochain arbitrage à trancher si G0.2 n'est pas atteinte.
- **`source_catalog` n'est pas encore consulté** pour proposer les sources d'autorité
  connues du workspace. Le catalogue est aujourd'hui orienté veille RSS (62 sources, 58
  jamais sondées, aucun `usage_scope` Account Intelligence) : l'y brancher demande
  d'abord de lui donner ce scope.
