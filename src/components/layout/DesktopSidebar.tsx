"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useTransition, useState, useEffect } from "react"
import { MainMenuItem, mainMenuItems, getActiveModuleHref } from "@/lib/navigation/main-menu.config"
import { getNavigationIcon } from "./navigation-icons"
import { cn } from "@/lib/utils"
import { IconButton } from "@/components/ui/IconButton"
import { useSidebarCollapse } from "@/hooks/use-sidebar-collapse"

// ─────────────────────────────────────────────────────────────────────────────
//  Cookie helpers
// ─────────────────────────────────────────────────────────────────────────────

const SIDEBAR_COOKIE = "kredo_sidebar_collapsed"

function persistCollapsed(collapsed: boolean) {
  document.cookie = `${SIDEBAR_COOKIE}=${collapsed}; path=/; max-age=31536000; SameSite=Lax`
}

// ─────────────────────────────────────────────────────────────────────────────
//  Toggle icon — chevron orienté selon l'état
// ─────────────────────────────────────────────────────────────────────────────

function SidebarToggleIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      className="w-3.5 h-3.5 transition-transform duration-[var(--motion-duration-base)]"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      {collapsed ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
      )}
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  ModuleItem — un lien de navigation dans la sidebar
// ─────────────────────────────────────────────────────────────────────────────

