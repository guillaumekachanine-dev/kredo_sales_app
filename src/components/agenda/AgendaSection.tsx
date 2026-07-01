import { Suspense } from "react"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { AgendaDesktopPage } from "./AgendaDesktopPage"
import { AgendaDesktopSkeleton } from "./AgendaDesktopSkeleton"
import { AgendaMobilePage } from "./AgendaMobilePage"

interface AgendaSectionProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function AgendaSection({ searchParams }: AgendaSectionProps) {
  const device = await getDashboardDevice()

  if (device === "mobile") {
    return (
      <Suspense fallback={<AgendaDesktopSkeleton />}>
        <AgendaMobilePage searchParams={searchParams} />
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<AgendaDesktopSkeleton />}>
      <AgendaDesktopPage searchParams={searchParams} />
    </Suspense>
  )
}
