"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { Button } from "@/components/ui/Button"
import { Field } from "@/components/ui/Field"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { Textarea } from "@/components/ui/Textarea"
import {
  createCandidate,
  type CreateCandidateInput,
} from "@/app/(app)/recruitment/_actions/create-candidate"
import { getOfferPracticesForPicker } from "@/lib/reference-data/reference-data-actions"

interface NewCandidateDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface PracticeOption {
  id: string
  name: string
}

const SENIORITY_OPTIONS = [
  { value: "", label: "Non renseigné" },
  { value: "Junior", label: "Junior" },
  { value: "Confirmé", label: "Confirmé" },
  { value: "Senior", label: "Senior" },
  { value: "Lead", label: "Lead" },
  { value: "Expert", label: "Expert" },
]

const SOURCE_OPTIONS = [
  { value: "", label: "Non renseignée" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "referral", label: "Cooptation" },
  { value: "inbound", label: "Candidature spontanée" },
  { value: "jobboard", label: "Job board" },
  { value: "headhunting", label: "Chasse" },
  { value: "school", label: "École" },
  { value: "event", label: "Événement" },
  { value: "portfolio_platform", label: "Portfolio / Plateforme" },
  { value: "school_event", label: "Forum école" },
  { value: "other", label: "Autre" },
]

const DEGREE_OPTIONS = [
  { value: "", label: "Non renseigné" },
  { value: "none", label: "Sans diplôme" },
  { value: "cap_bep", label: "CAP / BEP" },
  { value: "bac", label: "Bac" },
  { value: "bac_2", label: "Bac +2" },
  { value: "bac_3", label: "Bac +3" },
  { value: "bac_5", label: "Bac +5" },
  { value: "doctorate", label: "Doctorat" },
  { value: "other", label: "Autre" },
]

const REMOTE_OPTIONS = [
  { value: "", label: "Non renseigné" },
  { value: "onsite", label: "Présentiel" },
  { value: "hybrid", label: "Hybride" },
  { value: "remote", label: "Télétravail" },
  { value: "flexible", label: "Flexible" },
]

const OFFER_OPTIONS = [
  { value: "none", label: "Aucune offre active" },
  { value: "exploring", label: "À l’écoute du marché" },
  { value: "interviewing", label: "Autres entretiens en cours" },
  { value: "offer_received", label: "Offre reçue" },
  { value: "offer_accepted", label: "Offre acceptée" },
  { value: "offer_declined", label: "Offre déclinée" },
  { value: "other", label: "Autre situation" },
]

const INITIAL_FORM: CreateCandidateInput = {
  first_name: "",
  last_name: "",
  primary_email: "",
  phone: "",
  linkedin_url: "",
  location: "",
  current_title: "",
  seniority: "",
  source: "",
  practice_id: "",
  experience_years: undefined,
  highest_degree_level: "",
  sector_context: "",
  last_mission_title: "",
  last_mission_contribution: "",
  search_reason: "",
  expected_daily_rate: undefined,
  expected_salary: undefined,
  last_salary: undefined,
  available_from: "",
  notice_period_days: undefined,
  availability_notes: "",
  mobility: "",
  has_vehicle: null,
  desired_workload_pct: 100,
  max_commute_minutes: undefined,
  remote_preference: "",
  remote_days_per_week: undefined,
  active_offer_status: "none",
  active_offer_deadline: "",
  active_offer_notes: "",
  constraints_notes: "",
  notes: "",
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
      {children}
    </p>
  )
}

function optionalNumber(value: string) {
  return value === "" ? undefined : Number(value)
}

