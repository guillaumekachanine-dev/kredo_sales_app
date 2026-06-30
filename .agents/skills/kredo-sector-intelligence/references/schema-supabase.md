# Schéma Supabase — Module Sector Intelligence

Référence consultée en Phase 1 (audit corpus) et Phase 4 (injection).

## Tables existantes (contexte)

```sql
companies (id, workspace_id, name, sector, lifecycle_status, revenue, ai_score, sector_id, ...)
opportunities (id, workspace_id, company_id, title, status, close_date, amount_eur, sector_id, ...)
company_audit (id, company_id, json_output, created_at, ...)
workspaces (id, name, ...)
```

`companies.sector` est un champ texte libre historique — il coexiste avec `companies.sector_id` (la vraie relation structurée). Ne jamais le supprimer ni le réécrire, seulement le compléter.

## Tables du module (créées migration 010)

```sql
-- Table principale
CREATE TABLE sector_intelligence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  status TEXT DEFAULT 'active', -- 'active' | 'development' | 'watch'
  attractiveness_score DECIMAL(3,1),
  market_size_eur_bn DECIMAL(10,2),
  market_growth_pct DECIMAL(5,2),
  digital_maturity TEXT, -- 'low' | 'medium' | 'high'
  practices_fit JSONB, -- {"data_ai": 5, "cloud_eng": 3, "product": 2, "cyber": 4}
  key_players_paca JSONB, -- [{"name": "X", "note": "...", "size": "50M€"}]
  key_players_national JSONB,
  avg_tjm_min INTEGER,
  avg_tjm_max INTEGER,
  playbook JSONB, -- voir references/playbook-template.md pour la structure
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Pain points (intelligence agrégée des comptes)
CREATE TABLE sector_pain_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id uuid NOT NULL REFERENCES sector_intelligence(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  frequency_count INTEGER, -- ex: 6 signifie "trouvé chez 6 comptes sur N étudiés"
  kredo_practice TEXT, -- 'data_ai' | 'cloud_eng' | 'product' | 'cyber' | 'multi'
  verbatim TEXT, -- citation client mot-pour-mot, NULL si non disponible — jamais inventé
  created_at TIMESTAMP DEFAULT NOW()
);

-- Calendrier réglementaire (le bloc commercial le plus précieux)
CREATE TABLE sector_regulatory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id uuid NOT NULL REFERENCES sector_intelligence(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  authority TEXT, -- 'EU' | 'FR' | 'Monaco' | etc.
  description TEXT,
  deadline_date DATE,
  urgency TEXT DEFAULT 'medium', -- 'critical' | 'high' | 'medium' | 'low'
  kredo_practice TEXT,
  commercial_angle TEXT, -- la réponse Kredo formulée pour ce point réglementaire
  is_commercial_window BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Veille automatisée (alimentée par le workflow n8n, lecture seule côté étude)
CREATE TABLE sector_news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  sector_id uuid NOT NULL REFERENCES sector_intelligence(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source TEXT,
  url TEXT UNIQUE NOT NULL,
  summary TEXT,
  published_at TIMESTAMP,
  relevance_score DECIMAL(3,2),
  tags TEXT[],
  is_trigger_event BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Événements commerciaux (trigger events détectés ou saisis manuellement)
CREATE TABLE sector_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  sector_id uuid NOT NULL REFERENCES sector_intelligence(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  event_type TEXT, -- 'regulatory' | 'market' | 'competitor' | 'appointment' | 'tender' | 'report' | 'other'
  description TEXT,
  event_date DATE,
  commercial_opportunity TEXT,
  source_url TEXT UNIQUE, -- attention : contrainte unique, voir piège ci-dessous
  status TEXT DEFAULT 'pending', -- 'pending' | 'acted' | 'dismissed'
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Contraintes à respecter impérativement

```sql
ALTER TABLE sector_news ADD CONSTRAINT sector_news_url_unique UNIQUE (url);
ALTER TABLE sector_events ADD CONSTRAINT sector_events_source_url_unique UNIQUE (source_url);
```

**Piège connu** : si deux trigger events de ta fiche partagent la même URL source, l'insertion échoue et annule toute la transaction. Vérifie l'unicité de tes `source_url` avant de lancer l'injection (Phase 4) — c'est arrivé lors de la construction de la fiche Finance et ça a fait perdre du temps.

## Secteurs déjà en production (à ne jamais dupliquer)

| Secteur | slug | Statut |
|---|---|---|
| Parfumerie, Arômes & Cosmétique | `parfumerie-aromes` | Référence qualité, score 4.8/5 |
| Banque, Finance & Assurance | `banque-finance-assurance` | Référence corpus mince, score 4.4/5 |

Avant de créer un nouveau secteur, vérifie par `SELECT slug FROM sector_intelligence;` qu'il n'existe pas déjà — un slug en doublon viole la contrainte UNIQUE sur `sector_intelligence.slug`.
