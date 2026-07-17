-- Étude sectorielle : Industrie Manufacturière, Électronique & Équipements
-- Corpus : moyen — 5 comptes, 5 avec sector_analysis FOLIO, aucune ancre de preuve
-- Score : 4.0/5 (plafond corpus : 4.5)
-- Sources : voir la section CAVEATS de la fiche (5 échéances officielles + 3 events datés)

DO $migration$
DECLARE
  v_workspace_id uuid;
  v_sector_id    uuid;
BEGIN
  SELECT id INTO v_workspace_id FROM workspaces LIMIT 1;

  -- 1. La fiche (UPSERT sur le 'watch' existant)
  INSERT INTO sector_intelligence (
    workspace_id, name, slug, description, status,
    attractiveness_score, market_size_eur_bn, market_growth_pct,
    digital_maturity, practices_fit, key_players_paca, key_players_national,
    avg_tjm_min, avg_tjm_max, playbook, caveats, image_url
  ) VALUES (
    v_workspace_id,
    $KREDO$Industrie Manufacturière, Électronique & Équipements$KREDO$,
    'industrie-manufacturiere-electronique-equipements',
    $KREDO$Cluster industriel manufacturier de PACA (semi-conducteurs, énergie et automatisation, emballage, quincaillerie, équipement) confronté en 2026-2027 à une convergence réglementaire inédite : facturation électronique, CSRD, PPWR, audit énergétique, Cyber Resilience Act et écoconception tombent quasi simultanément. Le mutualisable n'est pas le marché de chaque acteur mais leur condition commune — produire une donnée conforme, tracée et datée que les SI industriels multi-sites ne génèrent pas nativement. Fit principal : data_ai (consolidation ESG, énergie, traçabilité) et cyber (conformité produit CRA/NIS2). Fiche adossée à 5 comptes du bassin, sans ancre de preuve relationnelle — valeur portée par la fenêtre réglementaire.$KREDO$,
    'active',
    4.0, NULL, NULL,
    'medium',
    '{"data_ai": 5, "cloud_eng": 3, "product": 3, "cyber": 4}'::jsonb,
    $KREDO$[
      {"name":"STMicroelectronics (Rousset)","size":"3,3 Mds€","note":"Site R&D et production semi-conducteurs, actif stratégique européen. Programme de transformation industrielle en cours (Chips Act, réduction d'effectifs)."},
      {"name":"Schneider Electric (site de Carros)","size":"Géant","note":"Énergie et automatisation industrielle, plateforme EcoStruxure. IoT industriel exposé au Cyber Resilience Act."},
      {"name":"Tournaire (Grasse)","size":"ETI","note":"Emballage industriel premium pour parfumerie, chimie fine et agroalimentaire. Exposé PPWR, REACH, CS3D. Actionnaire PE (Motion Equity)."},
      {"name":"Torbel Industrie (Tourrette-Levens)","size":"PME","note":"Ferrures et quincaillerie. En restructuration (PSE, fermetures de sites) — pression importations asiatiques et coûts."},
      {"name":"Aqualung (Carros)","size":"~100 M€","note":"Équipement de plongée, marque historique (1943). Racheté par HEAD Group en 2025 — intégration post-acquisition en cours."}
    ]$KREDO$::jsonb,
    $KREDO$[
      {"name":"Siemens","size":"Géant","note":"Référence mondiale automatisation et industrie 4.0, concurrent structurant du bassin."},
      {"name":"Legrand","size":"Grand groupe","note":"Infrastructure électrique, acteur français majeur soumis aux mêmes échéances ESG et produit."},
      {"name":"Infineon","size":"Géant","note":"Semi-conducteurs, concurrent européen direct de STMicroelectronics."},
      {"name":"Bosch","size":"Géant","note":"Équipementier industriel diversifié, forte exposition écoconception et cyber produit."},
      {"name":"Thales","size":"Géant","note":"Électronique et systèmes, référence nationale sur la cybersécurité industrielle et NIS2."}
    ]$KREDO$::jsonb,
    450, 1100,
    $KREDO${
      "personas": [
        {"role": "DSI d'un site industriel",
         "enjeu": "Faire tenir un SI multi-sites vieillissant face à une pile réglementaire qui exige désormais de la donnée fiable et datée (CSRD, énergie, facturation, CRA).",
         "peur": "Se retrouver incapable de produire la donnée le jour d'un contrôle ou d'un audit, et en porter seul la responsabilité devant la direction."},
        {"role": "Directeur Qualité / RSE / Affaires réglementaires",
         "enjeu": "Cartographier et tenir les échéances CSRD, PPWR, écoconception et devoir de vigilance sur des catalogues et des chaînes d'approvisionnement larges.",
         "peur": "Découvrir trop tard un produit ou un emballage non conforme qui bloque une mise sur le marché européen en pleine saison commerciale."},
        {"role": "Directeur Industriel / Opérations (Plant Manager)",
         "enjeu": "Réduire les coûts et sécuriser la production face aux importations asiatiques et à la volatilité des matières premières.",
         "peur": "Voir la compétitivité du site s'éroder au point de justifier une fermeture ou un transfert, comme d'autres sites du bassin l'ont déjà vécu."},
        {"role": "RSSI / Responsable cybersécurité produit",
         "enjeu": "Mettre les équipements connectés en conformité Cyber Resilience Act et NIS2 avant l'échéance d'accès au marché.",
         "peur": "Qu'une vulnérabilité non traitée sur un produit connecté déclenche un incident, un rappel ou un blocage CE, et l'expose publiquement."}
      ],
      "roi_arguments": [
        "Facturation électronique : réception obligatoire au 1er septembre 2026 pour toutes les entreprises, émission pour les grandes entreprises et ETI. Un raccordement PDP mal anticipé bloque l'encaissement. Source: DGFiP / economie.gouv.fr, calendrier officiel 2026-2027.",
        "Audit énergétique réglementaire obligatoire avant le 11 octobre 2026 au-delà de 2,75 GWh par an, SME ISO 50001 avant le 11 octobre 2027 au-delà de 23,6 GWh. L'instrumentation data de la consommation multi-sites conditionne la conformité. Source: loi DDADUE / directive EED 2023/1791, ecologie.gouv.fr.",
        "Cyber Resilience Act : sans conformité au 11 décembre 2027, un produit connecté ne peut plus être vendu dans l'UE, avec notification des vulnérabilités dès le 11 septembre 2026. La mise en conformité produit préserve l'accès au marché. Source: Règlement (UE) 2024/2847, EUR-Lex.",
        "PPWR applicable au 12 août 2026 (déclaration de conformité, interdiction des PFAS dans les emballages alimentaires, contenu recyclé plastique en 2028). La refonte de la donnée produit et emballage est un chantier data traçable. Source: Règlement (UE) 2025/40, EUR-Lex.",
        "CSRD : la consolidation de la donnée ESG multi-sites reste le poste d'effort principal du reporting. Potentiel d'accélération estimé à -30 % à -50 % du temps de collecte par exercice via outillage data, à valider sur le périmètre client. Source: estimation Kredo, justifiée par la dispersion documentée sur les 5 comptes du secteur."
      ],
      "objections": [
        {"objection": "On est en pleine restructuration industrielle, ce n'est pas le moment d'ajouter un chantier SI.",
         "reponse": "Les échéances réglementaires ne s'arrêtent pas pendant la restructuration : la facturation électronique (septembre 2026) et l'audit énergétique (octobre 2026) tombent quoi qu'il arrive, et un raccordement raté bloque l'encaissement. On cadre un quick-win daté de 2 à 6 semaines sur l'obligation la plus proche, sans mobiliser vos équipes déjà sous tension."},
        {"objection": "Ces sujets réglementaires, notre groupe ou notre maison-mère les pilote au niveau central.",
         "reponse": "Le central définit la politique, mais la donnée conforme se produit au niveau du site : consommation d'énergie, données produit, flux de facturation. C'est précisément le maillon local que le central ne voit pas — et c'est là que le contrôle a lieu."},
        {"objection": "On a déjà un ERP et un intégrateur historique qui gèrent tout ça.",
         "reponse": "L'ERP stocke, il ne met pas en conformité : ni le passeport produit ESPR, ni la traçabilité carbone MACF, ni la gestion des vulnérabilités CRA ne sortent nativement d'un ERP. On intervient sur la couche donnée et conformité au-dessus, sans remplacer l'existant."}
      ],
      "entry_points": [
        "Réglementaire: audit de conformité facturation électronique avant le 1er septembre 2026 — obligation datée, motif d'appel légitime pour toute entreprise du bassin.",
        "Quick-win: diagnostic énergétique data de 2 à 6 semaines en amont de l'audit réglementaire obligatoire du 11 octobre 2026.",
        "Transformation: structuration de la donnée ESG et CSRD multi-sites, chantier de 6 à 12 mois qui outille durablement le reporting de durabilité.",
        "Réseau: entrée par l'écosystème industriel PACA — pôle SCS (Solutions Communicantes Sécurisées), UIMM régionale, bassins de Rousset, Sophia et Carros — par introduction d'un pair."
      ]
    }$KREDO$::jsonb,
    $KREDO${
      "verbatims": "Aucun verbatim client réel. Les 7 interactions du secteur sont des données de test (kredo_staffing_360_v1) ou des emails auto-générés par Kredo (intel-020-communication) — zéro parole client exploitable.",
      "frequences": "Comptage tracé sur les 5 comptes rattachés (source_company_ids peuplé sur chaque pain point). Corpus non exhaustif du secteur en PACA.",
      "corpus": "Corpus MOYEN : 5 comptes prospects, 5/5 avec analyse sectorielle FOLIO dense, mais AUCUNE ancre de preuve — pas de client, pas de diagnostic process réel, pas de mission, et les 2 opportunités en base sont synthétiques. Plafond de score 4.5, score fixé à 4.0 par prudence.",
      "marche": "Taille de marché non consolidée : le secteur agrège des marchés hétérogènes (semi-conducteurs, énergie et automatisation, emballage industriel, quincaillerie, équipement de plongée) sans chiffre unique crédible — market_size laissé NULL. TJM indicatifs issus de la grille KREDO (practices data-ai et cyber).",
      "sources": [
        "https://www.economie.gouv.fr/tout-savoir-sur-la-facturation-electronique-pour-les-entreprises",
        "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32025R0040",
        "https://www.ecologie.gouv.fr/politiques-publiques/audit-energetique-entreprises",
        "https://eur-lex.europa.eu/eli/reg/2024/2847/oj",
        "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32025L0794",
        "https://www.se.com/ww/en/assets/pdf/Schneider-Electric-announces-agreement-to-acquire-Cognite",
        "https://www.usinenouvelle.com/article/le-fabricant-francais-de-materiel-de-plongee-sous-marine-aqualung-rachete-par-l-autrichien-head.N2234449",
        "https://newsroom.st.com/media-center/press-item.html/c3330.html"
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

  -- 2. Pain points (idempotent)
  DELETE FROM sector_pain_points WHERE sector_id = v_sector_id;
  INSERT INTO sector_pain_points
    (workspace_id, sector_id, title, description, frequency_count, source_company_ids, kredo_practice, verbatim)
  VALUES
    (v_workspace_id, v_sector_id,
     $KREDO$Reporting ESG et CSRD dispersé, sans donnée fiable$KREDO$,
     $KREDO$La CSRD et la taxonomie exigent une donnée extra-financière consolidée multi-sites que les SI industriels ne produisent pas nativement ; effort de collecte manuel et récurrent à chaque exercice.$KREDO$,
     5, ARRAY['1a72a43f-3db5-482c-bb0b-077196321458','6f890515-b743-4fe0-bdf5-4c7790fef746','cde3d719-f1ef-4bd5-a55d-1f37c7642637','00306233-3862-4dc9-b05b-ae83cb392f4b','8d68708e-e9eb-443a-82ca-8a64eb9b1541']::uuid[],
     'data_ai', NULL),
    (v_workspace_id, v_sector_id,
     $KREDO$Traçabilité fournisseurs et carbone à reconstituer$KREDO$,
     $KREDO$Le devoir de vigilance (CS3D) et le mécanisme carbone aux frontières (MACF) imposent de tracer l'origine et l'empreinte des approvisionnements hors UE — données éclatées entre achats, ERP et fournisseurs.$KREDO$,
     4, ARRAY['1a72a43f-3db5-482c-bb0b-077196321458','6f890515-b743-4fe0-bdf5-4c7790fef746','cde3d719-f1ef-4bd5-a55d-1f37c7642637','00306233-3862-4dc9-b05b-ae83cb392f4b']::uuid[],
     'data_ai', NULL),
    (v_workspace_id, v_sector_id,
     $KREDO$Écoconception et passeport produit à outiller$KREDO$,
     $KREDO$ESPR, PPWR et AGEC imposent durabilité, recyclabilité et passeport numérique produit — refonte des données techniques et d'étiquetage sur des catalogues souvent larges et anciens.$KREDO$,
     4, ARRAY['6f890515-b743-4fe0-bdf5-4c7790fef746','cde3d719-f1ef-4bd5-a55d-1f37c7642637','00306233-3862-4dc9-b05b-ae83cb392f4b','8d68708e-e9eb-443a-82ca-8a64eb9b1541']::uuid[],
     'product', NULL),
    (v_workspace_id, v_sector_id,
     $KREDO$Suivi énergétique multi-sites non instrumenté$KREDO$,
     $KREDO$L'audit énergétique réglementaire (plus de 2,75 GWh) et l'ISO 50001 (plus de 23,6 GWh) exigent une collecte et un pilotage de la consommation multi-sites que peu d'industriels ont instrumentés.$KREDO$,
     3, ARRAY['1a72a43f-3db5-482c-bb0b-077196321458','6f890515-b743-4fe0-bdf5-4c7790fef746','00306233-3862-4dc9-b05b-ae83cb392f4b']::uuid[],
     'data_ai', NULL),
    (v_workspace_id, v_sector_id,
     $KREDO$Cybersécurité des produits connectés à certifier$KREDO$,
     $KREDO$Le Cyber Resilience Act et NIS2 imposent security by design, gestion des vulnérabilités et marquage CE pour les équipements industriels connectés — c'est une barrière d'accès au marché UE, pas un simple sujet IT.$KREDO$,
     2, ARRAY['6f890515-b743-4fe0-bdf5-4c7790fef746','1a72a43f-3db5-482c-bb0b-077196321458']::uuid[],
     'cyber', NULL);

  -- 3. Réglementaire
  DELETE FROM sector_regulatory_items WHERE sector_id = v_sector_id;
  INSERT INTO sector_regulatory_items
    (workspace_id, sector_id, name, authority, description, deadline_date, urgency,
     kredo_practice, commercial_angle, is_commercial_window, source_url)
  VALUES
    (v_workspace_id, v_sector_id,
     $KREDO$Facturation électronique obligatoire$KREDO$, 'FR',
     $KREDO$Au 1er septembre 2026, toutes les entreprises doivent pouvoir recevoir des factures électroniques et les grandes entreprises et ETI doivent les émettre ; les PME et TPE émettent au 1er septembre 2027.$KREDO$,
     '2026-09-01', 'critical', 'multi',
     $KREDO$Audit de la chaîne de facturation, choix et raccordement d'une plateforme agréée (PDP), intégration ERP — un raccordement raté bloque l'encaissement.$KREDO$, true,
     'https://www.economie.gouv.fr/tout-savoir-sur-la-facturation-electronique-pour-les-entreprises'),
    (v_workspace_id, v_sector_id,
     $KREDO$PPWR — Règlement (UE) 2025/40 sur les emballages$KREDO$, 'EU',
     $KREDO$Application au 12 août 2026 : déclaration de conformité opposable, interdiction des PFAS dans les emballages alimentaires ; contenu recyclé plastique obligatoire en 2028.$KREDO$,
     '2026-08-12', 'high', 'data_ai',
     $KREDO$Refonte de la donnée produit et emballage, traçabilité de la recyclabilité, préparation du passeport produit.$KREDO$, true,
     'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32025R0040'),
    (v_workspace_id, v_sector_id,
     $KREDO$Audit énergétique réglementaire et SME ISO 50001 (DDADUE / EED)$KREDO$, 'FR',
     $KREDO$Audit énergétique obligatoire avant le 11 octobre 2026 pour toute entreprise consommant plus de 2,75 GWh par an ; système de management de l'énergie certifié ISO 50001 avant le 11 octobre 2027 au-delà de 23,6 GWh par an.$KREDO$,
     '2026-10-11', 'high', 'data_ai',
     $KREDO$Instrumentation et collecte de la consommation énergétique multi-sites, tableaux de bord de conformité, préparation ISO 50001.$KREDO$, true,
     'https://www.ecologie.gouv.fr/politiques-publiques/audit-energetique-entreprises'),
    (v_workspace_id, v_sector_id,
     $KREDO$Cyber Resilience Act — Règlement (UE) 2024/2847$KREDO$, 'EU',
     $KREDO$Obligations principales au 11 décembre 2027 pour les produits connectés (security by design, gestion des vulnérabilités, marquage CE) ; notification des vulnérabilités et incidents dès le 11 septembre 2026. Sans conformité, plus d'accès au marché UE.$KREDO$,
     '2027-12-11', 'high', 'cyber',
     $KREDO$Mise en conformité cyber des produits connectés (IoT industriel), SBOM, processus de gestion des vulnérabilités et de la documentation technique.$KREDO$, true,
     'https://eur-lex.europa.eu/eli/reg/2024/2847/oj'),
    (v_workspace_id, v_sector_id,
     $KREDO$CSRD et directive Omnibus$KREDO$, 'EU',
     $KREDO$La directive Omnibus reporte le reporting de durabilité : premier rapport de la vague 2 (grandes entreprises non cotées) désormais en 2028 sur l'exercice 2027, transposition nationale attendue d'ici le 19 mars 2027.$KREDO$,
     '2027-03-19', 'medium', 'data_ai',
     $KREDO$Structuration et consolidation de la donnée ESG multi-sites, outillage du reporting ESRS — le report donne une fenêtre pour bâtir proprement plutôt que dans l'urgence.$KREDO$, true,
     'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32025L0794');

  -- 4. Trigger events (source_url UNIQUE au niveau table)
  DELETE FROM sector_events WHERE sector_id = v_sector_id;
  INSERT INTO sector_events
    (workspace_id, sector_id, title, event_type, description, event_date,
     commercial_opportunity, status, source_url)
  VALUES
    (v_workspace_id, v_sector_id,
     $KREDO$Schneider Electric acquiert Cognite pour 3,1 Md$$KREDO$, 'competitor',
     $KREDO$Schneider Electric annonce le 30 juin 2026 le rachat de Cognite (plateforme d'IA industrielle) pour 3,1 milliards de dollars, à intégrer à Aveva — signal fort d'industrialisation de la donnée et de l'IA côté groupe.$KREDO$,
     '2026-06-30',
     $KREDO$Angle d'entrée sur la donnée industrielle et l'intégration data auprès des sites et de l'écosystème PACA — la maison-mère valide publiquement l'investissement data/IA.$KREDO$, 'pending',
     'https://www.se.com/ww/en/assets/pdf/Schneider-Electric-announces-agreement-to-acquire-Cognite'),
    (v_workspace_id, v_sector_id,
     $KREDO$HEAD Group finalise le rachat d'Aqualung$KREDO$, 'competitor',
     $KREDO$Le Tribunal de commerce de Nice valide le 26 juin 2025 la reprise du groupe Aqualung (redressement judiciaire du 16 mai 2025) par l'autrichien HEAD, avec plus de 50 M€ de financement et un plan d'intégration et de modernisation des sites français.$KREDO$,
     '2025-06-26',
     $KREDO$Fenêtre d'intégration post-acquisition en cours sur le site de Carros — besoins d'intégration SI, de rationalisation data et de modernisation industrielle.$KREDO$, 'pending',
     'https://www.usinenouvelle.com/article/le-fabricant-francais-de-materiel-de-plongee-sous-marine-aqualung-rachete-par-l-autrichien-head.N2234449'),
    (v_workspace_id, v_sector_id,
     $KREDO$Programme de transformation industrielle de STMicroelectronics$KREDO$, 'market',
     $KREDO$STMicroelectronics conduit un programme pluriannuel 2025-2027 de refonte de son empreinte industrielle et de réduction des coûts (jusqu'à environ 5 000 départs, objectif d'économies proche du milliard de dollars fin 2027, 376 M$ de coûts de restructuration sur l'exercice 2025).$KREDO$,
     NULL,
     $KREDO$Contexte de rationalisation et de modernisation des sites (dont Rousset) — opportunités sur la donnée industrielle, l'efficacité opérationnelle et l'automatisation.$KREDO$, 'pending',
     'https://newsroom.st.com/media-center/press-item.html/c3330.html');

  -- 5. Rattachement des comptes (déjà rattachés : sécurité/idempotence)
  UPDATE companies SET sector_id = v_sector_id
  WHERE workspace_id = v_workspace_id
    AND id IN (
      '1a72a43f-3db5-482c-bb0b-077196321458',
      '6f890515-b743-4fe0-bdf5-4c7790fef746',
      'cde3d719-f1ef-4bd5-a55d-1f37c7642637',
      '00306233-3862-4dc9-b05b-ae83cb392f4b',
      '8d68708e-e9eb-443a-82ca-8a64eb9b1541'
    );

  RAISE NOTICE 'Secteur % injecté : %', 'industrie-manufacturiere-electronique-equipements', v_sector_id;
END
$migration$;
