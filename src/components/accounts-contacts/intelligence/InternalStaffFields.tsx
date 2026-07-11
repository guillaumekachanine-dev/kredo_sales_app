"use client"

import { Select } from "@/components/ui/Select"
import { AccountCombobox, type AccountValue } from "@/components/missions/AccountCombobox"
import { cn } from "@/lib/utils"
import type {
  CommunicationInternalDomain,
  CommunicationInternalRecipientRole,
  CommunicationInternalRelationship,
} from "@/lib/n8n/types"
import {
  INTERNAL_DOMAIN_OPTIONS,
  INTERNAL_RELATIONSHIP_OPTIONS,
  INTERNAL_ROLE_OPTIONS,
} from "./communication-brief-options"
import { CollaboratorSelect } from "./CollaboratorSelect"
import { EntityRefSelect } from "./EntityRefSelect"
import type { CollaboratorOption } from "./get-collaborator-options"
import type { EntityRefOption } from "./get-account-crm-refs"

function useSelectClasses(isMobile: boolean) {
  return cn(
    "w-full rounded-lg border border-border/35 bg-surface/20 pl-2.5 pr-5 font-medium text-white transition-all duration-150 hover:bg-surface/30 focus:bg-surface/40 focus:border-primary/60 focus:outline-none focus:ring-0 [&>span]:text-[10px] [&>svg]:mr-[-2px] [&>svg]:size-3",
    isMobile ? "h-9 text-[10px]" : "h-7 text-[10px]",
  )
}

