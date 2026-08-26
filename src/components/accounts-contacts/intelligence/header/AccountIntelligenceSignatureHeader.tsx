"use client"

import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import type { ClientIntelligenceData } from "@/lib/intelligence/intelligence-data"
import type { TabKey } from "../intelligence-process"

const TAB_LABELS: Record<TabKey, string> = {
  accueil: "Account Intelligence",
  socle: "Socle",
  connaissance: "Entreprise",
  secteur: "Secteur",
  enjeux: "Enjeux",
  strategie: "Stratégie",
  roadmap: "Roadmap",
}

export function getAccountIntelligenceTabLabel(tab: TabKey): string {
  return TAB_LABELS[tab]
}

type SignatureHeaderProps = {
  company: ClientIntelligenceData["company"]
  title: string
}

function HeaderPlanes() {
  return (
    <>
      <div
        className="absolute inset-0 bg-edito-navy"
        style={{ clipPath: "polygon(0 0, 66% 0, 61% 100%, 0 100%)" }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-edito-surface"
        style={{ clipPath: "polygon(66% 0, 69% 0, 64% 100%, 61% 100%)" }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-account-intelligence-petrol"
        style={{ clipPath: "polygon(69% 0, 100% 0, 100% 100%, 64% 100%)" }}
        aria-hidden="true"
      />
    </>
  )
}

function AccountIdentity({ company, compact = false }: { company: SignatureHeaderProps["company"]; compact?: boolean }) {
  return (
    <div className="relative z-10 flex min-w-0 items-center gap-3">
      <div className={compact ? "size-8 shrink-0 bg-white p-1" : "size-10 shrink-0 bg-white p-1"}>
        <CompanyLogo
          name={company.name}
          logoPath={company.logoPath}
          website={company.website}
          fill
          className="h-full w-full rounded-none border-0 bg-white text-xs"
        />
      </div>
      <p className={compact
        ? "max-w-[34vw] truncate text-[13px] font-black uppercase tracking-[0.025em] text-white"
        : "max-w-[34rem] truncate text-[17px] font-black uppercase tracking-[0.035em] text-white"
      }>
        {company.name}
      </p>
    </div>
  )
}

export function AccountIntelligenceSignatureHeaderDesktop({ company, title }: SignatureHeaderProps) {
  return (
    <header className="relative h-[88px] shrink-0 overflow-hidden border-b border-edito-border">
      <HeaderPlanes />
      <div className="absolute inset-y-0 left-[4.5%] flex items-center">
        <AccountIdentity company={company} />
      </div>
      <div className="absolute inset-y-0 right-[5%] z-10 flex w-[29%] items-center justify-end text-right">
        <h1 className="truncate text-[18px] font-black uppercase tracking-[0.12em] text-white">
          {title}
        </h1>
      </div>
    </header>
  )
}

export function AccountIntelligenceSignatureHeaderMobile({
  company,
  title,
  onBack,
}: SignatureHeaderProps & { onBack?: () => void }) {
  return (
    <header className="relative h-[72px] shrink-0 overflow-hidden border-b border-edito-border">
      <HeaderPlanes />
      <div className="absolute inset-y-0 left-3 z-10 flex min-w-0 items-center gap-1.5">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex size-10 shrink-0 items-center justify-center text-white/85 transition-colors active:text-white"
            aria-label="Retour à l’accueil Account Intelligence"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
        ) : null}
        <AccountIdentity company={company} compact />
      </div>
      <div className="absolute inset-y-0 right-3 z-10 flex w-[34%] items-center justify-end text-right">
        <h1 className="line-clamp-2 text-[11px] font-black uppercase leading-[1.15] tracking-[0.09em] text-white">
          {title}
        </h1>
      </div>
    </header>
  )
}
