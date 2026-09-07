import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { Json } from "@/types/database"

// ─────────────────────────────────────────────────────────────────────────────
//  Fiche mission pour la vue « Missions AT › En cours » du shell Engagements.
//
//  Loader ALLÉGÉ (≠ get-mission-detail.ts) : la vue n'a besoin ni des CRA, ni
//  du planning, ni des interactions, ni de la RÉMUNÉRATION CONFIDENTIELLE
//  (collaborator_compensation). Le coût journalier affiché vient de missions.cjm
//  (colonne de la mission, pas de la grille de rémunération) — rien de
//  confidentiel ne transite donc dans le payload RSC.
//
//  Contact opérationnel : on rejoue la cascade de get-mission-detail.ts
//  (metadata.contact_ids → opportunity_contacts), SANS le fallback « contacts du
//  compte » — le cahier des charges interdit ce heuristique pour cette section.
// ─────────────────────────────────────────────────────────────────────────────

export interface EngagementMissionSummary {
  id: string
  title: string
  status: string
  startDate: string | null
  endDate: string | null
  roleTitle: string | null
  practice: string | null
  seniority: string | null
  tjm: number
  cjm: number
  grossMarginPct: number | null
  billingCondition: string | null
  description: string | null
  externalRef: string | null
  deliveryLocation: string | null
}

export interface EngagementMissionCompany {
  id: string
  name: string
  website: string | null
  logoPath: string | null
  hqLocation: string | null
  sector: string | null
  segment: string | null
}

export interface EngagementSkillTag {
  id: string
  name: string
  category: string | null
}

export interface EngagementMissionCollaborator {
  id: string
  fullName: string
  currentTitle: string | null
  practice: string | null
  seniority: string | null
  status: string | null
  employeeRef: string | null
  email: string | null
  phone: string | null
  skills: EngagementSkillTag[]
}

export interface EngagementMissionContact {
  id: string
  fullName: string
  jobTitle: string | null
  missionRole: string | null
  role: string | null
  email: string | null
  phone: string | null
}

export interface EngagementCompanyContact {
  id: string
  fullName: string
  jobTitle: string | null
  email: string | null
  phone: string | null
}

export interface EngagementMissionDetail {
  mission: EngagementMissionSummary
  company: EngagementMissionCompany | null
  collaborator: EngagementMissionCollaborator | null
  requiredSkills: EngagementSkillTag[]
  operationalContact: EngagementMissionContact | null
  contacts: EngagementMissionContact[]
  companyContacts: EngagementCompanyContact[]
}

// ─── DB row shapes ───────────────────────────────────────────────────────────

interface DBPerson {
  id: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  primary_email: string | null
  phone: string | null
}

interface DBSkill {
  id: string
  name: string
  category: string | null
}

interface DBPersonSkill {
  level: number | null
  years: number | null
  skills: DBSkill | DBSkill[] | null
}

interface DBCollaborator {
  id: string
  practice: string | null
  seniority: string | null
  status: string | null
  current_title: string | null
  employee_ref: string | null
  persons: (DBPerson & { person_skills: DBPersonSkill[] }) | (DBPerson & { person_skills: DBPersonSkill[] })[] | null
}

interface DBContact {
  id: string
  job_title: string | null
  relationship_role: string | null
  persons: DBPerson | DBPerson[] | null
}

interface DBOpportunityContact {
  role: string | null
  contacts: DBContact | DBContact[] | null
}

interface DBOpportunitySkill {
  min_level: number | null
  importance: string | null
  skills: DBSkill | DBSkill[] | null
}

interface DBMissionRow {
  id: string
  title: string
  status: string
  start_date: string | null
  end_date: string | null
  role_title: string | null
  practice: string | null
  seniority: string | null
  tjm: number | null
  cjm: number | null
  gross_margin_pct: number | null
  billing_condition: string | null
  description: string | null
  external_ref: string | null
  metadata: Json
  opportunity_id: string | null
  collaborator_id: string | null
  company_id: string | null
}

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function personName(p: DBPerson): string {
  return (
    p.full_name ||
    `${p.first_name || ""} ${p.last_name || ""}`.trim() ||
    "Sans nom"
  )
}

function readString(meta: Json, key: string): string | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null
  const value = (meta as Record<string, unknown>)[key]
  return typeof value === "string" && value.trim() ? value : null
}

// ─── Contacts mission : métadonnées explicites ou opportunity_contacts ────────

interface MetaMissionContact {
  contact_id: string
  role?: string
}

