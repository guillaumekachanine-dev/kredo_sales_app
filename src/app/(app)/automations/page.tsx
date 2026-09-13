import { AutomationsSection } from "@/components/automations"

// Squelette : `./loading.tsx` (un seul par route — audit d'ouverture des pages, O-3).
export default async function AutomationsPage({ searchParams }: { searchParams: Promise<{ run?: string }> }) {
  const { run } = await searchParams
  return <AutomationsSection initialRunId={run} />
}
