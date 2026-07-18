-- Étude sectorielle : Énergie, Pétrochimie & Environnement
-- Corpus : moyen — 5 comptes, 5 avec sector_analysis FOLIO, AUCUNE ancre de preuve
-- Score : 4.0/5 (plafond corpus : 4.5)
-- Gate 2 : 4 items réglo datés/sourcés (B2=0 : dates majeures juste passées, assumé)
-- Gate 3 : ~92-95/100, Axe A 35/35
-- Sources : voir bloc caveats

DO $migration$
DECLARE
  v_workspace_id uuid;
  v_sector_id    uuid;
BEGIN
  SELECT id INTO v_workspace_id FROM workspaces LIMIT 1;

  -- 1. La fiche (UPSERT sur la coquille watch existante)
  INSERT INTO sector_intelligence (
    workspace_id, name, slug, description, status,
    attractiveness_score, market_size_eur_bn, market_growth_pct,
    digital_maturity, practices_fit, key_players_paca, key_players_national,
    avg_tjm_min, avg_tjm_max, playbook, caveats, image_url
  ) VALUES (
    v_workspace_id,
    $KREDO$Énergie, Pétrochimie & Environnement$KREDO$,
    'energie-petrochimie-environnement',
    $KREDO$Cluster industriel dense de la façade méditerranéenne (Fos-Lavéra-Berre, 30% du raffinage français, 5% de la pétrochimie européenne) : raffinage, pétrochimie, services offshore, stockage souterrain d'énergie et gestion des déchets. Fiche construite sur 5 comptes rattachés avec analyse sectorielle FOLIO dense, mais sans ancre de preuve (0 client, 0 mission) : le fit KREDO (data/ESG, cyber IT-OT, digitalisation industrielle) est une hypothèse thématique forte, non encore prouvée en delivery. Le différenciant tient à l'empilement réglementaire (EU ETS, IED 2.0, CBAM, NIS2) sur des sites Seveso qui doivent chiffrer et défendre leurs émissions par la donnée.$KREDO$,
    'active',
    4.0, NULL, NULL,
    'low',
    '{"data_ai": 4, "cloud_eng": 3, "product": 2, "cyber": 4}'::jsonb,
    $KREDO$[
      {"name":"Naphtachimie (INEOS) — Lavéra","size":"720 kt éthylène/an","note":"Vapocraqueur parmi les plus grands d'Europe. Rachat INEOS avril 2024, 250 M€ + 300 M€ de subvention État pour décarboner. Cible conseil data/décarbonation."},
      {"name":"Petroineos — Lavéra","size":"Raffinerie 10,2 Mt/an","note":"Modèle intégré raffinage-trading. Actionnaires INEOS/PetroChina. Enjeux ETS, RED III, digitalisation du trading."},
      {"name":"Bourbon Offshore","size":"733 M€, 5800 salariés","note":"Services maritimes offshore, siège Marseille. Post-restructuration, actionnaires financiers US. ETS maritime, FuelEU, reporting ESG à outiller."},
      {"name":"Geostock — Martigues","size":"~60 ans d'expertise","note":"Stockage souterrain d'énergie. Pivot hydrogène/CCUS (accord Vallourec déc. 2025, projet FrHyGe). Digitalisation de l'ingénierie."},
      {"name":"Pizzorno Environnement","size":"264 M€ (2023)","note":"Gestion des déchets, ancrage Sud-Est. Intégration Paprec en cours. Retard digital, reporting ESG/CSRD, biodéchets."},
      {"name":"Autres plateformes Fos-Berre","size":"Cluster","note":"Esso/ExxonMobil Fos, LyondellBasell Berre, Kem One (Lavéra/Fos), Elengy/Fosmax LNG, TotalEnergies La Mède (bioraffinerie) — écosystème d'interdépendances."}
    ]$KREDO$::jsonb,
    $KREDO$[
      {"name":"TotalEnergies","size":"Géant","note":"Raffinage/bioraffinage, chimie, référence de la transition énergétique française."},
      {"name":"Veolia / Suez","size":"~45% du marché déchets","note":"Géants intégrés de l'environnement, concurrents/partenaires de Pizzorno."},
      {"name":"Paprec","size":"Leader recyclage FR","note":"Consolide le secteur déchets, intègre Pizzorno."},
      {"name":"Storengy / Air Liquide","size":"Grands opérateurs","note":"Stockage gaz/hydrogène (Storengy coordonne FrHyGe), gaz industriels et H2 — écosystème du pivot énergétique."}
    ]$KREDO$::jsonb,
    550, 1000,
    $KREDO${
      "personas": [
        {"role":"DSI / Responsable SI de site industriel","enjeu":"Moderniser le SI industriel et faire converger IT/OT tout en tenant les contraintes de sûreté Seveso.","peur":"Qu'un incident cyber sur les systèmes de conduite (DCS/SCADA) arrête le vapocraqueur ou déclenche un événement Seveso dont il portera personnellement la responsabilité."},
        {"role":"Directeur HSE / Décarbonation","enjeu":"Tenir la trajectoire CO2 (ETS, IED) et sécuriser les subventions publiques de décarbonation.","peur":"Rater un jalon de décarbonation qui conditionne la subvention de l'État et voir le site basculer du côté des maillons non rentables menacés de fermeture (spectre Grangemouth)."},
        {"role":"Directeur de site / Directeur industriel","enjeu":"Préserver la compétitivité du site face aux importations extra-européennes et au coût de l'énergie.","peur":"Que le groupe désigne son site comme le maillon à fermer, ou que la DREAL immobilise l'installation après un incident."},
        {"role":"Directeur Financier / Contrôle de gestion durable","enjeu":"Produire un reporting ESG/CSRD auditable et sécuriser l'accès aux financements verts.","peur":"Un reporting extra-financier retoqué par l'auditeur, ou une donnée fausse qui fragilise l'accès au capital et la crédibilité devant les actionnaires."}
      ],
      "roi_arguments": [
        "Décarbonation de Lavéra : 550 M€ investis dont ~300 M€ de subvention de l'État sur 15 ans (~30% du coût), objectif -331 000 t CO2/an ; le pilotage des données d'émissions et des jalons conditionne l'aide. Source: INEOS, communiqué 2025.",
        "EU ETS maritime 100% depuis le 1er janvier 2026 : le coût carbone sur les routes européennes se chiffre en millions €/an ; une donnée d'émissions fiable devient un poste de marge, pas de conformité. Source: Commission européenne, Climate Action, 2026.",
        "IED 2.0, transposition France au 1er juillet 2026 : plans de transformation MTD chiffrés imposés à ~7 000 ICPE dont les raffineries ; le reporting air/eau/déchets doit être outillé, pas tenu sur tableur. Source: Directive (UE) 2024/1785, EUR-Lex.",
        "Cartographie du SI industriel avant/après rachat : potentiel estimé à -2 à -4 semaines sur la phase d'audit d'un site non documenté, à valider sur le contexte client. Source: estimation Kredo, calibrée sur des audits SI comparables.",
        "Reporting CSRD post-Omnibus (vague 2, exercice 2027) : ~300 points de données ESRS à collecter de façon auditable ; industrialiser la collecte maintenant évite le rush de 2027. Source: directive Omnibus adoptée le 16/12/2025."
      ],
      "objections": [
        {"objection":"On sort d'un rachat (INEOS/Paprec) et d'un plan à 250-300 M€ ; ce n'est pas le moment d'ajouter un chantier SI.","reponse":"Justement : les jalons de décarbonation qui conditionnent la subvention de l'État se pilotent par la donnée. Un cadrage court de 2 à 4 semaines sécurise l'aide avant d'engager le lourd. Source de l'urgence : subvention GPID conditionnée aux jalons (INEOS Lavéra, 2025)."},
        {"objection":"La décarbonation, c'est de l'ingénierie procédé, pas de l'IT ; vous n'êtes pas légitimes.","reponse":"Le procédé, non. Mais chiffrer les émissions au niveau source (ETS, IED, méthane), tracer les jalons pour l'auditeur et l'État et fiabiliser la donnée, c'est de la data. On ne remplace pas vos ingénieurs, on les outille."},
        {"objection":"Nos systèmes industriels (DCS/SCADA) sont fermés pour des raisons de sûreté Seveso ; on ne touche pas à l'OT.","reponse":"On n'ouvre pas l'OT. On sécurise la convergence IT/OT qu'exige justement NIS2 et on exploite les données historisées sans exposer la conduite. La sûreté est le cadre, pas l'obstacle."}
      ],
      "entry_points": [
        "Réglementaire: IED 2.0 (1er juillet 2026) et EU ETS 100% — proposer un état des lieux « êtes-vous prêt à documenter et défendre vos émissions ? », un motif d'appel daté.",
        "Quick-win: cartographie du SI et des données d'un site en 2 à 4 semaines, avant ou après un rachat — un livrable rapide qui crée la confiance avant le structurant.",
        "Transformation: programme data / jumeau numérique de l'outil industriel adossé au plan de décarbonation (Lavéra 2028-2030).",
        "Réseau: cluster Fos-Lavéra-Berre (30% du raffinage français, 5% de la pétrochimie européenne) — une entrée réussie sur un site ouvre l'écosystème d'interdépendances de la plateforme."
      ]
    }$KREDO$::jsonb,
    $KREDO${
      "verbatims":"Aucun verbatim client réel : corpus sans interaction exploitable (une seule interaction, un email sortant généré par Kredo). À recueillir en rendez-vous.",
      "frequences":"Comptage réel sur les 5 comptes rattachés (source_company_ids peuplé sur chaque pain point), non exhaustif du secteur.",
      "corpus":"Corpus MOYEN : 5 comptes avec analyse sectorielle FOLIO dense, mais aucune ancre de preuve (0 client, 0 diagnostic réel, 0 mission, 0 opportunité). Fit KREDO = hypothèse thématique, non prouvée. Plafond de score 4.5.",
      "marche":"Secteur composite (énergie/pétrochimie ~6,5 Md$ hydrocarbures France ; déchets 14-16 Md€/an, +3-5%/an ; services offshore mondiaux) : pas de taille de marché unique fiable, market_size laissé NULL. Cluster Fos-Lavéra-Berre = 30% du raffinage français. Sources: synthèses FOLIO + UFIP/Xerfi, à confirmer.",
      "reglementaire":"Fenêtre d'exposition LIVE et non de compte à rebours : les dates majeures (EU ETS 1/1/2026, CBAM 1/4/2026, IED 2.0 1/7/2026) viennent de passer. Aucune échéance critical/high dans les 12 prochains mois (B2=0). Actionnable (« vous êtes exposés et pas prêts ») mais moins entrant qu'un secteur à deadline future.",
      "sources":[
        "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=OJ:L_202401785",
        "https://climate.ec.europa.eu/eu-action/transport-decarbonisation/reducing-emissions-shipping-sector_en",
        "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000048561059",
        "https://messervices.cyber.gouv.fr/nis2",
        "https://portail-rse.beta.gouv.fr/csrd/seuils-csrd-omnibus-criteres-d-application/",
        "https://www.ineos.com/fr/actualites/actualites-partagees/ineos-obtient-une-subvention-de-300-millions-deuros-du-gouvernement-francais-pour-moderniser-et-decarboner-son-site-de-lavera-et-reduire-les-emissions-de-co2-de-331-000-tonnes-par-an/",
        "https://www.vallourec.com/app/uploads/2025/12/press-release-vallourec-geostock.pdf",
        "https://www.economie.gouv.fr/entreprises/tout-savoir-sur-linterdiction-progressive-des-pfas"
      ]
    }$KREDO$::jsonb,
    NULL
  )
  ON CONFLICT (workspace_id, slug) DO UPDATE SET
    name = EXCLUDED.name, description = EXCLUDED.description, status = EXCLUDED.status,
    attractiveness_score = EXCLUDED.attractiveness_score,
    market_size_eur_bn = EXCLUDED.market_size_eur_bn,
    market_growth_pct = EXCLUDED.market_growth_pct,
    digital_maturity = EXCLUDED.digital_maturity,
    practices_fit = EXCLUDED.practices_fit,
    key_players_paca = EXCLUDED.key_players_paca,
    key_players_national = EXCLUDED.key_players_national,
    avg_tjm_min = EXCLUDED.avg_tjm_min, avg_tjm_max = EXCLUDED.avg_tjm_max,
    playbook = EXCLUDED.playbook,
    caveats = EXCLUDED.caveats,
    image_url = COALESCE(EXCLUDED.image_url, sector_intelligence.image_url)
  RETURNING id INTO v_sector_id;

  -- 2. Pain points (purge + réinsertion, idempotent)
  DELETE FROM sector_pain_points WHERE sector_id = v_sector_id;
  INSERT INTO sector_pain_points
    (workspace_id, sector_id, title, description, frequency_count, source_company_ids, kredo_practice, verbatim)
  VALUES
    (v_workspace_id, v_sector_id,
     $KREDO$Retard digital de l'outil industriel$KREDO$,
     $KREDO$Maturité digitale jugée faible à modérée sur les 5 comptes (site web parfois inaccessible, conduite au fil de l'eau). Besoins concrets : jumeaux numériques et monitoring IoT (Geostock), MES/DCS numériques (projet ABB chez Naphtachimie), digitalisation du trading et de la supply chain (Petroineos), gestion de flotte (Bourbon), traçabilité des flux déchets (Pizzorno).$KREDO$,
     5, ARRAY['53d6edab-038a-4adf-9b12-cf34c3c03f2f','81e91e38-7e35-4e3b-9bae-880060ddad4a','16dc1cd4-b697-4914-8f98-e9a3c60cb9a2','eed2a413-f55f-42c5-a77d-4a6bf93bddd5','6be376aa-c9a7-41ef-9f77-d759f7f12bc4']::uuid[],
     'data_ai', NULL),
    (v_workspace_id, v_sector_id,
     $KREDO$Reporting ESG/CSRD sans collecte de données fiable$KREDO$,
     $KREDO$Bourbon cite explicitement l'absence de systèmes de collecte de données ESG robustes ; Petroineos, Pizzorno et Geostock (via les exigences de leurs clients grands comptes) portent un risque de non-conformité au reporting extra-financier. La donnée existe mais n'est ni consolidée ni auditable.$KREDO$,
     4, ARRAY['53d6edab-038a-4adf-9b12-cf34c3c03f2f','81e91e38-7e35-4e3b-9bae-880060ddad4a','16dc1cd4-b697-4914-8f98-e9a3c60cb9a2','eed2a413-f55f-42c5-a77d-4a6bf93bddd5']::uuid[],
     'data_ai', NULL),
    (v_workspace_id, v_sector_id,
     $KREDO$Intégration SI après rachat (INEOS, Paprec)$KREDO$,
     $KREDO$Naphtachimie (rachat INEOS avril 2024, continuité des autorisations), Petroineos (actionnariat INEOS/PetroChina), Pizzorno (absorption Paprec, préservation de l'identité/SI) et Bourbon (nouveaux actionnaires financiers) traversent tous une phase d'intégration où le SI et la gouvernance de la donnée doivent être harmonisés.$KREDO$,
     4, ARRAY['6be376aa-c9a7-41ef-9f77-d759f7f12bc4','81e91e38-7e35-4e3b-9bae-880060ddad4a','16dc1cd4-b697-4914-8f98-e9a3c60cb9a2','53d6edab-038a-4adf-9b12-cf34c3c03f2f']::uuid[],
     'product', NULL),
    (v_workspace_id, v_sector_id,
     $KREDO$Chiffrer et financer la trajectoire de décarbonation$KREDO$,
     $KREDO$Bourbon (EU ETS, FuelEU, décarbonation de la flotte), Petroineos (ETS, RED III, biocarburants) et Naphtachimie (ETS/IED, objectif CO2 -15 à -25% d'ici 2030, subvention État conditionnée) doivent chiffrer et suivre des jalons de décarbonation qui conditionnent l'accès aux financements publics.$KREDO$,
     3, ARRAY['53d6edab-038a-4adf-9b12-cf34c3c03f2f','81e91e38-7e35-4e3b-9bae-880060ddad4a','6be376aa-c9a7-41ef-9f77-d759f7f12bc4']::uuid[],
     'data_ai', NULL),
    (v_workspace_id, v_sector_id,
     $KREDO$Fiabiliser l'exploitation après incidents Seveso$KREDO$,
     $KREDO$Naphtachimie a signalé des incidents en 2025 (risque DREAL, licence d'exploitation) ; Geostock porte le risque lié à la classification Seveso de ses sites. La donnée d'exploitation historisée reste sous-exploitée pour la fiabilité et la maintenance prédictive.$KREDO$,
     2, ARRAY['6be376aa-c9a7-41ef-9f77-d759f7f12bc4','eed2a413-f55f-42c5-a77d-4a6bf93bddd5']::uuid[],
     'data_ai', NULL),
    (v_workspace_id, v_sector_id,
     $KREDO$Sécuriser les systèmes industriels OT face à NIS2$KREDO$,
     $KREDO$Bourbon cite explicitement le risque de cyberattaque sur les systèmes de navigation/contrôle (NIS2) ; Naphtachimie modernise ses systèmes de contrôle numériques (projet ABB), élargissant la surface OT. La convergence IT/OT doit être sécurisée sans exposer la conduite des installations critiques.$KREDO$,
     2, ARRAY['53d6edab-038a-4adf-9b12-cf34c3c03f2f','6be376aa-c9a7-41ef-9f77-d759f7f12bc4']::uuid[],
     'cyber', NULL);

  -- 3. Réglementaire
  DELETE FROM sector_regulatory_items WHERE sector_id = v_sector_id;
  INSERT INTO sector_regulatory_items
    (workspace_id, sector_id, name, authority, description, deadline_date, urgency,
     kredo_practice, commercial_angle, is_commercial_window, source_url)
  VALUES
    (v_workspace_id, v_sector_id,
     $KREDO$Directive IED 2.0 (Émissions industrielles, UE 2024/1785)$KREDO$, 'EU',
     $KREDO$Transposition française au 1er juillet 2026. Impose aux ICPE (raffineries, incinérateurs, pétrochimie) des plans de transformation chiffrés vers les meilleures techniques disponibles, avec valeurs limites renforcées air/eau/déchets.$KREDO$,
     '2026-07-01', 'high', 'data_ai',
     $KREDO$Outiller le reporting d'émissions air/eau/déchets et le suivi des plans MTD — sortir du tableur pour une donnée auditable par la DREAL.$KREDO$, true,
     'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=OJ:L_202401785'),
    (v_workspace_id, v_sector_id,
     $KREDO$EU ETS — extension maritime 100% et suppression des quotas gratuits$KREDO$, 'EU',
     $KREDO$Depuis le 1er janvier 2026, 100% des émissions CO2 des navires (>5000 GT) sur routes UE sont soumises au marché carbone, méthane et N2O inclus. En parallèle, réduction des quotas gratuits industriels. Coût carbone en millions €/an pour l'offshore et le raffinage.$KREDO$,
     '2026-01-01', 'high', 'data_ai',
     $KREDO$Fiabiliser la mesure et l'allocation des émissions — le coût carbone devient un poste de marge à piloter par la donnée, pas un simple sujet de conformité.$KREDO$, true,
     'https://climate.ec.europa.eu/eu-action/transport-decarbonisation/reducing-emissions-shipping-sector_en'),
    (v_workspace_id, v_sector_id,
     $KREDO$MACF / CBAM — régime définitif$KREDO$, 'EU',
     $KREDO$Depuis le 1er janvier 2026, statut de déclarant MACF autorisé obligatoire pour importer acier, aluminium, engrais, hydrogène, ciment ; à défaut d'autorisation (ou demande en cours) au 1er avril 2026, la marchandise est bloquée. Première déclaration annuelle au 30 septembre 2027.$KREDO$,
     '2026-04-01', 'medium', 'data_ai',
     $KREDO$Structurer la collecte et le calcul des émissions incorporées des importations — donnée carbone traçable et déclaration automatisée.$KREDO$, true,
     'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000048561059'),
    (v_workspace_id, v_sector_id,
     $KREDO$NIS2 / Loi de résilience (cybersécurité)$KREDO$, 'FR',
     $KREDO$Transposition NIS2 : loi résilience examinée en hémicycle en juillet 2026, référentiel ANSSI (ReCyF) publié le 17 mars 2026. Les sites énergétiques et industriels critiques (Seveso, infrastructures essentielles) deviennent entités essentielles/importantes. Échéance de conformité à confirmer : ~3 ans après publication des exigences techniques.$KREDO$,
     NULL, 'high', 'cyber',
     $KREDO$Cartographier la convergence IT/OT et sécuriser les systèmes industriels historisés sans exposer la conduite Seveso — mise en conformité NIS2.$KREDO$, true,
     'https://messervices.cyber.gouv.fr/nis2'),
    (v_workspace_id, v_sector_id,
     $KREDO$CSRD après directive Omnibus (vague 2)$KREDO$, 'EU',
     $KREDO$L'Omnibus (adopté le 16/12/2025, en vigueur 18/03/2026) relève les seuils à plus de 1000 salariés ET plus de 450 M€ de CA et reporte la vague 2 (grandes entreprises non cotées) au premier rapport en 2028 sur l'exercice 2027. Correction majeure : bien moins urgent que ne l'annonçait FOLIO. ESRS allégé à environ 300 points de données.$KREDO$,
     '2028-01-01', 'medium', 'data_ai',
     $KREDO$Industrialiser dès maintenant la collecte auditable des ~300 points de données ESRS pour les comptes de la vague 2, plutôt que subir le rush 2027.$KREDO$, true,
     'https://portail-rse.beta.gouv.fr/csrd/seuils-csrd-omnibus-criteres-d-application/');

  -- 4. Trigger events (source_url UNIQUE au niveau table)
  DELETE FROM sector_events WHERE sector_id = v_sector_id;
  INSERT INTO sector_events
    (workspace_id, sector_id, title, event_type, description, event_date,
     commercial_opportunity, status, source_url)
  VALUES
    (v_workspace_id, v_sector_id,
     $KREDO$INEOS Lavéra : 300 M€ de subvention État pour décarboner$KREDO$, 'market',
     $KREDO$INEOS injecte 250 M€ (annoncés fin 2025) et obtient ~300 M€ de subvention de l'État (AO GPID 2026, sur 15 ans) pour moderniser et décarboner le site de Lavéra, soit 550 M€ au total, avec un objectif de -331 000 t CO2/an et un projet de décarbonation majeur programmé 2028-2030.$KREDO$,
     '2025-11-15',
     $KREDO$Se positionner sur le pilotage data du programme : suivi des jalons conditionnant la subvention, chiffrage des émissions, préparation de la phase 2028-2030.$KREDO$, 'pending',
     'https://www.ineos.com/fr/actualites/actualites-partagees/ineos-obtient-une-subvention-de-300-millions-deuros-du-gouvernement-francais-pour-moderniser-et-decarboner-son-site-de-lavera-et-reduire-les-emissions-de-co2-de-331-000-tonnes-par-an/'),
    (v_workspace_id, v_sector_id,
     $KREDO$Vallourec × Geostock : accord stockage H2/CCUS$KREDO$, 'market',
     $KREDO$Vallourec et Geostock signent le 18 décembre 2025 un accord de partenariat pour développer des solutions de stockage à grande échelle (hydrogène, CCUS), prolongeant le positionnement de Geostock dans le projet européen FrHyGe (démonstrateur de stockage souterrain d'hydrogène, 43 M€).$KREDO$,
     '2025-12-18',
     $KREDO$Accompagner la digitalisation du pivot hydrogène de Geostock : gestion de projet, systèmes d'information, jumeaux numériques des infrastructures de stockage.$KREDO$, 'pending',
     'https://www.vallourec.com/app/uploads/2025/12/press-release-vallourec-geostock.pdf'),
    (v_workspace_id, v_sector_id,
     $KREDO$Loi de résilience (NIS2) examinée en hémicycle$KREDO$, 'regulatory',
     $KREDO$Le projet de loi « résilience des infrastructures critiques et renforcement de la cybersécurité » (transposition NIS2) est examiné en hémicycle en juillet 2026 ; le référentiel ANSSI ReCyF a été publié le 17 mars 2026. Les sites énergétiques/industriels critiques basculeront en entités essentielles ou importantes.$KREDO$,
     '2026-07-01',
     $KREDO$Ouvrir la conversation cyber IT/OT sur les sites Seveso avant la désignation des entités : état des lieux de conformité NIS2 et sécurisation de la convergence.$KREDO$, 'pending',
     'https://www.legiscope.com/blog/transposition-nis2-france.html');

  -- 5. Rattachement des comptes : déjà fait (5/5 rattachés) — no-op de sécurité
  UPDATE companies SET sector_id = v_sector_id
  WHERE workspace_id = v_workspace_id
    AND id IN ('53d6edab-038a-4adf-9b12-cf34c3c03f2f','81e91e38-7e35-4e3b-9bae-880060ddad4a',
               '16dc1cd4-b697-4914-8f98-e9a3c60cb9a2','eed2a413-f55f-42c5-a77d-4a6bf93bddd5',
               '6be376aa-c9a7-41ef-9f77-d759f7f12bc4');

  RAISE NOTICE 'Secteur % injecté : %', 'energie-petrochimie-environnement', v_sector_id;
END
$migration$;
