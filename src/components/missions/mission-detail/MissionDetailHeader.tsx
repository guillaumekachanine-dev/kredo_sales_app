"use client"

import Image from "next/image"
import { useState } from "react"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { StatusPill } from "@/components/ui/StatusPill"
import { AppDialog } from "@/components/ui/AppDialog"
import { formatDateNumeric } from "@/lib/formatters"
import { getPracticeByName } from "@/lib/config/practices"
import { updateMissionRisk } from "@/app/(app)/missions/_actions/update-mission-risk"
import { cn } from "@/lib/utils"
import { ContextualCommunicationButton } from "@/components/communication/ContextualCommunicationButton"
import type { MissionSummary, MissionCompany, RiskLevel } from "./mission-detail-types"
import { getMissionDurationMonths, isEndingSoon } from "./mission-detail-utils"

const PRACTICE_IMAGE_BY_SLUG: Record<string, string> = {
  "data-ia": "/images/practices/practice_data_ai.png",
  "digital-cloud": "/images/practices/practice_cloud_computing.png",
  "agile-pm": "/images/practices/practice_project_management.png",
  cybersecurity: "/images/practices/practice_cybersecurite.png",
  "qa-testing": "/images/practices/practice_qa_testing.png",
}

const STATUS_MAP: Record<string, { label: string; variant: "success" | "neutral" | "danger" | "inProgress" }> = {
  active: { label: "En cours", variant: "success" },
  paused: { label: "Suspendue", variant: "neutral" },
  ended: { label: "Terminée", variant: "neutral" },
  cancelled: { label: "Annulée", variant: "danger" },
}

const RISK_CLASSES: Record<RiskLevel, { badge: string; dot: string }> = {
  faible: {
    badge: "bg-success/10 border-success/20 text-success hover:bg-success/20",
    dot: "bg-success",
  },
  modere: {
    badge: "bg-warning/10 border-warning/20 text-warning hover:bg-warning/20",
    dot: "bg-warning",
  },
  critique: {
    badge: "bg-danger/10 border-danger/20 text-danger hover:bg-danger/20",
    dot: "bg-danger",
  },
}

interface MissionDetailHeaderProps {
  mission: MissionSummary
  company: MissionCompany | null
  riskLevel: RiskLevel
  riskDescription: string
  onRiskUpdated: (level: RiskLevel, desc: string) => void
}

