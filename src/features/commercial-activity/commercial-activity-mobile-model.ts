import type {
  CommercialActivityFilterNature,
  CommercialActivityPeriodPreset,
  CommercialActivitySnapshot,
} from "./commercial-activity-types";

export type CommercialActivityMobileTimelinePoint = {
  key: string;
  label: string;
  completed: number;
  planned: number;
  completedHours: number;
  plannedHours: number;
};

export type CommercialActivityMobileKpi = {
  label: string;
  value: number;
  suffix?: string;
  comparison: number | null;
};

export type CommercialActivityMobileResultGroup = {
  title: string;
  items: Array<{ label: string; value: number; suffix?: string }>;
};

function pointLimit(preset: CommercialActivityPeriodPreset) {
  if (preset === "7d") return 7;
  if (preset === "4w") return 4;
  if (preset === "12w") return 12;
  if (preset === "quarter") return 6;
  return 12;
}

function rangeLabel(
  first: CommercialActivitySnapshot["timeline"][number],
  last: CommercialActivitySnapshot["timeline"][number],
) {
  if (first.key === last.key) return first.label;
  return `${first.label} – ${last.label}`;
}

/** Groups only adjacent source buckets, keeping every total visible in the result. */
export function buildCommercialActivityMobileTimeline(
  snapshot: CommercialActivitySnapshot,
  preset: CommercialActivityPeriodPreset,
): CommercialActivityMobileTimelinePoint[] {
  const source = snapshot.timeline;
  const groupCount = Math.min(pointLimit(preset), source.length);
  if (groupCount === 0) return [];

  return Array.from({ length: groupCount }, (_, index) => {
    const start = Math.floor((index * source.length) / groupCount);
    const end = Math.floor(((index + 1) * source.length) / groupCount);
    const slice = source.slice(start, end);
    const first = slice[0]!;
    const last = slice.at(-1)!;
    return {
      key: `${first.key}:${last.key}`,
      label: rangeLabel(first, last),
      completed: slice.reduce(
        (total, point) => total + point.completedCount,
        0,
      ),
      planned: slice.reduce((total, point) => total + point.plannedCount, 0),
      completedHours: slice.reduce(
        (total, point) => total + point.completedHours,
        0,
      ),
      plannedHours: slice.reduce(
        (total, point) => total + point.plannedHours,
        0,
      ),
    };
  });
}

export function buildCommercialActivityMobileKpis(
  snapshot: CommercialActivitySnapshot,
  nature: CommercialActivityFilterNature,
): CommercialActivityMobileKpi[] {
  const dynamic =
    nature === "commercial"
      ? {
          label: "Comptes activés",
          value: snapshot.summary.activeAccounts,
          comparison: snapshot.summary.comparison.activeAccountsPct,
        }
      : nature === "prospection"
        ? {
            label: "Comptes prospectés",
            value: snapshot.summary.activeAccounts,
            comparison: snapshot.summary.comparison.activeAccountsPct,
          }
        : nature === "client_active"
          ? {
              label: "Comptes suivis",
              value: snapshot.summary.activeAccounts,
              comparison: snapshot.summary.comparison.activeAccountsPct,
            }
          : {
              label: "Activités planifiées",
              value: snapshot.summary.plannedActivities,
              comparison: null,
            };
  return [
    {
      label: "Activités réalisées",
      value: snapshot.summary.completedActivities,
      comparison: snapshot.summary.comparison.completedActivitiesPct,
    },
    {
      label: "Heures mobilisées",
      value: snapshot.summary.completedHours,
      suffix: " h",
      comparison: snapshot.summary.comparison.completedHoursPct,
    },
    dynamic,
  ];
}

export function buildCommercialActivityMobileResults(
  snapshot: CommercialActivitySnapshot,
  nature: CommercialActivityFilterNature,
): CommercialActivityMobileResultGroup[] {
  const businessVisible =
    nature === "commercial" ||
    nature === "prospection" ||
    nature === "client_active";
  const recruitmentVisible =
    nature === "commercial" || nature === "recruitment";
  const groups: CommercialActivityMobileResultGroup[] = [];
  if (businessVisible)
    groups.push({
      title: "Prospection et développement",
      items: [
        { label: "RDV prospects", value: snapshot.outcomes.prospectMeetings },
        { label: "Besoins enregistrés", value: snapshot.outcomes.needsCreated },
        {
          label: "Propositions enregistrées",
          value: snapshot.outcomes.proposals,
        },
        {
          label: "Opportunités gagnées",
          value: snapshot.outcomes.opportunitiesWon,
        },
        {
          label: "Signatures commerciales",
          value: snapshot.outcomes.clientSignatures,
        },
        {
          label: "Valeur gagnée",
          value: snapshot.outcomes.wonValue,
          suffix: " €",
        },
      ],
    });
  if (recruitmentVisible)
    groups.push({
      title: "Recrutement",
      items: [
        { label: "CV envoyés", value: snapshot.outcomes.cvsSent },
        {
          label: "Entretiens candidat",
          value: snapshot.outcomes.candidateInterviews,
        },
        {
          label: "Entretiens client liés au recrutement",
          value: snapshot.outcomes.clientInterviews,
        },
        {
          label: "Signatures candidat",
          value: snapshot.outcomes.candidateSignatures,
        },
      ],
    });
  return groups;
}

export function buildCommercialActivityMobileAccounts(
  snapshot: CommercialActivitySnapshot,
) {
  return snapshot.accounts.slice(0, 10);
}
