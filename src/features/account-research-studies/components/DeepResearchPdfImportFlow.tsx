"use client"

// ─── Flow d'import ChatGPT Deep Research (PDF) ──────────────────────────────
//
// Conserve STRICTEMENT le pipeline PDF existant :
// 1. Upload direct du PDF vers Storage via URL signée
// 2. Extraction du texte intégral déterministe
// 3. Lancement des passes de conversion IA / n8n
// 4. Polling du statut jusqu'à ready
// 5. Rapport de couverture et publication E3 stricte

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { createClient as createBrowserClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

import {
  getStudyProgressAction,
  publishStudyAction,
  readStudyFileAction,
  registerStudyAction,
  requestStudyUploadAction,
  startStudyConversionAction,
} from "../actions/study-actions"
import type { StudyConversionProgress } from "../data/study-conversion"
import type { StudyIntakeSummary } from "../data/study-intake"
import type { StudyFileKind } from "../data/study-read"
import { STUDY_STORAGE_BUCKET } from "../domain/study-contracts"
import { StudyCoverageReport } from "./StudyCoverageReport"

const POLL_INTERVAL_MS = 4000

type Step = "select" | "extracting" | "extracted" | "tracking"

function downloadText(fileName: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded border border-edito-border bg-edito-canvas px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-edito-muted">{label}</p>
      <p className="mt-0.5 font-mono text-sm font-bold text-edito-navy">{value}</p>
    </div>
  )
}

