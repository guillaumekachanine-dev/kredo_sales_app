"use server"

import { createClient } from "@/lib/supabase/server"
import {
  buildScanContacts,
  type ScanContactCompanyRow,
  type ScanContactRow,
  type ScanContactsRulesResult,
} from "./staffing-skills-rules"

export type ScanContactsResult = ScanContactsRulesResult & {
  generatedAt: string
  sourceIssues: string[]
}

type QueryResult<T> = { data: T[]; error: string | null }

type CompanyRow = {
  id: string
  name: string
  lifecycle_status: string
}

type ContactRow = {
  id: string
  company_id: string | null
  relationship_role: string | null
  status: string | null
}

async function safeRead<T>(
  label: string,
  query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<QueryResult<T>> {
  const { data, error } = await query
  return { data: data ?? [], error: error ? `${label}: ${error.message}` : null }
}

export async function getScanContacts(): Promise<ScanContactsResult> {
  const generatedAt = new Date().toISOString()
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) {
    return {
      generatedAt,
      accountCoverage: [],
      summary: { fullyMappedAccounts: 0, partialAccounts: 0, noContactAccounts: 0 },
      sourceIssues: ["Non authentifié."],
    }
  }

  const [companies, contacts] = await Promise.all([
    safeRead<CompanyRow>(
      "Comptes",
      supabase
        .from("companies")
        .select("id,name,lifecycle_status")
        .in("lifecycle_status", ["client", "client_actif", "prospect"])
        .order("name", { ascending: true })
        .limit(500)
        .returns<CompanyRow[]>(),
    ),
    safeRead<ContactRow>(
      "Contacts",
      supabase
        .from("contacts")
        .select("id,company_id,relationship_role,status")
        .limit(1000)
        .returns<ContactRow[]>(),
    ),
  ])

  const mapped = buildScanContacts({
    companies: companies.data.map<ScanContactCompanyRow>((row) => ({
      id: row.id,
      name: row.name,
      lifecycle: row.lifecycle_status,
    })),
    contacts: contacts.data.map<ScanContactRow>((row) => ({
      id: row.id,
      companyId: row.company_id,
      relationshipRole: row.relationship_role,
      status: row.status,
    })),
  })

  return {
    generatedAt,
    ...mapped,
    sourceIssues: [companies, contacts]
      .map((result) => result.error)
      .filter((issue): issue is string => Boolean(issue)),
  }
}
