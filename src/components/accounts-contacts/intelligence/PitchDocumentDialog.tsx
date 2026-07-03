"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AppDialog } from "@/components/ui/AppDialog"
import { DocumentPreviewPanel } from "@/components/reports/DocumentPreviewPanel"
import { getPitchBriefLabel } from "@/components/reports/document-display"
import { getDocumentDetail } from "@/app/(app)/reports/_data/get-document-detail"
import type { DocumentDetail } from "@/app/(app)/reports/_data/reports-types"

type LoadedState = {
  id: string
  document: DocumentDetail | null
  error: string | null
}

// Réutilise le panneau de prévisualisation/édition de "Rapports & Rédaction"
// sans quitter la fiche compte — demande explicite : voir un pitch archivé
// depuis l'onglet Stratégie doit rester sur la page Intelligence.
export function PitchDocumentDialog({
  documentId,
  onOpenChange,
}: {
  documentId: string | null
  onOpenChange: (open: boolean) => void
}) {
  const [loaded, setLoaded] = useState<LoadedState | null>(null)

  useEffect(() => {
    if (!documentId) return
    let cancelled = false
    void getDocumentDetail(documentId).then((res) => {
      if (cancelled) return
      if ("error" in res && res.error) {
        setLoaded({ id: documentId, document: null, error: res.error })
      } else if ("data" in res && res.data) {
        setLoaded({ id: documentId, document: res.data, error: null })
      }
    })
    return () => { cancelled = true }
  }, [documentId])

  // État dérivé au rendu — pas de reset dans l'effet (pas de setState synchrone
  // au montage/à la fermeture, évite les rendus en cascade).
  const isCurrent = loaded !== null && loaded.id === documentId
  const document = isCurrent ? loaded.document : null
  const error = isCurrent ? loaded.error : null
  const loading = documentId !== null && !isCurrent
  const pitchLabel = document ? getPitchBriefLabel(document.versions[0]?.briefJson ?? null) : null

  return (
    <AppDialog
      open={documentId !== null}
      onOpenChange={onOpenChange}
      title={pitchLabel ?? document?.title ?? "Pitch"}
      className="pitch-modal-reading max-w-2xl border"
      bodyClassName="max-h-[75vh] overflow-y-auto"
      footer={
        documentId ? (
          <Link
            href={`/reports?doc=${documentId}`}
            className="text-xs font-semibold text-primary hover:text-primary-deep"
          >
            Ouvrir dans Rapports &amp; Rédaction →
          </Link>
        ) : null
      }
    >
      {loading && <p className="py-6 text-center text-sm text-muted">Chargement…</p>}
      {error && <p className="py-6 text-center text-sm text-danger">{error}</p>}
      {document && <DocumentPreviewPanel document={document} />}
    </AppDialog>
  )
}
