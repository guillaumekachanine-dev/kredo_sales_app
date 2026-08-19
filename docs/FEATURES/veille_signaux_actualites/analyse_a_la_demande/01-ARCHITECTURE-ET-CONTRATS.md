# 01 — Architecture et contrats

## 1. Principe d'architecture

La feature s'insère dans l'architecture existante :

`UI Veille → /api/n8n/trigger → run Supabase → INTEL-021 → callback signé → ai_intelligence_results → intelligence_documents → UI`.

Il ne faut pas créer de seconde passerelle, de nouveau moteur n8n ni de nouvelle couche de persistance.

## 2. Existant à préserver

### Front

- `VeilleActualitesDesktop.tsx` porte l'expérience Desktop et la section d'analyse stratégique.
- `VeilleActualitesMobile.tsx` distribue les quatre onglets Mobile.
- `mobile/VeilleAnalysesTab.tsx` porte la lecture des analyses sur mobile.
- `CompanyDocumentsModal.tsx` fournit une référence visuelle/navigation utile, mais sa logique métier n'est pas réutilisable telle quelle.
- `IntelligenceSplitModalShell.tsx` est la primitive de shell Desktop à privilégier.

### Trigger / n8n

- `/api/n8n/trigger` est l'unique passerelle de lancement applicative.
- `intel-021-monthly-watch-analysis` sait déjà : valider le webhook, passer le run à `running`, hydrater Supabase, assembler le prompt, appeler le LLM, valider la sortie et effectuer le callback signé.
- Le contrat actuel `MonthlyWatchAnalysisInput` et la sortie `MonthlyWatchAnalysisOutput` constituent la V1 historique à préserver.

### Documents

- Le callback sauvegarde les résultats éligibles dans `ai_intelligence_results` puis les matérialise dans `intelligence_documents`.
- `saveResultAsDocumentWithSupabaseClient()` applique aujourd'hui un traitement spécial à `strategic_watch_analysis` via la RPC `upsert_strategic_watch_document` afin de versionner une analyse mensuelle par période.

## 3. État Supabase vérifié au cadrage

Le projet `jvzgmhvwirsbdkjpmvla` contient déjà toutes les tables nécessaires :

- `veille_digests`
- `veille_articles`
- `account_signals`
- `intelligence_documents`
- `content_collections`
- `content_collection_items`
- `ai_intelligence_runs`
- `ai_intelligence_results`

L'enum `intelligence_document_type` contient déjà `strategic_watch_analysis`.

La fonction `public.upsert_strategic_watch_document(...)` existe déjà.

**Conclusion : aucune migration Supabase n'est requise pour le cœur de la V1.** Toute proposition de DDL doit être considérée comme un écart d'architecture et justifiée avant exécution.

## 4. Contrat d'entrée V2 cible

```ts
export type WatchAnalysisSource =
  | {
      kind: "digest"
      digestId: string
      articleIds?: string[]
    }
  | {
      kind: "account_signals"
      signalIds: string[]
    }
  | {
      kind: "intelligence_documents"
      documentIds: string[]
    }
  | {
      kind: "knowledge_collection"
      collectionId: string
    }

export type WatchAnalysisInputV2 = {
  schemaVersion: 2
  triggerMode: "manual_custom"
  intention: string
  sources: WatchAnalysisSource[] // 1 à 3 groupes
  requestedAt: string
}
```

Règles :

- `sources.length` compris entre 1 et 3 ;
- un groupe ne doit pas être vide ;
- `intention` trimée et non vide ;
- aucune donnée métier complète dans le payload navigateur ;
- aucune confiance accordée aux IDs sans relecture serveur.

## 5. Résolution serveur des sources

Créer un résolveur dédié, léger, qui reçoit un client Supabase authentifié et le `workspaceId` résolu depuis la session.

Responsabilités :

