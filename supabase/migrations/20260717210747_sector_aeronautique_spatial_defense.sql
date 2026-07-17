-- Étude sectorielle : Aéronautique, Spatial & Défense
-- Corpus : mince — 3 comptes, 2 avec sector_analysis FOLIO (Exail, ACRI-ST)
-- Score : 4.0/5 (plafond corpus mince : 4.0)
-- Ancre : Exail Robotics (client) + mission Cloud/DevOps réelle (700€/j) + opp Cloud souverain réelle
-- Sources : voir section caveats

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
    $KREDO$Aéronautique, Spatial & Défense$KREDO$,
    'aeronautique-spatial-defense',
    $KREDO$Secteur souverain à double moteur en PACA : Spatial (observation de la Terre, New Space) et Défense (robotique autonome, navigation). Fit KREDO porté par un socle réglementaire commun et déjà éprouvé — cloud souverain SecNumCloud, cybersécurité NIS2, gouvernance IA Act — avec une preuve de delivery réelle chez Exail Robotics (mission Cloud/DevOps active, 700 €/j). Corpus mince (2 comptes FOLIO denses + 1 ancre client) : fiche à densité limitée mais traçabilité forte, score plafonné à 4.0.$KREDO$,
    'active',
    4.0, NULL, 10.0,
    'medium',
    '{"data_ai": 4, "cloud_eng": 5, "product": 2, "cyber": 5}'::jsonb,
    $KREDO$[
      {"name":"Exail Robotics","size":"373 M€ · 2000 pers.","note":"Client KREDO (La Garde). Champion européen robotique navale autonome ; carnet record 844 M€. Mission Cloud/DevOps active."},
      {"name":"ACRI-ST","size":"25 M€ · 116 pers.","note":"Prospect (Sophia-Antipolis). PME New Space, observation de la Terre, proche du CNES ; extension CERGA/Grasse."},
      {"name":"Thalès Alénia Space","size":"Géant (site Cannes)","note":"Prospect. Constructeur de satellites ; porte d'entrée spatial institutionnel du bassin azuréen."}
    ]$KREDO$::jsonb,
    $KREDO$[
      {"name":"Airbus Defence and Space","size":"Géant","note":"Leader européen spatial et défense — donneur d'ordre et intégrateur."},
      {"name":"Thales","size":"Géant","note":"Défense, aéronautique, cyber ; forte présence marchés souverains."},
      {"name":"Safran","size":"Géant","note":"Propulsion et équipements aéronautiques ; montée en cadence industrielle."},
      {"name":"Dassault Aviation","size":"Géant","note":"Aéronautique de défense (Rafale) ; écosystème de sous-traitants."},
      {"name":"ArianeGroup","size":"Géant","note":"Lanceurs et accès à l'espace ; souveraineté spatiale européenne."}
    ]$KREDO$::jsonb,
    600, 850,
    $KREDO${
      "personas": [
        {"role":"DSI / Responsable Sécurité SI (industriel défense)","enjeu":"Souverainiser et sécuriser le SI face à NIS2 et à l'obligation SecNumCloud sur les marchés publics.","peur":"Qu'un incident cyber ou une non-conformité SecNumCloud disqualifie l'entreprise d'un appel d'offres défense ou bloque une exportation."},
        {"role":"Directeur Industriel / Opérations","enjeu":"Tenir les délais de livraison d'un carnet de commandes en forte hausse.","peur":"Voir le carnet record se transformer en retards et pénalités faute d'avoir industrialisé et digitalisé la production à temps."},
        {"role":"Responsable Data / Innovation (spatial)","enjeu":"Valoriser les données satellitaires avec une IA conforme et compétitive.","peur":"Décrocher technologiquement face à Planet Labs et Maxar pendant que l'open data Copernicus érode la valeur des données brutes."},
        {"role":"Directeur Général (PME New Space)","enjeu":"Diversifier vers les marchés privés et le New Space au-delà du CNES.","peur":"Rester prisonnier des cycles budgétaires publics et se faire absorber dans la consolidation du secteur."}
      ],
      "roi_arguments": [
        "Migration vers un cloud qualifié SecNumCloud : mise en conformité avec le décret n° 2026-272 du 14 avril 2026 avant qu'il ne conditionne l'accès aux marchés publics sensibles. Source: décret 2026-272, Légifrance, 14 avril 2026.",
        "Delivery déjà prouvé : chez Exail Robotics, KREDO opère une mission DevOps/Cloud AWS (700 €/j) en environnement défense — preuve de fit souverain opposable à « prouvez-le ». Source: mission interne KREDO active, 2026.",
        "Conformité NIS2 : ~15 000 entités concernées et sanctions jusqu'à 10 M€ ou 2 % du CA ; anticiper le diagnostic sécurise l'éligibilité aux marchés. Source: ANSSI, projet de loi de résilience, 2026.",
        "Digitalisation de la production pour absorber la croissance : Exail a enregistré +87 % de commandes (844 M€) en 2025. Source: résultats annuels Exail Technologies, 18 mars 2026.",
        "Gouvernance IA conforme à l'AI Act : les obligations haut risque (Annexe III) s'appliquent au 2 décembre 2027 (report Digital Omnibus) — anticiper évite une refonte produit coûteuse. Potentiel à cadrer selon le contexte client. Source: règlement UE 2024/1689, révision Digital Omnibus, 2026."
      ],
      "objections": [
        {"objection":"Nos systèmes sont classifiés Défense, un prestataire externe ne peut pas y toucher.","reponse":"KREDO intervient sur la couche SI/cloud/DevSecOps souveraine (hors briques classifiées) avec des consultants habilitables — la mission Cloud souverain déjà active chez Exail en est la preuve."},
        {"objection":"On est une PME sous financement public, pas de budget pour un chantier SI maintenant.","reponse":"Entrer par un quick-win réglementaire (diagnostic SecNumCloud/NIS2) : ce n'est pas un coût mais la condition même pour continuer à répondre aux appels d'offres publics."},
        {"objection":"Notre priorité c'est de livrer le carnet de commandes, pas de digitaliser.","reponse":"La digitalisation de la production est précisément ce qui permet de tenir un carnet record (+87 % chez Exail) sans pénalités — c'est un levier de delivery, pas une distraction."}
      ],
      "entry_points": [
        "Réglementaire: décret SecNumCloud (14/04/2026) et NIS2 (été 2026) — appeler pour cadrer la conformité avant qu'elle ne conditionne l'accès aux marchés publics.",
        "Quick-win: audit de conformité cloud souverain / NIS2 en 3-4 semaines avant tout chantier structurant.",
        "Transformation: digitalisation de la production et montée en cadence industrielle (type Exail) sur 6-12 mois.",
        "Réseau: écosystème PACA spatial-défense (Sophia-Antipolis, Aerospace Valley, pôle SAFE) — entrée par un pair du bassin azuréen."
      ]
    }$KREDO$::jsonb,
    $KREDO${
      "verbatims": "Aucun verbatim client réel — les 7 interactions du secteur sont des données de test (fictional/synthetic). À recueillir en RDV.",
      "frequences": "Comptage tracé sur 2 comptes FOLIO (Exail, ACRI-ST) ; fréquence plafonnée à 2. source_company_ids peuplé sur tous les pain points.",
      "corpus": "Mince : 2 comptes FOLIO denses couvrant deux sous-marchés hétérogènes (Spatial / Défense) + 1 ancre client (Exail) avec mission et opportunité Cloud souverain réelles. Aucun process_diagnostic. Plafond 4.0.",
      "marche": "market_size_eur_bn laissé NULL (deux sous-marchés de tailles différentes : observation Terre ~2,5-3 Md€ Europe ; robotique défense ~3-5 Md€ Europe, FOLIO non re-vérifié). Croissance ~10 %/an (blend 8-15 %). Étage 1 porté par une obligation déjà en vigueur (SecNumCloud) : pas d'échéance critical/high datée dans les 12 mois à venir.",
      "sources": [
        "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053900789",
        "https://monespacenis2.cyber.gouv.fr/directive/",
        "https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai",
        "https://www.consilium.europa.eu/en/press/press-releases/2025/12/08/european-defence-industry-programme-council-gives-final-approval/",
        "https://france.representation.ec.europa.eu/informations/la-commission-propose-une-legislation-spatiale-de-lue-pour-stimuler-lacces-au-marche-et-renforcer-la-2025-06-25_fr",
        "https://www.exail-technologies.com/fr/resultats-annuels-2025-forte-amelioration-des-resultats-et-des-flux-de-tresorerie/"
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
    image_url = COALESCE(EXCLUDED.image_url, sector_intelligence.image_url),
    updated_at = now()
  RETURNING id INTO v_sector_id;

  -- 2. Pain points (purge + réinsertion, idempotent)
  DELETE FROM sector_pain_points WHERE sector_id = v_sector_id;
  INSERT INTO sector_pain_points
    (workspace_id, sector_id, title, description, frequency_count, source_company_ids, kredo_practice, verbatim)
  VALUES
    (v_workspace_id, v_sector_id,
     $KREDO$Cloud souverain SecNumCloud imposé sur les marchés publics$KREDO$,
     $KREDO$Le décret 2026-272 et les exigences de souveraineté conditionnent l'accès aux marchés publics sensibles. Exail porte une opportunité et une mission Cloud souverain réelles ; ACRI-ST est soumis aux certifications SecNumCloud pour ses services de données publiques.$KREDO$,
     2, ARRAY['cf0c393a-adbe-4564-b70a-78355a56f0a0','fcbfd676-3a75-4d17-8241-815583a3868e']::uuid[],
     'cloud_eng', NULL),
    (v_workspace_id, v_sector_id,
     $KREDO$Cybersécurité NIS2 des systèmes critiques connectés$KREDO$,
     $KREDO$Systèmes autonomes connectés (Exail) et plateformes de données institutionnelles (ACRI-ST) exposés au durcissement cyber exigé par NIS2 et les marchés publics numériques.$KREDO$,
     2, ARRAY['cf0c393a-adbe-4564-b70a-78355a56f0a0','fcbfd676-3a75-4d17-8241-815583a3868e']::uuid[],
     'cyber', NULL),
    (v_workspace_id, v_sector_id,
     $KREDO$Conformité AI Act sur les systèmes IA à haut risque$KREDO$,
     $KREDO$IA embarquée des systèmes autonomes (Exail) et algorithmes d'analyse d'images satellitaires de surveillance (ACRI-ST) potentiellement classés à haut risque — obligations de traçabilité et robustesse au 2 décembre 2027.$KREDO$,
     2, ARRAY['cf0c393a-adbe-4564-b70a-78355a56f0a0','fcbfd676-3a75-4d17-8241-815583a3868e']::uuid[],
     'data_ai', NULL),
    (v_workspace_id, v_sector_id,
     $KREDO$Pénurie de talents en ingénierie et data spatiale$KREDO$,
     $KREDO$Guerre des compétences sur l'ingénierie robotique/systèmes embarqués (Exail) et la data science/télédétection (ACRI-ST), dans un bassin en tension.$KREDO$,
     2, ARRAY['cf0c393a-adbe-4564-b70a-78355a56f0a0','fcbfd676-3a75-4d17-8241-815583a3868e']::uuid[],
     'multi', NULL),
    (v_workspace_id, v_sector_id,
     $KREDO$Dépendance aux cycles budgétaires et homologations$KREDO$,
     $KREDO$Dépendance aux décisions budgétaires publiques et aux cycles longs d'homologation (CIEEMG/ESA/CNES) qui rythment le chiffre d'affaires et retardent les projets.$KREDO$,
     2, ARRAY['cf0c393a-adbe-4564-b70a-78355a56f0a0','fcbfd676-3a75-4d17-8241-815583a3868e']::uuid[],
     'multi', NULL),
    (v_workspace_id, v_sector_id,
     $KREDO$Montée en cadence industrielle sous carnet record$KREDO$,
     $KREDO$Exail doit transformer un carnet record (844 M€, +87 % en 2025) en livraisons dans les délais : digitalisation de la production, gestion des approvisionnements critiques, structuration des processus.$KREDO$,
     1, ARRAY['cf0c393a-adbe-4564-b70a-78355a56f0a0']::uuid[],
     'cloud_eng', NULL);

  -- 3. Réglementaire
  DELETE FROM sector_regulatory_items WHERE sector_id = v_sector_id;
  INSERT INTO sector_regulatory_items
    (workspace_id, sector_id, name, authority, description, deadline_date, urgency,
     kredo_practice, commercial_angle, is_commercial_window, source_url)
  VALUES
    (v_workspace_id, v_sector_id,
     $KREDO$Décret n° 2026-272 SecNumCloud (art. 31 loi SREN)$KREDO$, 'FR',
     $KREDO$Rend opposable l'hébergement des données sensibles de l'État sur un cloud qualifié SecNumCloud. La défense est un secteur prioritaire ; conditionne l'accès aux marchés publics sensibles.$KREDO$,
     '2026-04-14', 'critical', 'cloud_eng',
     $KREDO$Cadrer et opérer la migration vers un cloud souverain qualifié (DevSecOps souverain) — vecteur déjà prouvé chez Exail (mission Cloud AWS active).$KREDO$,
     true, 'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053900789'),
    (v_workspace_id, v_sector_id,
     $KREDO$Directive NIS2 — loi de résilience (transposition FR)$KREDO$, 'FR',
     $KREDO$Transposition française en cours : examen juillet 2026, promulgation attendue été 2026, obligations applicables après décrets. ~15 000 entités, autorité ANSSI, sanctions jusqu'à 10 M€ ou 2 % du CA. Fournisseurs de systèmes critiques de défense et opérateurs de données publiques concernés.$KREDO$,
     NULL, 'high', 'cyber',
     $KREDO$Diagnostic de conformité NIS2 et durcissement cyber des systèmes critiques connectés (USV/UUV, plateformes de données).$KREDO$,
     true, 'https://monespacenis2.cyber.gouv.fr/directive/'),
    (v_workspace_id, v_sector_id,
     $KREDO$AI Act — obligations systèmes à haut risque (Annexe III)$KREDO$, 'EU',
     $KREDO$Report acté par le Digital Omnibus (vote PE 26/03/2026) : les obligations pour l'IA à haut risque (dont infrastructures critiques et biométrie/surveillance) s'appliquent au 2 décembre 2027, non plus au 2 août 2026. Concerne l'IA embarquée des systèmes autonomes et l'analyse d'images satellitaires de surveillance.$KREDO$,
     '2027-12-02', 'high', 'data_ai',
     $KREDO$Gouvernance et mise en conformité IA (traçabilité, supervision humaine, robustesse) pour éviter une refonte produit tardive.$KREDO$,
     true, 'https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai'),
    (v_workspace_id, v_sector_id,
     $KREDO$EDIP — programme européen pour l'industrie de défense$KREDO$, 'EU',
     $KREDO$Entré en vigueur le 30/12/2025 : 1,5 Md€ de subventions 2025-2027 favorisant les acteurs européens de défense. Fenêtre de financement pour les champions souverains comme Exail.$KREDO$,
     '2025-12-30', 'medium', 'multi',
     $KREDO$Accompagner le montage de projets éligibles et la structuration SI/industrielle exigée par les financements européens.$KREDO$,
     true, 'https://www.consilium.europa.eu/en/press/press-releases/2025/12/08/european-defence-industry-programme-council-gives-final-approval/'),
    (v_workspace_id, v_sector_id,
     $KREDO$EU Space Act — règlement spatial européen$KREDO$, 'EU',
     $KREDO$Proposé le 25/06/2025, adoption attendue 2026-2027, entrée en vigueur prévue au 1er janvier 2030. Cadre harmonisé sur la résilience, la sécurité et la durabilité des activités spatiales — concerne les opérateurs de données d'observation de la Terre.$KREDO$,
     '2030-01-01', 'medium', 'cyber',
     $KREDO$Anticiper les exigences de résilience/sécurité SI des futures obligations spatiales dès la phase législative.$KREDO$,
     false, 'https://france.representation.ec.europa.eu/informations/la-commission-propose-une-legislation-spatiale-de-lue-pour-stimuler-lacces-au-marche-et-renforcer-la-2025-06-25_fr');

  -- 4. Trigger events (source_url UNIQUE dans la table)
  DELETE FROM sector_events WHERE sector_id = v_sector_id;
  INSERT INTO sector_events
    (workspace_id, sector_id, title, event_type, description, event_date,
     commercial_opportunity, status, source_url)
  VALUES
    (v_workspace_id, v_sector_id,
     $KREDO$Exail : commandes record 844 M€ (+87 %) en 2025$KREDO$, 'market',
     $KREDO$Résultats annuels 2025 : prises de commandes 844 M€ (+87 %), EBITDA 103 M€ (+40 %), carnet 1 074 M€ (+52 %). Signal fort de montée en cadence industrielle.$KREDO$,
     '2026-03-18',
     $KREDO$Approcher sur l'excellence opérationnelle et la digitalisation de la production pour absorber le carnet.$KREDO$,
     'pending', 'https://www.exail-technologies.com/fr/resultats-annuels-2025-forte-amelioration-des-resultats-et-des-flux-de-tresorerie/'),
    (v_workspace_id, v_sector_id,
     $KREDO$EDIP en vigueur : 1,5 Md€ pour la défense européenne$KREDO$, 'regulatory',
     $KREDO$Le programme européen pour l'industrie de défense est entré en vigueur le 30/12/2025, avec 1,5 Md€ de subventions 2025-2027 fléchées vers les acteurs européens.$KREDO$,
     '2025-12-30',
     $KREDO$Se positionner sur le montage de projets éligibles et la mise à niveau SI/industrielle requise.$KREDO$,
     'pending', 'https://www.consilium.europa.eu/en/press/press-releases/2025/12/08/european-defence-industry-programme-council-gives-final-approval/'),
    (v_workspace_id, v_sector_id,
     $KREDO$Décret SecNumCloud opposable à l'État (art. 31 SREN)$KREDO$, 'regulatory',
     $KREDO$Publication au JORF (16/04/2026) du décret rendant SecNumCloud opposable pour l'hébergement des données sensibles de l'État — la défense en priorité.$KREDO$,
     '2026-04-16',
     $KREDO$Déclencher un diagnostic cloud souverain avant que la conformité ne conditionne l'accès aux marchés.$KREDO$,
     'pending', 'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053900789'),
    (v_workspace_id, v_sector_id,
     $KREDO$Commission UE : 5 projets de défense conjoints proposés$KREDO$, 'regulatory',
     $KREDO$Le 03/07/2026, la Commission propose cinq projets de défense conjoints pour renforcer les capacités industrielles européennes — pipeline de projets pour la filière.$KREDO$,
     '2026-07-03',
     $KREDO$Cartographier les projets et proposer un accompagnement SI/data aux acteurs impliqués.$KREDO$,
     'pending', 'https://defence-industry-space.ec.europa.eu/commission-proposes-five-joint-defence-projects-strengthen-europes-industrial-capabilities-2026-07-03_en');

  -- 5. Rattachement des comptes (déjà rattachés — idempotent, défensif)
  UPDATE companies SET sector_id = v_sector_id
  WHERE workspace_id = v_workspace_id
    AND id IN ('cf0c393a-adbe-4564-b70a-78355a56f0a0',
               'fcbfd676-3a75-4d17-8241-815583a3868e',
               '19b4d3cb-80dc-45b4-b963-b9eb74c59e45');

  RAISE NOTICE 'Secteur % injecté : %', 'aeronautique-spatial-defense', v_sector_id;
END
$migration$;
