import React from "react"
import { DocumentPreviewPanel } from "./DocumentPreviewPanel"
import { DocumentMetadataPanel } from "./DocumentMetadataPanel"
import { DocumentViewerToolbar } from "./DocumentViewerToolbar"
import { cn } from "@/lib/utils"

export interface DocumentViewerShellProps {
  fileName: string
  fileUrl: string
  metadata: Record<string, string>
  actions?: React.ReactNode
  className?: string
}

export function DocumentViewerShell({
  fileName,
  fileUrl,
  metadata,
  actions,
  className
}: DocumentViewerShellProps) {
  return (
    <div className={cn("w-full h-full flex flex-col bg-canvas rounded-lg overflow-hidden border border-border", className)}>
      {/* Toolbar */}
      <DocumentViewerToolbar fileName={fileName} actions={actions} />

      {/* Main Grid Layout */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-border">
        {/* Preview Panel */}
        <div className="col-span-1 md:col-span-3 h-full overflow-hidden bg-muted/20">
          <DocumentPreviewPanel fileUrl={fileUrl} />
        </div>

        {/* Metadata Panel */}
        <div className="col-span-1 h-full overflow-y-auto bg-surface">
          <DocumentMetadataPanel metadata={metadata} />
        </div>
      </div>
    </div>
  )
}
