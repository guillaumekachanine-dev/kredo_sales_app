import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { getNavigationIcon } from "@/components/layout/navigation-icons"

export type CockpitActionCardState =
  | "default"
  | "active"
  | "selected"
  | "loading"
  | "running"
  | "disabled"
  | "coming_soon"

export function CockpitActionCard({
  label,
  iconSrc,
  state = "default",
  onClick,
}: {
  label: string
  iconSrc: string
  state?: CockpitActionCardState
  onClick?: () => void
}) {
  const isStrong = state === "active" || state === "selected"
  const isBusy = state === "loading" || state === "running"
  const isUnavailable = state === "disabled" || state === "coming_soon"
  const disabled = isBusy || isUnavailable

  return (
    <button
      type="button"
      disabled={disabled}
      aria-busy={isBusy || undefined}
      aria-pressed={state === "selected" || undefined}
      onClick={disabled ? undefined : onClick}
      className={cn(
        "group relative flex h-[6.5rem] w-full select-none flex-col items-start justify-center gap-1.5 overflow-hidden rounded-[0.8125rem] border px-3 py-2.5 text-left transition-[background-color,border-color,transform,opacity] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass focus-visible:ring-offset-2",
        isStrong
          ? "border-brand-brass bg-primary text-white"
          : "border-cockpit-action-border bg-surface text-heading",
        !disabled && "cursor-pointer hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.985] motion-reduce:hover:translate-y-0",
        isUnavailable && "cursor-not-allowed opacity-55",
      )}
    >
      {isStrong ? (
        <>
          <span className="absolute inset-x-0 bottom-0 h-1 bg-brand-brass" aria-hidden="true" />
          <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-brand-brass" aria-hidden="true" />
        </>
      ) : null}

      <span className={cn(
        "relative flex size-[2.625rem] items-center justify-center rounded-[0.625rem]",
        isStrong ? "bg-white/12" : "bg-cockpit-cobalt-soft",
      )}>
        <Image
          src={iconSrc}
          alt=""
          width={56}
          height={56}
          className={cn(
            "object-contain transition-transform duration-200 motion-reduce:transition-none group-hover:scale-[1.03] motion-reduce:group-hover:scale-100",
            isStrong ? "size-[2.75rem]" : "size-[2.625rem]",
          )}
        />
        {isBusy ? (
          <span className="absolute inset-0 flex items-center justify-center rounded-[0.75rem] bg-cockpit-intelligence/70">
            <span className="size-4 animate-spin rounded-full border-2 border-white/35 border-t-white motion-reduce:animate-none" aria-hidden="true" />
          </span>
        ) : null}
      </span>

      <span className="relative line-clamp-2 text-[12px] font-bold leading-[1.2]">
        {label}
      </span>

      {state === "coming_soon" ? (
        <span className="absolute right-2 top-2 rounded-full bg-cockpit-cobalt-soft px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.1em] text-domain-intelligence">
          À venir
        </span>
      ) : null}
    </button>
  )
}

export type CockpitModuleCardState = "active" | "disabled" | "coming_soon"

function ModuleCardContent({
  label,
  icon,
  state,
}: {
  label: string
  icon: CockpitMobileModuleIcon
  state: CockpitModuleCardState
}) {
  return (
    <>
      <span className="absolute inset-x-0 top-0 h-[3px] bg-brand-brass" aria-hidden="true" />
      <span className="flex size-[2rem] shrink-0 items-center justify-center rounded-[0.5rem] border border-white/12 bg-white/10 text-white" aria-hidden="true">
        <CockpitModuleIcon icon={icon} />
      </span>
      <span className="min-w-0 pr-4">
        <span className="line-clamp-2 text-[12px] font-bold leading-[1.2] text-white">{label}</span>
      </span>
      <svg className="absolute bottom-2.5 right-2.5 size-3 text-brand-brass transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
      </svg>
      {state === "coming_soon" ? (
        <span className="absolute right-2 top-2 rounded-full bg-white/12 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.1em] text-white/70">À venir</span>
      ) : null}
    </>
  )
}

type CockpitMobileModuleIcon =
  | "financial_modeling"
  | "activity_leave"
  | "write_pitch"
  | "report_summary"

function CockpitModuleIcon({ icon }: { icon: CockpitMobileModuleIcon }) {
  if (icon === "write_pitch") {
    return (
      <svg className="size-[1.125rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 5.75h11.25a2 2 0 0 1 2 2v2.5M4.5 5.75a2 2 0 0 0-2 2v8.5a2 2 0 0 0 2 2h8.25M4.5 5.75l5.75 4.5a2.75 2.75 0 0 0 3.5 0l4-3.13M15 18.25l4.8-4.8a1.41 1.41 0 0 1 2 2l-4.8 4.8-3 .75.75-3Z" />
      </svg>
    )
  }

  const navigationIcon = icon === "financial_modeling"
    ? "finance"
    : icon === "activity_leave"
      ? "calendar"
      : "reports"

  return getNavigationIcon(navigationIcon, "size-[1.125rem]", 1.9)
}

export function CockpitModuleCard({
  label,
  icon,
  href,
  state,
  current = false,
  onClick,
}: {
  label: string
  description?: string
  icon: CockpitMobileModuleIcon
  href?: string
  state: CockpitModuleCardState
  current?: boolean
  onClick?: () => void
}) {
  const className = cn(
    "group relative flex h-[5rem] w-full flex-col items-start justify-center gap-1 overflow-hidden rounded-[0.75rem] border border-cockpit-intelligence-border bg-cockpit-intelligence p-2 text-left transition-[transform,opacity] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass focus-visible:ring-offset-2",
    state === "active" && !current ? "cursor-pointer hover:-translate-y-0.5 motion-reduce:hover:translate-y-0" : "cursor-not-allowed",
  )
  const content = (
    <ModuleCardContent
      label={label}
      icon={icon}
      state={state}
    />
  )

  if (state === "active" && !current) {
    if (onClick) {
      return <button type="button" onClick={onClick} className={className}>{content}</button>
    }
    if (href) {
      return <Link href={href} className={className}>{content}</Link>
    }
  }

  return <button type="button" disabled aria-current={current ? "page" : undefined} className={className}>{content}</button>
}
