"use client"

interface TimelineRecordDisclosureProps {
  notes: string | null | undefined
}

export function TimelineRecordDisclosure({ notes }: TimelineRecordDisclosureProps) {
  if (!notes?.trim()) return null

  return (
    <details className="group mt-1">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-[10px] font-semibold text-primary transition-opacity hover:opacity-75 focus-visible:outline-none focus-visible:underline">
        <span>Notes et compte-rendu</span>
        <svg
          className="size-2.5 transition-transform duration-150 group-open:rotate-180"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m3 4.5 3 3 3-3" />
        </svg>
      </summary>
      <div
        className="mt-1.5 border-l-2 pl-2.5 text-[10px] leading-relaxed whitespace-pre-wrap"
        style={{ borderColor: "var(--color-border)", color: "var(--color-body)" }}
      >
        {notes}
      </div>
    </details>
  )
}
