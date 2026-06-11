import { SyntheseSection } from "@/components/prospection/synthese"

export const dynamic = "force-dynamic"

// Onglet Synthèse — cockpit décisionnel du portefeuille de prospection (radar de
// signaux, secteurs chauds, pipeline pondéré, comptes à activer). Agrégats réels
// Supabase (RLS workspace). L'exécution/action se pilote dans l'onglet Suivi.
export default function ProspectionPage() {
  return <SyntheseSection />
}
