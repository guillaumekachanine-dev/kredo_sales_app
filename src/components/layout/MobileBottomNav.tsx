"use client"

import Link from "next/link"
import { getNavigationIcon } from "./navigation-icons"
import { cn } from "@/lib/utils"
import { openMobileAccountQuickSearch } from "@/hooks/use-mobile-account-quick-search"

// ─────────────────────────────────────────────────────────────────────────────
//  MobileBottomNav — Barre de navigation mobile fixe (5 emplacements)
//
//  Affiche en permanence dans l'ordre exact :
//    1. ← Retour   (historique arrière avec restauration d'état)
//    2. Cockpit    (route /cockpit)
//    3. MENU       (ouvre le menu complet mobile - conservé avec son libellé)
//    4. CRM        (ouvre le launcher rapide de compte CRM)
//    5. Suivant →  (historique avant avec restauration d'état)
//
//  Sémantique d'affichage :
//    · Seul le bouton central "Menu" affiche son libellé textuel.
//    · Les 4 autres pictogrammes sont agrandis (w-6 h-6).
//    · Lorsque le module est actif, son pictogramme passe en gras.
// ─────────────────────────────────────────────────────────────────────────────

interface MobileBottomNavProps {
  pathname: string
  isRailOpen: boolean
  /** Le module actif possède-t-il un rail d'onglets cliquables ? */
  activeHasRail: boolean
  onActiveModulePress: () => void
  isMenuOpen: boolean
  onMenuToggle: () => void
  canGoBack?: boolean
  canGoForward?: boolean
  onGoBack?: () => void
  onGoForward?: () => void
}

