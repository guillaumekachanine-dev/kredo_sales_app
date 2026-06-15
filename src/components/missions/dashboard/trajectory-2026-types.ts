export type TrajectoryGroupId = "revenue" | "capacity" | "margin"

export type TrajectorySeriesId =
  | "revenueActual"
  | "revenueTarget"
  | "capacityActual"
  | "capacityTarget"
  | "marginActual"
  | "marginTarget"

export type TrajectoryPoint2026 = {
  monthKey: string
  monthLabel: string
  revenueActual: number | null
  revenueTarget: number
  capacityActual: number | null
  capacityTarget: number
  marginActual: number | null
  marginTarget: number
  annotation?: string | null
}

export type TrajectorySummary2026 = {
  ytdRevenueActual: number
  ytdRevenueTarget: number
  ytdRevenueDelta: number
  ytdMarginActual: number | null
  ytdMarginTarget: number
  ytdCapacityActual: number | null
  ytdCapacityTarget: number
}

export type TrajectoryAssumptions2026 = {
  annualRevenueTarget: number
  monthlyRevenueTarget: number
  marginTarget: number
  historicalAnnualRevenue: number
  historicalConsultantMonths: number
  productivityPerActiveMonth: number
  capacityTarget: number
}

export type Trajectory2026Data = {
  points: TrajectoryPoint2026[]
  summary: TrajectorySummary2026
  assumptions: TrajectoryAssumptions2026
}
