"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"

export function BusinessIntelligenceErrorState({ segmentName, message, device }: { segmentName: string | null; message: string; device: "desktop" | "mobile" }) {
  const router = useRouter()
  return <main className={device === "mobile" ? "min-h-dvh bg-canvas px-4 py-10 text-body" : "flex min-h-screen items-center justify-center bg-edito-canvas p-8 text-edito-body"}>
    <section className={device === "mobile" ? "border border-border bg-surface p-5" : "max-w-lg rounded-xl border border-edito-border bg-edito-surface p-6 text-center"}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Business Intelligence</p>
      <h1 className="mt-2 font-heading text-lg font-bold text-heading">Workspace indisponible{segmentName ? ` — ${segmentName}` : ""}</h1>
      <p className="mt-2 text-sm leading-relaxed text-body">{message}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2"><Button variant="secondary" onClick={() => router.refresh()}>Réessayer</Button><Link href="/intelligence" className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-medium)] border border-border bg-surface px-4 text-sm font-semibold text-heading hover:bg-surface-hover">Changer de segment</Link></div>
    </section>
  </main>
}
