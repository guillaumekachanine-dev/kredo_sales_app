import { CompetitiveMapImportWizard } from "@/features/competitive-map/components/CompetitiveMapImportWizard"
import { loadSegmentReferential } from "@/features/competitive-map/data/load-segment-referential"

export default async function CompetitiveMapImportPage() {
  const segments = await loadSegmentReferential()
  return <CompetitiveMapImportWizard segments={segments} />
}
