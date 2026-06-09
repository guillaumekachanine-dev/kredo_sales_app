"use client"

import { useState, useTransition } from "react"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import type { OpportunitySkill, SkillImportance } from "@/types/database"
import {
  addOpportunitySkill,
  updateOpportunitySkill,
  deleteOpportunitySkill,
} from "@/app/(app)/missions/_actions/opportunity-skills"
import { cn } from "@/lib/utils"

interface OpportunitySkillsPanelProps {
  opportunityId: string
  skills: OpportunitySkill[]
  onRefresh: () => void
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

export function OpportunitySkillsPanel({
  opportunityId,
  skills,
  onRefresh,
}: OpportunitySkillsPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // États pour la création
  const [isAdding, setIsAdding] = useState(false)
  const [newSkill, setNewSkill] = useState({
    skill_name: "",
    importance: "souhaitee" as SkillImportance,
    min_years: "" as string | number,
  })

  // États pour l'édition d'une ligne
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingSkill, setEditingSkill] = useState({
    skill_name: "",
    importance: "souhaitee" as SkillImportance,
    min_years: "" as string | number,
  })

  const resetNewForm = () => {
    setNewSkill({
      skill_name: "",
      importance: "souhaitee",
      min_years: "",
    })
    setIsAdding(false)
    setErrorMsg(null)
  }

  const handleAdd = () => {
    setErrorMsg(null)
    const name = newSkill.skill_name.trim()
    if (!name) {
      setErrorMsg("Le nom de la compétence est obligatoire.")
      return
    }

    startTransition(async () => {
      const result = await addOpportunitySkill({
        opportunity_id: opportunityId,
        skill_name: name,
        importance: newSkill.importance,
        min_years: newSkill.min_years === "" ? null : Number(newSkill.min_years),
      })

      if (result.error) {
        setErrorMsg(result.error)
      } else {
        resetNewForm()
        onRefresh()
      }
    })
  }

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

  const inputClass = "rounded-md border border-border bg-canvas px-2.5 py-1 text-xs text-heading outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/60 transition-colors disabled:opacity-50"

  return (
    <SurfaceCard className="p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-border/40 pb-2">
        <h2 className="text-sm font-bold font-heading text-heading">
          Compétences attendues
        </h2>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="text-[10px] font-bold text-primary hover:underline"
            disabled={isPending}
          >
            + Ajouter
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="text-[10px] text-danger bg-danger/10 border border-danger/20 rounded px-2.5 py-1.5">
          {errorMsg}
        </div>
      )}

      {/* Formulaire d'ajout */}
      {isAdding && (
        <div className="p-3 bg-canvas/30 rounded border border-border/60 flex flex-col gap-2.5">
          <span className="text-[9px] uppercase tracking-wider text-muted font-bold">Nouvelle compétence</span>
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="ex: React, Python..."
              value={newSkill.skill_name}
              onChange={(e) => setNewSkill({ ...newSkill, skill_name: e.target.value })}
              className={cn(inputClass, "w-full")}
              disabled={isPending}
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={newSkill.importance}
                onChange={(e) => setNewSkill({ ...newSkill, importance: e.target.value as SkillImportance })}
                className={inputClass}
                disabled={isPending}
              >
                {IMPORTANCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Années min."
                value={newSkill.min_years}
                onChange={(e) => setNewSkill({ ...newSkill, min_years: e.target.value })}
                className={inputClass}
                disabled={isPending}
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-1">
            <button
              onClick={resetNewForm}
              className="px-2.5 py-1 text-[10px] font-semibold rounded bg-canvas border border-border text-muted hover:text-heading transition-colors"
              disabled={isPending}
            >
              Annuler
            </button>
            <button
              onClick={handleAdd}
              className="px-2.5 py-1 text-[10px] font-semibold rounded bg-primary text-primary-fg hover:bg-primary/90 transition-colors"
              disabled={isPending}
            >
              {isPending ? "Ajout..." : "Ajouter"}
            </button>
          </div>
        </div>
      )}

      {/* Liste des compétences */}
      {skills.length === 0 && !isAdding ? (
        <p className="text-xs text-muted italic py-2">Aucune compétence renseignée.</p>
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
                    <select
                      value={editingSkill.importance}
                      onChange={(e) => setEditingSkill({ ...editingSkill, importance: e.target.value as SkillImportance })}
                      className={inputClass}
                      disabled={isPending}
                    >
                      {IMPORTANCE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
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
    </SurfaceCard>
  )
}
