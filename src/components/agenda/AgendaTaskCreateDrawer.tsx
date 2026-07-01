"use client"

import React, { useEffect, useState, useTransition } from "react"
import { AppDrawer } from "@/components/ui/AppDrawer"
import { Button } from "@/components/ui/Button"
import { Select } from "@/components/ui/Select"
import { Input } from "@/components/ui/Input"
import { Textarea } from "@/components/ui/Textarea"
import {
  createTaskFromAgendaItem,
  getWorkspaceMembers,
} from "@/lib/agenda/agenda-actions"
import { getPreFilledTaskFields } from "./agenda-mobile-model"
import type { AgendaItem } from "@/lib/agenda/agenda-types"

interface AgendaTaskCreateDrawerProps {
  open: boolean
  item: AgendaItem | null
  side?: "bottom" | "right"
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

type Member = { id: string; full_name: string | null }

export function AgendaTaskCreateDrawer({
  open,
  item,
  side = "right",
  onOpenChange,
  onSaved,
}: AgendaTaskCreateDrawerProps) {
  const [isPending, startTransition] = useTransition()
  const [members, setMembers] = useState<Member[]>([])
  const [error, setError] = useState<string | null>(null)
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)

  const fields = item ? getPreFilledTaskFields(item) : null

  // Form states
  const [title, setTitle] = useState(fields?.title || "")
  const [description, setDescription] = useState("")
  const [dueDate, setDueDate] = useState(fields?.due_date || "")
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">(fields?.priority || "normal")
  const [assigneeId, setAssigneeId] = useState("")

  // Load workspace members
  useEffect(() => {
    if (open) {
      void getWorkspaceMembers().then((data) => {
        setMembers(data)
      })
    }
  }, [open])

  if (!item) return null

  const handleSave = (bypass = false) => {
    if (!title.trim()) {
      setError("Le titre de la tâche est obligatoire.")
      return
    }

    const prefilled = getPreFilledTaskFields(item)

    startTransition(async () => {
      setError(null)
      const res = await createTaskFromAgendaItem({
        title: title.trim(),
        description: description || undefined,
        due_date: dueDate || null,
        priority,
        assignee_id: assigneeId || null,
        entity_type: prefilled.entity_type,
        entity_id: prefilled.entity_id,
        calendar_event_id: prefilled.calendar_event_id,
        bypassDuplicateCheck: bypass,
      })

      if (res.error) {
        setError(res.error)
      } else if (res.warning === "DUPLICATE_EXISTS") {
        setDuplicateWarning(res.message)
      } else if (res.success) {
        onSaved()
        onOpenChange(false)
      }
    })
  }

  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      side={side}
      title="Créer une tâche"
      subtitle={`Pour : ${item.title}`}
      contentClassName="pb-safe"
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-danger-muted/10 border border-danger/20 text-danger text-xs font-semibold">
            {error}
          </div>
        )}

        {duplicateWarning ? (
          <div className="p-4 rounded-xl bg-warning/5 border border-warning/20 space-y-3">
            <div className="flex gap-2 text-warning">
              <svg className="size-5 shrink-0 stroke-[2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
              <p className="text-xs font-semibold leading-tight">{duplicateWarning}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleSave(true)}
                loading={isPending}
                className="text-xs font-bold"
              >
                Forcer la création
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDuplicateWarning(null)}
                className="text-xs font-semibold"
              >
                Modifier
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-heading mb-1.5">
                Titre de la tâche
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Appeler le client"
                className="w-full text-xs"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-heading mb-1.5">
                Description (optionnelle)
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ajoutez des détails sur la tâche..."
                className="w-full text-xs"
                rows={3}
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs font-bold text-heading mb-1.5">
                Échéance
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-xs"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-bold text-heading mb-1.5">
                Priorité
              </label>
              <Select
                value={priority}
                onChange={(e) => setPriority(e.target.value as "low" | "normal" | "high" | "urgent")}
                className="w-full text-xs"
              >
                <option value="low">Basse</option>
                <option value="normal">Normale</option>
                <option value="high">Haute</option>
                <option value="urgent">Urgent</option>
              </Select>
            </div>

            {/* Assignee */}
            <div>
              <label className="block text-xs font-bold text-heading mb-1.5">
                Responsable
              </label>
              <Select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full text-xs"
              >
                <option value="">Non assigné</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name || "Sans nom"}
                  </option>
                ))}
              </Select>
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-col gap-2">
              <Button
                variant="primary"
                fullWidth
                onClick={() => handleSave(false)}
                loading={isPending}
                className="font-bold text-xs h-11"
              >
                Créer la tâche
              </Button>
              <Button
                variant="ghost"
                fullWidth
                onClick={() => onOpenChange(false)}
                className="font-semibold text-xs h-11"
              >
                Annuler
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppDrawer>
  )
}
