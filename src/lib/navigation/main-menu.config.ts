// ─────────────────────────────────────────────────────────────────────────────
//  Navigation — source unique de vérité
//
//  Règle : la sidebar liste les MODULES (2 niveaux : groupe → module).
//  La navigation secondaire interne d'un module (chapitres) appartient au
//  workspace concerné, via sa propre primitive `SectionRail` — jamais à ce
//  fichier (la navigation horizontale legacy a été démantelée en SHELL 6.4A).
//  La bottom nav mobile dérive des modules marqués `primary: true` ; les
//  regroupements d'onglets Mobile sont résolus explicitement par
//  `getMobileTabsForPath`.
// ─────────────────────────────────────────────────────────────────────────────

import { CONSULTANTS_SECTIONS } from "@/features/consultants/navigation/consultants-sections"

/**
 * Onglet de navigation du shell **Mobile** (bottom nav + rail contextuel).
 *
 * Concept propre au Mobile : sans rapport avec l'ancienne navigation secondaire
 * Desktop (supprimée en SHELL 6.4A) ni avec le `SectionTab` des fiches entités
 * (`src/lib/tabs/tab-types.ts`, hors périmètre).
 */
export type MobileNavigationTab = {
  label: string
  shortLabel?: string
  href: string
  disabled?: boolean
  comingSoon?: boolean
}

export type MainMenuItem = {
  label: string
  shortLabel?: string
  href?: string
  icon?: string
  disabled?: boolean
  comingSoon?: boolean
  primary?: boolean
  items?: MainMenuItem[]
}

// ─────────────────────────────────────────────────────────────────────────────
//  Utilitaires — résolution du module actif et des onglets Mobile
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retourne le href du module actif pour un pathname donné (matching le plus
 * spécifique). Utilisé par la sidebar pour éviter le double-active quand
 * un module est imbriqué sous un autre (ex. /missions/opps vs /missions).
 */
export function getActiveModuleHref(pathname: string): string | null {
  let bestHref: string | null = null
  let bestLen = -1

  for (const item of mainMenuItems) {
    if (item.href) {
      if (pathname === item.href || pathname.startsWith(item.href + "/")) {
        if (item.href.length > bestLen) {
          bestLen = item.href.length
          bestHref = item.href
        }
      }
    }
    if (item.items) {
      for (const sub of item.items) {
        if (sub.href) {
          if (pathname === sub.href || pathname.startsWith(sub.href + "/")) {
            if (sub.href.length > bestLen) {
              bestLen = sub.href.length
              bestHref = sub.href
            }
          }
        }
      }
    }
  }

  return bestHref
}

/**
 * Résout les onglets réellement navigables du shell **Mobile**.
 *
 * Chaque regroupement Mobile qui a réellement besoin d'onglets est traité
 * explicitement ci-dessous (Consultants, Opportunités/Recrutement, Engagements,
 * Rapports/Veille) et pointe vers des routes canoniques distinctes. Tout autre
 * pathname n'a pas d'onglets Mobile → `[]` (aucune source générique d'onglets
 * après le démantèlement de la navigation horizontale Desktop, SHELL 6.4A).
 */
export function getMobileTabsForPath(pathname: string): MobileNavigationTab[] {
  if (pathname === "/consultants" || pathname.startsWith("/consultants/") || pathname.startsWith("/consultants?")) {
    return CONSULTANTS_SECTIONS.map((section) => ({
      label: section.label,
      href: section.href,
    }))
  }

  if (pathname.startsWith("/missions/opps") || pathname.startsWith("/recruitment")) {
    return [
      { label: "Besoins & Staffing", shortLabel: "Besoins", href: "/missions/opps?section=besoins" },
      { label: "Recrutement", shortLabel: "Recrutement", href: "/consultants?section=candidats" },
    ]
  }

  // Engagements sur Mobile : le shell unique vit sur /missions et pilote ses
  // vues par `?vue=` (les routes /missions/actives · /projets redirigent vers
  // leurs vues canoniques — SHELL-0018 Lot 6.3).
  if (pathname === "/missions" || pathname.startsWith("/missions/actives") || pathname.startsWith("/missions/projets")) {
    return [
      { label: "Synthèse", shortLabel: "Synthèse", href: "/missions" },
      { label: "Missions", shortLabel: "Missions", href: "/missions?vue=missions-at" },
      { label: "Projets", shortLabel: "Projets", href: "/missions?vue=projets" },
    ]
  }

  if (pathname.startsWith("/reports") || pathname.startsWith("/veille")) {
    return [
      { label: "Rapports & Rédaction", shortLabel: "Rapports", href: "/reports" },
      { label: "Veille & Actualités", shortLabel: "Veille", href: "/veille" },
    ]
  }

  return []
}

// ─────────────────────────────────────────────────────────────────────────────
//  Menu principal
// ─────────────────────────────────────────────────────────────────────────────

//  Taxonomie cible SHELL 6.4B (document 09-TARGET-NAVIGATION-ARCHITECTURE-2026-09-09) :
//  premier niveau = Accueil · Agenda · CRM · Intelligence · Outils.
//  Le Bac à sable reste hors de cette liste (zone dédiée de DesktopSidebar).
export const mainMenuItems: MainMenuItem[] = [
  // ── Général ─────────────────────────────────────────────────────────────
  {
    label: "Accueil",
    href: "/cockpit",
    icon: "home",
    primary: true,
  },
  {
    label: "Agenda",
    href: "/agenda",
    icon: "calendar",
  },

  // ── CRM ─────────────────────────────────────────────────────────────────
  {
    label: "CRM",
    items: [
      {
        label: "Comptes & Contacts",
        shortLabel: "CRM",
        href: "/prospection/accounts",
        icon: "crm",
        primary: true,
      },
      {
        label: "Opportunités",
        shortLabel: "Opportunités",
        href: "/missions/opps",
        icon: "staffing",
        primary: true,
      },
      {
        label: "Engagements",
        shortLabel: "Missions",
        href: "/missions",
        icon: "engagements",
      },
      {
        label: "Consultants",
        shortLabel: "Consultants",
        href: "/consultants",
        icon: "equipe",
      },
      {
        label: "Finance",
        href: "/finance",
        icon: "finance",
        primary: true,
      },
    ],
  },

  // ── Intelligence ────────────────────────────────────────────────────────
  {
    label: "Intelligence",
    items: [
      {
        label: "Business Intelligence",
        shortLabel: "BI",
        href: "/intelligence",
        icon: "bi",
      },
      {
        label: "Prospection",
        shortLabel: "Prospection",
        href: "/prospection-intelligence",
        icon: "prospection",
      },
      {
        label: "Rapports & Rédaction",
        shortLabel: "Rapports",
        href: "/reports",
        icon: "reports",
      },
      {
        label: "Veille & Actualités",
        shortLabel: "Veille",
        href: "/veille",
        icon: "veille",
      },
    ],
  },

  // ── Outils ──────────────────────────────────────────────────────────────
  {
    label: "Outils",
    items: [
      {
        label: "Knowledge Hub",
        href: "/knowledge",
        icon: "knowledge",
      },
      {
        label: "Automatisations",
        href: "/automations",
        icon: "automations",
      },
      {
        label: "Paramètres",
        href: "/settings",
        icon: "settings",
      },
    ],
  },
]
