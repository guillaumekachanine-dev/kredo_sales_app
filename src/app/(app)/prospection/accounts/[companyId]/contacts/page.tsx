import "server-only"

import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { QualifiedContactsMobileView } from "@/components/accounts-contacts/QualifiedContactsMobileView"
import { normalizeContactRelationshipRole } from "@/lib/accounts-contacts/contact-constants"
import type { DerivedContact } from "@/lib/accounts-contacts/qualified-contacts-helpers"

type PageProps = {
  params: Promise<{ companyId: string }>
}

export default async function AccountQualifiedContactsPage({ params }: PageProps) {
  const { companyId } = await params
  const supabase = await createClient()

  // 1. Fetch company
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, name, meta_logo_path, website, metadata")
    .eq("id", companyId)
    .maybeSingle()

  if (companyError || !company) {
    notFound()
  }

  // 2. Check Device
  const device = await getDashboardDevice()

  // If accessed on desktop, redirect to desktop contacts view filtered for this company
  if (device === "desktop") {
    redirect(`/prospection/accounts?tab=contacts&q=${encodeURIComponent(company.name)}`)
  }

  // 3. Batch fetch contacts + persons for this company
  const { data: rawContacts } = await supabase
    .from("contacts")
    .select(`
      id, person_id, job_title, relationship_role, relationship_level, decision_power,
      department, is_priority, status,
      persons (id, full_name, first_name, last_name, primary_email, phone, linkedin_url)
    `)
    .eq("company_id", companyId)

  const contactList = rawContacts || []
  const contactIds = contactList.map((c) => c.id)

  // 4. Batch fetch interactions & calendar_events in parallel (no N+1)
  let interactionsMap = new Map<string, string[]>()
  let calendarEventsMap = new Map<string, string[]>()

  if (contactIds.length > 0) {
    const [interactionsResult, eventsResult] = await Promise.all([
      supabase
        .from("interactions")
        .select("id, contact_id, occurred_at")
        .in("contact_id", contactIds),
      supabase
        .from("calendar_events")
        .select("id, contact_id, starts_at")
        .in("contact_id", contactIds),
    ])

    if (interactionsResult.data) {
      for (const row of interactionsResult.data) {
        if (row.contact_id) {
          const list = interactionsMap.get(row.contact_id) || []
          if (row.occurred_at) list.push(row.occurred_at)
          interactionsMap.set(row.contact_id, list)
        }
      }
    }

    if (eventsResult.data) {
      for (const row of eventsResult.data) {
        if (row.contact_id) {
          const list = calendarEventsMap.get(row.contact_id) || []
          if (row.starts_at) list.push(row.starts_at)
          calendarEventsMap.set(row.contact_id, list)
        }
      }
    }
  }

  // 5. Compute derived contact properties
  const derivedContacts: DerivedContact[] = contactList.map((c) => {
    const personObj = Array.isArray(c.persons) ? c.persons[0] : c.persons
    const fullName = personObj
      ? personObj.full_name || `${personObj.first_name || ""} ${personObj.last_name || ""}`.trim()
      : "Contact sans nom"

    const phone = personObj?.phone?.trim() || null
    const email = personObj?.primary_email?.trim() || null
    const linkedinUrl = personObj?.linkedin_url?.trim() || null

    const interDates = interactionsMap.get(c.id) || []
    const eventDates = calendarEventsMap.get(c.id) || []
    const allDates = [...interDates, ...eventDates]

    let lastActivityAt: string | null = null
    if (allDates.length > 0) {
      const timestamps = allDates.map((d) => new Date(d).getTime()).filter((t) => !isNaN(t))
      if (timestamps.length > 0) {
        lastActivityAt = new Date(Math.max(...timestamps)).toISOString()
      }
    }

    const isDecisionMaker = normalizeContactRelationshipRole(c.relationship_role) === "decideur"

    return {
      id: c.id,
      personId: c.person_id,
      companyId: companyId,
      fullName,
      firstName: personObj?.first_name || "",
      lastName: personObj?.last_name || "",
      jobTitle: c.job_title || "",
      department: c.department || null,
      relationshipRole: c.relationship_role || null,
      relationshipLevel: c.relationship_level || null,
      decisionPower: c.decision_power || null,
      isPriority: c.is_priority === true,
      phone,
      email,
      linkedinUrl,
      hasPhone: Boolean(phone),
      hasActivity: allDates.length > 0,
      lastActivityAt,
      isDecisionMaker,
    }
  })

  const logoPath =
    (company.meta_logo_path as string | null) ||
    ((company.metadata as Record<string, unknown> | null)?.logo_path as string | null) ||
    null

  return (
    <QualifiedContactsMobileView
      company={{
        id: company.id,
        name: company.name,
        logoPath,
        website: company.website,
      }}
      contacts={derivedContacts}
    />
  )
}
