import React from "react"

export function getNavigationIcon(
  name?: string,
  className?: string,
  strokeWidthOverride?: number,
) {
  const baseClasses = className ?? "w-4 h-4 shrink-0 transition-colors"

  switch (name) {
    case "cockpit-mobile":
      return (
        <svg
          className={baseClasses}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={strokeWidthOverride ?? 2}
        >
          <rect x="3.5" y="4.5" width="17" height="12" rx="1.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 20h8M10 16.5V20m4-3.5V20" />
        </svg>
      )
    case "crm-mobile":
      return (
        <svg
          className={baseClasses}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={strokeWidthOverride ?? 2}
        >
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V5.5A1.5 1.5 0 019.5 4h5A1.5 1.5 0 0116 5.5V7M3 12h18M9.5 12v1h5v-1" />
        </svg>
      )
    case "prospection-mobile":
    case "prospection":
      return (
        <svg
          className={baseClasses}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={strokeWidthOverride ?? 2}
        >
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </svg>
      )
    case "news-mobile":
    case "veille":
      return (
        <svg
          className={baseClasses}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={strokeWidthOverride ?? 2}
        >
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 8h6M9 12h6M9 16h4" />
        </svg>
      )
    case "clipboard-mobile":
      return (
        <svg
          className={baseClasses}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={strokeWidthOverride ?? 2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3L4 6v6c0 5.25 3.75 9.5 8 11 4.25-1.5 8-5.75 8-11V6l-8-3z" />
        </svg>
      )
    case "graduation-mobile":
    case "knowledge":
      return (
        <svg
          className={baseClasses}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={strokeWidthOverride ?? 2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M22 10L12 4 2 10l10 6 10-6zM6 12.5V17c0 2 3 3.5 6 3.5s6-1.5 6-3.5v-4.5M22 10v6" />
        </svg>
      )
    case "workflow-mobile":
    case "automations":
      return (
        <svg
          className={baseClasses}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={strokeWidthOverride ?? 2}
        >
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      )
    case "close":
      return (
        <svg
          className={baseClasses}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={strokeWidthOverride ?? 2}
        >
          <rect x="4" y="5" width="16" height="15" rx="2.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 3v4M8 3v4M4 10h16" />
        </svg>
      )
    case "cockpit":
      return (
        <svg
          className={baseClasses}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={strokeWidthOverride ?? 2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h3M11 6h9M4 12h8M16 12h4M4 18h5M13 18h7" />
          <circle cx="9" cy="6" r="2" />
          <circle cx="14" cy="12" r="2" />
          <circle cx="11" cy="18" r="2" />
        </svg>
      )
    case "calendar":
      return (
        <svg
          className={baseClasses}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={strokeWidthOverride ?? 2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      )
    case "crm":
      return (
        <svg
          className={baseClasses}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={strokeWidthOverride ?? 2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M3 12h18M6.34 6.34l11.32 11.32M6.34 17.66L17.66 6.34" />
        </svg>
      )
    case "sales":
      return (
        <svg
          className={baseClasses}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={strokeWidthOverride ?? 2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5" />
        </svg>
      )
    case "staffing":
      return (
        <svg
          className={baseClasses}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={strokeWidthOverride ?? 2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.5l2.13 4.32 4.77.69-3.45 3.36.81 4.75L12 14.38l-4.26 2.24.81-4.75-3.45-3.36 4.77-.69L12 3.5z" />
        </svg>
      )
    case "engagements":
      return (
        <svg
          className={baseClasses}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={strokeWidthOverride ?? 2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 9.75l3.25-3.25 3.5 3.5L7 13.25l-3.5-3.5zM20.5 9.75L17.25 6.5l-3.5 3.5 3.25 3.25 3.5-3.5zM8.25 12.25l3.25 3.25a1.25 1.25 0 001.77 0l.73-.73.73.73a1.25 1.25 0 001.77 0l.73-.73.5.5a1.25 1.25 0 001.77 0l.75-.75M10 10.5l1.5-1.5a2.25 2.25 0 013.18 0l1.82 1.82" />
        </svg>
      )
    case "bi":
      return (
        <svg
          className={baseClasses}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={strokeWidthOverride ?? 2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
        </svg>
      )
    case "reports":
      return (
        <svg
          className={baseClasses}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={strokeWidthOverride ?? 2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M8 12h8M8 16h6" />
        </svg>
      )
    case "equipe":
      return (
        <svg
          className={baseClasses}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={strokeWidthOverride ?? 2}
        >
          <circle cx="9" cy="8" r="3" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 18c0-3 2.5-4.5 6-4.5s6 1.5 6 4.5" />
          <circle cx="16" cy="9" r="2.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 13.5c1.8 0 3.5 1 4.5 2.5" />
        </svg>
      )
    case "recrutement":
      return (
        <svg
          className={baseClasses}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={strokeWidthOverride ?? 2}
        >
          <circle cx="10" cy="8" r="3.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 19c0-3.5 3-5.5 6.5-5.5.9 0 1.8.15 2.6.45M17 11v6M14 14h6" />
        </svg>
      )
    case "finance":
      return (
        <svg
          className={baseClasses}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={strokeWidthOverride ?? 2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 20h16M6 20V12M12 20V6M18 20V14" />
        </svg>
      )
    case "settings":
      return (
        <svg
          className={baseClasses}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={strokeWidthOverride ?? 2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16M8 4v4M16 10v4M10 16v4" />
        </svg>
      )
    case "navigation":
    case "menu":
      return (
        <svg
          className={baseClasses}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={strokeWidthOverride ?? 2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      )
    case "arrow-left":
    case "back":
      return (
        <svg
          className={baseClasses}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={strokeWidthOverride ?? 2.6}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      )
    case "arrow-right":
    case "forward":
      return (
        <svg
          className={baseClasses}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={strokeWidthOverride ?? 2.6}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      )
    case "arrow-down":
    case "down":
      return (
        <svg
          className={baseClasses}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={strokeWidthOverride ?? 2.6}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      )
    default:
      return null
  }
}