// Lot 9 — rôle interne seul (command §8 mobile : "rôle et scénario
// prioritaires" — affiché en tête, avant même le scénario).
export function InternalRoleField({
  internalRole,
  onRoleChange,
  isMobile = false,
}: {
  internalRole: CommunicationInternalRecipientRole | undefined
  onRoleChange: (role: CommunicationInternalRecipientRole) => void
  isMobile?: boolean
}) {
  const selectCls = useSelectClasses(isMobile)

  return (
    <Select
      value={internalRole ?? ""}
      onChange={(e) => onRoleChange(e.target.value as CommunicationInternalRecipientRole)}
      className={selectCls}
    >
      <option value="" disabled>Choisir un rôle…</option>
      {INTERNAL_ROLE_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </Select>
  )
}

// Lot 9 — relation, domaine, nom libre (command §8 mobile : "domaine et
// relation en second niveau" — séparés du rôle sur mobile, regroupés avec lui
// sur desktop où "rôle, relation et domaine [restent] visibles ensemble").
export function InternalRecipientDetailsFields({
  internalRelationship,
  internalDomain,
  displayName,
  onRelationshipChange,
  onDomainChange,
  onNameChange,
  isMobile = false,
}: {
  internalRelationship: CommunicationInternalRelationship | undefined
  internalDomain: CommunicationInternalDomain | undefined
  displayName: string | undefined
  onRelationshipChange: (relationship: CommunicationInternalRelationship) => void
  onDomainChange: (domain: CommunicationInternalDomain) => void
  onNameChange: (name: string | undefined) => void
  isMobile?: boolean
}) {
  const selectCls = useSelectClasses(isMobile)

  return (
    <div className="space-y-2.5">
      <div className={cn("grid gap-2.5", isMobile ? "grid-cols-1" : "grid-cols-2")}>
        <Select
          value={internalRelationship ?? ""}
          onChange={(e) => onRelationshipChange(e.target.value as CommunicationInternalRelationship)}
          className={selectCls}
        >
          <option value="" disabled>Relation…</option>
          {INTERNAL_RELATIONSHIP_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select>
        <Select
          value={internalDomain ?? ""}
          onChange={(e) => onDomainChange(e.target.value as CommunicationInternalDomain)}
          className={selectCls}
        >
          <option value="" disabled>Domaine…</option>
          {INTERNAL_DOMAIN_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select>
      </div>

      <input
        type="text"
        value={displayName ?? ""}
        onChange={(e) => onNameChange(e.target.value || undefined)}
        placeholder="Nom du destinataire (facultatif)"
        className={cn(
          "w-full rounded-lg border border-border/35 bg-surface/20 px-2.5 font-medium text-white placeholder:text-muted/70 transition-all duration-150 hover:bg-surface/30 focus:bg-surface/40 focus:border-primary/60 focus:outline-none focus:ring-0",
          isMobile ? "h-9 text-[10px]" : "h-7 text-[10px]",
        )}
      />
    </div>
  )
}

// Lot 9 — desktop uniquement (command §8 : "rôle, relation et domaine
// visibles ensemble"). Compose les deux blocs ci-dessus sans dupliquer leur JSX.
export function InternalRecipientFields(props: {
  internalRole: CommunicationInternalRecipientRole | undefined
  internalRelationship: CommunicationInternalRelationship | undefined
  internalDomain: CommunicationInternalDomain | undefined
  displayName: string | undefined
  onRoleChange: (role: CommunicationInternalRecipientRole) => void
  onRelationshipChange: (relationship: CommunicationInternalRelationship) => void
  onDomainChange: (domain: CommunicationInternalDomain) => void
  onNameChange: (name: string | undefined) => void
  isMobile?: boolean
}) {
  return (
    <div className="space-y-2.5">
      <InternalRoleField internalRole={props.internalRole} onRoleChange={props.onRoleChange} isMobile={props.isMobile} />
      <InternalRecipientDetailsFields
        internalRelationship={props.internalRelationship}
        internalDomain={props.internalDomain}
        displayName={props.displayName}
        onRelationshipChange={props.onRelationshipChange}
        onDomainChange={props.onDomainChange}
        onNameChange={props.onNameChange}
        isMobile={props.isMobile}
      />
    </div>
  )
}

// Lot 9 — références internes facultatives (command §4) : compte, opportunité,
// mission, collaborateur. Purement des références de CONTEXTE — scope reste
// "internal" quel que soit ce qui est renseigné ici (command §4 "enrichissent
// le contexte sans changer scope=internal").
export function InternalReferencesFields({
  showCompanyRef,
  companyValue,
  onCompanyChange,
  showOpportunity,
  opportunityOptions,
  opportunityRef,
  onOpportunityChange,
  showMission,
  missionOptions,
  missionRef,
  onMissionChange,
  refsLoading,
  showCollaboratorRef,
  collaboratorOptions,
  collaboratorOptionsLoading,
  collaboratorRef,
  onCollaboratorRefChange,
  isMobile = false,
}: {
  showCompanyRef: boolean
  companyValue: AccountValue | null
  onCompanyChange: (value: AccountValue | null) => void
  showOpportunity: boolean
  opportunityOptions: EntityRefOption[]
  opportunityRef: string | undefined
  onOpportunityChange: (id: string | undefined) => void
  showMission: boolean
  missionOptions: EntityRefOption[]
  missionRef: string | undefined
  onMissionChange: (id: string | undefined) => void
  refsLoading: boolean
  showCollaboratorRef: boolean
  collaboratorOptions: CollaboratorOption[]
  collaboratorOptionsLoading: boolean
  collaboratorRef: string | undefined
  onCollaboratorRefChange: (collaborator: CollaboratorOption | null) => void
  isMobile?: boolean
}) {
  if (!showCompanyRef && !showOpportunity && !showMission && !showCollaboratorRef) return null

  return (
    <div className="space-y-2.5">
      {showCompanyRef ? (
        <AccountCombobox
          value={companyValue}
          onChange={onCompanyChange}
          allowCreate={false}
          openOnFocus
          minSearchLength={0}
          searchLimit={12}
          size={isMobile ? "md" : "sm"}
        />
      ) : null}
      {showOpportunity ? (
        <EntityRefSelect
          options={opportunityOptions}
          value={opportunityRef}
          onChange={onOpportunityChange}
          placeholder="Aucune opportunité liée"
          loading={refsLoading}
          isMobile={isMobile}
        />
      ) : null}
      {showMission ? (
        <EntityRefSelect
          options={missionOptions}
          value={missionRef}
          onChange={onMissionChange}
          placeholder="Aucune mission liée"
          loading={refsLoading}
          isMobile={isMobile}
        />
      ) : null}
      {showCollaboratorRef ? (
        <CollaboratorSelect
          options={collaboratorOptions}
          value={collaboratorRef}
          onChange={onCollaboratorRefChange}
          loading={collaboratorOptionsLoading}
          isMobile={isMobile}
        />
      ) : null}
    </div>
  )
}
