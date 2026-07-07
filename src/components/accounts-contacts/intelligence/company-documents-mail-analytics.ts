import type { CommunicationObjective } from "@/lib/n8n/types"

export type SupportedMailAnalyticsAccountKey = "ROBERTET" | "ARKOPHARMA" | "VOYAGE_PRIVE"

export type MailAnalyticsGrain = "weekly" | "monthly"

export interface MailAnalyticsVolumePoint {
  label: string
  shortLabel: string
  generatedCount: number
  tokenCount: number | null
}

export interface MailAnalyticsObjectivePoint {
  objective: CommunicationObjective
  count: number
  colorVar: string
}

export interface MailAnalyticsTopContact {
  label: string
  role: string
  practice: string
  mailsSent: number
}

export interface MailAnalyticsSnapshot {
  accountKey: SupportedMailAnalyticsAccountKey
  accountLabel: string
  source: "mock"
  weekly: MailAnalyticsVolumePoint[]
  monthly: MailAnalyticsVolumePoint[]
  objectives: MailAnalyticsObjectivePoint[]
  topContacts: MailAnalyticsTopContact[]
  futureMetrics: {
    tokenOverlayPlanned: boolean
    tokenDataAvailable: boolean
  }
}

const SUPPORTED_ACCOUNT_LABELS = ["ROBERTET", "ARKOPHARMA", "VOYAGE PRIVE"] as const

function normalizeAccountName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
}

function createSnapshot(snapshot: Omit<MailAnalyticsSnapshot, "source" | "futureMetrics">): MailAnalyticsSnapshot {
  return {
    ...snapshot,
    source: "mock",
    futureMetrics: {
      tokenOverlayPlanned: true,
      tokenDataAvailable: false,
    },
  }
}

