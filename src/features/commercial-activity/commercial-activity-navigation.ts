import type { CommercialActivityMobileSection } from "./commercial-activity-types";

export const COMMERCIAL_ACTIVITY_MOBILE_SECTIONS: Array<{
  id: CommercialActivityMobileSection;
  title: string;
}> = [
  { id: "summary", title: "Synthèse" },
  { id: "results", title: "Résultats" },
  { id: "accounts", title: "Comptes" },
];
