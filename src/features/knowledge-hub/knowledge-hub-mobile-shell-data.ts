import { DomainItem, WorkshopItem } from "./knowledge-hub.types"

export const mobileDomains: DomainItem[] = [
  {
    id: "clients-markets",
    title: "Clients & Marchés",
    subItems: ["Secteurs", "Entreprises", "Contacts", "Revues d'actualité"],
    description: "Cartographie de nos clients, prospects et actualités de l'écosystème commercial.",
    nature: "Fiches de synthèse, profils de comptes et revues d'actualités.",
    relations: ["Offres associées", "Consultants en mission", "Historique d'AO"],
  },
  {
    id: "expertise-kredo",
    title: "Expertise KREDO",
    subItems: ["Offres", "Practices", "Métiers", "Technologies"],
    description: "Référentiel des practices, savoir-faire commerciaux et technologies maîtrisées.",
    nature: "Fiches d'offres, grilles de compétences et veilles technologiques.",
    relations: ["Missions de référence", "Consultants qualifiés", "Modèles de réponse"],
  },
  {
    id: "talents",
    title: "Talents",
    subItems: ["Collaborateurs", "Anciens", "Candidats"],
    description: "Informations sur nos forces vives, notre vivier de candidats et les compétences de nos talents.",
    nature: "CVs anonymisés, profils d'expérience et compétences déclarées.",
    relations: ["Missions réalisées", "Practices", "Réponses aux AO"],
  },
  {
    id: "delivery-rex",
    title: "Delivery & REX",
    subItems: ["Missions", "transitions", "REX"],
    description: "Capitalisation des retours d'expérience et playbooks de transition opérationnelle.",
    nature: "Fiches REX, livrables types et guides méthodologiques.",
    relations: ["Clients", "Technologies", "Consultants impliqués"],
  },
  {
    id: "ao-proposals",
    title: "AO & Propositions",
    subItems: ["AO reçus", "réponses", "capitalisation"],
    description: "Mémoire commerciale de nos réponses aux appels d'offres et propositions transmises.",
    nature: "RFP reçus, réponses rédigées et bibliothèques de slides commerciales.",
    relations: ["Clients", "Offres valorisées", "Tarifs de référence"],
  },
  {
    id: "internal-resources",
    title: "Ressources internes",
    subItems: ["Annuaire", "organigramme", "modèles", "juridique"],
    description: "Annuaire des collaborateurs, organigramme KREDO et modèles administratifs.",
    nature: "Templates de documents, documents légaux et chiffres clés.",
    relations: ["Ensemble du patrimoine documentaire"],
  },
]

export const mobileWorkshops: WorkshopItem[] = [
  {
    id: "prepare-ao",
    title: "Préparer une réponse à un AO",
    description: "Analyser le cahier des charges et générer une première trame de réponse structurée.",
    mobilizedKnowledge: ["AO & Propositions", "Expertise KREDO", "Delivery & REX"],
    icon: "RFP",
    status: "À venir",
  },
  {
    id: "find-rex",
    title: "Trouver un précédent comparable",
    description: "Identifier rapidement des missions similaires pour rassurer et convaincre un prospect.",
    mobilizedKnowledge: ["Delivery & REX", "Clients & Marchés"],
    icon: "REX",
    status: "À venir",
  },
  {
    id: "price-transition",
    title: "Chiffrer une transition / réversibilité",
    description: "Calculer les charges et scénarios de transition en s'appuyant sur l'historique de delivery.",
    mobilizedKnowledge: ["Delivery & REX", "Expertise KREDO"],
    icon: "CALC",
    status: "À venir",
  },
  {
    id: "build-proposal",
    title: "Construire une proposition",
    description: "Générer une proposition commerciale à partir de blocs d'offres et d'arguments ROI validés.",
    mobilizedKnowledge: ["Expertise KREDO", "AO & Propositions"],
    icon: "DOC",
    status: "À venir",
  },
  {
    id: "account-review",
    title: "Préparer une revue de compte",
    description: "Synthétiser l'historique, les actualités et le pipeline d'un compte client stratégique.",
    mobilizedKnowledge: ["Clients & Marchés", "Delivery & REX"],
    icon: "CRM",
    status: "À venir",
  },
  {
    id: "copil-prep",
    title: "Préparer un COPIL",
    description: "Extraire les métriques de delivery et formuler les risques projets majeurs du comité.",
    mobilizedKnowledge: ["Delivery & REX", "Ressources internes"],
    icon: "MEET",
    status: "À venir",
  },
  {
    id: "staffing-exit",
    title: "Remplacement ou sortie de mission",
    description: "Planifier la transition de compétences en documentant la mission pour le successeur.",
    mobilizedKnowledge: ["Talents", "Delivery & REX"],
    icon: "EXIT",
    status: "À venir",
  },
  {
    id: "rh-procedure",
    title: "Préparer une procédure RH sensible",
    description: "Vérifier le cadre conventionnel et les modèles légaux applicables à une situation RH.",
    mobilizedKnowledge: ["Ressources internes", "Talents"],
    icon: "LAW",
    status: "À venir",
  },
]

export const mobileSuggestions: string[] = [
  "Retrouver des AO comparables",
  "Identifier des références pertinentes",
  "Comparer plusieurs réponses commerciales",
]

export const mobileScopes = [
  { id: "all", label: "Tout KREDO" },
  { id: "ao", label: "AO" },
  { id: "clients", label: "Clients" },
  { id: "talents", label: "Talents" },
  { id: "expertise", label: "Expertise" },
]
