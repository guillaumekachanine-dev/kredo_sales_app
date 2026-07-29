"use client"

import dynamic from "next/dynamic"
import type { DashboardDevice } from "@/lib/dashboard/dashboard-types"

const EventDrawer = dynamic(
  () => import("@/components/events/EventDrawer").then((mod) => mod.EventDrawer),
  { ssr: false },
)

// Import direct du module du drawer, PAS du barrel @/components/staffing :
// ce barrel exporte aussi le Server Component SyntheseStaffingSection, qui importe
// statiquement la couche données serveur (supabase/server.ts → next/headers).
// Passer par le barrel tire donc du code serveur dans le graphe client, sur toutes
// les pages (AppOverlayHosts est monté dans (app)/layout.tsx). Turbopack le tolère,
// webpack le refuse — audit perf Lot 0.
const StaffingDrawer = dynamic(
  () =>
    import("@/components/staffing/AssistanceCaseDrawer").then(
      (mod) => mod.AssistanceCaseDrawer,
    ),
  { ssr: false },
)

const CrmIdentityDrawerHost = dynamic(
  () =>
    import("@/components/accounts-contacts/CrmIdentityDrawerHost").then(
      (mod) => mod.CrmIdentityDrawerHost,
    ),
  { ssr: false },
)

const CommunicationComposerHost = dynamic(
  () =>
    import("@/components/communication/CommunicationComposerHost").then(
      (mod) => mod.CommunicationComposerHost,
    ),
  { ssr: false },
)

const ReportGenerationHost = dynamic(
  () => import("@/components/reports/ReportGenerationHost").then((mod) => mod.ReportGenerationHost),
  { ssr: false },
)

const CrmAccountLauncherHost = dynamic(
  () =>
    import("@/components/crm/launcher/CrmAccountLauncherHost").then(
      (mod) => mod.CrmAccountLauncherHost,
    ),
  { ssr: false },
)

const LegacyNavigationDrawer = dynamic(
  () =>
    import("@/features/legacy/LegacyNavigationDrawer").then(
      (mod) => mod.LegacyNavigationDrawer,
    ),
  { ssr: false },
)

interface AppOverlayHostsProps {
  device: DashboardDevice
}

export function AppOverlayHosts({ device }: AppOverlayHostsProps) {
  return (
    <>
      <EventDrawer />
      <StaffingDrawer />
      <CrmIdentityDrawerHost />
      <CommunicationComposerHost device={device} />
      <ReportGenerationHost />
      <CrmAccountLauncherHost device={device} />
      <LegacyNavigationDrawer device={device} />
    </>
  )
}
