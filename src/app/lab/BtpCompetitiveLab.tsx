"use client";

import { useMemo, useState } from "react";

type CategoryId = "leader" | "challenger" | "mid" | "emerging" | "niche";
type ViewId = "market" | "it" | "commercial" | "valueChain";

type ScorePoint = {
  x: number;
  y: number;
};

type Objection = {
  text: string;
  response: string;
};

type CompetitiveAccount = {
  id: string;
  name: string;
  category: CategoryId;
  segmentLabel: string;
  revenue: string;
  employees: string;
  scope: string;
  revenueWeight: number;
  collectiveAgreement: string;
  regulationClass: string;
  mainJob: string;
  otherJobs: string;
  valueChain: {
    suppliers: string;
    value: string;
    clients: string;
  };
  contracts: string[];
  reputation: string;
  innovationPosture: string;
  trajectory: string;
  salesAngles: string[];
  objections: Objection[];
  itOffers: string[];
  fragilities: string[];
  scores: Record<ViewId, ScorePoint>;
};

type MatrixView = {
  id: ViewId;
  title: string;
  subtitle: string;
  xLabel: string;
  yLabel: string;
  xLow: string;
  xHigh: string;
  yLow: string;
  yHigh: string;
};

const CATEGORY_LABELS: Record<CategoryId, string> = {
  leader: "Leaders",
  challenger: "Challengers",
  mid: "Mid-markets",
  emerging: "Outsiders émergents",
  niche: "Outsiders niche",
};

const CATEGORY_ORDER: CategoryId[] = ["leader", "challenger", "mid", "emerging", "niche"];

const CATEGORY_COLOR: Record<CategoryId, string> = {
  leader: "var(--color-brand-primary)",
  challenger: "var(--color-info)",
  mid: "var(--color-brand-brass)",
  emerging: "var(--color-domain-ai)",
  niche: "var(--color-domain-account)",
};

const CATEGORY_BADGE_CLASS: Record<CategoryId, string> = {
  leader: "border-primary/20 bg-primary/10 text-primary",
  challenger: "border-info/20 bg-info/10 text-info",
  mid: "border-brand-brass/25 bg-brand-brass/10 text-status-warning-ink",
  emerging: "border-domain-ai/20 bg-domain-ai/10 text-domain-ai",
  niche: "border-domain-account/20 bg-domain-account/10 text-domain-account",
};

const MATRIX_VIEWS: MatrixView[] = [
  {
    id: "market",
    title: "Positionnement marché",
    subtitle: "Qui capte les grands projets et qui pousse l'innovation métier.",
    xLabel: "Innovation / maturité digitale",
    yLabel: "Capacité grands projets",
    xLow: "Core métier",
    xHigh: "Innovation visible",
    yLow: "Niche / régional",
    yHigh: "Mégaprojets",
  },
  {
    id: "it",
    title: "Maturité IT & IA",
    subtitle: "Priorise les comptes où le discours data, BIM, IA et cybersécurité est crédible.",
    xLabel: "Maturité numérique",
    yLabel: "Ouverture IA / data",
    xLow: "Outillage chantier",
    xHigh: "Plateformes intégrées",
    yLow: "IA peu visible",
    yHigh: "IA assumée",
  },
  {
    id: "commercial",
    title: "Attractivité commerciale ESN",
    subtitle: "Évalue le fit entre enjeux IT, urgence business et capacité d'achat.",
    xLabel: "Fit offres ESN",
    yLabel: "Urgence / fenêtre commerciale",
    xLow: "Offres ciblées",
    xHigh: "Programme SI",
    yLow: "Opportuniste",
    yHigh: "Prioritaire",
  },
  {
    id: "valueChain",
    title: "Chaîne de valeur métier",
    subtitle: "Distingue fournisseurs amont, constructeurs intégrés et spécialistes de niche.",
    xLabel: "Position dans la chaîne de valeur",
    yLabel: "Amplitude métier couverte",
    xLow: "Amont / produit",
    xHigh: "Aval / exécution intégrée",
    yLow: "Spécialisé",
    yHigh: "Multi-métiers",
  },
];

