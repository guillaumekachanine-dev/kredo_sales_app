"use client"

import { useCallback, useEffect, useRef } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { create } from "zustand"
import {
  canGoBack as checkCanGoBack,
  canGoForward as checkCanGoForward,
  createInitialMobileHistoryState,
  createSnapshot,
  extractMobileSnapshot,
  mergeHistoryState,
  recordMobileNavigation,
  stepBack as pureStepBack,
  stepForward as pureStepForward,
  type MobileHistoryState,
  type MobileNavigationSnapshot,
} from "@/lib/navigation/mobile-navigation-history"
import { useCrmAccountLauncherStore } from "./use-crm-account-launcher"
import { useCrmDrawer } from "./use-crm-drawer"

// ─────────────────────────────────────────────────────────────────────────────
//  Mobile Navigation History Hook & Store
//
//  Coordonne la navigation arrière / avant mobile, capture les snapshots UI
//  (scroll, shell, overlays) et restaure l'état exact des vues.
// ─────────────────────────────────────────────────────────────────────────────

type ShellStateProvider = {
  getShellState: () => {
    menuOpen: boolean
    railOpen: boolean
    expandedMenuId?: string | null
  }
  applyShellState: (state: {
    menuOpen: boolean
    railOpen: boolean
    expandedMenuId?: string | null
  }) => void
}

interface MobileNavigationHistoryStoreState {
  historyState: MobileHistoryState
  isNavigatingHistory: boolean
  shellProvider: ShellStateProvider | null

  registerShellProvider: (provider: ShellStateProvider) => () => void
  setHistoryState: (state: MobileHistoryState) => void
  setIsNavigatingHistory: (isNavigating: boolean) => void
}

