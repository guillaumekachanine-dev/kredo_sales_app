import type { ReactNode } from "react"

export function BusinessIntelligenceChapterState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <section className="mx-auto my-6 max-w-2xl border border-border bg-surface/35 px-5 py-8 text-center"><h2 className="font-heading text-lg font-bold text-heading">{title}</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-body">{description}</p>{action ? <div className="mt-4 flex justify-center">{action}</div> : null}</section>
}
