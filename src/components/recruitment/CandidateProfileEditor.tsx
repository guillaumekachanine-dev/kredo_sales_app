"use client"

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react"
import { updateCandidateProfile } from "@/app/(app)/recruitment/_actions/update-candidate-profile"
import { Button } from "@/components/ui/Button"
import { Field } from "@/components/ui/Field"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { Textarea } from "@/components/ui/Textarea"
import type { CandidateReferenceProfileData } from "@/types/candidate-reference-profile"
import type {
  CandidatePracticeOption,
  CandidateProfileFormValues,
  CandidateSkillDraft,
  CandidateSkillOption,
} from "@/types/candidate-profile-form"

interface CandidateProfileEditorProps {
  data: CandidateReferenceProfileData
  practices: CandidatePracticeOption[]
  skillOptions: CandidateSkillOption[]
  onCancel: () => void
  onSaved: () => void
  onDirtyChange?: (dirty: boolean) => void
}

type SkillGroup = "technical" | "langue" | "certification" | "secteur"

const STATUS_OPTIONS = [
  ["nouveau", "Nouveau"],
  ["qualifie", "Qualifié"],
  ["vivier", "Vivier"],
  ["propose", "Proposé"],
  ["en_process", "En process"],
  ["recrute", "Recruté"],
  ["refuse", "Refusé"],
  ["indisponible", "Indisponible"],
  ["archive", "Archivé"],
  ["ko_manager", "KO manager"],
] as const

const SENIORITY_OPTIONS = ["", "Junior", "Confirmé", "Senior", "Lead", "Expert"]

const SOURCE_OPTIONS = [
  ["", "Non renseignée"],
  ["linkedin", "LinkedIn"],
  ["referral", "Cooptation"],
  ["inbound", "Candidature spontanée"],
  ["jobboard", "Job board"],
  ["headhunting", "Chasse"],
  ["school", "École"],
  ["event", "Événement"],
  ["portfolio_platform", "Portfolio / Plateforme"],
  ["school_event", "Forum école"],
  ["other", "Autre"],
] as const

const DEGREE_OPTIONS = [
  ["", "Non renseigné"],
  ["none", "Sans diplôme"],
  ["cap_bep", "CAP / BEP"],
  ["bac", "Bac"],
  ["bac_2", "Bac +2"],
  ["bac_3", "Bac +3"],
  ["bac_5", "Bac +5"],
  ["doctorate", "Doctorat"],
  ["other", "Autre"],
] as const

const REMOTE_OPTIONS = [
  ["", "Non renseigné"],
  ["onsite", "Présentiel"],
  ["hybrid", "Hybride"],
  ["remote", "Télétravail"],
  ["flexible", "Flexible"],
] as const

const OFFER_OPTIONS = [
  ["none", "Aucune offre active"],
  ["exploring", "À l’écoute du marché"],
  ["interviewing", "Autres entretiens en cours"],
  ["offer_received", "Offre reçue"],
  ["offer_accepted", "Offre acceptée"],
  ["offer_declined", "Offre déclinée"],
  ["other", "Autre situation"],
] as const

const TECHNICAL_CATEGORY_OPTIONS = [
  ["langage", "Langage"],
  ["framework", "Framework"],
  ["cloud", "Cloud"],
  ["data", "Data"],
  ["devops", "DevOps"],
  ["methode", "Méthode"],
  ["fonctionnel", "Fonctionnel"],
  ["soft_skill", "Soft skill"],
] as const

const CATEGORY_LABELS: Record<string, string> = {
  langage: "Langage",
  framework: "Framework",
  cloud: "Cloud",
  data: "Data",
  devops: "DevOps",
  methode: "Méthode",
  fonctionnel: "Fonctionnel",
  soft_skill: "Soft skill",
  langue: "Langue",
  certification: "Certification",
  secteur: "Secteur",
}

const GROUP_CONFIG: Record<
  SkillGroup,
  { title: string; description: string; fixedCategory: string | null }
