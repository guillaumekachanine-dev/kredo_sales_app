-- Traçabilité de la décision de classification (obligatoire pour toute écriture automatisée)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS classification_confiance TEXT
  CHECK (classification_confiance IN ('haute','moyenne','faible'));
ALTER TABLE companies ADD COLUMN IF NOT EXISTS classification_note TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS classified_at TIMESTAMPTZ;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS classified_by TEXT;

-- Le résidu doit être nommé résidu : sans ce bac, tout compte inclassable ira polluer
-- le macro le plus large disponible. Avec lui, il reste visible et se vide.
INSERT INTO sector_intelligence (workspace_id, name, slug, description, status, level)
SELECT '98dcd39d-f87b-4f9d-add9-ce76d635953a',
       'Non rattaché — à qualifier', 'non-rattache-a-qualifier',
       'Bac de rétention explicite. Un compte y séjourne au maximum 30 jours : passé ce délai il doit être rattaché ou sorti du portefeuille. Ne jamais y laisser un compte par confort.',
       'watch', 'macro'
WHERE NOT EXISTS (SELECT 1 FROM sector_intelligence WHERE slug='non-rattache-a-qualifier');

INSERT INTO sector_intelligence (workspace_id, name, slug, status, level, parent_id)
SELECT '98dcd39d-f87b-4f9d-add9-ce76d635953a',
       '0.0 À qualifier', 'seg-a-qualifier', 'watch', 'segment',
       (SELECT id FROM sector_intelligence WHERE slug='non-rattache-a-qualifier')
WHERE NOT EXISTS (SELECT 1 FROM sector_intelligence WHERE slug='seg-a-qualifier');
