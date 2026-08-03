"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { Badge } from "@/components/ui/Badge"
import { StatusPill } from "@/components/ui/StatusPill"
import {
  candidateStatusLabel,
  collaboratorStatusLabel,
  formatTalentDate,
  getTalentPracticeVisual,
  initialsFromName,
} from "./talent-knowledge-builders"
import type { TalentProfile } from "./talent-knowledge.types"

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-edito-border pt-4">
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-edito-navy">{title}</h3>
      <div className="mt-2 text-xs leading-relaxed text-edito-body">{children}</div>
    </section>
  )
}

export function TalentProfileDetail({
  profile,
  onOpenChange,
  mobile = false,
}: {
  profile: TalentProfile | null
  onOpenChange: (open: boolean) => void
  mobile?: boolean
}) {
  const practice = getTalentPracticeVisual(profile?.practice)
  const statusLabel = profile?.kind === "candidate"
    ? candidateStatusLabel(profile.status)
    : collaboratorStatusLabel(profile?.status ?? "")

  return (
    <AppDrawer
      open={Boolean(profile)}
      onOpenChange={onOpenChange}
      side={mobile ? "bottom" : "right"}
      width="wide"
      title={
        profile ? (
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-edito-navy text-sm font-bold text-white">
              {initialsFromName(profile.fullName)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base font-bold text-edito-navy">{profile.fullName}</span>
              <span className="mt-0.5 block truncate text-xs font-medium text-edito-body">
                {profile.currentTitle || "Titre non renseigné"}
              </span>
            </span>
          </div>
        ) : "Profil"
      }
      closeLabel="Fermer le profil"
      headerClassName="border-edito-border bg-edito-surface"
      contentClassName="bg-edito-surface"
      footer={profile ? (
        <div className="border-t border-edito-border bg-edito-surface px-4 py-3">
          <Link
            href={profile.kind === "collaborator" ? "/consultants" : "/recruitment"}
            className="inline-flex h-11 w-full items-center justify-center rounded-[var(--radius-medium)] border border-edito-border bg-edito-surface px-3 text-xs font-semibold text-edito-navy transition-colors hover:bg-edito-chip focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-brass"
          >
            {profile.kind === "collaborator" ? "Voir dans Équipe" : "Voir dans Recrutement"}
          </Link>
        </div>
      ) : undefined}
    >
      {profile && (
        <div className="space-y-5 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-edito-border bg-edito-chip px-2.5 py-1 text-[10px] font-bold text-edito-navy">
              <span className="size-1.5 rounded-full" style={{ backgroundColor: practice.color }} />
              {practice.label}
            </span>
            {profile.seniority && <Badge variant="neutral">{profile.seniority}</Badge>}
            <StatusPill
              label={statusLabel}
              variant={profile.kind === "collaborator" && profile.status === "en_mission" ? "success" : "neutral"}
            />
          </div>

          <DetailSection title="Compétences">
            {profile.skills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.map((skill) => (
                  <Badge key={skill.id} variant="neutral">
                    {skill.name}
                    {skill.years ? ` · ${skill.years} an${skill.years > 1 ? "s" : ""}` : ""}
                    {skill.level ? ` · niv. ${skill.level}` : ""}
                  </Badge>
                ))}
              </div>
            ) : <p>Compétences non renseignées.</p>}
          </DetailSection>

          {profile.kind === "collaborator" ? (
            <>
              <DetailSection title="Parcours chez KREDO">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div><dt className="text-[10px] font-bold uppercase tracking-wide text-edito-muted">Entrée</dt><dd>{formatTalentDate(profile.entryDate)}</dd></div>
                  <div><dt className="text-[10px] font-bold uppercase tracking-wide text-edito-muted">Disponibilité</dt><dd>{profile.availability || "Non renseignée"}</dd></div>
                </dl>
              </DetailSection>
              <DetailSection title="Historique des missions">
                {profile.missions.length > 0 ? (
                  <ol className="space-y-3">
                    {profile.missions.map((mission) => (
                      <li key={mission.id} className="border-l-2 border-edito-border pl-3">
                        <p className="font-bold text-edito-navy">{mission.title}</p>
                        <p className="text-[11px] text-edito-muted">
                          {[mission.companyName, mission.roleTitle, `${formatTalentDate(mission.startDate)} — ${formatTalentDate(mission.endDate)}`].filter(Boolean).join(" · ")}
                        </p>
                      </li>
                    ))}
                  </ol>
                ) : <p>Aucune mission renseignée.</p>}
              </DetailSection>
            </>
          ) : (
            <>
              {profile.summary && <DetailSection title="Profil"><p>{profile.summary}</p></DetailSection>}
              <DetailSection title="Repères professionnels">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div><dt className="text-[10px] font-bold uppercase tracking-wide text-edito-muted">Expérience</dt><dd>{profile.experienceYears ? `${profile.experienceYears} ans` : "Non renseignée"}</dd></div>
                  <div><dt className="text-[10px] font-bold uppercase tracking-wide text-edito-muted">Disponibilité</dt><dd>{profile.availableFrom ? formatTalentDate(profile.availableFrom) : profile.availability || "Non renseignée"}</dd></div>
                  <div><dt className="text-[10px] font-bold uppercase tracking-wide text-edito-muted">Mobilité</dt><dd>{profile.mobility || "Non renseignée"}</dd></div>
                  <div><dt className="text-[10px] font-bold uppercase tracking-wide text-edito-muted">Remote</dt><dd>{profile.remotePreference || "Non renseignée"}</dd></div>
                </dl>
                {(profile.lastMissionTitle || profile.sectorContext) && <p className="mt-3 text-[11px] text-edito-muted">{[profile.lastMissionTitle, profile.sectorContext].filter(Boolean).join(" · ")}</p>}
              </DetailSection>
            </>
          )}
        </div>
      )}
    </AppDrawer>
  )
}