const ACCOUNTS: CompetitiveAccount[] = [
  {
    id: "eiffage",
    name: "Eiffage",
    category: "leader",
    segmentLabel: "Compte étalon · construction / infrastructures",
    revenue: "25,3 Md€ groupe · env. 13,3 Md€ construction + infrastructures",
    employees: "France + Europe · groupe intégré",
    scope: "National, européen, grands projets et concessions",
    revenueWeight: 5,
    collectiveAgreement: "Bâtiment et Travaux Publics selon filiales / établissements",
    regulationClass: "NAF section F · divisions 41, 42 et 43 selon activité",
    mainJob: "Concevoir, construire et piloter des infrastructures complexes, bâtiments, routes, génie civil et structures métalliques.",
    otherJobs: "Énergie systèmes, concessions et immobilier à considérer hors périmètre sauf projet infrastructure critique.",
    valueChain: {
      suppliers: "Matériaux, bureaux d'études, équipements chantier, sous-traitants, éditeurs BIM / GED / ERP, cloud et IoT.",
      value: "Pilotage de groupements, gestion risque projet, coordination multi-métiers, exécution grands travaux, reporting sécurité / carbone.",
      clients: "État, collectivités, Société des grands projets, SNCF Réseau, RATP, industriels, énergéticiens, grands donneurs d'ordre privés.",
    },
    contracts: ["Grand Paris Express · ligne 15 Est", "Campus IA de Fouju · infrastructures communes"],
    reputation: "Acteur robuste, équilibré, moins monolithique que VINCI, avec forte crédibilité infrastructure et énergie.",
    innovationPosture: "Communication IA explicite, data platform, cloud, BIM, pilotage carbone et continuité numérique.",
    trajectory: "Croissance solide, diversification construction / infrastructure / énergie et montée des projets critiques.",
    salesAngles: [
      "Partir de la stratégie IA déjà annoncée : vendre des cas d'usage gouvernés, pas de l'IA générique.",
      "Connecter BIM, GED, ERP chantier et reporting carbone dans une logique de continuité numérique.",
      "Proposer un pilote court sur analyse de risque appels d'offres ou synthèse documentaire chantier.",
    ],
    objections: [
      {
        text: "Nous avons déjà une stratégie IA et des partenaires cloud.",
        response: "Positionner l'ESN comme intégrateur métier terrain : cadrage cas d'usage, sécurité, adoption chantier et industrialisation, pas comme fournisseur cloud alternatif.",
      },
      {
        text: "Nos données chantier sont trop dispersées pour un projet IA fiable.",
        response: "Proposer un audit de continuité numérique sur un périmètre réduit : GED, incidents, coûts, planning et preuves documentaires.",
      },
    ],
    itOffers: ["Copilote appels d'offres et analyse contractuelle", "Data platform chantier / marge / risques", "BIM, GED et jumeau numérique", "Gouvernance IA sécurisée", "Reporting CSRD / carbone projet"],
    fragilities: ["Complexité multi-filiales", "SI hétérogène", "Fort enjeu d'adoption terrain", "Achats structurés et cycles longs"],
    scores: {
      market: { x: 86, y: 91 },
      it: { x: 88, y: 92 },
      commercial: { x: 91, y: 88 },
      valueChain: { x: 88, y: 92 },
    },
  },
  {
    id: "vinci-construction",
    name: "VINCI Construction",
    category: "leader",
    segmentLabel: "Leader volume · grands projets mondiaux",
    revenue: "32,1 Md€",
    employees: "117 000 collaborateurs",
    scope: "France, Europe, mondial",
    revenueWeight: 5,
    collectiveAgreement: "Bâtiment et Travaux Publics selon filiales / établissements",
    regulationClass: "NAF section F · divisions 41, 42 et 43 selon métiers",
    mainJob: "Construction, réseaux de proximité, spécialités, grands ouvrages et infrastructures lourdes.",
    otherJobs: "VINCI Autoroutes et concessions exclues sauf dépendance projet construction.",
    valueChain: {
      suppliers: "Bureaux d'études, matériaux, engins, sous-traitants, fournisseurs numériques, spécialistes sécurité / environnement.",
      value: "Capacité à absorber les mégaprojets, standardiser les méthodes, gérer les risques et coordonner des groupements complexes.",
      clients: "Grands donneurs d'ordre publics, transports, collectivités, industriels, opérateurs d'infrastructures.",
    },
    contracts: ["Grand Paris Express · ligne 15 Sud", "Tunnel Lyon-Turin · lot 5A"],
    reputation: "Référence d'exécution et de puissance industrielle ; très forte capacité d'ingénierie et de structuration.",
    innovationPosture: "Innovation opérationnelle, BIM, inspection automatisée, maintenance prédictive, data projet et programmes internes.",
    trajectory: "Domination de volume, expansion internationale et renforcement des standards industriels.",
    salesAngles: [
      "Ne pas vendre un outil isolé : parler industrialisation multi-entités et gouvernance groupe.",
      "Proposer une brique de scoring risques / marge connectée aux méthodes projet existantes.",
      "Faire levier sur cybersécurité, continuité numérique et conformité documentaire grands chantiers.",
    ],
    objections: [
      {
        text: "Nos équipes internes couvrent déjà le sujet.",
        response: "Amener un accélérateur de delivery : cadrage, intégration SI, adoption terrain et outillage de lots pilotes sans remettre en cause la stratégie interne.",
      },
      {
        text: "La sécurité et les standards groupe rendent l'intégration lente.",
        response: "Proposer un MVP sans donnée sensible, hébergé dans le cadre déjà validé, avec passage sécurité en amont.",
      },
    ],
    itOffers: ["Architecture data multi-projets", "Cybersécurité infrastructures critiques", "Automatisation contrôle documentaire", "Observabilité coûts / délais", "BIM / asset data handover"],
    fragilities: ["Cycles achats très longs", "Architecture groupe complexe", "Niveau d'exigence sécurité élevé"],
    scores: {
      market: { x: 82, y: 96 },
      it: { x: 86, y: 78 },
      commercial: { x: 88, y: 82 },
      valueChain: { x: 90, y: 96 },
    },
  },
  {
    id: "bouygues-construction",
    name: "Bouygues Construction",
    category: "leader",
    segmentLabel: "Leader bâtiment complexe · construction durable",
    revenue: "10,6 Md€",
    employees: "34 500+ collaborateurs",
    scope: "France et international",
    revenueWeight: 4.5,
    collectiveAgreement: "Bâtiment et Travaux Publics selon filiales / établissements",
    regulationClass: "NAF section F · divisions 41, 42 et 43 selon métiers",
    mainJob: "Bâtiments complexes, infrastructures, ouvrages publics, construction durable et projets à forte ingénierie.",
    otherJobs: "Bouygues Immobilier, Télécoms et Colas à exclure sauf interaction projet.",
    valueChain: {
      suppliers: "Matériaux bas carbone, bureaux d'études, sous-traitants, plateformes BIM, équipements chantier et solutions énergie.",
      value: "Conception-construction, jumeaux numériques, chantiers durables, coordination technique et innovation méthodes.",
      clients: "Grands maîtres d'ouvrage publics et privés, équipements, tertiaire, énergie, collectivités.",
    },
    contracts: ["Centre aquatique olympique", "Parc éolien en mer de Fécamp · références infrastructure"],
    reputation: "Très forte image innovation, construction durable, grands équipements et design-build.",
    innovationPosture: "BIM, jumeaux numériques, robotique, industrialisation, bas carbone et data chantier.",
    trajectory: "Positionnement qualitatif sur projets complexes et transition environnementale.",
    salesAngles: [
      "Parler construction durable, industrialisation et jumeau numérique plutôt que CRM générique.",
      "Proposer un cockpit carbone / coûts / risques pour grands programmes immobiliers ou équipements.",
      "Mettre en avant l'adoption terrain : mobile chantier, qualité, réserves et DOE numérique.",
    ],
    objections: [
      {
        text: "Nos projets sont trop spécifiques pour un modèle standard.",
        response: "Proposer une approche composable : socle commun données + adaptations limitées par typologie de projet.",
      },
      {
        text: "Le BIM existe déjà, le problème est l'exploitation après chantier.",
        response: "Orienter la proposition sur le handover asset data, DOE numérique et exploitation maintenance.",
      },
    ],
    itOffers: ["Jumeau numérique et handover data", "Mobile qualité / réserves chantier", "Reporting carbone", "IA d'aide aux appels d'offres", "Data produit construction durable"],
    fragilities: ["Forte dispersion projets", "Passage chantier vers exploitation", "Arbitrage ROI des innovations"],
    scores: {
      market: { x: 89, y: 84 },
      it: { x: 90, y: 82 },
      commercial: { x: 87, y: 80 },
      valueChain: { x: 84, y: 86 },
    },
  },
  {
    id: "nge",
    name: "NGE",
    category: "challenger",
    segmentLabel: "Challenger TP · croissance et intégration",
    revenue: "env. 5 Md€",
    employees: "26 000 collaborateurs",
    scope: "France, international, infrastructures",
    revenueWeight: 3.8,
    collectiveAgreement: "Travaux Publics principalement",
    regulationClass: "NAF 42 / 43 principalement",
    mainJob: "Terrassement, génie civil, réseaux, eau, ferroviaire, routes et concessions.",
    otherJobs: "Métiers eau et réseaux renforcés après intégrations.",
    valueChain: {
      suppliers: "Matériaux, engins, bureaux d'études, équipements réseau, sous-traitants spécialisés.",
      value: "Exécution TP multi-métiers, coordination terrain, intégration d'activités eau / réseaux / ferroviaire.",
      clients: "Collectivités, opérateurs ferroviaires, aménageurs, infrastructures publiques, industriels.",
    },
    contracts: ["Références ferroviaires et infrastructures", "Intégration SADE"],
    reputation: "Challenger dynamique, conquérant, entrepreneurial, crédible sur lots TP et réseaux.",
    innovationPosture: "Innovation pragmatique : mobilité chantier, réseaux, eau, géotechnique, data d'exécution.",
    trajectory: "Forte croissance et acquisitions ; besoin de standardisation et d'intégration SI.",
    salesAngles: [
      "Adresser la croissance : harmoniser les outils après acquisitions et standardiser les méthodes.",
      "Proposer un cockpit opérationnel TP : planning, matériel, risques, sécurité et rentabilité par chantier.",
      "Démarrer par une brique mobile terrain ou GED chantier plutôt qu'un grand programme data.",
    ],
    objections: [
      {
        text: "Nos équipes terrain veulent du simple, pas une usine à gaz.",
        response: "Pitcher une interface action terrain : photos, réserves, sécurité, avancement, sans surcharge administrative.",
      },
      {
        text: "L'intégration post-acquisition est déjà complexe.",
        response: "Proposer un audit cartographique court et une feuille de route de convergence par priorités métier.",
      },
    ],
    itOffers: ["PMO digital post-acquisition", "Mobile chantier TP", "GED et conformité documentaire", "Data marge / matériel", "Reporting eau / réseaux"],
    fragilities: ["Hétérogénéité post-croissance", "Métiers très terrain", "Priorité au ROI court"],
    scores: {
      market: { x: 70, y: 75 },
      it: { x: 70, y: 63 },
      commercial: { x: 82, y: 84 },
      valueChain: { x: 78, y: 74 },
    },
  },
  {
    id: "fayat-razel",
    name: "Fayat / Razel-Bec",
    category: "challenger",
    segmentLabel: "Challenger indépendant · TP lourd",
    revenue: "5,9 Md€ groupe",
    employees: "23 655 collaborateurs",
    scope: "France et international",
    revenueWeight: 3.9,
    collectiveAgreement: "Travaux Publics et Bâtiment selon filiales",
    regulationClass: "NAF 41 / 42 / 43 selon filiales",
    mainJob: "Travaux publics, fondations, terrassement, ouvrages d'art, infrastructures linéaires et matériel routier.",
    otherJobs: "Matériel routier, métal, énergie et bâtiment selon entités.",
    valueChain: {
      suppliers: "Matériaux, machines, géotechnique, ingénierie, sous-traitants, systèmes industriels.",
      value: "TP lourd, fondations, ouvrages complexes, capacité industrielle indépendante et expertise matériel.",
      clients: "Maîtres d'ouvrage publics, transport, énergie, collectivités, grands projets d'infrastructure.",
    },
    contracts: ["Grand Paris Express · lots lignes 17 / 18 via groupements", "Grands ouvrages Razel-Bec"],
    reputation: "Premier groupe indépendant, technique, robuste, moins visible que les majors mais très crédible en TP.",
    innovationPosture: "Innovation métier portée par matériel, méthodes TP, fondations et exécution.",
    trajectory: "Consolidation d'un groupe indépendant diversifié ; potentiel SI autour de la transversalité industrielle.",
    salesAngles: [
      "Valoriser l'indépendance et la maîtrise industrielle : proposer un SI qui connecte chantier, matériel et marge.",
      "Entrer par maintenance / flotte / matériel routier ou par pilotage documentaire grands lots.",
      "Éviter le discours transformation globale ; parler fiabilité d'exécution et réduction du risque projet.",
    ],
    objections: [
      {
        text: "Nos méthodes métier sont spécifiques et éprouvées.",
        response: "Ne pas contester la méthode ; digitaliser les preuves, les contrôles et les remontées sans changer le geste métier.",
      },
      {
        text: "La donnée chantier n'est pas assez propre.",
        response: "Démarrer par une structuration minimale des données critiques : matériel, avancement, incidents, non-conformités.",
      },
    ],
    itOffers: ["Pilotage flotte et matériel", "GED grands lots", "Data qualité / non-conformités", "Maintenance prédictive", "Tableaux marge chantier"],
    fragilities: ["Visibilité digitale plus faible", "Diversification filiales", "Standardisation difficile"],
    scores: {
      market: { x: 63, y: 74 },
      it: { x: 60, y: 50 },
      commercial: { x: 77, y: 72 },
      valueChain: { x: 79, y: 70 },
    },
  },
  {
    id: "spie-batignolles",
    name: "Spie batignolles",
    category: "challenger",
    segmentLabel: "Challenger indépendant · maillage France",
    revenue: "2,58 Md€",
    employees: "9 000 collaborateurs",
    scope: "France, implantations nationales, projets internationaux ciblés",
    revenueWeight: 3.2,
    collectiveAgreement: "Bâtiment et Travaux Publics selon entités",
    regulationClass: "NAF 41 / 42 / 43 selon métiers",
    mainJob: "Construction, génie civil, fondations, infrastructures, énergie, paysage et travaux spécialisés.",
    otherJobs: "Travaux maritimes via ETPO ; services et maintenance selon entités.",
    valueChain: {
      suppliers: "Matériaux, bureaux d'études, sous-traitants, équipements spécialisés, solutions énergie.",
      value: "Entreprise indépendante multi-métiers, chantiers complexes, proximité régionale, expertise fondations / génie civil.",
      clients: "Public, collectivités, grands comptes privés, infrastructures, ouvrages spécialisés.",
    },
    contracts: ["Grand Paris Express avec VINCI", "Canal de l'Escaut"],
    reputation: "Acteur indépendant sérieux, proche du terrain, crédible en génie civil et travaux spécialisés.",
    innovationPosture: "Innovation progressive, pragmatique, orientée exécution, sécurité et méthodes.",
    trajectory: "Développement régulier, maillage territorial, capacité à jouer en groupement avec les majors.",
    salesAngles: [
      "Proposer une approche de standardisation légère entre régions / métiers.",
      "Entrer par qualité, sécurité, GED et pilotage de lots complexes.",
      "Utiliser l'argument actionnariat salarié : outils utiles au terrain, pas couche administrative.",
    ],
    objections: [
      {
        text: "Nous devons préserver l'autonomie des agences.",
        response: "Construire un socle commun de données, avec interfaces locales et indicateurs non intrusifs.",
      },
      {
        text: "Les outils groupe sont souvent peu adoptés sur chantier.",
        response: "Commencer par deux rituels terrain : compte-rendu mobile et suivi réserves / sécurité, avec feedback utilisateur.",
      },
    ],
    itOffers: ["Socle data multi-agences", "Mobile chantier", "GED / DOE numérique", "Pilotage qualité sécurité", "Reporting énergie / services"],
    fragilities: ["Équilibre autonomie / groupe", "Hétérogénéité métiers", "ROI court indispensable"],
    scores: {
      market: { x: 66, y: 68 },
      it: { x: 63, y: 52 },
      commercial: { x: 79, y: 74 },
      valueChain: { x: 74, y: 68 },
    },
  },
  {
    id: "demathieu-bard",
    name: "Demathieu Bard",
    category: "mid",
    segmentLabel: "ETI robuste · bâtiment et génie civil",
    revenue: "> 2 Md€",
    employees: "ETI nationale",
    scope: "France, Europe, Amérique du Nord selon projets",
    revenueWeight: 2.8,
    collectiveAgreement: "Bâtiment et Travaux Publics selon établissements",
    regulationClass: "NAF 41 / 42 principalement",
    mainJob: "Entreprise générale, bâtiment public / privé, génie civil, ouvrages complexes.",
    otherJobs: "Immobilier et opérations connexes selon filiales.",
    valueChain: {
      suppliers: "Bureaux d'études, matériaux, sous-traitants, ingénierie technique, outils GED / BIM.",
      value: "Pilotage d'opérations significatives, entreprise générale, génie civil et coordination projet.",
      clients: "État, collectivités, promoteurs, industriels, maîtres d'ouvrage privés.",
    },
    contracts: ["Opérations publiques 50-250 M€", "Projets data centers, musées, prisons selon références communiquées"],
    reputation: "ETI solide, technique, crédible sur opérations significatives sans être major systémique.",
    innovationPosture: "Maturité numérique intermédiaire ; fort potentiel de gains via pilotage projet et GED.",
    trajectory: "Carnet de commandes élevé et montée sur opérations complexes.",
    salesAngles: [
      "Vendre du ROI court : réduire temps administratif chantier, fiabiliser coût / délai et DOE.",
      "Proposer un cockpit portefeuille pour directions de projet et exploitation commerciale.",
      "Éviter les grands programmes IA : commencer par GED intelligente et synthèse de risques.",
    ],
    objections: [
      {
        text: "Nous n'avons pas les moyens d'un programme SI de major.",
        response: "Cadrer une offre 6-8 semaines, périmètre unique, KPI mesurable, sans refonte SI.",
      },
      {
        text: "Les chefs de projet sont déjà saturés.",
        response: "Automatiser la synthèse hebdo plutôt qu'ajouter une saisie : brancher sur documents et données existantes.",
      },
    ],
    itOffers: ["GED intelligente chantier", "Cockpit marge / avancement", "Synthèse risques projet", "Automatisation comptes-rendus", "BI portefeuille"],
    fragilities: ["Capacité d'investissement plus sélective", "Adoption terrain", "Données projet hétérogènes"],
    scores: {
      market: { x: 58, y: 58 },
      it: { x: 58, y: 43 },
      commercial: { x: 72, y: 67 },
      valueChain: { x: 70, y: 58 },
    },
  },
  {
    id: "gcc",
    name: "GCC",
    category: "mid",
    segmentLabel: "Mid-market indépendant · construction / énergie",
    revenue: "1,175 Md€",
    employees: "3 062 collaborateurs",
    scope: "France + Suisse",
    revenueWeight: 2.4,
    collectiveAgreement: "Bâtiment principalement, compléments selon métiers énergie",
    regulationClass: "NAF 41 principalement, activités connexes 43",
    mainJob: "Construction, énergie, promotion et aménagement urbain.",
    otherJobs: "Énergie et immobilier à considérer comme leviers adjacents.",
    valueChain: {
      suppliers: "Matériaux, lots techniques, énergie, sous-traitants, outils économie circulaire.",
      value: "Construction indépendante, proximité, intégration énergie, économie circulaire et réemploi.",
      clients: "Public, tertiaire, promoteurs, collectivités, acteurs urbains.",
    },
    contracts: ["Plateforme REUTIL d'économie circulaire", "Opérations publiques et privées de transformation territoriale"],
    reputation: "Top 10 BTP français, indépendant, agile, sensible aux offres pragmatiques.",
    innovationPosture: "Économie circulaire visible, besoin de data produit, matériaux, carbone et reporting.",
    trajectory: "Croissance contrôlée, différenciation par indépendance et transition environnementale.",
    salesAngles: [
      "S'appuyer sur l'économie circulaire : traçabilité matériaux, réemploi, reporting carbone.",
      "Proposer un socle de données projets simple : coûts, délais, matériaux, conformité.",
      "Vendre un parcours par modules, pas un programme lourd.",
    ],
    objections: [
      {
        text: "Nous avons besoin d'outils concrets, pas d'une démarche conseil longue.",
        response: "Arriver avec un lot pilote : dashboard réemploi / carbone ou GED projet en 30 jours.",
      },
      {
        text: "Les données matériaux sont incomplètes.",
        response: "Construire un référentiel minimal et progressif, connecté à deux flux sources prioritaires.",
      },
    ],
    itOffers: ["Reporting économie circulaire", "Référentiel matériaux", "Data carbone", "GED projet", "CRM appels d'offres"],
    fragilities: ["Moins de budget qu'un leader", "Dépendance à la qualité des données fournisseurs", "Priorité ROI"],
    scores: {
      market: { x: 64, y: 50 },
      it: { x: 62, y: 48 },
      commercial: { x: 74, y: 70 },
      valueChain: { x: 68, y: 54 },
    },
  },
  {
    id: "leon-grosse",
    name: "Léon Grosse",
    category: "mid",
    segmentLabel: "Mid-market patrimonial · construction / réhabilitation",
    revenue: "950 M€",
    employees: "2 800 collaborateurs",
    scope: "France métropolitaine + DOM-TOM",
    revenueWeight: 2.2,
    collectiveAgreement: "Bâtiment et Travaux Publics selon établissements",
    regulationClass: "NAF 41 / 42 selon opérations",
    mainJob: "Construction, réhabilitation, génie civil, bâtiments publics et privés.",
    otherJobs: "Activités spécialisées selon agences et projets.",
    valueChain: {
      suppliers: "Matériaux, sous-traitants locaux, bureaux d'études, lots techniques, outils chantier.",
      value: "Entreprise patrimoniale, exécution fiable, réhabilitation et opérations techniques.",
      clients: "Collectivités, donneurs d'ordre publics, promoteurs, grands comptes privés.",
    },
    contracts: ["Références historiques d'ouvrages publics", "Opérations de réhabilitation et génie civil"],
    reputation: "Marque patrimoniale, technique, solide, mais moins visible dans la communication digitale récente.",
    innovationPosture: "Modernisation progressive ; potentiel fort sur qualité, GED, pilotage et commercial.",
    trajectory: "Stabilité et ancrage territorial ; opportunité de montée en maturité data sans rupture.",
    salesAngles: [
      "Proposer une modernisation discrète : mieux piloter sans changer la culture d'exécution.",
      "Commencer par CRM / appels d'offres ou GED de réhabilitation.",
      "Mettre en avant qualité, traçabilité et réduction des irritants administratifs.",
    ],
    objections: [
      {
        text: "Notre priorité reste le chantier, pas le digital.",
        response: "Justement : cibler les irritants chantier et administratifs qui font perdre du temps aux conducteurs de travaux.",
      },
      {
        text: "Nous avons déjà trop d'outils.",
        response: "Proposer une couche de synthèse et d'intégration plutôt qu'un outil de plus.",
      },
    ],
    itOffers: ["CRM appels d'offres", "GED réhabilitation", "Synthèse chantier automatique", "Dashboard qualité", "Intégration outils existants"],
    fragilities: ["Visibilité digitale faible", "Risque d'empilement outils", "Arbitrage budgétaire"],
    scores: {
      market: { x: 50, y: 48 },
      it: { x: 50, y: 36 },
      commercial: { x: 66, y: 58 },
      valueChain: { x: 67, y: 48 },
    },
  },
  {
    id: "vestack",
    name: "Vestack",
    category: "emerging",
    segmentLabel: "Émergent · construction hors-site bas carbone",
    revenue: "Non publié de façon stable",
    employees: "Scale-up / PME spécialisée",
    scope: "National, projets tertiaires et équipements",
    revenueWeight: 1.2,
    collectiveAgreement: "À vérifier selon établissement : bâtiment / ingénierie / préfabrication",
    regulationClass: "NAF à confirmer · construction hors-site / ingénierie / préfabrication",
    mainJob: "Construction modulaire hors-site bas carbone pour bâtiments tertiaires et équipements.",
    otherJobs: "Industrialisation produit, design, ingénierie et assemblage.",
    valueChain: {
      suppliers: "Bois, modules, industriels, ingénierie, logistique, fournisseurs bas carbone.",
      value: "Standardiser, préfabriquer, assembler vite, réduire carbone et délais chantier.",
      clients: "Grands comptes, immobilier tertiaire, équipements, acteurs cherchant rapidité et bas carbone.",
    },
    contracts: ["Bureaux EDF durables · 4 000 m²", "Programmes tertiaires hors-site"],
    reputation: "Petit acteur mais trajectoire ascendante, différencié par industrialisation et carbone.",
    innovationPosture: "Innovation métier forte : produit, méthode, supply chain, data carbone et standardisation.",
    trajectory: "Potentiel de passage à l'échelle si qualité, supply chain et traçabilité suivent.",
    salesAngles: [
      "Ne pas vendre un SI lourd : aider au passage à l'échelle industriel.",
      "Cibler data produit, qualité, configurateur, CRM et pilotage supply chain.",
      "Valoriser traçabilité carbone et preuve de performance comme différenciant commercial.",
    ],
    objections: [
      {
        text: "Nous devons aller vite, pas structurer un SI complet.",
        response: "Proposer des briques très légères : référentiel composants, suivi qualité, dashboard projets.",
      },
      {
        text: "Notre avantage vient de notre méthode, nous ne voulons pas la rigidifier.",
        response: "Formaliser uniquement les invariants réutilisables et préserver les adaptations projet.",
      },
    ],
    itOffers: ["Référentiel produit / modules", "Configurateur léger", "Traçabilité carbone", "Pilotage supply chain", "CRM grands comptes"],
    fragilities: ["Données financières moins publiques", "Capacité achats limitée", "Priorités hyper opérationnelles"],
    scores: {
      market: { x: 84, y: 28 },
      it: { x: 66, y: 64 },
      commercial: { x: 62, y: 60 },
      valueChain: { x: 23, y: 35 },
    },
  },
  {
    id: "hoffmann-green",
    name: "Hoffmann Green Cement",
    category: "emerging",
    segmentLabel: "Émergent amont · matériaux bas carbone",
    revenue: "16,8 M€",
    employees: "PME industrielle cotée",
    scope: "France + international via licences / partenariats",
    revenueWeight: 1.1,
    collectiveAgreement: "Industrie matériaux plutôt que CCN BTP directe",
    regulationClass: "Amont matériaux · classification industrie, pas travaux publics directs",
    mainJob: "Ciment 0 % clinker et solutions matériaux bas carbone pour la construction.",
    otherJobs: "R&D matériaux, production industrielle, licences et partenariats.",
    valueChain: {
      suppliers: "Matières premières, chimie, énergie, laboratoires, partenaires industriels.",
      value: "Réduire l'empreinte carbone du ciment et fournir un levier environnemental aux constructeurs.",
      clients: "Majors BTP, industriels matériaux, promoteurs, donneurs d'ordre exigeant bas carbone.",
    },
    contracts: ["Commercialisation ciment 0 % clinker", "Partenariats construction bas carbone"],
    reputation: "Acteur de rupture très visible sur le carbone, pas concurrent travaux mais influenceur de pratiques.",
    innovationPosture: "Innovation produit très forte ; IT autour traçabilité, certification, production et reporting impact.",
    trajectory: "Croissance à surveiller ; le facteur clé est l'adoption par majors et donneurs d'ordre.",
    salesAngles: [
      "Adresser la preuve : données produit, certification, traçabilité CO₂, reporting clients.",
      "Proposer un socle data industriel pour production, qualité et contrats partenaires.",
      "Ne pas le traiter comme une entreprise TP : c'est un fournisseur stratégique de la chaîne construction.",
    ],
    objections: [
      {
        text: "Notre priorité est industrielle et commerciale, pas IT.",
        response: "Rattacher l'IT à la preuve produit : traçabilité, conformité, qualité et reporting client automatisé.",
      },
      {
        text: "Nous avons peu de temps pour structurer les données.",
        response: "Commencer par les flux critiques : fiches produit, certificats, lots, clients et indicateurs carbone.",
      },
    ],
    itOffers: ["Data produit et certificats", "Traçabilité lots / qualité", "Reporting CO₂ client", "CRM partenariats", "BI production"],
    fragilities: ["Pas un acheteur ESN lourd", "Dépendance adoption marché", "Besoin d'offres très ciblées"],
    scores: {
      market: { x: 92, y: 22 },
      it: { x: 68, y: 70 },
      commercial: { x: 60, y: 66 },
      valueChain: { x: 12, y: 28 },
    },
  },
  {
    id: "etpo",
    name: "ETPO / Spie batignolles ETPO",
    category: "niche",
    segmentLabel: "Niche · travaux maritimes et ouvrages d'art",
    revenue: "env. 250 M€",
    employees: "750 collaborateurs",
    scope: "Littoral France, outre-mer, international ciblé",
    revenueWeight: 1.4,
    collectiveAgreement: "Travaux Publics / génie civil selon établissements",
    regulationClass: "NAF 42 / 43 selon opérations",
    mainJob: "Travaux maritimes, fluviaux, sous-marins, ouvrages d'art et réparation d'ouvrages.",
    otherJobs: "Génie civil spécialisé et opérations littorales.",
    valueChain: {
      suppliers: "Matériel maritime, études géotechniques, barges, plongeurs, matériaux, sécurité spécialisée.",
      value: "Exécuter des travaux en environnement contraint : mer, fleuve, ouvrage sensible, météo, sécurité.",
      clients: "Ports, collectivités, État, ouvrages patrimoniaux, industriels littoraux.",
    },
    contracts: ["Sauvegarde du Fort Boyard", "Travaux maritimes et fluviaux spécialisés"],
    reputation: "Niche technique crédible, différenciée par environnement d'intervention.",
    innovationPosture: "Innovation ciblée : sécurité, planification, documentation, capteurs et suivi météo / ouvrage.",
    trajectory: "Pas vocation à devenir major ; valeur dans spécialisation et expertise rare.",
    salesAngles: [
      "Vendre sécurité, qualité, documentation et planification en environnement contraint.",
      "Proposer une application terrain offline / mobile pour preuves, incidents et photos géolocalisées.",
      "Utiliser l'angle capteurs / surveillance ouvrage si le contexte projet le justifie.",
    ],
    objections: [
      {
        text: "Nos contraintes terrain sont trop spécifiques pour un outil standard.",
        response: "Construire une couche légère adaptée au terrain maritime : offline, preuves photo, météo, journal de chantier.",
      },
      {
        text: "Les équipes terrain ne rempliront pas un nouvel outil.",
        response: "Limiter la saisie à 3 actions : incident, avancement, preuve photo ; le reste est automatisé.",
      },
    ],
    itOffers: ["Mobile chantier offline", "Journal de preuves", "Suivi sécurité", "GED technique", "Capteurs / monitoring ouvrage"],
    fragilities: ["Marché spécialisé", "Budgets ciblés", "Besoin d'adaptation terrain"],
    scores: {
      market: { x: 58, y: 36 },
      it: { x: 52, y: 38 },
      commercial: { x: 58, y: 54 },
      valueChain: { x: 74, y: 30 },
    },
  },
  {
    id: "matiere",
    name: "Matière",
    category: "niche",
    segmentLabel: "Niche industrielle · ponts et ouvrages métalliques",
    revenue: "Non consolidé public dans le lab",
    employees: "env. 500 collaborateurs",
    scope: "France, Belgique, export",
    revenueWeight: 1.3,
    collectiveAgreement: "Génie civil / métallurgie selon entités et établissements",
    regulationClass: "NAF 42 et industrie métal selon activités",
    mainJob: "Ponts métalliques, ouvrages d'art, structures préfabriquées et solutions modulaires d'infrastructure.",
    otherJobs: "Production industrielle, export, préfabrication.",
    valueChain: {
      suppliers: "Acier, usinage, bureaux d'études, transport exceptionnel, sous-traitants industriels.",
      value: "Concevoir, produire et assembler des ouvrages métalliques et ponts modulaires.",
      clients: "Collectivités, infrastructures routières, export, aménageurs, États étrangers.",
    },
    contracts: ["Ponts métalliques France et international", "Ouvrages d'art modulaires"],
    reputation: "Niche industrielle exportatrice, forte expertise ouvrage métallique.",
    innovationPosture: "Innovation par préfabrication, modularité, qualité industrielle et documentation technique.",
    trajectory: "Développement lié à l'export et à la capacité de production / traçabilité.",
    salesAngles: [
      "Adresser l'industrie, pas seulement le chantier : PLM léger, qualité, traçabilité et documentation.",
      "Proposer une data room technique pour appels d'offres export et projets complexes.",
      "Mettre en avant conformité, documentation et maîtrise des configurations.",
    ],
    objections: [
      {
        text: "Nos plans et méthodes sont déjà maîtrisés par les bureaux d'études.",
        response: "Connecter études, production, qualité et dossier client sans remplacer les outils CAO existants.",
      },
      {
        text: "Le besoin est trop industriel pour une ESN généraliste.",
        response: "Se positionner sur intégration, données et processus, pas sur ingénierie ouvrage.",
      },
    ],
    itOffers: ["PLM léger", "GED technique export", "Traçabilité qualité", "Portail projet client", "BI production"],
    fragilities: ["Niche très spécialisée", "Données CAO / production sensibles", "Budget projets ciblé"],
    scores: {
      market: { x: 60, y: 32 },
      it: { x: 55, y: 35 },
      commercial: { x: 55, y: 50 },
      valueChain: { x: 38, y: 33 },
    },
  },
  {
    id: "charier",
    name: "Charier",
    category: "niche",
    segmentLabel: "Niche territoriale · TP Grand Ouest",
    revenue: "349 M€",
    employees: "1 800 collaborateurs",
    scope: "Grand Ouest + région parisienne",
    revenueWeight: 1.7,
    collectiveAgreement: "Travaux Publics principalement",
    regulationClass: "NAF 42 / 43 principalement",
    mainJob: "Travaux publics, terrassement, routes, carrières, matériaux, génie civil et désamiantage.",
    otherJobs: "Génie écologique, matériaux, flotte et expérimentation hydrogène.",
    valueChain: {
      suppliers: "Carrières, matériaux, flotte engins, sous-traitants, énergie, maintenance.",
      value: "Maillage territorial, production matériaux, exécution TP et différenciation environnementale.",
      clients: "Collectivités, infrastructures régionales, aménageurs, donneurs d'ordre publics et privés locaux.",
    },
    contracts: ["RN 141 Angoulême-Cognac", "Interventions JO Paris 2024 et expérimentation tracteur TP hydrogène"],
    reputation: "Acteur familial et territorial, crédible, engagé sur transition environnementale.",
    innovationPosture: "Innovation opérationnelle : flotte, matériaux, hydrogène, reporting environnemental et exploitation.",
    trajectory: "Croissance régionale maîtrisée ; différenciation écologique et performance opérationnelle.",
    salesAngles: [
      "Vendre des outils très terrain : flotte, matériaux, planning, carbone et maintenance.",
      "Utiliser l'angle transition environnementale comme point d'entrée commercial.",
      "Proposer un dashboard exploitation matériaux / émissions / activité par agence.",
    ],
    objections: [
      {
        text: "Nous sommes un acteur régional, pas un grand groupe à transformer.",
        response: "Justement : proposer un lot pragmatique, centré sur exploitation et reporting, avec ROI visible.",
      },
      {
        text: "Nos conducteurs et chefs de chantier n'ont pas le temps.",
        response: "Automatiser à partir des données flotte, matériaux et planning plutôt que multiplier la saisie.",
      },
    ],
    itOffers: ["Dashboard flotte / matériaux", "Reporting carbone TP", "Maintenance préventive", "Mobile chantier", "BI exploitation agence"],
    fragilities: ["Capacité d'achat régionale", "Priorité terrain", "Besoin d'offres très concrètes"],
    scores: {
      market: { x: 62, y: 34 },
      it: { x: 56, y: 42 },
      commercial: { x: 62, y: 58 },
      valueChain: { x: 66, y: 42 },
    },
  },
];

