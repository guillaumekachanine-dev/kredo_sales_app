# INTEL-030 — Audit ciblé des secrets et credentials

Date de l’audit : 4 août 2026

Périmètre : matériaux n8n du chantier Intelligence, documentation et scripts associés, fichiers suivis par Git et historique Git pertinent.

Méthode : inspection statique, manuelle, non destructive. Aucune valeur n’a été reproduite, testée ou envoyée à un service distant.

## Conclusion

Le workflow de référence versionné `n8n/workflows/intel-030-account-knowledge.json` ne contient pas de secret complet : ses trois nœuds Crypto utilisent un placeholder et les accès fournisseurs doivent être configurés par le credential store n8n.

En revanche, les pièces historiques ou exportées hors dépôt contiennent plusieurs valeurs sensibles inline. Elles ne doivent pas être copiées dans Git en l’état. Une ancienne clé Supabase `service_role` a également été committée puis retirée du fichier courant ; elle doit être considérée comme compromise puisque l’historique Git la conserve.

## Matériaux inspectés

- workflow canonique : `n8n/workflows/intel-030-account-knowledge.json` ;
- variante historique : `n8n/wokflows_patchs/intel-030-account-knowledge.json` ;
- export INTEL-030 joint, hors dépôt ;
- export FOLIO « Phase 1 — FOLIO APP », hors dépôt ;
- export FOLIO « Phase 2 — Étude sectorielle », hors dépôt ;
- documentation et harnais de test associés à INTEL-030 ;
- documentation n8n et scripts suivis par Git susceptibles de manipuler des secrets ;
- historique Git recherché par motifs non secrets et formes génériques de credentials.

## Vérification du socle GitHub

- Le dépôt connecté est `guillaumekachanine-dev/kredo_sales_app`, public, non archivé, avec `main` comme branche par défaut.
- L’URL du dépôt connecté correspond à l’origin du checkout local.
- Les jalons récents utiles ont été retrouvés sur `main` : socle des contrats Intelligence (`3534d9db`), correctif du socle (`d8291961`), AccountKnowledge V2 sourcé et déclenchement de mise à jour (`90a08082`), correctifs INTEL-030 (`c5ec046c`, `5472f02a`), affichage V2 (`e2602bae`) et suivi Realtime unifié (`126f7a95`).
- Le workflow canonique est celui suivi dans `n8n/workflows/`; le dossier `n8n/wokflows_patchs/` conserve des variantes historiques et ne définit pas la référence déployable.

## Référence canonique et statut du patch

| Élément | Statut | Écarts utiles |
|---|---|---|
| `n8n/workflows/intel-030-account-knowledge.json` | Référence canonique | 30 nœuds, contrat AccountKnowledge V2, collecte externe ciblée, catalogue de sources, résolution des `source_refs`, contrôle qualité et propositions d’enrichissement. Les secrets HMAC sont des placeholders dans le fichier Git. |
| `n8n/wokflows_patchs/intel-030-account-knowledge.json` | Variante historique, non canonique | 15 nœuds, contrat V1, sans collecte externe ciblée, catalogue de sources ni cycle de propositions. Les 15 nœuds communs ont évolué dans la version canonique. |
| export INTEL-030 joint | Copie d’exploitation, non publiable en l’état | Même topologie de 30 nœuds que la référence, avec références de credentials n8n et secret HMAC inline. Il ne doit pas remplacer le fichier canonique dans Git. |

## Constats publiables

### SEC-INTEL030-001 — Secret HMAC inline dans l’export INTEL-030 joint

- Nature : secret partagé de signature et de vérification des callbacks n8n.
- Fichier ou workflow : export INTEL-030 joint hors dépôt.
- Zone : nœuds `Verify Signature`, `Sign Callback` et `Sign Failure Callback`, paramètre secret des nœuds Crypto.
- Statut : actif probable, car la pièce présente la topologie de la version d’exploitation et des credentials n8n configurés.
- Action recommandée : faire tourner manuellement le secret partagé côté n8n et application, reconfigurer les trois nœuds, puis produire un export expurgé contenant uniquement un placeholder ou une référence autorisée. Ne jamais committer cette pièce en l’état.

### SEC-FOLIO-001 — Clés API fournisseur inline dans les deux exports FOLIO

