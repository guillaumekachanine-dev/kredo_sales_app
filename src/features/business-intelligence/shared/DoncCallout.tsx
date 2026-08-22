import { cn } from "@/lib/utils"

const LABEL_PATTERN = /^\s*donc,?\s*commercialement\s*:?\s*/i

/**
 * Callout transverse "DONC, commercialement". Le corpus E4 préfixe déjà la plupart de ses
 * phrases de conclusion par ce label — on le retire du texte pour ne jamais le doubler avec
 * le badge, qu'il soit présent ou non dans `text`.
 */
function stripLabel(text: string): string {
  return text.replace(LABEL_PATTERN, "").trim()
}

export type DoncCalloutProps = {
  text: string
  className?: string
}

export function DoncCallout({ text, className }: DoncCalloutProps) {
  const body = stripLabel(text)
  if (body.length === 0) return null

  return (
    <p
      className={cn(
        "border-l-2 border-edito-brass bg-edito-amber-soft/40 py-1.5 pl-3 pr-2 text-xs leading-relaxed text-edito-ink",
        className,
      )}
    >
      <span className="mr-1.5 font-bold uppercase tracking-wide text-edito-brass">
        Donc, commercialement
      </span>
      {body}
    </p>
  )
}
