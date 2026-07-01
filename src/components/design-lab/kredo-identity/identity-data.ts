export type DirectionId = "a" | "b" | "c"
export type ViewportMode = "desktop" | "mobile"
export type DomainId =
  | "need"
  | "candidate"
  | "collaborator"
  | "account"
  | "recruitment"
  | "missionAt"
  | "fixedProject"
  | "finance"
  | "intelligence"
  | "ai"

export type InteractionState = "rest" | "hover" | "selected" | "active" | "disabled"

export type TokenFamily =
  | "Identite"
  | "Surfaces"
  | "Texte"
  | "Statuts"
  | "Domaines"
  | "Dataviz"
  | "IA"
  | "Interaction"

export type ColorToken = {
  name: string
  cssVar: string
  hex: string
  family: TokenFamily
  role: string
  foreground: string
  contrast: string
  maxSurface: string
}

export type Direction = {
  id: DirectionId
  slug: string
  concept: "a" | "b" | "c"
  name: string
  shortName: string
  intention: string
  thesis: string
  surfaceLanguage: string
  motionLanguage: string
  integrationCost: string
  preserved: string[]
  abandoned: string[]
  principles: string[]
  tokens: ColorToken[]
}

export type Domain = {
  id: DomainId
  label: string
  token: string
  shortLabel: string
}

export const domains: Domain[] = [
  { id: "need", label: "Besoins", shortLabel: "Besoin", token: "--color-domain-need" },
  { id: "candidate", label: "Candidats", shortLabel: "Candidat", token: "--color-domain-candidate" },
  { id: "collaborator", label: "Collaborateurs", shortLabel: "Collab.", token: "--color-domain-collaborator" },
  { id: "account", label: "Comptes & contacts", shortLabel: "CRM", token: "--color-domain-account" },
  { id: "recruitment", label: "Recrutement", shortLabel: "Recrut.", token: "--color-domain-recruitment" },
  { id: "missionAt", label: "Missions AT", shortLabel: "AT", token: "--color-domain-mission-at" },
  { id: "fixedProject", label: "Projets forfaitaires", shortLabel: "Forfait", token: "--color-domain-fixed-project" },
  { id: "finance", label: "Finance", shortLabel: "Finance", token: "--color-domain-finance" },
  { id: "intelligence", label: "Cockpit Intelligence", shortLabel: "Cockpit", token: "--color-domain-intelligence" },
  { id: "ai", label: "Fonctions IA", shortLabel: "IA", token: "--color-domain-ai" },
]

export const interactionStates: { id: InteractionState; label: string }[] = [
  { id: "rest", label: "Repos" },
  { id: "hover", label: "Hover" },
  { id: "selected", label: "Selection" },
  { id: "active", label: "Actif" },
  { id: "disabled", label: "Disabled" },
]

