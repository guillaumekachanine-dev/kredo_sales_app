-- Ajoute image_url sur sector_intelligence pour supprimer STRATEGIC_SECTOR_CONFIG,
-- seconde source de vérité qui divergeait de la base (liens morts en mobile).
--
-- Principe du module sectoriel : injecter une fiche ne doit demander AUCUNE ligne de code.
-- L'image était le dernier champ qui vivait en dur côté front — elle rejoint la base.
--
-- Nullable : un secteur sans visuel rend une carte navy propre (fallback composant).
-- Le chemin /images/sectors/default.png référencé par SectorCard.tsx n'a jamais existé.

ALTER TABLE public.sector_intelligence
  ADD COLUMN IF NOT EXISTS image_url text;

COMMENT ON COLUMN public.sector_intelligence.image_url IS
  'Chemin public du visuel de la carte secteur (ex: /images/sectors/x.jpeg). NULL = fallback navy côté composant.';

-- Reprise des 5 visuels existants dans public/images/sectors/.
-- 3 d'entre eux étaient rattachés dans l'ancienne config à des slugs INEXISTANTS
-- (aeronautique-defense, travel-tech-ecommerce, secteur-public-collectivites) :
-- on les rattache ici aux slugs réels que la config visait manifestement.
UPDATE public.sector_intelligence SET image_url = '/images/sectors/luxe_chimie_cosmetiques.jpeg'
  WHERE slug = 'parfumerie-aromes';

UPDATE public.sector_intelligence SET image_url = '/images/sectors/luxe_chimie_cosmetiques.jpeg'
  WHERE slug = 'nutraceutique-sante-naturelle';

UPDATE public.sector_intelligence SET image_url = '/images/sectors/banque_finance_assurance.jpeg'
  WHERE slug = 'banque-finance-assurance';

-- config: 'aeronautique-defense' (fantôme) → réel : 'aeronautique-spatial-defense'
UPDATE public.sector_intelligence SET image_url = '/images/sectors/aeronautique_defense.jpeg'
  WHERE slug = 'aeronautique-spatial-defense';

-- config: 'secteur-public-collectivites' (fantôme) → réel : 'secteur-public-enseignement-recherche'
UPDATE public.sector_intelligence SET image_url = '/images/sectors/secteur_public_collectivites.jpeg'
  WHERE slug = 'secteur-public-enseignement-recherche';

-- config: 'travel-tech-ecommerce' (fantôme). Le visuel est un plan monde voyage/booking :
-- le secteur réel le plus proche est le tourisme.
UPDATE public.sector_intelligence SET image_url = '/images/sectors/travel_tech_ecommerce.jpeg'
  WHERE slug = 'tourisme-hotellerie-loisirs';
