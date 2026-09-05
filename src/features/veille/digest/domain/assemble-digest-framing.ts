/**
 * Assemblage du cadrage éditorial d'un digest — ADR-0022 §3.1 et §3.4.
 *
 * Module PUR. Miroir de `assemble-mission-prompt.ts` (ADR-0020) : le serveur
 * assemble le texte, n8n le reçoit déjà prêt et ne l'interprète pas.
 *
 * ── INVARIANT DE NON-RÉGRESSION ──────────────────────────────────────────────
 * Pour `topicKey = 'global'`, la sortie est BYTE-IDENTIQUE au `blocContexteKredo`
 * construit aujourd'hui par le nœud « Build Contexte KREDO » du workflow
 * `veille-hebdomadaire-kredo`. C'est ce qui garantit que le passage au payload v2
 * ne modifie pas le digest hebdomadaire existant. Un test l'asserte caractère par
 * caractère — les retours à la ligne à l'intérieur des paragraphes en font partie,
 * ne pas les « reformater ».
 *
 * C'est aussi pourquoi la section « Sujet du digest » n'est PAS émise pour
 * `global` : l'ajouter romprait l'identité. Elle l'est pour tous les autres sujets.
 */

import type { DigestPreset } from "./digest-presets"
import { GLOBAL_DIGEST_TOPIC_KEY } from "./digest-presets"

/** Jeton substitué dans les listes du registre par la liste réelle des secteurs couverts. */
export const ACTIVE_SECTORS_TOKEN = "{{secteursActifs}}"

/** Ce que le workflow met quand aucun secteur n'est couvert. Repris à l'identique. */
export const NO_ACTIVE_SECTORS_LABEL = "transverse"

export type DigestFramingContext = {
  /** Noms des secteurs couverts par KREDO. Vide ⇒ « transverse », comme dans n8n. */
  activeSectors: readonly string[]
  /**
   * Libellé du segment visé, pour un sujet sectoriel. Ignoré pour les sujets du
   * registre — le sujet porte déjà son propre cadrage.
   */
  segmentLabel?: string | null
}

function formatActiveSectors(activeSectors: readonly string[]): string {
  const cleaned = activeSectors.map((name) => name.trim()).filter((name) => name.length > 0)
  return cleaned.length > 0 ? cleaned.join(", ") : NO_ACTIVE_SECTORS_LABEL
}

function bullets(lines: readonly string[], activeSectors: string): string {
  return lines.map((line) => `- ${line.split(ACTIVE_SECTORS_TOKEN).join(activeSectors)}`).join("\n")
}

export function assembleDigestFraming(
  preset: DigestPreset,
  context: DigestFramingContext,
): string {
  const secteursActifs = formatActiveSectors(context.activeSectors)

  const subjectSection =
    preset.key === GLOBAL_DIGEST_TOPIC_KEY
      ? ""
      : `\n\n## Sujet de ce digest\n${preset.label}${
          context.segmentLabel ? ` — ${context.segmentLabel}` : ""
        }.\n${preset.intent}`

  return `# CONTEXTE — Veille commerciale KREDO

Tu opères au sein de KREDO, une plateforme de CRM et d'intelligence commerciale
destinée aux fonctions commerciales d'une ESN (Entreprise de Services du Numérique).

## Ton lecteur
Un commercial / avant-vente d'ESN, profil "pont commerce-technique" : il n'est pas
ingénieur, mais il doit paraître crédible et pertinent face à un DSI ou un décideur
métier. Il vend des prestations intellectuelles (conseil, intégration, IA, data).
Il n'a PAS besoin d'actualité pour dirigeants d'ESN (M&A, book-to-bill, salaires).
Il a besoin de MUNITIONS COMMERCIALES.

## Ses cibles (ICP)
DSI et décideurs métiers d'ETI et de grands comptes, sur les secteurs actuellement
couverts par KREDO : ${secteursActifs}.

## La question à laquelle toute ton analyse doit répondre
"En quoi cette information donne-t-elle à un commercial d'ESN une RAISON D'AGIR :
un angle d'ouverture, un déclencheur de prise de contact, un argument de crédibilité,
ou une preuve de ROI qu'il peut réutiliser dans un pitch ?"${subjectSection}

## Est PERTINENT
${bullets(preset.relevant, secteursActifs)}

## N'est PAS pertinent (à écarter ou noter faible)
${bullets(preset.irrelevant, secteursActifs)}

## Posture éditoriale
Reste factuel et neutre. Ne prends pas parti dans les rivalités entre acteurs
(fournisseurs, éditeurs, modèles). Une veille commerciale crédible informe, elle ne
milite pas. N'invente aucun chiffre ni citation : si une information n'est pas dans
le contenu fourni, ne l'ajoute pas.`
}
