"use server"

import "server-only"

import { createClient } from "@/lib/supabase/server"

export interface SearchContactResult {
  id: string
  full_name: string
  email: string | null
  job_title: string | null
  account_name: string | null
}

interface SearchContactPerson {
  full_name: string | null
  primary_email: string | null
}

interface SearchContactCompany {
  name: string | null
}

interface SearchContactRow {
  id: string
  job_title: string | null
  persons: SearchContactPerson | SearchContactPerson[] | null
  companies: SearchContactCompany | SearchContactCompany[] | null
}

function pickOne<T>(value: T | T[] | null): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export async function getCompanyContacts(companyId: string): Promise<SearchContactResult[]> {
  if (!companyId) return []

  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("contacts")
      .select(`
        id,
        job_title,
        persons (
          full_name,
          primary_email
        ),
        companies (
          name
        )
      `)
      .eq("company_id", companyId)
      .limit(30)

    if (error || !data) return []

    return (data as SearchContactRow[]).map((item) => {
      const person = pickOne(item.persons)
      const company = pickOne(item.companies)
      return {
        id: item.id,
        full_name: person?.full_name || "",
        email: person?.primary_email || null,
        job_title: item.job_title,
        account_name: company?.name || null,
      }
    })
  } catch (err) {
    console.error("Erreur lors de la récupération des contacts du compte :", err)
    return []
  }
}

export async function searchContacts(query: string): Promise<SearchContactResult[]> {
  if (!query || query.trim().length < 1) {
    return []
  }

  try {
    const supabase = await createClient()

    const sanitized = query.trim()

    // 1. Recherche d'abord dans la table persons par nom complet ou email principal
    const { data: persons, error: personsError } = await supabase
      .from("persons")
      .select("id")
      .or(`full_name.ilike.%${sanitized}%,primary_email.ilike.%${sanitized}%`)
      .limit(50)

    if (personsError) {
      console.error("Erreur lors de la recherche préliminaire des personnes :", personsError)
    }

    const personIds = persons?.map((p) => p.id) || []

    // 2. Recherche dans la table contacts liée
    let queryBuilder = supabase
      .from("contacts")
      .select(`
        id,
        job_title,
        persons (
          full_name,
          primary_email
        ),
        companies (
          name
        )
      `)

    if (personIds.length > 0) {
      // Filtrer les contacts par les personnes trouvées OU par le titre de poste
      queryBuilder = queryBuilder.or(`person_id.in.(${personIds.join(",")}),job_title.ilike.%${sanitized}%`)
    } else {
      // Si aucune personne ne correspond, filtrer uniquement par titre de poste
      queryBuilder = queryBuilder.ilike("job_title", `%${sanitized}%`)
    }

    const { data, error } = await queryBuilder.limit(8)

    if (error) {
      console.error("Erreur lors de la recherche des contacts :", error)
      return []
    }

    if (!data) return []

    return (data as SearchContactRow[]).map((item) => {
      const person = pickOne(item.persons)
      const company = pickOne(item.companies)

      return {
        id: item.id,
        full_name: person ? (person.full_name || "") : "",
        email: person?.primary_email || null,
        job_title: item.job_title,
        account_name: company?.name || null,
      }
    })
  } catch (err) {
    console.error("Erreur non gérée lors de la recherche des contacts :", err)
    return []
  }
}
