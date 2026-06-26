"use client"

import { useEffect, useState } from "react"
import { SectionTab } from "@/lib/tabs/tab-types"
import { createClient } from "@/lib/supabase/client"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { StaffingDetailTimeline } from "./StaffingDetailTimeline"

interface StaffingDetailData {
  id: string
  status: string
  comment: string | null
  proposed_at: string | null
  sent_to_client_at: string | null
  created_at: string
  opportunity: {
    id: string
    title: string
    priority: string
    company: { name: string } | null
  } | null
  candidate: {
    id: string
    source: string | null
    person: {
      id: string
      full_name: string | null
      first_name: string | null
      last_name: string | null
    } | null
  } | null
}

interface StaffingDetailPanelProps {
  tab: SectionTab
}

export function StaffingDetailPanel({ tab }: StaffingDetailPanelProps) {
  const [data, setData] = useState<StaffingDetailData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    let active = true
    const supabase = createClient()

    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data: res, error: dbError } = await supabase
          .from("opportunity_candidates")
          .select(`
            id,
            status,
            comment,
            proposed_at,
            sent_to_client_at,
            created_at,
            opportunity:opportunities (
              id,
              title,
              priority,
              company:companies ( name )
            ),
            candidate:candidates (
              id,
              source,
              person:persons (
                id,
                full_name,
                first_name,
                last_name
              )
            )
          `)
          .eq("id", tab.entityId)
          .maybeSingle()

        if (!active) return

        if (dbError) {
          setError(dbError.message)
        } else if (res) {
          setData(res as any)
        } else {
          setError("Positionnement de staffing introuvable.")
        }
      } catch (err: any) {
        if (!active) return
        setError(err.message || "Erreur lors du chargement des données.")
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadData()

    return () => {
      active = false
    }
  }, [tab.entityId])

  if (loading) {
    return (
      <div className="w-full max-w-[1480px] mx-auto px-6 py-8 flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4 pb-5 border-b border-border">
          <div className="flex flex-col gap-2 w-full">
            <div className="h-4 w-24 bg-border/30 rounded animate-pulse" />
            <div className="h-8 w-64 bg-border/40 rounded animate-pulse" />
          </div>
        </div>
        <div className="h-64 bg-border/20 rounded animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full max-w-3xl mx-auto px-6 py-8">
        <SurfaceCard className="p-6 border-danger/20 bg-danger/5 flex flex-col gap-2 items-center text-center">
          <span className="text-sm font-semibold text-danger">Une erreur est survenue</span>
          <p className="text-xs text-muted">{error}</p>
        </SurfaceCard>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="w-full max-w-3xl mx-auto px-6 py-8">
        <SurfaceCard className="p-6 flex flex-col gap-2 items-center text-center">
          <span className="text-sm font-semibold text-heading">Positionnement introuvable</span>
          <p className="text-xs text-muted">Le staffing demandé n&apos;existe pas ou a été supprimé.</p>
        </SurfaceCard>
      </div>
    )
  }

  const person = data.candidate?.person
  const candidateName = person?.full_name || `${person?.first_name || ""} ${person?.last_name || ""}`.trim() || "Profil sans nom"
  const isCollaborator = data.candidate?.source === "collaborateur"

  return (
    <div className="w-full max-w-[1480px] mx-auto px-6 py-8 flex flex-col gap-6">
      {/* Detail Header */}
      <div className="flex items-start justify-between gap-4 pb-5 border-b border-border">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted border border-border px-2 py-0.5 rounded bg-surface select-none">
              {isCollaborator ? "Collaborateur interne" : "Candidat recrutement"}
            </span>
            {data.opportunity?.title && (
              <span className="text-xs text-muted">Positionné sur : {data.opportunity.title}</span>
            )}
          </div>
          <h1 className="text-2xl font-bold font-heading text-heading tracking-tight">
            {candidateName}
          </h1>
        </div>
      </div>

      {/* Timeline Section */}
      <div className="py-2">
        <StaffingDetailTimeline currentStatus={data.status} />
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Left column (col-span-8) */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          {/* Squelette de contenu détaillé */}
          <SurfaceCard className="p-6 space-y-4">
            <div className="flex flex-col">
              <h2 className="text-sm font-bold text-heading">Fiche de synthèse staffing</h2>
              <p className="text-xs text-muted mt-0.5">Les informations détaillées de ce positionnement seront complétées dans une version ultérieure.</p>
            </div>
            
            <div className="space-y-3 pt-2">
              <div className="h-3 bg-border/40 rounded w-1/3 animate-pulse" />
              <div className="h-3 bg-border/30 rounded w-2/3 animate-pulse" />
              <div className="h-20 bg-border/20 rounded w-full animate-pulse" />
            </div>
          </SurfaceCard>
        </div>

        {/* Right column (col-span-4) */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <SurfaceCard className="p-6 space-y-4">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider select-none">Informations client</h3>
            <div className="space-y-3">
              <div>
                <span className="text-[10px] text-muted block select-none">Client</span>
                <span className="text-xs font-bold text-heading mt-0.5 block">{data.opportunity?.company?.name || "Non renseigné"}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted block select-none">Priorité du besoin</span>
                <span className="text-xs font-bold text-heading mt-0.5 block capitalize">{data.opportunity?.priority || "Normale"}</span>
              </div>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </div>
  )
}
