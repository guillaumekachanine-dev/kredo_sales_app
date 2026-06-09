import React from "react"
import { cn } from "@/lib/utils"

export interface DocumentMetadataPanelProps {
  metadata: Record<string, string>
  className?: string
}

export function DocumentMetadataPanel({
  metadata,
  className
}: DocumentMetadataPanelProps) {
  const entries = Object.entries(metadata)

  return (
    <div className={cn("p-5 flex flex-col gap-4", className)}>
      <h3 className="text-[10px] font-bold text-muted uppercase tracking-wider">
        Informations du document
      </h3>

      {entries.length === 0 ? (
        <p className="text-xs text-muted">Aucune métadonnée disponible</p>
      ) : (
        <dl className="divide-y divide-border/40 text-xs">
          {entries.map(([key, value]) => (
            <div key={key} className="py-2.5 flex flex-col gap-1">
              <dt className="text-muted font-medium capitalize">{key}</dt>
              <dd className="text-heading font-semibold font-mono break-all">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
