export type SectorAnalysisActor = {
  nom: string
  part_marche_estimee?: string
  description?: string
}

export type SectorAnalysisReglementation = {
  nom: string
  impact?: string
  echeance?: string
}

export type SectorAnalysisConcurrent = {
  nom: string
  forces?: string
}

export type SectorAnalysisSegment = {
  segment: string
  poids_estime?: string
  description?: string
}

export type SectorAnalysisData = {
  synthese_sectorielle?: string
  volume_marche?: {
    taille_marche_france?: string
    taille_marche_europe?: string
    taux_croissance_annuel?: string
    tendances_macro?: string[]
    facteurs_croissance?: string[]
    freins_identifies?: string[]
  }
  acteurs_cles?: {
    leaders?: SectorAnalysisActor[]
    challengers?: Array<{ nom: string }>
    emergents?: Array<{ nom: string }>
  }
  chaine_valeur?: {
    description_chaine?: string
    maillons_cles?: string[]
    dependances_critiques?: string[]
    points_vulnerabilite?: string[]
  }
  environnement_normatif?: {
    reglementations_en_vigueur?: SectorAnalysisReglementation[]
    reglementations_a_venir?: SectorAnalysisReglementation[]
    certifications_requises?: string[]
    risques_conformite?: string[]
  }
  analyse_concurrentielle?: {
    positionnement_client?: string
    concurrents_directs?: SectorAnalysisConcurrent[]
    avantages_concurrentiels_client?: string[]
    menaces?: string[]
    opportunites_differenciation?: string[]
  }
  segment_clientele?: {
    profil_client_type?: string
    segmentation?: SectorAnalysisSegment[]
    tendances_comportementales?: string[]
    besoins_non_couverts?: string[]
  }
}
