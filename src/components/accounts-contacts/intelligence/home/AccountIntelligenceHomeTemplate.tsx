"use client"

import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import type {
  AccountIntelligenceAvailability,
  AccountIntelligenceHomeMetric,
  AccountIntelligenceHomeProcessStep,
  AccountIntelligenceHomeTemplateProps,
  AccountIntelligenceHomeToolboxItem,
} from "./account-intelligence-home-template.types"

function ProcessMarker({ state }: { state: AccountIntelligenceAvailability }) {
  if (state === "available") {
    return <span className="size-[18px] shrink-0 rounded-full border-2 border-white bg-brand-brass" aria-hidden="true" />
  }

  if (state === "partial") {
    return (
      <span className="flex size-[18px] shrink-0 items-center justify-center rounded-full border-2 border-white bg-edito-navy" aria-hidden="true">
        <span className="size-1.5 rounded-full bg-brand-brass" />
      </span>
    )
  }

  return <span className="size-[18px] shrink-0 rounded-full border-2 border-white/45 bg-transparent" aria-hidden="true" />
}

function processAriaLabel(step: AccountIntelligenceHomeProcessStep) {
  const status = step.state === "available"
    ? "contenu disponible"
    : step.state === "partial"
      ? "contenu partiel"
      : "contenu indisponible"
  return `${step.label} — ${status}`
}

function ProcessRail({ steps }: { steps: readonly AccountIntelligenceHomeProcessStep[] }) {
  return (
    <nav aria-label="Parcours Account Intelligence" className="absolute left-[7%] top-[13%] h-[74%] w-[34%]">
      <div className="relative h-full">
        <div className="absolute bottom-2 left-[8px] top-2 w-px bg-white/45" aria-hidden="true" />
        <ol className="relative flex h-full flex-col justify-between">
          {steps.map((step) => {
            const content = (
              <>
                <ProcessMarker state={step.state} />
                <span
                  className={
                    step.state === "empty"
                      ? "text-[12px] font-bold leading-4 text-white/48"
                      : "text-[12px] font-bold leading-4 text-white"
                  }
                >
                  {step.label}
                </span>
              </>
            )

            const className = "grid min-h-10 w-full grid-cols-[18px_1fr] items-center gap-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass"

            return (
              <li key={step.id}>
                {step.onClick ? (
                  <button type="button" onClick={step.onClick} className={className} aria-label={processAriaLabel(step)}>
                    {content}
                  </button>
                ) : step.href ? (
                  <a href={step.href} className={className} aria-label={processAriaLabel(step)}>
                    {content}
                  </a>
                ) : (
                  <div className="grid min-h-10 grid-cols-[18px_1fr] items-center gap-4">{content}</div>
                )}
              </li>
            )
          })}
        </ol>
      </div>
    </nav>
  )
}

function MetricContent({ value, label, secondary }: AccountIntelligenceHomeMetric) {
  return (
    <div>
      <div className="text-[clamp(2rem,3.2vw,3.25rem)] font-bold leading-none tracking-tight">{value}</div>
      <div className="mt-2 text-[11px] font-semibold leading-4 opacity-80">{label}</div>
      {secondary ? <div className="mt-0.5 text-[9px] font-semibold leading-3 opacity-65">{secondary}</div> : null}
    </div>
  )
}

function MetricMosaic({ metrics }: { metrics: AccountIntelligenceHomeTemplateProps["metrics"] }) {
  return (
    <div className="relative mt-7 aspect-[2/1.38] w-full overflow-hidden border-2 border-edito-ink bg-edito-surface">
      <div
        className="absolute left-0 top-0 flex h-1/2 w-[55%] items-center justify-center bg-edito-navy px-6 text-center text-white"
        style={{ clipPath: "polygon(0 0, 100% 0, 82% 100%, 0 100%)" }}
      >
        <MetricContent {...metrics[0]} />
      </div>
      <div
        className="absolute right-0 top-0 flex h-1/2 w-[50%] items-center justify-center bg-edito-surface px-6 text-center text-edito-heading"
        style={{ clipPath: "polygon(18% 0, 100% 0, 100% 100%, 0 100%)" }}
      >
        <MetricContent {...metrics[1]} />
      </div>
      <div
        className="absolute bottom-0 left-0 flex h-1/2 w-[50%] items-center justify-center bg-edito-surface px-6 text-center text-edito-heading"
        style={{ clipPath: "polygon(0 0, 82% 0, 100% 100%, 0 100%)" }}
      >
        <MetricContent {...metrics[2]} />
      </div>
      <div
        className="absolute bottom-0 right-0 flex h-1/2 w-[55%] items-center justify-center bg-edito-navy px-6 text-center text-white"
        style={{ clipPath: "polygon(18% 0, 100% 0, 100% 100%, 0 100%)" }}
      >
        <MetricContent {...metrics[3]} />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-edito-ink" />
    </div>
  )
}