const MOCK_MAIL_ANALYTICS: Record<SupportedMailAnalyticsAccountKey, MailAnalyticsSnapshot> = {
  ROBERTET: createSnapshot({
    accountKey: "ROBERTET",
    accountLabel: "ROBERTET",
    weekly: [
      { label: "S16", shortLabel: "S16", generatedCount: 3, tokenCount: null },
      { label: "S17", shortLabel: "S17", generatedCount: 4, tokenCount: null },
      { label: "S18", shortLabel: "S18", generatedCount: 5, tokenCount: null },
      { label: "S19", shortLabel: "S19", generatedCount: 4, tokenCount: null },
      { label: "S20", shortLabel: "S20", generatedCount: 6, tokenCount: null },
      { label: "S21", shortLabel: "S21", generatedCount: 7, tokenCount: null },
      { label: "S22", shortLabel: "S22", generatedCount: 6, tokenCount: null },
      { label: "S23", shortLabel: "S23", generatedCount: 8, tokenCount: null },
      { label: "S24", shortLabel: "S24", generatedCount: 9, tokenCount: null },
      { label: "S25", shortLabel: "S25", generatedCount: 7, tokenCount: null },
      { label: "S26", shortLabel: "S26", generatedCount: 10, tokenCount: null },
      { label: "S27", shortLabel: "S27", generatedCount: 8, tokenCount: null },
    ],
    monthly: [
      { label: "Janvier", shortLabel: "Jan", generatedCount: 12, tokenCount: null },
      { label: "Fevrier", shortLabel: "Fev", generatedCount: 15, tokenCount: null },
      { label: "Mars", shortLabel: "Mar", generatedCount: 19, tokenCount: null },
      { label: "Avril", shortLabel: "Avr", generatedCount: 22, tokenCount: null },
      { label: "Mai", shortLabel: "Mai", generatedCount: 27, tokenCount: null },
      { label: "Juin", shortLabel: "Juin", generatedCount: 31, tokenCount: null },
    ],
    objectives: [
      { objective: "get_meeting", count: 22, colorVar: "var(--color-brand-brass)" },
      { objective: "present_offer", count: 19, colorVar: "var(--color-dataviz-3)" },
      { objective: "submit_profile", count: 14, colorVar: "var(--color-dataviz-4)" },
      { objective: "confirm_next_steps", count: 9, colorVar: "var(--color-dataviz-5)" },
      { objective: "reactivate", count: 6, colorVar: "var(--color-dataviz-7)" },
    ],
    topContacts: [
      {
        label: "Direction Innovation Parfums",
        role: "Directrice innovation",
        practice: "Data & IA",
        mailsSent: 19,
      },
      {
        label: "DSI Groupe",
        role: "Directeur des systemes d'information",
        practice: "Digital & Cloud",
        mailsSent: 15,
      },
      {
        label: "Direction Supply Chain",
        role: "Responsable transformation supply",
        practice: "Agile PM",
        mailsSent: 11,
      },
    ],
  }),
  ARKOPHARMA: createSnapshot({
    accountKey: "ARKOPHARMA",
    accountLabel: "ARKOPHARMA",
    weekly: [
      { label: "S16", shortLabel: "S16", generatedCount: 2, tokenCount: null },
      { label: "S17", shortLabel: "S17", generatedCount: 3, tokenCount: null },
      { label: "S18", shortLabel: "S18", generatedCount: 3, tokenCount: null },
      { label: "S19", shortLabel: "S19", generatedCount: 4, tokenCount: null },
      { label: "S20", shortLabel: "S20", generatedCount: 5, tokenCount: null },
      { label: "S21", shortLabel: "S21", generatedCount: 4, tokenCount: null },
      { label: "S22", shortLabel: "S22", generatedCount: 6, tokenCount: null },
      { label: "S23", shortLabel: "S23", generatedCount: 7, tokenCount: null },
      { label: "S24", shortLabel: "S24", generatedCount: 6, tokenCount: null },
      { label: "S25", shortLabel: "S25", generatedCount: 5, tokenCount: null },
      { label: "S26", shortLabel: "S26", generatedCount: 8, tokenCount: null },
      { label: "S27", shortLabel: "S27", generatedCount: 7, tokenCount: null },
    ],
    monthly: [
      { label: "Janvier", shortLabel: "Jan", generatedCount: 8, tokenCount: null },
      { label: "Fevrier", shortLabel: "Fev", generatedCount: 11, tokenCount: null },
      { label: "Mars", shortLabel: "Mar", generatedCount: 13, tokenCount: null },
      { label: "Avril", shortLabel: "Avr", generatedCount: 16, tokenCount: null },
      { label: "Mai", shortLabel: "Mai", generatedCount: 18, tokenCount: null },
      { label: "Juin", shortLabel: "Juin", generatedCount: 23, tokenCount: null },
    ],
    objectives: [
      { objective: "present_offer", count: 18, colorVar: "var(--color-brand-brass)" },
      { objective: "get_meeting", count: 15, colorVar: "var(--color-dataviz-3)" },
      { objective: "accelerate_decision", count: 11, colorVar: "var(--color-dataviz-4)" },
      { objective: "confirm_next_steps", count: 8, colorVar: "var(--color-dataviz-5)" },
      { objective: "secure_payment", count: 5, colorVar: "var(--color-dataviz-7)" },
    ],
    topContacts: [
      {
        label: "Direction E-commerce",
        role: "Directrice e-commerce",
        practice: "Digital & Cloud",
        mailsSent: 14,
      },
      {
        label: "Direction Industrielle",
        role: "Responsable excellence operationnelle",
        practice: "Agile PM",
        mailsSent: 10,
      },
      {
        label: "Achats Indirects",
        role: "Responsable achats transformation",
        practice: "Cyber & SecOps",
        mailsSent: 8,
      },
    ],
  }),
  VOYAGE_PRIVE: createSnapshot({
    accountKey: "VOYAGE_PRIVE",
    accountLabel: "VOYAGE PRIVE",
    weekly: [
      { label: "S16", shortLabel: "S16", generatedCount: 5, tokenCount: null },
      { label: "S17", shortLabel: "S17", generatedCount: 6, tokenCount: null },
      { label: "S18", shortLabel: "S18", generatedCount: 7, tokenCount: null },
      { label: "S19", shortLabel: "S19", generatedCount: 8, tokenCount: null },
      { label: "S20", shortLabel: "S20", generatedCount: 9, tokenCount: null },
      { label: "S21", shortLabel: "S21", generatedCount: 8, tokenCount: null },
      { label: "S22", shortLabel: "S22", generatedCount: 10, tokenCount: null },
      { label: "S23", shortLabel: "S23", generatedCount: 11, tokenCount: null },
      { label: "S24", shortLabel: "S24", generatedCount: 12, tokenCount: null },
      { label: "S25", shortLabel: "S25", generatedCount: 10, tokenCount: null },
      { label: "S26", shortLabel: "S26", generatedCount: 13, tokenCount: null },
      { label: "S27", shortLabel: "S27", generatedCount: 12, tokenCount: null },
    ],
    monthly: [
      { label: "Janvier", shortLabel: "Jan", generatedCount: 18, tokenCount: null },
      { label: "Fevrier", shortLabel: "Fev", generatedCount: 22, tokenCount: null },
      { label: "Mars", shortLabel: "Mar", generatedCount: 26, tokenCount: null },
      { label: "Avril", shortLabel: "Avr", generatedCount: 29, tokenCount: null },
      { label: "Mai", shortLabel: "Mai", generatedCount: 34, tokenCount: null },
      { label: "Juin", shortLabel: "Juin", generatedCount: 39, tokenCount: null },
    ],
    objectives: [
      { objective: "get_meeting", count: 24, colorVar: "var(--color-brand-brass)" },
      { objective: "present_offer", count: 21, colorVar: "var(--color-dataviz-3)" },
      { objective: "reactivate", count: 15, colorVar: "var(--color-dataviz-4)" },
      { objective: "confirm_next_steps", count: 12, colorVar: "var(--color-dataviz-5)" },
      { objective: "get_feedback", count: 9, colorVar: "var(--color-dataviz-7)" },
    ],
    topContacts: [
      {
        label: "Direction CRM & Fidelite",
        role: "Directrice CRM",
        practice: "Data & IA",
        mailsSent: 21,
      },
      {
        label: "Direction Produit Sejour",
        role: "Head of product",
        practice: "Digital & Cloud",
        mailsSent: 16,
      },
      {
        label: "Direction Data Marketing",
        role: "Responsable data marketing",
        practice: "Agile PM",
        mailsSent: 13,
      },
    ],
  }),
}

export function getSupportedMailAnalyticsAccountLabels(): readonly string[] {
  return SUPPORTED_ACCOUNT_LABELS
}

export function getMailAnalyticsSnapshot(companyName: string): MailAnalyticsSnapshot | null {
  const normalized = normalizeAccountName(companyName)

  if (normalized.includes("ROBERTET")) return MOCK_MAIL_ANALYTICS.ROBERTET
  if (normalized.includes("ARKOPHARMA")) return MOCK_MAIL_ANALYTICS.ARKOPHARMA
  if (normalized.includes("VOYAGEPRIVE")) return MOCK_MAIL_ANALYTICS.VOYAGE_PRIVE

  return null
}