function ModuleItem({
  item,
  pathname,
  isCollapsed,
  activeModuleHref,
}: {
  item: MainMenuItem
  pathname: string
  isCollapsed: boolean
  activeModuleHref: string | null
}) {
  const isActive = item.href ? item.href === activeModuleHref : false

  const canNavigate = !item.disabled && !item.comingSoon && !!item.href

  const baseClasses = cn(
    "flex w-full items-center rounded-[var(--radius-medium)] py-2 text-xs font-medium",
    "border-l-[3px]",
    "transition-[background-color,color,border-color,opacity] duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-standard)]",
    "focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-white/40 focus-visible:ring-offset-0",
    isCollapsed
      ? "justify-center px-0"
      : "gap-2.5 pl-[calc(0.75rem_-_3px)] pr-3",
    isActive
      ? "bg-white/16 text-brand-brass font-semibold border-brand-brass"
      : "text-primary-fg/75 hover:bg-white/8 hover:text-primary-fg border-transparent",
    !canNavigate && "pointer-events-none cursor-not-allowed opacity-50",
  )

  const content = (
    <div
      className={cn(
        "flex items-center w-full",
        isCollapsed ? "justify-center" : "justify-between",
      )}
    >
      <div className={cn("flex items-center", isCollapsed ? "" : "gap-2.5")}>
        {item.icon && getNavigationIcon(item.icon)}
        {!isCollapsed && <span className="truncate">{item.label}</span>}
      </div>
      {!isCollapsed && item.comingSoon && (
        <span className="shrink-0 rounded-full border border-white/16 bg-white/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-primary-fg/72">
          Bientôt
        </span>
      )}
    </div>
  )

  if (canNavigate) {
    return (
      <Link
        href={item.href!}
        className={baseClasses}
        aria-label={isCollapsed ? item.label : undefined}
        aria-current={isActive ? "page" : undefined}
        title={isCollapsed ? item.label : undefined}
      >
        {content}
      </Link>
    )
  }

  return (
    <div
      className={baseClasses}
      aria-label={isCollapsed ? item.label : undefined}
      title={isCollapsed ? item.label : undefined}
    >
      {content}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  DesktopSidebar
//
//  État persisté via cookie `kredo_sidebar_collapsed` lu côté serveur dans
//  AppShell et injecté en prop — évite le flash de layout à l'hydratation.
// ─────────────────────────────────────────────────────────────────────────────

interface DesktopSidebarProps {
  defaultCollapsed?: boolean
}

export function DesktopSidebar({ defaultCollapsed = false }: DesktopSidebarProps) {
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)
  const activeModuleHref = getActiveModuleHref(pathname)
  const pendingRequest = useSidebarCollapse((s) => s.pendingRequest)
  const reportState = useSidebarCollapse((s) => s.reportState)
  const consumeRequest = useSidebarCollapse((s) => s.consumeRequest)

  // Reporte l'état réel de la sidebar au store partagé — sert de référence
  // au panneau Cockpit Intelligence pour savoir si elle était dépliée avant
  // son ouverture (et donc si elle doit se redéplier à sa fermeture).
  useEffect(() => {
    reportState(isCollapsed)
  }, [isCollapsed, reportState])

  // Applique une requête de repli/dépli émise par le panneau Cockpit
  // Intelligence, sans jamais écraser un toggle manuel de l'utilisateur
  // ni persister ce repli automatique dans le cookie (préférence durable).
  useEffect(() => {
    if (pendingRequest === null) return
    setIsCollapsed(pendingRequest) // eslint-disable-line react-hooks/set-state-in-effect -- synchronise avec le store Zustand externe (bus de requêtes one-shot), pas un état dérivé
    consumeRequest()
  }, [pendingRequest, consumeRequest])

  const toggle = () => {
    const next = !isCollapsed
    setIsCollapsed(next)
    persistCollapsed(next)
  }

  return (
    <aside
      aria-label="Navigation principale"
      className={cn(
        "h-full shrink-0 select-none overflow-hidden",
        "transition-[width] duration-[var(--motion-duration-base)] ease-[var(--motion-ease-standard)]",
        isCollapsed
          ? "w-[var(--layout-sidebar-width-collapsed)]"
          : "w-[var(--layout-sidebar-width-expanded)]",
      )}
    >
      <div
        className="flex h-full w-full flex-col justify-between border-r border-white/12 bg-[var(--color-bg-sidebar)] text-primary-fg"
      >
        {/* ── Scrollable area ──────────────────────────────────── */}
        <div className="flex flex-col flex-1 overflow-y-auto py-4">

          {/* Header : Logo + bouton toggle */}
          <div
            className={cn(
              "mb-3 flex items-center border-b border-white/12 pb-4",
              isCollapsed ? "flex-col gap-2 px-1" : "gap-2 px-3 justify-between",
            )}
          >
            <Link
              href="/cockpit"
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-[var(--radius-medium)]",
                "focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-white/40 focus-visible:ring-offset-0",
                isCollapsed ? "px-1 justify-center" : "px-1",
              )}
              aria-label="Retour au cockpit"
              title={isCollapsed ? "Cockpit" : undefined}
            >
              <Image
                src="/icon-512.png"
                alt="KREDO Logo"
                width={28}
                height={28}
                className="w-7 h-7 shrink-0 object-contain"
              />
              {!isCollapsed && (
                <span className="text-base font-bold tracking-tight text-primary-fg">
                  KREDO
                </span>
              )}
            </Link>

            <IconButton
              onClick={toggle}
              aria-label={isCollapsed ? "Développer la navigation" : "Réduire la navigation"}
              aria-expanded={!isCollapsed}
              size="sm"
              variant="ghost"
              className="shrink-0 border-transparent bg-transparent text-primary-fg/50 hover:bg-white/10 hover:text-primary-fg focus-visible:ring-white/40"
            >
              <SidebarToggleIcon collapsed={isCollapsed} />
            </IconButton>
          </div>

          {/* Navigation items */}
          <nav className="flex-1 space-y-4 px-2" aria-label="Modules">
            {mainMenuItems.map((item) => {
              if (item.items) {
                return (
                  <div key={item.label} className="space-y-0.5">
                    {isCollapsed ? (
                      <div className="mx-auto mb-1 h-px w-6 bg-white/12" />
                    ) : (
                      <h4 className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-primary-fg/44">
                        {item.label}
                      </h4>
                    )}
                    {item.items.map((module) => (
                      <ModuleItem
                        key={module.label}
                        item={module}
                        pathname={pathname}
                        isCollapsed={isCollapsed}
                        activeModuleHref={activeModuleHref}
                      />
                    ))}
                  </div>
                )
              }

              return (
                <ModuleItem
                  key={item.label}
                  item={item}
                  pathname={pathname}
                  isCollapsed={isCollapsed}
                  activeModuleHref={activeModuleHref}
                />
              )
            })}
          </nav>
        </div>

        {/* ── Footer : utilisateur + déconnexion ────────────── */}
        <div className="border-t border-white/12 bg-white/6 px-2 py-3">
          <div
            className={cn(
              "flex items-center rounded-[var(--radius-medium)] border border-white/12 bg-white/6",
              isCollapsed ? "justify-center p-1" : "gap-2 px-2 py-1.5",
            )}
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/18 bg-white/12 text-[10px] font-bold text-primary-fg">
              GK
            </div>
            {!isCollapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-primary-fg">
                    Guillaume K.
                  </p>
                  <p className="truncate text-[10px] text-primary-fg/64">
                    guillaume@kredo.dev
                  </p>
                </div>
                <IconButton
                  onClick={() => {
                    window.location.href = "/auth/signout"
                  }}
                  aria-label="Se déconnecter"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 border-transparent bg-transparent text-primary-fg/50 hover:bg-white/10 hover:text-primary-fg focus-visible:ring-white/40 disabled:opacity-40"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M18 12H9m9 0l-3-3m3 3l-3 3"
                    />
                  </svg>
                </IconButton>
              </>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}
