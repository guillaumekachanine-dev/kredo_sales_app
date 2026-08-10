export type {
  SectorMap,
  SectorMapActivity,
  SectorMapConfidence,
  SectorMapEcosystemLayer,
  SectorMapEntity,
  SectorMapEvidence,
  SectorMapMetric,
  SectorMapPlacement,
  SectorMapPortfolioStatus,
  SectorMapRef,
  SectorMapRelationship,
  SectorMapStage,
} from "./sector-map"

export {
  SectorMapValidationError,
  normalizeSectorMap,
  validateSectorMap,
} from "./validate-sector-map"

export {
  buildActivityProjection,
  buildEcosystemProjection,
  buildValueProjection,
  deriveCoverage,
  deriveWhiteSpace,
  summarizeActivityRelationships,
} from "./sector-map-transformations"

export type {
  SectorMapActivityProjection,
  SectorMapCoverage,
  SectorMapEcosystemProjection,
  SectorMapRelationshipSummary,
  SectorMapValueProjection,
  SectorMapWhiteSpace,
} from "./sector-map-transformations"
