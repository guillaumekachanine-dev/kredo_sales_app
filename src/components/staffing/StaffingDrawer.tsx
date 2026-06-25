"use client"

import React, { useEffect, useState, useTransition } from "react"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { createClient } from "@/lib/supabase/client"
import { useStaffingDrawerStore, type StaffingDrawerTab } from "@/hooks/use-staffing-drawer-store"
import { StaffingDrawerHeader } from "./StaffingDrawerHeader"
import { TabDetails } from "./TabDetails"
import { TabRessources } from "./TabRessources"
import { TabTimeline } from "./TabTimeline"
import type { StaffingDrawerViewModel } from "@/types/staffing-drawer"

// Drawer skeleton for loading state
function DrawerSkeleton() {
  return (
    <div className="space-y-4 pt-1 select-none">
      <div className="flex gap-4 border-b pb-2" style={{ borderColor: "var(--color-border)" }}>
        <div className="h-3 w-16 animate-pulse rounded bg-[var(--color-skeleton-base)]/40" />
        <div className="h-3 w-20 animate-pulse rounded bg-[var(--color-skeleton-base)]/40" />
        <div className="h-3 w-16 animate-pulse rounded bg-[var(--color-skeleton-base)]/40" />
      </div>
      <div className="h-24 animate-pulse rounded-xl w-full bg-[var(--color-skeleton-base)]/30" />
      <div className="grid grid-cols-2 gap-2">
        <div className="h-16 animate-pulse rounded-xl bg-[var(--color-skeleton-base)]/30" />
        <div className="h-16 animate-pulse rounded-xl bg-[var(--color-skeleton-base)]/30" />
      </div>
      <div className="h-36 animate-pulse rounded-xl w-full bg-[var(--color-skeleton-base)]/25" />
    </div>
  )
}