function ToolboxIcon({ icon }: { icon: AccountIntelligenceHomeToolboxItem["icon"] }) {
  const common = {
    className: "size-6",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  }

  if (icon === "contacts") {
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 19c.7-3.4 2.5-5.2 5.5-5.2s4.8 1.8 5.5 5.2" />
        <path d="M16 7h4" />
        <path d="M16 11h4" />
        <path d="M17 15h3" />
      </svg>
    )
  }

  if (icon === "documents") {
    return (
      <svg {...common}>
        <path d="M7 3h7l4 4v14H7z" />
        <path d="M14 3v5h5" />
        <path d="M10 13h5" />
        <path d="M10 17h5" />
      </svg>
    )
  }

  return (
    <svg {...common}>
      <path d="M5 4h14v16H5z" />
      <path d="M8 8h8" />
      <path d="M8 12h5" />
      <path d="m8 16 2-2 2 1 4-4" />
    </svg>
  )
}

function ToolboxRow({ item }: { item: AccountIntelligenceHomeToolboxItem }) {
  const content = (
    <>
      <div className="flex size-[52px] shrink-0 items-center justify-center bg-edito-navy text-white">
        <ToolboxIcon icon={item.icon} />
      </div>
      <div className="pt-0.5">
        <h3 className="text-[12px] font-black uppercase tracking-[0.06em] text-edito-ink">{item.title}</h3>
        <p className="mt-1 text-[12px] leading-5 text-edito-body">{item.description}</p>
      </div>
    </>
  )

  const className = "grid w-full grid-cols-[52px_1fr] items-start gap-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"

  if (item.onClick) {
    return (
      <button type="button" onClick={item.onClick} disabled={item.disabled} className={`${className} ${item.disabled ? "cursor-default opacity-45" : ""}`}>
        {content}
      </button>
    )
  }

  if (item.href && !item.disabled) {
    return (
      <a href={item.href} className={className}>
        {content}
      </a>
    )
  }

  return <div className={`${className} ${item.disabled ? "opacity-45" : ""}`}>{content}</div>
}

function WatchStatus({ enabled, label, onToggle, pending }: AccountIntelligenceHomeTemplateProps["watch"]) {
  const switchVisual = (
    <span
      className={`relative inline-flex h-[20px] w-[36px] items-center rounded-full border transition-colors ${
        enabled ? "border-brand-primary bg-brand-primary" : "border-edito-border bg-edito-chip"
      }`}
      aria-hidden="true"
    >
      <span className={`size-[14px] rounded-full bg-white transition-transform ${enabled ? "translate-x-[17px]" : "translate-x-[2px]"}`} />
    </span>
  )

  if (onToggle) {
    return (
      <button
        type="button"
        onClick={onToggle}
        disabled={pending}
        role="switch"
        aria-checked={enabled}
        aria-label={label}
        className="flex shrink-0 items-center gap-2 disabled:cursor-wait disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
      >
        <span className="whitespace-nowrap text-[10px] font-bold text-edito-muted">{label}</span>
        {switchVisual}
      </button>
    )
  }

  return (
    <div className="flex shrink-0 items-center gap-2" role="switch" aria-checked={enabled} aria-label={label}>
      <span className="whitespace-nowrap text-[10px] font-bold text-edito-muted">{label}</span>
      {switchVisual}
    </div>
  )
}

function FooterIcon({ type }: { type: "web" | "status" | "location" }) {
  const common = {
    className: "size-5",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  }

  if (type === "web") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3a14 14 0 0 1 0 18" />
        <path d="M12 3a14 14 0 0 0 0 18" />
      </svg>
    )
  }

  if (type === "status") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 2.5 2.5L16.5 8.5" />
      </svg>
    )
  }

  return (
    <svg {...common}>
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  )
}

function websiteLabel(website?: string | null) {
  if (!website) return "Non renseigné"
  try {
    const url = new URL(website.startsWith("http") ? website : `https://${website}`)
    return url.hostname.replace(/^www\./, "")
  } catch {
    return website
  }
}