function getInitialState(): MobileHistoryState {
  if (typeof window === "undefined") {
    const defaultSnap = createSnapshot({ url: "/" })
    return createInitialMobileHistoryState(defaultSnap)
  }

  // Vérifier si history.state contient déjà un snapshot valide
  const existingSnapshot = extractMobileSnapshot(window.history.state)
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`
  const initialSnapshot =
    existingSnapshot ??
    createSnapshot({
      url: currentUrl,
      shell: { menuOpen: false, railOpen: false },
    })

  // Synchroniser avec history.state sans écraser Next.js
  if (!existingSnapshot) {
    try {
      window.history.replaceState(
        mergeHistoryState(window.history.state, initialSnapshot),
        "",
        currentUrl,
      )
    } catch {
      // noop
    }
  }

  return createInitialMobileHistoryState(initialSnapshot)
}

export const useMobileNavigationHistoryStore = create<MobileNavigationHistoryStoreState>(
  (set) => ({
    historyState: getInitialState(),
    isNavigatingHistory: false,
    shellProvider: null,

    registerShellProvider: (provider) => {
      set({ shellProvider: provider })
      return () => {
        set((current) => (current.shellProvider === provider ? { shellProvider: null } : current))
      }
    },

    setHistoryState: (historyState) => set({ historyState }),
    setIsNavigatingHistory: (isNavigatingHistory) => set({ isNavigatingHistory }),
  }),
)

/**
 * Capture le scroll du conteneur principal mobile
 */
export function captureMobileScroll(): { main: number } {
  if (typeof document === "undefined") return { main: 0 }
  const mainEl = document.querySelector<HTMLElement>("[data-kredo-mobile-scroll-root]")
  const scrollTop = mainEl ? mainEl.scrollTop : (window.scrollY || 0)
  return { main: scrollTop }
}

/**
 * Restaure le scroll du conteneur principal mobile
 */
export function restoreMobileScroll(scroll?: { main: number }) {
  if (typeof document === "undefined" || !scroll) return

  const targetScroll = scroll.main

  const apply = () => {
    const mainEl = document.querySelector<HTMLElement>("[data-kredo-mobile-scroll-root]")
    if (mainEl) {
      mainEl.scrollTop = targetScroll
    } else {
      window.scrollTo(0, targetScroll)
    }
  }

  // Double rAF pour s'assurer que le rendu React et la hauteur du DOM sont prêts
  requestAnimationFrame(() => {
    apply()
    requestAnimationFrame(() => {
      apply()
    })
  })
}

/**
 * Hook principal de navigation mobile avec historique et restauration d'état
 */
export function useMobileNavigationHistory() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const fullUrl = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`

  const historyState = useMobileNavigationHistoryStore((s) => s.historyState)
  const shellProvider = useMobileNavigationHistoryStore((s) => s.shellProvider)

  const lastRecordedUrlRef = useRef<string | null>(null)

  const canGoBack = checkCanGoBack(historyState)
  const canGoForward = checkCanGoForward(historyState)

  /**
   * Capture le snapshot UI courant
   */
  const captureCurrentSnapshot = useCallback(
    (customId?: string, overrideUrl?: string): MobileNavigationSnapshot => {
      const scroll = captureMobileScroll()
      const shell = shellProvider?.getShellState() ?? {
        menuOpen: false,
        railOpen: false,
      }

      const crmLauncherState = useCrmAccountLauncherStore.getState()
      const crmDrawerState = useCrmDrawer.getState()

      return createSnapshot({
        id: customId,
        url: overrideUrl ?? fullUrl,
        scroll,
        shell,
        overlays: {
          crmLauncher: {
            open: crmLauncherState.isOpen,
            mode: crmLauncherState.mode,
            searchQuery: crmLauncherState.searchQuery,
          },
          crmDrawer: crmDrawerState.target
            ? { kind: crmDrawerState.target.kind, id: crmDrawerState.target.id }
            : null,
        },
      })
    },
    [fullUrl, shellProvider],
  )

  /**
   * Restaure un snapshot UI
   */
  const restoreSnapshot = useCallback(
    (snapshot: MobileNavigationSnapshot) => {
      // 1. Restaurer le shell (menu & rail)
      if (shellProvider && snapshot.shell) {
        shellProvider.applyShellState({
          menuOpen: Boolean(snapshot.shell.menuOpen),
          railOpen: Boolean(snapshot.shell.railOpen),
          expandedMenuId: snapshot.shell.expandedMenuId ?? null,
        })
      }

      // 2. Restaurer CRM Launcher
      if (snapshot.overlays?.crmLauncher) {
        const launcher = snapshot.overlays.crmLauncher
        useCrmAccountLauncherStore.getState().restore({
          open: launcher.open,
          mode: launcher.mode,
          searchQuery: launcher.searchQuery,
        })
      } else {
        useCrmAccountLauncherStore.getState().close()
      }

      // 3. Restaurer CRM Drawer si présent
      if (snapshot.overlays?.crmDrawer) {
        const drawer = snapshot.overlays.crmDrawer
        if (drawer.kind === "company") {
          useCrmDrawer.getState().openCompany(drawer.id)
        } else if (drawer.kind === "contact") {
          useCrmDrawer.getState().openContact(drawer.id)
        }
      }

      // 4. Restaurer le scroll
      if (snapshot.scroll) {
        restoreMobileScroll(snapshot.scroll)
      }
    },
    [shellProvider],
  )

  /**
   * Navigation arrière (← Retour)
   */
  const goBack = useCallback(() => {
    const store = useMobileNavigationHistoryStore.getState()
    if (!checkCanGoBack(store.historyState)) return

    const departureSnapshot = captureCurrentSnapshot()
    const result = pureStepBack(store.historyState, departureSnapshot)
    if (!result) return

    store.setIsNavigatingHistory(true)
    store.setHistoryState(result.nextState)
    lastRecordedUrlRef.current = result.targetSnapshot.url

    // Synchroniser avec history.state
    try {
      window.history.replaceState(
        mergeHistoryState(window.history.state, result.targetSnapshot),
        "",
        result.targetSnapshot.url,
      )
    } catch {
      // noop
    }

    // Effectuer la navigation de route
    router.push(result.targetSnapshot.url)
    restoreSnapshot(result.targetSnapshot)
  }, [captureCurrentSnapshot, router, restoreSnapshot])

  /**
   * Navigation avant (Suivant →)
   */
  const goForward = useCallback(() => {
    const store = useMobileNavigationHistoryStore.getState()
    if (!checkCanGoForward(store.historyState)) return

    const departureSnapshot = captureCurrentSnapshot()
    const result = pureStepForward(store.historyState, departureSnapshot)
    if (!result) return

    store.setIsNavigatingHistory(true)
    store.setHistoryState(result.nextState)
    lastRecordedUrlRef.current = result.targetSnapshot.url

    // Synchroniser avec history.state
    try {
      window.history.replaceState(
        mergeHistoryState(window.history.state, result.targetSnapshot),
        "",
        result.targetSnapshot.url,
      )
    } catch {
      // noop
    }

    // Effectuer la navigation de route
    router.push(result.targetSnapshot.url)
    restoreSnapshot(result.targetSnapshot)
  }, [captureCurrentSnapshot, router, restoreSnapshot])

  // Synchronisation lors des changements d'URL
  useEffect(() => {
    if (lastRecordedUrlRef.current === null) {
      // Montage initial : enregistrement de l'URL de base sans déclencher de re-render
      lastRecordedUrlRef.current = fullUrl
      return
    }

    // Si l'URL n'a pas changé, aucune mise à jour de state n'est requise
    if (lastRecordedUrlRef.current === fullUrl) {
      return
    }

    const previousUrl = lastRecordedUrlRef.current
    lastRecordedUrlRef.current = fullUrl

    const store = useMobileNavigationHistoryStore.getState()

    // Si nous sommes dans une transition d'historique (Back / Forward en cours),
    // on désactive simplement le drapeau sans ajouter de nouvelle entrée.
    if (store.isNavigatingHistory) {
      store.setIsNavigatingHistory(false)
      return
    }

    // Nouvelle navigation (ex: clic sur un lien)
    const currentEntry = store.historyState.entries[store.historyState.currentIndex]
    const departureSnapshot = captureCurrentSnapshot(currentEntry?.id, previousUrl)
    const newSnapshot = createSnapshot({
      url: fullUrl,
      scroll: { main: 0 },
      shell: { menuOpen: false, railOpen: false },
    })

    const nextState = recordMobileNavigation(
      store.historyState,
      departureSnapshot,
      newSnapshot,
    )
    store.setHistoryState(nextState)

    try {
      window.history.replaceState(
        mergeHistoryState(window.history.state, newSnapshot),
        "",
        fullUrl,
      )
    } catch {
      // noop
    }
  }, [fullUrl, captureCurrentSnapshot])

  // Écouteur popstate (pour les gestes natifs de navigation du navigateur)
  useEffect(() => {
    function handlePopState(event: PopStateEvent) {
      const snapshot = extractMobileSnapshot(event.state)
      if (!snapshot) return

      const store = useMobileNavigationHistoryStore.getState()
      const existingIndex = store.historyState.entries.findIndex(
        (e) => e.id === snapshot.id || e.url === snapshot.url,
      )

      if (existingIndex !== -1) {
        store.setIsNavigatingHistory(true)
        store.setHistoryState({
          ...store.historyState,
          currentIndex: existingIndex,
        })
        lastRecordedUrlRef.current = snapshot.url
        restoreSnapshot(snapshot)
      }
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [restoreSnapshot])

  return {
    canGoBack,
    canGoForward,
    goBack,
    goForward,
    historyState,
    captureCurrentSnapshot,
    restoreSnapshot,
  }
}
