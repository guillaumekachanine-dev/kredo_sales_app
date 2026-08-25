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
        "group relative flex min-h-[7.25rem] w-full select-none flex-col justify-between overflow-hidden rounded-[0.9375rem] border px-3 pb-3 pt-2.5 text-left transition-[background-color,border-color,transform,opacity] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass focus-visible:ring-offset-2",
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
        "relative flex size-[2.875rem] items-center justify-center rounded-[0.75rem]",
        isStrong ? "bg-white/12" : "bg-cockpit-cobalt-soft",
      )}>
        <Image
          src={iconSrc}
          alt=""
          width={56}
          height={56}
          className={cn(
            "object-contain transition-transform duration-200 motion-reduce:transition-none group-hover:scale-[1.03] motion-reduce:group-hover:scale-100",
            isStrong ? "size-[3rem]" : "size-[2.875rem]",
          )}
        />
        {isBusy ? (
          <span className="absolute inset-0 flex items-center justify-center rounded-[0.75rem] bg-cockpit-intelligence/70">
            <span className="size-4 animate-spin rounded-full border-2 border-white/35 border-t-white motion-reduce:animate-none" aria-hidden="true" />
          </span>
        ) : null}
      </span>

      <span className="relative mt-2 flex min-h-6 items-end text-[11.5px] font-bold leading-[1.15]">
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
  iconSrc,
  state,
}: {
  label: string
  iconSrc: string
  state: CockpitModuleCardState
}) {
  return (
    <>
      <span className="absolute inset-x-0 top-0 h-[3px] bg-brand-brass" aria-hidden="true" />
      <span className="flex size-[2.375rem] shrink-0 items-center justify-center rounded-[0.625rem] border border-white/12 bg-white/10">
        <Image src={iconSrc} alt="" width={44} height={44} className="size-7 object-contain" />
      </span>
      <span className="mt-1.5 min-w-0 pr-4">
        <span className="block text-[11.5px] font-bold leading-[1.15] text-white">{label}</span>
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

const MODULE_ICON_PATHS = {
  financial_modeling: "/icons_set/cockpit_intelligence/rapport_financier_ai.png",
  activity_leave: "/icons_set/date.png",
} as const

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
  icon: keyof typeof MODULE_ICON_PATHS
  href: string
  state: CockpitModuleCardState
  current?: boolean
  onClick?: () => void
}) {
  const className = cn(
    "group relative flex min-h-[4.5rem] w-full flex-col justify-between overflow-hidden rounded-[0.875rem] border border-cockpit-intelligence-border bg-cockpit-intelligence p-2.5 text-left transition-[transform,opacity] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass focus-visible:ring-offset-2",
    state === "active" && !current ? "cursor-pointer hover:-translate-y-0.5 motion-reduce:hover:translate-y-0" : "cursor-not-allowed",
  )
  const content = (
    <ModuleCardContent
      label={label}
      iconSrc={MODULE_ICON_PATHS[icon]}
      state={state}
    />
  )

  if (state === "active" && !current) {
    if (onClick) {
      return <button type="button" onClick={onClick} className={className}>{content}</button>
    }
    return <Link href={href} className={className}>{content}</Link>
  }

  return <button type="button" disabled aria-current={current ? "page" : undefined} className={className}>{content}</button>
}

export type CockpitShortcutKind = "documents" | "knowledge" | "workflows" | "settings"

const SHORTCUT_NAV_ICON_KEYS: Record<CockpitShortcutKind, string> = {
  documents: "reports",
  knowledge: "knowledge",
  workflows: "automations",
  settings: "settings",
}

function ShortcutIcon({ kind }: { kind: CockpitShortcutKind }) {
  return (
    <span className="flex size-6 items-center justify-center text-domain-intelligence [&_svg]:size-4.5">
      {getNavigationIcon(SHORTCUT_NAV_ICON_KEYS[kind])}
    </span>
  )
}

export function CockpitShortcutCard({
  label,
  href,
  kind,
  current = false,
}: {
  label: string
  href: string
  kind: CockpitShortcutKind
  current?: boolean
}) {
  const className = cn(
    "flex min-h-[4.25rem] min-w-0 flex-col items-center justify-center gap-1 rounded-[0.75rem] border border-cockpit-action-border bg-surface px-1 text-center text-domain-intelligence transition-[background-color,transform,opacity] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass focus-visible:ring-offset-2",
    current ? "cursor-default bg-cockpit-cobalt-soft opacity-65" : "hover:-translate-y-0.5 hover:bg-cockpit-cobalt-soft motion-reduce:hover:translate-y-0",
  )
  const content = (
    <>
      <ShortcutIcon kind={kind} />
      <span className="w-full truncate text-[9px] font-bold leading-none">{label}</span>
    </>
  )

  if (current) {
    return <button type="button" disabled aria-current="page" className={className}>{content}</button>
  }

  return <Link href={href} className={className}>{content}</Link>
}
