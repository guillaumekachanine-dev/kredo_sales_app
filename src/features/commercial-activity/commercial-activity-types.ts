export type CommercialActivityNature =
  "prospection" | "client_active" | "recruitment" | "management" | "internal";

export type CommercialActivityFilterNature =
  CommercialActivityNature | "commercial";
export type CommercialActivityCategory =
  CommercialActivityNature | "unclassified";

export type CommercialActivitySection =
  "overview" | "rhythm" | "distribution" | "outcomes" | "accounts";

export type CommercialActivityMobileSection =
  "summary" | "results" | "accounts";

export type CommercialActivityPeriodPreset =
  "7d" | "4w" | "12w" | "quarter" | "year" | "custom";

export type CommercialActivityFilters = {
  from: string;
  to: string;
  nature: CommercialActivityFilterNature;
};

export type CommercialActivityMetric = "volume" | "hours";

export type CommercialActivitySnapshot = {
  range: {
    from: string;
    to: string;
    grain: "day" | "week" | "month";
  };
  summary: {
    completedActivities: number;
    plannedActivities: number;
    completedHours: number;
    activeAccounts: number;
    comparison: {
      completedActivitiesPct: number | null;
      completedHoursPct: number | null;
      activeAccountsPct: number | null;
    };
  };
  timeline: Array<{
    key: string;
    label: string;
    completedCount: number;
    plannedCount: number;
    completedHours: number;
    plannedHours: number;
    byNature: Partial<
      Record<CommercialActivityNature, { count: number; hours: number }>
    >;
  }>;
  distribution: Array<{
    nature: CommercialActivityNature;
    count: number;
    hours: number;
    sharePct: number;
  }>;
  outcomes: {
    prospectMeetings: number;
    needsCreated: number;
    proposals: number;
    cvsSent: number;
    clientInterviews: number;
    candidateInterviews: number;
    opportunitiesWon: number;
    clientSignatures: number;
    candidateSignatures: number;
    wonValue: number;
  };
  accounts: Array<{
    companyId: string;
    companyName: string;
    completedActivities: number;
    completedHours: number;
    contactsReached: number;
    outcomesCount: number;
    lastActivityAt: string | null;
  }>;
  quality: {
    scope: "global_period";
    unclassifiedEvents: number;
    eventsWithoutCompany: number;
    interactionsWithoutRelation: number;
    invalidDurationEvents: number;
  };
};
