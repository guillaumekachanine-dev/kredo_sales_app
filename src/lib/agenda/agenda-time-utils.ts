export const AGENDA_HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) =>
  String(hour).padStart(2, "0")
)

export const AGENDA_MINUTE_OPTIONS = ["00", "15", "30", "45"] as const

export const AGENDA_TIME_STEP_SECONDS = 15 * 60

export function normalizeTimeToQuarterHour(time: string): string {
  const [hoursPart, minutesPart] = time.split(":")
  const hours = Number.parseInt(hoursPart ?? "", 10)
  const minutes = Number.parseInt(minutesPart ?? "", 10)

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return time
  }

  const roundedMinutes = Math.round(minutes / 15) * 15
  const extraHour = roundedMinutes === 60 ? 1 : 0
  const normalizedMinutes = roundedMinutes === 60 ? 0 : roundedMinutes
  const normalizedHours = (hours + extraHour) % 24

  return `${String(normalizedHours).padStart(2, "0")}:${String(normalizedMinutes).padStart(2, "0")}`
}

export function addOneHourToTime(time: string): string {
  const normalizedTime = normalizeTimeToQuarterHour(time)
  const [hoursPart, minutesPart] = normalizedTime.split(":")
  const hours = Number.parseInt(hoursPart ?? "", 10)
  const minutes = Number.parseInt(minutesPart ?? "", 10)

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return normalizedTime
  }

  const totalMinutes = ((hours * 60 + minutes + 60) % (24 * 60) + (24 * 60)) % (24 * 60)
  const nextHours = Math.floor(totalMinutes / 60)
  const nextMinutes = totalMinutes % 60

  return `${String(nextHours).padStart(2, "0")}:${String(nextMinutes).padStart(2, "0")}`
}
