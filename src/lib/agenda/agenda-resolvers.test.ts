import { describe, expect, it } from "vitest"
import { buildAgendaQuery } from "./aggregate-agenda-snapshot"
import { resolveAbsencesSource } from "./absences-resolver"
import { resolveCalendarEventsSource } from "./calendar-events-resolver"
import { resolveClientClosuresSource } from "./client-closures-resolver"
import { resolveMissionBoundariesSource } from "./missions-resolver"
import { resolveOpportunityDeadlinesSource } from "./opportunities-resolver"
import { resolveRecruitmentMilestonesSource } from "./recruitment-resolver"
import { resolveTasksSource } from "./tasks-resolver"

const baseQuery = buildAgendaQuery({
  workspaceId: "ws-1",
  from: "2026-03-23T00:00:00.000Z",
  to: "2026-03-30T00:00:00.000Z",
  now: "2026-03-24T10:00:00.000Z",
})

describe("agenda resolvers", () => {
  it("maps the seven sources into canonical AgendaItems", async () => {
    const calendar = await resolveCalendarEventsSource(baseQuery, {
      loadRows: async () => [
        {
          id: "evt-1",
          workspace_id: "ws-1",
          title: "Comité client",
          event_type: "rdv_client_suivi",
          status: "scheduled",
          starts_at: "2026-03-24T09:00:00.000Z",
          ends_at: "2026-03-24T10:00:00.000Z",
          all_day: false,
          description: null,
          location: "Paris",
          meeting_url: null,
          metadata: { priority: "high", collaborator_id: "col-1" },
          organizer_id: "owner-1",
          company_id: "comp-1",
          contact_id: null,
          opportunity_id: "opp-1",
          candidate_id: null,
          mission_id: "mission-1",
          opportunity_candidate_id: null,
          company: { id: "comp-1", name: "Acme" },
          contact: null,
          opportunity: { id: "opp-1", title: "Mission Data" },
          candidate: null,
          organizer: { id: "owner-1", full_name: "Alice" },
          mission: { id: "mission-1", title: "Mission Data", collaborator_id: "col-1" },
        },
      ],
    })

    const tasks = await resolveTasksSource(baseQuery, {
      loadRows: async () => [
        {
          id: "task-1",
          workspace_id: "ws-1",
          title: "Préparer le comité",
          description: null,
          due_date: "2026-03-24",
          priority: "urgent",
          status: "open",
          completed_at: null,
          assignee_id: "owner-1",
          entity_type: "opportunity",
          entity_id: "opp-1",
          linked_entity_type: null,
          linked_entity_id: null,
          calendar_event_id: "evt-1",
          calendar_event: {
            id: "evt-1",
            title: "Comité client",
            company_id: "comp-1",
            opportunity_id: "opp-1",
            candidate_id: null,
            organizer_id: "owner-1",
            company: { id: "comp-1", name: "Acme" },
          },
        },
      ],
    })

    const missions = await resolveMissionBoundariesSource(baseQuery, {
      loadRows: async () => [
        {
          id: "mission-1",
          workspace_id: "ws-1",
          title: "Mission Data",
          status: "active",
          start_date: "2026-03-24",
          end_date: "2026-03-28",
          company_id: "comp-1",
          opportunity_id: "opp-1",
          collaborator_id: "col-1",
          practice: "data",
          company: { id: "comp-1", name: "Acme" },
          opportunity: { id: "opp-1", title: "Mission Data" },
          collaborator: {
            id: "col-1",
            current_title: "Consultant",
            person: { id: "person-1", full_name: "Jean Martin" },
          },
        },
      ],
    })

    const opportunities = await resolveOpportunityDeadlinesSource(baseQuery, {
      loadRows: async () => [
        {
          id: "opp-1",
          workspace_id: "ws-1",
          title: "Mission Data",
          stage: "qualification",
          priority: "high",
          next_action_at: "2026-03-24T12:00:00.000Z",
          next_action_label: "Relancer le client",
          target_close_date: "2026-03-27",
          company_id: "comp-1",
          owner_id: "owner-2",
          company: { id: "comp-1", name: "Acme" },
        },
      ],
    })

    const recruitment = await resolveRecruitmentMilestonesSource(baseQuery, {
      loadRows: async () => [
        {
          id: "hm-1",
          workspace_id: "ws-1",
          step: "entretien_manager",
          result: "en_attente",
          scheduled_at: "2026-03-25T09:00:00.000Z",
          completed_at: null,
          calendar_event_id: null,
          notes: "Préparer le cas",
          process: {
            id: "hp-1",
            status: "active",
            current_step: "entretien_manager",
            recruiter_id: "owner-3",
            candidate_id: "cand-1",
            candidate: { id: "cand-1", person: { id: "person-2", full_name: "Nina Roy" } },
            opportunity_candidate_id: "oc-1",
            opportunity_candidate: {
              id: "oc-1",
              opportunity_id: "opp-1",
              opportunity: {
                id: "opp-1",
                title: "Mission Data",
                company_id: "comp-1",
                company: { id: "comp-1", name: "Acme" },
              },
            },
          },
        },
      ],
    })

    const absences = await resolveAbsencesSource(baseQuery, {
      loadRows: async () => [
        {
          id: "abs-1",
          workspace_id: "ws-1",
          collaborator_id: "col-1",
          absence_type: "conges_payes",
          start_date: "2026-03-24",
          end_date: "2026-03-25",
          duration_days: 2,
          notes: null,
          collaborator: {
            id: "col-1",
            current_title: "Consultant",
            person: { id: "person-1", full_name: "Jean Martin" },
          },
        },
      ],
    })

    const closures = await resolveClientClosuresSource(baseQuery, {
      loadRows: async () => [
        {
          id: "closure-1",
          workspace_id: "ws-1",
          company_id: "comp-1",
          label: "Pont de printemps",
          start_date: "2026-03-26",
          end_date: "2026-03-27",
          is_recurring: false,
          notes: null,
          company: { id: "comp-1", name: "Acme" },
        },
      ],
    })

    expect(calendar.items[0].type).toBe("scheduled_event")
    expect(tasks.items[0].type).toBe("task")
    expect(tasks.items[0].relatedCalendarEventId).toBe("evt-1")
    expect(missions.items.map((item) => item.type)).toEqual(["deadline", "deadline"])
    expect(opportunities.items.map((item) => item.type)).toEqual(["deadline", "deadline"])
    expect(recruitment.items[0].type).toBe("deadline")
    expect(absences.items[0].type).toBe("availability_block")
    expect(closures.items[0].type).toBe("availability_block")
  })

  it("normalizes business statuses deterministically", async () => {
    const tasks = await resolveTasksSource(baseQuery, {
      loadRows: async () => [
        {
          id: "task-done",
          workspace_id: "ws-1",
          title: "Tâche faite",
          description: null,
          due_date: "2026-03-23",
          priority: "low",
          status: "done",
          completed_at: "2026-03-23T10:00:00.000Z",
          assignee_id: null,
          entity_type: null,
          entity_id: null,
          linked_entity_type: null,
          linked_entity_id: null,
          calendar_event_id: null,
          calendar_event: null,
        },
      ],
    })

    expect(tasks.items[0].businessStatus).toBe("completed")
    expect(tasks.items[0].temporalState).toBe("past")
  })

  it("deduplicates recruitment milestones linked to calendar_event_id", async () => {
    const recruitment = await resolveRecruitmentMilestonesSource(baseQuery, {
      loadRows: async () => [
        {
          id: "hm-linked",
          workspace_id: "ws-1",
          step: "entretien_manager",
          result: "en_attente",
          scheduled_at: "2026-03-25T09:00:00.000Z",
          completed_at: null,
          calendar_event_id: "evt-1",
          notes: null,
          process: null,
        },
      ],
    })

    expect(recruitment.items).toHaveLength(0)
  })
})
