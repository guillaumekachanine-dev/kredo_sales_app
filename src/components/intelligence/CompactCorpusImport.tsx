import { SourceCorpusImportWizard } from "@/features/source-management/components/SourceCorpusImportWizard"

export function CompactCorpusImport({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex h-full flex-col bg-edito-surface">
      <div className="flex h-12 shrink-0 items-center border-b border-border/70 px-4 sm:h-14 sm:px-5">
        <button type="button" onClick={onBack} className="inline-flex h-8 items-center gap-1.5 rounded-full pl-1.5 pr-3 text-xs font-semibold text-edito-body transition-colors hover:bg-edito-border/50 hover:text-edito-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Retour
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto veille-scrollbar p-4 sm:p-5 relative">
        <SourceCorpusImportWizard variant="desktop" onClose={onBack} />
      </div>
    </div>
  )
}
