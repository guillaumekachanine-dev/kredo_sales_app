import { AgendaSection } from "@/components/agenda/AgendaSection"

export const dynamic = "force-dynamic"

interface AgendaPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default function AgendaPage({ searchParams }: AgendaPageProps) {
  return <AgendaSection searchParams={searchParams} />
}
