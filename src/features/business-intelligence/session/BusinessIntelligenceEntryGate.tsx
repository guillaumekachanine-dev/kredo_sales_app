"use client"

import { useEffect, useSyncExternalStore, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import type { BusinessIntelligenceCatalog } from "../data/business-intelligence-workspace-types"
import type { BusinessIntelligenceCatalogIssue } from "../catalog/catalog-copy"
import { buildBusinessIntelligenceHref } from "../navigation/business-intelligence-chapters"
import {
  clearBusinessIntelligenceSession,
  getBusinessIntelligenceSession,
} from "./business-intelligence-session"
import {
  BusinessIntelligenceLoadingDesktop,
  BusinessIntelligenceLoadingMobile,
} from "../states/BusinessIntelligenceLoading"

interface BusinessIntelligenceEntryGateProps {
  catalog: BusinessIntelligenceCatalog
  device: "desktop" | "mobile"
  issue?: BusinessIntelligenceCatalogIssue | null
  children: ReactNode
}

const emptySubscribe = () => () => {}

function getRestorableSegmentId(
  catalog: BusinessIntelligenceCatalog,
  hasIssue: boolean,
): string | null {
  if (hasIssue) return null
  const session = getBusinessIntelligenceSession()
  if (!session) return null

  if (catalog.state === "ready") {
    const exists = catalog.macros.some((macro) =>
      macro.segments.some((segment) => segment.id === session.segmentId),
    )
    if (!exists) {
      clearBusinessIntelligenceSession()
      return null
    }
  }

  return session.segmentId
}

/**
 * Porte d'entrée de Business Intelligence pour les accès sans segment explicite (/intelligence).
 * - Restaure immédiatement le segment mémorisé si la session est fraîche (< 15 min).
 * - Évite le flash visuel catalogue en affichant le squelette de chargement du workspace pendant la transition.
 * - Affiche le rendu de sélection par défaut (children) si aucune session, session expirée ou segment invalide.
 */
export function BusinessIntelligenceEntryGate({
  catalog,
  device,
  issue = null,
  children,
}: BusinessIntelligenceEntryGateProps) {
  const router = useRouter()
  const hasIssue = Boolean(issue)

  useEffect(() => {
    if (hasIssue) {
      clearBusinessIntelligenceSession()
    }
  }, [hasIssue])

  const targetSegmentId = useSyncExternalStore(
    emptySubscribe,
    () => getRestorableSegmentId(catalog, hasIssue),
    () => null,
  )

  useEffect(() => {
    if (targetSegmentId) {
      router.replace(buildBusinessIntelligenceHref(targetSegmentId, "home"))
    }
  }, [targetSegmentId, router])

  if (targetSegmentId) {
    return device === "mobile" ? (
      <BusinessIntelligenceLoadingMobile mode="workspace" />
    ) : (
      <BusinessIntelligenceLoadingDesktop mode="workspace" />
    )
  }

  return children
}
