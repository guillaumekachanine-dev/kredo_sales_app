import React from "react"
import Image from "next/image"
import Link from "next/link"
import { IconCalendar } from "./icons"

interface CockpitMobileHeaderProps {
  onQuickActionsOpen: () => void
  onFinancialSimulationOpen: () => void
}

function IconCalculator() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <line x1="9" y1="7" x2="15" y2="7" />
      <line x1="8" y1="12" x2="10" y2="12" />
      <line x1="14" y1="12" x2="16" y2="12" />
      <line x1="8" y1="16" x2="10" y2="16" />
      <line x1="14" y1="16" x2="16" y2="16" />
    </svg>
  )
}

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

export function CockpitMobileHeader({
  onQuickActionsOpen,
  onFinancialSimulationOpen,
}: CockpitMobileHeaderProps) {
  return (
    <header className="top-header" role="banner">
      <div className="brand-lockup">
        <span className="brand-mark">
          <Image src="/branding/kredo/logo_sans_fond.png" alt="Logo KREDO" width={36} height={36} />
        </span>
        <span className="brand-title">Cockpit</span>
      </div>

      <div className="header-controls">
        {/* 1. Bouton calculatrice pour la modélisation financière */}
        <button
          type="button"
          className="header-bell"
          aria-label="Ouvrir le simulateur financier"
          onClick={onFinancialSimulationOpen}
        >
          <IconCalculator />
        </button>

        {/* 2. Bouton Agenda actif */}
        <Link
          href="/agenda"
          className="header-bell"
          aria-label="Ouvrir l'agenda"
        >
          <IconCalendar />
        </Link>
        
        {/* 3. Bouton bleu "+" pour les créations rapides */}
        <button
          type="button"
          className="header-quick-action"
          aria-label="Créer nouveau"
          onClick={onQuickActionsOpen}
        >
          <IconPlus />
        </button>
      </div>
    </header>
  )
}

