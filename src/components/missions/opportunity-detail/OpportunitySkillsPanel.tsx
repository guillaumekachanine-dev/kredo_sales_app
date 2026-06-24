"use client"

import Image from "next/image"
import { useState, useTransition, useEffect, useEffectEvent, useRef, useCallback } from "react"
import { Select } from "@/components/ui/Select"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import type { OpportunitySkill, SkillImportance } from "@/types/database-domain"
import {
  addOpportunitySkill,
  updateOpportunitySkill,
  deleteOpportunitySkill,
  getAllSkillsForPicker,
  type SkillPickerItem,
} from "@/app/(app)/missions/_actions/opportunity-skills"
import { cn } from "@/lib/utils"

interface OpportunitySkillsPanelProps {
  opportunityId: string
  skills: OpportunitySkill[]
  onRefresh: () => void
  className?: string
  embedded?: boolean
}

const IMPORTANCE_OPTIONS: Array<{ value: SkillImportance; label: string }> = [
  { value: "indispensable", label: "Indispensable" },
  { value: "souhaitee", label: "Souhaitée" },
  { value: "bonus", label: "Bonus" },
]

const IMPORTANCE_BADGES: Record<SkillImportance, string> = {
  indispensable: "bg-danger/10 text-danger border-danger/20",
  souhaitee: "bg-primary/10 text-primary border-primary/20",
  bonus: "bg-canvas text-muted border-border",
}

const CATEGORY_LABELS: Record<string, string> = {
  langage: "Langage",
  framework: "Framework",
  cloud: "Cloud",
  data: "Data",
  devops: "DevOps",
  methode: "Méthode",
  fonctionnel: "Fonctionnel",
  secteur: "Secteur",
  soft_skill: "Soft skill",
  langue: "Langue",
  certification: "Certification",
}

interface SkillPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (name: string) => void
  existingSkillNames: Set<string>
}

function SkillPickerModal({ isOpen, onClose, onSelect, existingSkillNames }: SkillPickerModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [allSkills, setAllSkills] = useState<SkillPickerItem[]>([])
  const [query, setQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const syncDialogState = useEffectEvent(async () => {
    const el = dialogRef.current
    if (!el) return
    if (isOpen) {
      el.showModal()
      setQuery("")
      if (allSkills.length === 0) {
        setIsLoading(true)
        const data = await getAllSkillsForPicker()
        setAllSkills(data)
        setIsLoading(false)
      }
    } else {
      el.close()
    }
  })

  useEffect(() => {
    queueMicrotask(() => {
      void syncDialogState()
    })
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    const handleClose = () => onClose()
    el.addEventListener("close", handleClose)
    return () => el.removeEventListener("close", handleClose)
  }, [onClose])

  const filtered = query.trim().length === 0
    ? allSkills
    : allSkills.filter((s) =>
        s.name.toLowerCase().includes(query.trim().toLowerCase())
      )

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className="rounded-xl border border-border bg-canvas shadow-xl p-0 backdrop:bg-black/40 w-full max-w-md"
      style={{ colorScheme: "normal" }}
    >
      <div className="flex flex-col max-h-[70vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border/50 shrink-0">
          <h3 className="text-sm font-bold text-heading">Ajouter une compétence</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-heading transition-colors p-1 rounded-md hover:bg-canvas"
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search input */}
        <div className="px-4 py-3 border-b border-border/40 shrink-0">
          <input
            type="text"
            autoFocus
            placeholder="Rechercher une compétence..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-heading outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/60 transition-colors"
          />
        </div>

        {/* Skills list */}
        <div className="overflow-y-auto flex-1 px-2 py-2">
          {isLoading ? (
            <div className="px-2 py-4 text-xs text-muted italic text-center">Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="px-2 py-4 text-xs text-muted italic text-center">
              {query.trim().length > 0 ? `Aucune compétence pour « ${query} »` : "Aucune compétence disponible."}
            </div>
          ) : (
            filtered.map((skill) => {
              const alreadyAdded = existingSkillNames.has(skill.name.toLowerCase())
              return (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => {
                    if (!alreadyAdded) {
                      onSelect(skill.name)
                      onClose()
                    }
                  }}
                  disabled={alreadyAdded}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md flex items-center justify-between gap-2 transition-colors",
                    alreadyAdded
                      ? "opacity-40 cursor-not-allowed"
                      : "hover:bg-primary/8 cursor-pointer"
                  )}
                >
                  <span className="text-xs font-semibold text-heading">{skill.name}</span>
                  <span className="text-[10px] text-muted shrink-0">
                    {skill.category ? (CATEGORY_LABELS[skill.category] ?? skill.category) : ""}
                    {alreadyAdded ? " · déjà ajoutée" : ""}
                  </span>
                </button>
              )
            })
          )}
        </div>
      </div>
    </dialog>
  )
}

