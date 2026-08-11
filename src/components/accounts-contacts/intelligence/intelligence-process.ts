import type { ClientIntelligenceData } from "@/lib/intelligence/intelligence-data"

// ADR-0012 — Chaîne de décision commerciale.
// Le processus devient : Socle → Connaissance compte → Intelligence sectorielle →
// Cartographie des enjeux → Stratégie commerciale → Roadmap commerciale.
// Le Scoring N'EST PLUS une étape : c'est une capacité transverse (badge header
// + modale, ADR-0011). Cf. docs/adr/ADR-0012-cockpit-intelligence-chaine-decision.md
//
// ADR-0019 Lot 3 — « socle » est l'étape 0 : elle porte la profondeur du compte
// (mapped/noted/qualified/active, cf. domain/depth-level.ts), pas une analyse
// IA. Elle précède « connaissance » dans l'ordre du process.
export type TabKey =
  | "accueil"
  | "socle"
  | "connaissance"
  | "secteur"
  | "enjeux"
  | "strategie"
  | "roadmap"

export type ProcessStepKey = Exclude<TabKey, "accueil">

export const INTELLIGENCE_PROCESS_STEPS: {
  key: ProcessStepKey
  label: string
  shortLabel: string
  description: string
}[] = [
  {
    key: "socle",
    label: "Socle du compte",
    shortLabel: "Socle",
    description: "Vérifier l'identité du compte : SIREN, NAF, taille et rattachement à la taxonomie sectorielle.",
  },
  {
    key: "connaissance",
    label: "Connaissance compte",
    shortLabel: "Compte",
    description: "Réunir ce que l'on sait factuellement du compte : identité, organisation, interlocuteurs, relation et signaux propres.",
  },
  {
    key: "secteur",
    label: "Intelligence sectorielle",
    shortLabel: "Secteur",
    description: "Lire les enjeux, contraintes et fenêtres commerciales du secteur, mutualisés et contextualisés pour ce compte.",
  },
  {
    key: "enjeux",
    label: "Cartographie des enjeux",
    shortLabel: "Enjeux",
    description: "Transformer les constats en enjeux priorisés, sourcés et actionnables par KREDO.",
  },
  {
    key: "strategie",
    label: "Stratégie commerciale",
    shortLabel: "Stratégie",
    description: "Relier enjeux et offres KREDO en angles d'approche, messages clés et pitchs ciblés.",
  },
  {
    key: "roadmap",
    label: "Roadmap commerciale",
    shortLabel: "Roadmap",
    description: "Convertir la stratégie en actions cadencées, validées par le manager puis matérialisées dans l'agenda.",
  },
]

export function getProcessStepStatus(stepKey: ProcessStepKey, data: ClientIntelligenceData): {
  label: string
  tone: "success" | "warning" | "neutral"
} {
  switch (stepKey) {
    case "socle": {
      // ADR-0019 D-1 : le socle est « vérifié » à partir de qualified — c'est
      // sa définition même (SIREN/NAF/taille/taxonomie confirmés par un scan
      // appliqué). `active` a nécessairement franchi ce palier (axe monotone).
      if (data.company.depthLevel === "qualified" || data.company.depthLevel === "active") {
        return { label: "Disponible", tone: "success" }
      }
      if (data.company.depthLevel === "mapped") {
        return { label: "Citation", tone: "neutral" }
      }
      return { label: "À qualifier", tone: "neutral" }
    }
    case "connaissance": {
      // ADR-0012 Lot 2 : `client` (FOLIO) et `accountKnowledge` (moteur) sont
      // deux champs distincts depuis Lot 2 — plus jamais client.source==="engine".
      //
      // Revue Lot 4 : `data.accountKnowledge` est restreint à V1/V2 (aucun
      // lecteur V3 avant le Lot 5). Le tester seul ferait conclure à tort
      // « À compléter » dès qu'un V3 — le contrat le plus riche — est
      // l'artefact courant. `accountKnowledgeV3` doit compter comme
      // « connaissance disponible » au même titre, même si son contenu n'est
      // pas encore rendu.
      const hasEngine = data.accountKnowledge !== null || data.accountKnowledgeV3 !== null
      const hasFolio = data.client?.source === "folio"
      if (hasEngine) {
        return { label: "Disponible", tone: "success" }
      }
      if (hasFolio) {
        return { label: "FOLIO", tone: "warning" }
      }
      return { label: "À compléter", tone: "neutral" }
    }
    case "secteur": {
      // ADR-0012 Lot 3 : sectorSnapshot (déterministe, mutualisé) prime sur le
      // fallback FOLIO/moteur legacy.
      // Lot 0 : depuis la classification 98/98, un snapshot existe pour tout
      // compte — sa seule présence ne prouve donc plus qu'il y a quelque chose
      // à lire. On se fie au contenu réellement résolu (segment + macro).
      if (data.sectorSnapshot?.hasAnyKnowledge) {
        return { label: "Disponible", tone: "success" }
      }
      if (data.sectorSnapshot) {
        return { label: "Secteur à étudier", tone: "neutral" }
      }
      const hasFolio = data.sector?.source === "folio"
      if (hasFolio) {
        return { label: "FOLIO", tone: "warning" }
      }
      return { label: "À venir", tone: "neutral" }
    }
    case "enjeux":
      // ADR-0012 Lot 4 : présence réelle = enjeux ouverts matérialisés,
      // plus le placeholder hasProcessDiagnostic (diagnostic ≠ enjeux, D-2).
      if (data.accountIssues.length > 0) {
        return { label: "Disponible", tone: "success" }
      }
      return { label: "À venir", tone: "neutral" }
    case "strategie":
      // ADR-0012 Lot 5 : présence réelle = mapping enjeu↔offre généré
      // (commercialStrategy), le fallback pitchs/pitches reste valable tant
      // qu'aucun run stratégie n'a encore réussi (workflow pas encore importé).
      if (data.commercialStrategy !== null) {
        return { label: "Disponible", tone: "success" }
      }
      if ((data.pitchDocuments && data.pitchDocuments.length > 0) || (data.pitches && data.pitches.length > 0)) {
        return { label: "Disponible", tone: "success" }
      }
      return { label: "À venir", tone: "neutral" }
    case "roadmap":
      if (data.presence.hasRoadmap) {
        return { label: "Disponible", tone: "success" }
      }
      return { label: "À venir", tone: "neutral" }
  }
}

/**
 * ADR-0019 D-6 — l'action suivante unique. Sur un compte neuf, les six
 * chapitres du cockpit afficheraient tous « À venir » : plutôt qu'un menu
 * plat, une seule étape est mise en avant, dérivée de `getProcessStepStatus`.
 * Les autres restent accessibles (le rail ne bloque jamais un onglet) mais
 * démotées visuellement.
 *
 * Règle : la première étape de la séquence dont le statut est encore
 * "neutral" (rien à afficher — ni moteur ni FOLIO/legacy). Une étape "warning"
 * (FOLIO) compte comme franchie : elle a déjà de quoi travailler, même si un
 * enrichissement moteur reste possible. Si tout est déjà au moins FOLIO/moteur,
 * la roadmap — dernière étape — reste l'action de clôture recommandée.
 */
export function getRecommendedProcessStep(data: ClientIntelligenceData): ProcessStepKey {
  const firstIncomplete = INTELLIGENCE_PROCESS_STEPS.find(
    (step) => getProcessStepStatus(step.key, data).tone === "neutral",
  )
  return firstIncomplete?.key ?? INTELLIGENCE_PROCESS_STEPS[INTELLIGENCE_PROCESS_STEPS.length - 1].key
}
