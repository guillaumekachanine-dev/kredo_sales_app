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
          <circle cx="12" cy="12" r="7.5" />
          <circle cx="12" cy="12" r="3" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 5l5 5M5 5h3.5M5 5v3.5" />
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
          <circle cx="12" cy="12" r="8" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.25 7.5c1.5.9 3.55 1.5 5.75 1.5s4.25-.6 5.75-1.5M6.25 16.5c1.5-.9 3.55-1.5 5.75-1.5s4.25.6 5.75 1.5M12 4c2.25 2.15 3.5 4.95 3.5 8s-1.25 5.85-3.5 8M12 4c-2.25 2.15-3.5 4.95-3.5 8s1.25 5.85 3.5 8M3 9.5h18v5H3zM6 12h.01M9 12h.01M12 12h.01M15 12h.01M18 12h.01" />
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
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751A11.959 11.959 0 0112 2.714z" />
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
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-16.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-16.25v16.25" />
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
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
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
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
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
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 20V10.5l4-2.5V20M7.5 20V4h9v16M16.5 20V8l4 2.5V20M11 9h.01M13 9h.01M11 12.5h.01M13 12.5h.01M11.5 20v-3h1v3" />
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
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751A11.959 11.959 0 0112 2.714z" />
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
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
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
          <circle cx="12" cy="7" r="2.75" />
          <circle cx="6.75" cy="9.25" r="2" />
          <circle cx="17.25" cy="9.25" r="2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 19c0-3.25 2.7-5.5 6-5.5s6 2.25 6 5.5M2.75 19c0-2.2 1.8-3.75 4-3.75M21.25 19c0-2.2-1.8-3.75-4-3.75" />
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
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
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
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 20h17M5 20v-6h4v6M10 20V10h4v10M15 20V5h4v15" />
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
