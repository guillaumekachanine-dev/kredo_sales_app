# AGENTS.md — Kredo Fake Data Generator

> Ce fichier est lu automatiquement par Codex CLI quand il travaille dans ce dossier (ou un dossier parent du repo Kredo). Pas besoin de le coller manuellement à chaque session — dépose-le simplement à la racine du repo, ou dans un sous-dossier dédié (ex: `/scripts/fake-data/`), et Codex en hérite le contexte.
>
> Équivalent du skill `kredo-fake-data` utilisé dans Claude — même logique, adapté au fonctionnement de Codex (pas de chargement progressif de skill, pas de connecteur Supabase MCP natif).

---

## Contexte du projet

Kredo Digital est un outil B2B interne de type "Super-Assistant" pour la gestion d'un centre de profit en ESN (Stack : Next.js 15, Supabase/PostgreSQL, n8n). Cette mission ne concerne PAS le développement de Kredo lui-même, mais la génération de **données factices réalistes** pour peupler la base de test pendant le développement.

Dosta (le développeur/fondateur) a un profil commercial/métier en montée en compétences technique. Il pilote plusieurs assistants IA en parallèle (Claude, Codex, Gemini) selon le contexte. Quand il te confie cette tâche, c'est généralement pour répartir la charge de génération SQL pendant qu'un autre assistant (Claude, via son connecteur Supabase MCP) s'occupe de l'audit de l'existant et de l'exécution finale.

---

## Différence critique avec la version Claude de ce skill

**Codex n'a pas de connexion live à la base Supabase**, sauf si Dosta a explicitement configuré la Supabase CLI ou un accès `psql` dans l'environnement où tu travailles (vérifie si un fichier `.env` ou une config Supabase CLI existe dans le repo avant de présumer quoi que ce soit).

Deux modes possibles :

1. **Mode génération seule (par défaut)** : tu rédiges le SQL en te basant sur le `references/schema_map.md` et sur le **snapshot fourni par Dosta** (voir section suivante). Tu ne l'exécutes jamais toi-même. Tu livres le SQL pour que Dosta (ou Claude via Supabase MCP) l'exécute.

2. **Mode exécution directe** : si et seulement si tu détectes un accès `psql` ou `supabase db` fonctionnel dans l'environnement (variables d'env présentes, CLI installée et authentifiée), tu peux proposer d'exécuter directement — mais demande confirmation explicite à Dosta avant toute exécution, et rappelle-lui que c'est non-réversible sauf restauration de backup.

**Dans le doute, reste en mode génération seule.** Mieux vaut livrer du SQL que Dosta exécute lui-même via Claude, plutôt que de risquer une insertion non vérifiée.

---

## Étape obligatoire avant de générer quoi que ce soit

1. Lis intégralement `references/schema_map.md` — c'est la cartographie des 51 tables, l'ordre topologique d'insertion, les FK critiques, le vocabulaire enum contrôlé et les benchmarks financiers.
2. Demande à Dosta s'il a un **snapshot récent** (voir `references/snapshot_query.sql`). Si non, demande-lui de le générer via Claude/Supabase MCP et de te le coller — NE GÉNÈRE RIEN sans ça, tu risquerais de réutiliser un UUID périmé ou un nom de société déjà existant.
3. Si Dosta n'a pas de snapshot et veut avancer quand même, préviens-le explicitement que les données générées devront être vérifiées avant insertion (collision de noms, UUID obsolètes) — ne le laisse pas découvrir le problème après coup.

---

## Le principe fondamental : Avatar-first

**On ne génère pas des lignes de base de données. On crée des personnages.**

Chaque entité générée doit avoir une micro-histoire cohérente qui se propage naturellement à travers toutes les tables où elle apparaît : un nom crédible, un parcours professionnel plausible, une situation actuelle logique, des connexions cohérentes avec le reste du dataset.

**Exemple d'avatar correct :**
> Karim Benzarti, 31 ans, diplômé Polytech Nice (2017), 6 ans d'expérience. Passé par Capgemini Sophia (3 ans Data Engineer GCP) puis freelance 2 ans. Rejoint Kredo en sept 2025. En mission chez Robertet depuis jan 2026 comme Data Engineer (TJM 680, CJM 420). Compétences : Python (expert), GCP BigQuery (senior), dbt (confirmé).

Cet avatar génère des lignes cohérentes dans : `persons`, `collaborators`, `person_skills`, `missions`, `mission_activity_reports`, `collaborator_compensation`, `collaborator_absences`.

### Irrégularité obligatoire