export function StaffingDrawer() {
  const { isOpen, staffingId, activeTab, closeStaffingDrawer, setActiveTab } = useStaffingDrawerStore()
  
  const [drawerData, setDrawerData] = useState<StaffingDrawerViewModel | null>(null)
  const [events, setEvents] = useState<any[]>([])
  const [profiles, setProfiles] = useState<Record<string, { full_name: string | null }>>({})
  
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [, startTransition] = useTransition()

  // Detect mobile device client-side
  useEffect(() => {
    const media = window.matchMedia("(max-width: 640px)")
    setIsMobile(media.matches)
    const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    media.addEventListener("change", listener)
    return () => media.removeEventListener("change", listener)
  }, [])

  // Load staffing details
  useEffect(() => {
    if (!isOpen || !staffingId) return

    const loadData = async () => {
      setLoading(true)
      setFetchError(null)
      
      try {
        const supabase = createClient()
        
        // 1. Fetch main staffing data
        const { data: staffing, error: staffingError } = await supabase
          .from("opportunity_candidates")
          .select(`
            id, status, comment, next_action, positioning_origin, proposed_at, sent_to_client_at, status_changed_at, created_at, updated_at,
            opportunity:opportunities (
              id, title, stage, priority, start_date, target_daily_rate, context,
              company:companies ( id, name )
            ),
            candidate:candidates (
              id, status, source, seniority, expected_daily_rate, expected_salary, availability,
              person:persons (
                id, first_name, last_name, full_name, primary_email, phone, linkedin_url, location, notes,
                person_skills (
                  id, level, years, confidence, source,
                  skill:skills ( id, name, category )
                ),
                collaborators (
                  id, status, current_title, entry_date, practice, seniority,
                  compensation:collaborator_compensation ( gross_annual, effective_to ),
                  missions (
                    id, title, status, start_date, end_date, tjm, cjm, gross_margin_pct,
                    company:companies ( name )
                  )
                )
              )
            )
          `)
          .eq("id", staffingId)
          .maybeSingle()

        if (staffingError) {
          throw new Error(staffingError.message)
        }
        if (!staffing) {
          throw new Error("Positionnement de staffing introuvable.")
        }

        const model = staffing as unknown as StaffingDrawerViewModel
        setDrawerData(model)

        // 2. Fetch candidate events & profile catalog in parallel
        const candidateId = model.candidate?.id
        if (candidateId) {
          const [eventsResult, profilesResult] = await Promise.all([
            supabase
              .from("calendar_events")
              .select("id, title, event_type, status, starts_at, ends_at, description, metadata, organizer_id")
              .eq("candidate_id", candidateId)
              .order("starts_at", { ascending: false }),
            supabase
              .from("profiles")
              .select("id, full_name")
          ])

          if (eventsResult.data) {
            setEvents(eventsResult.data)
          }
          
          if (profilesResult.data) {
            const profileMap: Record<string, { full_name: string | null }> = {}
            profilesResult.data.forEach(p => {
              profileMap[p.id] = { full_name: p.full_name }
            })
            setProfiles(profileMap)
          }
        }
      } catch (err: any) {
        console.error("[StaffingDrawer] Error loading data:", err)
        setFetchError(err.message || "Erreur de chargement des données.")
      } finally {
        setLoading(false)
      }
    }

    startTransition(() => {
      void loadData()
    })
  }, [isOpen, staffingId])

  const isCollaborator = drawerData?.candidate?.source === "collaborateur" || 
    (drawerData?.candidate?.person?.collaborators && drawerData.candidate.person.collaborators.length > 0) || 
    false

  const TABS = [
    { id: "details" as const, label: "Détails" },
    { id: "ressources" as const, label: "Ressources" },
    { id: "timeline" as const, label: "Timeline" },
  ]

  const handleTabChange = (tab: StaffingDrawerTab) => {
    setActiveTab(tab)
  }

  // Sub-views depending on responsive device type
  const renderTabContent = () => {
    if (!drawerData) return null

    switch (activeTab) {
      case "details":
        return <TabDetails data={drawerData} isCollaborator={isCollaborator} />
      case "ressources":
        return <TabRessources data={drawerData} events={events} profiles={profiles} />
      case "timeline":
        return <TabTimeline data={drawerData} events={events} />
      default:
        return null
    }
  }

  return (
    <AppDrawer
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) closeStaffingDrawer()
      }}
      title={
        drawerData ? (
          <StaffingDrawerHeader data={drawerData} isCollaborator={isCollaborator} />
        ) : (
          "Dossier Staffing"
        )
      }
      eyebrow="Positionnement"
      className={isMobile ? "w-full max-w-full" : "max-w-[480px]"}
      loading={loading && !drawerData}
    >
      {/* ── Tabs selector ──────────────────────────────────────────── */}
      {!loading && drawerData && (
        <div
          className="-mt-4 mb-4 flex gap-0 border-b select-none"
          style={{ borderColor: "var(--color-border)" }}
          role="tablist"
        >
          {TABS.map(({ id, label }) => {
            const isActive = activeTab === id
            return (
              <button
                key={id}
                role="tab"
                aria-selected={isActive}
                onClick={() => handleTabChange(id)}
                className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors focus-visible:outline-none cursor-pointer"
                style={{
                  color: isActive ? "var(--color-primary)" : "var(--color-muted)",
                  borderBottom: isActive
                    ? "2px solid var(--color-primary)"
                    : "2px solid transparent",
                  marginBottom: "-1px",
                  background: "transparent",
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}

      {/* ── Drawer States ──────────────────────────────────────────── */}
      {loading && !drawerData && <DrawerSkeleton />}

      {fetchError && !loading && (
        <div
          className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-12 text-center select-none"
          style={{ borderColor: "var(--color-border)", color: "var(--color-muted)" }}
        >
          <p className="text-sm font-semibold text-heading">Erreur de chargement</p>
          <p className="text-xs">{fetchError}</p>
          <button
            onClick={() => {
              if (staffingId) {
                // Re-trigger load by resetting state slightly or forcing load
                setDrawerData(null)
              }
            }}
            className="mt-1 text-xs underline underline-offset-2 text-primary cursor-pointer"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* ── Tab Content ────────────────────────────────────────────── */}
      {!loading && !fetchError && drawerData && (
        <div role="tabpanel" className="pb-6">
          {renderTabContent()}
        </div>
      )}
    </AppDrawer>
  )
}
