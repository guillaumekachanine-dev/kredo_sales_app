import { SectionDashboardTemplate } from "@/components/dashboard/SectionDashboardTemplate"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { SectionDashboardConfig, SectionDashboardData } from "@/lib/dashboard/dashboard-types"

const config: SectionDashboardConfig = {
  sectionKey: "prospection",
  title: "Scoring & Qualification prédictive",
  description: "Calcul automatique de l'intérêt et de la pertinence des comptes cibles pour l'ESN.",
  primaryAction: {
    id: "recalculate-scores",
    label: "Recalculer les scores",
    variant: "primary",
    href: "/prospection/scoring/calculate"
  },
  mainPanel: {
    title: "Modèle de scoring prédictif",
    description: "Algorithmes de pondération et pertinence",
    type: "generic"
  }
}

const data: SectionDashboardData = {
  metrics: [
    { id: "sc1", label: "Comptes scorés", value: "300", status: "success" },
    { id: "sc2", label: "Score moyen", value: "3.2/5", status: "neutral" },
    { id: "sc3", label: "Précision prédictive", value: "92.1%", status: "success" }
  ],
  alerts: [],
  priorities: [
    {
      id: "scp1",
      title: "Vérifier la formule de scoring",
      description: "Ajuster le poids du critère 'recrutement Next.js' par rapport au 'chiffre d'affaires'.",
      dueLabel: "Sous 4 jours",
      status: "warning"
    }
  ],
  mainInsight: {
    title: "Analyse du scoring",
    summary: "Les comptes ayant un score supérieur à 4/5 ont un taux de signature 4 fois supérieur à la moyenne. Le critère 'localisation' (HQ local) reste le signal de closing le plus fort.",
    recommendations: [
      "Ajuster le poids de la localisation dans l'algorithme.",
      "Lancer une extraction sur tous les comptes à score > 4.5."
    ]
  },
  table: {
    title: "Pondération des critères de qualification",
    description: "Modèle actif",
    columns: [
      { key: "criteria", label: "Critère", align: "left" },
      { key: "weight", label: "Poids", align: "right" },
      { key: "impact", label: "Impact commercial", align: "right" }
    ],
    rows: [
      {
        id: "r1",
        cells: {
          criteria: "Tech stack matching (React/Next)",
          weight: "40%",
          impact: "Élevé"
        }
      },
      {
        id: "r2",
        cells: {
          criteria: "Localisation géographique (IDF)",
          weight: "30%",
          impact: "Critique"
        }
      }
    ]
  },
  quickActions: [
    { id: "scqa1", label: "Éditer le modèle de scoring", variant: "secondary", href: "/prospection/scoring/edit" }
  ],
  syncStatus: {
    source: "Kredo Scoring Model Engine",
    lastSyncLabel: "Calculé il y a 30 min",
    status: "ok"
  }
}

export default async function ScoringPage() {
  const device = await getDashboardDevice()

  return (
    <SectionDashboardTemplate
      device={device}
      config={config}
      data={data}
    />
  )
}