- Nature : clés API du fournisseur LLM.
- Fichiers ou workflows : exports historiques FOLIO Phase 1 et Phase 2.
- Zone : nœuds `LLM enrichissement client` et `LLM Analyse sectorielle`, header d’authentification du fournisseur.
- Statut : indéterminé ; les formats sont ceux de clés réelles, mais aucune tentative de validation n’a été effectuée.
- Action recommandée : révoquer ou faire tourner les clés auprès du fournisseur, vérifier les journaux d’usage depuis leur date de création, puis conserver uniquement des exports expurgés utilisant le credential store n8n.

### SEC-FOLIO-002 — Secret de callback inline dans la Phase 1 FOLIO

- Nature : secret statique de callback n8n/FOLIO.
- Fichier ou workflow : export historique FOLIO Phase 1.
- Zone : nœud `POST Résultat FOLIO`, header `x-n8n-secret`.
- Statut : indéterminé ; le workflow est qualifié d’historique et la validité du endpoint n’a pas été testée.
- Action recommandée : si le endpoint existe encore, faire tourner le secret et retirer l’ancien côté récepteur ; dans tous les cas, créer une copie expurgée avant tout partage ou archivage dans Git.

### SEC-HISTORY-001 — Ancienne clé Supabase `service_role` dans Git

- Nature : clé Supabase privilégiée `service_role`.
- Fichier : `scripts/audit-data.mjs`.
- Zone : affectation locale nommée comme clé de service Supabase.
- Statut : ancien mais compromis. Introduction au commit `70864a00d31a3d89ca08419f693bb9a6e68b21b0`, retrait au commit `934a2e1aba860c202dc3617af92c5e3468f2f390`.
- Action recommandée : faire tourner ou révoquer immédiatement la clé concernée et vérifier les journaux Supabase. La suppression du fichier courant ne suffit pas, car la valeur reste récupérable dans l’historique. Une éventuelle réécriture d’historique doit être décidée séparément, après rotation, avec coordination de l’équipe ; aucun `git filter-repo`, BFG ou force-push n’a été exécuté.

### SEC-N8N-REF-001 — Références de credentials n8n sans valeur exportée

- Nature : références internes à des credentials PostgreSQL, Gmail OAuth, Supabase et fournisseur LLM.
- Fichiers ou workflows : deux exports FOLIO et export INTEL-030 joint.
- Zone : propriétés `credentials` des nœuds concernés.
- Statut : références uniquement ; aucune valeur secrète correspondante n’est incluse dans ces propriétés.
- Action recommandée : conserver le credential store n8n comme mécanisme d’injection et éviter d’exposer inutilement les identifiants internes de credentials dans les copies destinées à un dépôt public.

## Résultat de l’inspection du dépôt courant

- Aucun motif de clé fournisseur complète n’a été trouvé dans les fichiers actuellement suivis par Git.
- Aucun Bearer token statique complet ni JWT complet n’a été trouvé dans l’état courant.
- Aucune URL suivie par Git ne contient un paramètre de token évident.
- Les workflows n8n suivis utilisent des placeholders, des variables d’environnement ou des références de credentials ; aucun credential complet inline n’a été identifié dans leur état courant.
- `.gitignore` couvre déjà les fichiers `.env*`, les clés PEM et les états d’authentification locaux. Aucune règle supplémentaire n’est nécessaire pour ce lot. Ignorer tous les exports n8n serait inadapté puisque certains sont volontairement versionnés ; la protection doit donc reposer sur l’expurgation avant commit.

## Actions manuelles requises

1. Faire tourner le secret HMAC de l’export INTEL-030 et synchroniser manuellement n8n avec l’application.
2. Révoquer ou faire tourner la ou les clés fournisseur présentes dans les deux exports FOLIO.
3. Faire tourner le secret de callback FOLIO Phase 1 si le endpoint est encore utilisé.
4. Faire tourner la clé Supabase `service_role` historiquement committée et examiner les journaux d’accès.
5. Produire des copies expurgées des trois exports joints avant partage ou archivage dans un dépôt.
6. Décider séparément, après rotation, si l’historique Git public doit être réécrit. Une réécriture réduit l’exposition résiduelle mais ne rend pas une clé déjà publiée de nouveau sûre.

## Règle de conservation

Un export n8n destiné au dépôt ne doit jamais contenir une clé, un token, un mot de passe, un secret de callback ou un header d’authentification statique. Il doit utiliser un placeholder explicite, une variable d’environnement autorisée ou une référence au credential store n8n, et faire l’objet d’une relecture expurgée avant commit.

## Limites

- Aucune valeur n’a été testée ; le statut actif ou révoqué ne peut donc pas être confirmé.
- Aucun credential n8n distant n’a été lu ou modifié.
- Aucun service distant n’a été reconfiguré.
- Aucun historique Git n’a été réécrit.
