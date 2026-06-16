"use client"

import { useState } from "react"
import { DesktopAnalyticalPage } from "@/components/templates/DesktopAnalyticalPage"
import { KpiCard } from "@/components/ui/KpiCard"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { InsightCard } from "@/components/ui/InsightCard"
import { AlertBlock } from "@/components/ui/AlertBlock"
import { Button } from "@/components/ui/Button"
import { StatusPill } from "@/components/ui/StatusPill"
import { AppDialog } from "@/components/ui/AppDialog"
import type {
  CockpitDashboardData,
  CriticalStaffingAlert,
  LowScoreProposal,
} from "@/lib/cockpit/cockpit-data"

type ActiveModal = {
  type: "match" | "review" | "sync"
  title: string
  content: string
  targetId?: string
} | null

function scoreVariant(
  score: number,
): "danger" | "warning" | "success" | "inProgress" {
  if (score < 80) return "danger"
  if (score < 90) return "warning"
  return "success"
}

const IconWarning = () => (
  <svg
    className="size-full"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>
)

const IconCheck = () => (
  <svg
    className="size-full"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
)

export function CockpitDesktopDashboard({
  data,
}: {
  data: CockpitDashboardData
}) {
  const { kpis, bottlenecks, staffingAlerts, lowScoreProposals } = data

  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
  const [alerts, setAlerts] = useState<CriticalStaffingAlert[]>(staffingAlerts)
  const [proposals, setProposals] =
    useState<LowScoreProposal[]>(lowScoreProposals)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleAlertMatchClick = (alert: CriticalStaffingAlert) => {
    setActiveModal({
      type: "match",
      title: `Matching de Profils IA — ${alert.anomaly}`,
      content: `Lancement du rapprochement sémantique pgvector pour résoudre l'anomalie : "${alert.statusText}". Le workflow n8n a identifié 2 profils internes compatibles à plus de 90% : Sophie Martin (Practice A) et Marc Colin (Practice 2).`,
      targetId: alert.id,
    })
  }

  const handleProposalReviewClick = (prop: LowScoreProposal) => {
    setActiveModal({
      type: "review",
      title: `Révision de Proposition — ${prop.consultantName}`,
      content: `La proposition pour ${prop.consultantName} chez ${prop.practiceName} (valeur : ${prop.valueAmount}) présente un score qualité IA de ${prop.iaScore}%. Points de friction détectés : manque de spécifications techniques, profils anonymisés manquants. Déclencher la correction automatique IA via n8n ?`,
      targetId: prop.id,
    })
  }

  const confirmAction = () => {
    if (!activeModal || activeModal.type === "sync") return
    setIsProcessing(true)
    setTimeout(() => {
      setIsProcessing(false)
      const { targetId } = activeModal
      if (activeModal.type === "match") {
        setAlerts((prev) => prev.filter((a) => a.id !== targetId))
      } else if (activeModal.type === "review") {
        setProposals((prev) => prev.filter((p) => p.id !== targetId))
      }
      setActiveModal({
        type: "sync",
        title: "Action réussie",
        content:
          "L'incohérence a été résolue. Les données de pilotage sont à jour.",
      })
    }, 1000)
  }

  const deltaTone = (
    status: string,
  ): "positive" | "negative" | "neutral" => {
    if (status === "success") return "positive"
    if (status === "danger") return "negative"
    return "neutral"
  }

  const BOTTLENECK_COLORS = [
    { key: "qualif" as const, label: "Qualification", cls: "bg-dataviz-1" },
    { key: "prop" as const, label: "Proposition", cls: "bg-dataviz-2" },
    { key: "nego" as const, label: "Négociation", cls: "bg-dataviz-3" },
    { key: "gagne" as const, label: "Gagné", cls: "bg-dataviz-4" },
  ] as const

  return (
    <>
      <DesktopAnalyticalPage
        eyebrow="Centre de profit"
        title="Cockpit"
        description="Vue à 360° — Pipeline pondéré, staffing et qualité des propositions."
        maxWidth="wide"
        actions={
          <>
            <Button variant="ghost" size="sm">
              Mettre à jour
            </Button>
            <Button variant="ghost" size="sm">
              Créer une campagne
            </Button>
            <Button variant="ghost" size="sm">
              Construire un pitch
            </Button>
            <Button variant="primary" size="sm">
              Générer une synthèse
            </Button>
          </>
        }
        kpis={
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {kpis.map((kpi) => (
              <KpiCard
                key={kpi.id}
                label={kpi.label}
                value={kpi.value}
                delta={kpi.trendBadge}
                deltaTone={deltaTone(kpi.status)}
              />
            ))}
          </div>
        }
        rail={
          <div className="flex flex-col gap-4">
            <InsightCard
              eyebrow="Analyse IA"
              title="Situation du centre de profit"
              summary="Le pipeline pondéré est en hausse. Des anomalies de staffing et propositions nécessitent une attention avant la fin de semaine."
              recommendation="Résoudre les anomalies de staffing en priorité avant de valider les propositions commerciales."
              sourceLabel="n8n · Analyse prédictive"
            />
            {alerts.length > 0 ? (
              alerts.map((alert) => (
                <AlertBlock
                  key={alert.id}
                  variant="danger"
                  title={alert.anomaly}
                  description={alert.statusText}
                  icon={<IconWarning />}
                  action={
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleAlertMatchClick(alert)}
                    >
                      AI Match
                    </Button>
                  }
                />
              ))
            ) : (
              <AlertBlock
                variant="success"
                title="Aucune anomalie active"
                description="Toutes les anomalies critiques de staffing ont été résolues."
                icon={<IconCheck />}
              />
            )}
          </div>
        }
        lowerContent={
          proposals.length > 0 ? (
            <SurfaceCard>
              <div className="flex flex-col gap-0 p-5">
                <header className="flex items-center justify-between border-b border-border pb-3">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">
                    Propositions à haute valeur
                  </h2>
                  <span className="text-xs text-muted">
                    {proposals.length} à traiter
                  </span>
                </header>
                <table
                  className="w-full text-left text-sm"
                  aria-label="Propositions à haute valeur à traiter"
                >
                  <thead>
                    <tr className="border-b border-border">
                      <th
                        scope="col"
                        className="py-3 pr-4 text-xs font-medium text-muted"
                      >
                        Consultant
                      </th>
                      <th
                        scope="col"
                        className="py-3 pr-4 text-xs font-medium text-muted"
                      >
                        Client
                      </th>
                      <th
                        scope="col"
                        className="py-3 pr-4 text-xs font-medium text-muted"
                      >
                        Fin mission
                      </th>
                      <th
                        scope="col"
                        className="py-3 pr-4 text-right text-xs font-medium text-muted"
                      >
                        Valeur
                      </th>
                      <th
                        scope="col"
                        className="py-3 pr-4 text-right text-xs font-medium text-muted"
                      >
                        Score IA
                      </th>
                      <th
                        scope="col"
                        className="py-3 text-right text-xs font-medium text-muted"
                      >
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {proposals.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-border/40 last:border-0"
                      >
                        <td className="py-3 pr-4 font-medium text-heading">
                          {item.consultantName}
                        </td>
                        <td className="py-3 pr-4 text-body">
                          {item.practiceName}
                        </td>
                        <td className="py-3 pr-4 text-body">
                          {item.finMission}
                        </td>
                        <td className="py-3 pr-4 text-right font-mono font-medium text-heading">
                          {item.valueAmount}
                        </td>
                        <td className="py-3 pr-4 text-right">
                          <StatusPill
                            label={`${item.iaScore}%`}
                            variant={scoreVariant(item.iaScore)}
                          />
                        </td>
                        <td className="py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleProposalReviewClick(item)}
                            aria-label={`Réviser la proposition de ${item.consultantName}`}
                          >
                            Réviser
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SurfaceCard>
          ) : (
            <AlertBlock
              variant="success"
              title="Toutes les propositions sont traitées"
              description="Aucune proposition à haute valeur ne nécessite d'attention."
              icon={<IconCheck />}
            />
          )
        }
      >
        {/* Zone principale — deux panneaux analytiques côte à côte */}
        <div className="grid grid-cols-2 gap-5">
          {/* Panneau 1 : Alertes Critiques de Staffing */}
          <SurfaceCard>
            <div className="flex flex-col gap-4 p-5">
              <header className="border-b border-border pb-3">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">
                  Alertes Critiques — Staffing
                </h2>
                <p className="mt-1 text-xs text-body">
                  Anomalies détectées et matching recommandé (n8n)
                </p>
              </header>
              {alerts.length > 0 ? (
                <ul
                  className="flex flex-col divide-y divide-border/40"
                  aria-label="Alertes de staffing actives"
                >
                  {alerts.map((alert) => (
                    <li
                      key={alert.id}
                      className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-heading">
                          {alert.anomaly}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-body">
                          {alert.statusText}
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleAlertMatchClick(alert)}
                        aria-label={`Lancer le matching IA pour ${alert.anomaly}`}
                      >
                        AI Match
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-sm font-semibold text-heading">
                    Aucune anomalie active
                  </p>
                  <p className="mt-1 text-xs text-body">
                    Toutes les anomalies critiques ont été résolues.
                  </p>
                </div>
              )}
            </div>
          </SurfaceCard>

          {/* Panneau 2 : Analyse des Goulots d'Étranglement */}
          <SurfaceCard>
            <div className="flex flex-col gap-4 p-5">
              <header className="border-b border-border pb-3">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">
                  Analyse des Goulots d&apos;Étranglement
                </h2>
                <p className="mt-1 text-xs text-body">
                  Durée moyenne par étape du cycle de vente (jours)
                </p>
              </header>

              <div className="flex flex-col gap-5">
                {bottlenecks.map((b) => {
                  const total =
                    b.qualifDays +
                    b.propDays +
                    b.negoDays +
                    b.gagneDays || 1
                  return (
                    <div key={b.stageName}>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-medium text-body">
                          {b.stageName}
                        </span>
                        <span className="font-mono text-xs text-muted">
                          {total}j
                        </span>
                      </div>
                      <div
                        className="flex h-3 w-full overflow-hidden rounded-sm bg-canvas"
                        role="img"
                        aria-label={`${b.stageName} : ${total} jours au total`}
                      >
                        {b.qualifDays > 0 && (
                          <div
                            className="bg-dataviz-1"
                            style={{
                              width: `${(b.qualifDays / 60) * 100}%`,
                            }}
                          />
                        )}
                        {b.propDays > 0 && (
                          <div
                            className="bg-dataviz-2"
                            style={{
                              width: `${(b.propDays / 60) * 100}%`,
                            }}
                          />
                        )}
                        {b.negoDays > 0 && (
                          <div
                            className="bg-dataviz-3"
                            style={{
                              width: `${(b.negoDays / 60) * 100}%`,
                            }}
                          />
                        )}
                        {b.gagneDays > 0 && (
                          <div
                            className="bg-dataviz-4"
                            style={{
                              width: `${(b.gagneDays / 60) * 100}%`,
                            }}
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <footer className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3">
                {BOTTLENECK_COLORS.map(({ label, cls }) => (
                  <span
                    key={label}
                    className="flex items-center gap-1.5 text-xs text-muted"
                  >
                    <span
                      className={`size-2 shrink-0 rounded-sm ${cls}`}
                      aria-hidden="true"
                    />
                    {label}
                  </span>
                ))}
              </footer>
            </div>
          </SurfaceCard>
        </div>
      </DesktopAnalyticalPage>

      {/* Dialogue d'interaction — Matching et Révision */}
      <AppDialog
        open={Boolean(activeModal)}
        onOpenChange={(open) => {
          if (!open) setActiveModal(null)
        }}
        title={activeModal?.title ?? ""}
        footer={
          activeModal?.type === "sync" ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setActiveModal(null)}
            >
              Fermer
            </Button>
          ) : activeModal?.type === "match" ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                disabled={isProcessing}
                onClick={() => setActiveModal(null)}
              >
                Annuler
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={isProcessing}
                loadingLabel="Rapprochement…"
                onClick={confirmAction}
              >
                Affecter un consultant
              </Button>
            </>
          ) : activeModal?.type === "review" ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                disabled={isProcessing}
                onClick={() => setActiveModal(null)}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                size="sm"
                loading={isProcessing}
                loadingLabel="Optimisation…"
                onClick={confirmAction}
              >
                Corriger avec l&apos;IA
              </Button>
            </>
          ) : null
        }
      >
        <p className="whitespace-pre-line">{activeModal?.content ?? ""}</p>
      </AppDialog>
    </>
  )
}
