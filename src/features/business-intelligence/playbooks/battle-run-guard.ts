/** Run INTEL-020 rattaché au compte actif au moment de son déclenchement. */
export type BattleTrackedRun = {
  runId: string
  companyId: string
}

/**
 * Le résultat d'un run ne peut mettre à jour l'UI que si l'utilisateur est
 * toujours sur le compte qui l'a déclenché. Le workflow, lui, continue sans
 * être annulé afin de préserver son résultat et son pipeline documentaire.
 */
export function isBattleRunForCurrentCompany(
  run: BattleTrackedRun | null,
  currentCompanyId: string,
): boolean {
  return run?.companyId === currentCompanyId
}
