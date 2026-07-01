import { AlertBlock } from "@/components/ui/AlertBlock"
import { getAgendaSourceLabel } from "./agenda-desktop-model"

interface AgendaPartialDataNoticeProps {
  sources: string[]
}

export function AgendaPartialDataNotice({ sources }: AgendaPartialDataNoticeProps) {
  if (sources.length === 0) return null

  const labels = sources.map(getAgendaSourceLabel).join(", ")

  return (
    <AlertBlock
      variant="warning"
      title="Snapshot partiel"
      description={`Certaines sources n'ont pas répondu : ${labels}. Les autres données restent consultables.`}
      icon={(
        <svg viewBox="0 0 20 20" fill="none" className="size-5" aria-hidden="true">
          <path
            d="M10 3.5L17 16.5H3L10 3.5Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M10 7.5V11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="10" cy="14" r="0.75" fill="currentColor" />
        </svg>
      )}
    />
  )
}
