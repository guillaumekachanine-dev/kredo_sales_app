import { redirect } from "next/navigation"
import { resolveLegacyStaffingRedirect } from "@/lib/needs-staffing/url-state"

export const dynamic = "force-dynamic"

interface StaffingPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function StaffingPage({ searchParams }: StaffingPageProps) {
  redirect(resolveLegacyStaffingRedirect(await searchParams))
}
