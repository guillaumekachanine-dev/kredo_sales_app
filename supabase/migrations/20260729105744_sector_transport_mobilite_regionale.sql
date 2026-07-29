-- Étude sectorielle : Transport & Mobilité régionale
-- Corpus : MOYEN — 6 comptes, 6/6 avec sector_analysis FOLIO, AUCUNE ancre de preuve
-- Score : 4.3/5 (plafond corpus : 4.5)
-- Gate 3 : 98/100, Axe A (traçabilité) 35/35
-- Sources : voir caveats.sources de la fiche + note de remise P6

DO $migration$
DECLARE
  v_workspace_id uuid;
  v_sector_id    uuid;
  -- Comptes du secteur (UUID relevés en Phase 1, preuve des frequency_count)
  c_regie    uuid := '0bd5d255-4c6b-4612-8cea-02ea888b41cd'; -- Régie Ligne d'Azur
  c_keolis   uuid := '813881af-3ad4-4d78-ae83-f9678ba73d65'; -- KEOLIS Alpes-Maritimes
  c_aeroport uuid := '31daad78-d1f4-4214-a387-4621c59308fa'; -- Aéroport Nice Côte d'Azur
  c_escota   uuid := 'e2c10122-8fad-458d-ba81-05fd41f1eb20'; -- ESCOTA (VINCI)
  c_transcan uuid := '26fccb7d-5bde-4238-b751-48779f4c0c6f'; -- Groupe Transcan
  c_cogepart uuid := '99dc211b-4f85-44a7-85ed-944dd2695b45'; -- Cogepart
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
    $KREDO$Transport & Mobilité régionale$KREDO$,
    'transport-mobilite-regionale',
    $KREDO$Six comptes rattachés, cinq implantés en Région Sud : quatre opérateurs de mobilité voyageurs sous commande publique (Régie Ligne d'Azur, KEOLIS Alpes-Maritimes, Aéroport Nice Côte d'Azur, ESCOTA/VINCI Autoroutes) et deux acteurs de la logistique (Groupe Transcan à Carros, Cogepart hors région). Fiche construite sur les six analyses sectorielles FOLIO du corpus, sans aucune ancre de preuve interne : pas de compte client, pas de diagnostic exploitable, aucune parole client réelle. Le différenciant KREDO se joue sur les systèmes critiques d'exploitation — billettique, supervision, réseaux industriels — au moment où trois pressions convergent : facturation électronique au 1er septembre 2026, transposition NIS2 imminente pour un secteur classé hautement critique, et déploiement AFIR de la recharge sur le réseau transeuropéen d'ici fin 2027.$KREDO$,
    'active',
    4.3, NULL, NULL,
    'medium',
    '{"data_ai": 4, "cloud_eng": 3, "product": 2, "cyber": 5}'::jsonb,
    $KREDO$[
      {"name":"Régie Ligne d'Azur","size":"1 700 collaborateurs","note":"EPIC de la Métropole Nice Côte d'Azur, 400 000 voyageurs par jour, tramway et bus. Maturité digitale avancée côté voyageur, systèmes industriels de conduite à sécuriser avant NIS2."},
      {"name":"Aéroport Nice Côte d'Azur","size":"311 M€ · 15 M passagers","note":"Deuxième aéroport français hors Paris. Infrastructure critique au sens NIS2, systèmes OT de tri bagages, exposition RGPD chiffrée par l'exploitant à 4 % du CA mondial."},
      {"name":"ESCOTA (VINCI Autoroutes)","size":"471 km concédés","note":"Concession Aix-en-Provence — Côte d'Azur jusqu'en 2032. Cible directe du règlement AFIR sur la recharge, et préparation du renouvellement à engager dès 2028."},
      {"name":"KEOLIS Alpes-Maritimes","size":"19 M€ · 230 collaborateurs","note":"Délégation de service public interurbaine depuis 1957, 121 cars électriques à double étage. Renouvellements de DSP disputés face à Transdev et RATP Dev."},
      {"name":"Groupe Transcan","size":"PME, Carros","note":"Flotte électrique déjà opérationnelle, plateforme collaborative Eco City, logistique événementielle. Maturité digitale forte pour sa taille, structuration à accompagner."},
      {"name":"RTM Marseille","size":"Régie comparable","note":"Non rattachée au portefeuille. Régie publique de taille supérieure : cible naturelle d'extension hors Alpes-Maritimes une fois une référence constituée."}
    ]$KREDO$::jsonb,
    $KREDO$[
      {"name":"Keolis (groupe)","size":"7,7 Mds€","note":"Leader français de l'exploitation déléguée, maison mère de Keolis Alpes-Maritimes. Décisions SI partiellement centralisées : à qualifier avant d'engager un cycle long en filiale."},
      {"name":"Transdev","size":"Géant","note":"Concurrent direct sur chaque renouvellement de DSP. Sa présence explique l'enjeu de preuve chiffrée du service côté sortant."},
      {"name":"RATP Dev","size":"Géant","note":"Troisième larron des appels d'offres de transport public, historiquement plus urbain qu'interurbain."},
      {"name":"VINCI Autoroutes","size":"12,2 Mds€ (concessions)","note":"Maison mère d'ESCOTA, aux côtés d'ASF et Cofiroute. Les arbitrages d'infrastructure de recharge se prennent largement au niveau groupe."},
      {"name":"Cogepart","size":"210 M€ · 3 300 collaborateurs","note":"Compte du portefeuille mais implanté à Clichy : livraison de précision et dernier kilomètre, cycle d'achat privé, hors logique de commande publique."}
    ]$KREDO$::jsonb,
    600, 1100,
    $KREDO${
      "personas": [
        {"role":"Directeur des systèmes d'information","enjeu":"Raccorder billettique, exploitation et back-office aux échéances réglementaires sans jamais interrompre un service qui tourne en 24/7.","peur":"Qu'un incident sur un système de conduite — tramway, tri bagages, péage — devienne un fait divers régional avec son nom dessus, et que l'enquête montre que le réseau industriel n'était pas segmenté."},
        {"role":"Directeur d'exploitation","enjeu":"Tenir la production commerciale — lignes, fréquences, ponctualité — avec un effectif de conduite en tension et une flotte en cours de transition énergétique.","peur":"Devoir supprimer des courses en pleine saison touristique parce que le planning ne tient plus, et l'apprendre le matin même plutôt que trois semaines avant."},
        {"role":"Directeur administratif et financier","enjeu":"Basculer la chaîne de facturation au 1er septembre 2026 et préparer le reporting de durabilité sur l'exercice 2027.","peur":"Voir les factures fournisseurs rejetées à la rentrée et bloquer des règlements au moment de l'année où la trésorerie encaisse déjà la fin de saison."},
        {"role":"Directeur de contrat ou de concession","enjeu":"Préparer le renouvellement du contrat de service public avec des indicateurs de service défendables devant l'autorité organisatrice.","peur":"Arriver devant l'autorité organisatrice sans série de données consolidée, et perdre le réseau au profit de Transdev ou de RATP Dev sur un dossier mieux documenté que le sien."}
      ],
      "roi_arguments": [
        "Raccordement de la chaîne de facturation : l'obligation de réception vise toutes les entreprises assujetties à la TVA et l'obligation d'émission les grandes entreprises et ETI — soit cinq des six comptes du secteur — au 1er septembre 2026, sans report. Un raccordement traité après l'échéance se paie en rejets de factures et en règlements bloqués. Source: DGFiP, fiche officielle « Que va-t-il se passer pour mon entreprise ? », calendrier de la facturation électronique.",
        "Mise à niveau cyber des systèmes d'exploitation : les entités essentielles encourent jusqu'à 10 M€ ou 2 % du chiffre d'affaires mondial, et le transport terrestre, aérien et maritime figure parmi les secteurs hautement critiques. L'ANSSI annonce une phase d'accompagnement d'environ trois ans après publication des exigences : la préparation faite avant les décrets est opposable en contrôle, celle faite après est subie. Source: ANSSI, Référentiel Cyber France publié le 17 mars 2026.",
        "Supervision des infrastructures de recharge : stations tous les 60 km, 600 kW cumulés et un point à 150 kW minimum sur le réseau central transeuropéen au 31 décembre 2027, puis tous les 30 km en 2030. Pour un concessionnaire de 471 km, c'est un programme à cadencer sur dix-huit mois, pas un projet de fin d'exercice. Source: règlement (UE) 2023/1804 (AFIR), en vigueur depuis le 13 avril 2024.",
        "Collecte des données de durabilité : le relèvement du seuil à 1 000 salariés et le report de la vague 2 laissent trois des six comptes dans le périmètre, avec un premier exercice couvert en 2027 pour une publication en 2028. Industrialiser la collecte pendant ces dix-huit mois coûte moins que la reconstituer sous contrainte d'audit. Source: directive Omnibus I adoptée le 24 février 2026, publiée au Journal officiel de l'Union européenne le 26 février 2026.",
        "Consolidation des indicateurs d'exploitation en vue d'un renouvellement de contrat : ponctualité, disponibilité et fréquentation en série continue et auditable, plutôt qu'une reconstitution à six mois de l'échéance. Gain non chiffré à ce stade : aucune mission KREDO n'a été livrée dans ce secteur, le chiffrage devra être établi sur le premier cas réel. Source: estimation Kredo, explicitement non étayée par une référence interne."
      ],
      "objections": [
        {"objection":"Nous sommes une régie / une DSP : tout passe par appel d'offres, nous ne pouvons pas vous prendre de gré à gré.","reponse":"C'est exact, et ce n'est pas ce que je demande. L'entrée se fait par un lot court sous les seuils, ou par un accord-cadre déjà attribué. L'objet de ce premier échange, c'est que le cahier des charges soit écrit avec les bonnes exigences techniques — une fois qu'il est publié, il est trop tard pour en discuter, et vous vous retrouvez avec des réponses qui traitent le mauvais problème."},
        {"objection":"On ne touche pas aux systèmes de conduite, encore moins en pleine saison.","reponse":"C'est la bonne règle, et c'est pour ça que la première étape est un audit de segmentation en observation seule : aucune interruption d'exploitation, aucune modification de configuration, hors fenêtre de haute saison. Le plan de remédiation qui en sort est ensuite cadencé sur vos propres fenêtres de changement et vos habilitations mainteneurs, pas sur notre planning."},
        {"objection":"Le calendrier réglementaire change tout le temps — regardez les ZFE. On préfère attendre d'y voir clair.","reponse":"Vous avez raison sur les ZFE, et c'est même plus net que ça : la suppression a été votée le 14 avril 2026 avant d'être annulée par le Conseil constitutionnel le 21 mai. C'est précisément pour ça qu'on sépare ce qui bouge de ce qui ne bouge pas. La facturation électronique au 1er septembre 2026 est fixée par la réforme nationale et n'a pas été reportée, et le règlement AFIR est en vigueur depuis avril 2024. On travaille sur les échéances fermes ; sur les ZFE, on modélise des scénarios au lieu de parier."}
      ],
      "entry_points": [
        "Réglementaire: appeler avant le 1er septembre 2026 sur le raccordement de la chaîne de facturation — échéance fixée par la réforme nationale, non reportée, et qui concerne les six comptes du secteur.",
        "Quick-win: audit de segmentation des réseaux industriels — billettique, supervision, tri bagages — en trois à quatre semaines, en observation seule et sans interruption d'exploitation.",
        "Transformation: consolidation des données d'exploitation en vue d'un renouvellement de contrat de service public ou de concession, avec l'échéance 2032 du concessionnaire autoroutier comme horizon structurant.",
        "Réseau: la Métropole Nice Côte d'Azur est l'autorité organisatrice commune à la régie et aux projets tramway du bassin — une entrée institutionnelle porte sur plusieurs comptes à la fois."
      ]
    }$KREDO$::jsonb,
    $KREDO${
      "verbatims": "Aucun verbatim client réel dans cette fiche. Les 18 interactions rattachées au secteur sont toutes synthétiques (8 du lot kredo_fake_2026_jan_aug_v1, 10 du lot kredo_staffing_360_v1) — vérifié en base le 2026-07-29, zéro parole client exploitable. Les passages entre guillemets dans les pain points citent les analyses FOLIO, pas des personnes.",
      "frequences": "Comptage réel sur les six comptes du secteur, à partir des blocs metadata.sector_analysis. Les identifiants des comptes sources sont enregistrés sur les sept pain points, le comptage est donc revérifiable ligne à ligne. Limite : un enjeu réel mais non écrit par FOLIO n'est pas compté — ces fréquences mesurent le corpus documentaire, pas le terrain.",
      "corpus": "Corpus MOYEN, score plafonné à 4.5 et arrêté à 4.3. Six comptes, six analyses sectorielles FOLIO exploitables, mais AUCUNE ancre de preuve : zéro compte client, et le seul process_diagnostic du secteur (Cogepart) est une coquille de 62 caractères sans contenu. La mission et les quatre opportunités rattachées sont des données de test : le fit de KREDO sur ce secteur est une hypothèse, pas un fait démontré. Périmètre composite assumé : la fiche est écrite depuis l'angle mobilité voyageurs (Régie Ligne d'Azur, KEOLIS Alpes-Maritimes, Aéroport Nice, ESCOTA), la logistique de marchandises (Groupe Transcan, Cogepart — hors région) n'est couverte que par les pressions transverses.",
      "marche": "Taille et croissance du marché volontairement non renseignées : aucune source publique ne cadre ce périmètre composite. Repère de contexte seulement, à ne pas citer comme marché adressable : la dépense courante de transport en France atteint 460 Mds€ en 2024 (SDES, Chiffres clés des transports, édition 2026). Deux échéances sont sans date opposable et signalées comme telles dans le calendrier : la loi Résilience transposant NIS2 n'était pas promulguée au 2026-07-29, et la trajectoire des ZFE dépend désormais d'un texte spécifique après la décision du Conseil constitutionnel du 2026-05-21. Les échéances floues héritées de FOLIO (« 2025-2030 », « mise en œuvre progressive ») n'ont pas été reprises.",
      "sources": [
        "https://www.impots.gouv.fr/sites/default/files/media/1_metier/2_professionnel/EV/2_gestion/290_facturation_electronique/fiche-1_que-va-t-il-se-passer-pour-mon-entreprise.pdf",
        "https://www.urssaf.fr/accueil/actualites/facturation-electronique.html",
        "https://www.ecologie.gouv.fr/politiques-publiques/reglements-europeens-afir-rte-t-aeroports",
        "https://portail-rse.beta.gouv.fr/csrd/seuils-csrd-omnibus-criteres-d-application/",
        "https://cyber.gouv.fr/reglementation/cybersecurite-systemes-dinformation/directives-nis-nis2-et-dispositif-saiv/directive-nis-2/",
        "https://cyber.gouv.fr/actualites/nis-2-lanssi-poursuit-et-renforce-sa-dynamique-daccompagnement/",
        "https://mondial.paris/actualites/auto-pratique/suppression-des-zfe-2026-le-conseil-constitutionnel-stoppe-la-loi-67959.html",
        "https://reporterre.net/ZFE-la-fin-des-zones-a-faibles-emissions-votee-par-l-Assemblee-nationale",
        "https://www.statistiques.developpement-durable.gouv.fr/chiffres-cles-des-transports-edition-2026",
        "https://www.nicepremium.fr/actualites/nice/priorite-aux-transports-le-calendrier-des-grands-projets-de-la-metropole-nice-cote-dazur-se-precise/"
      ]
    }$KREDO$::jsonb,
    NULL   -- aucun visuel disponible pour ce secteur : la carte rend un fond navy
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

  -- 2. Pain points (7) — purge puis réinsertion, migration rejouable
  DELETE FROM sector_pain_points WHERE sector_id = v_sector_id;
  INSERT INTO sector_pain_points
    (workspace_id, sector_id, title, description, frequency_count, source_company_ids, kredo_practice, verbatim)
  VALUES
    (v_workspace_id, v_sector_id,
     $KREDO$Données usagers éclatées entre billettique, vidéo et péage$KREDO$,
     $KREDO$Les six comptes du secteur citent le RGPD comme risque de conformité, chacun sur un périmètre différent : géolocalisation et billettique nominative pour les réseaux urbains, vidéosurveillance embarquée, télépéage pour le concessionnaire, données de destinataires pour la logistique. La donnée de déplacement est nominative par nature et vit dans des systèmes qui n'ont pas été conçus ensemble. L'aéroport chiffre lui-même son exposition à 4 % du chiffre d'affaires mondial.$KREDO$,
     6, ARRAY[c_regie, c_keolis, c_aeroport, c_escota, c_transcan, c_cogepart]::uuid[], 'cyber', NULL),

    (v_workspace_id, v_sector_id,
     $KREDO$Le calendrier réglementaire va plus vite que l'achat public$KREDO$,
     $KREDO$Les quatre opérateurs sous commande publique désignent la longueur des procédures comme frein explicite : « complexité et longueur des procédures de marchés publics ralentissant les cycles d'achat » pour la régie, « complexité des appels d'offres publics allongeant les cycles de décision » pour l'aéroport. Quand une échéance tombe à date fixe et qu'un marché formalisé demande plusieurs mois, l'écart se paie en conformité tardive ou en procédure d'urgence mal cadrée.$KREDO$,
     4, ARRAY[c_regie, c_keolis, c_aeroport, c_escota]::uuid[], 'multi', NULL),

    (v_workspace_id, v_sector_id,
     $KREDO$Investir dans l'électrique sur un cadre ZFE qui bouge$KREDO$,
     $KREDO$Quatre comptes engagent des investissements lourds de renouvellement de flotte en s'appuyant sur un calendrier ZFE qui a été supprimé par le Parlement puis rétabli par le Conseil constitutionnel en mai 2026. La décision d'investissement se prend donc sans cadre stable et, dans la majorité des cas, sans donnée consolidée sur le coût réel d'exploitation d'un véhicule électrique en service — autonomie constatée, disponibilité, coût de la recharge.$KREDO$,
     4, ARRAY[c_regie, c_keolis, c_transcan, c_cogepart]::uuid[], 'data_ai', NULL),

    (v_workspace_id, v_sector_id,
     $KREDO$Moins de conducteurs, mêmes lignes : planning sous tension$KREDO$,
     $KREDO$Quatre comptes citent la difficulté à recruter et fidéliser conducteurs et techniciens de maintenance comme frein structurel. La contrainte se durcit parce que les temps de conduite et de repos sont encadrés par le règlement (CE) 561/2006 : le planning n'est pas un problème RH, c'est un problème d'optimisation sous contraintes réglementaires, aggravé par une saisonnalité touristique qui double la demande sans doubler l'effectif.$KREDO$,
     4, ARRAY[c_regie, c_keolis, c_transcan, c_cogepart]::uuid[], 'data_ai', NULL),

    (v_workspace_id, v_sector_id,
     $KREDO$Facture électronique : le SI n'est pas raccordé$KREDO$,
     $KREDO$Trois comptes inscrivent explicitement le retard de raccordement à la facturation électronique dans leurs risques de conformité, à l'échéance du 1er septembre 2026. Pour un opérateur sous commande publique la difficulté est double : le flux Chorus Pro existant ne couvre pas l'obligation, et le référentiel fournisseurs doit être fiabilisé avant bascule sous peine de rejets en série à la reprise de septembre.$KREDO$,
     3, ARRAY[c_regie, c_transcan, c_cogepart]::uuid[], 'cloud_eng', NULL),

    (v_workspace_id, v_sector_id,
     $KREDO$Renouveler la concession sans preuve chiffrée du service$KREDO$,
     $KREDO$Trois comptes ont une échéance contractuelle qui commande leur stratégie : fin de concession en 2032 pour le concessionnaire autoroutier, avec des négociations attendues dès 2028 ; renouvellements de DSP face à Transdev et RATP Dev pour l'opérateur interurbain ; risque de requalification du contrat de service public en cas d'évolution du règlement européen OSP pour la régie. Dans les trois cas, la défense du contrat se joue sur des indicateurs de service opposables que peu savent produire en série continue.$KREDO$,
     3, ARRAY[c_escota, c_keolis, c_regie]::uuid[], 'data_ai', NULL),

    (v_workspace_id, v_sector_id,
     $KREDO$Tramway, bagages, péage : l'OT n'est pas segmenté$KREDO$,
     $KREDO$Deux comptes exploitent des systèmes industriels critiques et le disent : « non-conformité aux exigences NIS2 exposant les systèmes critiques de contrôle du tramway à des risques cyber non couverts » pour la régie, obligation de notification sous 24 heures et statut d'infrastructure critique pour l'aéroport. Ces réseaux sont accessibles à des mainteneurs externes, fonctionnent en 24/7 et supportent mal une fenêtre d'interruption — trois raisons pour lesquelles la segmentation y est systématiquement repoussée.$KREDO$,
     2, ARRAY[c_regie, c_aeroport]::uuid[], 'cyber', NULL);

  -- 3. Calendrier réglementaire (6 items, dont 4 datés et sourcés)
  DELETE FROM sector_regulatory_items WHERE sector_id = v_sector_id;
  INSERT INTO sector_regulatory_items
    (workspace_id, sector_id, name, authority, description, deadline_date, urgency,
     kredo_practice, commercial_angle, is_commercial_window, source_url)
  VALUES
    (v_workspace_id, v_sector_id,
     $KREDO$Facturation électronique — obligation de réception et d'émission$KREDO$, 'FR',
     $KREDO$Toute entreprise assujettie à la TVA doit être en capacité de RECEVOIR des factures électroniques via une plateforme agréée. Les grandes entreprises et les ETI doivent en outre les ÉMETTRE dès cette date : cinq des six comptes du secteur sont dans ce cas. L'échéance est fixée par la réforme nationale et n'a pas été reportée (calendrier publié par la DGFiP).$KREDO$,
     '2026-09-01', 'critical', 'cloud_eng',
     $KREDO$Raccordement de la chaîne achats/facturation (ERP, TMS, back-office billettique) à une plateforme agréée, et reprise des référentiels fournisseurs. Sur les opérateurs sous commande publique, le flux Chorus Pro coexiste avec le nouveau canal : c'est le point de rupture le plus fréquent.$KREDO$,
     true,
     'https://www.impots.gouv.fr/sites/default/files/media/1_metier/2_professionnel/EV/2_gestion/290_facturation_electronique/fiche-1_que-va-t-il-se-passer-pour-mon-entreprise.pdf'),

    (v_workspace_id, v_sector_id,
     $KREDO$Facturation électronique — vague 2, émission PME et TPE$KREDO$, 'FR',
     $KREDO$Les PME, TPE et micro-entreprises doivent à leur tour émettre leurs factures au format électronique. Pour un opérateur de transport, l'enjeu porte moins sur lui-même que sur son écosystème de sous-traitants — affrètement, maintenance, nettoyage — dont la non-conformité bloque sa propre chaîne de règlement.$KREDO$,
     '2027-09-01', 'high', 'cloud_eng',
     $KREDO$Cartographie des flux fournisseurs et plan de mise en conformité de l'écosystème sous-traitant, en anticipation du blocage de trésorerie induit par un fournisseur non raccordé.$KREDO$,
     true,
     'https://www.urssaf.fr/accueil/actualites/facturation-electronique.html'),

    (v_workspace_id, v_sector_id,
     $KREDO$Règlement AFIR (UE) 2023/1804 — recharge sur le réseau RTE-T$KREDO$, 'EU',
     $KREDO$Sur le réseau routier central transeuropéen, des stations de recharge doivent être disponibles tous les 60 km avec au moins 600 kW de puissance cumulée et un point à 150 kW minimum. Les points de plus de 50 kW doivent accepter le paiement par carte. L'exigence passe à un point tous les 30 km en 2030.$KREDO$,
     '2027-12-31', 'high', 'cloud_eng',
     $KREDO$Supervision et interopérabilité du parc de recharge : intégration au SI d'exploitation, pilotage de la puissance, chaîne de paiement et de facturation, remontée des indicateurs de disponibilité exigibles. Concerne directement un concessionnaire de 471 km sur l'axe Aix — Côte d'Azur.$KREDO$,
     true,
     'https://www.ecologie.gouv.fr/politiques-publiques/reglements-europeens-afir-rte-t-aeroports'),

    (v_workspace_id, v_sector_id,
     $KREDO$CSRD révisée par la directive Omnibus I — reporting de durabilité$KREDO$, 'EU',
     $KREDO$Omnibus I relève le seuil d'assujettissement à 1 000 salariés et décale la vague 2 : premier exercice couvert 2027, publication en 2028. Trois des six comptes du secteur restent dans le périmètre. Le report n'annule pas l'obligation, il déplace la contrainte sur la collecte de données d'exploitation et d'émissions.$KREDO$,
     '2028-01-01', 'medium', 'data_ai',
     $KREDO$Industrialiser la collecte plutôt que la reconstituer : consolidation des données de flotte, de consommation énergétique et de sous-traitance dans un entrepôt exploitable, avec piste d'audit. Fenêtre de dix-huit mois avant le premier exercice couvert.$KREDO$,
     true,
     'https://portail-rse.beta.gouv.fr/csrd/seuils-csrd-omnibus-criteres-d-application/'),

    (v_workspace_id, v_sector_id,
     $KREDO$Directive NIS2 — transposition française par la loi Résilience$KREDO$, 'FR',
     $KREDO$Échéance à confirmer : la loi Résilience transposant NIS2 n'était pas promulguée au 29 juillet 2026 (adoptée au Sénat le 12 mars 2025, séance publique à l'Assemblée annoncée pour juillet 2026). Le transport terrestre, aérien et maritime figure parmi les secteurs hautement critiques : les opérateurs concernés seront entités essentielles, avec notification d'incident sous 72 heures et sanctions jusqu'à 10 M€ ou 2 % du chiffre d'affaires mondial. L'ANSSI a publié le Référentiel Cyber France le 17 mars 2026, qui deviendra annexe des décrets d'application.$KREDO$,
     NULL, 'high', 'cyber',
     $KREDO$Pré-diagnostic d'écart au Référentiel Cyber France avant publication des décrets, sur ses cinq domaines. L'intérêt de le faire maintenant est qu'aucune date d'application n'est encore opposable : le chantier se cadre sans urgence subie, et l'entité peut s'en prévaloir en cas de contrôle.$KREDO$,
     true,
     'https://cyber.gouv.fr/reglementation/cybersecurite-systemes-dinformation/directives-nis-nis2-et-dispositif-saiv/directive-nis-2/'),

    (v_workspace_id, v_sector_id,
     $KREDO$Zones à Faibles Émissions — cadre suspendu à un texte spécifique$KREDO$, 'FR',
     $KREDO$Échéance à confirmer, et c'est le point le plus mal compris du secteur. La suppression des ZFE votée le 14 avril 2026 dans la loi de simplification a été annulée par le Conseil constitutionnel le 21 mai 2026 comme cavalier législatif : les ZFE restent en vigueur, mais leur trajectoire de durcissement n'est plus garantie et devra passer par un texte dédié. Les échéances « 2025-2030 » héritées de l'ancien outil ne sont pas opposables.$KREDO$,
     NULL, 'medium', 'data_ai',
     $KREDO$Aider à arbitrer un investissement de flotte sous cadre instable : modélisation du coût total de possession par scénario réglementaire, plutôt qu'un plan de verdissement calé sur un calendrier qui a déjà été remis en cause une fois.$KREDO$,
     false,
     'https://mondial.paris/actualites/auto-pratique/suppression-des-zfe-2026-le-conseil-constitutionnel-stoppe-la-loi-67959.html');

  -- 4. Trigger events (4) — source_url UNIQUE sur toute la table, vérifié sans collision
  DELETE FROM sector_events WHERE sector_id = v_sector_id;
  INSERT INTO sector_events
    (workspace_id, sector_id, title, event_type, description, event_date,
     commercial_opportunity, status, source_url)
  VALUES
    (v_workspace_id, v_sector_id,
     $KREDO$Gratuité des transports pour les plus de 65 ans sur la Métropole Nice Côte d'Azur$KREDO$, 'market',
     $KREDO$La Métropole fait évoluer sa politique tarifaire au 1er septembre 2026 avec la gratuité pour les plus de 65 ans. Une refonte de grille tarifaire de cette ampleur touche les règles de titres, la gestion des ayants droit et le contrôle des justificatifs d'âge.$KREDO$,
     '2026-09-01',
     $KREDO$Appeler la régie sur l'impact billettique : paramétrage des profils tarifaires, reprise des ayants droit, et traitement RGPD des justificatifs d'âge collectés. Le même jour que l'échéance de facturation électronique — un seul rendez-vous peut porter les deux sujets.$KREDO$,
     'pending',
     'https://www.nicepremium.fr/actualites/nice/priorite-aux-transports-le-calendrier-des-grands-projets-de-la-metropole-nice-cote-dazur-se-precise/'),

    (v_workspace_id, v_sector_id,
     $KREDO$Le Conseil constitutionnel annule la suppression des ZFE$KREDO$, 'regulatory',
     $KREDO$La suppression des zones à faibles émissions, votée le 14 avril 2026 dans la loi de simplification de la vie économique, a été censurée le 21 mai 2026 comme cavalier législatif. Les ZFE restent en vigueur, mais toute évolution devra passer par un texte spécifique.$KREDO$,
     '2026-05-21',
     $KREDO$Rouvrir le sujet chez les comptes qui avaient gelé leurs arbitrages de flotte en pariant sur la suppression. L'angle n'est pas « il faut verdir » mais « il faut décider sous incertitude » : modélisation du coût total de possession par scénario.$KREDO$,
     'pending',
     'https://mondial.paris/actualites/auto-pratique/suppression-des-zfe-2026-le-conseil-constitutionnel-stoppe-la-loi-67959.html'),

    (v_workspace_id, v_sector_id,
     $KREDO$L'ANSSI publie le Référentiel Cyber France et renforce son accompagnement$KREDO$, 'regulatory',
     $KREDO$Publié le 17 mars 2026, le Référentiel Cyber France définit les mesures de sécurité attendues des entités essentielles et importantes. Il n'est pas encore juridiquement contraignant mais deviendra annexe des décrets d'application de la loi Résilience.$KREDO$,
     '2026-03-17',
     $KREDO$Proposer un pré-diagnostic d'écart au référentiel pendant la fenêtre où rien n'est encore opposable. Cible prioritaire : les deux comptes exploitant des systèmes industriels critiques (contrôle tramway, tri bagages).$KREDO$,
     'pending',
     'https://cyber.gouv.fr/actualites/nis-2-lanssi-poursuit-et-renforce-sa-dynamique-daccompagnement/'),

    (v_workspace_id, v_sector_id,
     $KREDO$Adoption de la directive Omnibus I allégeant la CSRD$KREDO$, 'regulatory',
     $KREDO$Adoptée le 24 février 2026 et publiée au Journal officiel de l'Union européenne le 26 février 2026, la directive relève le seuil d'assujettissement à 1 000 salariés et reporte la vague 2 au premier exercice 2027.$KREDO$,
     '2026-02-24',
     $KREDO$Recontacter les comptes qui avaient gelé leur projet de reporting extra-financier : le report n'est pas une annulation, et les dix-huit mois gagnés sont exactement la durée d'un chantier de collecte industrialisée.$KREDO$,
     'pending',
     'https://finance.ec.europa.eu/capital-markets-union-and-financial-markets/company-reporting-and-auditing/company-reporting/corporate-sustainability-reporting_en');

  -- 5. Rattachement des comptes : déjà en place (6/6), aucune modification nécessaire.

  RAISE NOTICE 'Secteur transport-mobilite-regionale injecté : %', v_sector_id;
END
$migration$;
