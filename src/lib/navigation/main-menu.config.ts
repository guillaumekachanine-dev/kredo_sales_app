export type MainMenuItem = {
  label: string
  href?: string
  icon?: string
  disabled?: boolean
  comingSoon?: boolean
  items?: MainMenuItem[]
}

export const mainMenuItems: MainMenuItem[] = [
  {
    label: "Cockpit",
    href: "/cockpit",
    icon: "cockpit"
  },
  {
    label: "Business",
    items: [
      {
        label: "Sales",
        href: "/sales",
        icon: "sales"
      },
      {
        label: "Prospection Intel",
        href: "/prospection",
        icon: "prospection"
      },
      {
        label: "Proposal Intel",
        href: "/proposals",
        icon: "proposal"
      }
    ]
  },
  {
    label: "Ressources",
    items: [
      {
        label: "Staffing",
        href: "/staffing",
        icon: "staffing",
        comingSoon: true
      },
      {
        label: "Consultants",
        href: "/consultants",
        icon: "consultants",
        comingSoon: true
      },
      {
        label: "Recrutement",
        href: "/recrutement",
        icon: "recrutement",
        comingSoon: true
      }
    ]
  },
  {
    label: "Pilotage",
    items: [
      {
        label: "Finance",
        href: "/finance",
        icon: "finance"
      },
      {
        label: "Knowledge Hub",
        href: "/knowledge",
        icon: "knowledge"
      },
      {
        label: "Automations",
        href: "/automations",
        icon: "automations"
      }
    ]
  },
  {
    label: "Paramètres",
    href: "/settings",
    icon: "settings",
    disabled: true
  }
]
