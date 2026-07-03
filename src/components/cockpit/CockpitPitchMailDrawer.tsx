"use client"

import { useState, useEffect, useMemo } from "react"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { PitchMailDrawerContent } from "@/components/accounts-contacts/intelligence/IntelligenceActionDrawers"
import { Combobox, type ComboboxOption } from "@/components/ui/Combobox"
import { createClient } from "@/lib/supabase/client"
import type { ClientIntelligenceContact } from "@/lib/intelligence/intelligence-data"
import { cn } from "@/lib/utils"

interface CompanyOption {
  id: string
  name: string
  lifecycle_status: string
}

export function CockpitPitchMailDrawer({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [companies, setCompanies] = useState<CompanyOption[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("")
  const [companyQuery, setCompanyQuery] = useState("")
  const [contacts, setContacts] = useState<ClientIntelligenceContact[]>([])
  const [loadingCompanies, setLoadingCompanies] = useState(false)
  const [loadingContacts, setLoadingContacts] = useState(false)
  const supabase = createClient()

  // Fetch companies when drawer opens
  useEffect(() => {
    if (!open) return
    let active = true
    async function fetchCompanies() {
      setLoadingCompanies(true)
      try {
        const { data } = await supabase
          .from("companies")
          .select("id, name, lifecycle_status")
          .order("name")
        if (active && data) {
          setCompanies(data)
          if (data.length > 0 && !selectedCompanyId) {
            setSelectedCompanyId(data[0].id)
            setCompanyQuery(data[0].name)
          }
        }
      } catch (err) {
        console.error("[CockpitPitchMailDrawer] Error fetching companies:", err)
      } finally {
        if (active) setLoadingCompanies(false)
      }
    }
    void fetchCompanies()
    return () => {
      active = false
    }
  }, [open, supabase]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch contacts when selected company changes
  useEffect(() => {
    if (!selectedCompanyId || !open) return
    let active = true
    async function fetchContacts() {
      setLoadingContacts(true)
      try {
        const { data } = await supabase
          .from("contacts")
          .select("id, person_id, job_title, relationship_role, is_priority, persons(full_name, first_name, last_name, primary_email)")
          .eq("company_id", selectedCompanyId)
          .in("relationship_role", ["decideur", "dsi", "direction_metier", "prescripteur", "influenceur", "operationnel"])
          .order("created_at", { ascending: false })
          .limit(30)
        
        if (active && data) {
          interface SupabasePerson {
            full_name: string | null
            first_name: string | null
            last_name: string | null
            primary_email: string | null
          }
          interface SupabaseContactRow {
            id: string
            person_id: string | null
            job_title: string | null
            relationship_role: string | null
            is_priority: boolean
            persons: SupabasePerson | SupabasePerson[] | null
          }

          const mappedContacts: ClientIntelligenceContact[] = (data as unknown as SupabaseContactRow[]).map((row) => {
            const personObj = row.persons
            const person = Array.isArray(personObj) ? personObj[0] : personObj
            const fallbackName = [person?.first_name, person?.last_name].filter(Boolean).join(" ").trim()
            return {
              id: row.id,
              fullName: person?.full_name || fallbackName || "Contact sans nom",
              jobTitle: row.job_title,
              relationshipRole: row.relationship_role,
              email: person?.primary_email ?? null,
            }
          })
          setContacts(mappedContacts)
        }
      } catch (err) {
        console.error("[CockpitPitchMailDrawer] Error fetching contacts:", err)
      } finally {
        if (active) setLoadingContacts(false)
      }
    }
    void fetchContacts()
    return () => {
      active = false
    }
  }, [selectedCompanyId, open, supabase])

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId)
  const filteredCompanies = useMemo(() => {
    const normalizedQuery = companyQuery.trim().toLowerCase()
    const base = [...companies]

    if (!normalizedQuery) {
      return base
    }

    return base
      .filter((company) => company.name.toLowerCase().includes(normalizedQuery))
      .sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(normalizedQuery) ? 0 : 1
        const bStarts = b.name.toLowerCase().startsWith(normalizedQuery) ? 0 : 1
        if (aStarts !== bStarts) return aStarts - bStarts
        return a.name.localeCompare(b.name, "fr")
      })
  }, [companies, companyQuery])

  const companyOptions = useMemo<ComboboxOption[]>(
    () =>
      filteredCompanies.map((company) => ({
        id: company.id,
        label: company.name,
        description: company.lifecycle_status.replaceAll("_", " "),
      })),
    [filteredCompanies],
  )

  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Rédiger mail/pitch"
      width="default"
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-muted">
            Compte CRM
          </label>
          <Combobox
            data-autofocus="true"
            type="text"
            value={companyQuery}
            onValueChange={(value) => {
              setCompanyQuery(value)
              if (selectedCompany && value !== selectedCompany.name) {
                setSelectedCompanyId("")
              }
            }}
            options={companyOptions}
            onSelect={(option) => {
              const company = companies.find((entry) => entry.id === option.id)
              if (!company) return
              setSelectedCompanyId(company.id)
              setCompanyQuery(company.name)
            }}
            placeholder="Rechercher un compte..."
            autoComplete="off"
            loading={loadingCompanies}
            loadingMessage="Chargement des comptes..."
            emptyMessage="Aucun compte ne correspond"
            canOpen={open}
            clearable={Boolean(companyQuery)}
            onClear={() => {
              setCompanyQuery("")
              setSelectedCompanyId("")
            }}
            className="border-transparent bg-[#2A57B5] text-sm font-semibold text-white placeholder:text-[#B9CCF1] focus-visible:ring-white/25"
            renderOption={(option, state) => (
              <div className="flex min-w-0 flex-col">
                <span className={cn("truncate text-xs font-semibold", state.active ? "text-heading" : "text-body")}>
                  {option.label}
                </span>
                {option.description ? (
                  <span className="truncate text-[11px] uppercase tracking-[0.12em] text-muted">
                    {option.description}
                  </span>
                ) : null}
              </div>
            )}
          />
        </div>

        {selectedCompany && !loadingContacts && (
          <div data-theme="cockpit" className="rounded-lg border border-border bg-surface p-4">
            <PitchMailDrawerContent
              data={{
                company: {
                  id: selectedCompany.id,
                  name: selectedCompany.name,
                  lifecycleStatus: selectedCompany.lifecycle_status,
                },
                contacts,
              }}
            />
          </div>
        )}

        {loadingContacts && (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <span className="h-5 w-5 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            <span className="text-xs text-muted">Chargement du contexte compte...</span>
          </div>
        )}
      </div>
    </AppDrawer>
  )
}
