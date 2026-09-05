"use client"

import { useEffect, useState } from "react"

export type ModuleSnapshotState<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: T }

/**
 * Charge la donnée d'un module « launcher » du Cockpit.
 *
 * Les modules riches (socle de sources, simulateur de cadence, atlas…) sont
 * montés DANS leur page, qui leur passe un snapshot chargé côté serveur. Le
 * panneau Cockpit est un composant client sans ce contexte : chaque module doit
 * donc devenir autoportant. Ce hook porte la seule chose commune à tous — l'état
 * de chargement — pour qu'un module ne soit qu'un chargeur et un rendu.
 *
 * L'échec est un état rendu, jamais un silence : un module qui s'ouvre vide
 * ferait croire à une absence de données là où il y a une erreur de lecture.
 */
export function useModuleSnapshot<T>(load: () => Promise<T>): ModuleSnapshotState<T> {
  const [state, setState] = useState<ModuleSnapshotState<T>>({ status: "loading" })

  useEffect(() => {
    let cancelled = false

    void load()
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data })
      })
      .catch((reason: unknown) => {
        if (cancelled) return
        setState({
          status: "error",
          message: reason instanceof Error ? reason.message : "Chargement impossible.",
        })
      })

    return () => { cancelled = true }
    // `load` est une référence stable fournie par le module appelant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return state
}
