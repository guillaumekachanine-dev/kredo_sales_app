-- Couche segment : additive, sans toucher sector_id (le front continue de fonctionner à l'identique)
ALTER TABLE sector_intelligence ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES sector_intelligence(id);
ALTER TABLE sector_intelligence ADD COLUMN IF NOT EXISTS level TEXT
  CHECK (level IN ('macro','segment')) DEFAULT 'macro';

-- segment_id est une NOUVELLE colonne : sector_id reste la référence actuelle du front
ALTER TABLE companies ADD COLUMN IF NOT EXISTS segment_id uuid REFERENCES sector_intelligence(id);

-- Axes orthogonaux : ce ne sont pas des secteurs
ALTER TABLE companies ADD COLUMN IF NOT EXISTS vertical_client TEXT[];
ALTER TABLE companies ADD COLUMN IF NOT EXISTS regime_achat TEXT
  CHECK (regime_achat IN ('commande_publique','regule','monaco','prive'));
ALTER TABLE companies ADD COLUMN IF NOT EXISTS tier TEXT
  CHECK (tier IN ('grand_compte','eti','pme'));
ALTER TABLE companies ADD COLUMN IF NOT EXISTS relation_type TEXT
  CHECK (relation_type IN ('prospect','client','ancien_client','pair_partenaire'));
ALTER TABLE companies ADD COLUMN IF NOT EXISTS modele_eco TEXT
  CHECK (modele_eco IN ('multi_sites','b2c_reseau','b2b_projet','industriel','editeur','captif','concession','institution'));
ALTER TABLE companies ADD COLUMN IF NOT EXISTS moment TEXT
  CHECK (moment IN ('integration_post_ma','croissance_forte','retournement','renouvellement_concession','reorganisation_si','stable'));

CREATE INDEX IF NOT EXISTS idx_companies_segment_id ON companies(segment_id);
CREATE INDEX IF NOT EXISTS idx_companies_tier ON companies(tier);
CREATE INDEX IF NOT EXISTS idx_companies_regime_achat ON companies(regime_achat);
CREATE INDEX IF NOT EXISTS idx_sector_intelligence_parent ON sector_intelligence(parent_id);
