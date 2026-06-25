"use client"

import React, { useState, useMemo } from "react"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { useEventDrawerStore } from "@/hooks/use-event-drawer-store"
import { useStaffingDrawerStore } from "@/hooks/use-staffing-drawer-store"
import { getEventResourceSignedUrl } from "@/lib/agenda/event-drawer-actions"
import type { StaffingDrawerViewModel } from "@/types/staffing-drawer"

interface TabRessourcesProps {
  data: StaffingDrawerViewModel
  events: Array<{
    id: string
    title: string
    event_type: string
    status: string
    starts_at: string
    ends_at: string
    description: string | null
    metadata: any
    organizer_id: string | null
  }>
  profiles: Record<string, { full_name: string | null }>
}

function formatDate(iso: string | null) {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

export function TabRessources({ data, events, profiles }: TabRessourcesProps) {
  const { openEventDrawer } = useEventDrawerStore()
  const { closeStaffingDrawer } = useStaffingDrawerStore()
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null)

  // 1. Identify prequalification event
  const prequalEvent = useMemo(() => {
    return events.find(e => {
      const titleLower = e.title.toLowerCase()
      return (
        e.event_type === "entretien_candidat" &&
        (titleLower.includes("qualif") ||
          titleLower.includes("fit") ||
          titleLower.includes("culturel") ||
          titleLower.includes("sourcing") ||
          titleLower.includes("appel") ||
          titleLower.includes("de besoin"))
      )
    }) ?? null
  }, [events])

  // 2. Identify manager interview event
  const managerEvent = useMemo(() => {
    return events.find(e => {
      const titleLower = e.title.toLowerCase()
      return (
        (e.event_type === "entretien_candidat" || e.event_type === "entretien_rh") &&
        (titleLower.includes("tech") ||
          titleLower.includes("manager") ||
          titleLower.includes("rh") ||
          titleLower.includes("pratique") ||
          titleLower.includes("test") ||
          titleLower.includes("client")) &&
        e.id !== prequalEvent?.id // Avoid duplicate match
      )
    }) ?? null
  }, [events, prequalEvent])

  // 3. Parse opportunity context JSON
  const opportunityContext = useMemo(() => {
    const ctx = data.opportunity.context
    if (typeof ctx === "string") {
      try {
        return JSON.parse(ctx)
      } catch {
        return {}
      }
    }
    return (ctx as Record<string, any>) || {}
  }, [data.opportunity.context])

  const clientContext = opportunityContext.client_context || ""
  const needDetail = opportunityContext.need_detail || ""
  const searchedProfile = opportunityContext.searched_profile || ""

  // 4. Handle document download/signedUrl
  const handleDownload = async (bucket: string, path: string, name: string) => {
    try {
      setDownloadingFile(name)
      const url = await getEventResourceSignedUrl(bucket, path)
      if (url) {
        window.open(url, "_blank")
      } else {
        alert("Impossible de générer le lien de téléchargement.")
      }
    } catch (e) {
      console.error(e)
    } finally {
      setDownloadingFile(null)
    }
  }

  const navigateToEvent = (eventId: string) => {
    closeStaffingDrawer()
    openEventDrawer(eventId)
  }

  const renderDocumentList = (resources: any[]) => {
    if (!resources || resources.length === 0) return null
    return (
      <div className="mt-2 space-y-1.5 border-t border-border/25 pt-2">
        <span className="text-[10px] text-muted block select-none">Documents joints</span>
        <div className="space-y-1">
          {resources.map((res: any, idx: number) => {
            const isDownloading = downloadingFile === res.name
            return (
              <button
                key={idx}
                onClick={() => res.bucket && res.storage_path && handleDownload(res.bucket, res.storage_path, res.name)}
                disabled={!res.bucket || !res.storage_path || isDownloading}
                className="flex items-center gap-2 text-xs font-bold text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer disabled:text-muted select-none"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                <span className="truncate">{res.name}</span>
                {isDownloading && <span className="text-[9px] font-normal text-muted select-none">(téléchargement...)</span>}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 1. PRÉQUALIFICATION */}
      <SurfaceCard className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-muted uppercase tracking-wider select-none">Préqualification</h4>
          {prequalEvent && (
            <button
              onClick={() => navigateToEvent(prequalEvent.id)}
              className="text-[10px] font-bold text-primary hover:underline bg-transparent border-0 p-0 select-none"
            >
              Consulter l&apos;événement →
            </button>
          )}
        </div>

        {prequalEvent ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-[11px] text-body">
              <div>
                <span className="text-[9px] text-muted block select-none">Date</span>
                <span className="font-semibold block text-heading mt-0.5">{formatDate(prequalEvent.starts_at)}</span>
              </div>
              <div>
                <span className="text-[9px] text-muted block select-none">Auteur / Organisateur</span>
                <span className="font-semibold block text-heading mt-0.5">
                  {prequalEvent.organizer_id ? profiles[prequalEvent.organizer_id]?.full_name || "Organisateur" : "—"}
                </span>
              </div>
            </div>
            
            {prequalEvent.description && (
              <div>
                <span className="text-[9px] text-muted block select-none">Compte rendu</span>
                <p className="text-xs text-body leading-relaxed mt-1 whitespace-pre-line">{prequalEvent.description}</p>
              </div>
            )}

            {renderDocumentList(prequalEvent.metadata?.resources)}
          </div>
        ) : (
          <div className="py-4 text-center border border-dashed border-border/50 rounded-xl select-none">
            <p className="text-xs text-muted">Aucun compte rendu de préqualification disponible.</p>
          </div>
        )}
      </SurfaceCard>

      {/* 2. ENTRETIEN MANAGER */}
      <SurfaceCard className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-muted uppercase tracking-wider select-none">Entretien Manager</h4>
          {managerEvent && (
            <button
              onClick={() => navigateToEvent(managerEvent.id)}
              className="text-[10px] font-bold text-primary hover:underline bg-transparent border-0 p-0 select-none"
            >
              Consulter l&apos;événement →
            </button>
          )}
        </div>

        {managerEvent ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-[11px] text-body">
              <div>
                <span className="text-[9px] text-muted block select-none">Date</span>
                <span className="font-semibold block text-heading mt-0.5">{formatDate(managerEvent.starts_at)}</span>
              </div>
              <div>
                <span className="text-[9px] text-muted block select-none">Auteur / Organisateur</span>
                <span className="font-semibold block text-heading mt-0.5">
                  {managerEvent.organizer_id ? profiles[managerEvent.organizer_id]?.full_name || "Organisateur" : "—"}
                </span>
              </div>
            </div>

            {managerEvent.description && (
              <div>
                <span className="text-[9px] text-muted block select-none">Compte rendu</span>
                <p className="text-xs text-body leading-relaxed mt-1 whitespace-pre-line">{managerEvent.description}</p>
              </div>
            )}

            {renderDocumentList(managerEvent.metadata?.resources)}
          </div>
        ) : (
          <div className="py-4 text-center border border-dashed border-border/50 rounded-xl select-none">
            <p className="text-xs text-muted">Aucun compte rendu d&apos;entretien manager disponible.</p>
          </div>
        )}
      </SurfaceCard>

      {/* 3. BESOIN / OPPORTUNITÉ */}
      <SurfaceCard className="p-4 space-y-3">
        <h4 className="text-xs font-bold text-muted uppercase tracking-wider select-none">Détails du besoin associé</h4>
        
        <div className="space-y-2 text-xs">
          <div>
            <span className="text-[10px] text-muted block select-none">Titre du besoin</span>
            <span className="font-bold text-heading mt-0.5 block">{data.opportunity.title}</span>
          </div>

          {clientContext && (
            <div>
              <span className="text-[10px] text-muted block select-none">Contexte Client</span>
              <p className="text-xs text-body leading-relaxed mt-1">{clientContext}</p>
            </div>
          )}

          {needDetail && (
            <div>
              <span className="text-[10px] text-muted block select-none">Détails de la mission</span>
              <p className="text-xs text-body leading-relaxed mt-1">{needDetail}</p>
            </div>
          )}

          {searchedProfile && (
            <div>
              <span className="text-[10px] text-muted block select-none">Profil recherché</span>
              <p className="text-xs text-body leading-relaxed mt-1">{searchedProfile}</p>
            </div>
          )}
        </div>
      </SurfaceCard>
    </div>
  )
}
