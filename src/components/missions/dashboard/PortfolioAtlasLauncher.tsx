"use client"

import dynamic from "next/dynamic"
import { useState } from "react"
import type { EngagementsPortfolioViewModel } from "./engagements-portfolio-types"

const PortfolioAtlasDialog = dynamic(
  () => import("./PortfolioAtlasDialog").then((module) => module.PortfolioAtlasDialog),
  { ssr: false, loading: () => null },
)

interface PortfolioAtlasLauncherProps { overview: EngagementsPortfolioViewModel; compact?: boolean }

export function PortfolioAtlasLauncher({ overview, compact = false }: PortfolioAtlasLauncherProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={compact ? "min-h-11 rounded-full border border-primary/25 bg-primary/5 px-3 text-[10px] font-black text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" : "group inline-flex min-h-9 items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-3 text-[10px] font-black text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 motion-reduce:transition-none"}>
        <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4"><circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M3 10h14M10 3c2 2 3 4.3 3 7s-1 5-3 7c-2-2-3-4.3-3-7s1-5 3-7Z" fill="none" stroke="currentColor" strokeWidth="1.2"/></svg>
        {compact ? "Atlas" : "Atlas du portefeuille"}
      </button>
      {open && <PortfolioAtlasDialog open={open} onOpenChange={setOpen} overview={overview} />}
    </>
  )
}
