# Template d'Injection SQL Transactionnelle — Phase 4

Consulté en Phase 4, une fois le template de synthèse (Phase 3) entièrement rempli — n'ouvre pas ce fichier avant d'avoir toutes les données prêtes, l'injection doit se faire d'un seul geste.

## Principe : tout ou rien

Toute l'injection se fait dans **une seule transaction**. Si une ligne échoue (contrainte UNIQUE violée, champ NULL non autorisé), rien n'est inséré — c'est volontaire, ça évite une fiche à moitié peuplée qui casserait l'affichage front-end.

## Template à adapter

```sql
BEGIN;

-- 1. Créer la fiche sectorielle
INSERT INTO sector_intelligence (
  workspace_id, name, slug, description, status,
  attractiveness_score, market_size_eur_bn, market_growth_pct,
  digital_maturity, practices_fit,
  key_players_paca, key_players_national,
  avg_tjm_min, avg_tjm_max, playbook
) VALUES (
  '[WORKSPACE_ID]',
  '[NOM_SECTEUR]',
  '[slug-kebab-case]',
  '[Description 1-2 lignes]',
  'active',
  [SCORE_X.X],
  [MARKET_SIZE],
  [CAGR],
  '[low|medium|high]',
  '{"data_ai": 4, "cloud_eng": 2, "product": 1, "cyber": 5}'::jsonb,
  '[JSON acteurs PACA]'::jsonb,
  '[JSON acteurs nationaux]'::jsonb,
  [TJM_MIN],
  [TJM_MAX],
  '{
    "personas": [...],
    "roi_arguments": [...],
    "objections": [...],
    "entry_points": [...]
  }'::jsonb
)
RETURNING id; -- garde cet ID en mémoire pour les inserts suivants

-- 2. Pain points (remplace [SECTOR_ID] par l'id retourné ci-dessus)
INSERT INTO sector_pain_points (sector_id, title, description, frequency_count, kredo_practice, verbatim)
VALUES
  ('[SECTOR_ID]', '[Pain 1]', '[Description]', [freq], '[practice]', '[citation ou NULL]'),
  ('[SECTOR_ID]', '[Pain 2]', '[Description]', [freq], '[practice]', '[citation ou NULL]');
  -- ... répéter pour chaque pain point (5-8 typiquement)

-- 3. Items réglementaires
INSERT INTO sector_regulatory_items (sector_id, name, authority, description, deadline_date, urgency, kredo_practice, commercial_angle, is_commercial_window)
VALUES
  ('[SECTOR_ID]', '[Nom officiel]', '[EU|FR|...]', '[Description]', '[YYYY-MM-DD]', '[critical|high|...]', '[practice]', '[Angle commercial]', true);
  -- ... répéter (3-5 typiquement)

-- 4. Trigger events — VÉRIFIE l'unicité des source_url avant d'exécuter (voir piège ci-dessous)
INSERT INTO sector_events (workspace_id, sector_id, title, event_type, description, event_date, commercial_opportunity, status, source_url)
VALUES
  ('[WORKSPACE_ID]', '[SECTOR_ID]', '[Titre trigger]', '[type]', '[Description]', '[DATE]', '[Opportunité]', 'pending', '[URL unique]');
  -- ... répéter (3-5 typiquement)

-- 5. Rattacher les comptes identifiés en Phase 1
UPDATE companies SET sector_id = '[SECTOR_ID]'
  WHERE id IN ('[UUID_COMPTE_1]', '[UUID_COMPTE_2]')
    AND workspace_id = '[WORKSPACE_ID]';

COMMIT;
```

## Pièges connus (rencontrés en production, ne pas reproduire)

| Piège | Symptôme | Fix |
|---|---|---|
| Apostrophes françaises dans le JSON/texte | Erreur de parsing SQL | Utilise le dollar-quoting PostgreSQL (`$$...$$`) pour les chaînes contenant des apostrophes |
| `window` comme nom de champ | "syntax error" — c'est un mot réservé PostgreSQL | Renomme le champ (ex: `time_window` au lieu de `window`) |
| Deux trigger events avec la même `source_url` | Violation contrainte UNIQUE, transaction annulée entière | Vérifie l'unicité de toutes les `source_url` avant d'exécuter |
| RLS (Row Level Security) bloque un `execute_sql` direct | Insertion silencieusement filtrée ou refusée | Utilise le mode migration si le connecteur Supabase le propose, qui passe outre le RLS en tant qu'admin |
| Injection en plusieurs petites requêtes au lieu d'une transaction | État intermédiaire cassé si une étape échoue en cours de route | Toujours `BEGIN ... COMMIT`, jamais requête par requête séparée |

## Vérification post-injection (obligatoire avant Phase 5)

```sql
SELECT * FROM sector_intelligence WHERE slug = '[ton-slug]';
-- doit retourner exactement 1 ligne

SELECT COUNT(*) FROM sector_pain_points WHERE sector_id = '[SECTOR_ID]';
-- doit correspondre au nombre de pain points prévus

SELECT COUNT(*) FROM sector_regulatory_items WHERE sector_id = '[SECTOR_ID]';
SELECT COUNT(*) FROM sector_events WHERE sector_id = '[SECTOR_ID]';

SELECT COUNT(*) FROM companies WHERE sector_id = '[SECTOR_ID]';
-- doit correspondre au nombre de comptes rattachés en Phase 1
```

Ne déclare jamais l'injection terminée sans avoir fait tourner ces vérifications — une transaction qui ne renvoie pas d'erreur explicite ne garantit pas que tout est arrivé là où prévu, surtout si plusieurs connecteurs Supabase coexistent dans l'environnement (un mauvais credential pointant vers un autre projet est une source d'erreur déjà rencontrée).
