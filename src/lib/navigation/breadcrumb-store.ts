import { create } from "zustand"

// ─────────────────────────────────────────────────────────────────────────────
//  Registre des labels dynamiques du fil d'Ariane.
//
//  Clé = valeur brute du segment d'URL (ex. l'UUID d'un compte).
//  Valeur = label UI lisible (ex. "Arkopharma").
//
//  Alimenté par les pages qui possèdent déjà la donnée (via RegisterBreadcrumbLabel),
//  donc AUCUN refetch / waterfall. Lu par <Breadcrumb /> dans l'AppHeader.
// ─────────────────────────────────────────────────────────────────────────────

type BreadcrumbStore = {
  labels: Record<string, string>
  setLabel: (segment: string, label: string) => void
  clearLabel: (segment: string) => void
}

export const useBreadcrumbStore = create<BreadcrumbStore>((set) => ({
  labels: {},
  setLabel: (segment, label) =>
    set((state) =>
      state.labels[segment] === label
        ? state
        : { labels: { ...state.labels, [segment]: label } },
    ),
  clearLabel: (segment) =>
    set((state) => {
      if (!(segment in state.labels)) return state
      const next = { ...state.labels }
      delete next[segment]
      return { labels: next }
    }),
}))
