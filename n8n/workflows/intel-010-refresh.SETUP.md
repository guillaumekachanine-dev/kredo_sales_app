# INTEL-010 (Lot 1) — intel-010-refresh / account_scan : import & configuration VPS

## 1. Ce que fait ce workflow

Déclenché par webhook (path `intel-010-refresh`), ce workflow implémente la première
étape de la feature « Scan rapide compte » : à partir d'un compte KREDO déjà connu
(`entityType: "company"`), il résout l'entité juridique correspondante dans le registre
officiel français, collecte le site officiel et quelques titres de presse, sépare les
champs objectifs (issus du registre) des faits interprétatifs (issus d'une extraction LLM
contrainte), calcule une confiance déterministe, écrit `intelligence_sources` +
`enrichment_proposals` + `intelligence_source_links`, puis notifie KREDO via callback signé
avec `resultType: "account_scan"`.

**Aucune UI ne consomme ce workflow pour l'instant** (Lot 2, à venir) — ce lot livre
uniquement le backend n8n + les écritures Supabase. **Aucune recherche de contact**
(`contactMode` est toujours `"none"` en Lot 1, `contactCandidates` est toujours vide) —
ça sera le Lot 3.

## 2. Pourquoi `intel-010-refresh` n'existait pas déjà

`intel-010-refresh` figurait dans `src/lib/n8n/types.ts` (`N8nWorkflowId`) depuis les tout
premiers commits du projet, avec le commentaire `// INTEL-010 : client_intelligence_refresh`
— mais **aucune implémentation canonique n'a jamais existé** : ni fichier
`n8n/workflows/intel-010-refresh.json`, ni appelant côté Next.js, ni mention dans `docs/`.
Recherche exhaustive faite avant d'écrire ce fichier (grep sur tout le dépôt, hors
`node_modules`) — confirmé absent. Ce workflow est donc une création, pas une extension
d'un fichier existant, mais il **réutilise l'ID déjà réservé** plutôt que d'en inventer un
nouveau, conformément à la consigne du Lot 1.

