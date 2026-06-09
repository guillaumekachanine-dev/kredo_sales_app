import { MissionsListView, MissionsListRow } from "@/components/missions/MissionsListView"
import { NewOpportunityButton } from "@/components/missions/NewOpportunityButton"

const mockOpportunites: MissionsListRow[] = [
  {
    entityId: "o-001",
    entityType: "opportunite",
    title: "Offre Data Governance — L'Oréal",
    subtitle: "Opportunité · Data",
    client: "L'Oréal",
    status: "pending",
    amount: "220 000 €",
    date: "Juil 2026",
    tag: "Proposition envoyée",
  },
  {
    entityId: "o-002",
    entityType: "opportunite",
    title: "Mission BI / Reporting — Renault",
    subtitle: "Opportunité · Analytics",
    client: "Renault",
    status: "pending",
    amount: "78 000 €",
    date: "Juin 2026",
    tag: "Qualification en cours",
  },
  {
    entityId: "o-003",
    entityType: "opportunite",
    title: "Modernisation Infra — TotalEnergies",
    subtitle: "Opportunité · Cloud",
    client: "TotalEnergies",
    status: "won",
    amount: "310 000 €",
    date: "Avr 2026",
    tag: "Contrat signé",
  },
  {
    entityId: "o-004",
    entityType: "opportunite",
    title: "Conseil Stratégie SI — Airbus",
    subtitle: "Opportunité · Stratégie",
    client: "Airbus",
    status: "lost",
    amount: "95 000 €",
    date: "Mar 2026",
    tag: "Perdu — budget",
  },
  {
    entityId: "o-005",
    entityType: "opportunite",
    title: "DevSecOps — Orange Business",
    subtitle: "Opportunité · Sécurité",
    client: "Orange Business",
    status: "pending",
    amount: "130 000 €",
    date: "Août 2026",
    tag: "RDV découverte",
  },
  {
    entityId: "o-006",
    entityType: "opportunite",
    title: "Transformation Agile — SNCF",
    subtitle: "Opportunité · Agilité",
    client: "SNCF",
    status: "active",
    amount: "165 000 €",
    date: "Oct 2026",
    tag: "Négociation",
  },
]

export default function OpportunitesPage() {
  const nbOuvertes = mockOpportunites.filter((o) =>
    ["pending", "active"].includes(o.status)
  ).length

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold font-heading tracking-tight text-heading">
            Opportunités
          </h1>
          <p className="text-sm text-muted mt-1">
            {nbOuvertes} opportunités ouvertes · cliquez une ligne pour ouvrir la fiche
          </p>
        </div>
        <NewOpportunityButton />
      </div>

      <MissionsListView rows={mockOpportunites} emptyMessage="Aucune opportunité." />
    </div>
  )
}
