-- Seed idempotent : fige les données produites par la session de classification du 09/08/2026
-- (docs/taxonomie-sectorielle/journal-migration.md). Ces données existaient déjà en base
-- (écrites via execute_sql direct, hors tracking migration) — cette migration les rend
-- reproductibles par un `supabase db reset`. Toutes les opérations sont idempotentes
-- (ON CONFLICT DO NOTHING / UPDATE déterministe rejouable).

-- ─── 1. Nouveau macro-secteur "Services aux entreprises & aux personnes" ──────────────────
insert into sector_intelligence (workspace_id, name, slug, description, status, level)
select '98dcd39d-f87b-4f9d-add9-ce76d635953a',
       'Services aux entreprises & aux personnes', 'services-entreprises-personnes',
       'Macro-secteur issu de l''éclatement de Commerce, Distribution & Services spécialisés : travail temporaire, réseaux de proximité, sécurité, médias, organisations professionnelles.',
       'development', 'macro'
where not exists (select 1 from sector_intelligence where slug = 'services-entreprises-personnes');

-- ─── 2. Nutraceutique rétrogradé en segment enfant de Santé, MedTech & Médico-social ──────
update sector_intelligence
set level = 'segment',
    parent_id = (select id from sector_intelligence where slug = 'sante-medtech-medico-social')
where slug = 'nutraceutique-sante-naturelle';

-- ─── 3. 36 segments (referentiel-classification.md v1.0) ─────────────────────────────────
insert into sector_intelligence (workspace_id, name, slug, status, level, parent_id)
select v.workspace_id, v.name, v.slug, 'development', 'segment',
       (select id from sector_intelligence where slug = v.parent_slug)
