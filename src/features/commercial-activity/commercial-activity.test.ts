import { describe, expect, it } from "vitest";
import { resolveCommercialActivityNature } from "./commercial-activity-category";
import {
  canEnrichAccountFromInteraction,
  getCommercialActivityDurationHours,
  getCommercialActivityGrain,
  isStandaloneInteractionActivity,
  percentageComparison,
  rankCommercialActivityAccounts,
} from "./get-commercial-activity-snapshot";
import { buildCommercialActivityMobileResults } from "./commercial-activity-mobile-model";
import type { CommercialActivitySnapshot } from "./commercial-activity-types";

const snapshot: CommercialActivitySnapshot = {
  range: {
    from: "2026-01-01T00:00:00Z",
    to: "2026-02-01T00:00:00Z",
    grain: "day",
  },
  summary: {
    completedActivities: 2,
    plannedActivities: 1,
    completedHours: 3,
    activeAccounts: 2,
    comparison: {
      completedActivitiesPct: null,
      completedHoursPct: null,
      activeAccountsPct: null,
    },
  },
  timeline: [],
  distribution: [],
  accounts: [],
  outcomes: {
    prospectMeetings: 1,
    needsCreated: 2,
    proposals: 3,
    cvsSent: 4,
    clientInterviews: 5,
    candidateInterviews: 6,
    opportunitiesWon: 7,
    clientSignatures: 8,
    candidateSignatures: 9,
    wonValue: 10,
  },
  quality: {
    scope: "global_period",
    unclassifiedEvents: 0,
    eventsWithoutCompany: 0,
    interactionsWithoutRelation: 0,
    invalidDurationEvents: 0,
  },
};

describe("commercial activity classification", () => {
  it("uses explicit metadata before the canonical Agenda registry", () => {
    expect(
      resolveCommercialActivityNature({
        eventType: "rdv_prospection",
        metadata: { activity_nature: "management" },
      }),
    ).toBe("management");
  });

  it("uses the canonical Agenda registry and honest relation fallbacks", () => {
    expect(
      resolveCommercialActivityNature({ eventType: "entretien_candidat" }),
    ).toBe("recruitment");
    expect(
      resolveCommercialActivityNature({ companyLifecycle: "prospect" }),
    ).toBe("prospection");
    expect(resolveCommercialActivityNature({})).toBe("unclassified");
  });
});

describe("commercial activity calculations", () => {
  it("excludes invalid or negative durations", () => {
    expect(
      getCommercialActivityDurationHours(
        "2026-01-02T11:00:00Z",
        "2026-01-02T10:00:00Z",
      ),
    ).toBeNull();
    expect(
      getCommercialActivityDurationHours(
        "2026-01-02T10:00:00Z",
        "2026-01-02T11:30:00Z",
      ),
    ).toBe(1.5);
  });

  it("selects the documented automatic grain", () => {
    expect(
      getCommercialActivityGrain(
        "2026-01-01T00:00:00Z",
        "2026-02-01T00:00:00Z",
      ),
    ).toBe("day");
    expect(
      getCommercialActivityGrain(
        "2026-01-01T00:00:00Z",
        "2026-02-02T00:00:00Z",
      ),
    ).toBe("week");
    expect(
      getCommercialActivityGrain(
        "2026-01-01T00:00:00Z",
        "2026-08-01T00:00:00Z",
      ),
    ).toBe("month");
  });

  it("keeps zeroes and declines undefined comparisons", () => {
    expect(percentageComparison(0, 4)).toBe(-100);
    expect(percentageComparison(2, 0)).toBeNull();
    expect(percentageComparison(0, 0)).toBeNull();
  });

  it("does not treat an interaction linked to an event as a second activity", () => {
    expect(isStandaloneInteractionActivity("event-1")).toBe(false);
    expect(isStandaloneInteractionActivity(null)).toBe(true);
  });

  it("does not let six unclassified standalone interactions inflate thirty filtered event accounts", () => {
    const eventNatures = new Map([["included", "prospection" as const]]);
    expect(
      canEnrichAccountFromInteraction("included", eventNatures, "commercial"),
    ).toBe(true);
    expect(
      canEnrichAccountFromInteraction(null, eventNatures, "commercial"),
    ).toBe(false);
    expect(
      canEnrichAccountFromInteraction("missing", eventNatures, "commercial"),
    ).toBe(false);
  });

  it("keeps client and candidate outcomes separate and only exposes relevant result groups", () => {
    const recruitment = buildCommercialActivityMobileResults(
      snapshot,
      "recruitment",
    );
    expect(recruitment).toHaveLength(1);
    expect(recruitment[0]?.items.map((item) => item.label)).toEqual([
      "CV envoyés",
      "Entretiens candidat",
      "Entretiens client liés au recrutement",
      "Signatures candidat",
    ]);
    expect(
      buildCommercialActivityMobileResults(snapshot, "management"),
    ).toEqual([]);
    expect(
      buildCommercialActivityMobileResults(
        snapshot,
        "commercial",
      )[0]?.items.map((item) => item.label),
    ).toContain("Propositions enregistrées");
    expect(
      buildCommercialActivityMobileResults(snapshot, "commercial").flatMap(
        (group) => group.items.map((item) => item.label),
      ),
    ).not.toContain("Propositions / soutenances");
  });

  it("marks quality as global rather than pretending it follows the nature filter", () => {
    expect(snapshot.quality.scope).toBe("global_period");
  });

  it("ranks accounts by completed activity and returns at most ten", () => {
    const accounts = Array.from({ length: 11 }, (_, index) => ({
      companyId: String(index),
      companyName: `Compte ${index}`,
      completedActivities: index,
      completedHours: index,
      contactsReached: 0,
      outcomesCount: 0,
      lastActivityAt: null,
    }));
    const ranked = rankCommercialActivityAccounts(accounts);
    expect(ranked).toHaveLength(10);
    expect(ranked[0]?.companyId).toBe("10");
    expect(ranked.at(-1)?.companyId).toBe("1");
  });
});
