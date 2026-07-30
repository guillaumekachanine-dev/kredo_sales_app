import { AgendaSection } from "@/components/agenda/AgendaSection"

interface AgendaPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default function AgendaPage({ searchParams }: AgendaPageProps) {
  return <AgendaSection searchParams={searchParams} />
}