export function MissionDetailHeader({
  mission,
  company,
  riskLevel,
  riskDescription,
  onRiskUpdated,
}: MissionDetailHeaderProps) {
  const [showRiskDialog, setShowRiskDialog] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [formLevel, setFormLevel] = useState<RiskLevel>(riskLevel)
  const [formDesc, setFormDesc] = useState(riskDescription)

  const practiceSource = [mission.practice, mission.role_title]
    .filter(Boolean)
    .join(" ")
  const practice = getPracticeByName(practiceSource)
  const practiceImage = practice ? PRACTICE_IMAGE_BY_SLUG[practice.slug] : null

  const durationMonths = getMissionDurationMonths(mission.start_date, mission.end_date)
  const endSoon = isEndingSoon(mission.end_date)
  const statusInfo = STATUS_MAP[mission.status] ?? { label: mission.status, variant: "neutral" as const }

  const companyName = company?.name ?? "Compte non renseigné"
  const logoPath =
    company?.metadata &&
    typeof (company.metadata as Record<string, unknown>).logo_path === "string"
      ? ((company.metadata as Record<string, unknown>).logo_path as string)
      : null

  async function handleSaveRisk() {
    setIsUpdating(true)
    const res = await updateMissionRisk(mission.id, formLevel, formDesc)
    setIsUpdating(false)
    if (res.error) {
      alert(res.error)
    } else {
      onRiskUpdated(formLevel, formDesc)
      setIsEditing(false)
      setShowRiskDialog(false)
    }
  }

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-5 pb-5 border-b border-border">
        {/* LEFT: badge + title + info row */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary border border-primary/20 px-2 py-0.5 rounded bg-primary/[0.04]">
              Mission
            </span>
            {mission.external_ref && (
              <span className="text-xs text-muted font-mono">{mission.external_ref}</span>
            )}
          </div>

          <h1 className="text-2xl font-bold font-heading text-heading tracking-tight">
            {mission.title}
          </h1>

          {/* Info row */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-2">
            {/* Practice */}
            {(practice || mission.practice) && (
              <div className="flex items-center gap-2 min-w-0">
                {practiceImage ? (
                  <Image
                    src={practiceImage}
                    alt={practice?.shortName ?? "Practice"}
                    width={20}
                    height={20}
                    className="shrink-0 rounded-sm"
                  />
                ) : null}
                <span className="text-sm font-semibold text-heading">
                  {practice?.name ?? mission.practice}
                </span>
              </div>
            )}

            {/* Role */}
            {mission.role_title && (
              <div className="flex items-center gap-2 min-w-0">
                <Image
                  src="/icons_set/staffing.png"
                  alt="Rôle"
                  width={18}
                  height={18}
                  className="shrink-0 object-contain"
                />
                <span className="text-sm font-semibold text-heading truncate">
                  {mission.role_title}
                </span>
              </div>
            )}

            {/* Seniority */}
            {mission.seniority && (
              <div className="flex items-center gap-2 min-w-0">
                <svg
                  className="w-[18px] h-[18px] text-muted shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 14l9-5-9-5-9 5 9 5z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
                  />
                </svg>
                <span className="text-sm font-semibold text-heading">
                  {mission.seniority}
                </span>
              </div>
            )}

            {/* Duration / Dates */}
            <div className="flex items-center gap-2 min-w-0">
              <Image
                src="/icons_set/durée.png"
                alt="Durée"
                width={18}
                height={18}
                className="shrink-0 object-contain"
              />
              <span className="text-sm font-semibold text-heading">
                {mission.start_date
                  ? durationMonths
                    ? `${formatDateNumeric(mission.start_date)} — ${formatDateNumeric(mission.end_date)} (${durationMonths} mois)`
                    : `Depuis le ${formatDateNumeric(mission.start_date)}`
                  : "Dates non renseignées"}
              </span>
            </div>

            {/* Status */}
            <StatusPill label={statusInfo.label} variant={statusInfo.variant} dot />

            {/* Risk or end-soon alert */}
            {endSoon ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-danger/20 bg-danger/10 text-danger text-[10px] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
                Fin proche
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setFormLevel(riskLevel)
                  setFormDesc(riskDescription)
                  setIsEditing(false)
                  setShowRiskDialog(true)
                }}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider transition-all",
                  RISK_CLASSES[riskLevel].badge
                )}
              >
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full shrink-0",
                    RISK_CLASSES[riskLevel].dot
                  )}
                />
                Risque {riskLevel}
              </button>
            )}
          </div>
        </div>

        {/* RIGHT: client identity box */}
        <div className="flex flex-col gap-3 bg-canvas/30 px-4 py-3 rounded-[var(--radius-medium)] border border-border/40 shrink-0 self-start min-w-[18rem]">
          <div className="flex items-center gap-4">
            <CompanyLogo
              name={companyName}
              logoPath={logoPath}
              website={company?.website ?? null}
              size="xl"
            />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-muted uppercase tracking-[0.22em] leading-none mb-1.5">
                Client
              </span>
              <span className="font-bold text-heading text-xl md:text-2xl leading-tight">
                {companyName}
              </span>
            </div>
          </div>
          {mission.status === "active" ? (
            <div className="flex flex-col gap-2">
              <ContextualCommunicationButton
                entryPoint="active_mission"
                companyId={company?.id}
                companyName={company?.name}
                missionId={mission.id}
                missionTitle={mission.title}
                primaryEntity={{ type: "mission", id: mission.id }}
                label="Proposer une extension"
                variant="primary"
                fullWidth
                aria-label={`Proposer une extension pour la mission ${mission.title}`}
                refs={{
                  missionRef: mission.id,
                  angle: [
                    `Mission active: ${mission.title}`,
                    mission.role_title ? `Rôle: ${mission.role_title}` : null,
                    mission.end_date ? `Fin prévue: ${formatDateNumeric(mission.end_date)}` : null,
                  ].filter(Boolean).join("\n") || undefined,
                }}
              />
              {company ? (
                <ContextualCommunicationButton
                  intent="steering_committee"
                  origin="mission"
                  label="Préparer COPIL"
                  companyId={company.id}
                  companyName={company.name}
                  missionId={mission.id}
                  missionTitle={mission.title}
                  primaryEntity={{ type: "mission", id: mission.id }}
                  fullWidth
                  className="h-9 min-h-9"
                  mustInclude={[
                    `Mission: ${mission.title}`,
                    `Client: ${company.name}`,
                    riskLevel !== "faible" ? `Risque actuel: ${riskLevel}` : null,
                    mission.end_date ? `Fin prévue: ${formatDateNumeric(mission.end_date)}` : null,
                  ].filter(Boolean).join("\n")}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* Risk dialog */}
      <AppDialog
        open={showRiskDialog}
        onOpenChange={setShowRiskDialog}
        title="Suivi du risque de la mission"
        description="Niveau de risque opérationnel et financier sur cette prestation."
      >
        <div className="flex flex-col gap-4 mt-2">
          {!isEditing ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted font-medium">Niveau :</span>
                <span
                  className={cn(
                    "px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border",
                    RISK_CLASSES[riskLevel].badge
                  )}
                >
                  Risque {riskLevel}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                  Commentaire
                </span>
                <p className="text-xs text-body leading-relaxed bg-canvas p-3 rounded-lg border border-border/60">
                  {riskDescription}
                </p>
              </div>
              {company ? (
                <div className="grid gap-2 border-t border-border/40 pt-3 sm:grid-cols-2">
                  <ContextualCommunicationButton
                    intent="delivery_risk_message"
                    origin="mission"
                    label="Communiquer sur le risque"
                    companyId={company.id}
                    companyName={company.name}
                    missionId={mission.id}
                    missionTitle={mission.title}
                    primaryEntity={{ type: "mission", id: mission.id }}
                    fullWidth
                    className="h-11 min-h-11 text-xs"
                    mustInclude={[
                      `Mission: ${mission.title}`,
                      `Client: ${company.name}`,
                      `Niveau de risque: ${riskLevel}`,
                      riskDescription ? `Commentaire: ${riskDescription}` : null,
                    ].filter(Boolean).join("\n")}
                  />
                  <ContextualCommunicationButton
                    intent="delivery_risk_briefing"
                    origin="mission"
                    label="Préparer l’escalade"
                    companyId={company.id}
                    companyName={company.name}
                    missionId={mission.id}
                    missionTitle={mission.title}
                    primaryEntity={{ type: "mission", id: mission.id }}
                    fullWidth
                    className="h-11 min-h-11 text-xs"
                    mustInclude={[
                      `Mission: ${mission.title}`,
                      `Client: ${company.name}`,
                      `Niveau de risque: ${riskLevel}`,
                      riskDescription ? `Commentaire: ${riskDescription}` : null,
                    ].filter(Boolean).join("\n")}
                  />
                </div>
              ) : null}
              <div className="flex justify-end gap-2 pt-3 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setShowRiskDialog(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border hover:bg-canvas/50 text-heading transition-all"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormLevel(riskLevel)
                    setFormDesc(riskDescription)
                    setIsEditing(true)
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-primary/30 text-primary hover:bg-primary/5 transition-all"
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
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                  Modifier
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted">
                  Niveau de risque
                </label>
                <div className="flex gap-2">
                  {(["faible", "modere", "critique"] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setFormLevel(lvl)}
                      className={cn(
                        "flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md border transition-all",
                        formLevel === lvl
                          ? lvl === "faible"
                            ? "bg-success text-white border-success"
                            : lvl === "modere"
                            ? "bg-warning text-white border-warning"
                            : "bg-danger text-white border-danger"
                          : lvl === "faible"
                          ? "text-success border-success/30 hover:bg-success/5"
                          : lvl === "modere"
                          ? "text-warning border-warning/30 hover:bg-warning/5"
                          : "text-danger border-danger/30 hover:bg-danger/5"
                      )}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted">
                  Description
                </label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full min-h-[100px] p-2.5 bg-canvas rounded border border-border text-xs text-heading focus:outline-none focus:border-primary/50 leading-relaxed"
                  placeholder="Motifs de l'évaluation ou alertes..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-border/40">
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border hover:bg-canvas/50 text-heading transition-all"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={handleSaveRisk}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md bg-primary text-white border border-primary hover:bg-primary/95 transition-all disabled:opacity-50"
                >
                  {isUpdating ? "Sauvegarde…" : "Sauvegarder"}
                </button>
              </div>
            </div>
          )}
        </div>
      </AppDialog>
    </>
  )
}
