-- Étude sectorielle : Santé, MedTech & Médico-social
-- Corpus : moyen — 10 comptes rattachés, 10 avec sector_analysis FOLIO, AUCUNE ancre de preuve
-- Score : 4.2/5 (plafond corpus : 4.5)
-- Gate 3 : 94/100 (mécanique 80/80, axe A 35/35, jugement 14/20)
-- Sources : voir sector_intelligence.caveats->'sources' après injection
--
-- Écriture volontaire hors fiche : Univet (groupe vétérinaire) est détaché du secteur.
-- Aucune des 6 échéances réglementaires ne le concerne, il ne porte pas de donnée de
-- santé humaine. Il reste sans secteur : aucun conteneur existant ne lui convient, et
-- le ranger dans un bac faux serait pire que de laisser le trou visible.

DO $migration$
DECLARE
  v_workspace_id uuid;
  v_sector_id    uuid;
BEGIN
  SELECT id INTO v_workspace_id FROM workspaces LIMIT 1;

  -- 1. La fiche (le secteur existe déjà en 'watch' : UPSERT)
  INSERT INTO sector_intelligence (
    workspace_id, name, slug, description, status,
    attractiveness_score, market_size_eur_bn, market_growth_pct,
    digital_maturity, practices_fit, key_players_paca, key_players_national,
    avg_tjm_min, avg_tjm_max, playbook, caveats, image_url
  ) VALUES (
    v_workspace_id,
    $KREDO$Santé, MedTech & Médico-social$KREDO$,
    'sante-medtech-medico-social',
    $KREDO$Secteur de rangement plus que marché unique : 10 comptes rattachés couvrant 8 marchés qui ne se parlent pas (CHU public, pharma ophtalmologique, santé à domicile, biologie médicale, anatomopathologie, MedTech IA, société savante, médico-social handicap). La fiche est construite sur leur seul dénominateur commun réellement mutualisable : la donnée de santé sous contrainte réglementaire, vérifiée sur 9 comptes. Corpus moyen — 10 comptes avec analyse sectorielle FOLIO, mais aucune ancre de preuve (0 client, 0 diagnostic réel, missions et opportunités du secteur toutes synthétiques) : plafond de corpus 4.5 appliqué, score 4.2. Fit dominant data_ai (5 comptes exposés à l'AI Act et à l'EHDS) et cyber (NIS2, 4 comptes). Fenêtre d'attaque : NIS2 n'est pas transposée, la France est renvoyée devant la CJUE depuis le 08/07/2026 — la loi arrivera avec un délai d'exécution compressé.$KREDO$,
    'active',
    4.2, NULL, NULL,
    'medium',
    '{"data_ai": 5, "cloud_eng": 3, "product": 2, "cyber": 4}'::jsonb,
    $KREDO$[
      {"name":"CHU de Nice","size":"800 M€ · 9 500 salariés","note":"1er CHU de la région Sud, établissement support du GHT06. Porte d'entrée institutionnelle vers les établissements du groupement."},
      {"name":"SOS Oxygène","size":"578 M€ · 2 700 salariés","note":"Prestataire de santé à domicile indépendant niçois, ~7 % du marché. Marges sous contrainte tarifaire LPPR, axe de différenciation sur la santé du sommeil."},
      {"name":"Centre Antoine Lacassagne","size":"964 salariés","note":"Centre de lutte contre le cancer UNICANCER, leader oncologie Côte d'Azur, file active supérieure à 67 000 patients."},
      {"name":"Horus Pharma","size":"93 M€ · 230 salariés","note":"Leader français indépendant en ophtalmologie, plus de 12 % de part de marché nationale, pipeline biosimilaires. Cumule MDR et complexité réglementaire multi-pays."},
      {"name":"Median Technologies","size":"23,5 M€ · 200 salariés","note":"MedTech IA en oncologie pulmonaire (eyonis®) et activité iCRO. Seul compte à cumuler AI Act haut risque, MDR et FDA sur le même produit."},
      {"name":"Medipath","size":"104 M€ (2023)","note":"Anatomopathologie pilotée par des pathologistes libéraux, IA propriétaire VisioCyt. Exposé IVDR y compris sur ses tests développés en interne."},
      {"name":"LBM Bioesterel","size":"Groupe Biogroup 1,6 Md€ · 800 salariés","note":"Biologie médicale, réseau Biogroup Côte d'Azur. Accréditation COFRAC ISO 15189 et bascule IVDR."},
      {"name":"European Society of Cardiology","size":"90 000 membres · 120 pays","note":"Société savante à Sophia Antipolis. Registres cliniques multi-pays : le cas d'interopérabilité le plus difficile du portefeuille."}
    ]$KREDO$::jsonb,
    $KREDO$[
      {"name":"Air Liquide Healthcare","size":"Géant","note":"Domine le marché français de la santé à domicile. Référence concurrentielle directe de SOS Oxygène."},
      {"name":"Biogroup","size":"1,6 Md€","note":"L'un des six groupes qui concentrent environ 60 % de la biologie médicale privée française."},
      {"name":"Théa Pharma","size":"Leader français","note":"Leader français en ophtalmologie, concurrent direct d'Horus Pharma."},
      {"name":"Eurofins / Cerba / Synlab","size":"Géants","note":"Groupes financiarisés de biologie et d'anatomopathologie, moteurs de la consolidation du secteur."}
    ]$KREDO$::jsonb,
    650, 920,
    $KREDO${
      "personas": [
        {"role":"DSI d'établissement de santé (CHU, centre de lutte contre le cancer)",
         "enjeu":"Ouvrir le SI à l'interopérabilité et à l'IA sans perdre la conformité HDS ni la certification HAS, avec un budget d'investissement sous contrainte ONDAM.",
         "peur":"Être celui par qui la cyberattaque est arrivée, et devoir rediriger les urgences vers l'établissement voisin pendant que la presse régionale titre dessus."},
        {"role":"Directrice Qualité et Affaires Réglementaires (MedTech, pharma)",
         "enjeu":"Tenir les échéances MDR, IVDR et AI Act sans décaler les mises sur le marché ni immobiliser les équipes produit.",
         "peur":"Découvrir à l'audit blanc que la traçabilité risques-exigences-tests ne tient pas, à six mois d'une échéance qui ne sera pas reportée une troisième fois."},
        {"role":"Biologiste responsable / Directeur de laboratoire",
         "enjeu":"Maintenir l'accréditation COFRAC ISO 15189 et basculer le parc DMDIV sous IVDR tout en absorbant les baisses tarifaires NABM.",
         "peur":"Perdre l'accréditation sur un audit défavorable : l'activité ne ralentit pas, elle s'arrête, et plus aucun acte n'est facturable."},
        {"role":"Directeur général d'organisme médico-social",
         "enjeu":"Absorber SERAFIN-PH et le nouveau référentiel d'évaluation HAS avec des dotations encadrées par la LFSS 2026.",
         "peur":"Voir une association membre du réseau décrocher faute de moyens de mise en conformité, et devoir l'annoncer aux familles."}
      ],
      "roi_arguments": [
        "Sanctions AI Act : jusqu'à 35 M€ ou 7 % du CA mondial pour une pratique interdite, 15 M€ ou 3 % pour un manquement aux obligations haut risque, 7,5 M€ ou 1 % pour une information trompeuse à l'autorité. Source: Règlement (UE) 2024/1689, article 99.",
        "NIS2 : délai de transposition dépassé depuis le 17/10/2024, renvoi de la France devant la CJUE le 08/07/2026 avec somme forfaitaire et astreinte journalière demandées, loi Résilience non promulguée à ce jour. Source: Commission européenne (procédure d'infraction du 08/07/2026) et ANSSI (MonEspaceNIS2, état de la transposition).",
        "MDR : le dossier technique des classes III et IIb implantables doit être repris avant le 31/12/2027, les autres IIb, IIa et I stériles avant le 31/12/2028. Passé cette date, le dispositif ne peut plus être mis sur le marché. Source: Règlement (UE) 2023/607 modifiant l'article 120 du MDR (EUR-Lex).",
        "IVDR : bascule des DMDIV de classe D au 31/12/2027, classe C au 31/12/2028, classes B et A stériles au 31/12/2029 — y compris les tests développés en interne par les laboratoires. Source: Règlement (UE) 2024/1860, Commission européenne, Transitional provisions.",
        "Reprise outillée d'un référentiel risques-exigences-tests : potentiel estimé à -30 % à -50 % d'effort sur la constitution du dossier de preuve, à valider sur le contexte client. Source: estimation Kredo — aucune mission de référence n'existe dans ce secteur, aucun chiffre interne ne l'étaye."
      ],
      "objections": [
        {"objection":"Vous n'êtes pas certifiés HDS, vous ne pouvez donc pas toucher à nos données de santé.",
         "reponse":"Exact, et nous n'hébergeons pas. La certification HDS porte sur l'hébergeur, pas sur l'intégrateur : nous intervenons sur la conception des flux, le mapping et la recette, à l'intérieur de votre hébergement déjà certifié. Le périmètre exact et les accès se cadrent avec votre DPO au premier atelier — c'est une question de contrat de sous-traitance au sens du RGPD, pas de certification de Kredo."},
        {"objection":"L'IA en santé, on attend que la réglementation se stabilise avant d'investir.",
         "reponse":"Elle est stabilisée : l'AI Act est publié depuis le 12/07/2024, le régime général s'applique le 02/08/2026 et les dispositifs médicaux à IA le 02/08/2027 (art. 6(1)). Ce qui n'est pas stabilisé, ce sont les normes harmonisées — mais elles portent sur le comment, pas sur le si. Attendre ne réduit pas le risque, ça réduit le temps disponible : un dossier technique haut risque se construit sur douze à dix-huit mois, pas sur un trimestre."},
        {"objection":"NIS2 n'est pas transposée en France, donc rien ne nous oblige aujourd'hui.",
         "reponse":"Juridiquement vrai, et c'est exactement la fenêtre. Le délai européen était le 17/10/2024 ; la Commission a renvoyé la France devant la CJUE le 08/07/2026 en demandant une astreinte journalière. La loi passera, et plus elle passe tard, plus le délai d'exécution sera compressé. Les établissements qui auront cartographié leur SI d'ici là n'auront qu'à appliquer. Les autres découvriront leur périmètre d'entité essentielle en même temps que leurs obligations."}
      ],
      "entry_points": [
        "Réglementaire: NIS2 — cartographier le SI et qualifier le périmètre d'entité essentielle avant la promulgation de la loi Résilience (renvoi CJUE du 08/07/2026, examen parlementaire repoussé à septembre 2026).",
        "Quick-win: audit de trois semaines de la traçabilité risques-exigences-tests d'un dispositif à IA, en visée de l'échéance AI Act art. 6(1) du 02/08/2027.",
        "Transformation: mise en interopérabilité FHIR et alignement terminologique du parcours de données, en anticipation des actes d'exécution EHDS de mars 2027 et de l'usage primaire au 26/03/2029.",
        "Réseau: écosystème Nice Côte d'Azur — le CHU de Nice est établissement support du GHT06, porte d'entrée vers les établissements du groupement (à confirmer : information issue de FOLIO, non re-vérifiée en source officielle)."
      ]
    }$KREDO$::jsonb,
    $KREDO${
      "verbatims": "Aucun verbatim client réel. Les 16 interactions rattachées au secteur sont toutes inexploitables : 15 portent un marqueur de données de test (fictional:true, synthetic:true, lots kredo_fake_2026_jan_aug_v1 et kredo_staffing_360_v1) et la 16e est un email généré par Kredo lui-même (source: intel-020-communication). Aucune n'est une parole client. Les verbatims sont à collecter aux premiers rendez-vous.",
      "frequences": "Comptage réel et exhaustif sur les 10 analyses sectorielles FOLIO du secteur, UUID tracés dans source_company_ids pour chacun des 7 pain points. Limite : le corpus compté est FOLIO, c'est-à-dire ce qu'un import unique du 09/06/2026 a écrit sans source ni date, pas un relevé terrain. La fréquence prouve la récurrence dans le corpus, pas la récurrence dans la réalité.",
      "corpus": "Moyen — 10 comptes rattachés, 10 avec sector_analysis FOLIO, mais AUCUNE ancre de preuve. Zéro compte en lifecycle_status='client'. Le seul process_diagnostic (Horus Pharma) est une coquille vide : {\"synthese\": \"Document d'audit stratégique — voir PDF joint.\"}. Les 3 missions et 4 opportunités du secteur sont toutes synthétiques. Le fit practice est donc une hypothèse argumentée, jamais un fait prouvé : Kredo n'a rien vendu de réel dans ce secteur, et il n'existe aucune référence à opposer à « vous avez fait ça chez qui ? ». Plafond de corpus 4.5 appliqué, score 4.2. Réserve de périmètre : le secteur agrège 8 marchés qui ne se parlent pas, la fiche est construite sur leur seul dénominateur commun, la donnée de santé sous contrainte. Univet (vétérinaire) a été détaché du secteur à l'injection : aucune des 6 échéances ne le concernait.",
      "marche": "market_size_eur_bn et market_growth_pct laissés NULL volontairement, et non par défaut de recherche : le périmètre agrège CHU public, pharma ophtalmologique, santé à domicile, biologie médicale, anatomopathologie, MedTech IA, société savante et médico-social. Aucune taille de marché unique n'a de sens ici, et en publier une serait un chiffre faux. Repère indicatif écarté de la fiche : santé numérique France estimée à 6,58 Md$ en 2024 par GM Insights (source secondaire payante, périmètre différent). Ancrage tarifaire 650-920 € dérivé des TJM recommandés de la grille interne offer_pricing_grids sur les practices data-ai et cybersecurity, séniorités senior et lead — grille générique, jamais observée sur une vente réelle dans ce secteur.",
      "sources": [
        "https://artificialintelligenceact.eu/article/113/",
        "https://artificialintelligenceact.eu/article/99/",
        "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A32024R1689",
        "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A32023R0607",
        "https://health.ec.europa.eu/medical-devices-vitro-diagnostics/transitional-provisions_en",
        "https://health.ec.europa.eu/ehealth-digital-health-and-care/european-health-data-space-regulation-ehds_en",
        "https://aide.monespacenis2.cyber.gouv.fr/fr/article/avancement-de-la-transposition-de-la-directive-nis-2-1b3j1da/",
        "https://agenceurope.eu/en/bulletin/article/13905/33/commission-refers-ireland-spain-france-and-netherlands-to-cjeu-over-failure-to-transpose-cybersecurity-rules",
        "https://ansm.sante.fr/actualites/reglement-europeen-relatif-aux-dispositifs-medicaux-fin-de-la-periode-de-transition"
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

  -- 2. Pain points (ordre = frequency_count DESC : le pitch dérive des 3 premiers)
  DELETE FROM sector_pain_points WHERE sector_id = v_sector_id;
  INSERT INTO sector_pain_points
    (workspace_id, sector_id, title, description, frequency_count, source_company_ids, kredo_practice, verbatim)
  VALUES
    (v_workspace_id, v_sector_id,
     $KREDO$Des tarifs fixés par le payeur, une marge à trouver seul$KREDO$,
     $KREDO$Six comptes sur dix décrivent le même étau : le prix de vente est administré (LPPR pour SOS Oxygène, T2A pour le CHU de Nice et Lacassagne, NABM pour LBM Bioesterel, nomenclature d'anatomopathologie pour Medipath, SERAFIN-PH et ONDAM médico-social pour UNAPEI PACA), et il est orienté à la baisse. La seule variable qui reste sous leur contrôle est le coût de production interne. C'est ce qui rend un chantier d'efficience finançable ici alors qu'il ne le serait pas ailleurs.$KREDO$,
     6,
     ARRAY['b8ad688f-1597-40b5-9c1d-d7ae7fb6808e','51789a67-16d6-43e7-ade5-05b14f6b5416','50c7298b-3e1a-41d0-821e-7c2e9dfee92e','0cdcd3c8-464c-4d69-a06a-aa24bfcae1f6','083ac179-8528-49cc-8aac-efb0f38534cf','a53c8a59-89a1-4b3e-a653-87b8259d634e']::uuid[],
     'multi', NULL),

    (v_workspace_id, v_sector_id,
     $KREDO$L'IA de diagnostic bascule en dispositif à haut risque$KREDO$,
     $KREDO$Cinq comptes ont un outil d'IA en production ou en développement et identifient l'AI Act comme contrainte structurante : eyonis® chez Median Technologies, VisioCyt chez Medipath, IA diagnostique au CHU de Nice et à Lacassagne, outils recommandés par les guidelines chez l'ESC. Tous décrivent la classification haut risque comme un enjeu de documentation et de traçabilité — pas de performance du modèle.$KREDO$,
     5,
     ARRAY['51789a67-16d6-43e7-ade5-05b14f6b5416','27c97212-ecd9-4043-a403-7bc2cbce55fc','c58cdc3d-c3db-4af0-b19a-b8e448fa2c5d','0cdcd3c8-464c-4d69-a06a-aa24bfcae1f6','083ac179-8528-49cc-8aac-efb0f38534cf']::uuid[],
     'data_ai', NULL),

    (v_workspace_id, v_sector_id,
     $KREDO$L'interopérabilité devient obligatoire, pas optionnelle$KREDO$,
     $KREDO$Cinq comptes citent l'EHDS, et tous le décrivent d'abord comme une opportunité de recherche — pas comme une contrainte d'ingénierie. C'est précisément l'angle mort : le partage transfrontalier suppose un alignement FHIR et terminologique que personne ne chiffre aujourd'hui. L'European Society of Cardiology cumule le cas le plus dur, avec des registres multi-pays.$KREDO$,
     5,
     ARRAY['51789a67-16d6-43e7-ade5-05b14f6b5416','27c97212-ecd9-4043-a403-7bc2cbce55fc','c58cdc3d-c3db-4af0-b19a-b8e448fa2c5d','0cdcd3c8-464c-4d69-a06a-aa24bfcae1f6','083ac179-8528-49cc-8aac-efb0f38534cf']::uuid[],
     'data_ai', NULL),

    (v_workspace_id, v_sector_id,
     $KREDO$Recertifier tout le parc avant une échéance non reportable$KREDO$,
     $KREDO$MDR pour SOS Oxygène, Horus Pharma et Median Technologies ; IVDR pour LBM Bioesterel et Medipath, qui mentionne explicitement le risque sur ses tests développés en interne. Le point commun est un stock de dossiers techniques hérités à reprendre à date fixe, avec un goulot d'étranglement connu sur les organismes notifiés.$KREDO$,
     5,
     ARRAY['b8ad688f-1597-40b5-9c1d-d7ae7fb6808e','63395e3f-350a-424e-a7bc-d27db2a876b4','c58cdc3d-c3db-4af0-b19a-b8e448fa2c5d','50c7298b-3e1a-41d0-821e-7c2e9dfee92e','0cdcd3c8-464c-4d69-a06a-aa24bfcae1f6']::uuid[],
     'multi', NULL),

    (v_workspace_id, v_sector_id,
     $KREDO$La cyberattaque n'est plus un risque, c'est une échéance$KREDO$,
     $KREDO$Quatre comptes identifient le risque cyber comme majeur, et trois le relient explicitement à NIS2. Le CHU de Nice le formule comme un risque de santé publique — une attaque réussie redirige les urgences. Attention : la fiche FOLIO de Median Technologies affirme que NIS2 est « transposée en droit français en 2025 ». C'est faux, l'ANSSI indique que la loi n'est pas promulguée.$KREDO$,
     4,
     ARRAY['51789a67-16d6-43e7-ade5-05b14f6b5416','50c7298b-3e1a-41d0-821e-7c2e9dfee92e','c58cdc3d-c3db-4af0-b19a-b8e448fa2c5d','083ac179-8528-49cc-8aac-efb0f38534cf']::uuid[],
     'cyber', NULL),

    (v_workspace_id, v_sector_id,
     $KREDO$Héberger la donnée de santé sans bloquer le cloud$KREDO$,
     $KREDO$Quatre comptes citent la certification HDS comme contrainte directe sur leurs choix d'infrastructure. Le CHU de Nice mentionne explicitement les « difficultés de mise en conformité HDS lors des migrations vers le cloud ». La contrainte porte sur l'hébergeur, mais elle bloque en pratique la conception des flux en amont.$KREDO$,
     4,
     ARRAY['51789a67-16d6-43e7-ade5-05b14f6b5416','50c7298b-3e1a-41d0-821e-7c2e9dfee92e','0cdcd3c8-464c-4d69-a06a-aa24bfcae1f6','083ac179-8528-49cc-8aac-efb0f38534cf']::uuid[],
     'cloud_eng', NULL),

    (v_workspace_id, v_sector_id,
     $KREDO$Le SI dépend de spécialistes qu'on ne recrute plus$KREDO$,
     $KREDO$Pénurie structurelle décrite par quatre comptes : soignants au CHU de Nice, pathologistes chez Medipath, praticiens clés menacés de départ vers le privé à Lacassagne, vétérinaires chez Univet. Conséquence directe sur nos sujets : les chantiers de conformité et d'interopérabilité arrivent au moment où les équipes internes sont le moins disponibles pour les porter.$KREDO$,
     4,
     ARRAY['51789a67-16d6-43e7-ade5-05b14f6b5416','0cdcd3c8-464c-4d69-a06a-aa24bfcae1f6','083ac179-8528-49cc-8aac-efb0f38534cf','cf3daa8d-8e56-43bb-80df-5f1f35023ed1']::uuid[],
     'multi', NULL);

  -- 3. Calendrier réglementaire (l'étage 1 — chaque date vérifiée sur source officielle)
  DELETE FROM sector_regulatory_items WHERE sector_id = v_sector_id;
  INSERT INTO sector_regulatory_items
    (workspace_id, sector_id, name, authority, description, deadline_date, urgency,
     kredo_practice, commercial_angle, is_commercial_window, source_url)
  VALUES
    (v_workspace_id, v_sector_id,
     $KREDO$AI Act — application générale (Règlement UE 2024/1689)$KREDO$, 'EU',
     $KREDO$Le régime général du règlement IA devient applicable. Tout établissement ou éditeur qui déploie un système d'IA entre dans le champ, y compris quand il n'est ni concepteur ni fournisseur du modèle.$KREDO$,
     '2026-08-02', 'critical', 'data_ai',
     $KREDO$Inventaire des systèmes d'IA déjà déployés (aide au diagnostic, tri, transcription) et qualification du rôle juridique de l'établissement — fournisseur ou déployeur. Deux semaines avant l'échéance, personne n'a cet inventaire à jour.$KREDO$,
     true, 'https://artificialintelligenceact.eu/article/113/'),

    (v_workspace_id, v_sector_id,
     $KREDO$AI Act art. 6(1) — IA embarquée dans un dispositif médical$KREDO$, 'EU',
     $KREDO$Les systèmes d'IA intégrés à un produit déjà réglementé (dispositif médical, DMDIV) sont classés à haut risque et doivent porter gestion des risques, documentation technique, traçabilité des données d'entraînement et supervision humaine.$KREDO$,
     '2027-08-02', 'high', 'data_ai',
     $KREDO$Construction du dossier technique haut risque et de la chaîne de traçabilité risques-exigences-tests, en réutilisant l'existant ISO 13485 et IEC 62304 plutôt qu'en ouvrant un chantier parallèle.$KREDO$,
     true, 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A32024R1689'),

    (v_workspace_id, v_sector_id,
     $KREDO$MDR — fin de période transitoire (Règlement UE 2023/607)$KREDO$, 'EU',
     $KREDO$Fin de transition pour les dispositifs de classe III et les implantables de classe IIb sous certificat directive. Le 31/12/2028 s'applique aux autres classes IIb, aux IIa et aux classe I stériles ou avec fonction de mesurage.$KREDO$,
     '2027-12-31', 'high', 'multi',
     $KREDO$Reprise outillée des dossiers techniques hérités et industrialisation de la preuve clinique. Un dispositif dont le dossier n'est pas repris à temps sort du marché : l'échéance ne sera pas reportée une troisième fois.$KREDO$,
     true, 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A32023R0607'),

    (v_workspace_id, v_sector_id,
     $KREDO$IVDR — fin de période transitoire (Règlement UE 2024/1860)$KREDO$, 'EU',
     $KREDO$Fin de transition pour les DMDIV de classe D. Les classes C basculent au 31/12/2028, les classes B et A stériles au 31/12/2029. Concerne directement les laboratoires de biologie médicale et d'anatomopathologie, y compris leurs tests développés en interne.$KREDO$,
     '2027-12-31', 'high', 'multi',
     $KREDO$Cartographie du parc de DMDIV et des tests développés en interne, priorisation par classe de risque et par date de bascule, puis validation analytique outillée. Le sujet est un sujet de données avant d'être un sujet qualité.$KREDO$,
     true, 'https://health.ec.europa.eu/medical-devices-vitro-diagnostics/transitional-provisions_en'),

    (v_workspace_id, v_sector_id,
     $KREDO$EHDS — Espace européen des données de santé (UE 2025/327)$KREDO$, 'EU',
     $KREDO$Échéance d'adoption des actes d'exécution de la Commission. L'usage primaire (résumé patient, e-prescription) devient opérationnel dans tous les États membres au 26/03/2029, l'imagerie et les résultats de laboratoire au 26/03/2031.$KREDO$,
     '2027-03-26', 'medium', 'data_ai',
     $KREDO$Mise en interopérabilité FHIR et alignement terminologique du parcours de données, à engager pendant que le calendrier est encore lointain — c'est le seul chantier de la liste où l'anticipation coûte moins cher que le rattrapage.$KREDO$,
     true, 'https://health.ec.europa.eu/ehealth-digital-health-and-care/european-health-data-space-regulation-ehds_en'),

    (v_workspace_id, v_sector_id,
     $KREDO$NIS2 — transposition française (loi Résilience)$KREDO$, 'FR',
     $KREDO$Échéance à confirmer : l'ANSSI indique que la loi de transposition n'est pas promulguée à ce jour. Le délai européen était le 17/10/2024. La Commission a renvoyé la France devant la CJUE le 08/07/2026 en demandant somme forfaitaire et astreinte journalière. L'examen parlementaire est repoussé à septembre 2026 au plus tôt.$KREDO$,
     NULL, 'critical', 'cyber',
     $KREDO$Cartographier le SI et qualifier le périmètre d'entité essentielle ou importante AVANT la promulgation. La date est incertaine, l'obligation ne l'est pas, et le délai d'exécution sera compressé d'autant que la loi arrive tard.$KREDO$,
     true, 'https://aide.monespacenis2.cyber.gouv.fr/fr/article/avancement-de-la-transposition-de-la-directive-nis-2-1b3j1da/');

  -- 4. Trigger events (source_url UNIQUE sur toute la table)
  DELETE FROM sector_events WHERE sector_id = v_sector_id;
  INSERT INTO sector_events
    (workspace_id, sector_id, title, event_type, description, event_date,
     commercial_opportunity, status, source_url)
  VALUES
    (v_workspace_id, v_sector_id,
     $KREDO$La Commission renvoie la France devant la CJUE sur NIS2$KREDO$, 'regulatory',
     $KREDO$La Commission européenne renvoie la France, l'Irlande, l'Espagne et les Pays-Bas devant la Cour de justice pour transposition non notifiée de la directive NIS2, en demandant somme forfaitaire et astreintes journalières. Le délai de transposition était le 17/10/2024.$KREDO$,
     '2026-07-08',
     $KREDO$Motif d'appel immédiat auprès des DSI d'établissements : la loi arrive, le délai d'exécution sera court. Proposer la cartographie de périmètre avant la rentrée parlementaire de septembre.$KREDO$,
     'pending',
     'https://agenceurope.eu/en/bulletin/article/13905/33/commission-refers-ireland-spain-france-and-netherlands-to-cjeu-over-failure-to-transpose-cybersecurity-rules'),

    (v_workspace_id, v_sector_id,
     $KREDO$Application générale de l'AI Act au 2 août 2026$KREDO$, 'regulatory',
     $KREDO$Le régime général du règlement (UE) 2024/1689 devient applicable. Les sanctions de l'article 99 atteignent 35 M€ ou 7 % du CA mondial pour une pratique interdite, 15 M€ ou 3 % pour un manquement aux obligations.$KREDO$,
     '2026-08-02',
     $KREDO$Fenêtre de deux semaines : proposer l'inventaire des systèmes d'IA déployés et la qualification fournisseur ou déployeur. Aucun des cinq comptes équipés d'IA n'a publiquement cet inventaire.$KREDO$,
     'pending',
     'https://artificialintelligenceact.eu/article/99/'),

    (v_workspace_id, v_sector_id,
     $KREDO$Median Technologies expose son imagerie IA à l'ASCO 2026$KREDO$, 'competitor',
     $KREDO$Median Technologies présente ses services d'imagerie centralisée et son offre IA pour les essais cliniques en oncologie au congrès ASCO 2026, signal d'accélération commerciale sur eyonis® et l'activité iCRO.$KREDO$,
     '2026-05-26',
     $KREDO$Un compte qui pousse son IA à l'international doit tenir AI Act et FDA en parallèle. Angle de qualification sur la traçabilité du dossier technique haut risque.$KREDO$,
     'pending',
     'https://finance.yahoo.com/sectors/healthcare/articles/median-technologies-showcase-icro-central-154500342.html');

  -- 5. Détachement d'Univet (groupe vétérinaire, hors périmètre — voir en-tête)
  UPDATE companies SET sector_id = NULL
  WHERE workspace_id = v_workspace_id
    AND id = 'cf3daa8d-8e56-43bb-80df-5f1f35023ed1';

  RAISE NOTICE 'Secteur % injecté : %', 'sante-medtech-medico-social', v_sector_id;
END
$migration$;