> = {
  technical: {
    title: "Compétences",
    description: "Expertises techniques, fonctionnelles et méthodologiques.",
    fixedCategory: null,
  },
  langue: {
    title: "Langues",
    description: "Langues pratiquées et niveau de maîtrise.",
    fixedCategory: "langue",
  },
  certification: {
    title: "Certifications",
    description: "Certifications obtenues ou actives.",
    fixedCategory: "certification",
  },
  secteur: {
    title: "Secteurs",
    description: "Secteurs dans lesquels le candidat possède une expérience réelle.",
    fixedCategory: "secteur",
  },
}

function optionalNumber(value: string) {
  if (value === "") return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function makeClientKey(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function skillGroup(category: string | null): SkillGroup {
  if (category === "langue") return "langue"
  if (category === "certification") return "certification"
  if (category === "secteur") return "secteur"
  return "technical"
}

function initialForm(data: CandidateReferenceProfileData): CandidateProfileFormValues {
  return {
    first_name: data.person?.first_name ?? "",
    last_name: data.person?.last_name ?? "",
    primary_email: data.person?.primary_email ?? "",
    phone: data.person?.phone ?? "",
    linkedin_url: data.person?.linkedin_url ?? "",
    location: data.person?.location ?? "",
    person_notes: data.person?.notes ?? "",
    status: data.status,
    current_title: data.current_title ?? "",
    seniority: data.seniority ?? "",
    source: data.source ?? "",
    practice_id: data.practice_id ?? "",
    experience_years: data.experience_years,
    highest_degree_level: data.highest_degree_level ?? "",
    sector_context: data.sector_context ?? "",
    last_mission_title: data.last_mission_title ?? "",
    last_mission_contribution: data.last_mission_contribution ?? "",
    search_reason: data.search_reason ?? "",
    expected_daily_rate: data.expected_daily_rate,
    expected_salary: data.expected_salary,
    last_salary: data.last_salary,
    available_from: data.available_from ?? "",
    notice_period_days: data.notice_period_days,
    availability_notes: data.availability_notes ?? data.availability ?? "",
    mobility: data.mobility ?? "",
    has_vehicle: data.has_vehicle,
    desired_workload_pct: data.desired_workload_pct,
    max_commute_minutes: data.max_commute_minutes,
    remote_preference: data.remote_preference ?? "",
    remote_days_per_week: data.remote_days_per_week,
    active_offer_status: data.active_offer_status ?? "none",
    active_offer_deadline: data.active_offer_deadline ?? "",
    active_offer_notes: data.active_offer_notes ?? "",
    constraints_notes: data.constraints_notes ?? "",
    notes: data.notes ?? "",
    skills: (data.person?.person_skills ?? []).map((personSkill) => ({
      client_key: personSkill.id,
      skill_id: personSkill.skill.id,
      name: personSkill.skill.name,
      category: personSkill.skill.category,
      level: personSkill.level,
      years: personSkill.years,
      last_used_year: personSkill.last_used_year,
      source: personSkill.source,
      confidence: personSkill.confidence,
      comment: personSkill.comment,
      profile_rank: personSkill.profile_rank,
    })),
  }
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
      {children}
    </h3>
  )
}

interface SkillGroupEditorProps {
  group: SkillGroup
  selected: CandidateSkillDraft[]
  options: CandidateSkillOption[]
  onAdd: (option: CandidateSkillOption) => void
  onCreate: (name: string, category: string) => void
  onRemove: (clientKey: string) => void
  onUpdate: (
    clientKey: string,
    patch: Partial<CandidateSkillDraft>,
  ) => void
}

function SkillGroupEditor({
  group,
  selected,
  options,
  onAdd,
  onCreate,
  onRemove,
  onUpdate,
}: SkillGroupEditorProps) {
  const config = GROUP_CONFIG[group]
  const [query, setQuery] = useState("")
  const [newCategory, setNewCategory] = useState("framework")

  const availableOptions = useMemo(() => {
    const selectedIds = new Set(selected.map((skill) => skill.skill_id).filter(Boolean))
    const normalizedQuery = query.trim().toLocaleLowerCase("fr")

    return options
      .filter((option) => skillGroup(option.category) === group)
      .filter((option) => !selectedIds.has(option.id))
      .filter(
        (option) =>
          !normalizedQuery ||
          option.name.toLocaleLowerCase("fr").includes(normalizedQuery),
      )
      .slice(0, 8)
  }, [group, options, query, selected])

  const normalizedQuery = query.trim().toLocaleLowerCase("fr")
  const exactExists = options.some(
    (option) =>
      skillGroup(option.category) === group &&
      option.name.trim().toLocaleLowerCase("fr") === normalizedQuery,
  )
  const selectedExactExists = selected.some(
    (skill) => skill.name.trim().toLocaleLowerCase("fr") === normalizedQuery,
  )
  const createCategory = config.fixedCategory ?? newCategory
  const canCreate = Boolean(normalizedQuery) && !exactExists && !selectedExactExists

  return (
    <div className="space-y-3 rounded-[var(--radius-large)] border border-border bg-surface p-3">
      <div>
        <h4 className="text-xs font-bold text-heading">{config.title}</h4>
        <p className="mt-0.5 text-[10px] leading-relaxed text-muted">
          {config.description}
        </p>
      </div>

      {selected.length > 0 ? (
        <div className="space-y-2">
          {selected.map((skill) => {
            const isTechnical = group === "technical"
            const showsLevel = group !== "certification" && group !== "secteur"
            const showsYears = group === "technical" || group === "secteur"

            return (
              <div
                key={skill.client_key}
                className="rounded-[var(--radius-medium)] border border-border bg-canvas p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-heading">
                      {skill.name}
                    </p>
                    <p className="mt-0.5 text-[9px] uppercase tracking-wider text-muted">
                      {CATEGORY_LABELS[skill.category ?? ""] ?? "Autre"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(skill.client_key)}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-medium)] text-xs font-semibold text-danger transition-colors hover:bg-danger/[0.08] sm:min-h-9 sm:min-w-9"
                    aria-label={`Retirer ${skill.name}`}
                  >
                    Retirer
                  </button>
                </div>

                {(showsLevel || showsYears || isTechnical) && (
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {showsLevel && (
                      <Field label="Niveau" optional>
                        <Select
                          value={skill.level ?? ""}
                          onChange={(event) =>
                            onUpdate(skill.client_key, {
                              level: optionalNumber(event.target.value),
                            })
                          }
                          fullWidth
                          aria-label={`Niveau de ${skill.name}`}
                        >
                          <option value="">—</option>
                          <option value="1">1 · Notions</option>
                          <option value="2">2 · Débutant</option>
                          <option value="3">3 · Intermédiaire</option>
                          <option value="4">4 · Avancé</option>
                          <option value="5">5 · Expert</option>
                        </Select>
                      </Field>
                    )}
                    {showsYears && (
                      <Field label="Années" optional>
                        <Input
                          type="number"
                          min={0}
                          max={60}
                          value={skill.years ?? ""}
                          onChange={(event) =>
                            onUpdate(skill.client_key, {
                              years: optionalNumber(event.target.value),
                            })
                          }
                          fullWidth
                        />
                      </Field>
                    )}
                    {isTechnical && (
                      <Field label="Top 3" optional>
                        <Select
                          value={skill.profile_rank ?? ""}
                          onChange={(event) =>
                            onUpdate(skill.client_key, {
                              profile_rank: optionalNumber(event.target.value),
                            })
                          }
                          fullWidth
                          aria-label={`Rang principal de ${skill.name}`}
                        >
                          <option value="">Non classée</option>
                          <option value="1">#1</option>
                          <option value="2">#2</option>
                          <option value="3">#3</option>
                        </Select>
                      </Field>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <p className="rounded-[var(--radius-medium)] border border-dashed border-border px-3 py-4 text-center text-[10px] text-muted">
          Aucun élément renseigné.
        </p>
      )}

      <div className="space-y-2 border-t border-border/70 pt-3">
        {group === "technical" && (
          <Field label="Catégorie d’une nouvelle compétence" optional>
            <Select
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              fullWidth
              aria-label="Catégorie de la nouvelle compétence"
            >
              {TECHNICAL_CATEGORY_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label={`Ajouter — ${config.title}`} optional>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Rechercher ou créer ${config.title.toLocaleLowerCase("fr")}`}
            fullWidth
          />
        </Field>

        {query.trim() && (
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-[var(--radius-medium)] border border-border bg-surface p-1">
            {availableOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onAdd(option)
                  setQuery("")
                }}
                className="flex min-h-11 w-full items-center justify-between gap-3 rounded-[var(--radius-small)] px-3 py-2 text-left transition-colors hover:bg-canvas"
              >
                <span className="truncate text-xs font-semibold text-heading">
                  {option.name}
                </span>
                <span className="shrink-0 text-[9px] uppercase tracking-wider text-muted">
                  {CATEGORY_LABELS[option.category ?? ""] ?? "Autre"}
                </span>
              </button>
            ))}

            {canCreate && (
              <button
                type="button"
                onClick={() => {
                  onCreate(query.trim(), createCategory)
                  setQuery("")
                }}
                className="flex min-h-11 w-full items-center rounded-[var(--radius-small)] px-3 py-2 text-left text-xs font-semibold text-primary transition-colors hover:bg-primary/[0.06]"
              >
                Créer « {query.trim()} »
              </button>
            )}

            {availableOptions.length === 0 && !canCreate && (
              <p className="px-3 py-3 text-center text-[10px] text-muted">
                Aucun résultat disponible.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function CandidateProfileEditor({
  data,
  practices,
  skillOptions,
  onCancel,
  onSaved,
  onDirtyChange,
}: CandidateProfileEditorProps) {
  const startingForm = useMemo(() => initialForm(data), [data])
  const [form, setForm] = useState<CandidateProfileFormValues>(startingForm)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setForm(startingForm)
  }, [startingForm])

  const dirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(startingForm),
    [form, startingForm],
  )

  useEffect(() => {
    onDirtyChange?.(dirty)
  }, [dirty, onDirtyChange])

  const set = <K extends keyof CandidateProfileFormValues>(
    key: K,
    value: CandidateProfileFormValues[K],
  ) => setForm((current) => ({ ...current, [key]: value }))

  const selectedByGroup = useMemo(() => {
    return {
      technical: form.skills.filter(
        (skill) => skillGroup(skill.category) === "technical",
      ),
      langue: form.skills.filter(
        (skill) => skillGroup(skill.category) === "langue",
      ),
      certification: form.skills.filter(
        (skill) => skillGroup(skill.category) === "certification",
      ),
      secteur: form.skills.filter(
        (skill) => skillGroup(skill.category) === "secteur",
      ),
    }
  }, [form.skills])

  const addExistingSkill = (option: CandidateSkillOption) => {
    if (form.skills.some((skill) => skill.skill_id === option.id)) return

    set("skills", [
      ...form.skills,
      {
        client_key: option.id,
        skill_id: option.id,
        name: option.name,
        category: option.category,
        level: null,
        years: null,
        last_used_year: null,
        source: "manuel",
        confidence: null,
        comment: null,
        profile_rank: null,
      },
    ])
  }

  const createSkill = (name: string, category: string) => {
    const normalizedName = name.trim().toLocaleLowerCase("fr")
    if (
      form.skills.some(
        (skill) =>
          skill.name.trim().toLocaleLowerCase("fr") === normalizedName &&
          skill.category === category,
      )
    ) {
      return
    }

    set("skills", [
      ...form.skills,
      {
        client_key: makeClientKey("new-skill"),
        skill_id: null,
        name: name.trim(),
        category,
        level: null,
        years: null,
        last_used_year: null,
        source: "manuel",
        confidence: null,
        comment: null,
        profile_rank: null,
      },
    ])
  }

  const removeSkill = (clientKey: string) => {
    set(
      "skills",
      form.skills.filter((skill) => skill.client_key !== clientKey),
    )
  }

  const updateSkill = (
    clientKey: string,
    patch: Partial<CandidateSkillDraft>,
  ) => {
    set(
      "skills",
      form.skills.map((skill) => {
        if (skill.client_key !== clientKey) {
          if (
            patch.profile_rank !== undefined &&
            patch.profile_rank !== null &&
            skill.profile_rank === patch.profile_rank
          ) {
            return { ...skill, profile_rank: null }
          }
          return skill
        }
        return { ...skill, ...patch }
      }),
    )
  }

  const canSubmit = Boolean(form.first_name.trim() && form.last_name.trim())

  const handleSubmit = () => {
    if (!canSubmit || !dirty) return
    setError(null)

    startTransition(async () => {
      const result = await updateCandidateProfile(data.id, form)
      if (result.error) {
        setError(result.error)
        return
      }
      onDirtyChange?.(false)
      onSaved()
    })
  }

  return (
    <div className="space-y-6 pb-24">
      <section className="space-y-3">
        <SectionTitle>Identité et coordonnées</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Prénom" required>
            <Input
              value={form.first_name}
              onChange={(event) => set("first_name", event.target.value)}
              fullWidth
            />
          </Field>
          <Field label="Nom" required>
            <Input
              value={form.last_name}
              onChange={(event) => set("last_name", event.target.value)}
              fullWidth
            />
          </Field>
        </div>
        <Field label="E-mail" optional>
          <Input
            type="email"
            value={form.primary_email}
            onChange={(event) => set("primary_email", event.target.value)}
            fullWidth
          />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Téléphone" optional>
            <Input
              type="tel"
              value={form.phone}
              onChange={(event) => set("phone", event.target.value)}
              fullWidth
            />
          </Field>
          <Field label="Lieu de résidence" optional>
            <Input
              value={form.location}
              onChange={(event) => set("location", event.target.value)}
              fullWidth
            />
          </Field>
        </div>
        <Field label="LinkedIn" optional>
          <Input
            value={form.linkedin_url}
            onChange={(event) => set("linkedin_url", event.target.value)}
            fullWidth
          />
        </Field>
      </section>

      <section className="space-y-3 border-t border-border pt-5">
        <SectionTitle>Profil professionnel</SectionTitle>
        <Field label="Poste / titre" optional>
          <Input
            value={form.current_title}
            onChange={(event) => set("current_title", event.target.value)}
            fullWidth
          />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Statut candidat" required>
            <Select
              value={form.status}
              onChange={(event) => set("status", event.target.value)}
              fullWidth
              aria-label="Statut candidat"
            >
              {STATUS_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Practice" optional>
            <Select
              value={form.practice_id}
              onChange={(event) => set("practice_id", event.target.value)}
              fullWidth
              aria-label="Practice"
            >
              <option value="">Non renseignée</option>
              {practices.map((practice) => (
                <option key={practice.id} value={practice.id}>
                  {practice.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Séniorité" optional>
            <Select
              value={form.seniority}
              onChange={(event) => set("seniority", event.target.value)}
              fullWidth
              aria-label="Séniorité"
            >
              {SENIORITY_OPTIONS.map((value) => (
                <option key={value || "empty"} value={value}>
                  {value || "Non renseignée"}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Expérience (années)" optional>
            <Input
              type="number"
              min={0}
              max={60}
              step={0.5}
              value={form.experience_years ?? ""}
              onChange={(event) =>
                set("experience_years", optionalNumber(event.target.value))
              }
              fullWidth
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Diplôme le plus élevé" optional>
            <Select
              value={form.highest_degree_level}
              onChange={(event) =>
                set("highest_degree_level", event.target.value)
              }
              fullWidth
              aria-label="Diplôme le plus élevé"
            >
              {DEGREE_OPTIONS.map(([value, label]) => (
                <option key={value || "empty"} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Source" optional>
            <Select
              value={form.source}
              onChange={(event) => set("source", event.target.value)}
              fullWidth
              aria-label="Source"
            >
              {SOURCE_OPTIONS.map(([value, label]) => (
                <option key={value || "empty"} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </section>

      <section className="space-y-3 border-t border-border pt-5">
        <SectionTitle>Expertise</SectionTitle>
        {(["technical", "langue", "certification", "secteur"] as SkillGroup[]).map(
          (group) => (
            <SkillGroupEditor
              key={group}
              group={group}
              selected={selectedByGroup[group]}
              options={skillOptions}
              onAdd={addExistingSkill}
              onCreate={createSkill}
              onRemove={removeSkill}
              onUpdate={updateSkill}
            />
          ),
        )}
      </section>

      <section className="space-y-3 border-t border-border pt-5">
        <SectionTitle>Expérience et projet professionnel</SectionTitle>
        <Field label="Dernière mission" optional>
          <Input
            value={form.last_mission_title}
            onChange={(event) => set("last_mission_title", event.target.value)}
            fullWidth
          />
        </Field>
        <Field label="Contribution sur la dernière mission" optional>
          <Textarea
            value={form.last_mission_contribution}
            onChange={(event) =>
              set("last_mission_contribution", event.target.value)
            }
            rows={3}
            fullWidth
          />
        </Field>
        <Field label="Contexte sectoriel" optional>
          <Textarea
            value={form.sector_context}
            onChange={(event) => set("sector_context", event.target.value)}
            rows={2}
            fullWidth
          />
        </Field>
        <Field label="Motif de recherche" optional>
          <Textarea
            value={form.search_reason}
            onChange={(event) => set("search_reason", event.target.value)}
            rows={2}
            fullWidth
          />
        </Field>
      </section>

      <section className="space-y-3 border-t border-border pt-5">
        <SectionTitle>Disponibilité et rémunération</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Disponible à partir du" optional>
            <Input
              type="date"
              value={form.available_from}
              onChange={(event) => set("available_from", event.target.value)}
              fullWidth
            />
          </Field>
          <Field label="Préavis (jours)" optional>
            <Input
              type="number"
              min={0}
              max={365}
              value={form.notice_period_days ?? ""}
              onChange={(event) =>
                set("notice_period_days", optionalNumber(event.target.value))
              }
              fullWidth
            />
          </Field>
        </div>
        <Field label="Précisions de disponibilité" optional>
          <Input
            value={form.availability_notes}
            onChange={(event) => set("availability_notes", event.target.value)}
            fullWidth
          />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Salaire souhaité" optional>
            <Input
              type="number"
              min={0}
              step={1000}
              value={form.expected_salary ?? ""}
              onChange={(event) =>
                set("expected_salary", optionalNumber(event.target.value))
              }
              fullWidth
            />
          </Field>
          <Field label="Dernier salaire" optional>
            <Input
              type="number"
              min={0}
              step={1000}
              value={form.last_salary ?? ""}
              onChange={(event) =>
                set("last_salary", optionalNumber(event.target.value))
              }
              fullWidth
            />
          </Field>
          <Field label="TJM souhaité" optional>
            <Input
              type="number"
              min={0}
              step={10}
              value={form.expected_daily_rate ?? ""}
              onChange={(event) =>
                set("expected_daily_rate", optionalNumber(event.target.value))
              }
              fullWidth
            />
          </Field>
        </div>
      </section>

      <section className="space-y-3 border-t border-border pt-5">
        <SectionTitle>Mobilité et organisation</SectionTitle>
        <Field label="Zone de mobilité" optional>
          <Input
            value={form.mobility}
            onChange={(event) => set("mobility", event.target.value)}
            fullWidth
          />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Véhicule" optional>
            <Select
              value={
                form.has_vehicle === null
                  ? ""
                  : form.has_vehicle
                    ? "yes"
                    : "no"
              }
              onChange={(event) =>
                set(
                  "has_vehicle",
                  event.target.value === ""
                    ? null
                    : event.target.value === "yes",
                )
              }
              fullWidth
              aria-label="Véhicule"
            >
              <option value="">Non renseigné</option>
              <option value="yes">Oui</option>
              <option value="no">Non</option>
            </Select>
          </Field>
          <Field label="Trajet maximal (minutes)" optional>
            <Input
              type="number"
              min={0}
              max={300}
              value={form.max_commute_minutes ?? ""}
              onChange={(event) =>
                set("max_commute_minutes", optionalNumber(event.target.value))
              }
              fullWidth
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Organisation" optional>
            <Select
              value={form.remote_preference}
              onChange={(event) => set("remote_preference", event.target.value)}
              fullWidth
              aria-label="Organisation"
            >
              {REMOTE_OPTIONS.map(([value, label]) => (
                <option key={value || "empty"} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Jours distanciels / sem." optional>
            <Input
              type="number"
              min={0}
              max={5}
              value={form.remote_days_per_week ?? ""}
              onChange={(event) =>
                set("remote_days_per_week", optionalNumber(event.target.value))
              }
              fullWidth
            />
          </Field>
          <Field label="Temps de travail (%)" optional>
            <Input
              type="number"
              min={10}
              max={100}
              step={10}
              value={form.desired_workload_pct ?? ""}
              onChange={(event) =>
                set("desired_workload_pct", optionalNumber(event.target.value))
              }
              fullWidth
            />
          </Field>
        </div>
        <Field label="Contraintes particulières" optional>
          <Textarea
            value={form.constraints_notes}
            onChange={(event) => set("constraints_notes", event.target.value)}
            rows={2}
            fullWidth
          />
        </Field>
      </section>

      <section className="space-y-3 border-t border-border pt-5">
        <SectionTitle>Situation marché</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Autres démarches" optional>
            <Select
              value={form.active_offer_status}
              onChange={(event) => set("active_offer_status", event.target.value)}
              fullWidth
              aria-label="Situation marché"
            >
              {OFFER_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Échéance de décision" optional>
            <Input
              type="date"
              value={form.active_offer_deadline}
              onChange={(event) =>
                set("active_offer_deadline", event.target.value)
              }
              fullWidth
            />
          </Field>
        </div>
        <Field label="Précisions sur les offres concurrentes" optional>
          <Textarea
            value={form.active_offer_notes}
            onChange={(event) => set("active_offer_notes", event.target.value)}
            rows={2}
            fullWidth
          />
        </Field>
      </section>

      <section className="space-y-3 border-t border-border pt-5">
        <SectionTitle>Notes internes</SectionTitle>
        <Field label="Notes candidat" optional>
          <Textarea
            value={form.notes}
            onChange={(event) => set("notes", event.target.value)}
            rows={3}
            fullWidth
          />
        </Field>
        <Field label="Notes personne" optional>
          <Textarea
            value={form.person_notes}
            onChange={(event) => set("person_notes", event.target.value)}
            rows={2}
            fullWidth
          />
        </Field>
      </section>

      {error && (
        <div className="rounded-[var(--radius-large)] border border-danger/30 bg-danger/[0.06] px-3 py-2.5 text-xs text-danger">
          {error}
        </div>
      )}

      <div className="sticky bottom-0 z-10 -mx-4 flex justify-end gap-2 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={isPending}>
          Annuler
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleSubmit}
          disabled={!canSubmit || !dirty}
          loading={isPending}
          loadingLabel="Enregistrement"
        >
          Enregistrer
        </Button>
      </div>
    </div>
  )
}
