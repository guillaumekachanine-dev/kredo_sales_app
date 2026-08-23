"use client"

import type { BattleSituationDraft, BattleSituationOptions } from "./battle-situation-options"
import { BattleSituationKnowledgePicker } from "./BattleSituationKnowledgePicker"
import { NoOptionState, OptionCard, OptionGrid, SituationBlock, SourceBadge } from "./BattleSituationPickers"

type BattleSituationSecondaryOptionsProps = {
  options: BattleSituationOptions
  draft: BattleSituationDraft
  update: (patch: Partial<BattleSituationDraft>) => void
  isMobile: boolean
}

export function BattleSituationSecondaryOptions({
  options,
  draft,
  update,
  isMobile,
}: BattleSituationSecondaryOptionsProps) {
  return (
    <>
      <SituationBlock step={5} label="Timing" requirement="optional">
        {options.timings.length === 0 ? (
          <NoOptionState>Aucun trigger compte, aucune échéance réglementaire, aucun événement sectoriel.</NoOptionState>
        ) : (
          <OptionGrid isMobile={isMobile}>
            {options.timings.map((timing) => (
              <OptionCard
                key={timing.key}
                isMobile={isMobile}
                isSelected={draft.timing?.key === timing.key}
                onSelect={() => update({ timing: draft.timing?.key === timing.key ? null : timing })}
                title={timing.label}
                detail={timing.detail}
                badges={<SourceBadge source={timing.source} />}
              />
            ))}
          </OptionGrid>
        )}
      </SituationBlock>

      <SituationBlock
        step={6}
        label="Objection anticipée"
        requirement="optional"
        hint="Objections du playbook sectoriel — à ne pas confondre avec les lignes rouges de la Battle Card."
      >
        {options.objections.length === 0 ? (
          <NoOptionState>Aucune objection documentée dans le playbook du segment.</NoOptionState>
        ) : (
          <OptionGrid isMobile={isMobile}>
            {options.objections.map((objection) => (
              <OptionCard
                key={objection.key}
                isMobile={isMobile}
                isSelected={draft.objection?.key === objection.key}
                onSelect={() => update({ objection: draft.objection?.key === objection.key ? null : objection })}
                title={objection.label}
                detail={objection.response}
                badges={<SourceBadge source="sector" />}
              />
            ))}
          </OptionGrid>
        )}
      </SituationBlock>

      <SituationBlock
        step={7}
        label="Argument ROI"
        requirement="optional"
        hint="Texte du playbook, repris tel quel. Aucun chiffre n’est calculé ni extrapolé."
      >
        {options.roiArguments.length === 0 ? (
          <NoOptionState>Aucun argument ROI dans le playbook du segment.</NoOptionState>
        ) : (
          <OptionGrid isMobile={isMobile}>
            {options.roiArguments.map((roi) => (
              <OptionCard
                key={roi.key}
                isMobile={isMobile}
                isSelected={draft.roiArgument?.key === roi.key}
                onSelect={() => update({ roiArgument: draft.roiArgument?.key === roi.key ? null : roi })}
                title={roi.argument}
                badges={<SourceBadge source="sector" />}
              />
            ))}
          </OptionGrid>
        )}
      </SituationBlock>

      <SituationBlock
        step={8}
        label="Contexte Knowledge"
        requirement="optional"
        hint="Listes personnelles injectées comme contexte du pitch."
      >
        <BattleSituationKnowledgePicker
          selectedIds={draft.collectionIds}
          onChange={(collectionIds) => update({ collectionIds })}
          isMobile={isMobile}
        />
      </SituationBlock>
    </>
  )
}
