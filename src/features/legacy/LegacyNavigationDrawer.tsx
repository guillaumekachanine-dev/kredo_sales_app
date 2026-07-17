"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { useLegacySandboxStore } from "./LegacySandboxStore"
import { getSandboxData } from "./sandbox-loader"
import type { SectorListItem } from "@/lib/supabase/sector"
import { cn } from "@/lib/utils"

export function LegacyNavigationDrawer({ device }: { device: "desktop" | "mobile" }) {
  const isOpen = useLegacySandboxStore((s) => s.isOpen)
  const close = useLegacySandboxStore((s) => s.close)

  const [sectors, setSectors] = useState<SectorListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      setError(false)
      getSandboxData()
        .then((res) => {
          if (res.success) {
            setSectors(res.sectors || [])
          } else {
            setError(true)
          }
        })
        .catch(() => {
          setError(true)
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [isOpen])

  const handleLinkClick = () => {
    close()
  }

  // Filtrer les secteurs pour playbooks actifs (status === "active")
  const activePlaybooks = sectors.filter((s) => s.status === "active")

  return (
    <AppDrawer
      open={isOpen}
      onOpenChange={(open) => !open && close()}
      title="Bac à sable"
      subtitle="Contenus historiques & expérimentaux"
      side={device === "mobile" ? "bottom" : "right"}
      width="default"
    >
      <div className="space-y-6 py-4 px-2">
        {/* Section 1: VUES HISTORIQUES */}
        <section className="space-y-2">
          <h3 className="text-[10px] font-bold text-muted uppercase tracking-wider px-3">
            Vues historiques
          </h3>
          <div className="space-y-1">
            <Link
              href="/legacy/crm-synthese"
              onClick={handleLinkClick}
              className="flex items-center justify-between py-2.5 px-3 text-xs text-body hover:text-heading hover:bg-[#edf0f7] rounded-md transition-colors font-medium min-h-[44px]"
            >
              <span>Synthèse CRM & Prospection</span>
              <span className="text-[10px] text-muted font-normal">Ouvrir →</span>
            </Link>
            <Link
              href="/legacy/approche-sectorielle"
              onClick={handleLinkClick}
              className="flex items-center justify-between py-2.5 px-3 text-xs text-body hover:text-heading hover:bg-[#edf0f7] rounded-md transition-colors font-medium min-h-[44px]"
            >
              <span>Approche sectorielle</span>
              <span className="text-[10px] text-muted font-normal">Ouvrir →</span>
            </Link>
          </div>
        </section>

        {/* Section 2: ÉTUDES SECTORIELLES KREDO */}
        <section className="space-y-2">
          <h3 className="text-[10px] font-bold text-muted uppercase tracking-wider px-3">
            Études sectorielles KREDO
          </h3>
          {loading ? (
            <div className="px-3 py-2 text-xs text-muted animate-pulse">
              Chargement des études...
            </div>
          ) : error ? (
            <div className="px-3 py-2 text-xs text-danger/80">
              Erreur lors du chargement des études.
            </div>
          ) : sectors.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted italic">
              Aucune étude sectorielle disponible.
            </div>
          ) : (
            <div className="space-y-0.5">
              {sectors.map((sector) => (
                <Link
                  key={sector.id}
                  href={`/legacy/etudes/${sector.slug}`}
                  onClick={handleLinkClick}
                  className="flex items-center justify-between py-2.5 px-3 text-xs text-body hover:text-heading hover:bg-[#edf0f7] rounded-md transition-colors font-medium min-h-[44px]"
                >
                  <span className="truncate pr-2">{sector.name}</span>
                  {sector.status && (
                    <span className={cn(
                      "text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0",
                      sector.status === "active"
                        ? "bg-success/10 text-success border border-success/15"
                        : sector.status === "development"
                        ? "bg-warning/10 text-warning border border-warning/15"
                        : "bg-white/10 text-muted border border-border"
                    )}>
                      {sector.status === "active"
                        ? "Actif"
                        : sector.status === "development"
                        ? "Dev."
                        : "Veille"}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Section 3: PLAYBOOKS COMMERCIAUX KREDO */}
        <section className="space-y-2">
          <h3 className="text-[10px] font-bold text-muted uppercase tracking-wider px-3">
            Playbooks commerciaux KREDO
          </h3>
          {loading ? (
            <div className="px-3 py-2 text-xs text-muted animate-pulse">
              Chargement des playbooks...
            </div>
          ) : error ? (
            <div className="px-3 py-2 text-xs text-danger/80">
              Erreur lors du chargement des playbooks.
            </div>
          ) : activePlaybooks.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted italic">
              Aucun playbook disponible.
            </div>
          ) : (
            <div className="space-y-0.5">
              {activePlaybooks.map((sector) => (
                <Link
                  key={sector.id}
                  href={`/ressources/playbook/${sector.slug}`}
                  onClick={handleLinkClick}
                  className="flex items-center justify-between py-2.5 px-3 text-xs text-body hover:text-heading hover:bg-[#edf0f7] rounded-md transition-colors font-medium min-h-[44px]"
                >
                  <span className="truncate pr-2">{sector.name}</span>
                  <span className="text-[10px] text-muted shrink-0 font-normal">Playbook →</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Section 4: ARCHIVES FOLIO */}
        <section className="space-y-2">
          <h3 className="text-[10px] font-bold text-muted uppercase tracking-wider px-3">
            Archives FOLIO
          </h3>
          <div className="px-1">
            <Link
              href="/legacy/folio/sector-studies"
              onClick={handleLinkClick}
              className="block p-3 border border-border bg-surface hover:bg-[#edf0f7] hover:border-primary/20 rounded-lg transition-colors group min-h-[44px]"
            >
              <div className="text-xs font-bold text-heading group-hover:text-primary transition-colors">
                Études sectorielles originales
              </div>
              <div className="text-[10px] text-muted mt-0.5">
                Archives FOLIO par compte
              </div>
            </Link>
          </div>
        </section>
      </div>
    </AppDrawer>
  )
}