export function DeepResearchPdfImportFlow({
  companyId,
  initialStudyId = null,
  onBack,
  isMobile = false,
}: {
  companyId: string
  companyName: string
  initialStudyId?: string | null
  onBack?: () => void
  isMobile?: boolean
}) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(initialStudyId ? "tracking" : "select")
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [intake, setIntake] = useState<StudyIntakeSummary | null>(null)
  const [studyId, setStudyId] = useState<string | null>(initialStudyId)
  const [progress, setProgress] = useState<StudyConversionProgress | null>(null)
  const [pending, startTransition] = useTransition()
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const primaryBtnClass = cn(
    "inline-flex items-center justify-center rounded border border-edito-navy bg-edito-navy px-4 text-xs font-bold text-edito-surface transition-colors hover:bg-edito-heading disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-brass/60",
    isMobile ? "min-h-[44px] w-full sm:w-auto" : "min-h-9",
  )

  const secondaryBtnClass = cn(
    "inline-flex items-center justify-center rounded border border-edito-border bg-edito-surface px-3 text-xs font-bold text-edito-heading transition-colors hover:border-edito-heading disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-brass/60",
    isMobile ? "min-h-[44px]" : "min-h-9",
  )

  const refreshProgress = useCallback(async (id: string) => {
    const result = await getStudyProgressAction(id)
    if (!result.ok) {
      setError(result.error)
      return null
    }
    setProgress(result.value)
    return result.value
  }, [])

  useEffect(() => {
    if (step !== "tracking" || !studyId) return
    let cancelled = false
    const tick = async () => {
      const current = await refreshProgress(studyId)
      if (cancelled) return
      if (current?.status === "converting") {
        pollingRef.current = setTimeout(tick, POLL_INTERVAL_MS)
      } else if (current?.status === "ready") {
        router.refresh()
      }
    }
    void tick()
    return () => {
      cancelled = true
      if (pollingRef.current) clearTimeout(pollingRef.current)
    }
  }, [step, studyId, refreshProgress, router])

  const handleFile = (next: File | null) => {
    setFile(next)
    setError(null)
    if (next && !title) setTitle(next.name.replace(/\.pdf$/i, ""))
  }

  const extract = () => {
    if (!file) return
    setError(null)
    setStep("extracting")
    startTransition(async () => {
      const ticket = await requestStudyUploadAction({ companyId, fileName: file.name, fileBytes: file.size })
      if (!ticket.ok) {
        setError(ticket.error)
        setStep("select")
        return
      }
      const upload = await createBrowserClient()
        .storage.from(STUDY_STORAGE_BUCKET)
        .uploadToSignedUrl(ticket.value.path, ticket.value.token, file, { contentType: "application/pdf" })
      if (upload.error) {
        setError(`Envoi du PDF impossible : ${upload.error.message}`)
        setStep("select")
        return
      }
      const registered = await registerStudyAction({ companyId, path: ticket.value.path, fileName: file.name, title })
      if (!registered.ok) {
        setError(registered.error)
        setStep("select")
        return
      }
      setIntake(registered.value)
      setStudyId(registered.value.studyId)
      setStep("extracted")
      router.refresh()
    })
  }

  const convert = () => {
    if (!studyId) return
    setError(null)
    startTransition(async () => {
      const result = await startStudyConversionAction(studyId)
      if (!result.ok) {
        setError(result.error)
        await refreshProgress(studyId)
      }
      setStep("tracking")
    })
  }

  const publish = () => {
    if (!studyId) return
    setError(null)
    startTransition(async () => {
      const result = await publishStudyAction(studyId)
      if (!result.ok) {
        setError(result.error)
        return
      }
      await refreshProgress(studyId)
      router.refresh()
    })
  }

  const download = (kind: StudyFileKind) => {
    if (!studyId) return
    setError(null)
    startTransition(async () => {
      const result = await readStudyFileAction(studyId, kind)
      if (!result.ok) {
        setError(result.error)
        return
      }
      downloadText(result.value.fileName, result.value.content, kind === "raw" ? "text/markdown" : "application/json")
    })
  }

  const status = progress?.status
  const done = progress ? progress.partsSucceeded : 0

  return (
    <div className="space-y-4 pb-2">
      {onBack && step === "select" ? (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center text-xs font-semibold text-edito-muted hover:text-edito-navy"
        >
          <span aria-hidden="true" className="mr-1">←</span>
          Changer de canal d&apos;import
        </button>
      ) : null}

      {error ? (
        <p role="alert" className="rounded border border-danger/40 bg-danger/10 px-3 py-2 text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}

      {step === "select" || step === "extracting" ? (
        <div className="space-y-3">
          <p className="text-xs leading-relaxed text-edito-body">
            Exportez le rapport depuis ChatGPT au format <strong>PDF</strong> : c&apos;est le seul export qui conserve les
            liens de chaque citation (l&apos;export Markdown les perd). Le PDF est stocké tel quel, et son texte intégral
            est extrait sans modèle.
          </p>
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-edito-heading">Fichier PDF</span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              disabled={step === "extracting"}
              onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-xs text-edito-body file:mr-3 file:rounded file:border file:border-edito-border file:bg-edito-chip file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-edito-heading"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-edito-heading">Titre de l&apos;étude</span>
            <input
              type="text"
              value={title}
              disabled={step === "extracting"}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-1 block min-h-9 w-full rounded border border-edito-border bg-edito-surface px-3 text-xs text-edito-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-brass/60"
            />
          </label>
          <div className="flex justify-end">
            <button type="button" onClick={extract} disabled={!file || step === "extracting"} className={primaryBtnClass}>
              {step === "extracting" ? "Envoi et extraction…" : "Extraire le texte intégral"}
            </button>
          </div>
        </div>
      ) : null}

      {step === "extracted" && intake ? (
        <div className="space-y-3">
          <div className={cn("grid gap-2", isMobile ? "grid-cols-2" : "grid-cols-3")}>
            <Metric label="Pages" value={intake.pages} />
            <Metric label="Blocs de texte" value={intake.blocks} />
            <Metric label="Caractères" value={intake.chars.toLocaleString("fr-FR")} />
            <Metric label="Citations" value={intake.citations} />
            <Metric label="Documents cités" value={intake.documents} />
            <Metric label="Sources (domaines)" value={intake.authorities} />
          </div>
          <p className={cn("text-xs", intake.pdfIntegrity.identical && intake.blocksIntegrity ? "text-edito-body" : "font-semibold text-danger")}>
            {intake.pdfIntegrity.identical && intake.blocksIntegrity
              ? `Intégrité vérifiée : ${intake.pdfIntegrity.textNonWsChars.toLocaleString("fr-FR")} caractères extraits sur ${intake.pdfIntegrity.pdfNonWsChars.toLocaleString("fr-FR")} dans le PDF (${intake.pdfIntegrity.pageNumbersRemoved} numéros de page retirés), tous présents dans les blocs.`
              : "Intégrité non vérifiée : voir les avertissements."}
          </p>
          {intake.warnings.map((warning) => (
            <p key={warning} className="text-xs font-semibold text-danger">{warning}</p>
          ))}
          <div className="flex justify-end">
            <button type="button" onClick={convert} disabled={pending} className={primaryBtnClass}>
              {pending ? "Lancement…" : "Lancer la conversion"}
            </button>
          </div>
        </div>
      ) : null}

      {step === "tracking" ? (
        <div className="space-y-3">
          {!progress ? <p className="text-xs text-edito-muted">Lecture de l&apos;état de la conversion…</p> : null}

          {status === "converting" ? (
            <div className="space-y-2" aria-live="polite">
              <p className="text-xs font-semibold text-edito-heading">
                Conversion en cours — {done}/{progress?.partsTotal ?? 0} passes terminées
              </p>
              <div className="h-1.5 overflow-hidden rounded bg-edito-chip">
                <div
                  className="h-full bg-edito-navy transition-[width] duration-500 motion-reduce:transition-none"
                  style={{ width: `${progress && progress.partsTotal ? Math.round((done / progress.partsTotal) * 100) : 5}%` }}
                />
              </div>
              <p className="text-[11px] text-edito-muted">Compter une à trois minutes. Vous pouvez fermer cette fenêtre : la conversion continue.</p>
            </div>
          ) : null}

          {status === "failed" ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-danger">La conversion a échoué.</p>
              {progress?.errorMessage ? <p className="text-[11px] text-edito-body">{progress.errorMessage}</p> : null}
              <div className="flex justify-end">
                <button type="button" onClick={convert} disabled={pending} className={primaryBtnClass}>
                  {pending ? "Relance…" : "Relancer la conversion"}
                </button>
              </div>
            </div>
          ) : null}

          {status === "extracted" ? (
            <div className="flex justify-end">
              <button type="button" onClick={convert} disabled={pending} className={primaryBtnClass}>
                {pending ? "Lancement…" : "Lancer la conversion"}
              </button>
            </div>
          ) : null}

          {status === "ready" ? (
            <div className="space-y-3">
              {progress?.coverage ? (
                <StudyCoverageReport coverage={progress.coverage} producer="chatgpt_deep_research" />
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => download("knowledge")} disabled={pending} className={secondaryBtnClass}>
                    Briques (JSON)
                  </button>
                  <button type="button" onClick={() => download("sources")} disabled={pending} className={secondaryBtnClass}>
                    Sources E3 (JSON corpus)
                  </button>
                  <button type="button" onClick={() => download("raw")} disabled={pending} className={secondaryBtnClass}>
                    Texte intégral (.md)
                  </button>
                </div>
                {progress?.publishedAt ? (
                  <p className="text-xs font-semibold text-edito-heading">Publiée sur le compte.</p>
                ) : (
                  <button type="button" onClick={publish} disabled={pending} className={primaryBtnClass}>
                    {pending ? "Publication…" : "Publier sur le compte"}
                  </button>
                )}
              </div>
              <p className="text-[11px] leading-relaxed text-edito-muted">
                Le fichier « Sources E3 » s&apos;importe tel quel dans <strong>Veille → Gestion des sources → + Corpus</strong>,
                sous un corpus propre au compte (jamais celui du segment).
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
