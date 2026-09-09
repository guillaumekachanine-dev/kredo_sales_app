import { getCategoryForType, type AgendaCategoryId } from "@/lib/agenda/agenda-config"
import type { AgendaEventFormInput, AgendaSelectOpportunity } from "@/lib/agenda/agenda-types"

/**
 * Source de vérité unique du formulaire « Créer / éditer un événement » Agenda.
 *
 * La matrice des 16 `event_type` (cf. AGENDA_EVENT_TYPES) se résout aujourd'hui
 * intégralement par **catégorie** — aucun type ne diverge de sa famille. On
 * factorise donc au niveau catégorie et on garde `TYPE_RULES` comme point
 * d'extension pour un éventuel override futur.
 *
 * Cette règle pilote **quatre** surfaces à la fois :
 *   1. le rendu du bloc « Contexte métier » ;
 *   2. la validation (`requiredFields`) ;
 *   3. le nettoyage du state à chaque changement de nature (`pruneContextValues`) ;
 *   4. la construction du payload (`buildContextPayloadFields`).
 */

export type AgendaContextField =
  | "company"
  | "contact"
  | "opportunity"
  | "candidate"
  | "collaborator"
  | "mission"

export interface AgendaEventContextRule {
  /** Champs de contexte proposés pour ce scénario. */
  fields: AgendaContextField[]
  /** Sous-ensemble de `fields` réellement obligatoire. */
  requiredFields: AgendaContextField[]
}

const EMPTY_RULE: AgendaEventContextRule = { fields: [], requiredFields: [] }

/** Règles par catégorie — reflètent à l'identique le comportement historique. */
const CATEGORY_RULES: Record<AgendaCategoryId, AgendaEventContextRule> = {
  prospection: { fields: ["company", "contact"], requiredFields: [] },
  client_actif: { fields: ["company", "contact"], requiredFields: [] },
  recrutement: { fields: ["opportunity", "candidate"], requiredFields: [] },
  management: { fields: ["mission", "collaborator"], requiredFields: ["collaborator"] },
  interne: { fields: [], requiredFields: [] },
}

/**
 * Overrides spécifiques à un `event_type`. Vide aujourd'hui : toute la taxonomie
 * se résout par catégorie. Ajouter une entrée ici si un type doit diverger.
 */
const TYPE_RULES: Partial<Record<string, AgendaEventContextRule>> = {}

/**
 * Règle de contexte pour un `event_type`.
 * `""` / type inconnu → aucune règle (aucun contexte affiché en création tant
 * qu'aucune nature n'est choisie).
 */
export function getContextRule(eventType: string | null | undefined): AgendaEventContextRule {
  if (!eventType) return EMPTY_RULE
  const typeRule = TYPE_RULES[eventType]
  if (typeRule) return typeRule
  const category = getCategoryForType(eventType)
  return category ? CATEGORY_RULES[category] : EMPTY_RULE
}

export function contextRuleHasField(
  eventType: string | null | undefined,
  field: AgendaContextField,
): boolean {
  return getContextRule(eventType).fields.includes(field)
}

// ── Valeurs de contexte dans le state du formulaire ────────────────────────────

export interface AgendaEventContextValues<C = { id: string | null }> {
  company: C | null
  contact_id: string
  opportunity_id: string
  candidate_id: string
  collaborator_id: string
  mission_id: string
}

type ContextValueKey = keyof AgendaEventContextValues

const FIELD_TO_VALUE_KEYS: Record<AgendaContextField, ContextValueKey[]> = {
  company: ["company"],
  contact: ["contact_id"],
  opportunity: ["opportunity_id"],
  candidate: ["candidate_id"],
  collaborator: ["collaborator_id"],
  mission: ["mission_id"],
}

/**
 * Nettoie les valeurs de contexte devenues inapplicables après un changement de
 * `event_type`.
 *
 * On garde toute valeur dont le champ reste autorisé par la nouvelle nature
 * (ex. deux scénarios commerciaux partagent `company + contact` → aucune perte)
 * et on vide uniquement celles qui ne sont plus applicables
 * (ex. `preparation_candidat` → `rdv_client_suivi` efface candidat + besoin).
 *
 * Le type d'origine n'intervient pas : « conserver ce qui reste pertinent » se
 * réduit exactement à « conserver ce qu'autorise la nouvelle règle ». La
 * référence d'entrée est renvoyée telle quelle si rien ne change.
 */
