import type { AccountScoreContext, AccountScoreSignal, RawScoreComponent } from "../types"

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

// C3 — Signaux d'achat. Le signal le plus fort domine (un signal réglementaire
// urgent ne doit pas être dilué par du bruit d'actualité) plutôt qu'une moyenne
// de tous les signaux.
//
// Piège identifié en testant la RPC sur données réelles (ADR-0011 Lot 1) : le
// backfill FOLIO peuple massivement account_signals (79/93 comptes) mais SANS
// relevance_score/urgency_score quantifiés (les deux valent 0 par construction
// — seul confidence_score=0.5 existe). Traiter ces signaux comme
// "urgence nulle" donnerait un score de 0 à la quasi-totalité du parc alors
// qu'un contexte qualitatif réel existe (croissance, recrutements...). On
// distingue donc les signaux "quantifiés" (sector_news/regulatory, avec un
// vrai relevance/urgency) des signaux "qualitatifs seuls" (FOLIO), avec un
// plancher de score pour ces derniers plutôt qu'un zéro trompeur.
export function computeSignauxAchat(ctx: AccountScoreContext): RawScoreComponent {
  const { signals } = ctx

  if (signals.length === 0) {
    return {
      componentKey: "C3_signals",
      componentLabel: "Signaux d'achat",
      rawValueJson: { signalCount: 0 },
      normalizedScore: 0,
      confidence: 20,
      freshnessStatus: "missing",
      explanation: "Aucun signal actif détecté (actualité, réglementation, veille sectorielle).",
      evidenceRefs: [],
    }
  }

  const quantified = signals.filter((s) => s.relevanceScore > 0 || s.urgencyScore > 0)

  if (quantified.length > 0) {
    const best = quantified.reduce((max, s) => (signalStrength(s) > signalStrength(max) ? s : max))
    const normalizedScore = Math.round(signalStrength(best) * 100)
    const confidence = Math.round(average(quantified.map((s) => s.confidenceScore)) * 100)

    return {
      componentKey: "C3_signals",
      componentLabel: "Signaux d'achat",
      rawValueJson: { signalCount: signals.length, quantifiedCount: quantified.length, topSignalId: best.id },
      normalizedScore,
      confidence,
      freshnessStatus: "fresh",
      explanation: `${quantified.length} signal(aux) quantifié(s), le plus fort : "${best.title}" (${best.category}).`,
      evidenceRefs: [{ table: "account_signals", id: best.id }],
    }
  }

  // Uniquement des signaux qualitatifs (FOLIO) : présence de contexte, pas d'urgence quantifiée.
  const confidence = Math.round(average(signals.map((s) => s.confidenceScore)) * 100)

  return {
    componentKey: "C3_signals",
    componentLabel: "Signaux d'achat",
    rawValueJson: { signalCount: signals.length, quantifiedCount: 0 },
    normalizedScore: 30,
    confidence,
    freshnessStatus: "aging",
    explanation: `${signals.length} élément(s) de contexte qualitatif (import FOLIO), aucun signal d'urgence quantifié.`,
    evidenceRefs: signals.slice(0, 3).map((s) => ({ table: "account_signals", id: s.id })),
  }
}

function signalStrength(s: AccountScoreSignal): number {
  return (s.relevanceScore + s.urgencyScore) / 2
}
