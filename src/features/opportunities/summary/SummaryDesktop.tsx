import { KpiCard } from "@/components/ui/KpiCard"
import type { OpportunitiesSyntheseViewModel } from "../data/opportunities-synthese.types"
import { PipeBreakdownChart } from "./PipeBreakdownChart"
import { SkillsComparisonChart } from "./SkillsComparisonChart"
import { ProcessFlowChart } from "./ProcessFlowChart"
import { DeadlinesTable } from "./DeadlinesTable"
import { formatCompactEuros, formatDeadline, formatEuros, formatNumber } from "./summary-formatters"

/** Server composition. Data = Lot 3 VM; Desktop only, selected before loading by the route. */
export function SummaryDesktop({ vm }: { vm: OpportunitiesSyntheseViewModel }) {
  return (
    <div className="@container min-h-0 min-w-0 flex-1 overflow-y-auto bg-surface px-5 pb-5 text-body">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="grid grid-cols-3 divide-x divide-border border-b border-border py-3" aria-label="Indicateurs du portefeuille">
          <KpiCard label="Besoins ouverts" value={formatNumber(vm.kpis.openNeedsCount)} size="compact" compactLayout className="rounded-none border-0 [&_.text-muted]:text-body" />
          <KpiCard label="Positionnements actifs" value={formatNumber(vm.kpis.activePositioningsCount)} size="compact" compactLayout className="rounded-none border-0 [&_.text-muted]:text-body" />
          <KpiCard label="CA du pipe" value={<span aria-label={formatEuros(vm.kpis.pipeWeightedValue)}>{formatCompactEuros(vm.kpis.pipeWeightedValue)}</span>} size="compact" compactLayout context={`${formatNumber(vm.kpis.openOpportunitiesCount)} opportunité(s) ouverte(s)`} contextClassName="text-body" className="rounded-none border-0 [&_.text-muted]:text-body" />
        </div>
        <PipeBreakdownChart pipeByClient={vm.pipeByClient} pipeByPractice={vm.pipeByPractice} total={vm.kpis.pipeWeightedValue} />
        <div className="grid grid-cols-1 divide-y divide-border @min-[1080px]:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] @min-[1080px]:divide-x @min-[1080px]:divide-y-0">
          <div className="min-w-0 @min-[1080px]:pr-7"><SkillsComparisonChart demand={vm.skillsDemand} supply={vm.skillsSupply} /></div>
          <div className="min-w-0 @min-[1080px]:pl-7"><ProcessFlowChart steps={vm.staffingFunnel} opportunities={vm.processByOpportunity} /></div>
        </div>
        <DeadlinesTable deadlines={vm.upcomingDeadlines} referenceAt={vm.generatedAt} />
        <footer className="border-t border-border py-5 text-xs leading-5 text-body">
          <p className="font-semibold text-heading">Périmètre & méthode <span className="font-normal text-body">· Situation au {formatDeadline(vm.generatedAt, vm.generatedAt).absolute}</span></p>
          <ul className="mt-2 space-y-1">{vm.dataNotes.map((note, index) => <li key={index}>{note}</li>)}</ul>
        </footer>
      </div>
    </div>
  )
}
