"use client"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { FolioStudySubheading } from "./FolioStudyPrimitives"

export function FolioStudySummary({ children, isMobile = false }: { children: ReactNode; isMobile?: boolean }) {
  if (isMobile) {
    return (
      <section className="mb-6 relative">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 shrink-0 rounded flex items-center justify-center bg-[#1E3150]/10 mt-0.5">
            <svg className="w-3.5 h-3.5 text-[#1E3150]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold uppercase tracking-wide text-[#1E3150] text-[10px] mb-2 leading-none mt-1">
              Synthèse du compte
            </h3>
            <div className="text-xs leading-relaxed text-body space-y-2">
              {children}
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <div className="bg-white border border-[#64748B] rounded p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-[#D89B16]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="uppercase text-[11px] font-bold tracking-wider text-[#1E3150]">
          Synthèse du compte
        </h3>
      </div>
      <div className="border-l-2 border-[#64748B] pl-4 text-sm leading-relaxed text-[#334155] space-y-3">
        {children}
      </div>
    </div>
  )
}

export function FolioStudySectionHeader({ title, icon: Icon }: { title: string; icon?: React.ElementType }) {
  return (
    <div className="bg-[#1E3150] px-3.5 py-2.5 border-b border-[#CBD5E1] flex items-center gap-2">
      {Icon && <Icon className="w-3.5 h-3.5 text-[#FBBF24]" aria-hidden="true" />}
      <span className="text-white uppercase font-bold text-[12px] tracking-wider block leading-none pt-[1px]">
        {title}
      </span>
    </div>
  )
}

export function FolioStudySection({
  title,
  icon,
  children,
  isMobile = false,
}: {
  title: string
  icon?: React.ElementType
  children: ReactNode
  isMobile?: boolean
}) {
  if (isMobile) {
    return (
      <section className="mb-6 relative">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 shrink-0 rounded flex items-center justify-center bg-[#1E3150]/10 mt-0.5">
            {icon ? (
              <div className="text-[#1E3150] w-3.5 h-3.5">{(() => { const Icon = icon; return <Icon className="w-3.5 h-3.5" /> })()}</div>
            ) : (
              <svg className="w-3.5 h-3.5 text-[#1E3150]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold uppercase tracking-wide text-[#1E3150] text-[10px] mb-2 leading-none mt-1">
              {title}
            </h3>
            <div className="text-xs leading-relaxed text-body space-y-4">
              {children}
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-lg border border-[#CBD5E1] bg-white overflow-hidden items-start mb-6 last:mb-0">
      <FolioStudySectionHeader title={title} icon={icon} />
      <div className="p-4 space-y-4 text-sm text-[#334155]">
        {children}
      </div>
    </section>
  )
}

export function FolioIdentityGrid({ items }: { items: { label: string; value: ReactNode }[] }) {
  if (items.length === 0) {
    return <p className="text-xs italic text-muted">Données d'identité non disponibles.</p>
  }

  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
      {items.map((item, idx) => (
        <div key={idx} className="flex flex-col gap-1 pb-3 border-b border-[#CBD5E1]/50">
          <dt className="text-[11px] font-bold uppercase text-[#243B63] tracking-wider">{item.label}</dt>
          <dd className="text-xs text-[#334155] leading-snug">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function FolioIdentityRowsMobile({ items }: { items: { label: string; value: ReactNode }[] }) {
  if (items.length === 0) {
    return <p className="text-[10px] italic text-muted">Données d'identité non disponibles.</p>
  }

  return (
    <dl className="space-y-2.5">
      {items.map((item, idx) => (
        <div key={idx} className="flex flex-col gap-0.5">
          <dt className="text-[10px] font-bold uppercase text-[#243B63] tracking-wide">{item.label}</dt>
          <dd className="text-xs text-body leading-relaxed">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
