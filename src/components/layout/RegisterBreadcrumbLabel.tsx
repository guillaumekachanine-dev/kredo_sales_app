"use client"

import { useEffect } from "react"
import { useBreadcrumbStore } from "@/lib/navigation/breadcrumb-store"

// Enregistre le label lisible d'un segment dynamique du fil d'Ariane.
// Rendu par les pages dynamiques (ex. cockpit compte) à partir d'une donnée
// DÉJÀ fetchée côté serveur — aucune requête supplémentaire.
//
// Le label reste en cache pour la session (pas de cleanup) : évite le flash "…"
// lors d'un retour arrière sur le même compte.
export function RegisterBreadcrumbLabel({
  segment,
  label,
}: {
  segment: string
  label: string
}) {
  const setLabel = useBreadcrumbStore((s) => s.setLabel)

  useEffect(() => {
    if (segment && label) setLabel(segment, label)
  }, [segment, label, setLabel])

  return null
}
