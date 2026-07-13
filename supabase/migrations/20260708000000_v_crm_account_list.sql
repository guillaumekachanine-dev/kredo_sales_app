-- Migration: Vue légère pour la liste CRM comptes
-- Objectif : ne pas transférer le blob metadata complet côté client
-- RLS : security_invoker = true → la vue hérite des politiques RLS de l'utilisateur appelant
-- Ne modifie pas la table companies ni ses données

create or replace view public.v_crm_account_list
  with (security_invoker = true)
as
select
  c.id,
  c.name,
  c.sector,
  c.segment,
  c.revenue,
  c.employee_count,
  c.size_band,
  c.hq_location,
  c.priority,
  c.lifecycle_status,
  c.legacy_folio_score,
  c.website,
  c.description,
  -- Extraire uniquement logo_path depuis metadata (text, pas jsonb entier)
  (c.metadata ->> 'logo_path')                                   as logo_path,
  -- Statistiques contacts extraites de metadata.contact_stats
  ((c.metadata -> 'contact_stats') ->> 'nb_contacts')::integer   as nb_contacts,
  ((c.metadata -> 'contact_stats') ->> 'nb_with_email')::integer as nb_with_email,
  -- has_study : vrai si analysis_data existe et n'est pas un objet vide
  (
    c.metadata ? 'analysis_data'
    and jsonb_typeof(c.metadata -> 'analysis_data') = 'object'
    and c.metadata -> 'analysis_data' <> '{}'::jsonb
  )                                                               as has_study
from public.companies c;

-- Commentaire documentaire
comment on view public.v_crm_account_list is
  'Vue légère de la liste CRM comptes. Expose uniquement les colonnes nécessaires '
  'à l''affichage de la liste comptes sans transférer le blob metadata complet. '
  'security_invoker = true garantit que les politiques RLS de la table companies '
  's''appliquent bien à l''utilisateur appelant.';
