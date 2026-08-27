// ─────────────────────────────────────────────────────────────────────────────
//  Mobile Navigation History — Moteur pur et contrats de snapshots UI
//
//  Gère la pile de checkpoints de navigation mobile avec restauration d'état
//  UI exact (URL, search params, scroll, shell, overlays).
//  Pur : 0 dépendance DOM directe dans les fonctions de transition de state.
// ─────────────────────────────────────────────────────────────────────────────

export const MOBILE_NAV_HISTORY_VERSION = 1 as const
export const KREDO_MOBILE_NAV_KEY = "__kredoMobileNavigation" as const

export type MobileNavigationSnapshot = {
  version: typeof MOBILE_NAV_HISTORY_VERSION
  id: string
  url: string
  pathname: string
  searchParams?: Record<string, string>
  timestamp: number

  scroll?: {
    main: number
  }

  shell?: {
    menuOpen: boolean
    railOpen: boolean
    expandedMenuId?: string | null
  }

  overlays?: {
    crmLauncher?: {
      open: boolean
      mode?: "recent" | "clients" | "targets" | "search"
      searchQuery?: string
    }
    crmDrawer?: {
      kind: "company" | "contact"
      id: string
    } | null
  }

  pageState?: Record<string, unknown>
}

export interface MobileHistoryEntry {
  id: string
  url: string
  pathname: string
  snapshot: MobileNavigationSnapshot
}

export interface MobileHistoryState {
  entries: MobileHistoryEntry[]
  currentIndex: number
}

/**
 * Génère un identifiant unique de checkpoint
 */
