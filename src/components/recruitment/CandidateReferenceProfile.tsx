"use client"

import { useMemo } from "react"
import { StatusPill } from "@/components/ui/StatusPill"
import type {
  CandidateReferenceProfileData,
  CandidateReferenceSkill,
} from "@/types/candidate-reference-profile"

interface CandidateReferenceProfileProps {
  data: CandidateReferenceProfileData
}

const DEGREE_LABELS: Record<string, string> = {
  none: "Sans diplôme",
  cap_bep: "CAP / BEP",
  bac: "Bac",
  bac_2: "Bac +2",
  bac_3: "Bac +3",
  bac_5: "Bac +5",
  doctorate: "Doctorat",
  other: "Autre",
}

const REMOTE_LABELS: Record<string, string> = {
  onsite: "Présentiel",
  hybrid: "Hybride",
  remote: "Télétravail",
  flexible: "Flexible",
}

const OFFER_LABELS: Record<string, string> = {
  none: "Aucune offre active",
  exploring: "À l’écoute du marché",
  interviewing: "Autres entretiens en cours",
  offer_received: "Offre reçue",
  offer_accepted: "Offre acceptée",
  offer_declined: "Offre déclinée",
  other: "Autre situation",
}

const STATUS_LABELS: Record<string, string> = {
  nouveau: "Nouveau",
  qualifie: "Qualifié",
  vivier: "Vivier",
  propose: "Proposé",
  en_process: "En process",
  recrute: "Recruté",
  refuse: "Refusé",
  indisponible: "Indisponible",
  archive: "Archivé",
  ko_manager: "KO manager",
}

function statusVariant(status: string) {
  if (["qualifie", "recrute"].includes(status)) return "success" as const
  if (["propose", "en_process", "nouveau"].includes(status)) return "warning" as const
  if (["refuse", "ko_manager"].includes(status)) return "danger" as const
  return "neutral" as const
}

function formatCurrency(value: number | null) {
  if (value === null) return "Non renseigné"
  return value.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  })
}

function formatDate(value: string | null) {
  if (!value) return "Non renseignée"
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function display(value: string | number | null | undefined, suffix = "") {
  if (value === null || value === undefined || value === "") return "Non renseigné"
  return `${value}${suffix}`
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-block h-0 w-0 border-y-[4px] border-y-transparent border-l-[6px]"
        style={{ borderLeftColor: "#9C27B0" }}
        aria-hidden="true"
      />
      <h4 className="select-none text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
        {children}
      </h4>
    </div>
  )
}

function ProfileField({
  label,
  value,
  accent = false,
}: {
  label: string
  value: React.ReactNode
  accent?: boolean
}) {
  return (
    <div className="min-w-0">
      <span className="block text-[10px] text-muted">{label}</span>
      <span
        className={`mt-0.5 block text-xs font-semibold leading-relaxed ${
          accent ? "text-[#9C27B0]" : "text-heading"
        }`}
      >
        {value}
      </span>
    </div>
  )
}

function SkillPill({ skill }: { skill: CandidateReferenceSkill }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-medium)] border border-border/60 bg-muted/10 px-2.5 py-1 text-[11px] font-medium text-heading">
      <span>{skill.skill.name}</span>
      {skill.level !== null && (
        <span className="text-[10px] font-semibold text-[#9C27B0]">{skill.level}/5</span>
      )}
    </span>
  )
}

function SkillsGroup({
  label,
  skills,
}: {
  label: string
  skills: CandidateReferenceSkill[]
}) {
  if (skills.length === 0) return null

  return (
    <div className="space-y-1.5">
      <span className="block text-[9px] font-bold uppercase tracking-wider text-muted">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {skills.map((skill) => (
          <SkillPill key={skill.id} skill={skill} />
        ))}
      </div>
    </div>
  )
}

