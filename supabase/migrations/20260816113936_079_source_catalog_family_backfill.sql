-- Migration 079 — backfill des familles du socle de sources éditoriales.
-- Idempotent : ne renseigne que les sources système dont family est vide.

update public.source_catalog
set family = case source_key
  when 'LeMagIT' then 'Marché IT / ESN France'
  when 'ChannelNews' then 'Marché IT / ESN France'
  when 'L''Usine Digitale' then 'Marché IT / ESN France'
  when 'The Batch (DeepLearning.AI)' then 'IA appliquée / ROI entreprise'
  when 'One Useful Thing' then 'IA appliquée / ROI entreprise'
  when 'VentureBeat AI' then 'IA appliquée / ROI entreprise'
  when 'Anthropic News' then 'Frontier & acteurs IA'
  when 'OpenAI News' then 'Frontier & acteurs IA'
  when 'The Neuron' then 'Frontier & acteurs IA'
  when 'a16z' then 'Stratégie & marché'
  when 'Journal du Net — IA' then 'Stratégie & marché'
  when 'ActuIA' then 'Réglementaire & souveraineté'
  when 'Finextra' then 'Verticaux sectoriels'
  when 'Premium Beauty News' then 'Verticaux sectoriels'
  else family
end,
updated_at = now()
where origin = 'system'
  and (family is null or btrim(family) = '')
  and source_key in (
    'LeMagIT', 'ChannelNews', 'L''Usine Digitale',
    'The Batch (DeepLearning.AI)', 'One Useful Thing', 'VentureBeat AI',
    'Anthropic News', 'OpenAI News', 'The Neuron',
    'a16z', 'Journal du Net — IA', 'ActuIA',
    'Finextra', 'Premium Beauty News'
  );
