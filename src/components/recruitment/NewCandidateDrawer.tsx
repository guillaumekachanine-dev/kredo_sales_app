"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { Button } from "@/components/ui/Button"
import { Field } from "@/components/ui/Field"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { Textarea } from "@/components/ui/Textarea"
import { createCandidate, type CreateCandidateInput } from "@/app/(app)/recruitment/_actions/create-candidate"

interface NewCandidateDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
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
  availability: "",
  expected_daily_rate: undefined,
  expected_salary: undefined,
  notes: "",
}

export function NewCandidateDrawer({ open, onOpenChange }: NewCandidateDrawerProps) {
  const router = useRouter()
  const [form, setForm] = useState<CreateCandidateInput>({ ...INITIAL_FORM })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const set = <K extends keyof CreateCandidateInput>(key: K, value: CreateCandidateInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const canSubmit = form.first_name.trim().length >= 1 && form.last_name.trim().length >= 1

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
      className="max-w-[480px]"
    >
      <div className="space-y-5 pb-6">
        {/* ── Identité ───────────────────────────────────────────── */}
        <section className="space-y-3">
          <p
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: "var(--color-muted)" }}
          >
            Identité
          </p>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Prénom" required>
              <Input
                value={form.first_name}
                onChange={(e) => set("first_name", e.target.value)}
                placeholder="Jean"
                fullWidth
              />
            </Field>
            <Field label="Nom" required>
              <Input
                value={form.last_name}
                onChange={(e) => set("last_name", e.target.value)}
                placeholder="Dupont"
                fullWidth
              />
            </Field>
          </div>

          <Field label="E-mail" optional>
            <Input
              type="email"
              value={form.primary_email}
              onChange={(e) => set("primary_email", e.target.value)}
              placeholder="jean.dupont@example.com"
              fullWidth
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Téléphone" optional>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+33 6 12 34 56 78"
                fullWidth
              />
            </Field>
            <Field label="Localisation" optional>
              <Input
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="Paris"
                fullWidth
              />
            </Field>
          </div>

          <Field label="LinkedIn" optional>
            <Input
              value={form.linkedin_url}
              onChange={(e) => set("linkedin_url", e.target.value)}
              placeholder="linkedin.com/in/jean-dupont"
              fullWidth
            />
          </Field>
        </section>

        {/* ── Profil candidat ────────────────────────────────────── */}
        <section className="space-y-3">
          <p
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: "var(--color-muted)" }}
          >
            Profil candidat
          </p>

          <Field label="Poste / Titre" optional>
            <Input
              value={form.current_title}
              onChange={(e) => set("current_title", e.target.value)}
              placeholder="Développeur Full-Stack"
              fullWidth
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Séniorité" optional>
              <Select
                value={form.seniority}
                onChange={(e) => set("seniority", e.target.value)}
                fullWidth
                aria-label="Séniorité"
              >
                {SENIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Source" optional>
              <Select
                value={form.source}
                onChange={(e) => set("source", e.target.value)}
                fullWidth
                aria-label="Source"
              >
                {SOURCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Disponibilité" optional>
            <Input
              value={form.availability}
              onChange={(e) => set("availability", e.target.value)}
              placeholder="Immédiate, 1 mois de préavis…"
              fullWidth
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="TJM souhaité (€)" optional>
              <Input
                type="number"
                min={0}
                step={10}
                value={form.expected_daily_rate ?? ""}
                onChange={(e) =>
                  set("expected_daily_rate", e.target.value ? Number(e.target.value) : undefined)
                }
                placeholder="550"
                fullWidth
              />
            </Field>
            <Field label="Salaire souhaité (€/an)" optional>
              <Input
                type="number"
                min={0}
                step={1000}
                value={form.expected_salary ?? ""}
                onChange={(e) =>
                  set("expected_salary", e.target.value ? Number(e.target.value) : undefined)
                }
                placeholder="55000"
                fullWidth
              />
            </Field>
          </div>
        </section>

        {/* ── Notes ──────────────────────────────────────────────── */}
        <Field label="Notes" optional>
          <Textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Contexte, remarques, points d'attention…"
            rows={3}
            fullWidth
          />
        </Field>

        {/* ── Error ──────────────────────────────────────────────── */}
        {error && (
          <div
            className="rounded-xl border px-3 py-2.5 text-xs"
            style={{
              borderColor: "var(--color-danger)",
              color: "var(--color-danger)",
              background: "rgba(190,62,62,0.04)",
            }}
          >
            {error}
          </div>
        )}

        {/* ── Actions ────────────────────────────────────────────── */}
        <div className="flex justify-end gap-2 pt-2">
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
