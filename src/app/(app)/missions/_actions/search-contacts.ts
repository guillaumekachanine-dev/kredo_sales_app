"use server"

import { createClient } from "@/lib/supabase/server"

export interface SearchContactResult {
  id: string
  full_name: string
  email: string | null
  job_title: string | null
  account_name: string | null
}

interface DBSearchContact {
  id: string
  full_name: string
  email: string | null
  job_title: string | null
  crm_accounts: { name: string } | Array<{ name: string }> | null
}

export async function searchContacts(query: string): Promise<SearchContactResult[]> {
  if (!query || query.trim().length < 1) {
    return []
  }

  try {
    const supabase = await createClient()

    const sanitized = query.trim()

    // Recherche par nom complet, email, ou titre de poste
    const { data, error } = await supabase
      .from("crm_contacts")
      .select(`
        id,
        full_name,
        email,
        job_title,
        crm_accounts (
          name
        )
      `)
      .or(`full_name.ilike.%${sanitized}%,email.ilike.%${sanitized}%,job_title.ilike.%${sanitized}%`)
      .limit(8)

    if (error) {
      console.error("Erreur lors de la recherche des contacts :", error)
      return []
    }

    if (!data) return []

    const rows = data as unknown as DBSearchContact[]

    return rows.map((item) => {
      const account = item.crm_accounts
      let accountName = null
      if (account) {
        if (Array.isArray(account)) {
          accountName = account[0]?.name || null
        } else {
          accountName = account.name || null
        }
      }

      return {
        id: item.id,
        full_name: item.full_name,
        email: item.email,
        job_title: item.job_title,
        account_name: accountName,
      }
    })
  } catch (err) {
    console.error("Erreur non gérée lors de la recherche des contacts :", err)
    return []
  }
}