from (values
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a'::uuid, '5.1 Spatial, défense & systèmes critiques', 'seg-aero-spatial-defense', 'aeronautique-spatial-defense'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a'::uuid, '7.3 Composants & équipements du bâtiment', 'seg-btp-composants-equipements', 'btp-construction-immobilier'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a'::uuid, '7.1 Constructeurs, promoteurs & ingénierie', 'seg-btp-constructeurs-promoteurs', 'btp-construction-immobilier'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a'::uuid, '7.4 Immobilier — investissement & transaction', 'seg-btp-immobilier', 'btp-construction-immobilier'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a'::uuid, '7.2 Matériaux — production & négoce', 'seg-btp-materiaux', 'btp-construction-immobilier'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a'::uuid, '10.3 Agroalimentaire & boissons', 'seg-commerce-agroalimentaire-boissons', 'commerce-distribution-services-specialises'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a'::uuid, '10.2 Distribution & services automobiles', 'seg-commerce-automobile', 'commerce-distribution-services-specialises'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a'::uuid, '10.1 Distribution spécialisée omnicanale', 'seg-commerce-distribution-specialisee', 'commerce-distribution-services-specialises'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a'::uuid, '9.3 Déchets & économie circulaire', 'seg-energie-dechets-economie-circulaire', 'energie-petrochimie-environnement'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a'::uuid, '9.2 Infrastructures & services énergétiques', 'seg-energie-infrastructures-services', 'energie-petrochimie-environnement'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a'::uuid, '9.1 Raffinage & pétrochimie', 'seg-energie-raffinage-petrochimie', 'energie-petrochimie-environnement'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a'::uuid, '6.2 Assurance, mutuelles & courtage', 'seg-finance-assurance-mutuelles-courtage', 'banque-finance-assurance'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a'::uuid, '6.1 Banque & financement', 'seg-finance-banque', 'banque-finance-assurance'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a'::uuid, '3.1 Établissements médico-sociaux & résidences', 'seg-grand-age-etablissements', 'ehpad-residences-seniors'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a'::uuid, '8.1 Électronique & équipements électriques', 'seg-industrie-electronique', 'industrie-manufacturiere-electronique-equipements'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a'::uuid, '8.2 Équipements & emballages industriels', 'seg-industrie-equipements-emballages', 'industrie-manufacturiere-electronique-equipements'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a'::uuid, '12.3 Éditeurs technologiques, deeptech & entités captives', 'seg-numerique-deeptech-captives', 'logiciels-saas-services-numeriques'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a'::uuid, '12.2 Éditeurs de logiciels métier verticaux', 'seg-numerique-editeurs-verticaux', 'logiciels-saas-services-numeriques'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a'::uuid, '12.1 ESN & services numériques', 'seg-numerique-esn', 'logiciels-saas-services-numeriques'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a'::uuid, '1.1 Compositions & ingrédients B2B', 'seg-parfumerie-compositions-b2b', 'parfumerie-aromes'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a'::uuid, '1.2 Marques & produits finis', 'seg-parfumerie-marques-produits-finis', 'parfumerie-aromes'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a'::uuid, '4.1 Collectivités & administrations d''État', 'seg-public-collectivites-administrations', 'secteur-public-enseignement-recherche'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a'::uuid, '4.2 Enseignement supérieur & recherche', 'seg-public-esr', 'secteur-public-enseignement-recherche'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a'::uuid, '2.2 Industrie de santé — pharma & MedTech', 'seg-sante-industrie-pharma-medtech', 'sante-medtech-medico-social'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a'::uuid, '2.3 Services de santé & réseaux de soins', 'seg-sante-services-reseaux', 'sante-medtech-medico-social'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a'::uuid, '2.1 Offre de soins & diagnostic', 'seg-sante-soins-diagnostic', 'sante-medtech-medico-social'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a'::uuid, '11.4 Médias & édition', 'seg-services-medias-edition', 'services-entreprises-personnes'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a'::uuid, '11.5 Organisations professionnelles & sociétés savantes', 'seg-services-organisations-professionnelles', 'services-entreprises-personnes'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a'::uuid, '11.2 Réseaux de services de proximité', 'seg-services-reseaux-proximite', 'services-entreprises-personnes'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a'::uuid, '11.3 Sécurité & télésurveillance', 'seg-services-securite-telesurveillance', 'services-entreprises-personnes'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a'::uuid, '11.1 Travail temporaire & recrutement', 'seg-services-travail-temporaire', 'services-entreprises-personnes'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a'::uuid, '13.1 Hébergement & résidences de tourisme', 'seg-tourisme-hebergement', 'tourisme-hotellerie-loisirs'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a'::uuid, '13.2 Distribution du voyage & croisière', 'seg-tourisme-voyage-croisiere', 'tourisme-hotellerie-loisirs'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a'::uuid, '14.3 Infrastructures & concessions de flux', 'seg-transport-concessions-flux', 'transport-mobilite-regionale'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a'::uuid, '14.2 Logistique & livraison', 'seg-transport-logistique', 'transport-mobilite-regionale'),
  ('98dcd39d-f87b-4f9d-add9-ce76d635953a'::uuid, '14.1 Transport public de voyageurs', 'seg-transport-voyageurs', 'transport-mobilite-regionale')
) as v(workspace_id, name, slug, parent_slug)
where not exists (select 1 from sector_intelligence si where si.slug = v.slug);