export function pruneContextValues<C>(
  nextEventType: string | null | undefined,
  values: AgendaEventContextValues<C>,
): AgendaEventContextValues<C> {
  const allowed = new Set<ContextValueKey>()
  for (const field of getContextRule(nextEventType).fields) {
    for (const key of FIELD_TO_VALUE_KEYS[field]) allowed.add(key)
  }

  const next: AgendaEventContextValues<C> = {
    company: allowed.has("company") ? values.company : null,
    contact_id: allowed.has("contact_id") ? values.contact_id : "",
    opportunity_id: allowed.has("opportunity_id") ? values.opportunity_id : "",
    candidate_id: allowed.has("candidate_id") ? values.candidate_id : "",
    collaborator_id: allowed.has("collaborator_id") ? values.collaborator_id : "",
    mission_id: allowed.has("mission_id") ? values.mission_id : "",
  }

  const unchanged =
    next.company === values.company &&
    next.contact_id === values.contact_id &&
    next.opportunity_id === values.opportunity_id &&
    next.candidate_id === values.candidate_id &&
    next.collaborator_id === values.collaborator_id &&
    next.mission_id === values.mission_id

  return unchanged ? values : next
}

// ── Payload ───────────────────────────────────────────────────────────────────

type AgendaContextPayloadFields = Pick<
  AgendaEventFormInput,
  "company_id" | "contact_id" | "opportunity_id" | "candidate_id" | "collaborator_id" | "mission_id"
>

export interface AgendaContextPayloadValues {
  company_id: string | null
  contact_id: string
  opportunity_id: string
  candidate_id: string
  collaborator_id: string
  mission_id: string
}

/**
 * Construit les six clés de contexte du payload à partir de la seule matrice —
 * jamais de ce qui est visible dans le JSX. Tout champ hors scénario est forcé à
 * `null`.
 *
 * En recrutement, `company_id` n'est pas un champ mais reste dérivé de
 * l'opportunité sélectionnée (comportement historique).
 */
export function buildContextPayloadFields(
  eventType: string,
  values: AgendaContextPayloadValues,
  opportunities: Pick<AgendaSelectOpportunity, "id" | "company_id">[],
): AgendaContextPayloadFields {
  const rule = getContextRule(eventType)
  const has = (field: AgendaContextField) => rule.fields.includes(field)

  const opportunityId = has("opportunity") ? values.opportunity_id || null : null

  let companyId: string | null = null
  if (has("company")) {
    companyId = values.company_id || null
  } else if (opportunityId) {
    companyId = opportunities.find((o) => o.id === opportunityId)?.company_id ?? null
  }

  return {
    company_id: companyId,
    contact_id: has("contact") ? values.contact_id || null : null,
    opportunity_id: opportunityId,
    candidate_id: has("candidate") ? values.candidate_id || null : null,
    collaborator_id: has("collaborator") ? values.collaborator_id || null : null,
    mission_id: has("mission") ? values.mission_id || null : null,
  }
}

// ── Validation ────────────────────────────────────────────────────────────────

export interface AgendaEventFormValues extends AgendaEventContextValues {
  title: string
  event_type: string
  date: string
  start_time: string
  end_time: string
  create_task: boolean
  task_title: string
  task_date: string
  task_time: string
}

/** Erreurs contextuelles obligatoires pour le scénario actif. */
export function collectContextErrors(
  eventType: string,
  values: Pick<AgendaEventContextValues, "collaborator_id" | "mission_id" | "contact_id" | "candidate_id" | "opportunity_id">,
): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const field of getContextRule(eventType).requiredFields) {
    if (field === "collaborator" && !values.collaborator_id) {
      errors.collaborator_id = "Le collaborateur est obligatoire."
    }
  }
  return errors
}

/**
 * Validation unique du formulaire — remplace `validateStep1` + `validateStep2`.
 * Conserve toutes les règles historiques ; les contraintes contextuelles
 * dépendent du scénario actif via `collectContextErrors`.
 */
export function validateAgendaEventForm(form: AgendaEventFormValues): Record<string, string> {
  const errors: Record<string, string> = {}

  if (!form.title.trim()) errors.title = "L'objet de l'événement est obligatoire."
  if (!form.event_type) errors.event_type = "La nature est obligatoire."
  if (!form.date) errors.date = "La date est obligatoire."
  if (!form.start_time) errors.start_time = "L'heure de début est obligatoire."
  if (!form.end_time) errors.end_time = "L'heure de fin est obligatoire."

  if (form.date && form.start_time && form.end_time) {
    const start = new Date(`${form.date}T${form.start_time}`)
    const end = new Date(`${form.date}T${form.end_time}`)
    if (end <= start) errors.end_time = "L'heure de fin doit être postérieure au début."
  }

  Object.assign(errors, collectContextErrors(form.event_type, form))

  if (form.create_task) {
    if (!form.task_title.trim()) errors.task_title = "L'intitulé est obligatoire."
    if (!form.task_date) errors.task_date = "La date est obligatoire."
    if (form.date && form.start_time && form.task_date) {
      const eventStart = new Date(`${form.date}T${form.start_time}`)
      const taskDue = new Date(`${form.task_date}T${form.task_time || "08:30"}`)
      if (taskDue >= eventStart) {
        errors.task_date = "La tâche doit expirer avant le début de l'événement."
      }
    }
  }

  return errors
}
