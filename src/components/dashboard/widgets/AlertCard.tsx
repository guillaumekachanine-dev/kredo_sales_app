import { AlertBlock, type AlertBlockVariant } from "@/components/ui/AlertBlock"
import { DashboardAlert } from "@/lib/dashboard/dashboard-types"

interface AlertCardProps {
  alert: DashboardAlert
  className?: string
}

function mapAlertVariant(status: DashboardAlert["status"]): AlertBlockVariant {
  if (status === "success") {
    return "success"
  }

  if (status === "warning") {
    return "warning"
  }

  if (status === "danger") {
    return "danger"
  }

  return "info"
}

function renderAlertIcon(status: DashboardAlert["status"]) {
  if (status === "success") {
    return (
      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }

  if (status === "pending") {
    return (
      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }

  if (status === "warning" || status === "danger") {
    return (
      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    )
  }

  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

// Legacy wrapper aligned to the new alert surface primitive.
export function AlertCard({ alert, className }: AlertCardProps) {
  return (
    <AlertBlock
      variant={mapAlertVariant(alert.status)}
      title={alert.title}
      description={alert.description}
      icon={renderAlertIcon(alert.status)}
      href={alert.href}
      className={className}
    />
  )
}
