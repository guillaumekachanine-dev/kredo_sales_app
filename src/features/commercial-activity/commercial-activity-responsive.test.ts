import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CommercialActivityFilters } from "./CommercialActivityFilters";
import { CommercialActivityModal } from "./CommercialActivityModal";
import { CommercialActivityMobileLayout } from "./CommercialActivityMobileLayout";
import { CommercialActivityMobileNavigation } from "./CommercialActivityMobileNavigation";
import { CommercialActivityMobileSummary } from "./CommercialActivityMobileSummary";
import {
  buildCommercialActivityMobileKpis,
  buildCommercialActivityMobileTimeline,
} from "./commercial-activity-mobile-model";
import type { CommercialActivitySnapshot } from "./commercial-activity-types";

function makeSnapshot(points: number): CommercialActivitySnapshot {
  return {
    range: {
      from: "2026-01-01T00:00:00Z",
      to: "2026-12-31T00:00:00Z",
      grain: "day",
    },
    summary: {
      completedActivities: points,
      plannedActivities: 3,
      completedHours: points * 2,
      activeAccounts: 4,
      comparison: {
        completedActivitiesPct: 20,
        completedHoursPct: 10,
        activeAccountsPct: 5,
      },
    },
    timeline: Array.from({ length: points }, (_, index) => ({
      key: `2026-01-${String(index + 1).padStart(2, "0")}`,
      label: `${index + 1} janv.`,
      completedCount: index + 1,
      plannedCount: 1,
      completedHours: 2,
      plannedHours: 1,
      byNature: { prospection: { count: index + 1, hours: 2 } },
    })),
    distribution: [
      {
        nature: "prospection",
        count: points,
        hours: points * 2,
        sharePct: 100,
      },
      { nature: "client_active", count: 0, hours: 0, sharePct: 0 },
      { nature: "recruitment", count: 0, hours: 0, sharePct: 0 },
      { nature: "management", count: 0, hours: 0, sharePct: 0 },
      { nature: "internal", count: 0, hours: 0, sharePct: 0 },
    ],
    outcomes: {
      prospectMeetings: 0,
      needsCreated: 0,
      proposals: 0,
      cvsSent: 0,
      clientInterviews: 0,
      candidateInterviews: 0,
      opportunitiesWon: 0,
      clientSignatures: 0,
      candidateSignatures: 0,
      wonValue: 0,
    },
    accounts: [],
    quality: {
      scope: "global_period",
      unclassifiedEvents: 0,
      eventsWithoutCompany: 0,
      interactionsWithoutRelation: 0,
      invalidDurationEvents: 0,
    },
  };
}

describe("commercial activity mobile model", () => {
  it("caps every preset while preserving source totals and contiguous coverage", () => {
    const source = makeSnapshot(28);
    for (const [preset, expected] of [
      ["7d", 7],
      ["4w", 4],
      ["12w", 12],
      ["quarter", 6],
      ["year", 12],
      ["custom", 12],
    ] as const) {
      const timeline = buildCommercialActivityMobileTimeline(source, preset);
      expect(timeline).toHaveLength(expected);
      expect(
        timeline.reduce((total, point) => total + point.completed, 0),
      ).toBe(
        source.timeline.reduce(
          (total, point) => total + point.completedCount,
          0,
        ),
      );
      expect(timeline[0]?.key.startsWith(source.timeline[0]!.key)).toBe(true);
      expect(timeline.at(-1)?.key.endsWith(source.timeline.at(-1)!.key)).toBe(
        true,
      );
    }
  });

  it("uses the requested dynamic third KPI", () => {
    const source = makeSnapshot(7);
    expect(
      buildCommercialActivityMobileKpis(source, "prospection")[2]?.label,
    ).toBe("Comptes prospectés");
    expect(
      buildCommercialActivityMobileKpis(source, "recruitment")[2]?.label,
    ).toBe("Activités planifiées");
  });
});

describe("commercial activity responsive and accessible contracts", () => {
  it("exposes exactly three labelled mobile tabs", () => {
    const markup = renderToStaticMarkup(
      createElement(CommercialActivityMobileNavigation, {
        section: "results",
        onChange: () => undefined,
      }),
    );
    expect(markup.match(/role="tab"/g)).toHaveLength(3);
    expect(markup).toContain(
      'aria-controls="commercial-activity-mobile-panel"',
    );
    expect(markup).toContain('aria-selected="true"');
  });

  it("keeps the mobile filters collapsed, summarized and announced", () => {
    const markup = renderToStaticMarkup(
      createElement(CommercialActivityFilters, {
        preset: "12w",
        nature: "commercial",
        customRange: { from: "2026-01-01", to: "2026-01-31" },
        pending: true,
        hasSnapshot: true,
        mode: "mobile",
        onPresetChange: () => undefined,
        onNatureChange: () => undefined,
        onCustomRangeChange: () => undefined,
      }),
    );
    expect(markup).toContain(
      "12 semaines · Commercial — prospection, comptes, recrutement",
    );
    expect(markup).toContain("Refermer les filtres");
    expect(markup).toContain("Mise à jour…");
  });

  it("marks a pending panel busy without hiding the preceding snapshot", () => {
    const markup = renderToStaticMarkup(
      createElement(
        CommercialActivityMobileLayout,
        {
          section: "summary",
          onSectionChange: () => undefined,
          filters: createElement("p", null, "Filtres"),
          pending: true,
        },
        createElement("p", null, "Snapshot précédent"),
      ),
    );
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain("Snapshot précédent");
  });

  it("provides a textual table and no horizontal desktop chart for the mobile trend", () => {
    const markup = renderToStaticMarkup(
      createElement(CommercialActivityMobileSummary, {
        snapshot: makeSnapshot(12),
        preset: "12w",
        nature: "commercial",
      }),
    );
    expect(markup).toContain("Données détaillées du graphique");
    expect(markup).toContain('aria-pressed="false"');
    expect(markup).not.toContain("min-w-[520px]");
  });

  it("keeps the five-view desktop shell separate from the labelled mobile dialog", () => {
    const desktop = renderToStaticMarkup(
      createElement(CommercialActivityModal, {
        open: true,
        onClose: () => undefined,
        displayMode: "desktop",
      }),
    );
    const mobile = renderToStaticMarkup(
      createElement(CommercialActivityModal, {
        open: true,
        onClose: () => undefined,
        displayMode: "mobile",
      }),
    );
    expect(desktop).toContain("Vue d’ensemble");
    expect(desktop).not.toContain("Synthèse");
    expect(mobile).toContain('role="dialog"');
    expect(mobile).toContain("Activité commerciale");
    expect(mobile).toContain("Synthèse");
  });
});
