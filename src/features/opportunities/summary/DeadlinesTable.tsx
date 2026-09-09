import Link from "next/link"
import type {
  OpportunityDeadline,
  OpportunityDeadlineSource,
} from "../planning/data/opportunity-deadline.types"
import { formatDeadline } from "./summary-formatters"

const SOURCE_LABEL: Record<OpportunityDeadlineSource, string> = {
  next_action: "Action",
  calendar_event: "Agenda",
  target_close: "Closing visé",
}

export function DeadlinesTable({ deadlines, referenceAt }: {
  deadlines: readonly OpportunityDeadline[]
  referenceAt: string
}) {
  return (
    <section aria-label="5 prochaines échéances" className="border-t border-border py-7">
      <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-primary">04 / Prochains mouvements</p>
      <h2 className="font-heading text-xl font-bold text-heading">5 prochaines échéances</h2>
      <p className="mt-1 text-sm text-body">Prochaine action, rendez-vous d’agenda ou date de closing visée — une échéance par opportunité</p>
      {deadlines.length === 0 ? <p className="mt-5 border-t border-dashed border-border py-6 text-sm text-body">Aucune échéance à venir renseignée.</p> : (
        <table className="mt-5 w-full table-fixed border-collapse text-left text-sm">
          <caption className="sr-only">Échéances des opportunités ouvertes, par date croissante ; une date de closing reste un objectif.</caption>
          <thead className="border-b border-border text-xs text-body">
            <tr><th scope="col" className="w-[19%] pb-3 font-medium">Date</th><th scope="col" className="w-[27%] px-3 pb-3 font-medium">Échéance</th><th scope="col" className="w-[34%] px-3 pb-3 font-medium">Opportunité</th><th scope="col" className="w-[20%] pb-3 pl-3 font-medium">Client</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {deadlines.map((deadline) => {
              const date = formatDeadline(deadline.dueAt, referenceAt)
              return <tr key={`${deadline.opportunityId}:${deadline.source}:${deadline.dueAt}`} className="align-top">
                <td className="py-4"><span className="block font-semibold text-heading">{date.relative}</span><time dateTime={deadline.dueAt} className="mt-1 block text-xs tabular-nums text-body">{date.absolute}</time></td>
                <td className="break-words px-3 py-4"><span className={`mb-1 block text-xs font-semibold ${deadline.source === "target_close" ? "text-body" : "text-primary"}`}>{SOURCE_LABEL[deadline.source]}</span><span className="text-heading">{deadline.label}</span></td>
                <td className="break-words px-3 py-4"><Link href={`/missions/opps/${encodeURIComponent(deadline.opportunityId)}`} className="font-semibold text-heading underline decoration-border-strong underline-offset-4 hover:decoration-primary focus-visible:outline-2 focus-visible:outline-primary">{deadline.opportunityTitle}</Link></td>
                <td className="break-words py-4 pl-3 text-body">{deadline.client ?? "Client non renseigné"}</td>
              </tr>
            })}
          </tbody>
        </table>
      )}
    </section>
  )
}
