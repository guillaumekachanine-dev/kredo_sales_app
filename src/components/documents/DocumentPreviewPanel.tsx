import React from "react"
import { cn } from "@/lib/utils"

export interface DocumentPreviewPanelProps {
  fileUrl: string
  className?: string
}

export function DocumentPreviewPanel({
  fileUrl,
  className
}: DocumentPreviewPanelProps) {
  return (
    <div className={cn("w-full h-full min-h-[350px] flex items-center justify-center relative", className)}>
      {fileUrl ? (
        <iframe
          src={fileUrl}
          title="Prévisualisation du document"
          className="w-full h-full border-0"
        />
      ) : (
        <div className="text-center p-6 text-muted">
          <svg className="w-12 h-12 mx-auto text-muted/50 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <p className="text-xs font-semibold">Aucun aperçu disponible</p>
        </div>
      )}
    </div>
  )
}
