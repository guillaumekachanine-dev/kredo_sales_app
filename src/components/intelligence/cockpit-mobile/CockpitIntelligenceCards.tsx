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

export type CockpitModuleCardState = "active" | "disabled" | "coming_soon"

export type CockpitMobileModuleIcon =
  | "financial_modeling"
  | "activity_leave"
  | "write_pitch"
  | "report_summary"

function CockpitCardBaseLayout({
  label,
  iconContent,
  isComingSoon,
  isBusy,
}: {
  label: string
  iconContent: React.ReactNode
  isComingSoon?: boolean
  isBusy?: boolean
}) {
  return (
    <>
      {/* Liseré supérieur jaune ambre */}
      <span className="absolute inset-x-0 top-0 h-[3px] bg-cockpit-amber" aria-hidden="true" />

      {/* Pictogramme à gauche */}
      <span
        className="relative flex size-[2.25rem] shrink-0 items-center justify-center rounded-[0.5625rem] border border-white/12 bg-white/10 text-white"
        aria-hidden="true"
      >
        {iconContent}
        {isBusy ? (
          <span className="absolute inset-0 flex items-center justify-center rounded-[0.5625rem] bg-cockpit-intelligence/85">
            <span
              className="size-3.5 animate-spin rounded-full border-2 border-white/35 border-t-white motion-reduce:animate-none"
              aria-hidden="true"
            />
          </span>
        ) : null}
      </span>

      {/* Titre et flèche ambre sur la même ligne horizontale */}
      <div className="flex min-w-0 flex-1 items-center justify-between gap-1 pr-0.5">
        <span className="line-clamp-2 text-[12px] font-bold leading-[1.2] text-white">
          {label}
        </span>
        <svg
          className="size-3 shrink-0 text-cockpit-amber transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.4}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
        </svg>
      </div>

      {isComingSoon ? (
        <span className="absolute right-1.5 top-1.5 rounded-full bg-white/12 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.1em] text-white/70">
          À venir
        </span>
      ) : null}
    </>
  )
}

function CockpitModuleIcon({ icon }: { icon: CockpitMobileModuleIcon }) {
  if (icon === "write_pitch") {
    return (
      <svg className="size-[1.25rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 5.75h11.25a2 2 0 0 1 2 2v2.5M4.5 5.75a2 2 0 0 0-2 2v8.5a2 2 0 0 0 2 2h8.25M4.5 5.75l5.75 4.5a2.75 2.75 0 0 0 3.5 0l4-3.13M15 18.25l4.8-4.8a1.41 1.41 0 0 1 2 2l-4.8 4.8-3 .75.75-3Z" />
      </svg>
    )
  }

  const navigationIcon = icon === "financial_modeling"
    ? "finance"
    : icon === "activity_leave"
      ? "calendar"
      : "reports"

  return getNavigationIcon(navigationIcon, "size-[1.25rem]", 1.9)
}

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
        "group relative flex h-[5.5rem] w-full select-none items-center gap-2.5 overflow-hidden rounded-[0.75rem] border border-cockpit-intelligence-border bg-cockpit-intelligence p-2.5 text-left transition-[transform,opacity] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cockpit-amber focus-visible:ring-offset-2",
        !disabled
          ? "cursor-pointer hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.985] motion-reduce:hover:translate-y-0"
          : "cursor-not-allowed opacity-55",
      )}
    >
      <CockpitCardBaseLayout
        label={label}
        iconContent={
          <Image
            src={iconSrc}
            alt=""
            width={48}
            height={48}
            className="size-6 object-contain"
          />
        }
        isComingSoon={state === "coming_soon"}
        isBusy={isBusy}
      />
    </button>
  )
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
  const isInteractive = state === "active" && !current
  const className = cn(
    "group relative flex h-[5.5rem] w-full select-none items-center gap-2.5 overflow-hidden rounded-[0.75rem] border border-cockpit-grey-border bg-cockpit-grey p-2.5 text-left transition-[transform,opacity] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cockpit-amber focus-visible:ring-offset-2",
    isInteractive
      ? "cursor-pointer hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.985] motion-reduce:hover:translate-y-0"
      : "cursor-not-allowed opacity-60",
  )

  const content = (
    <CockpitCardBaseLayout
      label={label}
      iconContent={<CockpitModuleIcon icon={icon} />}
      isComingSoon={state === "coming_soon"}
    />
  )

  if (isInteractive) {
    if (onClick) {
      return (
        <button type="button" onClick={onClick} className={className}>
          {content}
        </button>
      )
    }
    if (href) {
      return (
        <Link href={href} className={className}>
          {content}
        </Link>
      )
    }
  }

  return (
    <button
      type="button"
      disabled
      aria-current={current ? "page" : undefined}
      className={className}
    >
      {content}
    </button>
  )
}
