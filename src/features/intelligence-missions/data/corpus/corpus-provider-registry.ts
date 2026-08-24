import "server-only"

/**
 * Registre des providers de corpus — ADR-0020 §5.1.
 *
 * Miroir de `CONTENT_TYPE_REGISTRY`, à la différence près qui fait tout l'objet du lot :
 * ces providers hydratent du CONTENU, pas des métadonnées d'affichage.
 *
 * Ajouter une origine = une entrée ici, plus une valeur dans `CorpusKind`. `content_collection`
 * et `source_corpus` attendent d'avoir de la matière (5 et 2 lignes) — ADR-0020 §« risque
 * qui n'est pas technique ».
 *
 * ── LES POIDS ────────────────────────────────────────────────────────────────────
 * `weight` n'ordonne rien tant qu'une mission ne compose qu'une origine (le pilote
 * `veille-analyse-mensuelle` est dans ce cas). Il ne tranche que le corpus composé, et
 * l'ordre retenu est : ce qui ancre la mission d'abord, ce qui est le plus volumineux et
 * le plus redondant en dernier.
 *   95 `delivery_period`       — ancre chiffrée de la rentabilité : ne doit jamais tomber par troncature de budget
 *   92 `account_delivery`      — exécution et rentabilité de la delivery du compte (missions, CRA, alertes, CA trimestriel)
 *   90 `account_context`       — identité et signaux du compte : sans eux la mission perd son sujet
 *   88 `staffing_horizon`      — capacité de staffing prospective (consultants, absences, besoins)
 *   85 `prospection_window`    — signaux et opportunités de prospection du portefeuille
 *   70 `intelligence_document` — matière déjà curée par un humain
 *   50 `veille_period`         — flux brut, le plus volumineux et le plus redondant
 */

import type { CorpusKind, CorpusProvider } from "../../domain/mission-contracts"
import { accountContextProvider } from "./account-context-provider"
import { accountDeliveryProvider } from "./account-delivery-provider"
import { deliveryPeriodProvider } from "./delivery-period-provider"
import { intelligenceDocumentProvider } from "./intelligence-document-provider"
import { prospectionWindowProvider } from "./prospection-window-provider"
import { staffingHorizonProvider } from "./staffing-horizon-provider"
import { veillePeriodProvider } from "./veille-period-provider"

export const CORPUS_PROVIDERS: Record<CorpusKind, CorpusProvider> = {
  veille_period: veillePeriodProvider,
  intelligence_document: intelligenceDocumentProvider,
  account_context: accountContextProvider,
  delivery_period: deliveryPeriodProvider,
  prospection_window: prospectionWindowProvider,
  staffing_horizon: staffingHorizonProvider,
  account_delivery: accountDeliveryProvider,
}
