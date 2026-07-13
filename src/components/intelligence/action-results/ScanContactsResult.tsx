import type { ScanContactsResult as ScanContactsResultData } from "@/lib/intelligence/actions/scan-contacts"

export function ScanContactsResult({ result }: { result: ScanContactsResultData }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Metric label="Complets" value={result.summary.fullyMappedAccounts} />
        <Metric label="Partiels" value={result.summary.partialAccounts} />
        <Metric label="Sans contact" value={result.summary.noContactAccounts} />
      </div>

      {result.accountCoverage.length === 0 ? (
        <p className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-3 text-xs text-primary-fg/65">
          Aucun gap organigramme détecté sur les comptes actifs ou prospects.
        </p>
      ) : (
        <div className="space-y-2.5">
          {result.accountCoverage.map((account) => (
            <a key={account.companyId} href={`/prospection/accounts/${account.companyId}`} className="block rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-3 transition-colors hover:bg-primary-fg/[0.07]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-snug text-primary-fg">{account.companyName}</p>
                  <p className="mt-1 text-[11px] text-primary-fg/45">{account.lifecycle}</p>
                </div>
                <span className="shrink-0 rounded-full border border-primary-fg/10 bg-primary-fg/[0.06] px-2 py-0.5 text-[10px] font-bold text-primary-fg/70">
                  {account.coverageScore}%
                </span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-primary-fg/10">
                <div className="h-full rounded-full bg-brand-brass" style={{ width: `${account.coverageScore}%` }} />
              </div>
              <div className="mt-3 space-y-1.5 text-[11px] leading-snug">
                <p className="text-primary-fg/55">Présents : {account.presentRoles.length > 0 ? account.presentRoles.join(", ") : "aucun rôle qualifié"}</p>
                <p className="font-semibold text-warning">Manquants : {account.missingRoles.join(", ")}</p>
              </div>
            </a>
          ))}
        </div>
      )}

      <SourceIssues issues={result.sourceIssues} />
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-primary-fg/10 bg-primary-fg/[0.04] p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-primary-fg/45">{label}</p>
      <p className="mt-1 text-lg font-bold leading-none text-primary-fg">{value}</p>
    </div>
  )
}

function SourceIssues({ issues }: { issues: string[] }) {
  if (issues.length === 0) return null
  return (
    <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-[11px] leading-snug text-primary-fg/70">
      Données partielles : {issues.join(" ")}
    </div>
  )
}
