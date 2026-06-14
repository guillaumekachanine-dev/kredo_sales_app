import { SyntheseFinanceSection } from "@/components/finance"

export const dynamic = "force-dynamic"

// Onglet Finance — Synthèse financière décisionnelle (CA réalisé YTD, pipeCRM,
// marges, P&L mensuels, anomalies facturation auditées par IA, cash flow dunning).
export default function FinancePage() {
  return <SyntheseFinanceSection />
}
