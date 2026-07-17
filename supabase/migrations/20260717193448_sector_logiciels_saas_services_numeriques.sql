-- Étude sectorielle : Logiciels, SaaS & Services numériques
-- Corpus : riche — 9 comptes, 9 avec sector_analysis FOLIO + 1 process_diagnostic réel (Experis)
-- Score : 4.3/5 (plafond corpus riche : 5.0) — Gate 3 : ~93/100, Axe A 35/35
-- Sources : voir la section CAVEATS (Numeum/PAC, EUR-Lex/ec.europa.eu, EIOPA, economie.gouv.fr, ANSSI)

DO $migration$
DECLARE
  v_workspace_id uuid;
  v_sector_id    uuid;
BEGIN
  SELECT id INTO v_workspace_id FROM workspaces LIMIT 1;

  -- 1. La fiche (UPSERT : le secteur existe déjà en 'watch')
  INSERT INTO sector_intelligence (
    workspace_id, name, slug, description, status,
    attractiveness_score, market_size_eur_bn, market_growth_pct,
    digital_maturity, practices_fit, key_players_paca, key_players_national,
    avg_tjm_min, avg_tjm_max, playbook, caveats, image_url
  ) VALUES (
    v_workspace_id,
    $KREDO$Logiciels, SaaS & Services numériques$KREDO$,
    'logiciels-saas-services-numeriques',
    $KREDO$Éditeurs de logiciels, plateformes SaaS et services numériques du bassin PACA (cluster Sophia Antipolis dense). Fiche bâtie sur 9 comptes, tous dotés d'une analyse sectorielle FOLIO, et une ancre de preuve (process_diagnostic réel sur Experis). Le marché des éditeurs croît de +8,4 % en 2026 (31,6 Md€, Numeum) quand les ESN stagnent à +1,4 % : la valeur migre vers le produit. Gap de marché KREDO : absorber la couche conformité (Cyber Resilience Act, NIS2, AI Act, DORA) et l'industrialisation IA/cloud qui monopolise les meilleurs développeurs des éditeurs sans être leur différenciation. Fit maximal data_ai + cyber.$KREDO$,
    'active',
    4.3, 74.3, 4.3,
    'high',
    '{"data_ai": 5, "cyber": 5, "cloud_eng": 4, "product": 3}'::jsonb,
    $KREDO$[
      {"name":"Ansys (La Farlède)","size":"2,3 Md$ (groupe Synopsys)","note":"Éditeur mondial de simulation numérique, site varois. Racheté par Synopsys en 2025 : convergence EDA/simulation, intégration SI en cours."},
      {"name":"Ampère Software Factory (Sophia)","size":"539 M€","note":"Bras logiciel de Renault (SDV), centre de ~200 ingénieurs IA/software à Sophia Antipolis. Enjeu talent + conformité embarquée (AI Act, CRA, cyber véhicule)."},
      {"name":"Harvest (Sophia)","size":"120 M€","note":"WealthTech leader FR gestion de patrimoine. Prestataire TIC critique → DORA, plus AI Act sur ses modules de scoring."},
      {"name":"Sequoiasoft / Septeo Hospitality (Sophia)","size":"40 M€","note":"Éditeur SaaS hôtellerie-camping, intégré à Septeo. IA embarquée (Witbooking AI), intégration post-M&A et RGPD à harmoniser."},
      {"name":"CODIX (Sophia)","size":"36 M€","note":"Éditeur logiciel financier (iMX : affacturage, leasing, recouvrement). Multi-juridictions, DORA + NIS2 côté clients bancaires."},
      {"name":"Vulog (Nice)","size":"SaaS carsharing","note":"Leader européen SaaS autopartage. Données de mobilité (RGPD, Data Act), NIS2 sur infra de flotte connectée."},
      {"name":"Appolonia (Aix-en-Provence)","size":"6,8 M€","note":"PME tech. Illustre la douleur PME : cumul des mises en conformité (AI Act, NIS2, CRA) sans équipe dédiée."}
    ]$KREDO$::jsonb,
    $KREDO$[
      {"name":"Experis France","size":"238 M€ (ManpowerGroup)","note":"ESN / IT staffing, ancien client KREDO. Seule ancre de preuve du secteur (process_diagnostic réel). Cyber souveraine, AI Act, pénurie talents."},
      {"name":"Synopsys","size":"Géant EDA","note":"Acquéreur d'Ansys (35 Md$, juillet 2025). Référence de la consolidation du marché éditeurs."},
      {"name":"Septeo","size":"Éditeur européen","note":"Consolidateur (Sequoiasoft). Illustre l'intégration post-M&A comme moteur de projets SI."},
      {"name":"Dassault Systèmes","size":"Géant logiciel","note":"Concurrent d'Ansys (Simulia). Acteur français structurant du marché éditeurs."}
    ]$KREDO$::jsonb,
    210, 1260,
    $KREDO${
      "personas": [
        {"role":"DSI / CTO d'éditeur","enjeu":"Mettre le produit en conformité AI Act / CRA / NIS2 sans dérailler la roadmap ni mobiliser ses meilleurs développeurs","peur":"Bloquer une release ou perdre un appel d'offres institutionnel parce qu'un audit de sécurité a révélé un trou qu'on savait présent mais jamais traité"},
        {"role":"VP Engineering / Head of Product","enjeu":"Livrer les fonctions IA promises à la roadmap et les fiabiliser en production","peur":"Voir un concurrent mieux financé industrialiser son IA pendant que la nôtre reste un POC qui ne passe jamais en prod"},
        {"role":"RSSI / Responsable conformité","enjeu":"Passer NIS2, DORA et l'ISO 27001 attendus par les clients grands comptes","peur":"Être tenu personnellement responsable d'un incident notifiable qu'on n'a pas su détecter dans les 24h imposées par le CRA"},
        {"role":"DG / CEO d'éditeur PME","enjeu":"Financer la mise en conformité sans plomber la marge produit","peur":"Cumuler les coûts de mise en conformité de quatre réglementations en même temps et voir la marge fondre juste au moment de la levée ou du break-even"}
      ],
      "roi_arguments": [
        "Reporting CRA obligatoire au 11 septembre 2026 : alerte sous 24h, notification sous 72h pour toute vulnérabilité activement exploitée. Mettre en place la chaîne de détection/notification avant la date évite l'exposition réglementaire. Source: Commission européenne, CRA reporting obligations, en vigueur 11/09/2026.",
        "Obligations AI Act haut-risque reportées au 2 décembre 2027 (Digital Omnibus, feu vert du Conseil de l'UE le 29/06/2026), mais les obligations GPAI s'appliquent depuis le 2 août 2025. Cadrer la conformité IA maintenant lisse l'effort sur 18 mois au lieu d'un rush de dernière minute. Source: Commission européenne, AI Act / Digital Omnibus, juin 2026.",
        "Marché des éditeurs de logiciels en croissance de +8,4 % en 2026 (à 31,6 Md€) quand les ESN stagnent à +1,4 % : la valeur migre vers le produit, mais chaque euro de R&D doit se justifier. Source: Numeum / PAC, Observatoire de conjoncture, décembre 2025.",
        "Gains de productivité liés à l'IA estimés à +17 % en 2026 sur les fonctions concernées — sous condition de sortir l'IA du stade pilote (MLOps, qualité de la donnée). Potentiel à valider sur le contexte produit. Source: Numeum / PAC, décembre 2025 (productivité) ; estimation Kredo sur la mise en production.",
        "NIS2 : le référentiel ANSSI (ReCyF) est disponible depuis le 17 mars 2026, et l'ANSSI annonce ~3 ans pour la conformité complète. Démarrer la mise à niveau ISO 27001 dès maintenant, sans attendre la promulgation de la loi Résilience, évite le rush au moment de l'entrée en vigueur. Source: ANSSI, Référentiel Cyber France, mars 2026."
      ],
      "objections": [
        {"objection":"On est éditeur, on connaît notre code mieux que n'importe quelle ESN — pourquoi vous ?","reponse":"Justement : on ne touche pas à votre cœur produit. On absorbe la couche conformité (CRA, NIS2, AI Act) et l'industrialisation IA/cloud qui monopolise vos meilleurs développeurs alors qu'elle n'est pas votre différenciation. Vos équipes restent sur la feature qui vend."},
        {"objection":"Nos développeurs sont déjà dessus, on n'a pas besoin de renfort.","reponse":"Le sujet n'est pas la compétence, c'est le coût d'opportunité : chaque jour passé par un senior sur la documentation technique CRA ou un PIA RGPD est un jour retiré à la roadmap. On prend la conformité, vous gardez la vélocité produit — c'est exactement le « R&D qui pèse sur les marges » que décrivent les éditeurs du secteur."},
        {"objection":"Les échéances viennent de bouger — l'AI Act est reporté à 2027, rien ne presse.","reponse":"L'AI Act haut-risque a effectivement glissé au 2 décembre 2027, mais le CRA impose le reporting des vulnérabilités dès le 11 septembre 2026 et les obligations GPAI s'appliquent depuis août 2025. Le calendrier réel n'a pas disparu, il s'est étalé — et l'étaler, c'est précisément ce qui rend le chantier tenable si on le commence maintenant."}
      ],
      "entry_points": [
        "Réglementaire: Cyber Resilience Act — reporting obligatoire au 11/09/2026 : audit de la chaîne de détection et de notification des vulnérabilités produit",
        "Quick-win: Diagnostic conformité produit en 3 semaines — cartographie AI Act / CRA / NIS2 et plan d'action priorisé (audit 2-6 semaines)",
        "Transformation: Industrialisation de l'IA produit — passage du POC à la production (MLOps, qualité de la donnée, auditabilité) sur 6-12 mois",
        "Réseau: Écosystème Sophia Antipolis / SoFAB — introduction par un pair du cluster tech PACA (Ampère, Ansys, Harvest, CODIX, Vulog, Bioceanor)"
      ]
    }$KREDO$::jsonb,
    $KREDO${
      "verbatims":"Aucun verbatim client réel — les 2 seules interactions du secteur sont des mails rédigés par Kredo (workflow intel-020), pas de la parole client. Toute citation est donc absente, assumé.",
      "frequences":"Comptage tracé via source_company_ids sur les 9 comptes ; fréquences 9/9/6/6/4/3 vérifiables. Fondées sur l'environnement normatif FOLIO, non exhaustif.",
      "corpus":"Riche (9/9 comptes avec sector_analysis FOLIO + un process_diagnostic réel de 30k car. sur Experis). Réserve : ce diagnostic porte sur une ESN, alors que 8/9 comptes sont des éditeurs SaaS/logiciel — les pain points éditeurs sont bâtis sur le FOLIO des 8 éditeurs. Relationnel faible : 0 mission, 1 opportunité (Bioceanor 72k€).",
      "marche":"Chiffres Numeum / PAC (Observatoire de conjoncture, décembre 2025) : numérique France 74,3 Md€ (+4,3 %), éditeurs +8,4 % (31,6 Md€), ESN +1,4 % (35 Md€), productivité IA +17 % en 2026.",
      "sources":[
        "https://digital-strategy.ec.europa.eu/en/policies/cra-reporting",
        "https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai",
        "https://www.eiopa.europa.eu/digital-operational-resilience-act-dora_en",
        "https://www.economie.gouv.fr/tout-savoir-sur-la-facturation-electronique-pour-les-entreprises",
        "https://cyber.gouv.fr/la-directive-nis-2",
        "https://numeum.fr/economie-marche/tendances-du-marche-du-numerique-en-2025",
        "https://news.synopsys.com/2025-07-17-Synopsys-Completes-Acquisition-of-Ansys"
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

  -- 2. Pain points (purge + réinsertion, idempotent) — ordre = frequency_count DESC (le pitch dérive de [0..2])
  DELETE FROM sector_pain_points WHERE sector_id = v_sector_id;
  INSERT INTO sector_pain_points
    (workspace_id, sector_id, title, description, frequency_count, source_company_ids, kredo_practice, verbatim)
  VALUES
    (v_workspace_id, v_sector_id,
     $KREDO$Conformité produit AI Act + CRA sans casser la roadmap$KREDO$,
     $KREDO$Les 9 comptes citent l'AI Act dans leur environnement normatif ; le Cyber Resilience Act s'applique à tout produit numérique. La douleur est le coût R&D continu de la mise en conformité : Harvest parle d'« investissements R&D continus pesant sur les marges », Appolonia de la « complexité et du coût de la mise en conformité simultanée pour les PME tech », Ansys d'un « retard d'adaptation au CRA pouvant bloquer la commercialisation en Europe ».$KREDO$,
     9, ARRAY['73dbbebf-8828-4433-aea7-42ae549c9911','fb718599-0874-4f7b-a3f8-6797273e794e','1f3f1dd2-5f67-4509-943e-6e00d4e77ba6','aca9e5a3-6d3f-400e-bd63-0abe05355a6b','c641e823-e6fb-428f-b7f1-e9fa4961d170','e78af454-26b5-4cdd-ae78-1c5c711fd6da','667d4ac6-c138-4f7c-811f-f7222666ddf6','fe07ac45-c7ad-4f28-b269-fa5b14ab717d','3a001f07-2873-48af-afc0-79d865973600']::uuid[],
     'multi', NULL),
    (v_workspace_id, v_sector_id,
     $KREDO$Se mettre au niveau NIS2 sans équipe cyber dédiée$KREDO$,
     $KREDO$Les éditeurs, en tant que fournisseurs de services numériques, tombent dans le périmètre NIS2, mais peu de PME/ETI éditrices ont une équipe cyber structurée. CODIX craint « la perte de clients institutionnels en cas d'audit de sécurité défavorable (NIS2, ISO 27001) », Vulog « la non-conformité NIS2 sur les infrastructures de gestion de flotte connectée ». La certification ISO 27001 est demandée par les clients grands comptes des 9 comptes.$KREDO$,
     9, ARRAY['73dbbebf-8828-4433-aea7-42ae549c9911','fb718599-0874-4f7b-a3f8-6797273e794e','1f3f1dd2-5f67-4509-943e-6e00d4e77ba6','aca9e5a3-6d3f-400e-bd63-0abe05355a6b','c641e823-e6fb-428f-b7f1-e9fa4961d170','e78af454-26b5-4cdd-ae78-1c5c711fd6da','667d4ac6-c138-4f7c-811f-f7222666ddf6','fe07ac45-c7ad-4f28-b269-fa5b14ab717d','3a001f07-2873-48af-afc0-79d865973600']::uuid[],
     'cyber', NULL),
    (v_workspace_id, v_sector_id,
     $KREDO$Passer l'IA produit du pilote à la production$KREDO$,
     $KREDO$Course à l'IA embarquée : Sequoiasoft (moteur Witbooking AI), Ansys (solveurs SimAI), CODIX (scoring crédit / détection de fraude), Harvest (recommandation / scoring), Ampère (IA embarquée SDV), Bioceanor (modèles prédictifs qualité de l'eau). L'enjeu partagé est de sortir ces fonctions du stade pilote (MLOps, qualité de la donnée, auditabilité exigée par l'AI Act) pour les fiabiliser en production.$KREDO$,
     6, ARRAY['1f3f1dd2-5f67-4509-943e-6e00d4e77ba6','aca9e5a3-6d3f-400e-bd63-0abe05355a6b','e78af454-26b5-4cdd-ae78-1c5c711fd6da','667d4ac6-c138-4f7c-811f-f7222666ddf6','fb718599-0874-4f7b-a3f8-6797273e794e','3a001f07-2873-48af-afc0-79d865973600']::uuid[],
     'data_ai', NULL),
    (v_workspace_id, v_sector_id,
     $KREDO$Héberger la donnée sensible en conformité souveraine$KREDO$,
     $KREDO$Qualification SecNumCloud pour adresser le secteur public / OIV, souveraineté des données industrielles et Data Act sur les données produit. Appolonia et Experis citent SecNumCloud comme prérequis grands comptes ; Ansys la souveraineté des données de simulation ; Ampère et Vulog les obligations Data Act sur les données véhicule/mobilité ; Harvest l'hébergement cloud de données financières sensibles.$KREDO$,
     6, ARRAY['73dbbebf-8828-4433-aea7-42ae549c9911','c641e823-e6fb-428f-b7f1-e9fa4961d170','e78af454-26b5-4cdd-ae78-1c5c711fd6da','fb718599-0874-4f7b-a3f8-6797273e794e','fe07ac45-c7ad-4f28-b269-fa5b14ab717d','667d4ac6-c138-4f7c-811f-f7222666ddf6']::uuid[],
     'cloud_eng', NULL),
    (v_workspace_id, v_sector_id,
     $KREDO$Moderniser le socle technique sous pression M&A$KREDO$,
     $KREDO$La consolidation du marché (Sequoiasoft intégré à Septeo, Ansys racheté par Synopsys) impose l'intégration post-M&A des SI et l'harmonisation des pratiques data (RGPD entre Sequoiasoft/Thelis/Master Camping). CODIX doit adapter iMX à de multiples juridictions ; Harvest maintient un socle de 35 ans d'expertise réglementaire. Modernisation et dette technique sous contrainte de time-to-market.$KREDO$,
     4, ARRAY['1f3f1dd2-5f67-4509-943e-6e00d4e77ba6','e78af454-26b5-4cdd-ae78-1c5c711fd6da','aca9e5a3-6d3f-400e-bd63-0abe05355a6b','667d4ac6-c138-4f7c-811f-f7222666ddf6']::uuid[],
     'cloud_eng', NULL),
    (v_workspace_id, v_sector_id,
     $KREDO$Staffer les roadmaps produit malgré la pénurie IT$KREDO$,
     $KREDO$Pénurie structurelle de talents IT (Experis publie son Tech Talent Outlook Q1 2026 sur les pénuries mondiales). Ampère monte en puissance son centre de Sophia Antipolis (près de 200 ingénieurs IA/software) ; CODIX recrute en continu. Les éditeurs peinent à staffer leurs roadmaps produit, d'où un besoin d'augmentation de capacité ciblée.$KREDO$,
     3, ARRAY['c641e823-e6fb-428f-b7f1-e9fa4961d170','fb718599-0874-4f7b-a3f8-6797273e794e','aca9e5a3-6d3f-400e-bd63-0abe05355a6b']::uuid[],
     'multi', NULL);

  -- 3. Réglementaire (purge + réinsertion)
  DELETE FROM sector_regulatory_items WHERE sector_id = v_sector_id;
  INSERT INTO sector_regulatory_items
    (workspace_id, sector_id, name, authority, description, deadline_date, urgency,
     kredo_practice, commercial_angle, is_commercial_window, source_url)
  VALUES
    (v_workspace_id, v_sector_id,
     $KREDO$Cyber Resilience Act (CRA)$KREDO$, 'EU',
     $KREDO$Tout éditeur qui met sur le marché européen un produit comportant des éléments numériques doit, dès le 11 septembre 2026, notifier les vulnérabilités activement exploitées (alerte sous 24h, notification sous 72h). Les obligations « secure by design » et le marquage CE suivent au 11 décembre 2027.$KREDO$,
     '2026-09-11', 'critical', 'cyber',
     $KREDO$Auditer la chaîne de détection et de notification des vulnérabilités produit, la connecter à la plateforme de reporting unique (SRP/CSIRT), et outiller le suivi 24h/72h avant l'échéance.$KREDO$,
     true, 'https://digital-strategy.ec.europa.eu/en/policies/cra-reporting'),
    (v_workspace_id, v_sector_id,
     $KREDO$Facturation électronique obligatoire (France)$KREDO$, 'FR',
     $KREDO$Au 1er septembre 2026, toutes les entreprises assujetties à la TVA doivent recevoir des factures électroniques, et les grandes entreprises et ETI doivent les émettre via une plateforme agréée. Pour les éditeurs de logiciels de gestion, c'est une obligation de roadmap produit (connexion plateforme agréée, format Factur-X, e-reporting).$KREDO$,
     '2026-09-01', 'high', 'product',
     $KREDO$Intégrer la connectivité facturation électronique (plateforme agréée, e-reporting) dans les solutions de gestion des éditeurs servant des entreprises françaises.$KREDO$,
     true, 'https://www.economie.gouv.fr/tout-savoir-sur-la-facturation-electronique-pour-les-entreprises'),
    (v_workspace_id, v_sector_id,
     $KREDO$Règlement européen sur l'IA (AI Act)$KREDO$, 'EU',
     $KREDO$Les obligations GPAI s'appliquent depuis le 2 août 2025. Les obligations pour les systèmes à haut risque (Annexe III autonomes) ont été reportées au 2 décembre 2027 par le Digital Omnibus (feu vert du Conseil de l'UE le 29 juin 2026) — et au 2 août 2028 pour l'IA embarquée dans des produits réglementés (Annexe I). Tout éditeur qui embarque de l'IA doit classifier ses usages et documenter sa conformité.$KREDO$,
     '2027-12-02', 'high', 'data_ai',
     $KREDO$Cartographier les modules IA du produit par niveau de risque, mettre en place la documentation technique, la traçabilité et la supervision humaine exigées — en lissant l'effort sur la fenêtre allongée plutôt qu'en rush.$KREDO$,
     true, 'https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai'),
    (v_workspace_id, v_sector_id,
     $KREDO$DORA (Digital Operational Resilience Act)$KREDO$, 'EU',
     $KREDO$En vigueur depuis le 17 janvier 2025. Les éditeurs fournisseurs de services TIC aux entités financières (affacturage, gestion de patrimoine, assurance-crédit) sont dans le périmètre en tant que prestataires tiers critiques : résilience opérationnelle, registre de contrats, tests, reporting d'incidents. La supervision des prestataires critiques monte en puissance en 2025-2026.$KREDO$,
     '2025-01-17', 'medium', 'cyber',
     $KREDO$Accompagner les éditeurs fintech (Harvest, CODIX) dans la conformité DORA de leur solution : tests de résilience, gestion des incidents, documentation contractuelle attendue par leurs clients bancaires.$KREDO$,
     true, 'https://www.eiopa.europa.eu/digital-operational-resilience-act-dora_en'),
    (v_workspace_id, v_sector_id,
     $KREDO$Directive NIS2 (loi Résilience française)$KREDO$, 'FR',
     $KREDO$La transposition française (loi Résilience) n'est toujours pas promulguée à l'été 2026 — la France a été renvoyée devant la CJUE le 8 juillet 2026 pour transposition incomplète. Échéance dure à confirmer. Mais le Référentiel Cyber France (ReCyF) de l'ANSSI est disponible depuis le 17 mars 2026 : les éditeurs classés « entités importantes » (≥50 salariés ou >10 M€ de CA) peuvent se mettre à niveau dès maintenant.$KREDO$,
     NULL, 'high', 'cyber',
     $KREDO$Démarrer la mise à niveau cyber (ISO 27001, gestion des risques, notification d'incidents) sur la base du ReCyF sans attendre la promulgation, pour lisser l'effort sur les ~3 ans annoncés par l'ANSSI.$KREDO$,
     true, 'https://cyber.gouv.fr/la-directive-nis-2');

  -- 4. Trigger events (source_url UNIQUE au niveau de la table entière)
  DELETE FROM sector_events WHERE sector_id = v_sector_id;
  INSERT INTO sector_events
    (workspace_id, sector_id, title, event_type, description, event_date,
     commercial_opportunity, status, source_url)
  VALUES
    (v_workspace_id, v_sector_id,
     $KREDO$Synopsys finalise le rachat d'Ansys (35 Md$)$KREDO$, 'competitor',
     $KREDO$Le 17 juillet 2025, Synopsys a finalisé l'acquisition d'Ansys pour 35 Md$, créant un poids lourd EDA + simulation. Intégration SI en cours, y compris sur le site varois de La Farlède.$KREDO$,
     '2025-07-17',
     $KREDO$Approcher les éditeurs en consolidation (Ansys, mais aussi Sequoiasoft/Septeo) sur l'intégration post-M&A des SI et la rationalisation des socles techniques.$KREDO$,
     'pending', 'https://news.synopsys.com/2025-07-17-Synopsys-Completes-Acquisition-of-Ansys'),
    (v_workspace_id, v_sector_id,
     $KREDO$AI Act : le Digital Omnibus reporte les échéances haut-risque$KREDO$, 'regulatory',
     $KREDO$Fin juin 2026, le Conseil de l'UE a validé le Digital Omnibus reportant les obligations AI Act haut-risque de août 2026 à décembre 2027 (Annexe III) / août 2028 (Annexe I). Les échéances ont bougé — beaucoup d'éditeurs ne savent plus ce qui s'applique.$KREDO$,
     '2026-06-29',
     $KREDO$Appeler pour clarifier le calendrier réellement applicable (GPAI en vigueur, haut-risque décalé) et proposer un cadrage de conformité IA lissé sur la fenêtre allongée.$KREDO$,
     'pending', 'https://artificialintelligenceact.eu/implementation-timeline/'),
    (v_workspace_id, v_sector_id,
     $KREDO$Cyber Resilience Act : reporting des vulnérabilités dans < 2 mois$KREDO$, 'regulatory',
     $KREDO$À partir du 11 septembre 2026, tout éditeur doit notifier les vulnérabilités activement exploitées (24h/72h). Échéance dure et imminente qui touche l'ensemble des produits numériques.$KREDO$,
     '2026-09-11',
     $KREDO$Motif d'appel à froid le plus fort du secteur : proposer un audit express de la chaîne de détection/notification avant l'échéance.$KREDO$,
     'pending', 'https://digital-strategy.ec.europa.eu/en/policies/cyber-resilience-act'),
    (v_workspace_id, v_sector_id,
     $KREDO$Facturation électronique : obligation au 1er septembre 2026$KREDO$, 'market',
     $KREDO$Au 1er septembre 2026, réception obligatoire pour toutes les entreprises et émission pour les grandes entreprises/ETI. Les éditeurs de logiciels de gestion doivent avoir intégré la connectivité plateforme agréée.$KREDO$,
     '2026-09-01',
     $KREDO$Approcher les éditeurs de logiciels de gestion (Sequoiasoft, CODIX, Harvest) sur l'intégration e-invoicing / e-reporting dans leur roadmap produit.$KREDO$,
     'pending', 'https://www.urssaf.fr/accueil/actualites/facturation-electronique.html');

  -- 5. Rattachement des comptes (déjà rattachés en base — idempotent)
  UPDATE companies SET sector_id = v_sector_id
  WHERE workspace_id = v_workspace_id
    AND id IN (
      '73dbbebf-8828-4433-aea7-42ae549c9911','fb718599-0874-4f7b-a3f8-6797273e794e',
      '1f3f1dd2-5f67-4509-943e-6e00d4e77ba6','aca9e5a3-6d3f-400e-bd63-0abe05355a6b',
      'c641e823-e6fb-428f-b7f1-e9fa4961d170','e78af454-26b5-4cdd-ae78-1c5c711fd6da',
      '667d4ac6-c138-4f7c-811f-f7222666ddf6','fe07ac45-c7ad-4f28-b269-fa5b14ab717d',
      '3a001f07-2873-48af-afc0-79d865973600'
    );

  RAISE NOTICE 'Secteur % injecté : %', 'logiciels-saas-services-numeriques', v_sector_id;
END
$migration$;
