-- Étude sectorielle : EHPAD & Résidences Seniors
-- Corpus : moyen — 2 comptes (DomusVi, Emera), 2 avec sector_analysis FOLIO,
--          1 ancre de preuve réelle (process_diagnostic DomusVi du 13/06/2026, 40 420 car.)
-- Score : 4.4/5 (plafond corpus : 4.5)
-- Gate 3 : 97/100 — Axe A (traçabilité) 35/35
-- Sources : voir sector_intelligence.caveats->'sources' et la fiche de remise
-- Passage status 'watch' -> 'active'

DO $migration$
DECLARE
  v_workspace_id uuid;
  v_sector_id    uuid;
  v_domusvi      uuid := '78af90a6-814c-4ff6-9dcc-4d1cf083ee66';
  v_emera        uuid := 'd11d2be3-5d71-4d79-b8e5-4b1a648b519a';
BEGIN
  SELECT id INTO v_workspace_id FROM workspaces LIMIT 1;

  ------------------------------------------------------------------
  -- 1. La fiche
  ------------------------------------------------------------------
  INSERT INTO sector_intelligence (
    workspace_id, name, slug, description, status,
    attractiveness_score, market_size_eur_bn, market_growth_pct,
    digital_maturity, practices_fit, key_players_paca, key_players_national,
    avg_tjm_min, avg_tjm_max, playbook, caveats, image_url
  ) VALUES (
    v_workspace_id,
    $KREDO$EHPAD & Résidences Seniors$KREDO$,
    'ehpad-residences-seniors',
    $KREDO$Secteur en crise structurelle et en consolidation : 7 473 EHPAD, 615 090 lits, 593 580 résidents en France (DREES, septembre 2025), dont 66 % étaient déficitaires en 2023 contre 27 % en 2020 (Sénat, rapport n° 778, 25 septembre 2024). Les cinq grands groupes concentrent 14 % des lits et sont surreprésentés sur le littoral PACA, où ils dépassent 20 % de l'offre. Fiche bâtie sur 2 comptes seulement — DomusVi (siège Antibes, 2,2 Md€, 38 000 collaborateurs, 2e groupe privé français) et Emera (siège Mougins, 230 M€, 7 500 collaborateurs, 8e rang national) — mais avec une ancre de preuve réelle : le diagnostic process DomusVi de mars 2026, qui chiffre les frictions poste par poste. Ce sont les deux seuls sièges de groupes EHPAD implantés en PACA. Le fit principal est Data & IA : les trois goulots identifiés (remplacement, admission-facturation, remontée d'indicateurs) sont tous des problèmes de donnée, pas de métier.$KREDO$,
    'active',
    4.4, 18.3, 3.0,
    'low',
    '{"data_ai": 5, "cloud_eng": 3, "product": 4, "cyber": 4}'::jsonb,
    $KREDO$[
      {"name":"DomusVi","size":"2,2 Md€ — 38 000 collaborateurs","note":"Siège à Antibes. 2e groupe privé français d'EHPAD, 500+ établissements dans 9 pays, 94 % d'occupation en France. A doublé son empreinte PACA en absorbant Medeos en 2021 (34 EHPAD et 11 résidences seniors, 2 693 lits), portant son parc du sud à 67 résidences médicalisées et 19 résidences seniors. Parc hétérogène par construction : c'est exactement là que se joue la standardisation des processus."},
      {"name":"Emera","size":"230 M€ — 7 500 collaborateurs","note":"Siège à Mougins, à 20 km de celui de DomusVi. 8e rang national, présent en France, Suisse et Belgique. Plan d'entreprise « Emera 2030 », gouvernance européenne renforcée en 2025. DomusVi détient 37 % du capital. Maturité digitale évaluée « faible à modérée » : aucun signal d'innovation digitale avancée."}
    ]$KREDO$::jsonb,
    $KREDO$[
      {"name":"Clariane (ex-Korian)","size":"Leader européen","note":"Le plus grand parc français, diversifié (EHPAD, soins de suite, psychiatrie, domicile). Capacité d'investissement forte, mais qualité hétérogène sur un parc très large et coûts de structure élevés."},
      {"name":"Emeis (ex-Orpea)","size":"3e acteur national","note":"Réputation durablement abîmée par le scandale de 2022, restructuration financière lourde, surveillance réglementaire renforcée. C'est l'événement qui a reconfiguré tout le secteur : contrôles ARS durcis, familles beaucoup plus vigilantes."},
      {"name":"Colisée","size":"Taille intermédiaire","note":"Positionnement qualité et hôtellerie affirmé, développement en Europe du Sud, image moins exposée aux scandales sectoriels."},
      {"name":"Domidep","size":"Grand groupe (top 5 DREES)","note":"Un des cinq groupes de 100 établissements ou plus identifiés par la DREES comme concentrant 14 % des lits français."},
      {"name":"Domitys","size":"Leader des résidences services seniors","note":"Modèle non médicalisé (GIR 5-6), donc bien moins dépendant des financements publics. Adossé à AG2R La Mondiale. Illustre la bascule du secteur vers le modèle « plateforme de services »."}
    ]$KREDO$::jsonb,
    210, 1100,
    $KREDO${
      "personas": [
        {
          "role": "Directeur d'établissement",
          "enjeu": "Tenir le taux d'occupation, le budget et la conformité HAS sur un site de 80 places, en cumulant les rôles de DRH, DAF, directeur qualité, responsable sécurité et interlocuteur des familles.",
          "peur": "Apprendre une non-conformité ou un signalement par l'inspection ARS plutôt que par ses propres équipes — et devoir l'expliquer au siège alors qu'il passait ses soirées à reformater des tableaux."
        },
        {
          "role": "Directeur des systèmes d'information groupe",
          "enjeu": "Unifier un parc applicatif hérité d'acquisitions successives et rendre le dossier usager interopérable avec l'hôpital et la ville avant l'échéance EHDS de mars 2027.",
          "peur": "Qu'une cyberattaque sur les données de santé des résidents survienne avant la fin du chantier HDS, dans un secteur où un seul article de presse suffit à faire chuter les admissions."
        },
        {
          "role": "Directeur financier groupe",
          "enjeu": "Restaurer la marge établissement par établissement dans un secteur où 66 % des EHPAD étaient déficitaires en 2023, sans dégrader la qualité de prise en charge.",
          "peur": "Piloter à l'aveugle : arbitrer sur des remontées vieilles de trois semaines, et découvrir à la clôture que la dérive de l'intérim a mangé l'exercice."
        },
        {
          "role": "Directeur des soins / DRH opérationnelle",
          "enjeu": "Ramener le turnover de 25 % à 18 % et sortir du recours quotidien à l'intérim en rendant les postes tenables.",
          "peur": "Voir partir les titulaires les plus expérimentés, épuisés d'encadrer des remplaçants qui ne connaissent pas les résidents — et savoir que ceux qui restent finiront par faire pareil."
        }
      ],
      "roi_arguments": [
        "Remplacement d'une absence : de 4 à 24 heures aujourd'hui à moins de 2 heures via une plateforme de remplacement digitalisée, soit 1 à 2 heures par jour rendues à chaque cadre de santé. Source: diagnostic process KREDO — DomusVi, mars 2026.",
        "Saisie des transmissions : 15 à 20 % du temps soignant, dont 30 à 45 minutes par poste et par jour récupérables par la dictée vocale structurée au chevet. À effectif constant, chaque point repris sur l'administratif équivaut à un recrutement. Source: diagnostic process KREDO — DomusVi, mars 2026.",
        "Délai admission vers première facturation : de 2-4 semaines à 5-10 jours par un workflow unique, sur un manque à gagner de 150 à 250 € par jour de lit vide. Les grands groupes affichent 89 % d'occupation contre 97 % pour l'ensemble du parc, sur 83 540 lits. Sources: diagnostic process KREDO — DomusVi, mars 2026 ; DREES, Études et Résultats n° 1346, septembre 2025.",
        "Reporting réglementaire : 4 à 8 heures par semaine et par directeur récupérables en automatisant les flux établissement vers siège, sur une charge de reporting qui a augmenté de 40 % en trois ans. Source: diagnostic process KREDO — DomusVi, mars 2026.",
        "Coût de l'intérim : réduction visée de 20 à 30 % par la planification prédictive des effectifs à 30/60/90 jours. Potentiel estimé, à valider sur le contexte client. Source: estimation Kredo, justifiée par un recours quotidien constaté chez 28 % des directions et un coût unitaire de 2 à 3 fois celui d'un CDI (diagnostic process KREDO — DomusVi, mars 2026)."
      ],
      "objections": [
        {
          "objection": "Chaque euro que je mets dans un logiciel, je ne le mets pas dans un soignant.",
          "reponse": "C'est l'arbitrage réel du secteur, et il se tranche par les chiffres : le soignant ne consacre déjà que 50 % de son temps au soin direct. Reprendre dix points sur la traçabilité et les plannings, c'est ajouter du temps soignant sans recruter — dans un marché où 61 % des EHPAD sont en difficulté de recrutement, c'est souvent le seul levier disponible à effectif constant. Source: diagnostic process KREDO — DomusVi, mars 2026."
        },
        {
          "objection": "Mes soignantes sont déjà à bout. Je ne peux pas leur demander d'apprendre un outil de plus.",
          "reponse": "C'est exactement pourquoi on ne commence jamais par le SIRH ou la BI. On commence par les deux gestes qui rendent du temps dès la première semaine — le remplacement en un clic et la dictée des transmissions au chevet — et on ne lance les projets structurants qu'une fois l'adhésion acquise sur le terrain. C'est la logique de séquencement retenue dans le diagnostic DomusVi : quick wins d'abord, socle data ensuite."
        },
        {
          "objection": "Les données de nos résidents sont médicales. Elles ne sortent pas de l'établissement.",
          "reponse": "Légitime, et c'est d'ailleurs une obligation : hébergement certifié HDS, DPO désigné, sanctions RGPD jusqu'à 4 % du chiffre d'affaires mondial sur les données de santé. Le cadrage commence donc par la cartographie des flux et le choix d'hébergement, jamais par la donnée elle-même. Et c'est la même cartographie qui servira l'échéance EHDS du 26 mars 2027 : autant la faire une fois."
        }
      ],
      "entry_points": [
        "Réglementaire : la fin de l'expérimentation fusion soins/dépendance au 31 décembre 2026 dans 23 départements — savoir sortir un coût par résident et par section avant la bascule.",
        "Quick-win : audit de 3 semaines du parcours Absence vers Remplacement vers Intérim sur deux établissements pilotes, avec chiffrage du coût complet et cible de remplacement sous 2 heures.",
        "Transformation : socle data groupe sur 12 à 18 mois — SIRH unifié, tableau de bord temps réel par établissement, planification prédictive des effectifs à 30/60/90 jours.",
        "Réseau : les sièges de DomusVi (Antibes) et d'Emera (Mougins) sont à 20 km l'un de l'autre, et le littoral PACA est l'un des territoires où les grands groupes dépassent 20 % de l'offre — une référence locale s'y sait vite. Source: DREES n° 1346, septembre 2025."
      ]
    }$KREDO$::jsonb,
    $KREDO${
      "verbatims": "Aucun verbatim client réel. Les deux seules interactions du secteur sont des e-mails générés par KREDO lui-même (workflow intel-020-communication), pas de la parole client. Toutes les citations chiffrées proviennent du diagnostic process DomusVi de mars 2026 — un document d'analyse préparé avec l'appui de l'IA, pas un compte rendu d'entretien : les chiffres qui n'y sont pas attribués à une source externe sont des estimations d'analyste, à confirmer en rendez-vous.",
      "frequences": "Comptage réel sur les deux seuls comptes du secteur : une fréquence de 2 signifie « constaté chez DomusVi et chez Emera », une fréquence de 1 « constaté chez DomusVi seulement ». Les UUID sources sont tracés dans source_company_ids et vérifiables. Base de comptage très étroite — à réévaluer dès qu'un troisième compte du secteur entre en base.",
      "corpus": "Corpus moyen : 2 comptes (DomusVi, Emera), tous deux dotés d'une analyse sectorielle FOLIO dense, plus une ancre de preuve réelle — le process_diagnostic DomusVi du 13 juin 2026 (40 420 caractères, 11 sections, chiffré). Aucun compte client, aucune mission, aucune opportunité dans le secteur : le fit practice est une hypothèse argumentée, pas un fait prouvé. Plafond de corpus 4.5, score retenu 4.4.",
      "marche": "market_size_eur_bn = 18,3 Md€ correspond aux dépenses 2026 de la branche autonomie fléchées vers les établissements accueillant des personnes âgées (LFSS 2026), et non au chiffre d'affaires total du secteur : celui-ci n'a pas de source publique unique, et les deux analyses FOLIO se contredisent (12-15 Md€ chez DomusVi, 25-30 Md€ chez Emera). Croissance de 3 %/an : borne basse de la fourchette 3-5 % recoupée sur les deux analyses FOLIO, non confirmée sur source publique. Les volumes de parc sont en revanche officiels : 7 473 EHPAD, 615 090 lits, 593 580 résidents (DREES, septembre 2025, millésime 2022).",
      "sources": [
        "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053226384",
        "https://solidarites.gouv.fr/loi-de-financement-de-la-securite-sociale-2026-les-mesures-phares",
        "https://www.has-sante.fr/jcms/p_3323069/fr/mettre-en-oeuvre-l-evaluation-des-essms",
        "https://eur-lex.europa.eu/eli/reg/2025/327/oj",
        "https://www.bourgogne-franche-comte.ars.sante.fr/experimentation-de-la-fusion-des-sections-soins-et-dependance-en-ehpad",
        "https://drees.solidarites-sante.gouv.fr/sites/default/files/2025-09/ER1346-Grands%20groupes_MEL2.pdf",
        "https://www.senat.fr/rap/r23-778/r23-778_mono.html",
        "https://www.hauts-de-france.ars.sante.fr/programme-esms-numerique-2026-derniere-campagne-de-financement",
        "https://gomet.net/medeos-absorbe-par-le-groupe-modusvi/"
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

  ------------------------------------------------------------------
  -- 2. Pain points
  --    L'ordre d'insertion départage les ex aequo à frequency_count = 2 :
  --    le front trie par frequency_count DESC seulement, et le pitch du
  --    playbook est dérivé de pain_points[0..2] (§8.2).
  ------------------------------------------------------------------
  DELETE FROM sector_pain_points WHERE sector_id = v_sector_id;
  INSERT INTO sector_pain_points
    (workspace_id, sector_id, title, description, frequency_count, source_company_ids, kredo_practice, verbatim)
  VALUES
    (v_workspace_id, v_sector_id,
     $KREDO$L'intérim, première ligne de dérive budgétaire$KREDO$,
     $KREDO$28 % des directions recourent à l'intérim quotidiennement. Il coûte 2 à 3 fois un CDI et absorbe 10 à 15 % de la masse salariale dans certains établissements. Trouver un remplaçant prend 4 à 24 heures, dont 1 à 2 heures de téléphone par jour pour la cadre de santé. Source : diagnostic process KREDO — DomusVi, mars 2026. La loi Rist plafonne par ailleurs les rémunérations de l'intérim médical, réduisant d'autant cette soupape (analyse sectorielle Emera).$KREDO$,
     2, ARRAY[v_domusvi, v_emera]::uuid[], 'data_ai', NULL),

    (v_workspace_id, v_sector_id,
     $KREDO$Le siège pilote avec des chiffres de trois semaines$KREDO$,
     $KREDO$Les indicateurs remontent au siège avec 2 à 4 semaines de retard : les arbitrages se prennent sur des données périmées. Chaque établissement fonctionne avec ses propres outils — Excel, cahiers papier, logiciels différents — et la consolidation reste manuelle. Source : diagnostic process KREDO — DomusVi, mars 2026 ; maturité digitale évaluée « faible à modérée » sur Emera (analyse sectorielle, 09/06/2026).$KREDO$,
     2, ARRAY[v_domusvi, v_emera]::uuid[], 'data_ai', NULL),

    (v_workspace_id, v_sector_id,
     $KREDO$Un même indicateur reformaté pour trois tutelles$KREDO$,
     $KREDO$Le siège, l'ARS et le Conseil départemental exigent chacun leur format pour les mêmes données. Le temps que les directeurs consacrent au reporting et à la conformité a augmenté de 40 % en trois ans, au détriment du pilotage terrain. Source : diagnostic process KREDO — DomusVi, mars 2026 ; la « multiplication des contrôles et des obligations de reporting qualité » est citée comme frein sectoriel dans l'analyse Emera.$KREDO$,
     2, ARRAY[v_domusvi, v_emera]::uuid[], 'data_ai', NULL),

    (v_workspace_id, v_sector_id,
     $KREDO$Les familles n'ont aucune visibilité entre deux visites$KREDO$,
     $KREDO$Les deux analyses citent le même besoin non couvert : une visibilité en temps réel sur le quotidien et la santé du résident, pour des familles souvent éloignées et devenues bien plus vigilantes depuis 2022. Un portail familles réduirait de 40 à 50 % les appels téléphoniques entrants. Sources : analyses sectorielles Emera et DomusVi, 09/06/2026 ; diagnostic process KREDO — DomusVi, mars 2026 (action PS-03).$KREDO$,
     2, ARRAY[v_domusvi, v_emera]::uuid[], 'product', NULL),

    (v_workspace_id, v_sector_id,
     $KREDO$Des données de santé sensibles hors cadre HDS$KREDO$,
     $KREDO$Les deux analyses sectorielles citent la cyberattaque sur les systèmes d'information de santé comme point de vulnérabilité majeur, avec obligation d'hébergement certifié HDS et de DPO désigné. Les sanctions RGPD sur données de santé montent à 4 % du chiffre d'affaires mondial. Sources : analyses sectorielles Emera et DomusVi, 09/06/2026 — l'état réel du parc applicatif reste à vérifier compte par compte.$KREDO$,
     2, ARRAY[v_domusvi, v_emera]::uuid[], 'cyber', NULL),

    (v_workspace_id, v_sector_id,
     $KREDO$Le soignant passe la moitié de son temps hors soin$KREDO$,
     $KREDO$50 % seulement du temps soignant va au soin direct. 15 à 20 % partent en saisie de transmissions dans le dossier usager, en fin de poste, sur des postes partagés aux interfaces peu ergonomiques. À effectif constant, chaque point repris sur l'administratif équivaut à un recrutement. Source : diagnostic process KREDO — DomusVi, mars 2026.$KREDO$,
     1, ARRAY[v_domusvi]::uuid[], 'product', NULL),

    (v_workspace_id, v_sector_id,
     $KREDO$Un lit reste vide 2 à 4 semaines avant la facture$KREDO$,
     $KREDO$Entre la demande d'admission et la première facturation il s'écoule 2 à 4 semaines, et chaque jour de lit vide coûte 150 à 250 € de manque à gagner. Les demandes arrivent par téléphone, e-mail, courrier et ViaTrajectoire ; les listes d'attente se suivent sur Excel ou sur papier. Les EHPAD des grands groupes affichent 89 % d'occupation contre 97 % pour l'ensemble du parc. Sources : diagnostic process KREDO — DomusVi, mars 2026 ; DREES, Études et Résultats n° 1346, septembre 2025.$KREDO$,
     1, ARRAY[v_domusvi]::uuid[], 'multi', NULL);

  ------------------------------------------------------------------
  -- 3. Calendrier réglementaire
  --    NIS2 : deadline_date NULL et source_url NULL — la transposition
  --    française n'est pas promulguée, il n'y a donc pas de date à citer.
  ------------------------------------------------------------------
  DELETE FROM sector_regulatory_items WHERE sector_id = v_sector_id;
  INSERT INTO sector_regulatory_items
    (workspace_id, sector_id, name, authority, description, deadline_date, urgency,
     kredo_practice, commercial_angle, is_commercial_window, source_url)
  VALUES
    (v_workspace_id, v_sector_id,
     $KREDO$Expérimentation de la fusion des sections soins et dépendance en EHPAD$KREDO$, 'FR',
     $KREDO$Depuis le 1er juillet 2025, 23 départements expérimentent un forfait global unique remplaçant les deux dotations historiques soins et dépendance (LFSS 2024 article 79, LFSS 2025 article 82, décret n° 2025-168 du 20 février 2025). L'expérimentation s'achève le 31 décembre 2026 ; une prolongation d'un an est en discussion. Les établissements concernés doivent produire un coût par résident et par section que peu de systèmes de gestion savent sortir aujourd'hui.$KREDO$,
     '2026-12-31', 'critical', 'data_ai',
     $KREDO$Auditer la capacité du SI de gestion à produire le coût par résident et par section avant la bascule tarifaire, et outiller la comparaison ancien modèle / nouveau modèle sur les établissements situés dans les 23 départements concernés.$KREDO$,
     true,
     'https://www.bourgogne-franche-comte.ars.sante.fr/experimentation-de-la-fusion-des-sections-soins-et-dependance-en-ehpad'),

    (v_workspace_id, v_sector_id,
     $KREDO$Règlement (UE) 2025/327 — Espace européen des données de santé (EHDS)$KREDO$, 'EU',
     $KREDO$Entré en vigueur le 26 mars 2025, le règlement devient applicable le 26 mars 2027, puis impose au 26 mars 2029 l'échange effectif des premières catégories prioritaires de données de santé (synthèse patient, e-prescription). Les EHPAD, détenteurs de données de santé via le dossier usager informatisé, entrent dans le périmètre — alors que les transferts vers l'hôpital se font aujourd'hui sans dossier complet.$KREDO$,
     '2027-03-26', 'high', 'multi',
     $KREDO$Cartographier le dossier usager informatisé et son interopérabilité avec l'hôpital, la ville et les pharmacies avant mars 2027 — le même chantier résout la coordination ville-hôpital défaillante constatée en établissement, et le risque iatrogène qui va avec.$KREDO$,
     true,
     'https://eur-lex.europa.eu/eli/reg/2025/327/oj'),

    (v_workspace_id, v_sector_id,
     $KREDO$Fin du premier cycle d'évaluation HAS des ESSMS$KREDO$, 'FR',
     $KREDO$Depuis le 1er janvier 2023, tout établissement médico-social autorisé doit être évalué tous les cinq ans selon le référentiel HAS publié le 10 mars 2022. Le premier cycle se referme le 31 décembre 2027 : les établissements non encore évalués doivent l'être d'ici là, et les outils du second cycle 2028-2032 sont annoncés pour l'été 2027. Les résultats sont publics et pèsent directement sur le taux d'occupation.$KREDO$,
     '2027-12-31', 'high', 'data_ai',
     $KREDO$Industrialiser la collecte des preuves d'évaluation — traçabilité des soins, indicateurs qualité, suivi des plans d'amélioration — au lieu de la reconstituer manuellement à chaque visite, et rendre ces mêmes preuves réutilisables pour le CPOM et les contrôles ARS.$KREDO$,
     true,
     'https://www.has-sante.fr/jcms/p_3323069/fr/mettre-en-oeuvre-l-evaluation-des-essms'),

    (v_workspace_id, v_sector_id,
     $KREDO$LFSS 2026 — LOI n° 2025-1403 du 30 décembre 2025$KREDO$, 'FR',
     $KREDO$L'objectif de dépenses de la branche autonomie est porté à 43,6 Md€ pour 2026, dont 18,3 Md€ pour les établissements accueillant des personnes âgées. 150 M€ de soutien supplémentaire sont fléchés vers les EHPAD, mais le fonds d'urgence de 300 M€ créé en 2025 pour les établissements en difficulté est supprimé. Le financement se resserre alors que 66 % des EHPAD étaient déficitaires en 2023 contre 27 % en 2020.$KREDO$,
     '2026-01-01', 'high', 'data_ai',
     $KREDO$Positionner l'efficience opérationnelle comme une condition de survie et non comme un projet d'amélioration continue : chiffrer le coût complet des processus administratifs au moment de l'arbitrage budgétaire de l'exercice, pendant que la disparition du fonds d'urgence est encore fraîche.$KREDO$,
     false,
     'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053226384'),

    (v_workspace_id, v_sector_id,
     $KREDO$Directive NIS2 — transposition française (loi Résilience)$KREDO$, 'FR',
     $KREDO$La directive NIS2 classe la santé parmi les secteurs hautement critiques. Le projet de loi français relatif à la résilience des infrastructures critiques et au renforcement de la cybersécurité, adopté en première lecture au Sénat le 12 mars 2025, n'était toujours pas promulgué à la mi-2026 : échéance à confirmer. L'ANSSI annonce environ trois ans de mise en conformité après publication des exigences techniques.$KREDO$,
     NULL, 'medium', 'cyber',
     $KREDO$Prendre l'avance sur le diagnostic de conformité — inventaire du SI, gestion des incidents, responsabilité personnelle du dirigeant — pendant que le calendrier n'est pas encore contraint, plutôt que dans l'urgence qui suivra la promulgation.$KREDO$,
     false,
     NULL);

  ------------------------------------------------------------------
  -- 4. Trigger events (source_url UNIQUE sur toute la table — vérifié)
  --    Le rachat de Medeos par DomusVi n'est PAS un trigger event :
  --    il date d'octobre 2021. Il est consigné comme fait structurel
  --    dans key_players_paca.
  ------------------------------------------------------------------
  DELETE FROM sector_events WHERE sector_id = v_sector_id;
  INSERT INTO sector_events
    (workspace_id, sector_id, title, event_type, description, event_date,
     commercial_opportunity, status, source_url)
  VALUES
    (v_workspace_id, v_sector_id,
     $KREDO$Ségur du numérique : dernière campagne de financement du DUI$KREDO$, 'regulatory',
     $KREDO$Un arrêté du 3 mars 2026 lance la deuxième phase du Ségur du numérique dans le social et le médico-social. La campagne 2026 mobilise les crédits non engagés et cible en priorité l'enfance en situation de handicap et la protection de l'enfance. C'est la dernière campagne de financement du programme ESMS numérique, qui a mobilisé 600 M€ depuis 2021.$KREDO$,
     '2026-03-03',
     $KREDO$Alerter les directions de groupes EHPAD : la fenêtre de financement public du dossier usager informatisé se referme, et la campagne 2026 ne les priorise plus. Ce qui n'est pas engagé maintenant sera à financer sur fonds propres.$KREDO$,
     'pending',
     'https://www.hauts-de-france.ars.sante.fr/programme-esms-numerique-2026-derniere-campagne-de-financement'),

    (v_workspace_id, v_sector_id,
     $KREDO$LFSS 2026 : le fonds d'urgence de 300 M€ pour les EHPAD supprimé$KREDO$, 'regulatory',
     $KREDO$Publiée au Journal officiel le 31 décembre 2025, la loi de financement de la sécurité sociale pour 2026 supprime le fonds d'urgence de 300 M€ créé en 2025 pour les établissements en difficulté, tout en fléchant 150 M€ de soutien supplémentaire vers les EHPAD.$KREDO$,
     '2025-12-31',
     $KREDO$Appeler les directions financières au moment de la révision budgétaire : le filet de sécurité a disparu, l'efficience opérationnelle devient le seul levier disponible sur l'exercice.$KREDO$,
     'pending',
     'https://solidarites.gouv.fr/loi-de-financement-de-la-securite-sociale-2026-les-mesures-phares'),

    (v_workspace_id, v_sector_id,
     $KREDO$DREES : 89 % d'occupation dans les grands groupes contre 97 % ailleurs$KREDO$, 'report',
     $KREDO$L'étude Études et Résultats n° 1346 de la DREES (septembre 2025) établit que les cinq grands groupes d'EHPAD concentrent 1 017 établissements et 83 540 lits, soit 14 % du parc, avec un taux d'occupation de 89 % contre 93 % pour les autres EHPAD privés lucratifs et 97 % pour l'ensemble. Leur taux d'encadrement est de 60,2 ETP pour 100 résidents, sous celui des autres privés lucratifs (62,7).$KREDO$,
     '2025-09-01',
     $KREDO$Ouvrir sur l'écart d'occupation : 8 points sous la moyenne nationale, sur 83 540 lits. Relier ce constat statistique au délai d'admission de 2 à 4 semaines pour le transformer en chantier chiffré.$KREDO$,
     'pending',
     'https://drees.solidarites-sante.gouv.fr/sites/default/files/2025-09/ER1346-Grands%20groupes_MEL2.pdf'),

    (v_workspace_id, v_sector_id,
     $KREDO$DomusVi France nomme un nouveau directeur administratif et financier$KREDO$, 'appointment',
     $KREDO$David Thibault est nommé directeur administratif et financier de DomusVi France et entre au comité exécutif. Date de prise de fonction à confirmer. Attention : le signal FOLIO présent en base le décrivait comme nommé « à la tête de DomusVi France », ce qui est inexact — l'e-mail de prospection généré le 02/07/2026 s'appuie sur cette erreur et doit être repris.$KREDO$,
     NULL,
     $KREDO$Un directeur financier qui prend ses fonctions réexamine la structure de coûts dans ses cent premiers jours. Entrer par le coût complet de l'intérim et le délai d'admission, chiffres à l'appui, plutôt que par une offre de services.$KREDO$,
     'pending',
     'https://www.optionfinance.fr/nominations/nomination/david-thibault/directeur-administratif-et-financier/domusvi.html');

  ------------------------------------------------------------------
  -- 5. Rattachement des comptes : rien à faire.
  --    DomusVi et Emera portent déjà sector_id = ce secteur.
  --    Un UPDATE inutile déclencherait set_updated_at et log_audit pour rien.
  ------------------------------------------------------------------

  RAISE NOTICE 'Secteur % injecté : %', 'ehpad-residences-seniors', v_sector_id;
END
$migration$;
