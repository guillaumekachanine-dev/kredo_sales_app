import { AccountIntelligenceHomeTemplate } from "@/components/accounts-contacts/intelligence/home/AccountIntelligenceHomeTemplate"

const account = {
  name: "EIFFAGE",
  sector: "Construction & Cadre bâti",
  segment: "Travaux publics",
  website: "https://www.eiffage.com",
  location: "France",
  lifecycle: "Compte stratégique",
}

const facts = [
  "Construction & infrastructures",
  "Segment : Travaux publics",
  "Couverture nationale",
  "Compte suivi dans le CRM",
] as const

const metrics = [
  { value: "18", label: "contacts connus", tone: "dark" },
  { value: "4", label: "opportunités actives", tone: "light" },
  { value: "6", label: "missions suivies", tone: "light" },
  { value: "9", label: "enjeux ouverts", tone: "dark" },
] as const

const priorities = [
  {
    title: "Consolider la connaissance",
    description: "Actualiser les faits structurants, les contacts et les signaux exploitables du compte.",
    icon: "chart",
  },
  {
    title: "Qualifier les enjeux",
    description: "Faire émerger les problèmes prioritaires et les points d’entrée commercialement crédibles.",
    icon: "target",
  },
  {
    title: "Préparer l’approche",
    description: "Transformer la connaissance du compte en stratégie d’adressage et prises de parole ciblées.",
    icon: "gear",
  },
] as const

export function AccountIntelligenceTemplateLab() {
  return (
    <main data-theme="edito-bright-cockpit" className="min-h-screen bg-canvas px-6 py-10 font-sans text-edito-body">
      <div className="mx-auto w-full max-w-[1180px]">
        <AccountIntelligenceHomeTemplate
          account={account}
          facts={facts}
          metrics={metrics}
          summary="Compte pilote utilisé pour régler la géométrie du futur template Account Intelligence. Le contenu est volontairement secondaire : cette vue sert d’abord à valider le rythme, les proportions et la hiérarchie visuelle."
          priorities={priorities}
        />
      </div>
    </main>
  )
}
