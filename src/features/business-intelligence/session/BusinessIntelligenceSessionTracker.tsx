"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  clearBusinessIntelligenceSession,
  getBusinessIntelligenceSession,
  setBusinessIntelligenceSession,
} from "./business-intelligence-session"

interface BusinessIntelligenceSessionTrackerProps {
  segmentId: string
}

/**
 * Traqueur de session client partagé (Desktop et Mobile).
 * Enregistre le segment actif, actualise la dernière consultation et gère
 * l'inactivité via visibilitychange et le démontage vers d'autres pages KREDO.
 */
export function BusinessIntelligenceSessionTracker({
  segmentId,
}: BusinessIntelligenceSessionTrackerProps) {
  const router = useRouter()
  const isExpiredRef = useRef(false)

  useEffect(() => {
    isExpiredRef.current = false

    // 1. Initialiser ou rafraîchir la session au montage d'un workspace valide
    setBusinessIntelligenceSession(segmentId)

    // 2. Écouter le passage en arrière-plan et le retour au premier plan
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (!isExpiredRef.current) {
          setBusinessIntelligenceSession(segmentId)
        }
      } else if (document.visibilityState === "visible") {
        const session = getBusinessIntelligenceSession()
        if (!session) {
          // Session expirée (>= 15 min en arrière-plan) ou absente
          isExpiredRef.current = true
          clearBusinessIntelligenceSession()
          router.replace("/intelligence")
        } else {
          // Non expirée (< 15 min) : conserver le workspace et rafraîchir l'horodatage
          setBusinessIntelligenceSession(segmentId)
        }
      }
    }

    // 3. Écouter pagehide pour les sorties de page mobiles/navigateur
    const handlePageHide = () => {
      if (!isExpiredRef.current) {
        setBusinessIntelligenceSession(segmentId)
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("pagehide", handlePageHide)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("pagehide", handlePageHide)

      // 4. Navigation vers une autre page KREDO (CRM, Cockpit, etc.)
      if (!isExpiredRef.current) {
        setBusinessIntelligenceSession(segmentId)
      }
    }
  }, [segmentId, router])

  return null
}