function getCategoryBadgeClass(category: CategoryId) {
  return `inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${CATEGORY_BADGE_CLASS[category]}`;
}

function clampPoint(value: number) {
  return Math.max(0, Math.min(100, value));
}

function formatScore(point: ScorePoint) {
  return `${Math.round(point.x)}/100 · ${Math.round(point.y)}/100`;
}

function MatrixGrid({
  accounts,
  selectedAccount,
  view,
  onSelect,
}: {
  accounts: CompetitiveAccount[];
  selectedAccount: CompetitiveAccount;
  view: MatrixView;
  onSelect: (account: CompetitiveAccount) => void;
}) {
  const plot = { left: 76, top: 56, right: 700, bottom: 400 };
  const width = plot.right - plot.left;
  const height = plot.bottom - plot.top;

  return (
    <div className="rounded-[2rem] border border-border bg-surface p-5">
      <div className="mb-4 flex flex-col gap-2 border-b border-border pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-brass">Matrice active</p>
          <h2 className="mt-1 font-heading text-2xl font-bold text-heading">{view.title}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-body">{view.subtitle}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-raised px-4 py-3 text-xs text-muted">
          Taille du point = poids économique relatif · clic = fiche commerciale.
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg
          className="min-h-[520px] min-w-[760px]"
          viewBox="0 0 760 520"
          role="img"
          aria-label={`Matrice concurrentielle ${view.title}`}
        >
          <defs>
            <marker id="axis-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="4" refY="4">
              <path d="M0,0 L8,4 L0,8 Z" fill="var(--color-muted)" />
            </marker>
          </defs>

          {[0, 25, 50, 75, 100].map((tick) => {
            const x = plot.left + (tick / 100) * width;
            const y = plot.bottom - (tick / 100) * height;
            return (
              <g key={tick}>
                <line x1={x} x2={x} y1={plot.top} y2={plot.bottom} stroke="var(--color-border)" strokeDasharray="4 8" />
                <line x1={plot.left} x2={plot.right} y1={y} y2={y} stroke="var(--color-border)" strokeDasharray="4 8" />
                <text x={x} y={plot.bottom + 24} textAnchor="middle" className="fill-muted text-[11px] font-bold">
                  {tick}
                </text>
                <text x={plot.left - 18} y={y + 4} textAnchor="end" className="fill-muted text-[11px] font-bold">
                  {tick}
                </text>
              </g>
            );
          })}

          <line
            x1={plot.left}
            x2={plot.right + 8}
            y1={plot.bottom}
            y2={plot.bottom}
            stroke="var(--color-muted)"
            strokeWidth="1.5"
            markerEnd="url(#axis-arrow)"
          />
          <line
            x1={plot.left}
            x2={plot.left}
            y1={plot.bottom}
            y2={plot.top - 8}
            stroke="var(--color-muted)"
            strokeWidth="1.5"
            markerEnd="url(#axis-arrow)"
          />

          <text x={(plot.left + plot.right) / 2} y={492} textAnchor="middle" className="fill-heading text-[13px] font-bold">
            {view.xLabel}
          </text>
          <text x={plot.left} y={432} textAnchor="start" className="fill-muted text-[11px] font-bold uppercase tracking-[0.12em]">
            {view.xLow}
          </text>
          <text x={plot.right} y={432} textAnchor="end" className="fill-muted text-[11px] font-bold uppercase tracking-[0.12em]">
            {view.xHigh}
          </text>
          <text transform="translate(20 230) rotate(-90)" textAnchor="middle" className="fill-heading text-[13px] font-bold">
            {view.yLabel}
          </text>
          <text x={38} y={plot.bottom} textAnchor="start" className="fill-muted text-[11px] font-bold uppercase tracking-[0.12em]" transform={`rotate(-90 38 ${plot.bottom})`}>
            {view.yLow}
          </text>
          <text x={38} y={plot.top} textAnchor="end" className="fill-muted text-[11px] font-bold uppercase tracking-[0.12em]" transform={`rotate(-90 38 ${plot.top})`}>
            {view.yHigh}
          </text>

          <rect x={plot.left} y={plot.top} width={width} height={height} fill="transparent" stroke="var(--color-border)" />

          {accounts.map((account) => {
            const point = account.scores[view.id];
            const cx = plot.left + (clampPoint(point.x) / 100) * width;
            const cy = plot.bottom - (clampPoint(point.y) / 100) * height;
            const selected = account.id === selectedAccount.id;
            const radius = 7 + account.revenueWeight * 3.4;
            const showLabel = selected || account.category === "leader";

            return (
              <g
                key={account.id}
                role="button"
                tabIndex={0}
                aria-label={`Ouvrir la fiche ${account.name}`}
                onClick={() => onSelect(account)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(account);
                  }
                }}
                className="cursor-pointer outline-none"
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={radius + (selected ? 7 : 0)}
                  fill={CATEGORY_COLOR[account.category]}
                  opacity={selected ? 0.18 : 0.08}
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill={CATEGORY_COLOR[account.category]}
                  opacity={selected ? 0.98 : 0.78}
                  stroke={selected ? "var(--color-brand-brass)" : "var(--color-surface)"}
                  strokeWidth={selected ? 3 : 2}
                >
                  <title>{`${account.name} — ${formatScore(point)}`}</title>
                </circle>
                {showLabel ? (
                  <g>
                    <rect
                      x={cx + radius + 7}
                      y={cy - 13}
                      rx="10"
                      width={Math.min(180, account.name.length * 7 + 20)}
                      height="26"
                      fill="var(--color-surface)"
                      stroke="var(--color-border)"
                    />
                    <text x={cx + radius + 17} y={cy + 4} className="fill-heading text-[12px] font-bold">
                      {account.name}
                    </text>
                  </g>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 border-t border-border pt-4">
        {CATEGORY_ORDER.map((category) => (
          <span key={category} className="inline-flex items-center gap-2 text-xs font-bold text-body">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: CATEGORY_COLOR[category] }} />
            {CATEGORY_LABELS[category]}
          </span>
        ))}
      </div>
    </div>
  );
}

function AccountInspector({ account, view }: { account: CompetitiveAccount; view: MatrixView }) {
  const point = account.scores[view.id];

  return (
    <aside className="rounded-[2rem] border border-border bg-surface p-5 lg:sticky lg:top-6">
      <div className="border-b border-border pb-4">
        <span className={getCategoryBadgeClass(account.category)}>{CATEGORY_LABELS[account.category]}</span>
        <h2 className="mt-4 font-heading text-3xl font-bold leading-tight text-heading">{account.name}</h2>
        <p className="mt-2 text-sm font-bold text-brand-brass">{account.segmentLabel}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-2xl border border-border bg-surface-raised p-3">
            <p className="font-bold uppercase tracking-[0.12em] text-muted">CA</p>
            <p className="mt-1 font-bold text-heading">{account.revenue}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface-raised p-3">
            <p className="font-bold uppercase tracking-[0.12em] text-muted">Rayon</p>
            <p className="mt-1 font-bold text-heading">{account.scope}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-surface-raised p-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Lecture active</p>
        <p className="mt-1 font-heading text-lg font-bold text-heading">{view.title}</p>
        <p className="mt-1 text-sm text-body">Score X/Y : {formatScore(point)}</p>
      </div>

      <div className="mt-5 space-y-5">
        <section>
          <h3 className="edito-title-marker font-heading text-lg font-bold text-heading">Angle d'approche</h3>
          <ul className="mt-5 space-y-3">
            {account.salesAngles.map((angle) => (
              <li key={angle} className="rounded-2xl border border-border bg-surface-raised p-3 text-sm leading-6 text-body">
                {angle}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="edito-title-marker font-heading text-lg font-bold text-heading">Objections probables</h3>
          <div className="mt-5 space-y-3">
            {account.objections.map((objection) => (
              <div key={objection.text} className="rounded-2xl border border-border bg-surface p-3">
                <p className="text-sm font-bold text-heading">« {objection.text} »</p>
                <p className="mt-2 text-sm leading-6 text-body">{objection.response}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="edito-title-marker font-heading text-lg font-bold text-heading">Offres IT à proposer</h3>
          <div className="mt-5 flex flex-wrap gap-2">
            {account.itOffers.map((offer) => (
              <span key={offer} className="rounded-full border border-border bg-surface-raised px-3 py-2 text-xs font-bold text-heading">
                {offer}
              </span>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}

function BusinessCard({ account, onSelect }: { account: CompetitiveAccount; onSelect: (account: CompetitiveAccount) => void }) {
  return (
    <article className="edito-section-card rounded-[1.75rem] border border-border bg-surface">
      <header>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-fg/70">Fiche commerciale ESN</p>
            <h3 className="mt-1 font-heading text-xl font-bold text-primary-fg">{account.name}</h3>
          </div>
          <span className="rounded-full border border-primary-fg/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-primary-fg">
            {CATEGORY_LABELS[account.category]}
          </span>
        </div>
      </header>

      <div className="space-y-4 py-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-surface-raised p-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Métier principal</p>
            <p className="mt-2 text-sm leading-6 text-body">{account.mainJob}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface-raised p-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Convention / NAF</p>
            <p className="mt-2 text-sm leading-6 text-body">{account.collectiveAgreement}. {account.regulationClass}.</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface-raised p-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Références</p>
            <p className="mt-2 text-sm leading-6 text-body">{account.contracts.join(" · ")}</p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-brass">Fournisseurs</p>
            <p className="mt-2 text-sm leading-6 text-body">{account.valueChain.suppliers}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-brass">Création de valeur</p>
            <p className="mt-2 text-sm leading-6 text-body">{account.valueChain.value}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-brass">Clients</p>
            <p className="mt-2 text-sm leading-6 text-body">{account.valueChain.clients}</p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface-raised p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Angle recommandé</p>
            <p className="mt-2 text-sm leading-6 text-heading">{account.salesAngles[0]}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface-raised p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Offres prioritaires</p>
            <p className="mt-2 text-sm leading-6 text-heading">{account.itOffers.slice(0, 3).join(" · ")}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onSelect(account)}
          className="rounded-full border border-primary bg-primary px-4 py-2 text-sm font-bold text-primary-fg transition hover:bg-primary-deep focus:outline-none focus:ring-2 focus:ring-brand-brass"
        >
          Voir dans la matrice
        </button>
      </div>
    </article>
  );
}

function CompactKpi({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[1.5rem] border border-border bg-surface p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-3 font-heading text-3xl font-bold text-heading">{value}</p>
      <p className="mt-2 text-sm leading-6 text-body">{detail}</p>
    </div>
  );
}

export function BtpCompetitiveLab() {
  const [activeViewId, setActiveViewId] = useState<ViewId>("market");
  const [categoryFilter, setCategoryFilter] = useState<CategoryId | "all">("all");
  const [selectedAccountId, setSelectedAccountId] = useState("eiffage");

  const activeView = MATRIX_VIEWS.find((view) => view.id === activeViewId) ?? MATRIX_VIEWS[0];
  const filteredAccounts = useMemo(() => {
    if (categoryFilter === "all") return ACCOUNTS;
    return ACCOUNTS.filter((account) => account.category === categoryFilter);
  }, [categoryFilter]);
  const selectedAccount = ACCOUNTS.find((account) => account.id === selectedAccountId) ?? ACCOUNTS[0];

  return (
    <main data-theme="edito-bright-cockpit" className="min-h-screen bg-canvas text-body">
      <section className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-6 py-8 lg:px-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-brass">Lab KREDO · Intelligence sectorielle</p>
              <h1 className="edito-title-marker mt-3 font-heading text-4xl font-bold leading-tight text-heading lg:text-5xl">
                Cartographie concurrentielle BTP / Travaux publics
              </h1>
              <p className="mt-6 max-w-3xl text-base leading-7 text-body">
                Transformation du rapport sectoriel en outil commercial ESN : matrice interactive, filtres d'analyse, fiches comptes, objections probables et offres IT à pousser. Le compte étalon est Eiffage.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-border bg-primary px-5 py-4 text-primary-fg">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-fg/70">Périmètre</p>
              <p className="mt-2 font-heading text-2xl font-bold">France entière</p>
              <p className="mt-1 text-sm text-primary-fg/80">Construction · TP · infrastructures · projets critiques</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <CompactKpi label="Comptes cartographiés" value="14" detail="3 leaders, 3 challengers, 3 mid-markets, 2 émergents, 3 niches." />
            <CompactKpi label="Angles d'analyse" value="4" detail="Marché, IT/IA, attractivité ESN et chaîne de valeur." />
            <CompactKpi label="Compte étalon" value="Eiffage" detail="Benchmark pour grands travaux, infrastructures, énergie et IA gouvernée." />
            <CompactKpi label="Mode de lecture" value="Action" detail="Cliquer un point pour ouvrir la fiche commerciale du compte." />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-6 py-6 lg:px-10">
        <div className="mb-5 rounded-[1.75rem] border border-border bg-surface p-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Modes d'affichage</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {MATRIX_VIEWS.map((view) => (
                  <button
                    key={view.id}
                    type="button"
                    onClick={() => setActiveViewId(view.id)}
                    className={`rounded-full border px-4 py-2 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-brand-brass ${
                      activeViewId === view.id
                        ? "border-primary bg-primary text-primary-fg"
                        : "border-border bg-surface-raised text-heading hover:bg-surface-hover"
                    }`}
                  >
                    {view.title}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Filtre acteurs</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCategoryFilter("all")}
                  className={`rounded-full border px-4 py-2 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-brand-brass ${
                    categoryFilter === "all" ? "border-primary bg-primary text-primary-fg" : "border-border bg-surface-raised text-heading hover:bg-surface-hover"
                  }`}
                >
                  Tous
                </button>
                {CATEGORY_ORDER.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setCategoryFilter(category)}
                    className={`rounded-full border px-4 py-2 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-brand-brass ${
                      categoryFilter === category ? "border-primary bg-primary text-primary-fg" : "border-border bg-surface-raised text-heading hover:bg-surface-hover"
                    }`}
                  >
                    {CATEGORY_LABELS[category]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <MatrixGrid accounts={filteredAccounts} selectedAccount={selectedAccount} view={activeView} onSelect={(account) => setSelectedAccountId(account.id)} />
          <AccountInspector account={selectedAccount} view={activeView} />
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-6 pb-10 lg:px-10">
        <div className="mb-5 flex flex-col gap-2 border-b border-border pb-5">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-brass">Fiches commerciales ESN</p>
          <h2 className="font-heading text-3xl font-bold text-heading">Angles d'approche, objections et offres à pousser</h2>
          <p className="max-w-3xl text-sm leading-6 text-body">
            Ces fiches sont volontairement orientées prospection : elles résument ce qu'un commercial ESN doit garder en tête avant d'appeler le compte.
          </p>
        </div>

        <div className="grid gap-5">
          {ACCOUNTS.map((account) => (
            <BusinessCard key={account.id} account={account} onSelect={(item) => setSelectedAccountId(item.id)} />
          ))}
        </div>
      </section>
    </main>
  );
}