export function createCheckpointId(): string {
  return `cp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

/**
 * Décompose une URL en pathname et dictionnaire de search params
 */
export function parseUrlComponents(url: string): {
  pathname: string
  searchParams: Record<string, string>
} {
  try {
    const parsed = new URL(url, "http://localhost")
    const searchParams: Record<string, string> = {}
    parsed.searchParams.forEach((value, key) => {
      searchParams[key] = value
    })
    return {
      pathname: parsed.pathname,
      searchParams,
    }
  } catch {
    const [pathOnly, searchOnly] = url.split("?")
    const searchParams: Record<string, string> = {}
    if (searchOnly) {
      const pairs = searchOnly.split("&")
      for (const pair of pairs) {
        const [k, v] = pair.split("=")
        if (k) searchParams[decodeURIComponent(k)] = decodeURIComponent(v || "")
      }
    }
    return {
      pathname: pathOnly || "/",
      searchParams,
    }
  }
}

/**
 * Crée un snapshot initial ou par défaut pour une URL donnée
 */
export function createSnapshot(params: {
  id?: string
  url: string
  scroll?: { main: number }
  shell?: { menuOpen: boolean; railOpen: boolean; expandedMenuId?: string | null }
  overlays?: MobileNavigationSnapshot["overlays"]
  pageState?: Record<string, unknown>
}): MobileNavigationSnapshot {
  const { pathname, searchParams } = parseUrlComponents(params.url)
  return {
    version: MOBILE_NAV_HISTORY_VERSION,
    id: params.id ?? createCheckpointId(),
    url: params.url,
    pathname,
    searchParams: Object.keys(searchParams).length > 0 ? searchParams : undefined,
    timestamp: Date.now(),
    scroll: params.scroll,
    shell: params.shell,
    overlays: params.overlays,
    pageState: params.pageState,
  }
}

/**
 * Initialise l'état de l'historique mobile avec un premier snapshot
 */
export function createInitialMobileHistoryState(
  initialSnapshot: MobileNavigationSnapshot,
): MobileHistoryState {
  return {
    entries: [
      {
        id: initialSnapshot.id,
        url: initialSnapshot.url,
        pathname: initialSnapshot.pathname,
        snapshot: initialSnapshot,
      },
    ],
    currentIndex: 0,
  }
}

/**
 * Indique si un retour arrière est disponible
 */
export function canGoBack(state: MobileHistoryState): boolean {
  return state.currentIndex > 0
}

/**
 * Indique si une navigation avant est disponible
 */
export function canGoForward(state: MobileHistoryState): boolean {
  return state.currentIndex < state.entries.length - 1
}

/**
 * Enregistre une nouvelle transition de navigation.
 * Si l'URL est la même que le checkpoint courant, met simplement à jour le snapshot courant.
 * Si l'URL est différente, tronque la branche forward devenue obsolète et ajoute le nouveau checkpoint.
 */
export function recordMobileNavigation(
  state: MobileHistoryState,
  currentDepartureSnapshot: MobileNavigationSnapshot,
  nextArrivalSnapshot: MobileNavigationSnapshot,
): MobileHistoryState {
  if (state.entries.length === 0) {
    return createInitialMobileHistoryState(nextArrivalSnapshot)
  }

  const currentEntry = state.entries[state.currentIndex]
  const updatedEntries = [...state.entries]

  // Mettre à jour le snapshot du point de départ
  if (currentEntry) {
    updatedEntries[state.currentIndex] = {
      ...currentEntry,
      snapshot: currentDepartureSnapshot,
    }
  }

  // Même URL : mise à jour in-place
  if (currentEntry && currentEntry.url === nextArrivalSnapshot.url) {
    updatedEntries[state.currentIndex] = {
      ...currentEntry,
      snapshot: {
        ...currentDepartureSnapshot,
        ...nextArrivalSnapshot,
        id: currentEntry.id,
      },
    }
    return {
      entries: updatedEntries,
      currentIndex: state.currentIndex,
    }
  }

  // Nouvelle URL : tronquer la branche forward et ajouter la nouvelle entrée
  const truncated = updatedEntries.slice(0, state.currentIndex + 1)
  const newEntry: MobileHistoryEntry = {
    id: nextArrivalSnapshot.id,
    url: nextArrivalSnapshot.url,
    pathname: nextArrivalSnapshot.pathname,
    snapshot: nextArrivalSnapshot,
  }

  return {
    entries: [...truncated, newEntry],
    currentIndex: truncated.length,
  }
}

/**
 * Effectue un retour arrière d'un pas dans l'historique
 */
export function stepBack(
  state: MobileHistoryState,
  currentDepartureSnapshot?: MobileNavigationSnapshot,
): { nextState: MobileHistoryState; targetSnapshot: MobileNavigationSnapshot } | null {
  if (!canGoBack(state)) {
    return null
  }

  const updatedEntries = [...state.entries]
  if (currentDepartureSnapshot && updatedEntries[state.currentIndex]) {
    updatedEntries[state.currentIndex] = {
      ...updatedEntries[state.currentIndex],
      snapshot: currentDepartureSnapshot,
    }
  }

  const nextIndex = state.currentIndex - 1
  const targetEntry = updatedEntries[nextIndex]

  return {
    nextState: {
      entries: updatedEntries,
      currentIndex: nextIndex,
    },
    targetSnapshot: targetEntry.snapshot,
  }
}

/**
 * Effectue une avance d'un pas dans l'historique
 */
export function stepForward(
  state: MobileHistoryState,
  currentDepartureSnapshot?: MobileNavigationSnapshot,
): { nextState: MobileHistoryState; targetSnapshot: MobileNavigationSnapshot } | null {
  if (!canGoForward(state)) {
    return null
  }

  const updatedEntries = [...state.entries]
  if (currentDepartureSnapshot && updatedEntries[state.currentIndex]) {
    updatedEntries[state.currentIndex] = {
      ...updatedEntries[state.currentIndex],
      snapshot: currentDepartureSnapshot,
    }
  }

  const nextIndex = state.currentIndex + 1
  const targetEntry = updatedEntries[nextIndex]

  return {
    nextState: {
      entries: updatedEntries,
      currentIndex: nextIndex,
    },
    targetSnapshot: targetEntry.snapshot,
  }
}

/**
 * Met à jour le snapshot courant dans l'historique
 */
export function updateCurrentSnapshot(
  state: MobileHistoryState,
  updater: (prev: MobileNavigationSnapshot) => MobileNavigationSnapshot,
): MobileHistoryState {
  if (state.entries.length === 0 || !state.entries[state.currentIndex]) {
    return state
  }

  const updatedEntries = [...state.entries]
  const current = updatedEntries[state.currentIndex]
  updatedEntries[state.currentIndex] = {
    ...current,
    snapshot: updater(current.snapshot),
  }

  return {
    ...state,
    entries: updatedEntries,
  }
}

/**
 * Fusionne le snapshot KREDO dans un `window.history.state` existant sans altérer
 * les propriétés internes de Next.js (`__NA`, `tree`, etc.)
 */
export function mergeHistoryState(
  existingState: unknown,
  snapshot: MobileNavigationSnapshot,
): Record<string, unknown> {
  const base =
    typeof existingState === "object" && existingState !== null
      ? (existingState as Record<string, unknown>)
      : {}

  return {
    ...base,
    [KREDO_MOBILE_NAV_KEY]: snapshot,
  }
}

/**
 * Extrait et valide un snapshot KREDO depuis un objet `history.state`
 */
export function extractMobileSnapshot(
  historyState: unknown,
): MobileNavigationSnapshot | null {
  if (!historyState || typeof historyState !== "object") {
    return null
  }

  const raw = (historyState as Record<string, unknown>)[KREDO_MOBILE_NAV_KEY]
  if (!raw || typeof raw !== "object") {
    return null
  }

  const candidate = raw as Partial<MobileNavigationSnapshot>
  if (
    candidate.version === MOBILE_NAV_HISTORY_VERSION &&
    typeof candidate.id === "string" &&
    typeof candidate.url === "string" &&
    typeof candidate.pathname === "string"
  ) {
    return raw as MobileNavigationSnapshot
  }

  return null
}