1. valider la forme du contrat ;
2. vérifier que chaque référence est lisible par l'utilisateur ;
3. pour un digest, vérifier le digest et, si `articleIds` est fourni, que chaque article appartient à ce digest ;
4. pour les signaux, vérifier les IDs via le client RLS ;
5. pour les documents, vérifier les IDs via le client RLS ;
6. pour une Liste/Corpus, réutiliser `resolveKnowledgeScope()` à partir du seul `collectionId` ;
7. développer les collections en références canoniques `veille_article` / `intelligence_document` ;
8. dédupliquer les références ;
9. retourner un objet normalisé sans copier le contenu métier.

Le contenu textuel reste hydraté dans n8n au lot L2.

## 6. Contrat normalisé cible entre serveur et n8n

Le détail exact peut être ajusté en L0, mais le contrat doit distinguer la sélection utilisateur de la liste de références résolues.

Exemple :

```ts
export type WatchAnalysisResolvedRef =
  | { kind: "veille_digest"; id: string; articleIds?: string[] }
  | { kind: "veille_article"; id: string }
  | { kind: "account_signal"; id: string }
  | { kind: "intelligence_document"; id: string }

export type ResolvedWatchAnalysisSources = {
  refs: WatchAnalysisResolvedRef[]
  stats: {
    sourceGroups: number
    resolvedRefs: number
  }
}
```

Ne pas introduire de DSL de corpus générique : ce chantier a seulement quatre familles connues.

## 7. INTEL-021 V2

Le workflow existant doit accepter deux chemins :

- `schemaVersion: 1` → comportement mensuel actuel strictement inchangé ;
- `schemaVersion: 2`, `triggerMode: manual_custom` → hydratation des références résolues + intention utilisateur.

Le workflow V2 ne collecte rien sur Internet.

Il hydrate uniquement les données déjà présentes dans Supabase et autorisées par le contrat.

## 8. Contrat de sortie V2

Le schéma fonctionnel reste proche de `MonthlyWatchAnalysisOutput`, mais les preuves doivent devenir génériques.

```ts
export type WatchAnalysisEvidenceRef = {
  kind: "veille_article" | "account_signal" | "intelligence_document"
  id: string
  title: string
  provenance: string
}
```

Chaque finding/opportunité/risque nécessitant une preuve doit porter au moins un `evidenceRef` appartenant au corpus réellement hydraté.

La validation doit refuser une référence inconnue au lieu de la supprimer silencieusement.

## 9. Persistance documentaire

Le `resultType` reste `strategic_watch_analysis`.

Deux comportements coexistent :

### Analyse mensuelle historique

Utiliser le chemin existant `upsert_strategic_watch_document` : une période = un document versionné.

### Analyse à la demande

Créer un document autonome via le chemin documentaire standard. Ne pas appeler la RPC mensuelle, même si le résultat contient une période.

Le discriminateur doit provenir du snapshot/run (`triggerMode = manual_custom`), jamais être deviné depuis le titre.

## 10. Sécurité et invariants

- workspace toujours résolu côté serveur depuis la session ;
- RLS active pendant la résolution des références ;
- ne jamais accepter des `refs` arbitraires fournis par le navigateur pour une Liste/Corpus ;
- n8n utilise ses credentials privilégiés seulement après la validation serveur ;
- pas de contenu complet copié dans un nouveau stockage intermédiaire ;
- aucune recherche externe ;
- aucun changement de contrat des Missions d'intelligence ;
- aucun nouvel identifiant de workflow.

## 11. Compatibilité

Les tests doivent garantir au minimum :

- parsing V1 inchangé ;
- lancement mensuel inchangé ;
- création/versioning mensuel inchangé ;
- V2 refusé si aucune source ou plus de trois groupes ;
- référence RLS inaccessible refusée ;
- article hors digest refusé ;
- collection développée via le résolveur existant ;
- déduplication stable ;
- aucune modification de `mission-001-run`.
