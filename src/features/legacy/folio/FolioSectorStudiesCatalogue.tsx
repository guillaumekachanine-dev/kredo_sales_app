"use client"

import React, { useState, useMemo } from "react"
import Link from "next/link"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { cn } from "@/lib/utils"

import type { FolioSectorStudyListItem } from "./folio-loader"

type Props = {
  initialStudies: FolioSectorStudyListItem[]
  device: "desktop" | "mobile"
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Date inconnue"
  try {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  } catch {
    return "Date inconnue"
  }
}

export function FolioSectorStudiesCatalogue({ initialStudies, device }: Props) {
  const [search, setSearch] = useState("")
  const [selectedSector, setSelectedSector] = useState("all")
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "alpha-asc" | "alpha-desc">("date-desc")

  // Liste des secteurs uniques pour le filtre
  const sectorsList = useMemo(() => {
    const sectors = new Set<string>()
    initialStudies.forEach((s) => {
      if (s.sector) sectors.add(s.sector)
    })
    return Array.from(sectors).sort()
  }, [initialStudies])

  // Filtrage et tri
  const filteredStudies = useMemo(() => {
    let result = [...initialStudies]

    // Recherche par nom de compte
    if (search.trim() !== "") {
      const q = search.toLowerCase()
      result = result.filter((s) => s.name.toLowerCase().includes(q))
    }

    // Filtre par secteur
    if (selectedSector !== "all") {
      result = result.filter((s) => s.sector === selectedSector)
    }

    // Tri
    result.sort((a, b) => {
      if (sortBy === "alpha-asc") {
        return a.name.localeCompare(b.name, "fr")
      }
      if (sortBy === "alpha-desc") {
        return b.name.localeCompare(a.name, "fr")
      }
      
      const dateA = a.analysisAt ? new Date(a.analysisAt).getTime() : 0
      const dateB = b.analysisAt ? new Date(b.analysisAt).getTime() : 0
      
      if (sortBy === "date-desc") {
        return dateB - dateA
      }
      return dateA - dateB
    })

    return result
  }, [initialStudies, search, selectedSector, sortBy])

  // Rendu de la vue Desktop (Liste Compacte)
  const renderDesktopView = () => {
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-muted">
                <th className="px-6 py-3.5">Compte</th>
                <th className="px-6 py-3.5">Secteur d'activité</th>
                <th className="px-6 py-3.5">Date d'analyse</th>
                <th className="px-6 py-3.5">Origine</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredStudies.map((study) => (
                <tr key={study.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-3">
                      <CompanyLogo
                        name={study.name}
                        logoPath={study.logoPath}
                        size="sm"
                        denseList={true}
                      />
                      <span className="font-semibold text-heading text-sm">{study.name}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className="inline-flex items-center rounded-md bg-slate-100 border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                      {study.sector}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-body font-medium">
                    {formatDate(study.analysisAt)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className="inline-flex items-center rounded bg-slate-800 text-slate-100 border border-slate-700 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                      FOLIO original
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <Link
                      href={`/legacy/folio/sector-studies/${study.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-deep transition-colors px-3 py-1.5 rounded-lg hover:bg-primary/5 cursor-pointer"
                    >
                      Ouvrir l’étude
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Rendu de la vue Mobile (Cartes Tactiles >= 44px)
  const renderMobileView = () => {
    return (
      <div className="space-y-3">
        {filteredStudies.map((study) => (
          <Link
            key={study.id}
            href={`/legacy/folio/sector-studies/${study.id}`}
            className="block rounded-xl border border-border bg-surface p-4 hover:border-primary/30 active:bg-slate-50 transition-colors shadow-sm cursor-pointer min-h-[44px]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <CompanyLogo
                  name={study.name}
                  logoPath={study.logoPath}
                  size="md"
                  denseList={true}
                />
                <div className="min-w-0">
                  <h4 className="truncate text-sm font-bold text-heading">{study.name}</h4>
                  <p className="truncate text-xs text-muted mt-0.5">{study.sector}</p>
                </div>
              </div>
              <span className="shrink-0 inline-flex items-center rounded bg-slate-800 text-slate-100 border border-slate-700 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider">
                FOLIO
              </span>
            </div>
            <div className="mt-3.5 pt-3 border-t border-border flex items-center justify-between text-[10px] text-muted font-medium">
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                {formatDate(study.analysisAt)}
              </span>
              <span className="font-bold text-primary flex items-center gap-0.5">
                Consulter
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </span>
            </div>
          </Link>
        ))}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-heading">
          Études sectorielles originales
        </h1>
        <p className="text-xs sm:text-sm text-body mt-1 font-medium">
          Archives FOLIO — analyses sectorielles contextualisées par compte
        </p>
      </div>

      {/* Barre de Filtres et Recherche */}
      <div className="grid grid-cols-1 gap-3 sm:flex sm:items-center sm:justify-between p-4 rounded-xl border border-border bg-surface shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:flex sm:items-center sm:flex-1">
          {/* Recherche */}
          <div className="relative sm:max-w-xs w-full">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Rechercher un compte..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-xs bg-canvas/40 focus:bg-canvas focus:outline-none focus:ring-1 focus:ring-primary text-body font-medium"
            />
          </div>

          {/* Filtre Secteur */}
          <div className="relative sm:max-w-xs w-full">
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-canvas/40 focus:bg-canvas focus:outline-none focus:ring-1 focus:ring-primary text-body font-medium"
            >
              <option value="all">Tous les secteurs</option>
              {sectorsList.map((sector) => (
                <option key={sector} value={sector}>
                  {sector}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tri */}
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-muted hidden sm:inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m9-6L21 15m0 0l-4.5 4.5M21 15H9" />
          </svg>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full sm:w-auto px-3 py-2 border border-border rounded-lg text-xs bg-canvas/40 focus:bg-canvas focus:outline-none focus:ring-1 focus:ring-primary text-body font-medium"
          >
            <option value="date-desc">Plus récentes d’abord</option>
            <option value="date-asc">Plus anciennes d’abord</option>
            <option value="alpha-asc">Nom de compte (A-Z)</option>
            <option value="alpha-desc">Nom de compte (Z-A)</option>
          </select>
        </div>
      </div>

      {/* Dynamic Count */}
      <div className="text-xs text-muted font-semibold">
        {filteredStudies.length === 0
          ? "Aucune étude trouvée"
          : filteredStudies.length === 1
          ? "1 étude disponible"
          : `${filteredStudies.length} études disponibles`}
      </div>

      {/* Liste des études */}
      {filteredStudies.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center shadow-sm">
          <p className="text-sm font-semibold text-muted italic">
            Aucune étude sectorielle d'archive ne correspond à vos critères.
          </p>
        </div>
      ) : device === "mobile" ? (
        renderMobileView()
      ) : (
        renderDesktopView()
      )}
    </div>
  )
}
