import type { TabKey } from "./intelligence-process"

export type ClientIntelligenceDesktopTabKey = Exclude<TabKey, "actualite">

export const CLIENT_INTELLIGENCE_NAV_ITEMS: ReadonlyArray<{
  key: ClientIntelligenceDesktopTabKey
  label: string
  icon: "home" | "company" | "sector" | "issues" | "strategy" | "roadmap"
}> = [
  { key: "accueil", label: "Accueil", icon: "home" },
  { key: "connaissance", label: "Entreprise", icon: "company" },
  { key: "secteur", label: "Secteur", icon: "sector" },
  { key: "enjeux", label: "Enjeux", icon: "issues" },
  { key: "strategie", label: "Stratégie", icon: "strategy" },
  { key: "roadmap", label: "Roadmap", icon: "roadmap" },
] as const

interface SearchParamsSnapshot {
  toString(): string
}

export interface EmbeddedAccountIntelligenceNavigationState {
  activePanelId: string
  sections: Readonly<Record<string, ClientIntelligenceDesktopTabKey>>
  pending: {
    panelId: string
    section: ClientIntelligenceDesktopTabKey
  } | null
}

export type EmbeddedAccountIntelligenceNavigationAction =
  | { type: "activate"; panelId: string; section: ClientIntelligenceDesktopTabKey }
  | { type: "navigate"; panelId: string; section: ClientIntelligenceDesktopTabKey }
  | { type: "urlChanged"; panelId: string; section: ClientIntelligenceDesktopTabKey }

export function parseAccountIntelligenceSection(
  value: string | null | undefined,
): ClientIntelligenceDesktopTabKey {
  return CLIENT_INTELLIGENCE_NAV_ITEMS.some((item) => item.key === value)
    ? value as ClientIntelligenceDesktopTabKey
    : "accueil"
}

export function buildAccountIntelligenceHref(
  pathname: string,
  searchParams: SearchParamsSnapshot,
  section: ClientIntelligenceDesktopTabKey,
): string {
  const nextSearchParams = new URLSearchParams(searchParams.toString())

  if (section === "accueil") {
    nextSearchParams.delete("aiSection")
  } else {
    nextSearchParams.set("aiSection", section)
  }

  const query = nextSearchParams.toString()
  return query ? `${pathname}?${query}` : pathname
}

export function createEmbeddedAccountIntelligenceNavigationState(
  activePanelId: string,
  section: ClientIntelligenceDesktopTabKey,
): EmbeddedAccountIntelligenceNavigationState {
  return {
    activePanelId,
    sections: activePanelId === "home" ? {} : { [activePanelId]: section },
    pending: null,
  }
}

export function getRememberedAccountIntelligenceSection(
  state: EmbeddedAccountIntelligenceNavigationState,
  panelId: string,
): ClientIntelligenceDesktopTabKey {
  return state.sections[panelId] ?? "accueil"
}

export function getDisplayedAccountIntelligenceSection(
  state: EmbeddedAccountIntelligenceNavigationState,
  panelId: string,
  activePanelId: string,
  urlSection: ClientIntelligenceDesktopTabKey,
): ClientIntelligenceDesktopTabKey {
  if (panelId !== activePanelId) {
    return getRememberedAccountIntelligenceSection(state, panelId)
  }

  if (state.activePanelId !== activePanelId) {
    return getRememberedAccountIntelligenceSection(state, panelId)
  }

  if (state.pending?.panelId === panelId) {
    return state.pending.section
  }

  return urlSection
}

export function embeddedAccountIntelligenceNavigationReducer(
  state: EmbeddedAccountIntelligenceNavigationState,
  action: EmbeddedAccountIntelligenceNavigationAction,
): EmbeddedAccountIntelligenceNavigationState {
  if (action.type === "activate") {
    return {
      activePanelId: action.panelId,
      sections: action.panelId === "home"
        ? state.sections
        : { ...state.sections, [action.panelId]: action.section },
      pending: action.panelId === "home"
        ? null
        : { panelId: action.panelId, section: action.section },
    }
  }

  if (action.panelId !== state.activePanelId) return state

  if (action.type === "navigate") {
    return {
      ...state,
      sections: { ...state.sections, [action.panelId]: action.section },
      pending: { panelId: action.panelId, section: action.section },
    }
  }

  if (state.pending && state.pending.section !== action.section) return state

  if (
    state.pending === null
    && state.sections[action.panelId] === action.section
  ) {
    return state
  }

  return {
    ...state,
    sections: { ...state.sections, [action.panelId]: action.section },
    pending: null,
  }
}
