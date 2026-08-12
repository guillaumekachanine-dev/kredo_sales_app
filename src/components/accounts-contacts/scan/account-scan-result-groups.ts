import type { AccountScanProposalRow } from "./account-scan-utils"

export type AccountScanResultGroup = {
  id: string
  label: string
  rows: AccountScanProposalRow[]
}

const IDENTITY_ATTRIBUTES = new Set(["legal_name", "siren", "hq_location", "website"])
const COMPANY_ATTRIBUTES = new Set(["naf_code", "description", "sector", "employee_count", "revenue"])

export function groupAccountScanRows(rows: AccountScanProposalRow[]): AccountScanResultGroup[] {
  const groups: AccountScanResultGroup[] = [
    { id: "identity", label: "Identité & coordonnées", rows: [] },
    { id: "company", label: "Entreprise", rows: [] },
    { id: "facts", label: "Faits & actualités", rows: [] },
    { id: "other", label: "Autres informations", rows: [] },
  ]

  for (const row of rows) {
    if (IDENTITY_ATTRIBUTES.has(row.attributeName)) groups[0].rows.push(row)
    else if (COMPANY_ATTRIBUTES.has(row.attributeName)) groups[1].rows.push(row)
    else if (row.isFact) groups[2].rows.push(row)
    else groups[3].rows.push(row)
  }

  return groups.filter((group) => group.rows.length > 0)
}
