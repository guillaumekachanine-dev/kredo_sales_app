-- ADR-0022 §1.2 DEF-2 — neutralisation des sources fantomes du socle editorial.
--
-- Ces 4 sources sont actives, sans `collection_url`, donc collectees en `site:`
-- via Google News France par « Construire Requete Collecte » (ceid=FR:fr code en dur).
-- Sonde d'ingerabilite du 2026-09-06 (docs/FEATURES/veille_digest_thematique/probe-feeds.py) :
--   a16z          : flux 404 · site:FR = 0 item
--   Anthropic     : flux 404 · site:FR = 3 items, le plus recent vieux de 53 jours
--   The Batch     : flux 404 · site:FR = 1 item de 2024
--   The Neuron    : flux redirige vers une 404 HTML · site:FR = 0 item
-- Elles gonflent `veille_digests.nb_sources_actives` sans jamais contribuer un article.
--
-- `validation_status='unreachable'` les exclut des DEUX branches `news` de
-- `v_effective_watch_sources` (filtre `validation_status <> ALL (ARRAY['rejected','unreachable'])`).
-- Reversible : repasser a 'valid' des qu'une URL de flux valide est connue.
-- Mesure : 15 -> 11 sources news (dry-run en transaction ROLLBACK avant application).

update public.source_catalog
set validation_status = 'unreachable',
    last_verified_at  = timestamptz '2026-09-06 00:00:00+00',
    last_error        = 'Sonde 2026-09-06 (ADR-0022 §2.2) : flux RSS mort et repli site: Google News FR sans rendement. Reactiver des qu''une URL de flux valide est connue.'
where source_key in ('a16z', 'Anthropic News', 'The Batch (DeepLearning.AI)', 'The Neuron')
  and validation_status <> 'unreachable';