export function OpportunitySkillsPanel({
  opportunityId,
  skills,
  onRefresh,
  className,
  embedded = false,
}: OpportunitySkillsPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [pendingImportance, setPendingImportance] = useState<SkillImportance>("souhaitee")
  const [pendingMinYears, setPendingMinYears] = useState<string>("")

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingSkill, setEditingSkill] = useState({
    skill_name: "",
    importance: "souhaitee" as SkillImportance,
    min_years: "" as string | number,
  })

  const existingSkillNames = new Set(skills.map((s) => s.skill_name.toLowerCase()))

  const handlePickerSelect = useCallback(
    (skillName: string) => {
      setErrorMsg(null)
      startTransition(async () => {
        const result = await addOpportunitySkill({
          opportunity_id: opportunityId,
          skill_name: skillName,
          importance: pendingImportance,
          min_years: pendingMinYears === "" ? null : Number(pendingMinYears),
        })
        if (result.error) {
          setErrorMsg(result.error)
        } else {
          setPendingImportance("souhaitee")
          setPendingMinYears("")
          onRefresh()
        }
      })
    },
    [opportunityId, pendingImportance, pendingMinYears, onRefresh]
  )

  const startEditing = (skill: OpportunitySkill) => {
    setErrorMsg(null)
    setEditingId(skill.id)
    setEditingSkill({
      skill_name: skill.skill_name,
      importance: skill.importance,
      min_years: skill.min_years ?? "",
    })
  }

  const handleUpdate = (id: string) => {
    setErrorMsg(null)
    const name = editingSkill.skill_name.trim()
    if (!name) {
      setErrorMsg("Le nom de la compétence est obligatoire.")
      return
    }

    startTransition(async () => {
      const result = await updateOpportunitySkill({
        id,
        skill_name: name,
        importance: editingSkill.importance,
        min_years: editingSkill.min_years === "" ? null : Number(editingSkill.min_years),
      })

      if (result.error) {
        setErrorMsg(result.error)
      } else {
        setEditingId(null)
        onRefresh()
      }
    })
  }

  const handleDelete = (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette compétence ?")) return
    setErrorMsg(null)

    startTransition(async () => {
      const result = await deleteOpportunitySkill({ id })
      if (result.error) {
        setErrorMsg(result.error)
      } else {
        setEditingId(null)
        onRefresh()
      }
    })
  }

  const inputClass =
    "rounded-md border border-border bg-canvas px-2.5 py-1 text-xs text-heading outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/60 transition-colors disabled:opacity-50"

  const content = (
    <>
      <SkillPickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={handlePickerSelect}
        existingSkillNames={existingSkillNames}
      />

      <div className="flex items-center justify-between border-b border-border/40 pb-2">
        <div className="flex items-center gap-2">
          <Image src="/icons_set/opportunity_skills.png" alt="" width={20} height={20} className="object-contain shrink-0" />
          <h3 className="text-sm font-bold text-heading">Compétences requises</h3>
        </div>
      </div>

      {errorMsg && (
        <div className="text-[10px] text-danger bg-danger/10 border border-danger/20 rounded px-2.5 py-1.5">
          {errorMsg}
        </div>
      )}

      {/* Quick options before opening picker */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Select
            value={pendingImportance}
            onChange={(e) => setPendingImportance(e.target.value as SkillImportance)}
            className={cn(inputClass, "py-1 text-[10px]")}
            disabled={isPending}
          >
            {IMPORTANCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
          <input
            type="number"
            placeholder="Années min."
            value={pendingMinYears}
            onChange={(e) => setPendingMinYears(e.target.value)}
            className={cn(inputClass, "w-24 py-1 text-[10px]")}
            disabled={isPending}
          />
        </div>
        <button
          type="button"
          onClick={() => setIsPickerOpen(true)}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold border-2 border-dashed border-primary/40 text-primary hover:border-primary hover:bg-primary/5 rounded-md transition-all disabled:opacity-40"
        >
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
            <path d="M12 5v14M5 12h14" />
          </svg>
          Ajouter compétence
        </button>
      </div>

      {/* Liste des compétences */}
      {skills.length === 0 ? (
        <p className="text-xs text-muted italic py-1">Aucune compétence renseignée.</p>
      ) : (
        <div className="flex flex-col gap-2 mt-1">
          {skills.map((skill) => {
            const isEditingRow = editingId === skill.id

            if (isEditingRow) {
              return (
                <div key={skill.id} className="p-3 bg-canvas/40 rounded border border-border/80 flex flex-col gap-2">
                  <input
                    type="text"
                    value={editingSkill.skill_name}
                    onChange={(e) => setEditingSkill({ ...editingSkill, skill_name: e.target.value })}
                    className={cn(inputClass, "w-full")}
                    disabled={isPending}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={editingSkill.importance}
                      onChange={(e) =>
                        setEditingSkill({ ...editingSkill, importance: e.target.value as SkillImportance })
                      }
                      className={inputClass}
                      disabled={isPending}
                    >
                      {IMPORTANCE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </Select>
                    <input
                      type="number"
                      placeholder="Années min."
                      value={editingSkill.min_years}
                      onChange={(e) => setEditingSkill({ ...editingSkill, min_years: e.target.value })}
                      className={inputClass}
                      disabled={isPending}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <button
                      onClick={() => handleDelete(skill.id)}
                      className="text-[10px] font-semibold text-danger hover:underline"
                      disabled={isPending}
                    >
                      Supprimer
                    </button>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-2.5 py-1 text-[10px] font-semibold rounded bg-canvas border border-border text-muted hover:text-heading"
                        disabled={isPending}
                      >
                        Annuler
                      </button>
                      <button
                        onClick={() => handleUpdate(skill.id)}
                        className="px-2.5 py-1 text-[10px] font-semibold rounded bg-success text-success-fg hover:bg-success/90"
                        disabled={isPending}
                      >
                        Enregistrer
                      </button>
                    </div>
                  </div>
                </div>
              )
            }

            return (
              <div
                key={skill.id}
                onClick={() => startEditing(skill)}
                className="flex items-center justify-between p-2.5 bg-canvas/30 rounded border border-border/50 hover:border-primary/30 hover:bg-canvas/50 transition-all cursor-pointer group"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold text-heading group-hover:text-primary transition-colors">
                    {skill.skill_name}
                  </span>
                  {skill.min_years !== null && (
                    <span className="text-[10px] text-muted">
                      Min. {skill.min_years} an{skill.min_years > 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[9px] font-bold border capitalize shrink-0",
                    IMPORTANCE_BADGES[skill.importance]
                  )}
                >
                  {IMPORTANCE_OPTIONS.find((o) => o.value === skill.importance)?.label || skill.importance}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </>
  )

  if (embedded) {
    return <div className={cn("flex flex-col gap-4", className)}>{content}</div>
  }

  return (
    <SurfaceCard className={cn("p-5 flex flex-col gap-4", className)}>{content}</SurfaceCard>
  )
}
