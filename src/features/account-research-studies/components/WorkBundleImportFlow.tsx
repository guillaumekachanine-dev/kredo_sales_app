"use client"

// ─── Flow d'import ChatGPT Work (2 JSON) ────────────────────────────────────
//
// Parcours déterministe synchrone :
// 1. Sélection ou glisser-déposer de 2 fichiers JSON
// 2. Détection automatique des rôles (AI vs Source Corpus) par leur structure
// 3. Prévisualisation immédiate côté client avec contrôle d'identité compte
// 4. Upload direct des originaux vers Storage via URLs signées
// 5. Enregistrement serveur, adaptation canonique déterministe et statut 'ready'
// 6. Rapport de couverture adapté et publication sur le compte

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { createClient as createBrowserClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

import {
  getStudyProgressAction,
  publishStudyAction,
  readStudyFileAction,
  registerWorkStudyAction,
  requestWorkStudyUploadAction,
} from "../actions/study-actions"
import type { StudyConversionProgress } from "../data/study-conversion"
import type { StudyFileKind } from "../data/study-read"
import { STUDY_STORAGE_BUCKET } from "../domain/study-contracts"
import {
  checkCompanyIdentityMatch,
  detectWorkBundleRoles,
  type WorkBundleDetectionSuccess,
} from "../domain/work-study-detection"
import { StudyCoverageReport } from "./StudyCoverageReport"

type Step = "select" | "uploading" | "ready"

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

export function WorkBundleImportFlow({
  companyId,
  companyName,
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
  const [step, setStep] = useState<Step>(initialStudyId ? "ready" : "select")
  const [files, setFiles] = useState<[File, File] | null>(null)
  const [title, setTitle] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<{
    detection: WorkBundleDetectionSuccess<string>
    detectedCompanyName: string
    identityMatch: { match: boolean; reason?: string }
    totalStatements: number
    totalDocuments: number
    totalAuthorities: number
    unresolvedSourceRefs: number
  } | null>(null)
  const [studyId, setStudyId] = useState<string | null>(initialStudyId)
  const [progress, setProgress] = useState<StudyConversionProgress | null>(null)
  const [isPublished, setIsPublished] = useState(false)
  const [pending, startTransition] = useTransition()

  const primaryBtnClass = cn(
    "inline-flex items-center justify-center rounded border border-edito-navy bg-edito-navy px-4 text-xs font-bold text-edito-surface transition-colors hover:bg-edito-heading disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-brass/60",
    isMobile ? "min-h-[44px] w-full" : "min-h-9",
  )

  const secondaryBtnClass = cn(
    "inline-flex items-center justify-center rounded border border-edito-border bg-edito-surface px-3 text-xs font-bold text-edito-heading transition-colors hover:border-edito-heading disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-brass/60",
    isMobile ? "min-h-[44px]" : "min-h-9",
  )

  // Lecture et analyse des 2 fichiers sélectionnés côté client
  const handleFileSelection = async (selectedList: FileList | File[] | null) => {
    setError(null)
    setPreview(null)

    if (!selectedList || selectedList.length === 0) {
      setFiles(null)
      return
    }

    if (selectedList.length !== 2) {
      setError("Veuillez sélectionner exactement 2 fichiers JSON (Account Intelligence et Source Corpus).")
      setFiles(null)
      return
    }

    const file0 = selectedList[0]
    const file1 = selectedList[1]

    if (!file0.name.toLowerCase().endsWith(".json") || !file1.name.toLowerCase().endsWith(".json")) {
      setError("Les deux fichiers doivent être des documents JSON (.json).")
      setFiles(null)
      return
    }

    try {
      const [text0, text1] = await Promise.all([file0.text(), file1.text()])
      const detection = detectWorkBundleRoles(text0, text1)

      if (!detection.ok) {
        setError(detection.error)
        setFiles(null)
        return
      }

      const ai = detection.accountIntelligence.data
      const corpus = detection.sourceCorpus.data

      const detectedName = ai.entity_resolution.legal_name || corpus.corpus.account_name || ""
      const identity = checkCompanyIdentityMatch(companyName, detectedName)

      // Calcul des métriques dynamiques
      const totalStatements = ai.sections.reduce((acc, sec) => acc + (sec.statements?.length ?? 0), 0)
      const totalDocuments = corpus.sources.reduce((acc, auth) => acc + auth.documents_used.length, 0)
      const totalAuthorities = corpus.sources.length

      // Vérification des références sources
      const validDocRefs = new Set<string>()
      for (const auth of corpus.sources) {
        for (const doc of auth.documents_used) {
          validDocRefs.add(doc.source_ref)
        }
      }

      let unresolvedCount = 0
      for (const sec of ai.sections) {
        for (const ref of sec.source_refs ?? []) {
          if (!validDocRefs.has(ref)) unresolvedCount++
        }
        for (const stmt of sec.statements ?? []) {
          for (const ref of stmt.source_refs ?? []) {
            if (!validDocRefs.has(ref)) unresolvedCount++
          }
        }
      }

      setFiles([file0, file1])
      if (!title) {
        const aiFileName = detection.accountIntelligence.slot === "file_a" ? file0.name : file1.name
        setTitle(aiFileName.replace(/\.json$/i, ""))
      }

      setPreview({
        detection,
        detectedCompanyName: detectedName,
        identityMatch: identity,
        totalStatements,
        totalDocuments,
        totalAuthorities,
        unresolvedSourceRefs: unresolvedCount,
      })
    } catch (err) {
      setError(`Erreur lors de la lecture des fichiers : ${err instanceof Error ? err.message : String(err)}`)
      setFiles(null)
    }
  }

  // Importation déterministe
  const handleImport = () => {
    if (!files || !preview) return
    setError(null)
    setStep("uploading")

    startTransition(async () => {
      const file0 = files[0]
      const file1 = files[1]

      // 1. Demande des signed upload tickets côté serveur
      const ticketsRes = await requestWorkStudyUploadAction({
        companyId,
        files: [
          { fileName: file0.name, fileBytes: file0.size },
          { fileName: file1.name, fileBytes: file1.size },
        ],
      })

      if (!ticketsRes.ok) {
        setError(ticketsRes.error)
        setStep("select")
        return
      }

      const { bundleId, tickets } = ticketsRes.value
      const supabase = createBrowserClient()

      // 2. Upload direct des 2 JSON dans Storage via URLs signées
      const [up0, up1] = await Promise.all([
        supabase.storage.from(STUDY_STORAGE_BUCKET).uploadToSignedUrl(tickets[0].path, tickets[0].token, file0, {
          contentType: "application/json",
        }),
        supabase.storage.from(STUDY_STORAGE_BUCKET).uploadToSignedUrl(tickets[1].path, tickets[1].token, file1, {
          contentType: "application/json",
        }),
      ])

      if (up0.error || up1.error) {
        const upErr = up0.error?.message ?? up1.error?.message
        setError(`Échec de l'envoi des fichiers dans le stockage : ${upErr}`)
        setStep("select")
        return
      }

      // 3. Enregistrement serveur & validation
      const registerRes = await registerWorkStudyAction({
        companyId,
        bundleId,
        title,
        files: [
          { path: tickets[0].path, originalFileName: file0.name },
          { path: tickets[1].path, originalFileName: file1.name },
        ],
      })

      if (!registerRes.ok) {
        setError(registerRes.error)
        setStep("select")
        return
      }

      setStudyId(registerRes.value.studyId)

      // Récupération de l'état prêt
      const progRes = await getStudyProgressAction(registerRes.value.studyId)
      if (progRes.ok) {
        setProgress(progRes.value)
      }

      setStep("ready")
      router.refresh()
    })
  }

  // Publication sur le compte
  const handlePublish = () => {
    if (!studyId) return
    setError(null)
    startTransition(async () => {
      const res = await publishStudyAction(studyId)
      if (!res.ok) {
        setError(res.error)
        return
      }
      setIsPublished(true)
      const progRes = await getStudyProgressAction(studyId)
      if (progRes.ok) setProgress(progRes.value)
      router.refresh()
    })
  }

  // Téléchargement d'un fichier associé
  const handleDownload = (kind: StudyFileKind) => {
    if (!studyId) return
    setError(null)
    startTransition(async () => {
      const res = await readStudyFileAction(studyId, kind)
      if (!res.ok) {
        setError(res.error)
        return
      }
      downloadText(res.value.fileName, res.value.content, kind === "raw" ? "text/markdown" : "application/json")
    })
  }

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

      {/* Étape 1 : Sélection des fichiers et prévisualisation immédiate */}
      {step === "select" ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-dashed border-edito-border bg-edito-canvas/40 p-4 text-center">
            <p className="text-xs leading-relaxed text-edito-body">
              Sélectionnez simultanément les <strong>2 fichiers JSON</strong> du livrable ChatGPT Work :
              <br />
              <span className="text-edito-muted">
                1 fichier Account Intelligence + 1 fichier Source Corpus (l&apos;ordre n&apos;a pas d&apos;importance).
              </span>
            </p>

            <label className="mt-3 inline-block">
              <span className="sr-only">Sélectionner 2 fichiers JSON</span>
              <input
                type="file"
                accept="application/json,.json"
                multiple
                disabled={pending}
                onChange={(event) => void handleFileSelection(event.target.files)}
                className="block w-full text-xs text-edito-body file:mr-3 file:rounded file:border file:border-edito-border file:bg-edito-chip file:px-4 file:py-2 file:text-xs file:font-bold file:text-edito-heading hover:file:bg-edito-border"
              />
            </label>

            {files ? (
              <p className="mt-2 text-[11px] font-semibold text-edito-navy">
                Fichiers sélectionnés : {files[0].name} et {files[1].name}
              </p>
            ) : null}
          </div>

          {/* Prévisualisation dynamique dès sélection */}
          {preview ? (
            <div className="space-y-3 rounded-lg border border-edito-border bg-edito-surface p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edito-border pb-2.5">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-edito-muted">Contrat détecté</p>
                  <p className="text-xs font-semibold text-edito-heading">
                    ChatGPT Work v{preview.detection.accountIntelligence.data.schema_version}
                  </p>
                </div>
                <div>
                  {preview.identityMatch.match ? (
                    <span className="inline-flex items-center rounded bg-edito-chip px-2 py-0.5 text-[11px] font-bold text-edito-navy">
                      ✓ Bundle valide
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded bg-danger/10 px-2 py-0.5 text-[11px] font-bold text-danger">
                      ! Incohérence de compte
                    </span>
                  )}
                </div>
              </div>

              {/* Rapprochement d'identité */}
              <div className="grid grid-cols-1 gap-2 rounded bg-edito-canvas p-2.5 sm:grid-cols-2 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-edito-muted">Compte Kredo :</span>
                  <p className="font-semibold text-edito-heading">{companyName}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-edito-muted">Entreprise dans l&apos;étude :</span>
                  <p className="font-semibold text-edito-navy">{preview.detectedCompanyName || "Non spécifié"}</p>
                </div>
              </div>

              {preview.identityMatch.reason ? (
                <p role="alert" className="text-xs font-semibold text-danger">
                  {preview.identityMatch.reason}
                </p>
              ) : null}

              {/* Métriques clés */}
              <div className={cn("grid gap-2", isMobile ? "grid-cols-2" : "grid-cols-3")}>
                <Metric label="Sections" value={preview.detection.accountIntelligence.data.sections.length} />
                <Metric label="Affirmations" value={preview.totalStatements} />
                <Metric label="Lacunes" value={preview.detection.accountIntelligence.data.knowledge_gaps.length} />
                <Metric label="Documents cités" value={preview.totalDocuments} />
                <Metric label="Autorités / Domaines" value={preview.totalAuthorities} />
                <Metric
                  label="Références sources"
                  value={preview.unresolvedSourceRefs === 0 ? "100% résolues" : `${preview.unresolvedSourceRefs} orpheline(s)`}
                />
              </div>

              {/* Titre optionnel */}
              <label className="block pt-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-edito-heading">
                  Titre de l&apos;étude
                </span>
                <input
                  type="text"
                  value={title}
                  disabled={pending}
                  onChange={(event) => setTitle(event.target.value)}
                  className="mt-1 block min-h-9 w-full rounded border border-edito-border bg-edito-surface px-3 text-xs text-edito-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-brass/60"
                />
              </label>

              {/* Bouton d'action */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={pending || !preview.identityMatch.match || preview.unresolvedSourceRefs > 0}
                  className={primaryBtnClass}
                >
                  {pending ? "Enregistrement en cours…" : "Importer l'étude"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Étape 2 : Chargement */}
      {step === "uploading" ? (
        <div className="space-y-3 py-6 text-center" aria-live="polite">
          <p className="text-sm font-semibold text-edito-heading">Vérification et enregistrement du bundle…</p>
          <div className="mx-auto h-1.5 w-48 overflow-hidden rounded bg-edito-chip">
            <div className="h-full w-full animate-pulse bg-edito-navy" />
          </div>
          <p className="text-xs text-edito-muted">
            Les fichiers originaux sont archivés et l&apos;étude est structurée sans appel modèle.
          </p>
        </div>
      ) : null}

      {/* Étape 3 : Étude Prête (Ready) — Vérification & Publication */}
      {step === "ready" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-edito-canvas px-3.5 py-2.5">
            <div>
              <p className="text-xs font-bold text-edito-heading">Étude ChatGPT Work importée avec succès</p>
              <p className="text-[11px] text-edito-muted">
                Statut : <strong>Prête — à vérifier et publier</strong>
              </p>
            </div>
            <span className="rounded bg-edito-chip px-2 py-0.5 text-[11px] font-bold text-edito-navy">
              ✓ Ready
            </span>
          </div>

          {progress?.coverage ? (
            <StudyCoverageReport coverage={progress.coverage} producer="chatgpt_work" />
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => handleDownload("knowledge")} disabled={pending} className={secondaryBtnClass}>
                Briques (JSON)
              </button>
              <button type="button" onClick={() => handleDownload("sources")} disabled={pending} className={secondaryBtnClass}>
                Sources E3 (JSON corpus)
              </button>
              <button type="button" onClick={() => handleDownload("raw")} disabled={pending} className={secondaryBtnClass}>
                Texte intégral (.md)
              </button>
            </div>

            {progress?.publishedAt || isPublished ? (
              <p className="text-xs font-semibold text-edito-heading">Publiée sur le compte.</p>
            ) : (
              <button type="button" onClick={handlePublish} disabled={pending} className={primaryBtnClass}>
                {pending ? "Publication…" : "Publier sur le compte"}
              </button>
            )}
          </div>

          <p className="text-[11px] leading-relaxed text-edito-muted">
            Le corpus de sources de l&apos;étude est archivé dans Storage. La normalisation et distribution
            vers Gestion des sources sera assurée au Lot 3.
          </p>
        </div>
      ) : null}
    </div>
  )
}
