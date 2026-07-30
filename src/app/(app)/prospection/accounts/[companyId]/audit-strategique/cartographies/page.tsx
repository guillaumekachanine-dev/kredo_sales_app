import Link from "next/link"
import { notFound } from "next/navigation"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { StrategicAuditBanner } from "@/features/strategic-audits/StrategicAuditBanner"
import { StrategicAuditCartographiesDesktop } from "@/features/strategic-audits/StrategicAuditCartographiesDesktop"
import { StrategicAuditCartographiesMobile } from "@/features/strategic-audits/StrategicAuditCartographiesMobile"
import { getStrategicAuditCartographies } from "@/features/strategic-audits/strategic-audit-loader"

export default async function StrategicAuditCartographiesPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params
  const [device, audit] = await Promise.all([getDashboardDevice(), getStrategicAuditCartographies(companyId)])
  if (!audit) notFound()
  return <main className="mx-auto max-w-5xl space-y-6 px-4 py-6"><Link href={`/prospection/accounts/${companyId}`} className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-deep">← Retour au compte</Link><div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-4"><CompanyLogo name={audit.company.name} logoPath={audit.company.logo_path as string | null} size="xl"/><div><h1 className="text-xl font-bold tracking-tight text-heading sm:text-2xl">{audit.company.name}</h1><p className="mt-0.5 text-xs font-medium text-body sm:text-sm">Audit stratégique : cartographies opérationnelles</p></div></div></div><StrategicAuditBanner/>{device === "mobile" ? <StrategicAuditCartographiesMobile data={audit.cartographies}/> : <StrategicAuditCartographiesDesktop data={audit.cartographies}/>}</main>
}
