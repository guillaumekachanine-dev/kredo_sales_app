// ─── Dynamic Playbooks · Lot 3 — contrat `BattleSituation` ──────────────────
//
// Contrat figé par l'audit du Lot 0 (§5.2 de `HANDOFF-LOT-0-AUDIT-CONTRAT.md`).
// Ce module est VOLONTAIREMENT sans aucun import ni aucune valeur exportée :
// uniquement des types. C'est ce qui permet à A3, au Lot 4, d'ajouter
//
//     battleSituation?: BattleSituation
//
// à `CommunicationBrief["context"]` (`src/lib/n8n/types.ts`) par un simple
// `import type`, sans créer de dépendance runtime de `src/lib/**` vers
// `src/features/**`. Précédent identique dans ce fichier : `n8n/types.ts`
// importe déjà `AccountClassificationProposal` et `CorpusBudget` de la même
// façon.
//
// Règle non négociable : ce bloc ne duplique AUCUN champ déjà canonique du
// brief — ni `companyId` (porté par `entityId` / `run.company_id`), ni
// `contactId`, ni `offerRef`, ni `preferredCollectionIds`, ni
// `tone`/`length`/`language`/`formality`.

/**
 * D'où vient l'élément choisi.
 *
 * - `account` : fait observé sur le compte (`account_issues`, `angle_entree`,
 *   `trigger_events` de `profile_json`). L'UI l'étiquette `COMPTE`.
 * - `sector`  : connaissance sectorielle — une hypothèse applicable au segment,
 *   **jamais** un fait établi sur ce compte. L'UI l'étiquette `SECTEUR`.
 *
 * Exigence R2 du cadrage : un enjeu sectoriel ne doit jamais être présenté
 * comme un fait spécifique au compte, ni dans l'UI, ni dans le prompt.
 */
export type BattleSituationSource = "account" | "sector"

/**
 * Un choix de situation.
 *
 * `id` n'est présent QUE lorsque la source porte un identifiant stable en base
 * (`account_issues.id`, `sector_pain_points.id`, `sector_regulatory_items.id`,
 * `sector_events.id`). Les éléments issus du playbook JSON ou de `profile_json`
 * n'en ont aucun : ce sont des éléments de tableau, pas des lignes. Ne jamais
 * fabriquer d'identifiant synthétique pour combler ce trou.
 *
 * `label` est un **snapshot texte** : il doit survivre à la mutation ou à la
 * suppression de la ligne source.
 */
export type BattleSituationChoice = {
  id?: string
  label: string
  source: BattleSituationSource
}

export type BattleSituation = {
  /** `competitive_map_entries.id` — identifie la Battle Card et son snapshot. */
  competitiveEntryId: string
  /** `sector_intelligence.id` (niveau segment) — maille réelle du playbook affiché. */
  segmentId: string
  /** Obligatoire. */
  issue: BattleSituationChoice
  /** Obligatoire. */
  angle: BattleSituationChoice
  /** Facultatif — trigger compte, échéance réglementaire ou événement sectoriel. */
  timing?: BattleSituationChoice
  /**
   * Facultatif — objection du playbook et sa réponse préparée par KREDO.
   * Jamais d'`id` (élément de tableau JSON). À ne pas confondre avec les lignes
   * rouges (`profile_json.a_ne_pas_dire`), qui ne sont PAS des objections.
   */
  objection?: {
    label: string
    response?: string
  }
  /**
   * Facultatif — argument ROI du playbook, **texte seul**. Jamais un chiffre
   * fabriqué, recalculé ou extrapolé (cadrage §8.1).
   */
  roiArgument?: string
  /**
   * Facultatif — libellé de persona du playbook. Renseigné UNIQUEMENT quand
   * `who.recipient.contactId` est absent, c'est-à-dire quand le compte n'a
   * aucun contact CRM — cas majoritaire mesuré au Lot 0 (15 comptes sur 23).
   *
   * Ne JAMAIS écrire un rôle générique dans `who.recipient.displayName` : ce
   * champ désigne une personne réelle et le nœud `Quality Check` de n8n s'en
   * sert pour vérifier la présence du nom de famille dans un message écrit.
   */
  personaLabel?: string
}