async function resolveMissionContacts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  mission: DBMissionRow
): Promise<EngagementMissionContact[]> {
  const raw = mission.metadata
  const rawMissionContacts = (() => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return []
    const val = (raw as Record<string, unknown>).mission_contacts
    if (!Array.isArray(val)) return []
    return val.filter(
      (item): item is MetaMissionContact =>
        Boolean(item && typeof item === "object" && typeof (item as Record<string, unknown>).contact_id === "string")
    )
  })()

  const rawContactIds = (() => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return []
    const value = (raw as Record<string, unknown>).contact_ids
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : []
  })()

  if (rawMissionContacts.length > 0) {
    const roleMap = new Map(rawMissionContacts.map((mc) => [mc.contact_id, mc.role || "Manager opérationnel"]))
    const contactIds = Array.from(roleMap.keys())
    const { data } = await supabase
      .from("contacts")
      .select("id, job_title, relationship_role, persons(id, full_name, first_name, last_name, primary_email, phone)")
      .in("id", contactIds)

    const list = (data as unknown as DBContact[] | null) || []
    return list.map((c) => {
      const person = pickOne(c.persons)
      return {
        id: c.id,
        fullName: person ? personName(person) : "Sans nom",
        jobTitle: c.job_title ?? null,
        missionRole: roleMap.get(c.id) || c.relationship_role || "Manager opérationnel",
        role: c.relationship_role,
        email: person?.primary_email ?? null,
        phone: person?.phone ?? null,
      }
    })
  }

  if (rawContactIds.length > 0) {
    const { data } = await supabase
      .from("contacts")
      .select("id, job_title, relationship_role, persons(id, full_name, first_name, last_name, primary_email, phone)")
      .in("id", rawContactIds)

    const list = (data as unknown as DBContact[] | null) || []
    return list.map((c) => {
      const person = pickOne(c.persons)
      return {
        id: c.id,
        fullName: person ? personName(person) : "Sans nom",
        jobTitle: c.job_title ?? null,
        missionRole: c.relationship_role || "Manager opérationnel",
        role: c.relationship_role,
        email: person?.primary_email ?? null,
        phone: person?.phone ?? null,
      }
    })
  }

  if (mission.opportunity_id) {
    const { data } = await supabase
      .from("opportunity_contacts")
      .select(
        "role, contacts(id, job_title, relationship_role, persons(id, full_name, first_name, last_name, primary_email, phone))"
      )
      .eq("opportunity_id", mission.opportunity_id)

    const list = (data as unknown as DBOpportunityContact[] | null) || []
    return list
      .map((row): EngagementMissionContact | null => {
        const contact = pickOne(row.contacts)
        const person = contact ? pickOne(contact.persons) : null
        if (!contact || !person) return null
        return {
          id: contact.id,
          fullName: personName(person),
          jobTitle: contact.job_title ?? null,
          missionRole: row.role || contact.relationship_role || "Manager opérationnel",
          role: row.role || contact.relationship_role,
          email: person.primary_email,
          phone: person.phone,
        }
      })
      .filter((c): c is EngagementMissionContact => c !== null)
  }

  return []
}

async function resolveRequiredSkills(
  supabase: Awaited<ReturnType<typeof createClient>>,
  opportunityId: string | null
): Promise<EngagementSkillTag[]> {
  if (!opportunityId) return []
  const { data, error } = await supabase
    .from("opportunity_skills")
    .select("min_level, importance, skills(id, name, category)")
    .eq("opportunity_id", opportunityId)
    .order("weight", { ascending: false })

  if (error) {
    console.error("[getEngagementMissionDetail] requiredSkills", error.message)
    return []
  }

  return ((data as unknown as DBOpportunitySkill[]) ?? [])
    .map((row) => {
      const skill = pickOne(row.skills)
      return skill ? { id: skill.id, name: skill.name, category: skill.category } : null
    })
    .filter((s): s is EngagementSkillTag => s !== null)
}

// ─── Entrée publique ─────────────────────────────────────────────────────────

