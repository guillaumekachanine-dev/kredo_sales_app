/**
 * Id de l'action du registre qui ouvre le composeur de matching.
 *
 * Isolé dans son propre module pour que le registre, les deux panneaux et
 * `IntelligenceActionCard` partagent la même constante sans qu'aucun d'eux
 * n'importe les composants des autres.
 */
export const MATCHING_COMPOSER_ACTION_ID = "match_profiles" as const