export const directions: Direction[] = [
  {
    id: "a",
    slug: "direction-a",
    concept: "a",
    name: "Cobalt Stratifié",
    shortName: "A",
    intention: "Approfondir Cobalt Franc avec plus de relief, de rails métier et une IA plus précieuse.",
    thesis: "Cobalt profond, laiton net, surfaces papier chaud et lignes de lecture très disciplinées.",
    surfaceLanguage: "Surfaces claires, panneaux denses, rails verticaux colorés et relief limité aux éléments actionnables.",
    motionLanguage: "Micro-lift de 2px, bordure qui se densifie, drawers rapides et signaux IA par anneau prismatique rare.",
    integrationCost: "Faible a moyen: prolonge les tokens existants et demande surtout une clarification semantique.",
    preserved: ["Cobalt", "navy de navigation", "brass", "surfaces chaudes", "flat design"],
    abandoned: ["categorie = statut", "IA arc-en-ciel permanente", "rayons incoherents"],
    principles: [
      "Le cobalt reste la signature de marque, pas la couleur de tous les modules.",
      "Chaque domaine recoit un rail ou un marqueur, jamais un aplat massif.",
      "Les statuts gardent leur propre famille fonctionnelle.",
    ],
    tokens: [
      { name: "Cobalt directeur", cssVar: "--color-brand-core", hex: "#244FB3", family: "Identite", role: "Marque, CTA primaire, selection forte", foreground: "#F8FAFF", contrast: "7.1:1", maxSurface: "20%" },
      { name: "Navy conseil", cssVar: "--color-brand-navy", hex: "#13244B", family: "Identite", role: "Navigation, encre inverse, headers analytiques", foreground: "#F8FAFF", contrast: "13.2:1", maxSurface: "30%" },
      { name: "Brass franc", cssVar: "--color-brand-brass", hex: "#C99A2E", family: "Identite", role: "Accent premium, benchmark, focus rare", foreground: "#211700", contrast: "7.0:1", maxSurface: "8%" },
      { name: "Canvas lin", cssVar: "--color-surface-canvas", hex: "#F4F1EA", family: "Surfaces", role: "Fond general chaud", foreground: "#18223A", contrast: "13.1:1", maxSurface: "100%" },
      { name: "Surface ivoire", cssVar: "--color-surface-base", hex: "#FFFDF8", family: "Surfaces", role: "Cartes et panneaux", foreground: "#18223A", contrast: "14.0:1", maxSurface: "80%" },
      { name: "Bord graphite", cssVar: "--color-border-default", hex: "#D8DFEA", family: "Texte", role: "Bordures et separations", foreground: "#18223A", contrast: "10.8:1", maxSurface: "100%" },
      { name: "Succes foret", cssVar: "--color-status-success", hex: "#287657", family: "Statuts", role: "Validation et variation positive", foreground: "#FFFFFF", contrast: "5.5:1", maxSurface: "12%" },
      { name: "Warning ocre", cssVar: "--color-status-warning", hex: "#B57B18", family: "Statuts", role: "Attention non bloquante", foreground: "#211700", contrast: "5.1:1", maxSurface: "10%" },
      { name: "Danger brique", cssVar: "--color-status-danger", hex: "#B64242", family: "Statuts", role: "Erreur, risque fort, retard critique", foreground: "#FFFFFF", contrast: "5.1:1", maxSurface: "8%" },
      { name: "Besoin ambre", cssVar: "--color-domain-need", hex: "#E5A600", family: "Domaines", role: "Besoins et opportunites a staffer", foreground: "#231700", contrast: "8.3:1", maxSurface: "10%" },
      { name: "Candidat pourpre", cssVar: "--color-domain-candidate", hex: "#8E3FA7", family: "Domaines", role: "Candidats", foreground: "#FFFFFF", contrast: "5.9:1", maxSurface: "10%" },
      { name: "Collaborateur sauge", cssVar: "--color-domain-collaborator", hex: "#5F8750", family: "Domaines", role: "Collaborateurs et equipe", foreground: "#FFFFFF", contrast: "4.7:1", maxSurface: "12%" },
      { name: "Compte cyan petrol", cssVar: "--color-domain-account", hex: "#247B8D", family: "Domaines", role: "Comptes et contacts", foreground: "#FFFFFF", contrast: "4.8:1", maxSurface: "12%" },
      { name: "Recrutement magenta froid", cssVar: "--color-domain-recruitment", hex: "#A33C78", family: "Domaines", role: "Recrutement", foreground: "#FFFFFF", contrast: "5.4:1", maxSurface: "10%" },
      { name: "Mission AT bleu acier", cssVar: "--color-domain-mission-at", hex: "#3F6FA7", family: "Domaines", role: "Assistance technique", foreground: "#FFFFFF", contrast: "5.1:1", maxSurface: "12%" },
      { name: "Forfait indigo", cssVar: "--color-domain-fixed-project", hex: "#5A58A8", family: "Domaines", role: "Projets forfaitaires", foreground: "#FFFFFF", contrast: "5.8:1", maxSurface: "10%" },
      { name: "Finance olive", cssVar: "--color-domain-finance", hex: "#6B7D2F", family: "Domaines", role: "Finance et marge", foreground: "#FFFFFF", contrast: "4.9:1", maxSurface: "10%" },
      { name: "Intelligence cobalt nuit", cssVar: "--color-domain-intelligence", hex: "#173D89", family: "IA", role: "Cockpit Intelligence immersif", foreground: "#F8FAFF", contrast: "9.4:1", maxSurface: "35%" },
      { name: "AI prisme", cssVar: "--color-domain-ai", hex: "#6B5CF6", family: "IA", role: "Fonction assistee IA", foreground: "#FFFFFF", contrast: "5.5:1", maxSurface: "8%" },
      { name: "Dataviz ciel", cssVar: "--color-dataviz-1", hex: "#4F8DD9", family: "Dataviz", role: "Serie 1", foreground: "#FFFFFF", contrast: "3.6:1 decorative", maxSurface: "18%" },
    ],
  },
  {
    id: "b",
    slug: "direction-b",
    concept: "b",
    name: "Atelier Clair",
    shortName: "B",
    intention: "Rendre KREDO plus editorial, lumineux et lisible, avec la couleur comme systeme de classement.",
    thesis: "Blanc chaud, encre precise, accents mineralises et composants plus ouverts, presque dossier de direction.",
    surfaceLanguage: "Peu de cartes, beaucoup de bandes, tableaux a faible chrome, panneaux lateraux en verre mat leger.",
    motionLanguage: "Transitions de surface, underline qui glisse, apparition progressive des details sans rebond.",
    integrationCost: "Moyen: lisible et maintenable, mais demande de revoir la densite de plusieurs pages.",
    preserved: ["surfaces claires", "professionnalisme", "densite desktop", "tap targets mobile"],
    abandoned: ["navy omnipresent", "fonds de carte trop systematiques", "effets IA multicolores"],
    principles: [
      "La hierarchie se fait par typographie, alignement et separations longues.",
      "Les domaines utilisent des encres sourdes distinctes plutot que des badges criards.",
      "Le cockpit IA reste clair mais recoit un halo technique localise.",
    ],
    tokens: [
      { name: "Encre directoire", cssVar: "--color-brand-core", hex: "#20304F", family: "Identite", role: "Titres, nav sobre, CTA texte", foreground: "#FFFFFF", contrast: "12.2:1", maxSurface: "25%" },
      { name: "Bleu archive", cssVar: "--color-brand-navy", hex: "#315C9C", family: "Identite", role: "Marque secondaire et liens", foreground: "#FFFFFF", contrast: "6.2:1", maxSurface: "16%" },
      { name: "Cuivre doux", cssVar: "--color-brand-brass", hex: "#B8844A", family: "Identite", role: "Accent premium et selection chaude", foreground: "#1F160D", contrast: "5.6:1", maxSurface: "8%" },
      { name: "Canvas papier", cssVar: "--color-surface-canvas", hex: "#F7F4EF", family: "Surfaces", role: "Fond general editorial", foreground: "#1B2435", contrast: "13.7:1", maxSurface: "100%" },
      { name: "Surface porcelaine", cssVar: "--color-surface-base", hex: "#FFFFFF", family: "Surfaces", role: "Panneaux ouverts et tableaux", foreground: "#1B2435", contrast: "15.1:1", maxSurface: "90%" },
      { name: "Bord lin", cssVar: "--color-border-default", hex: "#DED8CE", family: "Texte", role: "Separations longues", foreground: "#1B2435", contrast: "10.9:1", maxSurface: "100%" },
      { name: "Succes pin", cssVar: "--color-status-success", hex: "#2E7251", family: "Statuts", role: "Validation", foreground: "#FFFFFF", contrast: "5.8:1", maxSurface: "10%" },
      { name: "Warning safran", cssVar: "--color-status-warning", hex: "#A9711A", family: "Statuts", role: "Surveillance", foreground: "#FFFFFF", contrast: "4.9:1", maxSurface: "8%" },
      { name: "Danger garance", cssVar: "--color-status-danger", hex: "#A94040", family: "Statuts", role: "Erreur et risque", foreground: "#FFFFFF", contrast: "5.7:1", maxSurface: "8%" },
      { name: "Besoin moutarde", cssVar: "--color-domain-need", hex: "#D19513", family: "Domaines", role: "Besoins", foreground: "#211700", contrast: "6.8:1", maxSurface: "10%" },
      { name: "Candidat prune", cssVar: "--color-domain-candidate", hex: "#7C4D8D", family: "Domaines", role: "Candidats", foreground: "#FFFFFF", contrast: "5.8:1", maxSurface: "10%" },
      { name: "Collaborateur eucalyptus", cssVar: "--color-domain-collaborator", hex: "#4F8064", family: "Domaines", role: "Collaborateurs", foreground: "#FFFFFF", contrast: "4.8:1", maxSurface: "12%" },
      { name: "Compte bleu gris", cssVar: "--color-domain-account", hex: "#4E7F9B", family: "Domaines", role: "CRM", foreground: "#FFFFFF", contrast: "4.5:1", maxSurface: "12%" },
      { name: "Recrutement rose fumee", cssVar: "--color-domain-recruitment", hex: "#A85A73", family: "Domaines", role: "Recrutement", foreground: "#FFFFFF", contrast: "4.7:1", maxSurface: "10%" },
      { name: "Mission AT denim", cssVar: "--color-domain-mission-at", hex: "#456F9C", family: "Domaines", role: "Missions AT", foreground: "#FFFFFF", contrast: "5.4:1", maxSurface: "12%" },
      { name: "Forfait ardoise violette", cssVar: "--color-domain-fixed-project", hex: "#62609B", family: "Domaines", role: "Projets forfaitaires", foreground: "#FFFFFF", contrast: "5.0:1", maxSurface: "10%" },
      { name: "Finance lichen", cssVar: "--color-domain-finance", hex: "#727C3A", family: "Domaines", role: "Finance", foreground: "#FFFFFF", contrast: "4.8:1", maxSurface: "10%" },
      { name: "Intelligence horizon", cssVar: "--color-domain-intelligence", hex: "#2F5F8F", family: "IA", role: "Cockpit IA clair", foreground: "#FFFFFF", contrast: "6.6:1", maxSurface: "20%" },
      { name: "AI laser froid", cssVar: "--color-domain-ai", hex: "#4E63D9", family: "IA", role: "Actions assistees", foreground: "#FFFFFF", contrast: "5.3:1", maxSurface: "6%" },
      { name: "Dataviz terracotta", cssVar: "--color-dataviz-1", hex: "#C4694A", family: "Dataviz", role: "Serie chaude", foreground: "#FFFFFF", contrast: "4.2:1 decorative", maxSurface: "14%" },
    ],
  },
  {
    id: "c",
    slug: "direction-c",
    concept: "c",
    name: "Signal Room",
    shortName: "C",
    intention: "Transformer KREDO en poste de pilotage premium, plus contraste, plus signal, plus IA.",
    thesis: "Salle d'analyse sombre, surfaces graphite, domaines lumineux et IA comme signal exceptionnel.",
    surfaceLanguage: "Fond sombre, panneaux compacts, bordures lumineuses fines, chiffres hero et modules par bandes.",
    motionLanguage: "Scanline discret a l'entree, selection par rail lumineux, drawers avec profondeur plus marquee.",
    integrationCost: "Eleve: forte personnalite, necessite une vraie strategie dark/light et plus de tests de contraste.",
    preserved: ["cobalt", "cockpit immersif", "couleurs de domaines amorcees", "densite B2B"],
    abandoned: ["surface chaude dominante", "flat strict partout", "navigation monochrome prudente"],
    principles: [
      "Le sombre est reserve aux vues cockpit et aux espaces analytiques, pas aux formulaires longs.",
      "Les domaines sont tres distincts mais limites a rails, jauges et accents.",
      "L'IA a un langage propre: lumiere, confiance, generation, resultat.",
    ],
    tokens: [
      { name: "Cobalt electrique", cssVar: "--color-brand-core", hex: "#3D6DF2", family: "Identite", role: "CTA primaire et selection", foreground: "#FFFFFF", contrast: "4.7:1", maxSurface: "15%" },
      { name: "Nuit operational", cssVar: "--color-brand-navy", hex: "#081322", family: "Identite", role: "Canvas sombre", foreground: "#EAF1FF", contrast: "16.1:1", maxSurface: "100%" },
      { name: "Alliage or", cssVar: "--color-brand-brass", hex: "#E3B94A", family: "Identite", role: "Accent premium sur sombre", foreground: "#171000", contrast: "9.4:1", maxSurface: "8%" },
      { name: "Canvas graphite", cssVar: "--color-surface-canvas", hex: "#0D1726", family: "Surfaces", role: "Fond cockpit", foreground: "#EAF1FF", contrast: "14.3:1", maxSurface: "100%" },
      { name: "Surface carbone", cssVar: "--color-surface-base", hex: "#111D2F", family: "Surfaces", role: "Panneaux sombres", foreground: "#EAF1FF", contrast: "12.8:1", maxSurface: "85%" },
      { name: "Bord phosphore", cssVar: "--color-border-default", hex: "#263854", family: "Texte", role: "Separations sur sombre", foreground: "#EAF1FF", contrast: "8.8:1", maxSurface: "100%" },
      { name: "Succes neon foret", cssVar: "--color-status-success", hex: "#42B883", family: "Statuts", role: "Validation", foreground: "#06120C", contrast: "8.1:1", maxSurface: "10%" },
      { name: "Warning ion", cssVar: "--color-status-warning", hex: "#F1B642", family: "Statuts", role: "Attention", foreground: "#171000", contrast: "8.7:1", maxSurface: "8%" },
      { name: "Danger plasma", cssVar: "--color-status-danger", hex: "#F15C64", family: "Statuts", role: "Erreur et risque", foreground: "#160305", contrast: "5.9:1", maxSurface: "8%" },
      { name: "Besoin sodium", cssVar: "--color-domain-need", hex: "#F2B33D", family: "Domaines", role: "Besoins", foreground: "#171000", contrast: "8.6:1", maxSurface: "10%" },
      { name: "Candidat violet signal", cssVar: "--color-domain-candidate", hex: "#B06CFF", family: "Domaines", role: "Candidats", foreground: "#13051F", contrast: "6.8:1", maxSurface: "9%" },
      { name: "Collaborateur menthe", cssVar: "--color-domain-collaborator", hex: "#58CFA2", family: "Domaines", role: "Collaborateurs", foreground: "#06120C", contrast: "9.8:1", maxSurface: "10%" },
      { name: "Compte cyan radar", cssVar: "--color-domain-account", hex: "#3CC7D6", family: "Domaines", role: "CRM", foreground: "#031316", contrast: "10.1:1", maxSurface: "10%" },
      { name: "Recrutement rose ion", cssVar: "--color-domain-recruitment", hex: "#FF7DA8", family: "Domaines", role: "Recrutement", foreground: "#18040C", contrast: "7.3:1", maxSurface: "8%" },
      { name: "Mission AT azur", cssVar: "--color-domain-mission-at", hex: "#63A4FF", family: "Domaines", role: "Missions AT", foreground: "#041024", contrast: "7.3:1", maxSurface: "10%" },
      { name: "Forfait pervenche", cssVar: "--color-domain-fixed-project", hex: "#8D8BFF", family: "Domaines", role: "Projets forfaitaires", foreground: "#08072A", contrast: "6.7:1", maxSurface: "9%" },
      { name: "Finance lime sourd", cssVar: "--color-domain-finance", hex: "#B9D85A", family: "Domaines", role: "Finance", foreground: "#101702", contrast: "10.4:1", maxSurface: "8%" },
      { name: "Intelligence ultraviolet", cssVar: "--color-domain-intelligence", hex: "#6F7DFF", family: "IA", role: "Cockpit Intelligence", foreground: "#FFFFFF", contrast: "4.4:1 large text", maxSurface: "20%" },
      { name: "AI fusion", cssVar: "--color-domain-ai", hex: "#39D9F2", family: "IA", role: "Generation et signaux IA", foreground: "#031316", contrast: "11.2:1", maxSurface: "8%" },
      { name: "Dataviz laser", cssVar: "--color-dataviz-1", hex: "#FFB86B", family: "Dataviz", role: "Serie accent", foreground: "#171000", contrast: "8.7:1", maxSurface: "12%" },
    ],
  },
]

