import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"

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
        "group relative flex min-h-[10.1875rem] w-full select-none flex-col justify-between overflow-hidden rounded-[1.0625rem] border px-3.5 pb-3.5 pt-3 text-left transition-[background-color,border-color,transform,opacity] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass focus-visible:ring-offset-2",
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
          <span className="absolute right-3 top-3 size-2 rounded-full bg-brand-brass" aria-hidden="true" />
        </>
      ) : null}

      <span className={cn(
        "relative flex size-[3.625rem] items-center justify-center rounded-[1rem]",
        isStrong ? "bg-white/12" : "bg-cockpit-cobalt-soft",
      )}>
        <Image
          src={iconSrc}
          alt=""
          width={72}
          height={72}
          className={cn(
            "object-contain transition-transform duration-200 motion-reduce:transition-none group-hover:scale-[1.03] motion-reduce:group-hover:scale-100",
            isStrong ? "size-[3.8125rem]" : "size-[3.625rem]",
          )}
        />
        {isBusy ? (
          <span className="absolute inset-0 flex items-center justify-center rounded-[1rem] bg-cockpit-intelligence/70">
            <span className="size-5 animate-spin rounded-full border-2 border-white/35 border-t-white motion-reduce:animate-none" aria-hidden="true" />
          </span>
        ) : null}
      </span>

      <span className="relative mt-4 flex min-h-8 items-end text-[12.5px] font-bold leading-[1.2]">
        {label}
      </span>

      {state === "coming_soon" ? (
        <span className="absolute right-2.5 top-2.5 rounded-full bg-cockpit-cobalt-soft px-2 py-1 text-[7.5px] font-bold uppercase tracking-[0.12em] text-domain-intelligence">
          À venir
        </span>
      ) : null}
    </button>
  )
}

export type CockpitModuleCardState = "active" | "disabled" | "coming_soon"

function ModuleCardContent({
  label,
  description,
  iconSrc,
  state,
}: {
  label: string
  description: string
  iconSrc: string
  state: CockpitModuleCardState
}) {
  return (
    <>
      <span className="absolute inset-x-0 top-0 h-[3px] bg-brand-brass" aria-hidden="true" />
      <span className="flex size-[2.625rem] shrink-0 items-center justify-center rounded-[0.75rem] border border-white/12 bg-white/10">
        <Image src={iconSrc} alt="" width={52} height={52} className="size-9 object-contain" />
      </span>
      <span className="mt-2 min-w-0">
        <span className="block text-[11.5px] font-bold leading-[1.15] text-white">{label}</span>
        <span className="mt-1 block text-[7.5px] font-medium leading-tight text-white/55">{description}</span>
      </span>
      <svg className="absolute bottom-3 right-3 size-3.5 text-brand-brass transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4} aria-hidden="true">
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
  description,
  icon,
  href,
  state,
  current = false,
  onClick,
}: {
  label: string
  description: string
  icon: keyof typeof MODULE_ICON_PATHS
  href: string
  state: CockpitModuleCardState
  current?: boolean
  onClick?: () => void
}) {
  const className = cn(
    "group relative flex min-h-[6.125rem] w-full flex-col overflow-hidden rounded-[0.875rem] border border-cockpit-intelligence-border bg-cockpit-intelligence p-3 text-left transition-[transform,opacity] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass focus-visible:ring-offset-2",
    state === "active" && !current ? "cursor-pointer hover:-translate-y-0.5 motion-reduce:hover:translate-y-0" : "cursor-not-allowed",
  )
  const content = (
    <ModuleCardContent
      label={label}
      description={description}
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

function ShortcutIcon({ kind }: { kind: CockpitShortcutKind }) {
  const paths: Record<CockpitShortcutKind, ReactNode> = {
    documents: <path strokeLinecap="round" strokeLinejoin="round" d="M4 5.5A1.5 1.5 0 0 1 5.5 4H9l2 2h7.5A1.5 1.5 0 0 1 20 7.5v9A1.5 1.5 0 0 1 18.5 18h-13A1.5 1.5 0 0 1 4 16.5v-11Z" />,
    knowledge: <path strokeLinecap="round" strokeLinejoin="round" d="M5 5.5A2.5 2.5 0 0 1 7.5 3H11v16H7.5A2.5 2.5 0 0 0 5 21V5.5Zm14 0A2.5 2.5 0 0 0 16.5 3H13v16h3.5A2.5 2.5 0 0 1 19 21V5.5Z" />,
    workflows: <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h10M7 17h10M7 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm14 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM7 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm14 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM12 7v10" />,
    settings: <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.25A3.25 3.25 0 1 0 12 8.75a3.25 3.25 0 0 0 0 6.5Zm7-3.25 2-1-2-3.46-2.2.63a7.7 7.7 0 0 0-1.6-.92L14.67 5h-4l-.53 2.25a7.7 7.7 0 0 0-1.6.92l-2.2-.63-2 3.46 1.67 1.55a7.9 7.9 0 0 0 0 1.9L4.34 16l2 3.46 2.2-.63c.5.37 1.03.68 1.6.92l.53 2.25h4l.53-2.25a7.7 7.7 0 0 0 1.6-.92l2.2.63L21 16l-2-1a7.9 7.9 0 0 0 0-3Z" />,
  }

  return (
    <svg className="size-[1.4375rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
      {paths[kind]}
    </svg>
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
    "flex min-h-[4.5rem] min-w-0 flex-col items-center justify-center gap-1.5 rounded-[0.75rem] border border-cockpit-action-border bg-surface px-1 text-center text-domain-intelligence transition-[background-color,transform,opacity] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass focus-visible:ring-offset-2",
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
