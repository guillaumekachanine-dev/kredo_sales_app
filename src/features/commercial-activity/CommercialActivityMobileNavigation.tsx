"use client";

import { COMMERCIAL_ACTIVITY_MOBILE_SECTIONS } from "./commercial-activity-navigation";
import type { CommercialActivityMobileSection } from "./commercial-activity-types";

export function CommercialActivityMobileNavigation({
  section,
  onChange,
}: {
  section: CommercialActivityMobileSection;
  onChange: (section: CommercialActivityMobileSection) => void;
}) {
  return (
    <nav
      aria-label="Sections d’activité commerciale"
      className="shrink-0 border-b border-white/5"
    >
      <div
        role="tablist"
        aria-label="Analyses disponibles"
        className="flex overflow-x-auto overscroll-x-contain px-2 py-1.5 [scrollbar-width:thin]"
      >
        {COMMERCIAL_ACTIVITY_MOBILE_SECTIONS.map((item) => {
          const active = item.id === section;
          return (
            <button
              key={item.id}
              id={`commercial-activity-mobile-tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls="commercial-activity-mobile-panel"
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(item.id)}
              onKeyDown={(event) => {
                const currentIndex =
                  COMMERCIAL_ACTIVITY_MOBILE_SECTIONS.findIndex(
                    (candidate) => candidate.id === item.id,
                  );
                const nextIndex =
                  event.key === "ArrowRight"
                    ? (currentIndex + 1) %
                      COMMERCIAL_ACTIVITY_MOBILE_SECTIONS.length
                    : event.key === "ArrowLeft"
                      ? (currentIndex -
                          1 +
                          COMMERCIAL_ACTIVITY_MOBILE_SECTIONS.length) %
                        COMMERCIAL_ACTIVITY_MOBILE_SECTIONS.length
                      : event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? COMMERCIAL_ACTIVITY_MOBILE_SECTIONS.length - 1
                          : null;
                if (nextIndex === null) return;
                event.preventDefault();
                onChange(COMMERCIAL_ACTIVITY_MOBILE_SECTIONS[nextIndex]!.id);
                event.currentTarget.parentElement
                  ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
                  [nextIndex]?.focus();
              }}
              className={`min-h-11 shrink-0 whitespace-nowrap rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass/50 motion-reduce:transition-none ${active ? "border-brand-brass/35 bg-brand-brass/10 text-white" : "border-transparent text-white/55 hover:bg-white/[0.04] hover:text-white"}`}
            >
              {item.title}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
