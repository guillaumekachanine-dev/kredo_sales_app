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
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.75v6M9.5 6.25L12 3.75l2.5 2.5M14.25 12h6M17.75 9.5l2.5 2.5-2.5 2.5M12 14.25v6M9.5 17.75l2.5 2.5 2.5-2.5M9.75 12h-6M6.25 9.5L3.75 12l2.5 2.5" />
        </svg>
      )
    case "news-mobile":
    case "veille":
      return (
        <svg
          className={className ?? "h-[18px] w-[18px] shrink-0 transition-colors"}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={strokeWidthOverride ?? 1.65}
        >
          <circle cx="12" cy="12" r="7.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15M5.85 8.25h12.3M5.85 15.75h12.3M12 4.5c-2.1 2.05-3.25 4.7-3.25 7.5s1.15 5.45 3.25 7.5M12 4.5c2.1 2.05 3.25 4.7 3.25 7.5s-1.15 5.45-3.25 7.5" />
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
    case "home":
      return (
        <svg
          className={baseClasses}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={strokeWidthOverride ?? 2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.955-8.955a1.125 1.125 0 011.59 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
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
          strokeWidth={strokeWidthOverride ?? 1.65}
        >
          <rect x="3.75" y="5.25" width="16.5" height="15" rx="2.25" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.75 3.5v3.5M16.25 3.5v3.5M3.75 9.5h16.5M7.5 12.5h2.25M11.875 12.5h2.25M16.25 12.5h.25M7.5 16.25h2.25M11.875 16.25h2.25M16.25 16.25h.25" />
        </svg>
      )
    case "crm":
      return (
        <svg
          className={baseClasses}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={strokeWidthOverride ?? 1.65}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 20V4.25h13.5V20M3.5 20h17M9 8h.01M12 8h.01M15 8h.01M9 11.5h.01M12 11.5h.01M15 11.5h.01M9 15h.01M12 15h.01M15 15h.01M10.5 20v-2.75h3V20" />
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
          className={className ?? "h-[18px] w-[18px] shrink-0 transition-colors"}
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
          className={className ?? "h-[18px] w-[18px] shrink-0 transition-colors"}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={strokeWidthOverride ?? 1.65}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 8.25h16v11.25H4zM8.5 8.25v-2A1.25 1.25 0 019.75 5h4.5a1.25 1.25 0 011.25 1.25v2M4 12.5h16M9.5 12.5V14h5v-1.5" />
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
          strokeWidth={strokeWidthOverride ?? 1.65}
        >
          <circle cx="12" cy="6.75" r="3.1" />
          <circle cx="6.45" cy="8.9" r="2.25" />
          <circle cx="17.55" cy="8.9" r="2.25" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 19.75v-1.1c0-3.25 3.05-5.5 6.75-5.5s6.75 2.25 6.75 5.5v1.1M2.75 18.75v-.55c0-2.4 1.7-4.15 4.2-4.15M21.25 18.75v-.55c0-2.4-1.7-4.15-4.2-4.15" />
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
          className={className ?? "h-[18px] w-[18px] shrink-0 transition-colors"}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={strokeWidthOverride ?? 1.65}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 8.5h16v11H3.5M3.5 12.75v.9M3.5 16.25v3.25M3.5 8.5l12.5-3.75v3.75M19.5 12.5h-3.25a2.75 2.75 0 000 5.5h3.25" />
          <circle cx="16.5" cy="15.25" r=".55" fill="currentColor" stroke="none" />
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
