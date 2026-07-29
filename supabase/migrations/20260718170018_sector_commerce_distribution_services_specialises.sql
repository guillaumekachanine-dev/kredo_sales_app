-- Étude sectorielle : Commerce, Distribution & Services spécialisés
-- Corpus : moyen — 12 comptes, 10 avec sector_analysis FOLIO, AUCUNE ancre de preuve
-- Score : 3.9/5 (plafond corpus : 4.5)
-- Sources : voir la section CAVEATS (economie.gouv.fr, EUR-Lex, DGCCRF, ANSSI, FEVAD)

DO $migration$
DECLARE
  v_workspace_id uuid;
  v_sector_id    uuid;
BEGIN
  SELECT id INTO v_workspace_id FROM workspaces LIMIT 1;

  -- 1. La fiche (UPSERT : le secteur 'watch' existe déjà)
  INSERT INTO sector_intelligence (
    workspace_id, name, slug, description, status,
    attractiveness_score, market_size_eur_bn, market_growth_pct,
    digital_maturity, practices_fit, key_players_paca, key_players_national,
    avg_tjm_min, avg_tjm_max, playbook, caveats, image_url
  ) VALUES (
    v_workspace_id,
    $KREDO$Commerce, Distribution & Services spécialisés$KREDO$,
    'commerce-distribution-services-specialises',
    $KREDO$Secteur transverse regroupant distribution/négoce, e-commerce et services spécialisés en réseau (intérim, télésurveillance, services auto, franchises). Thèse commune : entreprises de volume à marge serrée, réseaux multi-sites, forte intensité en données client, maturité digitale faible-à-moyenne, exposées à la désintermédiation par les pure players. Fiche adossée à 10 comptes FOLIO sur 12 (dense cluster PACA), sans ancre de preuve client ni verbatim — plafond 4,5, score 3,9. Fenêtre d'entrée majeure : facturation électronique obligatoire au 1er septembre 2026.$KREDO$,
    'active',
    3.9, NULL, NULL,
    'medium',
    '{"data_ai": 4, "cloud_eng": 3, "product": 4, "cyber": 4}'::jsonb,
    $KREDO$[
      {"name":"Groupe Ippolito","size":"299 M€","note":"Conglomérat familial PACA multi-branches (Villeneuve-Loubet, 74 établissements) — site web faible, pas de plateforme client. Cible prioritaire du diagnostic par étapes."},
      {"name":"Euro Protection Surveillance (Homiris)","size":"269 M€","note":"Télésurveillance, 700 000 abonnés — déjà accompagné par Kredo (mission SecOps). Exposé NIS2/RGPD/AI Act."},
      {"name":"Ubaldi","size":"233 M€","note":"E-commerce électroménager (Carros) — mission UX/UI Kredo réelle. Cœur de cible expérience digitale + accessibilité."},
      {"name":"Malongo","size":"127 M€","note":"Torréfacteur/distributeur (Nice) — marque premium, canal retail + B2B à digitaliser."},
      {"name":"Retif","size":"121 M€","note":"Équipement de magasin (Villeneuve-Loubet, 66 showrooms), racheté par Raja en 2024 — intégration post-M&A, omnicanalité, IA propriétaire Aiva."},
      {"name":"Giraudi","size":"100 M€","note":"Négoce de viande premium (Monaco, 300+ distributeurs) — pression réglementaire filière, chaîne de valeur intégrée."},
      {"name":"MP SA (AVATACAR)","size":"Réseau 1500 garages","note":"Modèle phygital services auto (Mandelieu) — enjeu explicite d'homogénéité de service sur réseau d'indépendants."}
    ]$KREDO$::jsonb,
    $KREDO$[
      {"name":"Adecco","size":"5,8 Mds€","note":"Leader intérim (900+ agences) — menacé par les plateformes (Iziwork, Malt), IA de recrutement = haut risque AI Act."},
      {"name":"Amazon / pure players","size":"Géant","note":"Référence de désintermédiation citée dans la plupart des analyses : capte trafic et marge des acteurs physiques."},
      {"name":"Raja","size":"Leader européen emballage","note":"Acquéreur de Retif (2024) — 27 sociétés, 19 pays. Illustre la consolidation du secteur."},
      {"name":"Verisure / Sector Alarm","size":"Leaders télésurveillance","note":"Concurrents d'EPS aux moyens marketing considérables."}
    ]$KREDO$::jsonb,
    500, 800,
    $KREDO${
      "personas": [
        {"role":"DSI / Responsable SI (groupe multi-branches)","enjeu":"Moderniser le SI et outiller les branches sans big bang","peur":"Lancer un chantier structurant qui déstabilise l'exploitation quotidienne des points de vente pendant que les pure players prennent de l'avance"},
        {"role":"Directeur e-commerce / Digital","enjeu":"Faire converger le magasin et le digital (omnicanal)","peur":"Voir le trafic et la marge captés par Amazon et les pure players faute d'une expérience digitale à la hauteur"},
        {"role":"DAF / Secrétaire général","enjeu":"Absorber la vague réglementaire (e-facture, NIS2, AI Act) dans les délais","peur":"Être pris de court par l'échéance du 1er septembre et bloquer la facturation, donc l'encaissement"},
        {"role":"Directeur de réseau / d'exploitation (franchises, affiliés)","enjeu":"Garantir une qualité de service homogène sur un réseau d'indépendants","peur":"Découvrir via un avis client viral qu'un franchisé dégrade la marque de tout le réseau"}
      ],
      "roi_arguments": [
        "Facturation électronique : audit de préparation des flux et choix de plateforme (PDP) en 2-4 semaines avant l'échéance de réception obligatoire du 1er septembre 2026. Source: calendrier officiel economie.gouv.fr.",
        "Accessibilité (RGAA 4.1.2) d'un site e-commerce : évite jusqu'à 50 000 € de sanction par service et 25 000 € pour absence de déclaration. Source: DGCCRF / economie.gouv.fr, European Accessibility Act en vigueur depuis le 28/06/2025.",
        "Conformité IA au recrutement (tri de CV, scoring) : cadrage supervision humaine et documentation avant l'échéance haut risque du 2 août 2026 (report proposé au 2 décembre 2027). Source: Règlement (UE) 2024/1689, EUR-Lex.",
        "Expérience client digitale : le e-commerce croît de +4 % quand le retail physique recule de -0,6 % ; un audit omnicanal de 4-6 semaines chiffre le manque à gagner. Source: FEVAD, bilan e-commerce 2026 (196,4 Mds€, 11/02/2026).",
        "Pilotage réseau : cartographie outillée de la qualité de service sur un réseau d'indépendants (type 1 500 garages affiliés, 900 agences). Potentiel de pilotage significatif, à valider sur le contexte client. Source: estimation Kredo, justifiée par les tailles de réseau observées au corpus (AVATACAR, Adecco)."
      ],
      "objections": [
        {"objection":"La facturation électronique, notre expert-comptable ou notre éditeur s'en occupe déjà.","reponse":"La plateforme gère le format, pas la qualité de vos données tiers, ni l'intégration à votre ERP et à vos caisses multi-sites, ni le e-reporting. C'est là que les rejets bloquent l'encaissement — et c'est précisément ce qu'on sécurise en amont de l'échéance."},
        {"objection":"On n'est pas une entreprise tech, le digital n'est pas notre métier.","reponse":"Justement, vous n'avez pas à le devenir. On avance par étapes concrètes ancrées dans vos branches existantes, pas par un grand projet global — l'angle déjà proposé au Groupe Ippolito : par où commencer sans déstabiliser ce qui fonctionne déjà."},
        {"objection":"Les pure players sont trop en avance, on ne les rattrapera jamais.","reponse":"L'enjeu n'est pas de battre Amazon sur son terrain, mais de tenir le vôtre : maillage physique local, réseau, données propriétaires. On outille ce que le pure player n'a pas — votre proximité et votre relation client — plutôt que de vous mettre en concurrence frontale."}
      ],
      "entry_points": [
        "Réglementaire: facturation électronique — audit de préparation avant l'échéance de réception obligatoire du 1er septembre 2026.",
        "Quick-win: audit d'accessibilité RGAA d'un site e-commerce en 2-4 semaines (European Accessibility Act).",
        "Transformation: feuille de route omnicanale magasin vers digital et valorisation de la donnée client (6-12 mois).",
        "Réseau: introduction par un pair du bassin azuréen — 10 des 12 comptes sont en PACA (Nice, Villeneuve-Loubet, Monaco, Carros)."
      ]
    }$KREDO$::jsonb,
    $KREDO${
      "verbatims": "Aucun verbatim client réel — les 2 seules interactions du secteur sont des e-mails sortants générés par Kredo (relances Groupe Ippolito), pas de la parole client.",
      "frequences": "Comptage tracé par source_company_ids sur les 10 comptes disposant d'une analyse FOLIO ; non exhaustif. Ubaldi et Malongo (sans FOLIO) ne sont pas comptés dans les pains.",
      "corpus": "Matière FOLIO riche (10/12 comptes) mais aucune ancre de preuve (0 client, 0 diagnostic réel) — plafond de score 4,5. 2 missions réelles (cyber EPS, design Ubaldi) = fit partiel.",
      "marche": "Secteur hétérogène (intérim, négoce alimentaire, télésurveillance, e-commerce, presse) sans taille de marché unique crédible — market_size laissé NULL. Chiffres e-commerce (196,4 Mds€, +7 %, FEVAD 2026) en proxy de digitalisation.",
      "sources": [
        "https://www.economie.gouv.fr/tout-savoir-sur-la-facturation-electronique-pour-les-entreprises",
        "https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/la-nouvelle-directive-europeenne-accessibilite-pour-des-produits-et-des-services-accessibles-aux-personnes-en-situation",
        "https://eur-lex.europa.eu/eli/reg/2024/1689/oj",
        "https://monespacenis2.cyber.gouv.fr",
        "https://www.fevad.com/chiffres-cles-ecommerce-2026/"
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
     $KREDO$Expérience client digitale en retard sur les pure players$KREDO$,
     $KREDO$Site web faible, absence de plateforme client intégrée, omnicanalité inachevée : cité comme chantier prioritaire dans 7 analyses FOLIO (Ippolito « faiblesse du site web et absence de plateforme client », Interima « digitalisation de l'expérience client et candidat », Retif « renforcement de l'omnicanalité »). Une mission UX/UI réelle chez Ubaldi confirme le besoin.$KREDO$,
     7, ARRAY['96f768b1-9fcc-4710-aa4c-c84d1d121211','00132e7b-1f38-4c07-a009-b18b4e6ac34b','658b2668-d787-43a1-b3ee-bf0e61ef6401','850594ce-e4b4-470b-83ea-40e07893ee9d','1ff83806-3d98-4f95-8b0e-92d9d38dc004','bc2c7b51-816c-40b0-be16-0d2ef7cc572b','8de1ba98-d33b-4c10-83bc-a64edeada740']::uuid[],
     'product', NULL),
    (v_workspace_id, v_sector_id,
     $KREDO$Désintermédiation par les plateformes et pure players$KREDO$,
     $KREDO$Menace de captation de la valeur par les plateformes numériques : Adecco (Iziwork, Malt), Interima (« désintermédiation des plateformes »), AVATACAR (07ZR, Gettygo), Retif (« pure players sur les segments standardisés »), Nice Matin (Google, Meta), EPS (pure players prix), Depil Tech (IPL grand public).$KREDO$,
     7, ARRAY['a307cb07-1253-4861-bf1a-53ec23b6f063','00132e7b-1f38-4c07-a009-b18b4e6ac34b','faab9fe5-eafd-47d7-a3b6-444cbafb3db3','1ff83806-3d98-4f95-8b0e-92d9d38dc004','850594ce-e4b4-470b-83ea-40e07893ee9d','8de1ba98-d33b-4c10-83bc-a64edeada740','658b2668-d787-43a1-b3ee-bf0e61ef6401']::uuid[],
     'product', NULL),
    (v_workspace_id, v_sector_id,
     $KREDO$Piloter un réseau multi-sites sans homogénéité de service$KREDO$,
     $KREDO$Réseaux d'agences, de franchises ou d'affiliés indépendants difficiles à piloter : AVATACAR l'explicite (« maintenir l'homogénéité de la qualité de service sur un réseau d'indépendants par nature hétérogène », 1 500 garages), Adecco (900 agences), Retif (66 showrooms), Interima (6 agences), Depil Tech (franchises), Giraudi (300+ distributeurs).$KREDO$,
     6, ARRAY['1ff83806-3d98-4f95-8b0e-92d9d38dc004','a307cb07-1253-4861-bf1a-53ec23b6f063','850594ce-e4b4-470b-83ea-40e07893ee9d','00132e7b-1f38-4c07-a009-b18b4e6ac34b','658b2668-d787-43a1-b3ee-bf0e61ef6401','391b5559-03ce-4168-b417-e93832a8d5ef']::uuid[],
     'data_ai', NULL),
    (v_workspace_id, v_sector_id,
     $KREDO$Vague réglementaire (RGPD, NIS2, e-facture) non outillée$KREDO$,
     $KREDO$Empilement de conformités subi sans outillage : EPS (« RGPD, NF A2P, NIS2, AI Act »), Ippolito (« politique RSE/ESG formalisée impérative »), Giraudi (« pression réglementaire filière viande »), Interima (Qualiopi, RSE). La facturation électronique s'ajoute et touche tout le parc.$KREDO$,
     4, ARRAY['faab9fe5-eafd-47d7-a3b6-444cbafb3db3','96f768b1-9fcc-4710-aa4c-c84d1d121211','391b5559-03ce-4168-b417-e93832a8d5ef','00132e7b-1f38-4c07-a009-b18b4e6ac34b']::uuid[],
     'multi', NULL),
    (v_workspace_id, v_sector_id,
     $KREDO$Donnée client propriétaire riche mais sous-exploitée$KREDO$,
     $KREDO$Des bases client/audience substantielles peu valorisées : Nice Matin (« monétisation avancée de la data audience propriétaire »), EPS (700 000 abonnés Homiris), AVATACAR (plateforme fédérant 1 500 garages, données parc). Levier data/IA identifié mais non outillé.$KREDO$,
     3, ARRAY['8de1ba98-d33b-4c10-83bc-a64edeada740','faab9fe5-eafd-47d7-a3b6-444cbafb3db3','1ff83806-3d98-4f95-8b0e-92d9d38dc004']::uuid[],
     'data_ai', NULL);

  -- 3. Réglementaire
  DELETE FROM sector_regulatory_items WHERE sector_id = v_sector_id;
  INSERT INTO sector_regulatory_items
    (workspace_id, sector_id, name, authority, description, deadline_date, urgency,
     kredo_practice, commercial_angle, is_commercial_window, source_url)
  VALUES
    (v_workspace_id, v_sector_id,
     $KREDO$Facturation électronique B2B obligatoire (réforme France)$KREDO$, 'FR',
     $KREDO$Au 1er septembre 2026, toutes les entreprises assujetties à la TVA doivent pouvoir recevoir une facture électronique, et les grandes entreprises et ETI doivent l'émettre via une plateforme agréée (PME/TPE au 1er septembre 2027). Rejets de flux = encaissement bloqué.$KREDO$,
     '2026-09-01', 'critical', 'data_ai',
     $KREDO$Audit de préparation des flux de facturation, choix de plateforme (PDP), intégration ERP/caisse multi-sites et fiabilisation des données tiers avant l'échéance de réception.$KREDO$,
     true, 'https://www.economie.gouv.fr/tout-savoir-sur-la-facturation-electronique-pour-les-entreprises'),
    (v_workspace_id, v_sector_id,
     $KREDO$European Accessibility Act — accessibilité numérique$KREDO$, 'EU',
     $KREDO$En vigueur depuis le 28/06/2025 : tout service B2C numérique (e-commerce, média, réservation) d'une entreprise de +10 salariés et +2 M€ de CA doit être accessible (RGAA 4.1.2 / EN 301 549). Fin de la période de transition pour les services préexistants le 28/06/2030. Sanctions jusqu'à 50 000 €/service (ARCOM).$KREDO$,
     '2030-06-28', 'high', 'product',
     $KREDO$Audit d'accessibilité RGAA d'un site e-commerce ou d'une application B2C, plan de mise en conformité et déclaration d'accessibilité.$KREDO$,
     true, 'https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/la-nouvelle-directive-europeenne-accessibilite-pour-des-produits-et-des-services-accessibles-aux-personnes-en-situation'),
    (v_workspace_id, v_sector_id,
     $KREDO$AI Act — systèmes d'IA à haut risque (recrutement)$KREDO$, 'EU',
     $KREDO$Les outils d'IA de recrutement (tri de CV, scoring, présélection) sont classés « haut risque » : transparence, supervision humaine, documentation. Échéance du 2 août 2026 juridiquement en vigueur ; report proposé au 2 décembre 2027 (accord politique provisoire du 7 mai 2026, non encore formellement adopté).$KREDO$,
     '2026-08-02', 'high', 'data_ai',
     $KREDO$Cadrage de conformité IA-RH pour les acteurs de l'intérim (supervision humaine, logs, information des candidats) et gouvernance des outils IA déployés en interne.$KREDO$,
     true, 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj'),
    (v_workspace_id, v_sector_id,
     $KREDO$NIS2 — cybersécurité des entités essentielles et importantes$KREDO$, 'FR',
     $KREDO$Transposition française (loi Résilience) attendue à l'été 2026 mais non promulguée à ce jour — échéance à confirmer. Le pré-enregistrement des entités sur MonEspaceNIS2 (ANSSI) est ouvert depuis novembre 2025. Concerne les acteurs >250 salariés / >50 M€ de CA de secteurs couverts.$KREDO$,
     NULL, 'high', 'cyber',
     $KREDO$Pré-cartographie du SI et trajectoire de conformité NIS2 (EPS/Homiris déjà accompagné par Kredo sur le volet SecOps) — anticiper avant la publication des décrets techniques.$KREDO$,
     true, 'https://monespacenis2.cyber.gouv.fr');

  -- 4. Trigger events (source_url UNIQUE au niveau table)
  DELETE FROM sector_events WHERE sector_id = v_sector_id;
  INSERT INTO sector_events
    (workspace_id, sector_id, title, event_type, description, event_date,
     commercial_opportunity, status, source_url)
  VALUES
    (v_workspace_id, v_sector_id,
     $KREDO$FEVAD — bilan e-commerce 2026 : 196,4 Mds€ (+7 %)$KREDO$, 'market',
     $KREDO$La FEVAD publie (11/02/2026) un e-commerce français à 196,4 Mds€, +7 %, quand le retail physique recule de -0,6 %. Preuve chiffrée du basculement digital.$KREDO$, '2026-02-11',
     $KREDO$Ouvrir la conversation « votre canal digital sous-performe-t-il le marché ? » avec un chiffre récent et incontestable.$KREDO$, 'pending',
     'https://www.fevad.com/chiffres-cles-ecommerce-2026/'),
    (v_workspace_id, v_sector_id,
     $KREDO$ANSSI — version de travail du référentiel ReCyF (NIS2)$KREDO$, 'regulatory',
     $KREDO$L'ANSSI a présenté le 17/03/2026 la version de travail du Référentiel Cyber France (ReCyF), détaillant les mesures recommandées pour NIS2 avant les décrets.$KREDO$, '2026-03-17',
     $KREDO$Proposer une pré-cartographie NIS2 pendant la fenêtre d'accompagnement, avant la publication des exigences techniques.$KREDO$, 'pending',
     'https://cyber.gouv.fr/nis2'),
    (v_workspace_id, v_sector_id,
     $KREDO$AI Act — report proposé de l'échéance haut risque$KREDO$, 'regulatory',
     $KREDO$Accord politique provisoire du 07/05/2026 proposant de reporter l'échéance des SIA haut risque (annexe III) du 2 août 2026 au 2 décembre 2027 — non encore formellement adopté.$KREDO$, '2026-05-07',
     $KREDO$Utiliser le délai proposé pour cadrer sereinement la conformité IA-RH des acteurs de l'intérim, sans précipitation.$KREDO$, 'pending',
     'https://www.wenvision.com/fr/articles/ai-act-report-echeance-aout-2026-systemes-ia-haut-risque/'),
    (v_workspace_id, v_sector_id,
     $KREDO$Compte à rebours facturation électronique — 1er septembre 2026$KREDO$, 'regulatory',
     $KREDO$L'obligation de réception des factures électroniques s'applique à toutes les entreprises au 1er septembre 2026 : fenêtre d'audit de préparation très courte.$KREDO$, '2026-09-01',
     $KREDO$Déclencher un audit de préparation express (flux, PDP, données tiers) sur les comptes non prêts avant l'échéance.$KREDO$, 'pending',
     'https://www.impots.gouv.fr/sites/default/files/media/1_metier/2_professionnel/EV/2_gestion/290_facturation_electronique/fiche-1_que-va-t-il-se-passer-pour-mon-entreprise.pdf');

  -- 5. Rattachement des comptes : déjà fait (12/12 rattachés) — pas de UPDATE nécessaire.

  RAISE NOTICE 'Secteur % injecté : %', 'commerce-distribution-services-specialises', v_sector_id;
END
$migration$;