Il n'y a donc **rien à régresser** côté usages historiques de cet ID — le seul « non-régression »
testé est que le routage par `input.operation` rejette proprement toute opération non
`"account_scan"` (utile le jour où `client_intelligence_refresh` ou une autre opération
viendrait s'ajouter sur ce même ID).

## 3. Import

1. n8n → **Workflows → Import from File** → `intel-010-refresh.json`.
2. Ne pas activer tout de suite (`active: false` par défaut).
3. Credentials déjà existants sur cette instance (mêmes ids que tous les autres workflows
   `intel-0xx`) :
   - Supabase : `Supabase_Service_Role_KREDO` (id `GBrm2aWU0dDf85QS`)
   - Anthropic : `Anthropic API (KREDO)` (id `MERo2FsyLlNgDQXh`)
   Si l'import affiche un credential manquant, resélectionner le credential existant du
   même nom dans chaque nœud concerné — aucun nouveau credential à créer.

## 4. Configuration requise

### 4.1 Secret HMAC (2 nœuds Crypto)

`Verify Signature` et `Sign Callback` / `Sign Failure Callback` contiennent le placeholder
`REMPLACE_PAR_TON_N8N_WEBHOOK_SECRET` — remplacer par la même valeur que
`N8N_WEBHOOK_SECRET` côté Vercel (déjà configurée pour les autres workflows `intel-0xx` /
`report-*`, copier le même secret).

### 4.2 Webhook

Le nœud `Webhook — Account Scan` doit être accessible à l'URL
`{N8N_WEBHOOK_BASE_URL}/webhook/intel-010-refresh`.

### 4.3 Aucune nouvelle variable d'environnement, aucun nouveau credential

Le registre officiel (`recherche-entreprises.api.gouv.fr`) est une API publique
data.gouv.fr / INSEE Sirene, gratuite, **sans clé** — appelée en HTTP simple, sans
credential n8n. Conforme à la consigne « pas de nouveau fournisseur payant ».

## 5. Limites assumées (à connaître avant d'activer)

- **Découverte automatique de site officiel non implémentée.** Le registre officiel
  français ne porte pas l'URL du site web d'une entreprise. Le champ `website` n'est
  proposé que si `websiteHint` est fourni explicitement en entrée (ou si le compte a déjà
  un site connu en base) — aucune recherche web n'est tentée pour le découvrir, faute de
  fournisseur de recherche déjà configuré dans KREDO (règle explicite du Lot 1 : pas de
  nouveau fournisseur payant). C'est un `warnings[]` explicite dans `AccountScanOutput`
  quand ce cas se présente.
- **`sector` et `revenue` volontairement exclus des champs proposés en V1.** Pas de mapping
  fiable NAF↔`sector_intelligence` (cf. [[folio-data-reality]] côté mémoire projet — le
  parc a une granularité sectorielle hétérogène, un mapping automatique aurait produit des
  rattachements de mauvaise qualité) ; pas de source fiable et gratuite pour le CA en accès
  libre. Le champ CRM `sector`/`revenue` reste donc uniquement modifiable par les autres
  canaux existants (curation manuelle, workflows sectoriels).
- **`employee_count` est une estimation, pas une donnée exacte.** Le registre expose une
  *tranche* d'effectif salarié (ex. "20 à 49 salariés"), pas un chiffre ponctuel — la
  proposition utilise le point médian de la tranche, avec `explicitness` réduite en
  conséquence dans le calcul de confiance (jamais présentée comme aussi fiable qu'un SIREN
  ou une raison sociale).
- **Presse via Google News RSS** (même mécanisme que `intel-033-account-watch-refresh`,
  déjà en prod) — pas de vraie API de presse payante. Reliability_score calibré en
  conséquence (0.55, contre 0.97 pour le registre officiel).
- **Extraction du site officiel = texte brut best-effort** (script/style retirés, balises
  retirées, tronqué à 6000 caractères) — pas de parsing HTML structuré, pas de rendu JS
  (les sites en SPA pure sans SSR ne donneront pas de texte exploitable ; le run n'échoue
  pas pour autant, `siteFetchFailed` est simplement vrai et les faits qui en dépendent ne
  sont pas produits).
- **Dédoublonnage best-effort, pas de verrou transactionnel.** Deux scans lancés en
  parallèle sur le même compte peuvent chacun supprimer/réinsérer les propositions
  `proposed`/`needs_review` de l'autre — accepté comme risque connu, à traiter au Lot 5
  (stabilisation / conflits concurrents) plutôt que résolu ici.
- **Aucun `PATCH` direct de `ai_intelligence_runs` vers succeeded/failed** — comme tous les
  autres workflows `intel-0xx`, ce workflow ne fait que le passage à `running` ; la
  transition finale est gérée par `/api/n8n/callback` (`updateRunStatus`) à réception du
  callback signé.

## 6. Contrat d'entrée exact attendu

```json
{
  "runId": "...",
  "workflowId": "intel-010-refresh",
  "entityType": "company",
  "entityId": "<companyId>",
  "workspaceId": "...",
  "userId": "...",
  "callbackUrl": "https://.../api/n8n/callback",
  "input": {
    "operation": "account_scan",
    "informationMode": "find",
    "contactMode": "none",
    "selectedSiren": null,
    "websiteHint": null,
    "locationHint": null,
    "autoApplyOfficialMissing": true,
    "knownCompany": { "name": "...", "legalName": null, "website": null, "siren": null, "nafCode": null, "sectorId": null },
    "requestedFields": [],
    "requestedFacts": []
  }
}
```

`requestedFields`/`requestedFacts` vides = le workflow choisit lui-même la liste complète
pertinente selon `informationMode` (`find` = champs vides uniquement, `verify` = tous).

## 7. Résolution d'entité juridique — écart documenté vs le contrat Lot 0 initial

Le contrat `AccountScanOutput` livré au Lot 0 (`src/lib/n8n/types.ts`) ne portait **aucun
champ `resolution`**, alors que le Lot 1 exige explicitement de ne jamais générer de
proposition tant que l'entité n'est pas résolue sans ambiguïté, et de retourner 2 à 5
candidats en cas d'ambiguïté. Plutôt que de contourner cette exigence de sécurité des
données (au risque d'écrire un SIREN erroné sur une fiche compte), le contrat a été
**étendu de façon additive** dans ce lot : `AccountScanResolution` / `AccountScanOutput.resolution`
+ `AccountScanTriggerInput.selectedSiren/websiteHint/locationHint/autoApplyOfficialMissing`.
Aucun champ existant n'a été retiré ni renommé — changement purement additif, `tsc --noEmit`
validé après coup, aucun autre fichier du dépôt ne consommait encore ce contrat (Lot 2 pas
commencé).

## 8. Test avant activation

1. Dans n8n, copier l'URL du webhook (mode "Listen for test event" ou après activation
   temporaire).
2. Déclencher un run de test avec un `entityId` correspondant à un compte réel dont le nom
   légal est identifiable (ex. une société bien connue) — vérifier dans **Executions** que
   le run va jusqu'au callback sans erreur.
3. Vérifier dans Supabase : `enrichment_proposals` contient de nouvelles lignes
   `status='proposed'` (ou `needs_review` si confiance < 0.45) avec `primary_source_id` non
   nul, `intelligence_sources` contient une ligne `source_type='regulatory_filing'`, et
   `intelligence_source_links` relie les deux.
4. Rejouer le même run (même compte, même `informationMode`) et vérifier qu'aucune ligne
   supplémentaire n'apparaît pour les mêmes attributs (les anciennes lignes `proposed` sont
   supprimées puis réinsérées à l'identique — comportement voulu, cf. §5 dédoublonnage).
5. Tester un compte dont le nom est ambigu (plusieurs sociétés du même nom) : vérifier que
   `ai_intelligence_results.content_json.resolution.status = "ambiguous"` avec 2 à 5
   candidats, et qu'**aucune** ligne `enrichment_proposals` n'a été créée pour ce run.
6. Tester avec `selectedSiren` renseigné directement : vérifier
   `resolution.matchMethod = "selected_siren"` et que des propositions sont bien générées
   sans repasser par le scoring de candidats.

## 9. Activation

Une fois le test §8 validé de bout en bout : activer ce workflow (toggle en haut à droite).
