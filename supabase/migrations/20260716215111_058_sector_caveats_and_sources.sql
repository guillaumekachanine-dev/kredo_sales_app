-- Rend persistantes les deux preuves de traçabilité d'une étude sectorielle.
--
-- Constat : les `caveats` (« aucun verbatim réel — à valider terrain ») et la source
-- officielle qui confirme une échéance réglementaire ne vivaient que dans le brouillon
-- de travail et la note de remise. Ils ne survivaient pas à l'injection, donc ils
-- n'atteignaient jamais l'app — alors que c'est exactement ce dont un commercial a
-- besoin en rendez-vous : savoir ce qu'il peut affirmer et ce qu'il doit formuler au
-- conditionnel.
--
-- Effet de bord voulu : les critères A3 (deadline vérifiée) et A4 (caveats rédigés) de
-- la grille §10 deviennent auditables APRÈS injection, plus seulement sur le brouillon.

ALTER TABLE public.sector_intelligence
  ADD COLUMN IF NOT EXISTS caveats jsonb;

COMMENT ON COLUMN public.sector_intelligence.caveats IS
  'Transparence de l''étude (§6.1). Clés attendues : verbatims, frequences, marche, corpus (texte) et sources (array). NULL = étude sans caveats déclarés, ce qui est en soi un signal.';

ALTER TABLE public.sector_regulatory_items
  ADD COLUMN IF NOT EXISTS source_url text;

COMMENT ON COLUMN public.sector_regulatory_items.source_url IS
  'Source officielle qui confirme deadline_date (EUR-Lex, Legifrance, régulateur). NULL + deadline_date renseignée = date non vérifiée : à traiter comme « échéance à confirmer ».';

-- Backfill des 3 fiches actives.
-- Uniquement des faits MESURÉS (audit du 2026-07-16), rien d'inventé : présence ou
-- absence de verbatim, de source_company_ids, taille réelle du corpus.
UPDATE public.sector_intelligence SET caveats = jsonb_build_object(
  'verbatims', $KREDO$7 verbatims réels sur 8 pain points, issus du diagnostic Robertet. C'est le point fort de cette fiche.$KREDO$,
  'frequences', $KREDO$⚠️ Les fréquences (6/5/5/4…) ne sont rattachées à aucun compte source : elles ne sont pas vérifiables. À re-établir par un comptage réel avant de les citer en rendez-vous.$KREDO$,
  'corpus', $KREDO$10 comptes rattachés, 8 avec analyse sectorielle FOLIO. Ancre de preuve : Robertet (client) + 3 diagnostics réels.$KREDO$,
  'marche', $KREDO$Taille marché (~80 Md$) et CAGR (~5 %) issus de la recherche externe de juin 2026, non re-vérifiés depuis.$KREDO$,
  'sources', '[]'::jsonb
) WHERE slug = 'parfumerie-aromes';

UPDATE public.sector_intelligence SET caveats = jsonb_build_object(
  'verbatims', $KREDO$Aucun verbatim client réel : le corpus ne contient aucune interaction exploitable. Tous les pain points sont à valider terrain.$KREDO$,
  'frequences', $KREDO$⚠️ Les fréquences ne sont rattachées à aucun compte source : elles ne sont pas vérifiables. Corpus de 5 comptes seulement.$KREDO$,
  'corpus', $KREDO$Corpus mince : 5 comptes, 4 avec analyse FOLIO. Ancre : Banque Populaire Méditerranée et Ascoma (clients). Fiche construite majoritairement par recherche réglementaire externe — c'est assumé, et c'est ce qui justifie le score de 4.4 plutôt que davantage.$KREDO$,
  'marche', $KREDO$Chiffres de marché issus de la recherche externe de juin 2026.$KREDO$,
  'sources', '[]'::jsonb
) WHERE slug = 'banque-finance-assurance';

UPDATE public.sector_intelligence SET caveats = jsonb_build_object(
  'verbatims', $KREDO$Aucun verbatim client réel : aucune interaction en base sur ce secteur. À valider terrain.$KREDO$,
  'frequences', $KREDO$Comptage réel effectué et tracé (source_company_ids peuplé), mais sur 2 comptes seulement : une fréquence de 2/2 ne dit pas qu'un enjeu est général au secteur.$KREDO$,
  'corpus', $KREDO$Corpus de 2 comptes (Arkopharma, Laboratoires INELDEA), tous deux prospects. Ancre de preuve : 2 diagnostics réels, pas de client. Le fit reste une hypothèse.$KREDO$,
  'marche', $KREDO$Répartition des canaux : Synadiet, janvier 2026. Chiffres Uriach : résultats 2024 publiés le 28 mai 2025.$KREDO$,
  'sources', '[]'::jsonb
) WHERE slug = 'nutraceutique-sante-naturelle';
