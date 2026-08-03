import { DomainItem, WorkshopItem } from "./knowledge-hub.types"

export const domains: DomainItem[] = [
  {
    id: "clients-markets",
    title: "Clients & Marchés",
    subItems: ["Secteurs", "Entreprises", "Contacts", "Revues d'actualité"],
    description: "Cartographie complète de nos clients, prospects et partenaires de l'écosystème.",
    nature: "Fiches de synthèse, profils de comptes, organigrammes et flux de signaux faibles.",
    relations: ["Offres KREDO associées", "Consultants en mission", "Historique d'AO et propositions"],
  },
  {
    id: "expertise-kredo",
    title: "Expertise KREDO",
    subItems: ["Offres & Practices", "Métiers & Compétences", "Technologies", "Analyses d'actualité"],
    description: "Référentiel des savoir-faire KREDO, structuré par practices et technologies clés.",
    nature: "Fiches d'offres commerciales, matrices de compétences techniques et veilles technologiques.",
    relations: ["Missions de référence", "Profils des talents", "Matériel de réponse aux AO"],
  },
  {
    id: "talents",
    title: "Talents",
    subItems: ["Collaborateurs", "Anciens collaborateurs", "Vivier candidats", "Compétences"],
    description: "Base de connaissances interne sur nos équipes et notre écosystème de recrutement.",
    nature: "CVs anonymisés, compétences déclarées, évaluations internes et historique de staffing.",
    relations: ["Missions réalisées", "Practices d'appartenance", "Réponses aux AO"],
  },
  {
    id: "delivery-feedback",
    title: "Delivery & REX",
    subItems: ["Missions", "Transitions & Réversibilités", "Dispositifs de staffing", "Références et REX"],
    description: "Capitalisation sur nos projets délivrés et retours d'expérience méthodologiques.",
    nature: "Fiches de référence (REX), livrables types et playbooks de transition opérationnelle.",
    relations: ["Comptes clients", "Technologies mobilisées", "Talents impliqués"],
  },
  {
    id: "ao-proposals",
    title: "AO & Propositions",
    subItems: ["Appels d'offres reçus", "Réponses technico-commerciales", "Réponses gagnées ou perdues", "Éléments réutilisables"],
    description: "Mémoire commerciale de nos propositions et réponses aux appels d'offres.",
    nature: "Cahiers des charges (RFP), propositions commerciales et bibliothèques de slides réutilisables.",
    relations: ["Clients & Marchés", "Offres KREDO valorisées", "Tarifs de référence"],
  },
  {
    id: "internal-resources",
    title: "Ressources internes",
    subItems: ["Annuaire", "Organigramme", "Modèles", "Ressources juridiques et financières", "Charte et chiffres clés"],
    description: "Documents administratifs, modèles et chartes de l'entreprise.",
    nature: "Templates de documents KREDO, chartes graphiques et guides juridiques.",
    relations: ["Toutes les fiches et documents opérationnels"],
  },
]

export const workshops: WorkshopItem[] = [
  {
    id: "prepare-ao",
    title: "Préparer une réponse à un AO",
    description: "Analyser le cahier des charges et générer une première trame de réponse structurée.",
    mobilizedKnowledge: ["AO & Propositions", "Expertise KREDO", "Delivery & REX"],
    icon: "📄",
    status: "À venir",
  },
  {
    id: "find-rex",
    title: "Trouver un précédent comparable",
    description: "Identifier rapidement des missions similaires pour rassurer et convaincre un prospect.",
    mobilizedKnowledge: ["Delivery & REX", "Clients & Marchés"],
    icon: "📌",
    status: "À venir",
  },
  {
    id: "price-transition",
    title: "Chiffrer une transition / réversibilité",
    description: "Calculer les charges et scénarios de transition en s'appuyant sur l'historique de delivery.",
    mobilizedKnowledge: ["Delivery & REX", "Expertise KREDO"],
    icon: "⚖️",
    status: "À venir",
  },
  {
    id: "build-proposal",
    title: "Construire une proposition",
    description: "Générer une proposition commerciale à partir de blocs d'offres et d'arguments ROI validés.",
    mobilizedKnowledge: ["Expertise KREDO", "AO & Propositions"],
    icon: "🎨",
    status: "À venir",
  },
  {
    id: "account-review",
    title: "Préparer une revue de compte",
    description: "Synthétiser l'historique, les actualités et le pipeline d'un compte client stratégique.",
    mobilizedKnowledge: ["Clients & Marchés", "Delivery & REX"],
    icon: "🏢",
    status: "À venir",
  },
  {
    id: "copil-prep",
    title: "Préparer un COPIL",
    description: "Extraire les métriques de delivery et formuler les risques projets majeurs du comité.",
    mobilizedKnowledge: ["Delivery & REX", "Ressources internes"],
    icon: "👥",
    status: "À venir",
  },
  {
    id: "staffing-exit",
    title: "Remplacement ou sortie de mission",
    description: "Planifier la transition de compétences en documentant la mission pour le successeur.",
    mobilizedKnowledge: ["Talents", "Delivery & REX"],
    icon: "🔄",
    status: "À venir",
  },
  {
    id: "rh-procedure",
    title: "Préparer une procédure RH sensible",
    description: "Vérifier le cadre conventionnel et les modèles légaux applicables à une situation RH.",
    mobilizedKnowledge: ["Ressources internes", "Talents"],
    icon: "🛡️",
    status: "À venir",
  },
]

export const suggestions: string[] = [
  "Quelles sont nos références récentes sur la conformité DORA dans le secteur de l'assurance ?",
  "Qui a mené le projet de migration ERP cloud chez Robertet ?",
  "Quels sont les pain points typiques du secteur Parfumerie d'après nos retours d'expérience ?",
  "Quels consultants maîtrisent à la fois la directive REACH et le cloud Azure ?",
]

export const scopes = [
  { id: "docs", label: "Documents" },
  { id: "accounts", label: "Comptes" },
  { id: "proposals", label: "AO & Propositions" },
  { id: "talents", label: "Talents" },
  { id: "expertise", label: "Offres & Expertise" },
]
