# KREDO — Hub projet « Missions d'intelligence »

> **Statut** : exploration / cadrage fondateur  
> **Créé le** : 18 août 2026  
> **Objet** : centraliser la conception du moteur d'intelligence transverse de Kredo.

## Rôle de ce dossier

Ce dossier est la **source documentaire canonique** du chantier visant à faire évoluer Kredo d'une juxtaposition de fonctionnalités IA vers un **moteur unique de missions d'intelligence pilotées par l'intention**.

Le principe produit est volontairement simple :

**Corpus + Mission + Contraintes → Livrable**

Les différents modules Kredo ne doivent pas reconstruire leur propre moteur IA. Ils exposent leurs données, contenus et contextes ; un orchestrateur transverse résout le corpus, exécute la mission et archive un livrable traçable.

## Documents

| Document | Statut | Rôle |
|---|---|---|
| [`00-VISION-FONDATRICE.md`](./00-VISION-FONDATRICE.md) | **Canonique** | Note d'intention, philosophie produit, principes d'architecture et périmètre initial |
| `01-AUDIT-EXISTANT.md` | À produire | Inventaire précis du code, des workflows n8n et du modèle Supabase réutilisables |
| `02-CONTRAT-MISSION.md` | À produire | Contrat déclaratif d'une mission : corpus, intention, contraintes, livrable, traçabilité |
| `03-ARCHITECTURE-CIBLE.md` | À produire | Architecture technique minimale et responsabilités Next.js / Supabase / n8n |
| `04-UX-MISSIONS.md` | À produire | Parcours Desktop/Mobile, points d'entrée transverses et composition de mission |
| `05-ROADMAP-IMPLEMENTATION.md` | À produire | Lots d'implémentation, critères de sortie et stratégie de migration des analyses existantes |

Des sous-dossiers `decisions/` et `handoffs/` ne seront créés que lorsqu'ils deviendront nécessaires. **Pas de structure documentaire vide par anticipation.**

## Sources existantes à considérer avant toute décision

Le chantier doit explicitement réutiliser l'existant, notamment :

- `src/lib/n8n/types.ts` et le pattern générique `trigger → runId → callback → résultat` ;
- `ai_intelligence_runs`, `ai_intelligence_results` et la traçabilité déjà en place ;
- `intelligence_documents`, `intelligence_document_versions`, `intelligence_document_links` pour les livrables exploitables ;
- `source_catalog`, `source_corpora`, `source_corpus_items` pour les corpus de sources administrés ;
- `content_collections`, `content_collection_items` pour les listes et corpus éditoriaux créés par l'utilisateur ;
- `veille_digests`, `veille_articles` et `intel-021-monthly-watch-analysis` comme premier cas d'analyse existant à généraliser ;
- les principes CORE de mutualisation n8n déjà retenus dans l'architecture Kredo.

## Règle de gouvernance

Toute nouvelle fonctionnalité IA transverse doit être challengée contre cette question :

> **Est-ce réellement une nouvelle capacité, ou seulement une nouvelle mission utilisant des corpus et compétences déjà disponibles ?**

Si la seconde réponse suffit, **aucun nouveau moteur ni workflow métier parallèle ne doit être créé**.