-- ─── 4. Classification des 96 comptes (referentiel-classification.md v1.0) ────────────────
-- Idempotent par construction : UPDATE déterministe, rejouable sans effet cumulatif.
with company_classification (company_name, segment_slug, vertical_client, regime_achat, tier, relation_type, modele_eco, moment, classification_confiance, classification_note, classified_at, classified_by) as (
  values
  ('ACRI-ST', 'seg-aero-spatial-defense', null::text[], 'commande_publique', 'pme', 'prospect', 'b2b_projet', null, 'haute', null, '2026-08-09 15:05:21.661722+00'::timestamptz, 'referentiel-v1.0 / claude-opus-5'),
  ('Adecco', 'seg-services-travail-temporaire', null, 'prive', 'grand_compte', 'prospect', 'multi_sites', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Aéroport Nice Cote d Azur', 'seg-transport-concessions-flux', null, 'commande_publique', 'eti', 'prospect', 'concession', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Ampère Software Factory', 'seg-numerique-deeptech-captives', array['automobile'], 'prive', 'pme', 'prospect', 'captif', null, 'moyenne', 'Entité captive d''un constructeur : client interne, budget de groupe. Économie distincte des éditeurs du même segment.', '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Ansys', 'seg-numerique-deeptech-captives', array['industrie'], 'prive', 'grand_compte', 'prospect', 'editeur', null, 'moyenne', 'Éditeur mondial de 2,3 Md$ dans un segment qui contient deux structures de moins de 30 personnes. Écart de tier assumé, corpus commun.', '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Appolonia', 'seg-numerique-editeurs-verticaux', array['immobilier'], 'prive', 'pme', 'prospect', 'editeur', null, 'faible', 'Éditeur, vertical immobilier supposé mais non confirmé. Vérifier le marché client avant tout argumentaire.', '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Aqualung', 'seg-industrie-equipements-emballages', array['sport','defense'], 'prive', 'pme', 'prospect', 'industriel', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Argeville', 'seg-parfumerie-compositions-b2b', null, 'prive', 'eti', 'prospect', 'industriel', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Arkopharma', 'nutraceutique-sante-naturelle', null, 'regule', 'eti', 'prospect', 'industriel', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Aromatech Group', 'seg-parfumerie-compositions-b2b', null, 'prive', 'pme', 'prospect', 'industriel', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Ascoma', 'seg-finance-assurance-mutuelles-courtage', null, 'monaco', 'eti', 'client', 'multi_sites', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Audemard', 'seg-btp-materiaux', null, 'prive', 'eti', 'client', 'industriel', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Autogrill', 'seg-transport-concessions-flux', null, 'commande_publique', null, 'prospect', 'concession', null, 'moyenne', 'Déplacé du tourisme vers les concessions de flux : contrat de concession, redevance au CA, flux captif. Déplacement de macro encore en attente.', '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Banque Populaire Mediterranée', 'seg-finance-banque', null, 'regule', 'grand_compte', 'client', 'multi_sites', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Bioceanor', 'seg-numerique-deeptech-captives', array['environnement'], 'prive', null, 'prospect', 'editeur', null, 'moyenne', 'Startup IoT/IA qualité de l''eau. Séparée d''Ansys dans le raisonnement mais partageant son segment : tension résiduelle de la taxonomie.', '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Bourbon Offshore', 'seg-energie-infrastructures-services', null, 'prive', 'grand_compte', 'prospect', 'b2b_projet', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('CASA (Communauté d agglomérations)', 'seg-public-collectivites-administrations', null, 'commande_publique', null, 'prospect', 'institution', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('CCI Cote d Azur', 'seg-services-organisations-professionnelles', null, 'commande_publique', null, 'prospect', 'institution', null, 'moyenne', 'Établissement public rattaché au segment organisations professionnelles pour sa réalité commerciale (adhérents, services). Arbitrage à revoir si le terrain le contredit. Régime commande publique porté par l''attribut.', '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('CEGEMA', 'seg-finance-assurance-mutuelles-courtage', null, 'regule', 'pme', 'prospect', 'multi_sites', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Centre LACASSAGNE', 'seg-sante-soins-diagnostic', null, 'commande_publique', 'eti', 'prospect', 'institution', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('CHU de Nice', 'seg-sante-soins-diagnostic', null, 'commande_publique', 'grand_compte', 'prospect', 'institution', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Ciffreo Bona', 'seg-btp-materiaux', null, 'prive', 'eti', 'prospect', 'multi_sites', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('CNRS Geoazur', 'seg-public-esr', null, 'commande_publique', 'eti', 'prospect', 'institution', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('CNRS Institut de la mer de Villefranche', 'seg-public-esr', null, 'commande_publique', 'pme', 'prospect', 'institution', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('CNRS Observatoire Cote d Azur', 'seg-public-esr', null, 'commande_publique', 'pme', 'prospect', 'institution', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('CODIX', 'seg-numerique-editeurs-verticaux', array['finance'], 'prive', 'pme', 'prospect', 'editeur', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Cogepart', 'seg-transport-logistique', null, 'prive', 'grand_compte', 'prospect', 'b2b_projet', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Depil Tech', 'seg-services-reseaux-proximite', null, 'prive', 'eti', 'prospect', 'b2c_reseau', null, 'moyenne', 'Réseau franchisé B2C. Vérifier la répartition succursales/franchisés : elle détermine qui décide de l''achat SI.', '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Domusvi', 'seg-grand-age-etablissements', null, 'regule', 'grand_compte', 'prospect', 'multi_sites', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Emera', 'seg-grand-age-etablissements', null, 'regule', 'grand_compte', 'prospect', 'multi_sites', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('ESCOTA (VINCI)', 'seg-transport-concessions-flux', null, 'commande_publique', 'grand_compte', 'prospect', 'concession', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Eurecom', 'seg-public-esr', null, 'prive', 'pme', 'prospect', 'institution', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Euro Protection Surveillance', 'seg-services-securite-telesurveillance', null, 'regule', 'eti', 'prospect', 'b2c_reseau', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('European Society Of Cardiology', 'seg-services-organisations-professionnelles', array['sante'], 'prive', null, 'prospect', 'institution', null, 'moyenne', 'Société savante internationale. Même segment que la CCI pour le modèle (membres, congrès, contenu), régimes juridiques opposés portés par l''attribut.', '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Exail Robotics', 'seg-aero-spatial-defense', null, 'commande_publique', 'grand_compte', 'client', 'industriel', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Experis France', 'seg-numerique-esn', null, 'prive', 'grand_compte', 'pair_partenaire', 'b2b_projet', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Expressions Parfumees', 'seg-parfumerie-compositions-b2b', null, 'prive', 'pme', 'prospect', 'industriel', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Fragonard', 'seg-parfumerie-marques-produits-finis', null, 'regule', 'eti', 'prospect', 'b2c_reseau', null, 'moyenne', 'À cheval amont/aval : production grassoise + boutiques + musée. Classé aval (marque), attribut amont intégré.', '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Geostock', 'seg-energie-infrastructures-services', null, 'regule', null, 'prospect', 'b2b_projet', null, 'moyenne', 'Stockage souterrain. Ni effectif ni CA ; rattachement au segment infrastructures énergétiques établi sur l''activité seule.', '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Giraudi', 'seg-commerce-agroalimentaire-boissons', null, 'monaco', 'eti', 'prospect', null, null, 'moyenne', 'Groupe diversifié monégasque, négoce de viandes. modele_eco non tranché faute de connaître la part négoce vs transformation.', '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Griesser', 'seg-btp-composants-equipements', null, 'prive', null, 'prospect', 'industriel', null, 'moyenne', 'Aucune donnée de taille ni de siège en base. Périmètre France du groupe suisse à établir.', '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Groupe Arthes', 'seg-parfumerie-marques-produits-finis', null, 'regule', 'pme', 'prospect', 'industriel', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Groupe IDEC', 'seg-btp-constructeurs-promoteurs', null, 'prive', 'eti', 'prospect', 'b2b_projet', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Groupe Ippolito', 'seg-commerce-automobile', null, 'prive', 'eti', 'prospect', 'b2c_reseau', null, 'moyenne', 'Groupe diversifié. Activité dominante automobile retenue ; autres activités à documenter.', '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Groupe Transcan', 'seg-transport-logistique', null, 'prive', null, 'prospect', 'b2b_projet', null, 'moyenne', 'Ni effectif ni CA. Rattachement logistique établi sur l''activité seule.', '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Groupe Trecobat', 'seg-btp-constructeurs-promoteurs', null, 'prive', 'eti', 'prospect', 'b2b_projet', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Harvest', 'seg-numerique-editeurs-verticaux', array['finance'], 'prive', 'eti', 'prospect', 'editeur', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Horus Pharma', 'seg-sante-industrie-pharma-medtech', null, 'regule', 'pme', 'prospect', 'industriel', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Interima', 'seg-services-travail-temporaire', null, 'prive', 'pme', 'prospect', 'multi_sites', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Iselection', 'seg-btp-immobilier', null, 'prive', 'eti', 'prospect', 'b2b_projet', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Jean Niel', 'seg-parfumerie-compositions-b2b', null, 'prive', 'pme', 'prospect', 'industriel', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Keller Williams France', 'seg-btp-immobilier', null, 'prive', 'pme', 'prospect', 'b2c_reseau', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('KEOLIS Alpes-Maritimes', 'seg-transport-voyageurs', null, 'commande_publique', 'pme', 'prospect', 'concession', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('L Occitane', 'seg-parfumerie-marques-produits-finis', null, 'regule', 'grand_compte', 'prospect', 'b2c_reseau', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Laboratoires INELDEA', 'nutraceutique-sante-naturelle', null, 'regule', 'eti', 'prospect', 'industriel', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Lbm Bioesterel', 'seg-sante-soins-diagnostic', null, 'regule', 'eti', 'prospect', 'multi_sites', null, 'moyenne', 'Filiale du groupe Biogroup : le CA de 1,6 Md€ est celui du groupe, pas de l''entité. Décision d''achat à situer (locale ou groupe).', '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Les Mutuelles du Soleil', 'seg-finance-assurance-mutuelles-courtage', null, 'regule', 'eti', 'prospect', 'multi_sites', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Malongo', 'seg-commerce-agroalimentaire-boissons', null, 'regule', 'eti', 'prospect', 'industriel', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Maman Bulle', 'seg-services-reseaux-proximite', null, 'prive', 'pme', 'prospect', 'b2c_reseau', null, 'faible', '4 salariés, accompagnement périnatal. Rattaché aux réseaux de proximité faute de mieux ; segment dédié refusé (règle des 3 comptes).', '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Median Technologies', 'seg-sante-industrie-pharma-medtech', array['sante'], 'regule', 'pme', 'prospect', 'editeur', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Medipath', 'seg-sante-soins-diagnostic', null, 'regule', null, 'prospect', 'multi_sites', null, 'moyenne', 'Anatomopathologie. Ni effectif ni CA en base ; tier non déterminable.', '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('MMV', 'seg-tourisme-hebergement', null, 'prive', null, 'prospect', 'multi_sites', null, 'moyenne', 'Aucune donnée en base hors le nom. Rattachement établi sur l''activité présumée (résidences de tourisme) : à confirmer.', '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('MP SA (AVATACAR)', 'seg-commerce-automobile', null, 'prive', null, 'prospect', 'b2c_reseau', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Naphtachimie', 'seg-energie-raffinage-petrochimie', null, 'regule', 'eti', 'prospect', 'industriel', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Nice Matin', 'seg-services-medias-edition', null, 'monaco', 'eti', 'prospect', 'b2c_reseau', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Odalys Group', 'seg-tourisme-hebergement', null, 'prive', 'eti', 'prospect', 'multi_sites', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('PARFEX', 'seg-parfumerie-compositions-b2b', null, 'prive', 'pme', 'prospect', 'industriel', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Payan Bertrand', 'seg-parfumerie-compositions-b2b', null, 'prive', 'pme', 'prospect', 'industriel', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Petroineos', 'seg-energie-raffinage-petrochimie', null, 'regule', 'eti', 'prospect', 'industriel', 'integration_post_ma', 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Pilatus Groupe', 'seg-btp-immobilier', null, 'prive', 'pme', 'prospect', 'b2b_projet', null, 'faible', '3 salariés, activité réelle non établie au-delà de la mention Immobilier. À qualifier ou à sortir du portefeuille.', '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Pizzorno Environnement', 'seg-energie-dechets-economie-circulaire', array['secteur_public'], 'commande_publique', 'eti', 'prospect', 'concession', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Polytech Nice Sophia', 'seg-public-esr', null, 'commande_publique', null, 'prospect', 'institution', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Ponant', 'seg-tourisme-voyage-croisiere', null, 'regule', 'grand_compte', 'prospect', 'b2c_reseau', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Préfecture 06', 'seg-public-collectivites-administrations', null, 'commande_publique', null, 'prospect', 'institution', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Rectorat de Nice', 'seg-public-collectivites-administrations', null, 'commande_publique', null, 'prospect', 'institution', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Régie ligne d azur', 'seg-transport-voyageurs', null, 'commande_publique', 'eti', 'prospect', 'concession', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Renaudi', 'seg-btp-constructeurs-promoteurs', null, 'prive', 'pme', 'prospect', 'b2b_projet', null, 'moyenne', '3 salariés pour 1,4 M€. Micro-compte : vérifier qu''il s''agit bien d''une entité opérationnelle et non d''une holding.', '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Retif', 'seg-commerce-distribution-specialisee', null, 'prive', 'eti', 'prospect', 'b2c_reseau', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Richardson', 'seg-btp-materiaux', null, 'prive', 'grand_compte', 'prospect', 'multi_sites', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Robertet', 'seg-parfumerie-compositions-b2b', null, 'prive', 'grand_compte', 'client', 'industriel', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Schneider', 'seg-industrie-electronique', null, 'prive', 'grand_compte', 'prospect', 'industriel', null, 'moyenne', 'Périmètre de l''entité à préciser : site de Carros ou entité juridique française du groupe. Change le tier et le circuit d''achat.', '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Sepalumic', 'seg-btp-composants-equipements', null, 'prive', 'pme', 'prospect', 'industriel', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Seqoia soft', 'seg-numerique-editeurs-verticaux', array['hospitality'], 'prive', 'eti', 'prospect', 'editeur', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Skema Business School', 'seg-public-esr', null, 'prive', 'pme', 'prospect', 'institution', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Solimut', 'seg-finance-assurance-mutuelles-courtage', null, 'regule', 'eti', 'prospect', 'multi_sites', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('SOS Oxygene', 'seg-sante-services-reseaux', null, 'regule', 'grand_compte', 'prospect', 'multi_sites', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('STMicroelectronics', 'seg-industrie-electronique', null, 'prive', 'grand_compte', 'prospect', 'industriel', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Thalès Alénia Space', 'seg-aero-spatial-defense', null, 'commande_publique', 'grand_compte', 'prospect', 'industriel', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Torbel Industrie', 'seg-btp-composants-equipements', null, 'prive', null, 'prospect', 'industriel', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Tournaire', 'seg-industrie-equipements-emballages', array['parfumerie','pharma'], 'prive', null, 'prospect', 'industriel', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Ubaldi', 'seg-commerce-distribution-specialisee', null, 'prive', 'eti', 'prospect', 'b2c_reseau', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('UNAPEI PACA', 'seg-grand-age-etablissements', null, 'regule', null, 'prospect', 'multi_sites', null, 'moyenne', 'Handicap. Rejoint les EHPAD : financement ARS, taux d''occupation, dossier usager. Déplacement de macro encore en attente.', '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Université Nice Cote d Azur', 'seg-public-esr', null, 'commande_publique', 'eti', 'prospect', 'institution', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Univet', 'seg-sante-services-reseaux', null, 'regule', 'eti', 'prospect', 'multi_sites', null, 'moyenne', 'Réseau de cliniques vétérinaires. Rattaché aux services de santé multi-sites plutôt qu''à un segment vétérinaire isolé (règle des 3 comptes).', '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Voyage Privé', 'seg-tourisme-voyage-croisiere', null, 'prive', 'eti', 'client', 'b2c_reseau', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5'),
  ('Vulog', 'seg-numerique-editeurs-verticaux', array['mobilite'], 'prive', null, 'prospect', 'editeur', null, 'haute', null, '2026-08-09 15:05:21.661722+00', 'referentiel-v1.0 / claude-opus-5')
)
update companies c
set segment_id = (select id from sector_intelligence where slug = cc.segment_slug),
    vertical_client = cc.vertical_client,
    regime_achat = cc.regime_achat,
    tier = cc.tier,
    relation_type = cc.relation_type,
    modele_eco = cc.modele_eco,
    moment = cc.moment,
    classification_confiance = cc.classification_confiance,
    classification_note = cc.classification_note,
    classified_at = cc.classified_at,
    classified_by = cc.classified_by
from company_classification cc
where c.name = cc.company_name;

-- ─── 5. Correction des 3 orphelins sector_id (invisibles dans toute agrégation par secteur) ──
update companies set sector_id = (select id from sector_intelligence where slug = 'btp-construction-immobilier')
where name in ('Iselection', 'Keller Williams France');

update companies set sector_id = (select id from sector_intelligence where slug = 'sante-medtech-medico-social')
where name = 'Univet';
