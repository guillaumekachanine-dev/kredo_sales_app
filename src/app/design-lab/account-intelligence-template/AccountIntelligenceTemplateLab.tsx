import { AccountIntelligenceHomeTemplate } from "@/components/accounts-contacts/intelligence/home/AccountIntelligenceHomeTemplate"

const account = {
  name: "EIFFAGE",
  sector: "Construction & Cadre bâti",
  segment: "Travaux publics",
  website: "https://www.eiffage.com",
  location: "France",
  lifecycle: "Client stratégique",
}

const processSteps = [
  { id: "profil", label: "Profil de l’entreprise", state: "available", href: "#profil-entreprise" },
  { id: "actualites", label: "Actualités du compte", state: "available", href: "#actualites-compte" },
  { id: "secteur", label: "Contexte sectoriel", state: "available", href: "#" },
  { id: "enjeux", label: "Cartographie des enjeux", state: "partial", href: "#" },
  { id: "strategie", label: "Stratégie commerciale", state: "available", href: "#" },
  { id: "roadmap", label: "Roadmap d’adressage", state: "empty", href: "#" },
] as const

const facts = [
  { label: "Catégorie marché", value: "Leader" },
  { label: "Chiffre d’affaires", value: "23,4 Md€" },
  { label: "Modèle d’achat", value: "Mixte public / privé" },
  { label: "Priorité", value: "Haute" },
] as const

const metrics = [
  { value: "24", label: "événements commerciaux", tone: "dark" },
  { value: "7", label: "missions en cours", tone: "light" },
  { value: "18,6 M€", label: "CA réalisé", secondary: "(3/42 clients)", tone: "light" },
  { value: "9", label: "enjeux identifiés", tone: "dark" },
] as const

const toolbox = [
  {
    title: "Répertoire de contacts",
    description: "Retrouver les interlocuteurs connus, leur fonction et leur relation avec KREDO.",
    icon: "contacts",
    href: "#",
  },
  {
    title: "Bibliothèque de documents",
    description: "Accéder aux rapports, analyses et documents rattachés au compte.",
    icon: "documents",
    href: "#",
  },
  {
    title: "Playbook commercial",
    description: "Consulter les angles, messages et ressources d’adressage associés au compte.",
    icon: "playbook",
    href: "#",
  },
] as const

export function AccountIntelligenceTemplateLab() {
  return (
    <main data-theme="edito-bright-cockpit" className="min-h-screen bg-canvas px-6 py-10 font-sans text-edito-body">
      <div className="mx-auto w-full max-w-[1180px]">
        <AccountIntelligenceHomeTemplate
          account={account}
          processSteps={processSteps}
          companySummary="Eiffage est l’un des principaux groupes européens de construction et de concessions. Son positionnement repose sur une couverture intégrée des infrastructures, de l’énergie et des grands projets, avec une forte capacité à adresser des donneurs d’ordre publics comme privés."
          facts={facts}
          review={{
            title: "Revue du compte",
            subtitle: "Dernière mission Intelligence disponible",
            available: true,
            href: "#review-compte",
          }}
          metrics={metrics}
          recentSignal={{
            title: "Renforcement des investissements sur les infrastructures bas carbone",
            dateLabel: "24 août 2026",
            importanceLabel: "Importance élevée",
            implication: "Fenêtre favorable pour positionner les expertises Data, Cloud et pilotage de programmes autour de la modernisation des actifs et du suivi de performance opérationnelle.",
          }}
          watch={{ enabled: true, label: "Veille active" }}
          toolbox={toolbox}
        />
      </div>
    </main>
  )
}
