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
      return (
        <svg
          className={baseClasses}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={strokeWidthOverride ?? 2}
        >
          <circle cx="9" cy="7" r="3" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 18c0-3 2.4-5 5.5-5 1.25 0 2.4.33 3.3.93" />
          <circle cx="16.5" cy="15.5" r="3.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.1 18.1L22 21" />
        </svg>
      )
    case "news-mobile":
      return (
        <svg
          className={baseClasses}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={strokeWidthOverride ?? 2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 5.5h12a2 2 0 012 2V19H6a2 2 0 01-2-2V7.5a2 2 0 012-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 9h8M8 13h3M13 13h3M8 16h8" />
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
          <rect x="5" y="4" width="14" height="17" rx="2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5V3h6v2M8 14l2.3 2.3L16 10.5" />
        </svg>
      )
    case "graduation-mobile":
      return (
        <svg
          className={baseClasses}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={strokeWidthOverride ?? 2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-5 9 5-9 5-9-5zM7 12v5c2.8 2 7.2 2 10 0v-5M21 10v6" />
        </svg>
      )
    case "workflow-mobile":
      return (
        <svg
          className={baseClasses}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={strokeWidthOverride ?? 2}
        >
          <rect x="9" y="3" width="6" height="5" rx="1" />
          <rect x="3" y="16" width="6" height="5" rx="1" />
          <rect x="15" y="16" width="6" height="5" rx="1" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4M6 16v-4h12v4" />
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
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 20V10.5l4-2.5V20M7.5 20V4h9v16M16.5 20V8l4 2.5V20M11 9h.01M13 9h.01M11 12.5h.01M13 12.5h.01M11.5 20v-3h1v3" />
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
    case "reports":
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
    case "settings":
      return (
        <svg
          className={baseClasses}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={strokeWidthOverride ?? 2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.991l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.645-.869l.214-1.28z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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
    default:
      return null
  }
}
