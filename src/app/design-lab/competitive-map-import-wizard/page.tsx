import type { Metadata } from "next"
import { CompetitiveMapImportWizardLab } from "./CompetitiveMapImportWizardLab"

export const metadata: Metadata = {
  title: "Design Lab · Import cartographie",
  description: "Deux propositions desktop interactives pour le wizard d'import de cartographie concurrentielle.",
}

export default function Page() {
  return <CompetitiveMapImportWizardLab />
}
