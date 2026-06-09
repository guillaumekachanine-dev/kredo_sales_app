"use server"

import { createClient } from "@/lib/supabase/server"
import type { Opportunity, OpportunitySkill, Contact, OpportunityEvent } from "@/types/database"

export type OpportunityDetailResult =
  | {
      data: {
        opportunity: Opportunity
        account: {
          id: string
          name: string
          sector: string | null
        } | null
        skills: OpportunitySkill[]
        contacts: Array<{
          contact: Contact
          role: string | null
        }>
        events: OpportunityEvent[]
      }
      error?: never
    }
  | {
      data?: never
      error: string
    }

export async function getOpportunityDetail(opportunityId: string): Promise<OpportunityDetailResult> {
  if (!opportunityId || opportunityId.trim() === "") {
    return { error: "L'identifiant de l'opportunité est manquant." }
  }

  try {
    const supabase = await createClient()

    // 1. Récupération de l'opportunité
    const { data: opportunity, error: oppError } = await supabase
      .from("sales_opportunities")
      .select("*")
      .eq("id", opportunityId)
      .maybeSingle()

    if (oppError) {
      console.error("Erreur lors de la récupération de l'opportunité:", oppError)
      return { error: `Erreur base de données : ${oppError.message}` }
    }

    if (!opportunity) {
      return { error: "Opportunité introuvable." }
    }

    // 2. Récupération du compte lié (si renseigné)
    let account: { id: string; name: string; sector: string | null } | null = null
    if (opportunity.account_id) {
      const { data: accountData, error: accountError } = await supabase
        .from("crm_accounts")
        .select("id, name, sector")
        .eq("id", opportunity.account_id)
        .maybeSingle()

      if (accountError) {
        console.error("Erreur lors de la récupération du compte CRM:", accountError)
      } else if (accountData) {
        account = accountData
      }
    }

    // 3. Récupération des compétences liées (trier par created_at asc)
    const { data: skillsData, error: skillsError } = await supabase
      .from("sales_opportunity_skills")
      .select("*")
      .eq("opportunity_id", opportunityId)
      .order("created_at", { ascending: true })

    if (skillsError) {
      console.error("Erreur lors de la récupération des compétences:", skillsError)
    }
    const skills = skillsData || []

    // 4. Récupération des contacts liés via la table de liaison
    const { data: linkContacts, error: linkError } = await supabase
      .from("sales_opportunity_contacts")
      .select("contact_id, role")
      .eq("opportunity_id", opportunityId)

    if (linkError) {
      console.error("Erreur lors de la récupération de la liaison contacts:", linkError)
    }

    let contacts: Array<{ contact: Contact; role: string | null }> = []
    const contactIds = linkContacts?.map((lc) => lc.contact_id) || []

    if (contactIds.length > 0) {
      const { data: contactsData, error: contactsError } = await supabase
        .from("crm_contacts")
        .select("*")
        .in("id", contactIds)

      if (contactsError) {
        console.error("Erreur lors de la récupération des contacts CRM:", contactsError)
      } else if (contactsData && linkContacts) {
        const tempContacts: Array<{ contact: Contact; role: string | null }> = []
        for (const lc of linkContacts) {
          const contactObj = contactsData.find((c) => c.id === lc.contact_id)
          if (contactObj) {
            tempContacts.push({
              contact: contactObj,
              role: lc.role,
            })
          }
        }
        contacts = tempContacts
      }
    }

    // 5. Récupération des événements (trier par occurred_at desc)
    const { data: eventsData, error: eventsError } = await supabase
      .from("sales_opportunity_events")
      .select("*")
      .eq("opportunity_id", opportunityId)
      .order("occurred_at", { ascending: false })

    if (eventsError) {
      console.error("Erreur lors de la récupération des événements:", eventsError)
    }
    const events = eventsData || []

    return {
      data: {
        opportunity,
        account,
        skills,
        contacts,
        events,
      },
    }
  } catch (err) {
    console.error("Erreur non gérée dans getOpportunityDetail:", err)
    return { error: "Une erreur inattendue est survenue." }
  }
}
