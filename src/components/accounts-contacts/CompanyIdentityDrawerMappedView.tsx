"use client"

// ADR-0019 Lot 6 — Drawer pour un "compte cartographié" (depth_level='mapped').
// Reprend la structure, l'agencement, les dimensions et les typos du Drawer CRM,
// mais avec un thème visuel distinctif (Hero violet/indigo, initiales dans le cercle),
// uniquement deux boutons d'action (Scan contacts & Convertir dans le CRM),
// sans barre d'onglets, avec une section "Identité" et une section "Chiffres clés" (cartes 2 par ligne).

import Image from "next/image"
import { useEffect, useState, useTransition } from "react"
import { promoteAccountDepth } from "@/features/account-lifecycle/actions/promote-account-depth"
import {
  getCompetitiveMapCitation,
  type CompetitiveMapCitation,
} from "@/features/competitive-map/data/get-competitive-map-citation"

type MappedCompany = {
  id: string
  name: string
  tier?: string | null
  sector: string | null
  segment: string | null
  revenue?: string | null
  employee_count?: number | null
  website: string | null
  description?: string | null
  metadata: Record<string, unknown> | null
  origin: string
  depth_level?: string
}

function getCompanyInitials(name: string): string {
  if (!name) return "--"
  const clean = name.replace(/^(SA|SAS|SARL|EURL|INC|LTD|GMBH)\s+/i, "").trim()
  const capitals = clean.match(/[A-Z]/g)
  if (capitals && capitals.length >= 2) {
    return (capitals[0] + capitals[1]).toUpperCase()
  }
  const words = clean.split(/[\s\-_]+/).filter(Boolean)
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  return clean.slice(0, 2).toUpperCase()
}

