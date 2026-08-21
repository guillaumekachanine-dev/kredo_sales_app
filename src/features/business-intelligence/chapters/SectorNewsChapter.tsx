import type { SegmentNewsLibrary } from "../data/business-intelligence-workspace-types"

function formatDate(value: string | null): string {
  if (!value) return "Date non renseignée"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "Date non renseignée" : date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
}

export function SectorNewsChapterDesktop({ news }: { news: SegmentNewsLibrary }) {
  return <section className="mx-auto max-w-5xl rounded-xl border border-edito-border bg-edito-surface"><header className="border-b border-edito-border px-5 py-4"><h2 className="font-heading text-lg font-bold text-edito-navy">Actualités sectorielles</h2><p className="mt-1 text-xs text-edito-muted">Sélection existante du segment, sans enrichissement supplémentaire.</p></header><NewsList news={news} className="divide-edito-border" itemClassName="px-5 py-4" /></section>
}

export function SectorNewsChapterMobile({ news }: { news: SegmentNewsLibrary }) {
  return <section className="px-4 py-4"><h2 className="font-heading text-lg font-bold text-heading">Actualités sectorielles</h2><NewsList news={news} className="mt-3 divide-border border-y border-border" itemClassName="py-3" /></section>
}

function NewsList({ news, className, itemClassName }: { news: SegmentNewsLibrary; className: string; itemClassName: string }) {
  return <ul className={`divide-y ${className}`}>{news.items.slice(0, 20).map((item) => <li key={`${item.type}-${item.id}`} className={itemClassName}><div className="flex items-center justify-between gap-3"><span className="text-[10px] font-bold uppercase tracking-wide text-muted">{item.type === "signal" ? "Signal" : item.source ?? "Actualité"}</span><span className="text-[10px] text-muted">{formatDate(item.publishedAt)}</span></div><h3 className="mt-1 text-sm font-semibold text-heading">{item.title}</h3>{item.summary ? <p className="mt-1 text-xs leading-relaxed text-body">{item.summary}</p> : null}{item.url ? <a href={item.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-11 items-center text-xs font-semibold text-primary">Consulter la source</a> : null}</li>)}</ul>
}
