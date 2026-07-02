"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/Input"
import { Textarea } from "@/components/ui/Textarea"
import { Button } from "@/components/ui/Button"
import { updateDocument } from "@/app/(app)/reports/_data/reports-actions"
import type {
  DocumentDetail,
  DocumentMutationResult,
  ReportLinkInput,
} from "@/app/(app)/reports/_data/reports-types"
import type { Database } from "@/types/database"

type DocumentEditorProps = {
  document: DocumentDetail
  onCancel: () => void
  onSaved?: () => void | Promise<void>
}

type EntityType = Database["public"]["Enums"]["intelligence_entity_type"]

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function getInitialSubject(document: DocumentDetail): string {
  if (!isRecord(document.currentContentJson)) return ""

  const subjects = document.currentContentJson.subjects
  if (Array.isArray(subjects) && typeof subjects[0] === "string") {
    return subjects[0]
  }

  const subject = document.currentContentJson.subject
  return typeof subject === "string" ? subject : ""
}

function getInitialBody(document: DocumentDetail): string {
  if (typeof document.currentContentText === "string" && document.currentContentText.trim()) {
    return document.currentContentText
  }

  if (isRecord(document.currentContentJson)) {
    const body = document.currentContentJson.body
    if (typeof body === "string") return body
  }

  const latestVersion = document.versions[0]
  if (typeof latestVersion?.contentText === "string" && latestVersion.contentText.trim()) {
    return latestVersion.contentText
  }

  if (isRecord(latestVersion?.contentJson)) {
    const body = latestVersion.contentJson.body
    if (typeof body === "string") return body
  }

  return ""
}

function buildUpdatedContentJson(
  document: DocumentDetail,
  subject: string,
  body: string
): unknown {
  const base = isRecord(document.currentContentJson) ? document.currentContentJson : {}

  if (document.documentType === "communication") {
    const nextSubjects = Array.isArray(base.subjects) ? [...base.subjects] : []
    nextSubjects[0] = subject

    return {
      ...base,
      body,
      subjects: nextSubjects,
    }
  }

  return {
    ...base,
    body,
  }
}

function getSaveError(result: DocumentMutationResult): string | null {
  return "error" in result ? (result.error ?? null) : null
}

export function DocumentEditor({
  document,
  onCancel,
  onSaved,
}: DocumentEditorProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [title, setTitle] = useState(document.title)
  const [subject, setSubject] = useState(getInitialSubject(document))
  const [body, setBody] = useState(getInitialBody(document))
  const [changeNote, setChangeNote] = useState("")
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)

  const latestVersion = document.versions[0] ?? null
  const isCommunication = document.documentType === "communication"
  const contentJson = useMemo(
    () => buildUpdatedContentJson(document, subject, body),
    [body, document, subject]
  )

  function handleSubmit() {
    setSaveError(null)
    setSaveSuccess(null)

    startTransition(async () => {
      const result = await updateDocument({
        documentId: document.id,
        title,
        contentText: body,
        contentJson,
        briefJson: latestVersion?.briefJson ?? null,
        sourceRefs: latestVersion?.sourceRefs ?? [],
        qaFlags: latestVersion?.qaFlags ?? [],
        changeNote,
        tags: document.tags,
        isFavorite: document.isFavorite,
        status: document.status,
        links: document.links.map((link) => ({
          entityType: link.entityType as EntityType,
          entityId: link.entityId,
        })) satisfies ReportLinkInput[],
        primaryEntity: document.primaryEntity
          ? {
              entityType: document.primaryEntity.type as EntityType,
              entityId: document.primaryEntity.id,
            }
          : null,
      })

      const error = getSaveError(result)
      if (error) {
        setSaveError(error)
        return
      }

      setSaveSuccess("Nouvelle version enregistrée")
      router.refresh()
      await onSaved?.()
    })
  }

  return (
    <div className="space-y-4 border-t border-border pt-4">
      <div className="space-y-1">
        <label htmlFor={`report-title-${document.id}`} className="text-xs font-semibold text-heading">
          Titre
        </label>
        <Input
          id={`report-title-${document.id}`}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          fullWidth
          placeholder="Titre du document"
        />
      </div>

      {isCommunication ? (
        <div className="space-y-1">
          <label htmlFor={`report-subject-${document.id}`} className="text-xs font-semibold text-heading">
            Objet du message
          </label>
          <Input
            id={`report-subject-${document.id}`}
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            fullWidth
            placeholder="Objet"
          />
        </div>
      ) : null}

      <div className="space-y-1">
        <label htmlFor={`report-body-${document.id}`} className="text-xs font-semibold text-heading">
          Corps du document
        </label>
        <Textarea
          id={`report-body-${document.id}`}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          fullWidth
          size="md"
          className="min-h-56 whitespace-pre-wrap"
          placeholder="Contenu du document"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor={`report-change-note-${document.id}`} className="text-xs font-semibold text-heading">
          Note de modification
        </label>
        <Textarea
          id={`report-change-note-${document.id}`}
          value={changeNote}
          onChange={(event) => setChangeNote(event.target.value)}
          fullWidth
          size="sm"
          className="min-h-24"
          placeholder="Optionnel"
        />
      </div>

      {saveError ? (
        <p className="text-sm text-danger">{saveError}</p>
      ) : null}

      {saveSuccess ? (
        <p className="text-sm text-success">{saveSuccess}</p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          variant="secondary"
          onClick={onCancel}
          disabled={isPending}
          className="sm:min-w-32"
        >
          Annuler
        </Button>
        <Button
          onClick={handleSubmit}
          loading={isPending}
          loadingLabel="Enregistrement"
          className="sm:min-w-48"
        >
          Enregistrer une nouvelle version
        </Button>
      </div>
    </div>
  )
}
