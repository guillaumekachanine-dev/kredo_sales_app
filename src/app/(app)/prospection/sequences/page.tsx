import { SectionDashboardTemplate } from "@/components/dashboard/SectionDashboardTemplate"
import { getDashboardDevice } from "@/lib/dashboard/dashboard-device"
import { SectionDashboardConfig, SectionDashboardData } from "@/lib/dashboard/dashboard-types"

const config: SectionDashboardConfig = {
  sectionKey: "prospection",
  title: "Séquences d'engagement",
  description: "Séquences multicanales automatisées (Emails, LinkedIn) pour entrer en contact avec les comptes prioritaires.",
  primaryAction: {
    id: "new-sequence",
    label: "Créer une séquence",
    variant: "primary",
    href: "/prospection/sequences/new"
  },
  mainPanel: {
    title: "Suivi des campagnes d'outreach",
    description: "Taux d'ouverture et d'engagement des séquences actives",
    type: "generic"
  }
}

const data: SectionDashboardData = {
  metrics: [
    { id: "sq1", label: "Séquences actives", value: "4", status: "success" },
    { id: "sq2", label: "Destinataires engagés", value: "148", status: "neutral" },
    { id: "sq3", label: "Taux de réponse", value: "18.2%", status: "success" }
  ],
  alerts: [
    {
      id: "sqa1",
      title: "Clé API Hunter.io expirée",
      description: "Le connecteur d'enrichissement de mail a expiré.",
      status: "danger"
    }
  ],
  priorities: [
    {
      id: "sqp1",
      title: "Relancer la séquence BNP Paribas",
      description: "4 contacts en attente de validation d'email.",
      dueLabel: "Aujourd'hui",
      status: "warning"
    }
  ],
  mainInsight: {
    title: "Performance des canaux",
    summary: "Les relances automatisées sur LinkedIn après un premier email personnalisé affichent un taux d'ouverture supérieur de 24% par rapport à un canal email unique.",
    recommendations: [
      "Ajouter une étape LinkedIn à la séquence Assurance.",
      "Renouveler la clé d'API Hunter."
    ]
  },
  table: {
    title: "Séquences actives & Résultats",
    description: "Statistiques de performance",
    columns: [
      { key: "name", label: "Nom de la séquence", align: "left" },
      { key: "sent", label: "Envoyés", align: "right" },
      { key: "replied", label: "Réponses", align: "right" }
    ],
    rows: [
      {
        id: "r1",
        cells: {
          name: "Campagne ESN - Pôle Cloud & Architecture",
          sent: "84",
          replied: "12 (14.2%)"
        }
      },
      {
        id: "r2",
        cells: {
          name: "Sourcing IA - React / Next.js",
          sent: "64",
          replied: "15 (23.4%)"
        }
      }
    ]
  },
  quickActions: [
    { id: "sqqa1", label: "Voir les statistiques détaillées", variant: "secondary", href: "/automations" }
  ],
  syncStatus: {
    source: "Hunter.io & Lemlist API Gateway",
    lastSyncLabel: "Mis à jour il y a 1 heure",
    status: "ok"
  }
}

export default async function SequencesPage() {
  const device = await getDashboardDevice()

  return (
    <SectionDashboardTemplate
      device={device}
      config={config}
      data={data}
    />
  )
}
