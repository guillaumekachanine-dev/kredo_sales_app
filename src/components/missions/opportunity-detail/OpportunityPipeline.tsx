import { cn } from "@/lib/utils"

interface OpportunityPipelineProps {
  stage: string
  updatedAt: string
}

const PIPELINE_STEPS = [
  "Demande",
  "Qualification",
  "Recherche de profils",
  "Profils envoyés",
  "Entretiens",
  "Proposition",
  "Contractualisation",
  "Gagné ou perdu",
] as const

function getCurrentStep(stage: string) {
  if (stage === "qualification") return 1
  if (stage === "recherche_profil") return 2
  if (stage === "cv_envoyes") return 3
  if (stage === "entretien_client") return 4
  if (stage === "contractualisation") return 6
  if (["gagne", "perdu", "abandonne"].includes(stage)) return 7
  return 0
}

function getStageDuration(updatedAt: string) {
  const updated = new Date(updatedAt).getTime()
  if (!Number.isFinite(updated)) return null
  const elapsed = Math.max(0, Date.now() - updated)
  const days = Math.max(1, Math.floor(elapsed / 86_400_000))
  return `${days} jour${days > 1 ? "s" : ""} dans cette étape`
}

export function OpportunityPipeline({ stage, updatedAt }: OpportunityPipelineProps) {
  const currentStep = getCurrentStep(stage)
  const duration = getStageDuration(updatedAt)

  return (
    <section aria-label="Progression du pipeline" className="py-6">
      <ol className="grid grid-cols-8 items-start">
        {PIPELINE_STEPS.map((label, index) => {
          const completed = index < currentStep
          const current = index === currentStep

          return (
            <li
              key={label}
              className={cn(
                "relative min-w-0 text-center",
                completed && "kredo-timeline-tab",
              )}
            >
              {index > 0 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute right-1/2 top-3.5 h-px w-full",
                    index <= currentStep ? "bg-primary" : "bg-border",
                  )}
                />
              ) : null}
              <span
                className={cn(
                  "relative z-10 mx-auto flex size-7 items-center justify-center rounded-full border bg-canvas text-[11px] font-bold",
                  completed && "kredo-timeline-step kredo-timeline-step--amber border-warning bg-warning text-secondary-fg",
                  current && "border-primary bg-primary text-primary-fg ring-4 ring-primary/15",
                  !completed && !current && "border-border text-muted",
                )}
                aria-current={current ? "step" : undefined}
              >
                {completed ? "✓" : index + 1}
              </span>
              <p
                className={cn(
                  "mx-auto mt-2 max-w-28 text-[10px] font-semibold leading-4",
                  current ? "text-primary" : completed ? "text-heading" : "text-muted",
                )}
              >
                {label}
              </p>
              {current && duration ? (
                <p className="mt-1 text-[9px] font-medium text-primary">{duration}</p>
              ) : null}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
