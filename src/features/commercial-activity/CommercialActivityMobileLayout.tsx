"use client";

import type { ReactNode } from "react";
import { CommercialActivityMobileNavigation } from "./CommercialActivityMobileNavigation";
import type { CommercialActivityMobileSection } from "./commercial-activity-types";

export function CommercialActivityMobileLayout({
  section,
  onSectionChange,
  filters,
  pending,
  children,
}: {
  section: CommercialActivityMobileSection;
  onSectionChange: (section: CommercialActivityMobileSection) => void;
  filters: ReactNode;
  pending: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-[env(safe-area-inset-bottom)]">
      <CommercialActivityMobileNavigation
        section={section}
        onChange={onSectionChange}
      />
      {filters}
      <div
        id="commercial-activity-mobile-panel"
        role="tabpanel"
        aria-labelledby={`commercial-activity-mobile-tab-${section}`}
        aria-busy={pending || undefined}
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-heading/20"
      >
        {children}
      </div>
    </div>
  );
}
