"use client"

import React, { useState } from 'react'
import type { SectorPlaybook } from '@/types/sector'

export interface PlaybookPanelProps {
  playbook: SectorPlaybook
}

type TabKey = 'personas' | 'roi' | 'objections' | 'entry_points'

/**
 * PlaybookPanel - client component rendering the sector playbook with tab navigation.
 * Tab sections: "Personas", "Arguments ROI", "Objections", and "Points d'entrée".
 */
export function PlaybookPanel({ playbook }: PlaybookPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('personas')

  const tabs = [
    { id: 'personas', label: 'Personas' },
    { id: 'roi', label: 'Arguments ROI' },
    { id: 'objections', label: 'Objections' },
    { id: 'entry_points', label: "Points d'entrée" },
  ] as const

  const personas = playbook?.personas ?? []
  const roiArguments = playbook?.roi_arguments ?? []
  const objections = playbook?.objections ?? []
  const entryPoints = playbook?.entry_points ?? []

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Tabs Header */}
      <div className="flex border-b border-border/80 w-full overflow-x-auto pb-px">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`text-xs font-bold px-4 py-2 border-b-2 transition-all whitespace-nowrap outline-none cursor-pointer ${
                isActive
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-muted hover:text-heading'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tabs Content */}
      <div className="min-h-[200px]">
        {/* Personas tab */}
        {activeTab === 'personas' && (
          <div className="space-y-3">
            {personas.length === 0 ? (
              <p className="text-xs text-muted">Aucun persona renseigné.</p>
            ) : (
              personas.map((p, idx) => (
                <div key={idx} className="bg-surface border border-border p-4 flex flex-col gap-2 rounded">
                  <h4 className="text-xs font-bold text-heading uppercase tracking-wider">{p.role}</h4>
                  <div className="text-xs space-y-2">
                    <p className="text-body leading-relaxed">
                      <span className="font-bold text-[9px] text-muted uppercase tracking-wider block mb-0.5">Enjeu :</span>
                      {p.enjeu}
                    </p>
                    <p className="text-danger leading-relaxed">
                      <span className="font-bold text-[9px] text-danger/80 uppercase tracking-wider block mb-0.5">Peur :</span>
                      {p.peur}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ROI arguments tab */}
        {activeTab === 'roi' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {roiArguments.length === 0 ? (
              <p className="text-xs text-muted col-span-full">Aucun argument ROI renseigné.</p>
            ) : (
              roiArguments.map((arg, idx) => (
                <div key={idx} className="bg-success/5 border border-success/15 p-4 flex flex-col items-center justify-center text-center gap-1.5 rounded">
                  <span className="text-xl font-black text-success leading-none">
                    #{idx + 1}
                  </span>
                  <p className="text-[11px] font-medium text-success leading-snug">
                    {arg}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {/* Objections tab */}
        {activeTab === 'objections' && (
          <div className="space-y-4 divide-y divide-border/60">
            {objections.length === 0 ? (
              <p className="text-xs text-muted">Aucune objection répertoriée.</p>
            ) : (
              objections.map((obj, idx) => (
                <div key={idx} className="pt-3 first:pt-0 flex flex-col gap-2">
                  <div className="bg-danger/5 border-l-2 border-danger p-3 text-xs rounded-r">
                    <span className="font-bold text-[9px] text-danger uppercase tracking-wider block mb-1">Objection</span>
                    <p className="italic text-heading font-medium">« {obj.objection} »</p>
                  </div>
                  <div className="bg-success/5 border-l-2 border-success p-3 text-xs rounded-r">
                    <span className="font-bold text-[9px] text-success uppercase tracking-wider block mb-1">Réponse Kredo</span>
                    <p className="text-body leading-relaxed">{obj.reponse}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Entry points tab */}
        {activeTab === 'entry_points' && (
          <div className="space-y-2">
            {entryPoints.length === 0 ? (
              <p className="text-xs text-muted">Aucun point d&apos;entrée renseigné.</p>
            ) : (
              entryPoints.map((ep, idx) => {
                let badgeLabel = 'Réseau'
                let badgeClass = 'bg-blue-500/10 text-blue-600 border border-blue-500/15'

                const lowerEp = ep.toLowerCase()
                if (lowerEp.includes('urgent') || lowerEp.includes('prioritaire')) {
                  badgeLabel = 'Urgent'
                  badgeClass = 'bg-danger/10 text-danger border border-danger/15'
                } else if (lowerEp.includes('quick') || lowerEp.includes('facile')) {
                  badgeLabel = 'Quick-win'
                  badgeClass = 'bg-success/10 text-success border border-success/15'
                } else if (lowerEp.includes('patrimoine') || lowerEp.includes('historique')) {
                  badgeLabel = 'Patrimoine'
                  badgeClass = 'bg-warning/10 text-warning border border-warning/15'
                }

                return (
                  <div key={idx} className="bg-surface border border-border p-3 flex items-center justify-between gap-4 rounded">
                    <span className="text-xs font-semibold text-body">
                      {ep}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${badgeClass}`}>
                      {badgeLabel}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}