export function NewCandidateDrawer({
  open,
  onOpenChange,
}: NewCandidateDrawerProps) {
  const router = useRouter()
  const [form, setForm] = useState<CreateCandidateInput>({ ...INITIAL_FORM })
  const [practices, setPractices] = useState<PracticeOption[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const set = <K extends keyof CreateCandidateInput>(
    key: K,
    value: CreateCandidateInput[K],
  ) => setForm((current) => ({ ...current, [key]: value }))

  useEffect(() => {
    if (!open) return

    const loadPractices = async () => {
      try {
        const data = await getOfferPracticesForPicker()
        setPractices(data)
      } catch (practicesError) {
        console.error("[NewCandidateDrawer] Practices loading error:", practicesError)
      }
    }

    void loadPractices()
  }, [open])

  const canSubmit =
    form.first_name.trim().length >= 1 && form.last_name.trim().length >= 1

  const handleSubmit = () => {
    if (!canSubmit) return
    setError(null)

    startTransition(async () => {
      const result = await createCandidate(form)
      if (result.error) {
        setError(result.error)
        return
      }

      setForm({ ...INITIAL_FORM })
      onOpenChange(false)
      router.refresh()
    })
  }

  const handleClose = (next: boolean) => {
    if (!next) {
      setForm({ ...INITIAL_FORM })
      setError(null)
    }
    onOpenChange(next)
  }

  return (
    <AppDrawer
      open={open}
      onOpenChange={handleClose}
      title="Nouveau candidat"
      eyebrow="Recrutement"
      className="max-w-[560px]"
    >
      <div className="space-y-6 pb-6">
        <section className="space-y-3">
          <SectionTitle>Identité et coordonnées</SectionTitle>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Prénom" required>
              <Input
                value={form.first_name}
                onChange={(event) => set("first_name", event.target.value)}
                placeholder="Jean"
                fullWidth
              />
            </Field>
            <Field label="Nom" required>
              <Input
                value={form.last_name}
                onChange={(event) => set("last_name", event.target.value)}
                placeholder="Dupont"
                fullWidth
              />
            </Field>
          </div>

          <Field label="E-mail" optional>
            <Input
              type="email"
              value={form.primary_email}
              onChange={(event) => set("primary_email", event.target.value)}
              placeholder="jean.dupont@example.com"
              fullWidth
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Téléphone" optional>
              <Input
                type="tel"
                value={form.phone}
                onChange={(event) => set("phone", event.target.value)}
                placeholder="+33 6 12 34 56 78"
                fullWidth
              />
            </Field>
            <Field label="Lieu de résidence" optional>
              <Input
                value={form.location}
                onChange={(event) => set("location", event.target.value)}
                placeholder="Nice"
                fullWidth
              />
            </Field>
          </div>

          <Field label="LinkedIn" optional>
            <Input
              value={form.linkedin_url}
              onChange={(event) => set("linkedin_url", event.target.value)}
              placeholder="linkedin.com/in/jean-dupont"
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
              placeholder="Développeur Full-Stack"
              fullWidth
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            <Field label="Séniorité" optional>
              <Select
                value={form.seniority}
                onChange={(event) => set("seniority", event.target.value)}
                fullWidth
                aria-label="Séniorité"
              >
                {SENIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            <Field label="Diplôme le plus élevé" optional>
              <Select
                value={form.highest_degree_level}
                onChange={(event) =>
                  set("highest_degree_level", event.target.value)
                }
                fullWidth
                aria-label="Diplôme le plus élevé"
              >
                {DEGREE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Source" optional>
            <Select
              value={form.source}
              onChange={(event) => set("source", event.target.value)}
              fullWidth
              aria-label="Source"
            >
              {SOURCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </section>

        <section className="space-y-3 border-t border-border pt-5">
          <SectionTitle>Expérience et projet professionnel</SectionTitle>

          <Field label="Dernière mission" optional>
            <Input
              value={form.last_mission_title}
              onChange={(event) =>
                set("last_mission_title", event.target.value)
              }
              placeholder="Refonte du SI de réservation"
              fullWidth
            />
          </Field>

          <Field label="Contribution sur la dernière mission" optional>
            <Textarea
              value={form.last_mission_contribution}
              onChange={(event) =>
                set("last_mission_contribution", event.target.value)
              }
              placeholder="Responsabilités, résultats, périmètre…"
              rows={3}
              fullWidth
            />
          </Field>

          <Field label="Contexte sectoriel" optional>
            <Textarea
              value={form.sector_context}
              onChange={(event) => set("sector_context", event.target.value)}
              placeholder="Secteurs maîtrisés et profondeur d’expérience…"
              rows={2}
              fullWidth
            />
          </Field>

          <Field label="Motif de recherche" optional>
            <Textarea
              value={form.search_reason}
              onChange={(event) => set("search_reason", event.target.value)}
              placeholder="Pourquoi le candidat souhaite changer…"
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
              onChange={(event) =>
                set("availability_notes", event.target.value)
              }
              placeholder="Immédiate, date négociable, contraintes…"
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
                placeholder="55000"
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
                placeholder="50000"
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
                placeholder="550"
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
              placeholder="Nice, Sophia Antipolis, Monaco…"
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
                onChange={(event) =>
                  set("remote_preference", event.target.value)
                }
                fullWidth
                aria-label="Préférence de télétravail"
              >
                {REMOTE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
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
        </section>

        <section className="space-y-3 border-t border-border pt-5">
          <SectionTitle>Situation marché et contraintes</SectionTitle>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Autres démarches" optional>
              <Select
                value={form.active_offer_status}
                onChange={(event) =>
                  set("active_offer_status", event.target.value)
                }
                fullWidth
                aria-label="Situation marché"
              >
                {OFFER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
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
              onChange={(event) =>
                set("active_offer_notes", event.target.value)
              }
              rows={2}
              fullWidth
            />
          </Field>

          <Field label="Contraintes particulières" optional>
            <Textarea
              value={form.constraints_notes}
              onChange={(event) =>
                set("constraints_notes", event.target.value)
              }
              placeholder="Horaires, déplacements, obligations personnelles…"
              rows={2}
              fullWidth
            />
          </Field>

          <Field label="Notes internes" optional>
            <Textarea
              value={form.notes}
              onChange={(event) => set("notes", event.target.value)}
              placeholder="Points d’attention et éléments internes…"
              rows={3}
              fullWidth
            />
          </Field>
        </section>

        {error && (
          <div className="rounded-[var(--radius-large)] border border-danger/30 bg-danger/[0.06] px-3 py-2.5 text-xs text-danger">
            {error}
          </div>
        )}

        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-surface/95 pt-3 backdrop-blur-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleClose(false)}
            disabled={isPending}
          >
            Annuler
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={!canSubmit || isPending}
          >
            {isPending ? "Création…" : "Créer le candidat"}
          </Button>
        </div>
      </div>
    </AppDrawer>
  )
}