export function AccountIntelligenceHomeTemplate({
  account,
  processSteps,
  companySummary,
  facts,
  metrics,
  recentSignal,
  watch,
  toolbox,
}: AccountIntelligenceHomeTemplateProps) {
  return (
    <>
      <style>{`
        .edito-bright-page:has([data-account-intelligence-home]) > .flex.min-w-0.flex-1.flex-col.overflow-hidden > header {
          display: none;
        }
      `}</style>
      <div data-account-intelligence-home className="w-full overflow-hidden border border-edito-border bg-edito-surface">
        <div className="h-16 bg-edito-surface" />

        <section className="relative h-[500px] overflow-hidden border-y border-edito-border">
          <div
            className="absolute inset-0 bg-edito-navy"
            style={{ clipPath: "polygon(0 0, 65% 0, 43% 100%, 0 100%)" }}
          />
          <div
            className="absolute inset-0 bg-edito-surface"
            style={{ clipPath: "polygon(65% 0, 68.2% 0, 46.2% 100%, 43% 100%)" }}
          />
          <div
            className="absolute inset-0 bg-brand-primary"
            style={{ clipPath: "polygon(68.2% 0, 100% 0, 100% 100%, 46.2% 100%)" }}
          />

          <ProcessRail steps={processSteps} />

          <div className="absolute right-[5.8%] top-[11%] w-[34%] text-white">
            <div className="flex items-center justify-end gap-3">
              <div className="min-w-0 text-right">
                <p className="truncate text-[21px] font-bold uppercase leading-none tracking-tight">{account.name}</p>
                <p className="mt-2 truncate text-[10px] font-bold uppercase tracking-[0.2em] text-white/75">{account.segment}</p>
              </div>
              <div className="size-[52px] shrink-0 bg-white p-1.5">
                <CompanyLogo
                  name={account.name}
                  logoPath={account.logoPath}
                  website={account.website}
                  fill
                  className="h-full w-full rounded-none border-0 bg-white text-sm"
                />
              </div>
            </div>

            <div className="mt-12 flex flex-col items-end text-right">
              <div className="inline-flex border-2 border-white bg-edito-surface px-3 py-1.5 text-[27px] font-black uppercase leading-none tracking-tight text-brand-primary-deep">
                Business
              </div>
              <div className="mt-3 text-[clamp(3.2rem,4.45vw,4.6rem)] font-black uppercase leading-[0.88] tracking-[-0.045em]">Account</div>
              <div className="mt-1 whitespace-nowrap text-[clamp(2.55rem,3.75vw,3.9rem)] font-black uppercase leading-[0.9] tracking-[-0.035em]">
                Intelligence
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-[58px] px-[64px] pb-12 pt-[58px]">
          <div id="profil-entreprise">
            <h2 className="text-[34px] font-black leading-none tracking-tight text-edito-ink">Le compte</h2>

            <p className="mt-5 max-h-[96px] max-w-[470px] overflow-hidden text-[14px] leading-6 text-edito-body">{companySummary}</p>

            <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3">
              {facts.map((fact) => (
                <div key={fact.label} className="flex items-start gap-3 text-[12px] leading-5 text-edito-body">
                  <span className="mt-[7px] size-2 shrink-0 bg-brand-primary" aria-hidden="true" />
                  <span>
                    <span className="font-bold text-edito-heading">{fact.label} · </span>
                    {fact.value}
                  </span>
                </div>
              ))}
            </div>

            <MetricMosaic metrics={metrics} />
          </div>

          <div id="actualites-compte">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-[34px] font-black leading-none tracking-tight text-edito-ink">Actualité récente</h2>
              <WatchStatus {...watch} />
            </div>

            {recentSignal ? (
              <div className="mt-5">
                <p className="text-[14px] font-bold leading-5 text-edito-heading">{recentSignal.title}</p>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.06em] text-edito-muted">
                  {recentSignal.dateLabel} · {recentSignal.importanceLabel}
                </p>
                <p className="mt-3 max-h-[72px] overflow-hidden text-[13px] leading-6 text-edito-body">
                  <span className="font-bold text-edito-heading">Implication commerciale · </span>
                  {recentSignal.implication}
                </p>
              </div>
            ) : (
              <p className="mt-5 text-[13px] italic leading-6 text-edito-muted">Aucun signal récent détecté pour ce compte.</p>
            )}

            <h2 className="mt-10 text-[34px] font-black leading-none tracking-tight text-edito-ink">KREDO Toolbox</h2>
            <div className="mt-6 space-y-5">
              {toolbox.map((item) => (
                <ToolboxRow key={item.id} item={item} />
              ))}
            </div>
          </div>
        </section>

        <footer className="mx-[64px] grid grid-cols-3 gap-8 border-t border-edito-border py-8">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full border-2 border-edito-ink text-edito-ink">
              <FooterIcon type="web" />
            </span>
            <div>
              <p className="text-[10px] font-semibold text-edito-muted">Site web</p>
              <p className="text-[12px] font-bold text-edito-ink">{websiteLabel(account.website)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full border-2 border-edito-ink text-edito-ink">
              <FooterIcon type="status" />
            </span>
            <div>
              <p className="text-[10px] font-semibold text-edito-muted">Statut CRM</p>
              <p className="text-[12px] font-bold text-edito-ink">{account.lifecycle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full border-2 border-edito-ink text-edito-ink">
              <FooterIcon type="location" />
            </span>
            <div>
              <p className="text-[10px] font-semibold text-edito-muted">Localisation</p>
              <p className="text-[12px] font-bold text-edito-ink">{account.location}</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}

export type { AccountIntelligenceHomeTemplateProps } from "./account-intelligence-home-template.types"
