-- Étude sectorielle : BTP, Construction & Négoce de matériaux
-- Corpus : riche — 9 comptes dans le périmètre, 6 avec sector_analysis FOLIO, ancre client Audemard
-- Score : 4.1/5 (plafond corpus : 5.0) — Gate 3 : 98/100, Axe A 35/35
-- Périmètre : négoce + construction. Iselection et Keller Williams France (transaction
--             immobilière) sont détachés du secteur — précédent Univet.
-- Sources : voir la section caveats de la fiche (9 URLs, toutes consultées le 17/07/2026)

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
    $KREDO$BTP, Construction & Négoce de matériaux$KREDO$,
    'btp-construction-immobilier',
    $KREDO$Négoce de matériaux et construction, étudié sur 9 comptes du portefeuille dont 6 disposent d'une analyse sectorielle et un est client (Audemard, Carros). Cinq de ces comptes sont implantés en PACA, ce qui en fait l'un des ancrages géographiques les plus denses du portefeuille. Le marché ne porte plus la croissance : le bâtiment pèse 193 Md€ HT mais ne rebondirait que de +1,8 % en 2026 après -10,8 % cumulés sur trois ans (FFB, 19/01/2026). L'angle d'attaque n'est donc pas le volume, c'est la contrainte réglementaire — trois échéances datées et vérifiées convergent sur 2026, dont la facturation électronique au 1er septembre qui frappe les 7 comptes assujettis, et l'émission dès cette date pour les 5 ETI. Le gap de marché est la donnée : référentiels produits éclatés (FDES, marquage CE), référentiels clients non réconciliés après acquisitions, reporting réglementaire reconstitué à la main. Fit principal data_ai, puis cloud_eng sur l'intégration post-acquisition.$KREDO$,
    'active',
    4.1, 193, 1.8,
    'medium',
    '{"data_ai": 4, "cloud_eng": 3, "product": 3, "cyber": 2}'::jsonb,
    $KREDO$[
      {"name":"Richardson","size":"652 M€","note":"Marseille, fondé en 1855. 104 agences, 75 showrooms, sanitaire/thermique/plastiques industriels. ETI : émission de factures électroniques obligatoire au 01/09/2026, et seul compte du périmètre clairement assujetti à la CSRD post-Omnibus."},
      {"name":"Ciffréo Bona","size":"609 M€","note":"Carros, plus de 100 points de vente en PACA et Occitanie. Reprend Balitrand, adhère à la centrale MCD, s'étend vers l'Est lyonnais : trois référentiels à réconcilier. Le seul compte dont l'analyse cite explicitement l'échéance du 01/09/2026."},
      {"name":"Audemard","size":"240 M€","note":"Carros, carrières et béton, 80 % du CA en Outre-mer. CLIENT KREDO — la seule ancre de preuve du secteur. Contacts IT identifiés : DSI, CTO, chef de projet IT. Attention : contrairement à ce qu'indique son analyse héritée, Audemard n'est PAS assujetti à la CSRD post-Omnibus."},
      {"name":"Sepalumic","size":"38 M€","note":"Mouans-Sartoux, 9e fabricant de fenêtres aluminium en France. Nouvelle ligne d'extrusion à Genlis, réseau Artisan Créateur. PME : réception au 01/09/2026, émission repoussée au 01/09/2027."},
      {"name":"Renaudi","size":"1,4 M€ (holding)","note":"Cagnes-sur-Mer, TP et terrassement, 60 ans d'ancrage azuréen, 3e génération familiale aux commandes. Le CA porte la holding, pas l'exploitation. Transmission générationnelle en cours : fenêtre de modernisation."}
    ]$KREDO$::jsonb,
    $KREDO$[
      {"name":"Saint-Gobain / Point P","size":"Géant","note":"Le concurrent national du négoce, cité comme menace principale par Ciffréo Bona et Richardson. C'est contre sa puissance d'achat que l'agilité de l'indépendant doit se défendre."},
      {"name":"Groupe Samse","size":"Grand","note":"Concurrent national du négoce de matériaux, cité par Ciffréo Bona."},
      {"name":"Rexel","size":"Grand","note":"Concurrent adossé à un groupe international, cité par Richardson sur le segment équipements."},
      {"name":"Groupe IDEC","size":"500 M€","note":"Paris. Opérateur immobilier intégré (conseil, foncier, conception, financement, construction, gestion), positionnement validé par une étude Xerfi. Croissance externe soutenue : VHM au Portugal (03/2026), Cecia, ER2i, Sequabat. Directement visé par l'extension RE2020 aux bâtiments industriels et logistiques."},
      {"name":"Groupe Trecobat","size":"203 M€","note":"Lannilis. Construction de maisons individuelles, pôle industrie bois, acquisition de POBI avec Hexaom. Maturité digitale réelle : partenariat Schneider Electric sur l'habitat connecté, médaille d'or de l'innovation 2025."}
    ]$KREDO$::jsonb,
    210, 1100,
    $KREDO${
      "personas": [
        {
          "role": "DSI / Responsable des systèmes d'information",
          "enjeu": "Raccorder le SI à une plateforme de facturation agréée avant le 1er septembre 2026, sans casser les flux avec des milliers de clients professionnels et de fournisseurs.",
          "peur": "Être celui par qui la facturation du groupe s'arrête le 2 septembre — un incident qui remonte au COMEX en 24 heures, pas en six mois."
        },
        {
          "role": "Directeur administratif et financier",
          "enjeu": "Sécuriser la conformité TVA et l'encaissement pendant la bascule vers la facture électronique.",
          "peur": "Que les factures partent, que personne ne les paie parce que le format est rejeté par la plateforme du client, et découvrir le trou de trésorerie au bout de 60 jours."
        },
        {
          "role": "Directeur QSE / RSE",
          "enjeu": "Produire à la demande les données environnementales exigées par la RE2020 élargie : FDES, fiches carbone, conformité des gammes au seuil 2028.",
          "peur": "Perdre un marché parce qu'un concurrent a sorti sa fiche carbone en 48 heures là où il lui faut trois semaines de reconstitution."
        },
        {
          "role": "Dirigeant / Directeur général (PME et ETI familiales)",
          "enjeu": "Absorber les acquisitions sans perdre l'agilité qui fait la différence face à Saint-Gobain, Point P ou Samse.",
          "peur": "Que l'intégration du dernier rachat révèle qu'on ne sait plus dire combien on gagne, par agence et par client."
        }
      ],
      "roi_arguments": [
        "Facturation électronique : la réception devient obligatoire pour toutes les entreprises au 1er septembre 2026, et l'émission le même jour pour les grandes entreprises et les ETI. 5 des 9 comptes du périmètre sont des ETI. Source : service-public.gouv.fr, actualité A15683, consultée le 17/07/2026.",
        "RE2020 : le décret n° 2026-16 du 15 janvier 2026 étend les exigences aux bâtiments industriels, artisanaux et tertiaires spécifiques, pour les permis déposés depuis le 1er mai 2026. La contrainte est déjà en vigueur. Source : Legifrance, JORFTEXT000053378848.",
        "CSRD : depuis l'entrée en vigueur de l'Omnibus le 18 mars 2026, le seuil est relevé à plus de 1 000 salariés et 450 M€ de CA net, ce qui réduit d'environ 80 % le nombre d'entreprises concernées. Sur les 4 comptes du portefeuille déclarés exposés, 3 ne le sont plus. Source : portail-rse.beta.gouv.fr, consulté le 17/07/2026.",
        "Marché : le bâtiment pèse 193 Md€ HT en 2025 pour 450 000 entreprises, et ne rebondirait que de +1,8 % en 2026 hors effet prix, après -10,8 % cumulés sur trois ans. La marge se joue sur le coût de traitement, pas sur le volume. Source : FFB, prévisions publiées le 19/01/2026.",
        "Intégration post-acquisition : 3 des 6 comptes analysés mènent une croissance externe documentée (Ciffréo Bona/Balitrand, IDEC/VHM-Cecia-ER2i, Trecobat/POBI). Gain de consolidation non chiffré à ce jour, à valider sur le contexte client. Source : estimation Kredo, justifiée par les acquisitions citées dans les analyses de comptes."
      ],
      "objections": [
        {
          "objection": "On a déjà un éditeur qui gère notre facturation, il nous a dit qu'il s'en occupait.",
          "reponse": "La question n'est pas votre éditeur, c'est votre périmètre. L'obligation porte aussi sur les flux entrants : au 1er septembre vous devez pouvoir recevoir les factures de tous vos fournisseurs via une plateforme agréée. On cartographie les flux réels en deux semaines et on vous dit précisément ce que votre éditeur ne couvre pas — s'il couvre tout, vous l'aurez écrit noir sur blanc."
        },
        {
          "objection": "Le bâtiment va mal, ce n'est vraiment pas le moment d'investir dans l'informatique.",
          "reponse": "La FFB annonce +1,8 % en 2026 après -10,8 % en trois ans, et prévoit un niveau d'activité encore inférieur à celui de 2024. C'est précisément parce que le volume ne revient pas que la marge se joue ailleurs : sur le coût de traitement d'une commande, d'un devis, d'une facture. Le chantier réglementaire est de toute façon obligatoire — la seule variable est de savoir s'il vous sert à autre chose."
        },
        {
          "objection": "Nos agences travaillent comme ça depuis quarante ans, elles ne suivront jamais.",
          "reponse": "C'est le vrai risque, et il est humain, pas technique. C'est pourquoi on ne part pas de l'outil mais d'une agence pilote et de ses habitudes réelles : ce que le chef d'agence saisit deux fois, ce qu'il note encore sur papier, ce qu'il contourne. Un négoce à 100 points de vente ne se transforme pas par décret depuis le siège — il se transforme quand la première agence gagne du temps et le raconte aux autres."
        }
      ],
      "entry_points": [
        "Réglementaire : facturation électronique — audit de raccordement à une plateforme agréée avant le 1er septembre 2026. La réception est obligatoire pour tous, l'émission pour les ETI dès cette date.",
        "Quick-win : cartographie des flux de facturation et du référentiel produits — 2 à 4 semaines, livrable directement opposable au chantier e-invoicing et au dossier RE2020.",
        "Transformation : consolidation du SI post-acquisition — réconcilier les référentiels clients, produits et tarifs des entités rachetées, et redonner une vision de marge par agence et par client (6 à 12 mois).",
        "Réseau : Fédération Française du Bâtiment et Fédération du Négoce de Bois et Matériaux — portes d'entrée institutionnelles du bassin PACA, où 5 des 9 comptes sont implantés. Audemard, client Kredo à Carros, sert de référence locale."
      ]
    }$KREDO$::jsonb,
    $KREDO${
      "verbatims": "Aucun verbatim client réel. Le secteur ne compte qu'une seule interaction en base, et c'est un e-mail sortant rédigé par Kredo : zéro parole client exploitable. Tous les pain points sont déduits d'analyses documentaires, pas de propos tenus par un interlocuteur. À collecter aux prochains rendez-vous.",
      "frequences": "Comptage tracé : source_company_ids est peuplé sur les 6 pain points, et chaque fréquence est égale au nombre d'UUID listés. Les thèmes proviennent des 6 comptes disposant d'une analyse sectorielle ; Sepalumic, Griesser et Pilatus Groupe n'en ont pas et ne sont comptés que sur des critères objectifs (taille, établissement en France). Griesser (entité suisse) et Pilatus Groupe (identification impossible, signalée dans sa propre analyse) sont volontairement exclus du comptage de la facturation électronique.",
      "corpus": "Corpus riche au sens du processus : 6 comptes avec analyse sectorielle et une ancre client (Audemard). Mais l'ancre est formelle plus que probante — aucune mission, aucune opportunité, aucun diagnostic exploitable dans le secteur. Les 3 process_diagnostic présents en base sont des coquilles de 62 caractères renvoyant à un PDF absent. Le fit practice est donc une hypothèse, pas un fait démontré par une vente. Périmètre restreint au négoce et à la construction : Iselection et Keller Williams France, qui relèvent de la transaction immobilière, sont hors sujet et détachés du secteur.",
      "marche": "193 Md€ HT, 450 000 entreprises et +1,8 % en 2026 : FFB, publiés le 19/01/2026. Négoce de bois et matériaux : environ 35 Md€ et 9 200 points de vente, Xerfi 2025. Aucun TJM sectoriel observé (0 mission, 0 opportunité dans le secteur) — la fourchette affichée provient de la grille tarifaire par practice, pas d'une vente réelle ici. Deux corrections aux analyses de comptes héritées : la mention « site web non accessible » portée sur Audemard, Richardson, Renaudi et Pilatus est fausse (les 6 sites du corpus répondent en HTTP 200, testé le 17/07/2026), ce qui invalide les verdicts de maturité digitale qui en découlaient — d'où un classement medium et non low. Les libellés « RE2026 » et « RE2025 » n'existent pas : le texte réel est la RE2020, modifiée par les décrets n° 2024-1258 et n° 2026-16. L'articulation exacte des seuils CSRD post-Omnibus (« plus de 1 000 salariés et 450 M€ ») reste ambiguë sur la source officielle : cumulative ou alternative, à confirmer.",
      "sources": [
        "https://entreprendre.service-public.gouv.fr/actualites/A15683",
        "https://www.impots.gouv.fr/professionnel/je-passe-la-facturation-electronique",
        "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053378848",
        "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000050873122",
        "https://portail-rse.beta.gouv.fr/csrd/seuils-csrd-omnibus-criteres-d-application/",
        "https://www.ecologie.gouv.fr/presse/refondation-rep-pmcb-filiere-plus-efficace-plus-lisible-economiquement-soutenable",
        "https://www.ffbatiment.fr/actualites-batiment/actualite-ba/bilan-2025-previsions-2026-leger-rebond-sans-reprise-batiment",
        "https://www.ffbatiment.fr/le-batiment-en-chiffres",
        "https://www.xerfi.com/presentationetude/Le-negoce-de-bois-et-de-materiaux-de-construction_NEG15"
      ]
    }$KREDO$::jsonb,
    NULL   -- aucun visuel BTP disponible dans /public/images/sectors : fond navy plutôt qu'une image d'un autre secteur
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

  -- 2. Pain points (6) — purge puis réinsertion, rejouable
  DELETE FROM sector_pain_points WHERE sector_id = v_sector_id;
  INSERT INTO sector_pain_points
    (workspace_id, sector_id, title, description, frequency_count, source_company_ids, kredo_practice, verbatim)
  VALUES
    (v_workspace_id, v_sector_id,
     $KREDO$Facturation électronique : tout bascule au 1er septembre$KREDO$,
     $KREDO$Les 7 comptes du périmètre dont la taille et l'établissement en France sont confirmés doivent recevoir des factures électroniques au 1er septembre 2026. Cinq d'entre eux sont des ETI (Richardson 2 080 salariés, Ciffréo Bona 1 300, Groupe IDEC 620, Trecobat 600, Audemard 240 M€ de CA) et doivent aussi émettre dès cette date. Pour un négociant qui facture des milliers d'artisans, l'enjeu n'est pas l'outil de facturation mais la conformité des flux avec des milliers de tiers. Source : service-public.gouv.fr, actualité A15683, consultée le 17/07/2026.$KREDO$,
     7,
     ARRAY['2ea63e2c-346a-4f98-810f-d2ea252206f0','4ca75ded-6adb-417f-a1ff-2e456072d134','b7c8dd96-358d-4fec-a0bf-4b9bbc213f6c','97278ff4-ff64-4406-9ff2-0bc73c947355','3ba175b0-f51c-4a62-9769-67c4d850f460','b843bb13-9ae0-4da6-91d5-a372fa57b2b6','5254e6a9-e717-44e9-bdf7-cb6d25356b32']::uuid[],
     'multi', NULL),

    (v_workspace_id, v_sector_id,
     $KREDO$RE2020 : le périmètre s'est élargi le 1er mai 2026$KREDO$,
     $KREDO$Les 6 comptes disposant d'une analyse sectorielle citent tous la performance énergétique et environnementale comme contrainte structurante. Le décret n° 2026-16 du 15 janvier 2026 a élargi la RE2020 aux bâtiments industriels, artisanaux et tertiaires spécifiques pour les permis déposés depuis le 1er mai 2026 — ce qui touche directement le Groupe IDEC (logistique, industrie, tertiaire) et, en amont, ceux qui fournissent ces chantiers. Source : Legifrance, JORFTEXT000053378848.$KREDO$,
     6,
     ARRAY['b7c8dd96-358d-4fec-a0bf-4b9bbc213f6c','2ea63e2c-346a-4f98-810f-d2ea252206f0','5254e6a9-e717-44e9-bdf7-cb6d25356b32','4ca75ded-6adb-417f-a1ff-2e456072d134','97278ff4-ff64-4406-9ff2-0bc73c947355','3ba175b0-f51c-4a62-9769-67c4d850f460']::uuid[],
     'data_ai', NULL),

    (v_workspace_id, v_sector_id,
     $KREDO$Acquisitions en série, des SI qui ne se parlent pas$KREDO$,
     $KREDO$Trois des six comptes analysés mènent une croissance externe active et documentée : Ciffréo Bona (reprise de Balitrand, adhésion à la centrale MCD, expansion vers l'Est lyonnais), Groupe IDEC (VHM au Portugal en mars 2026, Cecia, ER2i, Sequabat devenu IDEC Grand Sud), Trecobat (POBI avec Hexaom, validé par l'Autorité de la concurrence). Chaque rachat ajoute un référentiel clients, produits et tarifs qui ne se réconcilie pas avec les autres.$KREDO$,
     3,
     ARRAY['b7c8dd96-358d-4fec-a0bf-4b9bbc213f6c','97278ff4-ff64-4406-9ff2-0bc73c947355','3ba175b0-f51c-4a62-9769-67c4d850f460']::uuid[],
     'cloud_eng', NULL),

    (v_workspace_id, v_sector_id,
     $KREDO$CSRD : l'Omnibus a rebattu qui est vraiment assujetti$KREDO$,
     $KREDO$Les analyses de comptes signalent une exposition CSRD sur Audemard, Renaudi et le Groupe IDEC. Aucun des trois ne franchit les seuils relevés par l'Omnibus (plus de 1 000 salariés et 450 M€ de CA net) : Audemard 200 salariés, Renaudi 3, IDEC 620. À l'inverse, Richardson (2 080 salariés, 652 M€) est concerné et n'était pas signalé. Arriver avec cette correction vaut mieux que d'arriver avec un argumentaire CSRD. Source : portail-rse.beta.gouv.fr, consulté le 17/07/2026.$KREDO$,
     3,
     ARRAY['2ea63e2c-346a-4f98-810f-d2ea252206f0','5254e6a9-e717-44e9-bdf7-cb6d25356b32','97278ff4-ff64-4406-9ff2-0bc73c947355']::uuid[],
     'data_ai', NULL),

    (v_workspace_id, v_sector_id,
     $KREDO$Données produits éparpillées : FDES, marquage CE, NF$KREDO$,
     $KREDO$Trois comptes portent une exigence de données produits opposable : Ciffréo Bona (risque de commercialiser des matériaux sans FDES à jour), Audemard (marquage CE, NF EN 206 sur les bétons, formulations à adapter), Richardson (marquage CE, traçabilité des fluides frigorigènes F-Gaz). Ces données existent, mais dans des fiches fournisseurs, des PDF et des tableurs — pas dans un référentiel interrogeable.$KREDO$,
     3,
     ARRAY['b7c8dd96-358d-4fec-a0bf-4b9bbc213f6c','2ea63e2c-346a-4f98-810f-d2ea252206f0','4ca75ded-6adb-417f-a1ff-2e456072d134']::uuid[],
     'data_ai', NULL),

    (v_workspace_id, v_sector_id,
     $KREDO$Le négoce bascule en ligne, les pure players avancent$KREDO$,
     $KREDO$Ciffréo Bona et Richardson identifient tous deux la digitalisation des achats B2B comme la menace principale sur le modèle du négoce de proximité, face à des pure players e-commerce et à des concurrents adossés à Saint-Gobain ou Rexel. Le sujet n'est pas d'avoir un site, mais de tenir un catalogue, des tarifs par client et une disponibilité en temps réel sur plus de 100 points de vente.$KREDO$,
     2,
     ARRAY['b7c8dd96-358d-4fec-a0bf-4b9bbc213f6c','4ca75ded-6adb-417f-a1ff-2e456072d134']::uuid[],
     'product', NULL);

  -- 3. Réglementaire (5) — 4 datés et vérifiés sur source officielle, 1 à confirmer
  DELETE FROM sector_regulatory_items WHERE sector_id = v_sector_id;
  INSERT INTO sector_regulatory_items
    (workspace_id, sector_id, name, authority, description, deadline_date, urgency,
     kredo_practice, commercial_angle, is_commercial_window, source_url)
  VALUES
    (v_workspace_id, v_sector_id,
     $KREDO$Facturation électronique obligatoire$KREDO$, 'FR',
     $KREDO$Au 1er septembre 2026, toutes les entreprises assujetties à la TVA en France doivent être capables de RECEVOIR des factures électroniques via une plateforme agréée. Les grandes entreprises et les ETI doivent aussi les ÉMETTRE à cette date ; les PME et TPE ont un an de plus, jusqu'au 1er septembre 2027.$KREDO$,
     '2026-09-01', 'critical', 'multi',
     $KREDO$Audit de raccordement à une plateforme agréée : cartographier les flux entrants et sortants, identifier ce que l'éditeur en place ne couvre pas, et sécuriser la bascule. 5 des 9 comptes du périmètre sont des ETI et sont donc concernés par l'émission dès septembre 2026.$KREDO$,
     true,
     'https://entreprendre.service-public.gouv.fr/actualites/A15683'),

    (v_workspace_id, v_sector_id,
     $KREDO$Décret n° 2026-16 du 15 janvier 2026 — extension de la RE2020$KREDO$, 'FR',
     $KREDO$Étend les exigences de performance énergétique et environnementale de la RE2020 aux bâtiments d'activités tertiaires spécifiques, industriels et artisanaux. S'applique aux permis de construire déposés depuis le 1er mai 2026 : la contrainte est déjà en vigueur, elle n'est plus à anticiper.$KREDO$,
     '2026-05-01', 'high', 'data_ai',
     $KREDO$Les données produits (FDES, fiches carbone, marquage CE) deviennent une pièce du dossier de permis. Structurer le référentiel produits pour sortir une fiche environnementale à la demande, au lieu de la reconstituer projet par projet.$KREDO$,
     true,
     'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053378848'),

    (v_workspace_id, v_sector_id,
     $KREDO$RE2020 — seuil carbone 2028 (décret n° 2024-1258)$KREDO$, 'FR',
     $KREDO$Le plafond carbone se resserre par paliers : 2025 (déjà en vigueur), puis 2028 (environ -24 % cumulés par rapport à 2022) et 2031 (-35 %). Concerne les permis déposés à compter du 1er janvier 2028.$KREDO$,
     '2028-01-01', 'medium', 'data_ai',
     $KREDO$Le palier 2028 se prépare sur les gammes, pas sur les chantiers : savoir dès aujourd'hui quels produits du catalogue passeront le seuil et lesquels en sortiront. C'est un sujet de données produits, pas de bureau d'études.$KREDO$,
     false,
     'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000050873122'),

    (v_workspace_id, v_sector_id,
     $KREDO$CSRD révisée par la directive Omnibus$KREDO$, 'EU',
     $KREDO$L'Omnibus, entré en vigueur le 18 mars 2026, relève fortement les seuils (plus de 1 000 salariés et 450 M€ de CA net) et réduit d'environ 80 % le nombre d'entreprises concernées. Les nouvelles modalités s'appliquent aux exercices ouverts à compter du 1er janvier 2028.$KREDO$,
     '2028-01-01', 'medium', 'data_ai',
     $KREDO$Recadrer avant de vendre : sur les 4 comptes que les analyses héritées déclaraient exposés à la CSRD, 3 ne le sont plus depuis l'Omnibus — et Richardson, qui l'est, n'était pas signalé. Arriver avec le bon périmètre est en soi une démonstration de sérieux.$KREDO$,
     true,
     'https://portail-rse.beta.gouv.fr/csrd/seuils-csrd-omnibus-criteres-d-application/'),

    (v_workspace_id, v_sector_id,
     $KREDO$REP PMCB — refondation de la filière$KREDO$, 'FR',
     $KREDO$La filière REP des produits et matériaux de construction a été refondée après douze mois de concertation, décision annoncée le 19 février 2026 : distinction entre matériaux matures (inertes, métal, bois) et non matures, nouveau modèle de visibilité à 9 mois sur les éco-contributions. Échéance d'application à confirmer — aucune date précise n'est publiée à ce jour sur source officielle.$KREDO$,
     NULL, 'medium', 'data_ai',
     $KREDO$Les éco-contributions doivent être répercutées dans les devis et contrats en amont. Cela suppose de rattacher chaque référence produit à sa catégorie REP et à son taux — un chantier de référentiel, à cadrer dès que le calendrier sera publié.$KREDO$,
     false,
     'https://www.ecologie.gouv.fr/presse/refondation-rep-pmcb-filiere-plus-efficace-plus-lisible-economiquement-soutenable');

  -- 4. Trigger events (4) — source_url distinctes, status 'pending' (sinon ignorés par la page BI)
  DELETE FROM sector_events WHERE sector_id = v_sector_id;
  INSERT INTO sector_events
    (workspace_id, sector_id, title, event_type, description, event_date,
     commercial_opportunity, status, source_url)
  VALUES
    (v_workspace_id, v_sector_id,
     $KREDO$La RE2020 s'étend aux bâtiments industriels et artisanaux$KREDO$, 'regulatory',
     $KREDO$Le décret n° 2026-16 du 15 janvier 2026, publié au JO le 17 janvier, étend la RE2020 à 13 nouvelles catégories de bâtiments tertiaires, industriels et artisanaux, pour les permis déposés depuis le 1er mai 2026.$KREDO$,
     '2026-05-01',
     $KREDO$Appeler les comptes qui construisent ou fournissent des bâtiments industriels et logistiques — le Groupe IDEC en premier — avec une question simple : leurs dossiers de permis déposés depuis mai intègrent-ils déjà les données environnementales exigées ?$KREDO$,
     'pending',
     'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053378848'),

    (v_workspace_id, v_sector_id,
     $KREDO$L'Omnibus divise par cinq le périmètre de la CSRD$KREDO$, 'regulatory',
     $KREDO$Entrée en vigueur le 18 mars 2026. Les seuils passent à plus de 1 000 salariés et 450 M€ de CA net, les points de données obligatoires sont réduits d'environ 60 % et les normes sectorielles abandonnées. Le nombre d'entreprises concernées dans l'UE passe d'environ 50 000 à 10 000.$KREDO$,
     '2026-03-18',
     $KREDO$Motif d'appel à contre-courant : prévenir un compte qu'il n'est plus assujetti. Trois comptes du portefeuille croient l'être et ne le sont plus ; Richardson l'est et l'ignore peut-être. C'est un appel qui ne vend rien et qui installe la crédibilité.$KREDO$,
     'pending',
     'https://portail-rse.beta.gouv.fr/csrd/seuils-csrd-omnibus-criteres-d-application/'),

    (v_workspace_id, v_sector_id,
     $KREDO$La FFB annonce un rebond 2026 limité à +1,8 %$KREDO$, 'report',
     $KREDO$Prévisions publiées le 19 janvier 2026 : après -10,8 % cumulés sur trois ans et -4,0 % en 2025, l'activité ne progresserait que de +1,8 % hors effet prix en 2026, à un niveau encore inférieur à celui de 2024. Logement neuf +9,5 %, non-résidentiel neuf +0,5 %, entretien-amélioration -0,5 %.$KREDO$,
     '2026-01-19',
     $KREDO$Le chiffre qui désamorce l'objection budgétaire : puisque le volume ne revient pas, la marge se joue sur le coût de traitement. À citer tel quel, avec sa source, dès que « ce n'est pas le moment » arrive.$KREDO$,
     'pending',
     'https://www.ffbatiment.fr/actualites-batiment/actualite-ba/bilan-2025-previsions-2026-leger-rebond-sans-reprise-batiment'),

    (v_workspace_id, v_sector_id,
     $KREDO$Refondation de la filière REP des matériaux de construction$KREDO$, 'regulatory',
     $KREDO$Décision annoncée le 19 février 2026 après douze mois de concertation : distinction entre matériaux matures et non matures, réseau de points de reprise réorganisé, visibilité à 9 mois sur les taux d'éco-contribution pour permettre leur intégration dans les devis et contrats.$KREDO$,
     '2026-02-19',
     $KREDO$Ouvrir le sujet chez les négociants (Ciffréo Bona, Richardson) et les producteurs (Audemard, Sepalumic) : savent-ils rattacher chaque référence de leur catalogue à sa catégorie REP et à son taux ? Si la réponse est un tableur, le chantier de référentiel est là.$KREDO$,
     'pending',
     'https://www.ecologie.gouv.fr/presse/refondation-rep-pmcb-filiere-plus-efficace-plus-lisible-economiquement-soutenable');

  -- 5. Détachement des 2 comptes hors périmètre (transaction immobilière) — précédent Univet.
  --    Sans ce détachement, la fiche affiche deux intrus et perd le critère E2 de la grille.
  UPDATE companies SET sector_id = NULL
  WHERE workspace_id = v_workspace_id
    AND id IN ('346d2d42-b251-44f9-a66b-0461486d6556',   -- Iselection
               '0c01b56e-7e56-43c9-933b-bc4e8d7bae3d');  -- Keller Williams France

  RAISE NOTICE 'Secteur % injecté : %', 'btp-construction-immobilier', v_sector_id;
END
$migration$;