export async function getEngagementMissionDetail(
  missionId: string
): Promise<EngagementMissionDetail | null> {
  if (!missionId?.trim()) return null

  try {
    const supabase = await createClient()

    const { data: missionRow, error: missionError } = await supabase
      .from("missions")
      .select(
        "id, title, status, start_date, end_date, role_title, practice, seniority, tjm, cjm, gross_margin_pct, billing_condition, description, external_ref, metadata, opportunity_id, collaborator_id, company_id"
      )
      .eq("id", missionId)
      .maybeSingle()

    if (missionError) {
      console.error("[getEngagementMissionDetail] mission", missionError.message)
      return null
    }
    if (!missionRow) return null

    const row = missionRow as unknown as DBMissionRow

    const [companyRow, collaboratorRow, contacts, requiredSkills, companyContactsRow] = await Promise.all([
      row.company_id
        ? supabase
            .from("companies")
            .select("id, name, website, meta_logo_path, hq_location, sector, segment")
            .eq("id", row.company_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      row.collaborator_id
        ? supabase
            .from("collaborators")
            .select(
              `
              id, practice, seniority, status, current_title, employee_ref,
              persons (
                id, full_name, first_name, last_name, primary_email, phone,
                person_skills (
                  level, years,
                  skills ( id, name, category )
                )
              )
            `
            )
            .eq("id", row.collaborator_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      resolveMissionContacts(supabase, row),
      resolveRequiredSkills(supabase, row.opportunity_id),
      row.company_id
        ? supabase
            .from("contacts")
            .select("id, job_title, persons(id, full_name, first_name, last_name, primary_email, phone)")
            .eq("company_id", row.company_id)
        : Promise.resolve({ data: [] }),
    ])

    // ── Company ──
    const companyData = companyRow.data as
      | { id: string; name: string; website: string | null; meta_logo_path: string | null; hq_location: string | null; sector: string | null; segment: string | null }
      | null
    const company: EngagementMissionCompany | null = companyData
      ? {
          id: companyData.id,
          name: companyData.name,
          website: companyData.website,
          logoPath: companyData.meta_logo_path,
          hqLocation: companyData.hq_location,
          sector: companyData.sector,
          segment: companyData.segment,
        }
      : null

    // ── Collaborator ──
    let collaborator: EngagementMissionCollaborator | null = null
    const collabData = collaboratorRow.data as unknown as DBCollaborator | null
    if (collabData) {
      const person = pickOne(collabData.persons)
      const ranked = (person?.person_skills ?? [])
        .map((ps) => {
          const skill = pickOne(ps.skills)
          if (!skill) return null
          return {
            tag: { id: skill.id, name: skill.name, category: skill.category } satisfies EngagementSkillTag,
            level: ps.level ?? 0,
            years: ps.years ?? 0,
          }
        })
        .filter((s): s is { tag: EngagementSkillTag; level: number; years: number } => s !== null)
        .sort((a, b) => b.level - a.level || b.years - a.years)
      const skills: EngagementSkillTag[] = ranked.map((s) => s.tag)

      collaborator = {
        id: collabData.id,
        fullName: person ? personName(person) : "Collaborateur inconnu",
        currentTitle: collabData.current_title,
        practice: collabData.practice,
        seniority: collabData.seniority,
        status: collabData.status,
        employeeRef: collabData.employee_ref,
        email: person?.primary_email ?? null,
        phone: person?.phone ?? null,
        skills,
      }
    }

    const mission: EngagementMissionSummary = {
      id: row.id,
      title: row.title,
      status: row.status,
      startDate: row.start_date,
      endDate: row.end_date,
      roleTitle: row.role_title,
      practice: row.practice,
      seniority: row.seniority,
      tjm: row.tjm ?? 0,
      cjm: row.cjm ?? 0,
      grossMarginPct: row.gross_margin_pct,
      billingCondition: row.billing_condition,
      description: row.description,
      externalRef: row.external_ref,
      // Le modèle n'a pas de champ « lieu de delivery » ; on lit une clé metadata
      // si elle existe un jour, sinon null (affichage « — »). Aucune fabrication.
      deliveryLocation:
        readString(row.metadata, "delivery_location") ??
        readString(row.metadata, "delivery_mode") ??
        null,
    }

    const companyContacts: EngagementCompanyContact[] = (
      (companyContactsRow.data as unknown as DBContact[] | null) || []
    )
      .map((c) => {
        const person = pickOne(c.persons)
        if (!person) return null
        return {
          id: c.id,
          fullName: personName(person),
          jobTitle: c.job_title ?? null,
          email: person.primary_email ?? null,
          phone: person.phone ?? null,
        }
      })
      .filter((c): c is EngagementCompanyContact => c !== null)

    const operationalContact = contacts[0] ?? null

    return {
      mission,
      company,
      collaborator,
      requiredSkills,
      operationalContact,
      contacts,
      companyContacts,
    }
  } catch (err) {
    console.error("[getEngagementMissionDetail] unhandled", err)
    return null
  }
}