export function CandidateReferenceProfile({
  data,
}: CandidateReferenceProfileProps) {
  const skills = data.person?.person_skills ?? []

  const groupedSkills = useMemo(() => {
    const ranked = skills
      .filter((skill) => skill.profile_rank !== null)
      .sort((left, right) =>
        (left.profile_rank ?? 99) - (right.profile_rank ?? 99),
      )

    const fallback = [...skills]
      .filter(
        (skill) =>
          !["langue", "certification", "secteur"].includes(
            skill.skill.category ?? "",
          ),
      )
      .sort((left, right) => {
        const levelDiff = (right.level ?? 0) - (left.level ?? 0)
        if (levelDiff !== 0) return levelDiff
        return (right.years ?? 0) - (left.years ?? 0)
      })
      .slice(0, 3)

    return {
      primary: ranked.length > 0 ? ranked : fallback,
      languages: skills.filter((skill) => skill.skill.category === "langue"),
      certifications: skills.filter(
        (skill) => skill.skill.category === "certification",
      ),
      sectors: skills.filter((skill) => skill.skill.category === "secteur"),
    }
  }, [skills])

  const availabilityLabel = data.available_from
    ? formatDate(data.available_from)
    : data.availability_notes || data.availability || "Non renseignée"

  const remoteLabel = data.remote_preference
    ? `${REMOTE_LABELS[data.remote_preference] ?? data.remote_preference}${
        data.remote_days_per_week !== null
          ? ` · ${data.remote_days_per_week} j/sem.`
          : ""
      }`
    : "Non renseigné"

  const offerLabel =
    OFFER_LABELS[data.active_offer_status ?? "none"] ??
    data.active_offer_status ??
    OFFER_LABELS.none

  return (
    <div className="space-y-6">
      {/* ── Profil professionnel (En-tête sous forme de cadre) ── */}
      <section className="rounded-[var(--radius-large)] border border-border bg-surface p-3.5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h4
            className="select-none text-[10px] font-bold uppercase tracking-[0.14em]"
            style={{ color: "#9C27B0" }}
          >
            Profil professionnel
          </h4>
          <p className="mt-1.5 text-sm font-bold leading-snug text-heading">
            {data.current_title || "Intitulé non renseigné"}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {data.practice?.name || "Practice non renseignée"}
          </p>
        </div>
        <StatusPill
          label={STATUS_LABELS[data.status] ?? data.status.replace(/_/g, " ")}
          variant={statusVariant(data.status)}
          dot={data.status === "en_process"}
          className="!rounded-[4px] shrink-0"
        />
      </section>

      {/* ── Détails du profil (flat) ── */}
      <section className="grid grid-cols-2 gap-x-4 gap-y-3 pt-1">
        <ProfileField label="Séniorité" value={display(data.seniority)} />
        <ProfileField
          label="Expérience"
          value={
            data.experience_years !== null
              ? `${data.experience_years} an${data.experience_years > 1 ? "s" : ""}`
              : "Non renseignée"
          }
        />
        <ProfileField
          label="Diplôme le plus élevé"
          value={
            data.highest_degree_level
              ? DEGREE_LABELS[data.highest_degree_level] ??
                data.highest_degree_level
              : "Non renseigné"
          }
        />
        <ProfileField
          label="Localisation"
          value={display(data.person?.location)}
        />
      </section>

      <hr className="border-border/40" />

      {/* ── Expertise ── */}
      <section className="space-y-3">
        <SectionTitle>Expertise</SectionTitle>
        {groupedSkills.primary.length > 0 ? (
          <SkillsGroup
            label="3 compétences principales"
            skills={groupedSkills.primary}
          />
        ) : (
          <p className="text-xs text-muted">Aucune compétence renseignée.</p>
        )}
        <div className="grid grid-cols-1 gap-3 pt-1">
          <SkillsGroup label="Secteurs" skills={groupedSkills.sectors} />
          <SkillsGroup label="Langues" skills={groupedSkills.languages} />
          <SkillsGroup
            label="Certifications"
            skills={groupedSkills.certifications}
          />
        </div>
        {data.sector_context && (
          <div className="pt-1">
            <ProfileField label="Contexte sectoriel" value={data.sector_context} />
          </div>
        )}
      </section>

      <hr className="border-border/40" />

      {/* ── Expérience et projet professionnel ── */}
      <section className="space-y-3">
        <SectionTitle>Expérience et projet professionnel</SectionTitle>
        <div className="space-y-3 pt-1">
          <ProfileField
            label="Dernière mission"
            value={display(data.last_mission_title)}
          />
          {data.last_mission_contribution && (
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-body">
              {data.last_mission_contribution}
            </p>
          )}
          <ProfileField
            label="Motif de recherche"
            value={display(data.search_reason)}
          />
        </div>
      </section>

      <hr className="border-border/40" />

      {/* ── Conditions recherchées ── */}
      <section className="space-y-3">
        <SectionTitle>Conditions recherchées</SectionTitle>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-1">
          <ProfileField
            label="Salaire souhaité"
            value={formatCurrency(data.expected_salary)}
            accent
          />
          <ProfileField
            label="Dernier salaire"
            value={formatCurrency(data.last_salary)}
          />
          <ProfileField
            label="TJM souhaité"
            value={
              data.expected_daily_rate !== null
                ? `${data.expected_daily_rate.toLocaleString("fr-FR")} €`
                : "Non renseigné"
            }
          />
          <ProfileField
            label="Temps de travail souhaité"
            value={display(data.desired_workload_pct, "%")}
          />
          <ProfileField label="Disponibilité" value={availabilityLabel} />
          <ProfileField
            label="Préavis"
            value={
              data.notice_period_days !== null
                ? `${data.notice_period_days} jour${
                    data.notice_period_days > 1 ? "s" : ""
                  }`
                : "Non renseigné"
            }
          />
        </div>
      </section>

      <hr className="border-border/40" />

      {/* ── Mobilité et contraintes ── */}
      <section className="space-y-3">
        <SectionTitle>Mobilité et contraintes</SectionTitle>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-1">
          <ProfileField label="Zone de mobilité" value={display(data.mobility)} />
          <ProfileField label="Télétravail" value={remoteLabel} />
          <ProfileField
            label="Temps de trajet maximal"
            value={
              data.max_commute_minutes !== null
                ? `${data.max_commute_minutes} min`
                : "Non renseigné"
            }
          />
          <ProfileField
            label="Véhicule"
            value={
              data.has_vehicle === null
                ? "Non renseigné"
                : data.has_vehicle
                  ? "Oui"
                  : "Non"
            }
          />
        </div>
        {data.constraints_notes && (
          <div className="pt-1">
            <ProfileField
              label="Contraintes particulières"
              value={data.constraints_notes}
            />
          </div>
        )}
      </section>

      <hr className="border-border/40" />

      {/* ── Situation marché ── */}
      <section className="space-y-3">
        <SectionTitle>Situation marché</SectionTitle>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-1">
          <ProfileField label="Statut" value={offerLabel} />
          <ProfileField
            label="Échéance"
            value={formatDate(data.active_offer_deadline)}
          />
        </div>
        {data.active_offer_notes && (
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-body pt-1">
            {data.active_offer_notes}
          </p>
        )}
      </section>

      {(data.person?.primary_email ||
        data.person?.phone ||
        data.person?.linkedin_url) && (
        <>
          <hr className="border-border/40" />
          {/* ── Coordonnées ── */}
          <section className="space-y-3">
            <SectionTitle>Coordonnées</SectionTitle>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 pt-1">
              {data.person.primary_email && (
                <a
                  href={`mailto:${data.person.primary_email}`}
                  className="min-h-11 rounded-[var(--radius-medium)] border border-border/80 bg-muted/10 px-3 py-2 text-xs font-semibold text-heading transition-colors hover:bg-muted/20"
                >
                  <span className="block text-[9px] uppercase tracking-wider text-muted">
                    E-mail
                  </span>
                  <span className="mt-0.5 block truncate">
                    {data.person.primary_email}
                  </span>
                </a>
              )}
              {data.person.phone && (
                <a
                  href={`tel:${data.person.phone}`}
                  className="min-h-11 rounded-[var(--radius-medium)] border border-border/80 bg-muted/10 px-3 py-2 text-xs font-semibold text-heading transition-colors hover:bg-muted/20"
                >
                  <span className="block text-[9px] uppercase tracking-wider text-muted">
                    Téléphone
                  </span>
                  <span className="mt-0.5 block">{data.person.phone}</span>
                </a>
              )}
            </div>
            {data.person.linkedin_url && (
              <div className="pt-1">
                <a
                  href={
                    data.person.linkedin_url.startsWith("http")
                      ? data.person.linkedin_url
                      : `https://${data.person.linkedin_url}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-9 items-center text-xs font-semibold text-[#9C27B0] hover:underline"
                >
                  Ouvrir le profil LinkedIn
                </a>
              </div>
            )}
          </section>
        </>
      )}

      {(data.summary || data.notes || data.person?.notes) && (
        <>
          <hr className="border-border/40" />
          {/* ── Notes internes ── */}
          <section className="space-y-3">
            <SectionTitle>Notes internes</SectionTitle>
            <div className="space-y-3 pt-1">
              {data.summary && (
                <div className="rounded-[var(--radius-medium)] border border-[#9C27B0]/20 bg-[#9C27B0]/[0.05] p-3">
                  <span className="mb-1 block text-[9px] font-bold uppercase tracking-wider text-[#9C27B0]">
                    Synthèse dérivée
                  </span>
                  <p className="text-xs leading-relaxed text-body">{data.summary}</p>
                </div>
              )}
              {(data.notes || data.person?.notes) && (
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-body">
                  {data.notes || data.person?.notes}
                </p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
