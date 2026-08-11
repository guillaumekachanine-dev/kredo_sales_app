import { cn } from "@/lib/utils"

const categoryIconStyles: Record<string, string> = {
  "clients-markets": "bg-dataviz-1/12 text-dataviz-1",
  "expertise-kredo": "bg-edito-brass/15 text-edito-brass",
  talents: "bg-dataviz-4/15 text-dataviz-4",
  "delivery-feedback": "bg-dataviz-5/15 text-dataviz-5",
  "ao-proposals": "bg-brand-ember/12 text-brand-ember",
  "internal-resources": "bg-edito-petrol/12 text-edito-petrol",
}

function CategoryGlyph({ domainId }: { domainId: string }) {
  if (domainId === "clients-markets") {
    return (
      <>
        <circle cx="8" cy="8" r="2.25" />
        <circle cx="16" cy="7" r="1.75" />
        <path d="M3.75 17.5c.55-3 2-4.5 4.25-4.5s3.7 1.5 4.25 4.5M13 13.5c2.65-.65 4.55.7 5.25 3.5" />
      </>
    )
  }

  if (domainId === "expertise-kredo") {
    return (
      <>
        <path d="m12 3 2.1 4.9L19 10l-4.9 2.1L12 17l-2.1-4.9L5 10l4.9-2.1L12 3Z" />
        <path d="m18.5 15 .8 1.7 1.7.8-1.7.8-.8 1.7-.8-1.7-1.7-.8 1.7-.8.8-1.7Z" />
      </>
    )
  }

  if (domainId === "talents") {
    return (
      <>
        <circle cx="12" cy="8" r="3" />
        <path d="M5.5 19c.8-4 3-6 6.5-6s5.7 2 6.5 6" />
        <path d="m18 5 .55 1.45L20 7l-1.45.55L18 9l-.55-1.45L16 7l1.45-.55L18 5Z" />
      </>
    )
  }

  if (domainId === "delivery-feedback") {
    return (
      <>
        <path d="M5 5.5h14v10H9l-4 3v-13Z" />
        <path d="m9 10 2 2 4-4" />
      </>
    )
  }

  if (domainId === "ao-proposals") {
    return (
      <>
        <path d="M7 3.5h7l3 3v14H7v-17Z" />
        <path d="M14 3.5v3h3M10 11h4M10 15h4" />
      </>
    )
  }

  return (
    <>
      <path d="M4 8.5h16v11H4v-11Z" />
      <path d="M7 8.5V5h4l2 2h4v1.5M8 13h8M8 16h5" />
    </>
  )
}

export function KnowledgeHubCategoryIcon({
  domainId,
  className,
}: {
  domainId: string
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-md transition-transform duration-200 group-hover:-translate-y-0.5 motion-reduce:transition-none",
        categoryIconStyles[domainId] ?? "bg-edito-chip text-edito-navy",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-[1.125rem]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <CategoryGlyph domainId={domainId} />
      </svg>
    </span>
  )
}