Une base de données parfaite est suspecte. Injecte systématiquement :
- 15-25% de champs optionnels vides (téléphone, LinkedIn, description)
- des dates de début de mission qui ne tombent pas toutes le 1er du mois
- des marges variables (20% à 50%, pas toutes identiques)
- un pipeline commercial réaliste (certaines opportunités stagnent, d'autres avancent vite)
- des candidats qui échouent ou abandonnent en cours de process
- des interactions au sentiment varié (pas que du positif)

Voir `references/schema_map.md` pour les enum values complètes et les benchmarks TJM/CJM par séniorité.

### Convention de nommage des données de test

La base contient déjà des collaborateurs fictifs sous le format `{prenom}.{initiale}.cNN@kredo.test` (de c01 à c16 au dernier audit). Le snapshot fourni par Dosta inclut `next_kredo_test_sequence` — utilise ce numéro et continue la séquence plutôt que de repartir de zéro, sauf consigne contraire.

---

## Ordre d'insertion (résumé — détail complet dans schema_map.md)

```
Tier 0  : workspaces, profiles            → ne jamais générer (existent déjà)
Tier 1  : offer_practices, skills, sector_intelligence, job_profiles
Tier 2  : persons, companies              → entités souches
Tier 3  : contacts, collaborators, candidates
Tier 4  : opportunities, missions, projects, offers
Tier 5  : tables de jonction et d'activité (interactions, CRA, absences...)
Tier 6  : intelligence sectorielle, calendar_events, tasks
Tier 7  : pipeline IA / enrichment       → laisser vide sauf demande explicite
Tier 8  : pipeline recrutement (hiring_processes, milestones)
Tier 9  : agrégats P&L et performance
```

---

## Format de sortie SQL

Toujours produire du SQL non-destructif, jamais de UPDATE ni DELETE ni TRUNCATE :

```sql
-- ============================================================
-- KREDO FAKE DATA — Pack: [nom du pack]
-- Généré le: [date]
-- Périmètre: [description]
-- Snapshot utilisé: [date du snapshot fourni par Dosta]
-- ATTENTION: INSERT ONLY
-- ============================================================

DO $$
DECLARE
  ws_id UUID := '98dcd39d-f87b-4f9d-add9-ce76d635953a';
  -- Practice IDs (copier depuis le snapshot fourni)
  p_data UUID := '...';
  -- Entity IDs générés pour ce batch
  person_1 UUID := gen_random_uuid();
  company_1 UUID := gen_random_uuid();
BEGIN

  INSERT INTO persons (id, workspace_id, first_name, last_name, primary_email, phone, location)
  VALUES (person_1, ws_id, '...', '...', '...', '...', '...');

  -- Continuer dans l'ordre des tiers...

END $$;
```

Règles strictes :
- Jamais d'UUID hardcodé en littéral hors DECLARE — tout passe par variables
- `ON CONFLICT DO NOTHING` sur les colonnes à risque de collision (emails, slugs, urls)
- Ne jamais surcharger les colonnes calculées (`full_name`, `size_band`, `gross_margin_pct`, `cjm`, `weighted_gain`, `acv`, `activity_rate_percent` — laisser PostgreSQL les calculer)
- Ne jamais insérer dans `audit_log` (trigger automatique)
- Toujours inclure le `workspace_id` explicitement (pas de DEFAULT `current_workspace_id()` fiable hors session authentifiée Supabase)

---

## Checklist de validation avant de livrer le SQL à Dosta

- [ ] Chaque FK référence un ID qui existe dans le snapshot OU dans le même batch généré
- [ ] Aucune collision avec les noms de société / emails listés dans le snapshot
- [ ] Cohérence temporelle : `entry_date` ≤ `mission.start_date` ≤ premier CRA ≤ `mission.end_date`
- [ ] TJM cohérent avec la séniorité (voir benchmarks dans schema_map.md)
- [ ] CJM < TJM toujours, marge brute entre 20% et 50%
- [ ] Valeurs enum strictement conformes au vocabulaire contrôlé du schema_map
- [ ] Mix d'irrégularité présent (pas 100% de données "parfaites")

---

## Livraison

Produis le bloc SQL complet en un seul fichier `.sql`, avec en tête de fichier un résumé en commentaire des avatars créés (qui, quoi, pourquoi). Si Dosta te demande d'exécuter directement et que tu as un accès DB confirmé, demande une dernière confirmation explicite avant de lancer la requête.

Si une partie du périmètre demandé est ambiguë (volumes non précisés, secteur non choisi), pose la question avant de générer plutôt que de deviner — la régénération coûte plus cher que la clarification.
