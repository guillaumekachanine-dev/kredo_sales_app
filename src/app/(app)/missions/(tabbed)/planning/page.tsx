import { MissionsListView, MissionsListRow } from "@/components/missions/MissionsListView"

const mockPlanning: MissionsListRow[] = [
  {
    entityId: "pl-001",
    entityType: "planning-item",
    title: "Kick-off BNP Paribas — Phase 2",
    subtitle: "Planning · Jalon",
    client: "BNP Paribas",
    status: "pending",
    date: "12 juin 2026",
    tag: "J-3 · Salle Paris La Défense",
  },
  {
    entityId: "pl-002",
    entityType: "planning-item",
    title: "Livraison Sprint 4 — AXA Data",
    subtitle: "Planning · Livraison",
    client: "AXA Group",
    status: "active",
    date: "18 juin 2026",
    tag: "En cours",
  },
  {
    entityId: "pl-003",
    entityType: "planning-item",
    title: "Soutenance offre — L'Oréal",
    subtitle: "Planning · Commercial",
    client: "L'Oréal",
    status: "pending",
    date: "24 juin 2026",
    tag: "Présentation 14h",
  },
  {
    entityId: "pl-004",
    entityType: "planning-item",
    title: "Point mensuel — Société Générale",
    subtitle: "Planning · Suivi",
    client: "Société Générale",
    status: "active",
    date: "30 juin 2026",
    tag: "Visio 10h",
  },
  {
    entityId: "pl-005",
    entityType: "planning-item",
    title: "Clôture mission BPCE",
    subtitle: "Planning · Clôture",
    client: "BPCE",
    status: "closed",
    date: "15 mai 2026",
    tag: "PV signé",
  },
]

export default function PlanningPage() {
  const nbAVenir = mockPlanning.filter((p) =>
    ["pending", "active"].includes(p.status)
  ).length

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold font-heading tracking-tight text-heading">
            Planning
          </h1>
          <p className="text-sm text-muted mt-1">
            {nbAVenir} événements à venir · cliquez une ligne pour ouvrir le détail
          </p>
        </div>
        <button className="px-4 py-2 text-xs font-semibold rounded bg-primary text-primary-fg hover:bg-primary/95 transition-colors shrink-0">
          Ajouter un événement
        </button>
      </div>

      <MissionsListView rows={mockPlanning} emptyMessage="Aucun événement planifié." />
    </div>
  )
}
