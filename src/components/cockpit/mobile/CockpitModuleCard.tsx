"use client"

import React from "react"

export type CockpitModuleIconName =
  | "priorities"
  | "meetings"
  | "opportunities"
  | "brief"
  | "diagnostic"
  | "signals"

interface CockpitModuleCardProps {
  id: string
  title: string
  indicator: string
  detail: string
  icon: CockpitModuleIconName
  badge?: string
  onOpen: (event: React.MouseEvent<HTMLButtonElement>) => void
}

function CockpitModuleIcon({ name }: { name: CockpitModuleIconName }) {
  const shared = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    className: "size-6",
    "aria-hidden": true,
  } as const

  if (name === "priorities") {
    return <svg {...shared}><path strokeLinecap="round" strokeLinejoin="round" d="m12 3 2.45 4.97 5.49.8-3.97 3.87.94 5.47L12 15.54l-4.91 2.57.94-5.47-3.97-3.87 5.49-.8L12 3Z" /></svg>
  }
  if (name === "meetings") {
    return <svg {...shared}><rect x="3.75" y="5.25" width="16.5" height="15" rx="2" /><path strokeLinecap="round" d="M7.5 3.75v3m9-3v3M3.75 9.75h16.5" /></svg>
  }
  if (name === "opportunities") {
    return <svg {...shared}><path strokeLinecap="round" strokeLinejoin="round" d="M4 19.25h16M6.75 16V9.75h4V16m1.5 0V5.5h5V16M4.5 19.25V16h15v3.25" /></svg>
  }
  if (name === "brief") {
    return <svg {...shared}><rect x="5" y="3.5" width="14" height="17" rx="2" /><path strokeLinecap="round" d="M8.5 8h7m-7 4h7m-7 4h4" /></svg>
  }
  if (name === "diagnostic") {
    return <svg {...shared}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3.5a7.5 7.5 0 1 0 7.5 7.5M12 3.5v7.5h7.5M7 18.5l3-3 2 1.5 4-4" /></svg>
  }
  return <svg {...shared}><path strokeLinecap="round" strokeLinejoin="round" d="M4 18.5V14m5.33 4.5V9.5m5.34 9V5m5.33 13.5V11" /><path strokeLinecap="round" d="M3.5 20.5h17" /></svg>
}

export function CockpitModuleCard({
  id,
  title,
  indicator,
  detail,
  icon,
  badge,
  onOpen,
}: CockpitModuleCardProps) {
  return (
    <button
      id={id}
      type="button"
      className="cockpit-module-card"
      onClick={onOpen}
      aria-label={`Ouvrir ${title}`}
    >
      <span className="cockpit-module-card__topline">
        <span className="cockpit-module-card__icon"><CockpitModuleIcon name={icon} /></span>
        {badge ? <span className="cockpit-module-card__badge">{badge}</span> : null}
      </span>
      <span className="cockpit-module-card__title">{title}</span>
      <span className="cockpit-module-card__indicator">{indicator}</span>
      <span className="cockpit-module-card__detail">{detail}</span>
    </button>
  )
}