export function getDirectionById(id: DirectionId) {
  return directions.find((direction) => direction.id === id) ?? directions[0]
}

export function getDirectionBySlug(slug?: string) {
  return directions.find((direction) => direction.slug === slug) ?? directions[0]
}

export const cockpitSignals = [
  { label: "Marge projetee", value: "32.4%", delta: "+3.1 pts", tone: "positive" },
  { label: "Risque staffing", value: "7", delta: "2 critiques", tone: "warning" },
  { label: "Confiance IA", value: "91%", delta: "source CRM + CRA", tone: "info" },
]

export const crmRows = [
  { account: "Neom Factory", owner: "Claire M.", score: "4.7", signal: "Budget cloud ouvert", stage: "Client actif", amount: "420 kEUR" },
  { account: "BPMed", owner: "Guillaume K.", score: "4.4", signal: "Renouvellement data", stage: "Prospect", amount: "180 kEUR" },
  { account: "Sodial Next", owner: "Amine B.", score: "3.9", signal: "Contact DSI chaud", stage: "Cible", amount: "95 kEUR" },
  { account: "CNRS OCA", owner: "Lea P.", score: "3.6", signal: "Appel a projet", stage: "Partenaire", amount: "75 kEUR" },
]

export const talentItems = [
  { domain: "need", label: "Besoin", title: "Lead Data Platform", meta: "Neom Factory - demarrage 15 j", status: "A staffer", score: "92%" },
  { domain: "candidate", label: "Candidat", title: "Sarah Benali", meta: "Data engineer - 6 ans", status: "Entretien tech", score: "88%" },
  { domain: "collaborator", label: "Collaborateur", title: "Hugo Martin", meta: "Disponible dans 24 j", status: "Transition", score: "76%" },
  { domain: "missionAt", label: "Mission AT", title: "Cloud FinOps", meta: "BPMed - TJM 720 EUR", status: "Active", score: "31%" },
  { domain: "fixedProject", label: "Forfait", title: "Portail RH IA", meta: "Lot 2 - recette", status: "En derive", score: "64%" },
  { domain: "recruitment", label: "Recrutement", title: "DevOps Senior", meta: "Pipeline 12 candidats", status: "Priorite", score: "5" },
]

export const financeBars = [
  { month: "Jan", value: 42, forecast: 36 },
  { month: "Fev", value: 56, forecast: 44 },
  { month: "Mar", value: 48, forecast: 52 },
  { month: "Avr", value: 68, forecast: 57 },
  { month: "Mai", value: 74, forecast: 62 },
  { month: "Juin", value: 61, forecast: 69 },
]
