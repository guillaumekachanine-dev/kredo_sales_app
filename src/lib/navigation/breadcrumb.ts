// ─────────────────────────────────────────────────────────────────────────────
//  Fil d'Ariane — résolveur pur (Finder/Explorer "path bar")
//
//  Modèle : LOCALISATION (hiérarchie de l'URL), pas historique de navigation.
//  Source des labels UI : main-menu.config.ts (zéro duplication). Les segments
//  dynamiques (ex. /accounts/[companyId] → nom du compte) sont résolus via un
//  registre alimenté par la page elle-même (breadcrumb-store), sans refetch.
// ─────────────────────────────────────────────────────────────────────────────

import { mainMenuItems, type MainMenuItem } from "./main-menu.config"

export type Crumb = {
  label: string
  href: string
  isCurrent: boolean
  pending?: boolean // label dynamique pas encore résolu (affiche un placeholder)
}

const ROOT: Crumb = { label: "KREDO", href: "/cockpit", isCurrent: false }

// ── Index statique href → label UI, construit une seule fois au chargement ────
//
//  La navigation secondaire Desktop (`tabs`) a été démantelée en SHELL 6.4A :
//  l'index ne contient plus que les href de groupes → modules.

const HREF_LABEL: Record<string, string> = (() => {
  const index: Record<string, string> = {}

  const addModule = (item: MainMenuItem) => {
    if (item.href) index[item.href] = item.label
  }

  for (const item of mainMenuItems) {
    addModule(item)
    if (item.items) item.items.forEach(addModule)
  }

  return index
})()

function prettify(segment: string): string {
  const decoded = decodeURIComponent(segment).replace(/[-_]/g, " ")
  return decoded.charAt(0).toUpperCase() + decoded.slice(1)
}

/**
 * Construit le fil depuis le pathname courant + le registre de labels dynamiques.
 * Toujours préfixé par KREDO (→ /cockpit). La dernière entrée est `isCurrent`.
 */
export function buildBreadcrumbTrail(
  pathname: string,
  dynamicLabels: Record<string, string>,
): Crumb[] {
  const segments = pathname.split("/").filter(Boolean)
  const crumbs: Crumb[] = []
  let prefix = ""

  for (const seg of segments) {
    prefix += "/" + seg
    if (prefix === ROOT.href) continue // KREDO représente déjà l'accueil

    const staticLabel = HREF_LABEL[prefix]
    if (staticLabel) {
      crumbs.push({ label: staticLabel, href: prefix, isCurrent: false })
      continue
    }

    // Segment dynamique : registre d'abord (clé = valeur brute du segment),
    // sinon placeholder "pending" — on n'affiche jamais l'UUID brut.
    const dyn = dynamicLabels[seg]
    crumbs.push({
      label: dyn ?? "…",
      href: prefix,
      isCurrent: false,
      pending: !dyn,
    })
  }

  const trail = [{ ...ROOT }, ...crumbs]
  trail[trail.length - 1].isCurrent = true
  return trail
}
