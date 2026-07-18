-- Étude sectorielle : Tourisme, Hôtellerie & Loisirs
-- Corpus : riche — 5 comptes, 4 avec matière FOLIO. Score : 4.1/5.
-- Ancre client Voyage Privé formelle mais non probante (process_diagnostic = coquilles,
-- 10 interactions du secteur toutes synthétiques) — voir caveats en base et
-- docs/PROCESS-ETUDE-SECTORIELLE.md §3.1/§13 dette #10.

DO $migration$
DECLARE
  v_workspace_id uuid;
  v_sector_id    uuid;
BEGIN
  SELECT id INTO v_workspace_id FROM workspaces LIMIT 1;

  INSERT INTO sector_intelligence (
    workspace_id, name, slug, description, status,
    attractiveness_score, market_size_eur_bn, market_growth_pct,
    digital_maturity, practices_fit, key_players_paca, key_players_national,
    avg_tjm_min, avg_tjm_max, playbook, caveats, image_url
  ) VALUES (
    v_workspace_id,
    $KREDO$Tourisme, Hôtellerie & Loisirs$KREDO$,
    'tourisme-hotellerie-loisirs',
    $KREDO$Bassin PACA dense (Voyage Privé, Ponant, Odalys/MAGORA à Aix et Marseille) sur un secteur à forte saisonnalité et forte intensité digitale. Fil rouge commercial : plateformes de réservation B2C à encaisser en pic de charge, grandes bases clients à sécuriser (RGPD/NIS2), transformation de l'expérience par la data/IA, et un calendrier réglementaire daté qui percute le SI (facturation électronique 09/2026, CSRD, DPE meublés). Fiche construite sur 5 comptes dont 4 à matière FOLIO et 1 ancre client (Voyage Privé), ancre formelle et non probante — voir caveats.$KREDO$,
    'active',
    4.1, 222, 3.0,
    'medium',
    '{"data_ai": 5, "cloud_eng": 5, "product": 3, "cyber": 4}'::jsonb,
    $KREDO$[
      {"name":"Voyage Privé","size":"744 M€","note":"Client. Leader européen e-tourisme premium (ventes privées), pure player 100% digital à Aix-en-Provence. Référence delivery KREDO (missions Booking actives)."},
      {"name":"Ponant / Ponant Explorations","size":"512 M€","note":"Croisières de luxe et expédition polaire, Marseille. Croissance active (acquisition Aqua Expeditions), SI à intégrer post-M&A."},
      {"name":"Odalys / MAGORA","size":"264 M€","note":"N°2 européen de l'hébergement géré (550 établissements), Aix. Rebrand MAGORA et diversification multi-marques en cours."},
      {"name":"MMV","size":"n.c.","note":"Résidences de vacances montagne et mer. Prospect, sans matière FOLIO exploitable à ce jour."}
    ]$KREDO$::jsonb,
    $KREDO$[
      {"name":"Booking / Expedia","size":"Géants OTA","note":"Distribution en ligne dominante — à la fois canal et menace de désintermédiation."},
      {"name":"Accor","size":"Leader hôtellerie","note":"Référence de transformation digitale et fidélisation à l'échelle."},
      {"name":"Pierre & Vacances / Center Parcs","size":"Grand groupe","note":"Hébergement géré, concurrent direct d'Odalys/MAGORA."},
      {"name":"Elior / Areas","size":"Géant restauration concession","note":"Consolidation en cours (rachat des concessions Autogrill France)."},
      {"name":"Airbnb / Vrbo","size":"Plateformes","note":"Pression sur les prix et la relation client des opérateurs d'hébergement."}
    ]$KREDO$::jsonb,
    450, 750,
    $KREDO${
      "personas": [
        {"role":"DSI / Directeur des systèmes d'information (groupe tourisme)","enjeu":"Faire évoluer une plateforme digitale saisonnière tout en tenant les échéances de conformité (facturation, NIS2).","peur":"Un crash de la plateforme de réservation en plein pic de juillet-août : chaque heure d'indisponibilité part en CA chez un concurrent, et c'est lui qu'on regardera."},
        {"role":"Directeur e-commerce / Digital","enjeu":"Améliorer la conversion et personnaliser l'expérience sur des millions de visiteurs.","peur":"Voir Booking et Expedia capter la relation client et se retrouver réduit à un fournisseur de stock, la marge rabotée."},
        {"role":"RSSI / Responsable cybersécurité","enjeu":"Protéger des bases de plusieurs millions de membres et préparer NIS2.","peur":"Une fuite des données de millions de membres : l'amende CNIL est chiffrable, la défiance d'une clientèle premium ne se répare pas."},
        {"role":"DAF / Secrétaire général","enjeu":"Sécuriser les échéances de conformité (facturation électronique, CSRD) au meilleur coût.","peur":"Rater l'échéance facturation de septembre et bloquer la facturation du groupe en pleine saison — ou découvrir en 2028 qu'on n'a pas les données pour le reporting CSRD."}
      ],
      "roi_arguments": [
        "Stabilisation de la plateforme de réservation en haute saison : missions déjà actives chez Voyage Privé (renfort Booking, stabilisation haute saison, TJM 550-750). Source: missions KREDO / Voyage Privé, 2026.",
        "Facturation électronique obligatoire au 1er septembre 2026 (réception et émission grandes entreprises/ETI) : mise en conformité du SI de facturation. Source: economie.gouv.fr, calendrier officiel 2026-2027.",
        "NIS2 : les groupes de plus de 250 salariés ou 50 M€ de CA entrent en périmètre entité essentielle — cartographie et sécurisation du SI. Source: ANSSI, référentiel ReCyF, mars 2026.",
        "Reporting CSRD : grandes entreprises en 2028 sur l'exercice 2027 — fiabilisation des données ESG à outiller dès 2026-2027. Source: directive Stop-the-Clock, 16 avril 2025.",
        "Personnalisation par la data/IA : potentiel estimé à +2 à +5 points de conversion, à valider sur le contexte client. Source: estimation Kredo, justifiée par la maturité digitale hétérogène du secteur."
      ],
      "objections": [
        {"objection":"On est en pleine saison, on ne touche à rien qui tourne : lancer un chantier maintenant, c'est risquer de casser la prod au pire moment.","reponse":"C'est justement pour ça qu'on commence hors chemin critique : un audit de résilience, puis un renfort ciblé sur la stabilisation Booking — comme les missions déjà en cours chez Voyage Privé — pas une refonte en pleine saison."},
        {"objection":"Le digital, c'est notre cœur de métier, on le fait en interne, on ne sous-traite pas ça.","reponse":"On ne remplace pas vos équipes, on absorbe les pics : renfort React/Java/QA sur la haute saison et sur les chantiers de conformité datés, là où l'interne est déjà à 100 %."},
        {"objection":"La facturation électronique et NIS2, c'est notre DAF ou notre éditeur qui gère, ce n'est pas un sujet SI.","reponse":"L'échéance est datée et transverse : c'est le SI qui porte l'intégration des flux de facturation, la cartographie des données et la sécurisation. On l'a déjà cadré ailleurs, on vous fait gagner le défrichage."}
      ],
      "entry_points": [
        "Réglementaire: facturation électronique au 1er septembre 2026 — proposer un point de conformité du SI de facturation avant l'été.",
        "Quick-win: audit de résilience de la plateforme de réservation avant le pic de saison (2 à 4 semaines).",
        "Transformation: cartographie du SI et plan data pour NIS2 et le reporting CSRD — chantier structurant 6 à 12 mois.",
        "Réseau: cluster tourisme PACA (Voyage Privé, Odalys, Ponant à Aix et Marseille) — une entrée par un pair du bassin, avec la référence delivery Voyage Privé."
      ]
    }$KREDO$::jsonb,
    $KREDO${
      "verbatims":  "Aucun verbatim client réel. Les 10 interactions du secteur sont des données de démonstration (fictional / dataset_batch) ou des e-mails générés par l'outil, pas de la parole client. À recueillir aux prochains rendez-vous.",
      "frequences": "Comptage tracé sur les 4 comptes à matière FOLIO (source_company_ids peuplé). MMV, sans matière exploitable, n'est jamais compté.",
      "corpus":     "Riche au sens strict (4/5 comptes avec matière FOLIO + ancre client Voyage Privé), mais ancre formelle et non probante : les 2 process_diagnostic sont des coquilles et la delivery Voyage Privé repose sur le jeu de données canonique de l'app. Secteur hétérogène (e-tourisme, hébergement géré, croisières, restauration concession) — pain points rédigés en transverse digital/SI.",
      "marche":     "222 Md€ = consommation touristique intérieure France 2025 (Atout France / DGE), proxy sectoriel large ; sous-segment e-tourisme estimé à 20-22 Md€ (FOLIO Voyage Privé, non redaté). Maturité digitale hétérogène.",
      "sources": [
        "https://www.economie.gouv.fr/tout-savoir-sur-la-facturation-electronique-pour-les-entreprises",
        "https://www.vie-publique.fr/loi/295752-projet-de-loi-resilience-infrastructures-critiques-cybersecurite",
        "https://finance.ec.europa.eu/capital-markets-union-and-financial-markets/company-reporting-and-auditing/company-reporting/corporate-sustainability-reporting_en",
        "https://www.service-public.gouv.fr/particuliers/actualites/A17883",
        "https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai",
        "https://www.atout-france.fr/fr/informations/poids-du-tourisme-dans-leconomie-francaise",
        "https://www.eliorgroup.com/media/press-releases/elior-group-completes-acquisition-autogrills-railway-stations-concession",
        "https://www.magora.fr/le-groupe-odalys-devient-magora/",
        "https://skift.com/2025/01/16/luxury-cruise-group-ponant-acquires-aqua-expeditions/"
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

  DELETE FROM sector_pain_points WHERE sector_id = v_sector_id;
  INSERT INTO sector_pain_points
    (workspace_id, sector_id, title, description, frequency_count, source_company_ids, kredo_practice, verbatim)
  VALUES
    (v_workspace_id, v_sector_id,
     $KREDO$Expérience client digitale et personnalisation IA$KREDO$,
     $KREDO$Tous les opérateurs cherchent à enrichir l'expérience digitale et à personnaliser l'offre (IA de recommandation, parcours de réservation). Cité chez Voyage Privé, Odalys, Autogrill et Ponant.$KREDO$,
     4, ARRAY['e5f8fd19-7433-4e44-b759-400f4256545d','1454c24b-9947-43da-914c-ad33b465c4a9','54a098ea-985c-4e3c-80e7-63120ae56a0a','e825ae2a-3ac7-4d38-8b92-a84e22e7b338']::uuid[],
     'data_ai', NULL),
    (v_workspace_id, v_sector_id,
     $KREDO$Sécuriser les données clients face à NIS2 et au RGPD$KREDO$,
     $KREDO$Bases de plusieurs millions de membres/vacanciers (Voyage Privé, Odalys 2M) exposées au risque CNIL et cyber, avec l'entrée prochaine en périmètre NIS2. Risque de fuite à impact réputationnel majeur sur une clientèle premium.$KREDO$,
     4, ARRAY['e5f8fd19-7433-4e44-b759-400f4256545d','1454c24b-9947-43da-914c-ad33b465c4a9','54a098ea-985c-4e3c-80e7-63120ae56a0a','e825ae2a-3ac7-4d38-8b92-a84e22e7b338']::uuid[],
     'cyber', NULL),
    (v_workspace_id, v_sector_id,
     $KREDO$Une plateforme de réservation qui tient les pics$KREDO$,
     $KREDO$Saisonnalité extrême : la plateforme de réservation doit encaisser des pics de charge sans incident. Chez Voyage Privé, des missions actives portent explicitement sur la stabilisation Booking en haute saison ; Odalys et Ponant reposent sur des moteurs de réservation et paiement en ligne.$KREDO$,
     3, ARRAY['e5f8fd19-7433-4e44-b759-400f4256545d','1454c24b-9947-43da-914c-ad33b465c4a9','e825ae2a-3ac7-4d38-8b92-a84e22e7b338']::uuid[],
     'cloud_eng', NULL),
    (v_workspace_id, v_sector_id,
     $KREDO$Le réglementaire percute le SI plus vite que prévu$KREDO$,
     $KREDO$Empilement d'échéances datées qui atterrissent sur le SI : facturation électronique (09/2026), CSRD, DPE/Le Meur, EGAlim côté restauration. La conformité multi-fronts arrive plus vite que la capacité interne à l'absorber.$KREDO$,
     3, ARRAY['e5f8fd19-7433-4e44-b759-400f4256545d','1454c24b-9947-43da-914c-ad33b465c4a9','54a098ea-985c-4e3c-80e7-63120ae56a0a']::uuid[],
     'multi', NULL),
    (v_workspace_id, v_sector_id,
     $KREDO$Fusionner des SI hétérogènes après un rachat$KREDO$,
     $KREDO$Consolidation sectorielle intense : cession Autogrill vers Elior, rebrand Odalys vers MAGORA et diversification multi-marques, acquisition Aqua Expeditions par Ponant. Chaque opération laisse des SI à intégrer ou rationaliser.$KREDO$,
     3, ARRAY['54a098ea-985c-4e3c-80e7-63120ae56a0a','1454c24b-9947-43da-914c-ad33b465c4a9','e825ae2a-3ac7-4d38-8b92-a84e22e7b338']::uuid[],
     'multi', NULL),
    (v_workspace_id, v_sector_id,
     $KREDO$Capter le client en direct face aux plateformes$KREDO$,
     $KREDO$Pression des OTA (Booking, Expedia) et des plateformes de location (Airbnb, Vrbo) sur les prix et la relation client. Enjeu de vente directe, de fidélisation et de pricing outillé par la data pour éviter la désintermédiation.$KREDO$,
     3, ARRAY['e5f8fd19-7433-4e44-b759-400f4256545d','1454c24b-9947-43da-914c-ad33b465c4a9','e825ae2a-3ac7-4d38-8b92-a84e22e7b338']::uuid[],
     'data_ai', NULL);

  DELETE FROM sector_regulatory_items WHERE sector_id = v_sector_id;
  INSERT INTO sector_regulatory_items
    (workspace_id, sector_id, name, authority, description, deadline_date, urgency,
     kredo_practice, commercial_angle, is_commercial_window, source_url)
  VALUES
    (v_workspace_id, v_sector_id,
     $KREDO$Facturation électronique obligatoire (B2B)$KREDO$, 'FR',
     $KREDO$Au 1er septembre 2026, toutes les entreprises doivent recevoir des factures électroniques et les grandes entreprises et ETI doivent les émettre (PME/TPE au 1er septembre 2027). Impacte les flux de facturation et le SI de tous les opérateurs.$KREDO$,
     '2026-09-01', 'critical', 'multi',
     $KREDO$Cadrage et mise en conformité du SI de facturation (intégration plateforme agréée, e-reporting) avant l'échéance, sans bloquer la facturation en pleine saison.$KREDO$, true,
     'https://www.economie.gouv.fr/tout-savoir-sur-la-facturation-electronique-pour-les-entreprises'),
    (v_workspace_id, v_sector_id,
     $KREDO$NIS2 — loi de résilience (cybersécurité)$KREDO$, 'FR',
     $KREDO$La transposition française de NIS2 (projet de loi résilience) fera entrer en périmètre les entités essentielles (plus de 250 salariés ou 50 M€ de CA) et importantes (plus de 50 salariés ou 10 M€) : Ponant, Odalys/MAGORA, Voyage Privé et Autogrill sont concernés. Loi non encore promulguée (échéance à confirmer) ; référentiel ANSSI ReCyF disponible depuis mars 2026.$KREDO$,
     NULL, 'high', 'cyber',
     $KREDO$Cartographie du SI, analyse d'écart vs le référentiel ReCyF et plan de sécurisation / notification d'incident — un chantier à démarrer avant l'entrée en vigueur.$KREDO$, true,
     'https://www.vie-publique.fr/loi/295752-projet-de-loi-resilience-infrastructures-critiques-cybersecurite'),
    (v_workspace_id, v_sector_id,
     $KREDO$CSRD — reporting de durabilité$KREDO$, 'EU',
     $KREDO$Après le report Omnibus « Stop-the-Clock » (16 avril 2025), les grandes entreprises (vague 2) reportent en 2028 sur l'exercice 2027 : la collecte doit être prête dès l'ouverture de l'exercice 2027.$KREDO$,
     '2027-01-01', 'medium', 'data_ai',
     $KREDO$Chantier data : outiller la collecte et la fiabilisation des indicateurs ESG (énergie, empreinte carbone des séjours) à partir des systèmes existants.$KREDO$, true,
     'https://finance.ec.europa.eu/capital-markets-union-and-financial-markets/company-reporting-and-auditing/company-reporting/corporate-sustainability-reporting_en'),
    (v_workspace_id, v_sector_id,
     $KREDO$Loi Le Meur — meublés de tourisme (DPE)$KREDO$, 'FR',
     $KREDO$DPE minimum E exigé depuis le 21 novembre 2024 pour les meublés de tourisme ; à compter du 1er janvier 2034, seuls les logements classés A à D pourront être proposés. Concerne les parcs de résidences (Odalys/MAGORA, MMV).$KREDO$,
     '2034-01-01', 'medium', 'data_ai',
     $KREDO$Cartographie outillée du parc immobilier (DPE, statut, conformité) pour piloter la mise à niveau énergétique par un système de données à jour.$KREDO$, true,
     'https://www.service-public.gouv.fr/particuliers/actualites/A17883'),
    (v_workspace_id, v_sector_id,
     $KREDO$AI Act — règlement UE 2024/1689$KREDO$, 'EU',
     $KREDO$Les obligations sur les systèmes d'IA à haut risque (annexe III) sont reportées au 2 décembre 2027 (Digital Omnibus, accord provisoire de mai 2026). Pour le tourisme, l'usage IA (personnalisation, recommandation) relève surtout des obligations de transparence, déjà applicables par étapes ; échéance haut-risque à confirmer.$KREDO$,
     '2027-12-02', 'medium', 'data_ai',
     $KREDO$Cadrer les usages IA de personnalisation (transparence, gouvernance des modèles) pour rester conforme sans freiner l'innovation.$KREDO$, false,
     'https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai');

  DELETE FROM sector_events WHERE sector_id = v_sector_id;
  INSERT INTO sector_events
    (workspace_id, sector_id, title, event_type, description, event_date,
     commercial_opportunity, status, source_url)
  VALUES
    (v_workspace_id, v_sector_id,
     $KREDO$Elior finalise le rachat des concessions gares d'Autogrill France$KREDO$, 'competitor',
     $KREDO$Elior finalise l'acquisition des activités de concession d'Autogrill en gares (~50 M€), après la cession d'Areas à PAI (1,4 Md€). Recomposition de la restauration de transit.$KREDO$,
     '2026-05-19',
     $KREDO$SI à intégrer/rationaliser côté acquéreur comme cédant : fenêtre d'intervention post-M&A.$KREDO$, 'pending',
     'https://www.eliorgroup.com/media/press-releases/elior-group-completes-acquisition-autogrills-railway-stations-concession'),
    (v_workspace_id, v_sector_id,
     $KREDO$Le groupe Odalys devient MAGORA$KREDO$, 'market',
     $KREDO$Rebrand Odalys vers MAGORA (filiale Groupe Duval) et diversification multi-marques (Vacances, City, Campus, Happy Senior, Flower Campings), avec expansion internationale annoncée en 2025.$KREDO$,
     NULL,
     $KREDO$Phase de transformation : opportunité d'accompagner l'unification et l'intégration des SI multi-marques.$KREDO$, 'pending',
     'https://www.magora.fr/le-groupe-odalys-devient-magora/'),
    (v_workspace_id, v_sector_id,
     $KREDO$Ponant acquiert Aqua Expeditions$KREDO$, 'market',
     $KREDO$Ponant prend une participation majoritaire dans Aqua Expeditions (janvier 2025) et entre sur les croisières fluviales/petits navires. Nouveau périmètre à intégrer.$KREDO$,
     '2025-01-16',
     $KREDO$Intégration post-acquisition d'un opérateur : chantier SI et data côté groupe Ponant.$KREDO$, 'pending',
     'https://skift.com/2025/01/16/luxury-cruise-group-ponant-acquires-aqua-expeditions/'),
    (v_workspace_id, v_sector_id,
     $KREDO$Échéance facturation électronique du 1er septembre 2026$KREDO$, 'regulatory',
     $KREDO$L'obligation de réception (toutes entreprises) et d'émission (grandes entreprises et ETI) entre en vigueur le 1er septembre 2026. Fenêtre courte pour cadrer et tester le SI de facturation.$KREDO$,
     '2026-09-01',
     $KREDO$Motif d'appel daté et transverse : proposer un point de conformité du SI de facturation avant l'été.$KREDO$, 'pending',
     'https://entreprendre.service-public.gouv.fr/actualites/A15683');

  RAISE NOTICE 'Secteur % injecté : %', 'tourisme-hotellerie-loisirs', v_sector_id;
END
$migration$;