function formatMeur(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "Non renseigné"
  return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M€`
}

function formatCategory(tier: string | null | undefined, fallbackLabel: string | null = null): string {
  if (!tier && !fallbackLabel) return "Compte identifié"
  const raw = (tier || fallbackLabel || "").toLowerCase()
  switch (raw) {
    case "grand_compte": return "Grand compte"
    case "eti": return "ETI"
    case "pme": return "PME"
    case "tpe": return "TPE"
    case "cac40": return "CAC40"
    case "etablissement_public": return "Établissement public"
    case "leader": return "Leader"
    case "challenger": return "Challenger"
    case "outsider": return "Outsider"
    case "niche": return "Acteur de niche"
    default: return tier || fallbackLabel || "Compte identifié"
  }
}

function formatRayon(value: string | null | undefined): string {
  if (!value) return "-"
  switch (value.toLowerCase()) {
    case "international": return "International"
    case "national": return "National"
    case "regional":
    case "régional": return "Régional"
    case "bassin_grasse":
    case "local": return "Local / Bassin"
    default: return value.charAt(0).toUpperCase() + value.slice(1)
  }
}

export function CompanyIdentityDrawerMappedView({
  company,
  onConverted,
  onOpenScan,
}: {
  company: MappedCompany
  onConverted: () => void
  onOpenScan?: () => void
}) {
  const [citation, setCitation] = useState<CompetitiveMapCitation | null>(null)
  const [convertPending, startConvert] = useTransition()
  const [convertError, setConvertError] = useState<string | null>(null)
  const [showConvertConfirm, setShowConvertConfirm] = useState(false)

  useEffect(() => {
    let cancelled = false
    getCompetitiveMapCitation(company.id).then((result) => {
      if (!cancelled) {
        setCitation(result)
      }
    })
    return () => {
      cancelled = true
    }
  }, [company.id])

  const handleConvert = () => {
    setConvertError(null)
    startConvert(async () => {
      const { error, promoted } = await promoteAccountDepth(company.id, "noted")
      if (error) {
        setConvertError(error)
        setShowConvertConfirm(false)
        return
      }
      if (promoted) onConverted()
    })
  }

  const { entry, facts } = citation ?? { entry: null, facts: null }
  const profileJson = entry?.profileJson || (company.metadata?.profile_json as Record<string, unknown> | null) || {}

  // Extraire les champs Identité
  const metierText =
    (profileJson.metier_chaine_valeur as string) ||
    (profileJson.proposition_valeur as string) ||
    entry?.positioning ||
    company.description ||
    "Métier non renseigné"
  
  // Troncature légère du paragraphe B2 s'il est très long
  const shortMetierText = metierText.length > 280 ? `${metierText.slice(0, 277)}...` : metierText

  const categorieLabel = formatCategory(company.tier, entry?.categoryLabel)

  // Positionnement (réduit)
  const rawPositioning = entry?.positioning || (profileJson.proposition_valeur as string) || company.description || "Positionnement non renseigné"
  const shortPositioning = rawPositioning.length > 180 ? `${rawPositioning.slice(0, 177)}...` : rawPositioning

  // Chiffres clés
  const chiffreAffaires =
    facts?.revenueEstimateMeur !== null && facts?.revenueEstimateMeur !== undefined
      ? formatMeur(facts.revenueEstimateMeur)
      : company.revenue && company.revenue !== "Non renseigné"
      ? company.revenue
      : "-"

  const rayonnement = formatRayon(
    (profileJson.rayon as string) || (company.metadata?.rayon as string)
  )

  const maturiteIT =
    entry?.maturiteNumerique !== null && entry?.maturiteNumerique !== undefined
      ? `${entry.maturiteNumerique} / 5`
      : (profileJson.maturite_it as string) || "-"

  const appetence =
    entry?.appetenceScore !== null && entry?.appetenceScore !== undefined
      ? `${entry.appetenceScore} / 35`
      : "-"

  const initials = getCompanyInitials(company.name)

  return (
    <div className="flex flex-col h-full gap-5 overflow-y-auto pr-1">
      {/* Hero section — même structure et dimensions que le drawer CRM, mais avec couleur visuelle distincte (violet/indigo) */}
      <div className="relative flex flex-col gap-4 p-4 rounded-[var(--radius-medium)] border transition-all bg-[#4338CA] bg-[linear-gradient(to_bottom,rgba(255,255,255,0.15)_0%,transparent_100%)] text-white border-[#4338CA]/20">
        <div className="relative flex items-center gap-4 min-w-0 pr-2">
          {/* Cercle avec les initiales du compte au lieu du logo */}
          <div className="w-14 h-14 rounded-full border-2 border-white/30 bg-white/20 backdrop-blur-sm font-bold text-lg text-white flex items-center justify-center shrink-0 shadow-inner">
            {initials}
          </div>

          <div className="min-w-0 flex-1 pr-2">
            {/* Ligne 1 : Nom du compte */}
            <h3 className="truncate text-base font-bold leading-tight text-white sm:text-lg">
              {company.name}
            </h3>

            {/* Ligne 2 : Segment, métier */}
            {(company.sector || company.segment) && (
              <span className="mt-0.5 block truncate text-[11px] font-medium leading-tight text-white/80">
                {[company.sector, company.segment].filter(Boolean).join(" - ")}
              </span>
            )}

            {/* Ligne 3 : Catégorie (déplacée depuis les chiffres clés, remplace "compte identifié") */}
            <span className="mt-1 block truncate text-[11px] font-bold leading-tight text-[#38BDF8] uppercase tracking-wider">
              {categorieLabel}
            </span>
          </div>
        </div>

        {/* Action Hero ou Étape de confirmation de conversion */}
        {showConvertConfirm ? (
          <div className="flex flex-col gap-2 border-t border-white/20 pt-2.5 text-xs bg-black/25 p-3 rounded-md animate-in fade-in duration-150">
            <div className="text-[11px] font-bold text-white flex items-center gap-1.5">
              <svg className="size-4 text-emerald-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Convertir « {company.name} » dans le CRM ?</span>
            </div>
            <p className="text-[10px] text-white/80 leading-snug">
              Le compte passera du statut « Identifié » à un compte CRM standard, avec les données de l&apos;étude déjà reprises dans sa fiche.
            </p>
            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                onClick={handleConvert}
                disabled={convertPending}
                className="flex-1 flex h-8 items-center justify-center gap-1.5 rounded bg-[#10B981] hover:bg-[#059669] font-bold text-white text-[11px] transition-colors disabled:opacity-60 cursor-pointer shadow"
              >
                <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>{convertPending ? "Conversion…" : "Oui, convertir"}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowConvertConfirm(false)}
                disabled={convertPending}
                className="px-3 h-8 rounded bg-white/20 hover:bg-white/30 text-white font-medium text-[11px] transition-colors cursor-pointer"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 border-t border-white/15 pt-2.5 text-[11px]">
            <button
              type="button"
              onClick={onOpenScan}
              className="flex h-8 min-h-8 items-center justify-center gap-1.5 rounded-md px-3 text-[10px] font-bold text-white transition-all hover:brightness-105 active:scale-[0.98]"
              style={{ backgroundColor: "#1E5E99" }}
              title="Scanner les informations du compte"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white">
                <Image
                  src="/icons_set/scan_infos_drawer.png"
                  alt=""
                  width={13}
                  height={13}
                  className="h-[13px] w-[13px] object-contain"
                />
              </span>
              <span>Scan contacts</span>
            </button>

            <button
              type="button"
              onClick={() => setShowConvertConfirm(true)}
              className="flex h-8 min-h-8 items-center justify-center gap-1.5 rounded-md px-3 text-[10px] font-bold text-white transition-all hover:brightness-105 active:scale-[0.98]"
              style={{ backgroundColor: "#10B981" }}
              title="Convertir en compte CRM"
            >
              <svg className="h-4 w-4 shrink-0 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>Convertir dans le CRM</span>
            </button>
          </div>
        )}
      </div>

      {convertError && (
        <div className="rounded border border-red-500/20 bg-red-500/10 p-2.5 text-xs text-red-500 font-semibold">
          {convertError}
        </div>
      )}

      {/* Pas de barre d'onglets ni de navigation : un seul espace scrollable */}
      <div className="flex flex-col gap-6 pt-1">
        {/* Section « Identité » */}
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2 font-heading">
            Identité
          </h4>
          <div className="space-y-3">
            {/* Métier : repris du début du paragraphe B2 */}
            <div className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-1">
              <span className="text-[9px] text-muted font-bold uppercase tracking-wider">Métier</span>
              <p className="text-xs text-heading leading-relaxed">{shortMetierText}</p>
            </div>

            {/* Positionnement : section réduite */}
            <div className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-1">
              <span className="text-[9px] text-muted font-bold uppercase tracking-wider">Positionnement</span>
              <p className="text-xs text-body leading-relaxed">{shortPositioning}</p>
            </div>
          </div>
        </div>

        {/* Section « Chiffres clés » : cartes KPI côte à côte 2 par ligne */}
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2 font-heading">
            Chiffres clés
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {/* 1. Chiffre d'affaires */}
            <div className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-1">
              <span className="text-[9px] text-muted font-bold uppercase tracking-wider">Chiffre d&apos;affaires</span>
              <span className="text-xs font-bold text-heading">{chiffreAffaires}</span>
            </div>

            {/* 2. Rayonnement */}
            <div className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-1">
              <span className="text-[9px] text-muted font-bold uppercase tracking-wider">Rayonnement</span>
              <span className="text-xs font-bold text-heading">{rayonnement}</span>
            </div>

            {/* 3. Maturité IT */}
            <div className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-1">
              <span className="text-[9px] text-muted font-bold uppercase tracking-wider">Maturité IT</span>
              <span className="text-xs font-bold text-heading">{maturiteIT}</span>
            </div>

            {/* 4. Appétence */}
            <div className="p-3 bg-canvas/30 rounded border border-border/50 flex flex-col gap-1">
              <span className="text-[9px] text-muted font-bold uppercase tracking-wider">Appétence</span>
              <span className="text-xs font-bold text-heading">{appetence}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
