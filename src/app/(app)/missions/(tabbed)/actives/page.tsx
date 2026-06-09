import { MissionsListView, MissionsListRow } from "@/components/missions/MissionsListView"

const mockMissionsActives: MissionsListRow[] = [
  {
    entityId: "m-001",
    entityType: "mission",
    title: "Transformation SI — BNP Paribas",
    subtitle: "Mission · Chef de projet",
    client: "BNP Paribas",
    status: "active",
    amount: "185 000 €",
    date: "Déc 2026",
    tag: "TJM 850 € · 200 j",
  },
  {
    entityId: "m-002",
    entityType: "mission",
    title: "Data Platform — AXA Group",
    subtitle: "Mission · Data Engineer",
    client: "AXA Group",
    status: "active",
    amount: "96 000 €",
    date: "Sep 2026",
    tag: "TJM 800 € · 120 j",
  },
  {
    entityId: "m-003",
    entityType: "mission",
    title: "Refonte CRM — Société Générale",
    subtitle: "Mission · Architecte",
    client: "Société Générale",
    status: "pending",
    amount: "140 000 €",
    date: "Nov 2026",
    tag: "TJM 900 € · 155 j",
  },
  {
    entityId: "m-004",
    entityType: "mission",
    title: "PMO Digital — Crédit Agricole",
    subtitle: "Mission · PMO Senior",
    client: "Crédit Agricole",
    status: "active",
    amount: "62 000 €",
    date: "Août 2026",
    tag: "TJM 750 € · 80 j",
  },
  {
    entityId: "m-005",
    entityType: "mission",
    title: "Sécurité RGPD — BPCE",
    subtitle: "Mission · RSSI",
    client: "BPCE",
    status: "closed",
    amount: "55 000 €",
    date: "Mar 2026",
    tag: "Clôturée",
  },
]

export default function MissionsActivesPage() {
  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold font-heading tracking-tight text-heading">
            Missions actives
          </h1>
          <p className="text-sm text-muted mt-1">
            {mockMissionsActives.filter((m) => m.status === "active").length} missions en cours · cliquez une ligne pour ouvrir la fiche
          </p>
        </div>
        <button className="px-4 py-2 text-xs font-semibold rounded bg-primary text-primary-fg hover:bg-primary/95 transition-colors shrink-0">
          Nouvelle mission
        </button>
      </div>

      <MissionsListView rows={mockMissionsActives} emptyMessage="Aucune mission active." />
    </div>
  )
}