export function MobileBottomNav({
  pathname,
  isRailOpen,
  activeHasRail,
  onActiveModulePress,
  isMenuOpen,
  onMenuToggle,
  canGoBack = false,
  canGoForward = false,
  onGoBack,
  onGoForward,
}: MobileBottomNavProps) {
  const buttons = [
    {
      id: "back",
      label: "Retour",
      ariaLabel: "Revenir en arrière",
      icon: "arrow-left",
      disabled: !canGoBack,
      onClick: onGoBack,
      type: "history" as const,
    },
    {
      id: "cockpit",
      label: "Cockpit",
      icon: "cockpit",
      isActive: pathname.startsWith("/cockpit"),
      href: "/cockpit",
      type: "link" as const,
    },
    {
      id: "menu",
      label: "Menu",
      icon: "navigation",
      isActive: isMenuOpen,
      onClick: onMenuToggle,
      type: "button" as const,
    },
    {
      id: "crm",
      label: "CRM",
      icon: "crm",
      isActive: pathname.startsWith("/prospection"),
      href: "/prospection/accounts",
      type: "link" as const,
    },
    {
      id: "forward",
      label: "Suivant",
      ariaLabel: "Aller en avant",
      icon: "arrow-right",
      disabled: !canGoForward,
      onClick: onGoForward,
      type: "history" as const,
    },
  ]

  return (
    <nav
      aria-label="Navigation principale mobile"
      className="fixed bottom-0 left-0 right-0 z-[var(--z-bottom-nav)] flex h-[var(--layout-bottom-nav-height)] items-center justify-around border-t border-white/12 bg-[var(--color-bg-mobile-nav)] px-2"
    >
      {buttons.map((btn) => {
        const isMenuButton = btn.id === "menu"
        const isHistoryButton = btn.type === "history"
        const isActive = "isActive" in btn && btn.isActive
        const togglesRail = btn.type === "link" && isActive && activeHasRail

        const iconClassName = isMenuButton
          ? "size-4 shrink-0 transition-colors"
          : "size-6 shrink-0 transition-all duration-200 ease-out"

        const strokeWidth = isMenuButton
          ? 2
          : isHistoryButton
            ? 2.6
            : 2

        const inner = (
          <>
            <div
              className={cn(
                "inline-flex items-center justify-center rounded-[var(--radius-medium)] transition-[background-color,color,box-shadow,transform] duration-200 ease-out",
                isMenuButton
                  ? cn(
                      "size-7 text-primary",
                      isActive && "scale-105 text-primary shadow-[0_0_0_5px_rgba(37,84,184,0.08)]",
                    )
                  : cn(
                      "size-9",
                      isHistoryButton
                        ? btn.disabled
                          ? "text-primary-fg/20"
                          : "text-primary-fg/75 group-hover:text-primary-fg group-active:scale-90"
                        : isActive
                          ? "bg-white/12 text-white shadow-[0_10px_24px_-18px_rgba(255,255,255,0.9)]"
                          : "text-primary-fg/64",
                    ),
              )}
            >
              {getNavigationIcon(btn.icon, iconClassName, strokeWidth)}
            </div>

            {/* Le libellé est affiché pour le bouton Menu ou pour la page active */}
            {isMenuButton || (isActive && !isHistoryButton) ? (
              <span className="max-w-full truncate text-[10px] tracking-tight">
                {btn.label}
              </span>
            ) : null}

            {!isHistoryButton ? (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute bottom-1.5 h-0.5 w-3 rounded-full bg-[#c89a2b] transition-[opacity,transform,width] duration-200 ease-out",
                  isActive ? "opacity-95 scale-x-100" : "opacity-0 scale-x-50",
                )}
              />
            ) : null}
          </>
        )

        const className = cn(
          "group relative flex min-h-[var(--layout-mobile-tap-target)] flex-1 flex-col items-center justify-center gap-0.5 px-1 text-center select-none",
          "transition-[color,opacity,transform,background-color,box-shadow] duration-[var(--motion-duration-fast)]",
          "focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-white/40 focus-visible:ring-offset-0",
          isMenuButton
            ? cn(
                "-mt-5 h-[4.25rem] max-w-[4.25rem] rounded-full bg-[radial-gradient(circle_at_50%_24%,#ffffff_0%,#ffffff_46%,#f1ebdf_100%)] font-semibold text-primary shadow-[0_18px_34px_-20px_rgba(0,0,0,0.52)] [box-shadow:0_18px_34px_-20px_rgba(0,0,0,0.52),inset_0_-2px_0_rgba(200,154,43,0.62),inset_0_1px_0_rgba(255,255,255,0.98)]",
                isActive &&
                  "-translate-y-1 bg-[radial-gradient(circle_at_50%_22%,#ffffff_0%,#ffffff_52%,#f1ebdf_100%)] shadow-[0_22px_38px_-19px_rgba(0,0,0,0.6)] [box-shadow:0_22px_38px_-19px_rgba(0,0,0,0.6),inset_0_-3px_0_rgba(200,154,43,0.84),inset_0_1px_0_rgba(255,255,255,1)]",
              )
            : "h-full",
          isHistoryButton
            ? btn.disabled
              ? "opacity-30 cursor-not-allowed pointer-events-none text-primary-fg/30"
              : "text-primary-fg/75 hover:text-primary-fg active:scale-95 cursor-pointer"
            : !isMenuButton &&
                (isActive
                  ? "-translate-y-0.5 font-semibold text-white"
                  : "text-primary-fg/64 hover:text-primary-fg"),
        )

        if (isHistoryButton) {
          return (
            <button
              key={btn.id}
              type="button"
              onClick={btn.onClick}
              disabled={btn.disabled}
              aria-label={btn.ariaLabel}
              aria-disabled={btn.disabled ? "true" : undefined}
              className={className}
            >
              {inner}
            </button>
          )
        }

        if (btn.type === "button") {
          return (
            <button
              key={btn.id}
              type="button"
              onClick={btn.onClick}
              aria-label={btn.label}
              aria-current={isActive ? "page" : undefined}
              aria-expanded={isMenuOpen}
              className={className}
            >
              {inner}
            </button>
          )
        }

        if (btn.id === "crm") {
          return (
            <Link
              key={btn.id}
              href="/prospection/accounts"
              onClick={() => {
                openMobileAccountQuickSearch()
              }}
              aria-label={btn.label}
              aria-current={isActive ? "page" : undefined}
              className={className}
            >
              {inner}
            </Link>
          )
        }

        if (togglesRail) {
          return (
            <button
              key={btn.id}
              type="button"
              onClick={onActiveModulePress}
              aria-label={btn.label}
              aria-current="page"
              aria-expanded={isRailOpen}
              className={className}
            >
              {inner}
            </button>
          )
        }

        return (
          <Link
            key={btn.id}
            href={btn.href!}
            aria-label={btn.label}
            aria-current={isActive ? "page" : undefined}
            className={className}
          >
            {inner}
          </Link>
        )
      })}
    </nav>
  )
}
