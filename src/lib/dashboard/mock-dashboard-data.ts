import { SectionDashboardData } from "./dashboard-types"

export const mockMissionsDashboardData: SectionDashboardData = {
  metrics: [
    {
      id: "m1",
      label: "Chiffre d'Affaires Visé",
      value: "450 000 €",
      description: "Objectif Q2",
      trend: { label: "+12% vs mois dernier", direction: "up" },
      status: "success"
    },
    {
      id: "m2",
      label: "Opportunités Actives",
      value: "28",
      description: "En cours de discussion",
      trend: { label: "Stable", direction: "stable" },
      status: "neutral"
    },
    {
      id: "m3",
      label: "Taux de Conversion",
      value: "34.2 %",
      description: "Moyenne sur 12 mois",
      trend: { label: "-2.4% vs Q1", direction: "down" },
      status: "warning"
    },
    {
      id: "m4",
      label: "Durée Moyenne Cycle",
      value: "45j",
      description: "Du contact à la signature",
      status: "success"
    }
  ],
  alerts: [
    {
      id: "a1",
      title: "Opportunité en souffrance",
      description: "Le compte 'TotalEnergies' n'a pas reçu d'offre depuis 14 jours.",
      status: "danger",
      href: "/opportunites/totalenergies"
    },
    {
      id: "a2",
      title: "Relance contrat requise",
      description: "Le contrat de 'L'Oréal' arrive à échéance dans 7 jours.",
      status: "warning",
      href: "/opportunites/loreal"
    }
  ],
  priorities: [
    {
      id: "p1",
      title: "Valider l'offre AXA",
      description: "Proposition financière à soumettre au Directeur Commercial.",
      dueLabel: "Aujourd'hui",
      status: "danger",
      href: "/opportunites/axa"
    },
    {
      id: "p2",
      title: "Rendez-vous de qualification Air Liquide",
      description: "Préparez la fiche de cadrage technique.",
      dueLabel: "Demain, 14h00",
      status: "neutral",
      href: "/opportunites/airliquide"
    },
    {
      id: "p3",
      title: "Relancer EDF",
      description: "Attente de retour sur les CVs transmis.",
      dueLabel: "Dans 2 jours",
      status: "warning",
      href: "/opportunites/edf"
    }
  ],
  mainInsight: {
    title: "Analyse prédictive de signature",
    summary: "Le volume d'opportunités au stade 'envoi_cv' a augmenté de 40% ce mois-ci. Cependant, le taux de transformation vers l'étape d'entretien technique ('rt') ralentit, indiquant un goulot d'étranglement potentiel sur la validation des compétences clés.",
    recommendations: [
      "Priorisez la qualification des compétences requises sur l'opportunité AXA.",
      "Planifiez une session de recalibrage des profils pour L'Oréal.",
      "Automatisez la relance après 3 jours sur l'étape de validation CV."
    ]
  },
  table: {
    title: "Dernières Opportunités Modifiées",
    description: "Suivi en temps réel des négociations majeures",
    columns: [
      { key: "client", label: "Client", align: "left" },
      { key: "title", label: "Opportunité", align: "left" },
      { key: "value", label: "Valeur Est.", align: "right" },
      { key: "stage", label: "Étape", align: "center" },
      { key: "probability", label: "Probabilité", align: "right" }
    ],
    rows: [
      {
        id: "r1",
        href: "/opportunites/axa",
        cells: {
          client: "AXA Group",
          title: "Renfort Lead Dev React/Next",
          value: "75 000 €",
          stage: "Qualification",
          probability: "60%"
        }
      },
      {
        id: "r2",
        href: "/opportunites/loreal",
        cells: {
          client: "L'Oréal",
          title: "Consultant Architecture Cloud",
          value: "120 000 €",
          stage: "Envoi CV",
          probability: "40%"
        }
      },
      {
        id: "r3",
        href: "/opportunites/totalenergies",
        cells: {
          client: "TotalEnergies",
          title: "Audit de performance SEO Next.js",
          value: "18 000 €",
          stage: "Demande",
          probability: "10%"
        }
      },
      {
        id: "r4",
        href: "/opportunites/airliquide",
        cells: {
          client: "Air Liquide",
          title: "Accompagnement RAG & IA",
          value: "150 000 €",
          stage: "Signature",
          probability: "90%"
        }
      }
    ]
  },
  activityFeed: [
    {
      id: "ac1",
      label: "Opportunité créée",
      description: "Air Liquide - Accompagnement RAG & IA",
      dateLabel: "Il y a 2h"
    },
    {
      id: "ac2",
      label: "Offre mise à jour",
      description: "AXA Group passée au statut Qualification",
      dateLabel: "Il y a 4h"
    },
    {
      id: "ac3",
      label: "Email envoyé",
      description: "Relance automatique envoyée à TotalEnergies",
      dateLabel: "Hier"
    }
  ],
  quickActions: [
    { id: "qa1", label: "Importer des leads (CSV)", variant: "secondary", href: "/crm/import" },
    { id: "qa2", label: "Exporter le pipe commercial", variant: "ghost", href: "/missions/export" }
  ],
  syncStatus: {
    source: "Salesforce CRM & Supabase Local",
    lastSyncLabel: "Synchronisé il y a 3 min",
    status: "ok"
  }
}

export const mockFinanceDashboardData: SectionDashboardData = {
  metrics: [
    {
      id: "f1",
      label: "Chiffre d'Affaires YTD",
      value: "1 240 000 €",
      description: "Cumulé annuel",
      trend: { label: "+8% vs prévisionnel", direction: "up" },
      status: "success"
    },
    {
      id: "f2",
      label: "Marge Nette Moyenne",
      value: "22.4 %",
      description: "Moyenne consolidée",
      trend: { label: "-0.8% vs cible", direction: "down" },
      status: "warning"
    },
    {
      id: "f3",
      label: "Trésorerie Disponible",
      value: "385 000 €",
      description: "Solde bancaire",
      trend: { label: "+15 000 € ce mois", direction: "up" },
      status: "success"
    },
    {
      id: "f4",
      label: "DSO (Délai Client)",
      value: "42j",
      description: "Moyenne de règlement",
      trend: { label: "Stable", direction: "stable" },
      status: "neutral"
    }
  ],
  alerts: [
    {
      id: "fa1",
      title: "Factures impayées > 60 jours",
      description: "3 factures (total de 18 500 €) nécessitent une relance formelle.",
      status: "danger",
      href: "/finance/impayes"
    }
  ],
  priorities: [
    {
      id: "fp1",
      title: "Rapprocher les flux de Mai",
      description: "Validation des écritures bancaires et des notes de frais.",
      dueLabel: "Ce soir",
      status: "danger",
      href: "/finance/rapprochement"
    },
    {
      id: "fp2",
      title: "Valider la déclaration TVA",
      description: "Soumission du formulaire mensuel sur le portail fiscal.",
      dueLabel: "Dans 3 jours",
      status: "warning",
      href: "/finance/tva"
    }
  ],
  mainInsight: {
    title: "Synthèse de Rentabilité Q2",
    summary: "Le CA est robuste, porté par le module Sales. Cependant, la hausse des coûts des prestataires externes comprime notre marge brute de 1.5 points. Une attention particulière doit être portée sur les nouveaux contrats à taux journalier fixe.",
    recommendations: [
      "Revoir la grille tarifaire des sous-traitants sur Proposal.",
      "Négocier des acomptes systématiques sur les projets > 50k€.",
      "Renforcer le recouvrement sur le client L'Oréal."
    ]
  },
  table: {
    title: "Facturation Récente & Projections",
    description: "État de recouvrement et prévision de trésorerie",
    columns: [
      { key: "invoice", label: "N° Facture", align: "left" },
      { key: "client", label: "Client", align: "left" },
      { key: "amount", label: "Montant HT", align: "right" },
      { key: "status", label: "Statut", align: "center" },
      { key: "dueDate", label: "Échéance", align: "right" }
    ],
    rows: [
      {
        id: "rf1",
        href: "/finance/factures/1029",
        cells: {
          invoice: "FA-2026-1029",
          client: "AXA Group",
          amount: "15 000 €",
          status: "Payé",
          dueDate: "05/06/2026"
        }
      },
      {
        id: "rf2",
        href: "/finance/factures/1030",
        cells: {
          invoice: "FA-2026-1030",
          client: "L'Oréal",
          amount: "24 000 €",
          status: "Envoyé",
          dueDate: "25/06/2026"
        }
      },
      {
        id: "rf3",
        href: "/finance/factures/1031",
        cells: {
          invoice: "FA-2026-1031",
          client: "EDF",
          amount: "9 500 €",
          status: "Retard",
          dueDate: "31/05/2026"
        }
      }
    ]
  },
  activityFeed: [
    {
      id: "fca1",
      label: "Paiement reçu",
      description: "15 000 € reçus de la part d'AXA Group",
      dateLabel: "Ce matin"
    },
    {
      id: "fca2",
      label: "Facture générée",
      description: "FA-2026-1032 pour Air Liquide",
      dateLabel: "Hier"
    }
  ],
  quickActions: [
    { id: "fqa1", label: "Générer rapport comptable (PDF)", variant: "secondary", href: "/finance/exports" },
    { id: "fqa2", label: "Ajouter une note de frais", variant: "ghost", href: "/finance/expenses/new" }
  ],
  syncStatus: {
    source: "Qonto Bank API & Pennylane",
    lastSyncLabel: "Synchronisé il y a 1 heure",
    status: "ok"
  }
}

export const mockProposalDashboardData: SectionDashboardData = {
  metrics: [
    {
      id: "p1",
      label: "Propositions Actives",
      value: "14",
      description: "En phase de révision client",
      trend: { label: "+3 ce mois-ci", direction: "up" },
      status: "success"
    },
    {
      id: "p2",
      label: "Taux d'Acceptation",
      value: "68 %",
      description: "Sur les 60 derniers jours",
      trend: { label: "+2.1%", direction: "up" },
      status: "success"
    },
    {
      id: "p3",
      label: "Panier Moyen Offre",
      value: "45 800 €",
      description: "Valeur par proposition",
      trend: { label: "-5.3% vs Q1", direction: "down" },
      status: "warning"
    }
  ],
  alerts: [
    {
      id: "pa1",
      title: "Rapprochement technique manquant",
      description: "La proposition 'Air Liquide RAG' ne contient pas les CVs recommandés.",
      status: "warning",
      href: "/proposals/airliquide"
    }
  ],
  priorities: [
    {
      id: "pp1",
      title: "Finaliser la proposition EDF",
      description: "Ajouter la section méthodologie RAG et plan projet.",
      dueLabel: "Ce soir, 18:00",
      status: "danger",
      href: "/proposals/edf"
    },
    {
      id: "pp2",
      title: "Relance client AXA",
      description: "Présentation de la proposition commerciale révisée.",
      dueLabel: "Demain",
      status: "neutral",
      href: "/proposals/axa"
    }
  ],
  mainInsight: {
    title: "Optimisation de contenu IA",
    summary: "Les propositions intégrant un résumé exécutif rédigé par IA et une structure modulaire obtiennent un taux de signature supérieur de 18%. Le temps de validation interne moyen a baissé de 2 jours.",
    recommendations: [
      "Utilisez le modèle 'RAG/IA standard' pour la proposition EDF.",
      "Générez les profils anonymisés directement depuis le profil consultant."
    ]
  },
  activityFeed: [
    {
      id: "propa1",
      label: "Proposition générée",
      description: "Proposition de 12 pages pour AXA Group",
      dateLabel: "Hier"
    }
  ],
  quickActions: [
    { id: "pqa1", label: "Consulter la bibliothèque de modèles", variant: "secondary", href: "/proposals/templates" }
  ],
  syncStatus: {
    source: "Proposal Engine & OpenAi RAG",
    lastSyncLabel: "Synchronisé en temps réel",
    status: "ok"
  }
}

export const mockProspectionDashboardData: SectionDashboardData = {
  metrics: [
    {
      id: "pr1",
      label: "Contacts Engagés",
      value: "148",
      description: "Campagnes actives",
      trend: { label: "+25% cette semaine", direction: "up" },
      status: "success"
    },
    {
      id: "pr2",
      label: "Taux d'Ouverture",
      value: "62.4 %",
      description: "Moyenne des emails",
      trend: { label: "-1.8%", direction: "down" },
      status: "neutral"
    },
    {
      id: "pr3",
      label: "Réponses Obtenues",
      value: "18",
      description: "Intérêt manifesté ou call planifié",
      trend: { label: "+5 calls planifiés", direction: "up" },
      status: "success"
    }
  ],
  alerts: [
    {
      id: "pra1",
      title: "Limite quotidienne de mails",
      description: "Le compte de messagerie de Guillaume approche sa limite d'envoi quotidien.",
      status: "warning"
    }
  ],
  priorities: [
    {
      id: "prp1",
      title: "Qualifier les 12 leads LinkedIn",
      description: "Secteur Assurance & Banque identifiés par l'IA.",
      dueLabel: "Aujourd'hui",
      status: "warning",
      href: "/prospection/leads"
    }
  ],
  mainInsight: {
    title: "Opportunités de ciblage",
    summary: "L'IA a détecté une hausse d'activité sur le secteur de l'Énergie concernant des besoins 'React/Next.js' et 'Migration Cloud'. Les emails personnalisés sur ces sujets obtiennent un taux de réponse de 28% contre 12% pour les messages génériques.",
    recommendations: [
      "Lancez une mini-campagne ciblée 'Migration Next.js' pour le secteur Énergie.",
      "Préparez un document d'appel sur la performance SEO de Next 15."
    ]
  },
  activityFeed: [
    {
      id: "praa1",
      label: "Réponse reçue",
      description: "Rendez-vous planifié avec le CTO de BNP Paribas",
      dateLabel: "Il y a 30m"
    }
  ],
  quickActions: [
    { id: "prqa1", label: "Lancer un scan de leads LinkedIn", variant: "primary", href: "/prospection/scan" }
  ],
  syncStatus: {
    source: "LinkedIn Sales Navigator & Hunter.io",
    lastSyncLabel: "Synchronisé il y a 15 min",
    status: "ok"
  }
}

export const mockKnowledgeDashboardData: SectionDashboardData = {
  metrics: [
    {
      id: "k1",
      label: "Documents Indexés",
      value: "342",
      description: "Fiches, propositions et retours d'XP",
      status: "success"
    },
    {
      id: "k2",
      label: "Requêtes RAG",
      value: "1 205",
      description: "Effectuées ce mois-ci par l'équipe",
      trend: { label: "+15% vs mois dernier", direction: "up" },
      status: "success"
    },
    {
      id: "k3",
      label: "Taux de Précision RAG",
      value: "94.8 %",
      description: "Évalué par feedback utilisateur",
      status: "success"
    }
  ],
  alerts: [
    {
      id: "ka1",
      title: "Documents non catégorisés",
      description: "14 documents importés récemment n'ont pas encore de tags thématiques.",
      status: "warning",
      href: "/knowledge/documents/uncategorized"
    }
  ],
  priorities: [
    {
      id: "kp1",
      title: "Mettre à jour le REX AXA Group",
      description: "Intégrer les résultats de la phase finale et de la signature.",
      dueLabel: "Sous 5 jours",
      status: "neutral",
      href: "/knowledge/documents/rex-axa"
    }
  ],
  mainInsight: {
    title: "Capitalisation des savoirs",
    summary: "Les recherches les plus fréquentes ce mois-ci concernent l'intégration de 'Supabase RLS' et 'Next.js Server Actions'. Un manque d'exemples réels a été noté par les utilisateurs sur les rôles multi-locataires.",
    recommendations: [
      "Rédigez une fiche de référence sur la gestion du multi-tenant avec Supabase.",
      "Demandez au lead technique d'AXA d'écrire son retour d'expérience."
    ]
  },
  activityFeed: [
    {
      id: "kfa1",
      label: "Nouveau document indexé",
      description: "REX - Audit technique L'Oréal",
      dateLabel: "Hier"
    }
  ],
  quickActions: [
    { id: "kqa1", label: "Lancer une synchronisation vectorielle", variant: "secondary", href: "/knowledge/sync" }
  ],
  syncStatus: {
    source: "Supabase Vector Store (pgvector)",
    lastSyncLabel: "Synchronisé il y a 5 min",
    status: "ok"
  }
}

export const mockAutomationsDashboardData: SectionDashboardData = {
  metrics: [
    {
      id: "au1",
      label: "Workflows Actifs",
      value: "12",
      description: "Automations actives en production",
      status: "success"
    },
    {
      id: "au2",
      label: "Exécutions (24h)",
      value: "1 842",
      description: "Appels de workflows réussis",
      trend: { label: "+350 vs hier", direction: "up" },
      status: "success"
    },
    {
      id: "au3",
      label: "Taux de Succès",
      value: "99.2 %",
      description: "Moyenne sur 7 jours",
      trend: { label: "-0.4%", direction: "down" },
      status: "warning"
    }
  ],
  alerts: [
    {
      id: "aua1",
      title: "Échec critique sur Sync CRM",
      description: "Le connecteur avec le CRM a échoué 12 fois d'affilée (Erreur 401).",
      status: "danger",
      href: "/automations/logs?workflow=crm-sync"
    }
  ],
  priorities: [
    {
      id: "aup1",
      title: "Rétablir le token CRM",
      description: "Mettre à jour la clé API expirée dans les variables d'environnement.",
      dueLabel: "Immédiat",
      status: "danger",
      href: "/automations/settings/keys"
    }
  ],
  mainInsight: {
    title: "Rapport d'exécution des automates",
    summary: "Le volume de requêtes d'enrichissement de leads a augmenté de 150%. L'intégration n8n fonctionne correctement, mais le délai de réponse moyen de l'API externe d'enrichissement s'est dégradé (1.8s vs 0.4s).",
    recommendations: [
      "Configurez un cache Redis temporaire pour les requêtes d'enrichissement redondantes.",
      "Vérifiez les quotas de requêtes sur le compte d'enrichissement."
    ]
  },
  activityFeed: [
    {
      id: "aufa1",
      label: "Alerte de sécurité",
      description: "Connexion échouée sur le webhook de notification",
      dateLabel: "Il y a 1h"
    }
  ],
  quickActions: [
    { id: "auqa1", label: "Forcer la synchronisation n8n", variant: "primary", href: "/automations/n8n/sync" }
  ],
  syncStatus: {
    source: "n8n Host & Supabase Database Webhooks",
    lastSyncLabel: "Synchronisé il y a 2 min",
    status: "ok"
  }
}

export const mockCockpitDashboardData: SectionDashboardData = {
  metrics: [
    {
      id: "c1",
      label: "Volume d'Affaires total (Q2)",
      value: "2 180 000 €",
      trend: { label: "+15% vs Q1", direction: "up" },
      status: "success"
    },
    {
      id: "c2",
      label: "Taux d'occupation",
      value: "84 %",
      description: "Cible: 85%",
      trend: { label: "+2% vs mois dernier", direction: "up" },
      status: "success"
    },
    {
      id: "c3",
      label: "Alertes critiques actives",
      value: "3",
      description: "Action immédiate requise",
      status: "danger"
    },
    {
      id: "c4",
      label: "Exécutions workflows",
      value: "12 400",
      description: "Dernières 24h",
      trend: { label: "Stable", direction: "stable" },
      status: "neutral"
    }
  ],
  alerts: [
    {
      id: "ca1",
      title: "Échec critique Sync CRM",
      description: "Le webhook de synchronisation CRM est bloqué depuis 2 heures.",
      status: "danger",
      href: "/automations"
    },
    {
      id: "ca2",
      title: "Facture impayée > 60 jours",
      description: "EDF a dépassé son délai de règlement (9 500 €).",
      status: "danger",
      href: "/finance"
    }
  ],
  priorities: [
    {
      id: "cp1",
      title: "Valider l'offre AXA",
      description: "Vérification finale avant signature commerciale.",
      dueLabel: "Ce soir",
      status: "danger",
      href: "/missions"
    },
    {
      id: "cp2",
      title: "Mettre à jour la clé d'API CRM",
      description: "Reconnexion requise pour le connecteur Salesforce.",
      dueLabel: "Immédiat",
      status: "danger",
      href: "/automations"
    }
  ],
  mainInsight: {
    title: "Recommandations globales de Pilotage",
    summary: "L'activité commerciale est intense avec 28 opportunités actives, mais la surcharge sur les workflows d'intégration et les factures en retard pourrait impacter notre DSO. Le taux d'occupation des consultants (84%) est optimal pour Q2.",
    recommendations: [
      "Rétablissez en priorité la connexion du CRM pour éviter toute perte de lead.",
      "Relancez EDF pour régulariser la facture impayée.",
      "Finalisez le contrat AXA pour sécuriser l'objectif de CA de Q2."
    ]
  },
  table: {
    title: "Santé et Statuts des Modules",
    description: "Synthèse de l'état opérationnel de chaque section",
    columns: [
      { key: "section", label: "Module", align: "left" },
      { key: "status", label: "Statut", align: "center" },
      { key: "activity", label: "Activité", align: "left" },
      { key: "sync", label: "Synchronisation", align: "right" }
    ],
    rows: [
      {
        id: "rs1",
        href: "/missions",
        cells: {
          section: "Missions & Opps",
          status: "Opérationnel",
          activity: "28 opportunités actives",
          sync: "Il y a 3 min"
        }
      },
      {
        id: "rs2",
        href: "/finance",
        cells: {
          section: "Finance",
          status: "Alerte",
          activity: "1 facture en retard",
          sync: "Il y a 1h"
        }
      },
      {
        id: "rs3",
        href: "/automations",
        cells: {
          section: "Automations",
          status: "Échec",
          activity: "Connecteur CRM bloqué",
          sync: "Il y a 2 min"
        }
      },
      {
        id: "rs4",
        href: "/knowledge",
        cells: {
          section: "Knowledge Hub",
          status: "Opérationnel",
          activity: "342 docs indexés",
          sync: "Il y a 5 min"
        }
      }
    ]
  },
  activityFeed: [
    {
      id: "cac1",
      label: "Alerte déclenchée",
      description: "Erreur 401 sur Sync CRM (n8n)",
      dateLabel: "Il y a 2h"
    },
    {
      id: "cac2",
      label: "Signature AXA imminente",
      description: "Offre déplacée au statut Qualification par Guillaume",
      dateLabel: "Il y a 4h"
    }
  ],
  quickActions: [
    { id: "cqa1", label: "Forcer la sync n8n", variant: "primary", href: "/automations" },
    { id: "cqa2", label: "Nouveau devis (Proposal)", variant: "secondary", href: "/proposals" }
  ],
  syncStatus: {
    source: "Consolidated Systems Agent",
    lastSyncLabel: "Calculé il y a 1 min",
    status: "ok"
  }
}

export const mockStaffingDashboardData: SectionDashboardData = {
  metrics: [
    {
      id: "st1",
      label: "Taux d'occupation (TACE)",
      value: "84 %",
      description: "Cible Q2: 85%",
      trend: { label: "+2% vs mois dernier", direction: "up" },
      status: "success"
    },
    {
      id: "st2",
      label: "Consultants Staffés",
      value: "42 / 50",
      description: "Affectations actives",
      status: "success"
    },
    {
      id: "st3",
      label: "Intercontrats (IC)",
      value: "8",
      description: "Recherche de mission",
      trend: { label: "-3 cette semaine", direction: "up" },
      status: "warning"
    }
  ],
  alerts: [
    {
      id: "sta1",
      title: "Fin de mission imminente",
      description: "La mission de Jean Dupont chez L'Oréal se termine le 15 juin.",
      status: "warning",
      href: "/consultants"
    }
  ],
  priorities: [
    {
      id: "stp1",
      title: "Staffer Sophie Martin",
      description: "Compétences React/Next.js adaptées à l'opportunité AXA.",
      dueLabel: "Ce soir",
      status: "danger",
      href: "/missions"
    }
  ],
  mainInsight: {
    title: "Analyse des intercontrats",
    summary: "Nous avons actuellement 8 consultants en intercontrat, principalement sur des profils de gestion de projet. Le matching IA recommande de les positionner sur les besoins d'études de la prospection.",
    recommendations: [
      "Associer Sophie Martin à l'opportunité AXA Lead Dev.",
      "Planifier un entretien client pour Marc Colin chez BNP."
    ]
  },
  table: {
    title: "Affectations Récentes",
    description: "Derniers staffing validés ou en cours",
    columns: [
      { key: "consultant", label: "Consultant", align: "left" },
      { key: "client", label: "Client", align: "left" },
      { key: "rate", label: "TJM", align: "right" },
      { key: "status", label: "Statut", align: "center" }
    ],
    rows: [
      {
        id: "rst1",
        href: "/consultants",
        cells: {
          consultant: "Sophie Martin",
          client: "AXA Group",
          rate: "650 €",
          status: "Proposé"
        }
      },
      {
        id: "rst2",
        href: "/consultants",
        cells: {
          consultant: "Jean Dupont",
          client: "L'Oréal",
          rate: "700 €",
          status: "Actif"
        }
      }
    ]
  },
  activityFeed: [
    {
      id: "stac1",
      label: "Consultant planifié",
      description: "Sophie Martin proposée pour AXA Group",
      dateLabel: "Il y a 1h"
    }
  ],
  quickActions: [
    { id: "stqa1", label: "Voir le plan de charge global", variant: "secondary", href: "/missions/planning" }
  ],
  syncStatus: {
    source: "Kredo Staffing Engine",
    lastSyncLabel: "Calculé il y a 5 min",
    status: "ok"
  }
}

export const mockConsultantsDashboardData: SectionDashboardData = {
  metrics: [
    {
      id: "co1",
      label: "Effectif Total",
      value: "50",
      description: "Consultants internes",
      status: "neutral"
    },
    {
      id: "co2",
      label: "Compétences Référencées",
      value: "142",
      description: "Skills uniques validés",
      status: "success"
    },
    {
      id: "co3",
      label: "Niveau moyen seniorité",
      value: "Senior",
      description: "Moyenne d'expérience 6.2 ans",
      status: "neutral"
    }
  ],
  alerts: [],
  priorities: [
    {
      id: "cop1",
      title: "Mise à jour profil Jean Dupont",
      description: "REX technique de la mission L'Oréal à renseigner.",
      dueLabel: "Sous 3 jours",
      status: "warning",
      href: "/consultants"
    }
  ],
  mainInsight: {
    title: "Cartographie des compétences",
    summary: "Les technologies Cloud (AWS/Azure) et Data (Python, dbt) représentent 60% de nos compétences clés. Nous constatons une pénurie sur la cybersécurité.",
    recommendations: [
      "Lancer une formation interne sur la sécurité applicative.",
      "Mettre à jour les CVs des consultants Data avant le Q3."
    ]
  },
  table: {
    title: "Derniers Profils Modifiés",
    description: "Mise à jour des compétences et CVs",
    columns: [
      { key: "name", label: "Nom", align: "left" },
      { key: "title", label: "Titre", align: "left" },
      { key: "skills", label: "Compétences clés", align: "left" },
      { key: "status", label: "Statut", align: "center" }
    ],
    rows: [
      {
        id: "rco1",
        href: "/consultants",
        cells: {
          name: "Jean Dupont",
          title: "Architecte Cloud",
          skills: "AWS, Terraform, Python",
          status: "Mission"
        }
      },
      {
        id: "rco2",
        href: "/consultants",
        cells: {
          name: "Sophie Martin",
          title: "Dev Lead Fullstack",
          skills: "React, Next.js, Node.js",
          status: "Intercontrat"
        }
      }
    ]
  },
  activityFeed: [
    {
      id: "coac1",
      label: "Fiche mise à jour",
      description: "Compétence 'Next.js' ajoutée par Sophie Martin",
      dateLabel: "Hier"
    }
  ],
  quickActions: [
    { id: "coqa1", label: "Ajouter un collaborateur", variant: "primary", href: "/consultants/new" }
  ],
  syncStatus: {
    source: "Supabase Persons & Collaborators",
    lastSyncLabel: "Synchronisé en temps réel",
    status: "ok"
  }
}

export const mockRecruitmentDashboardData: SectionDashboardData = {
  metrics: [
    {
      id: "re1",
      label: "Candidats Actifs",
      value: "18",
      description: "Dans le pipeline",
      trend: { label: "+4 cette semaine", direction: "up" },
      status: "success"
    },
    {
      id: "re2",
      label: "Entretiens planifiés",
      value: "6",
      description: "Cette semaine",
      status: "success"
    },
    {
      id: "re3",
      label: "Délai de recrutement moyen",
      value: "25j",
      description: "Du sourcing à l'offre",
      status: "success"
    }
  ],
  alerts: [
    {
      id: "rea1",
      title: "Entretien en attente de retour",
      description: "Le candidat Marc Colin attend un feedback pour son entretien technique.",
      status: "danger",
      href: "/recruitment"
    }
  ],
  priorities: [
    {
      id: "rep1",
      title: "Planifier l'entretien final",
      description: "Candidature de Sophie Martin (Lead Dev React) à valider avec le DG.",
      dueLabel: "Demain",
      status: "danger",
      href: "/recruitment"
    }
  ],
  mainInsight: {
    title: "Performance IA Matching Sourcing",
    summary: "Notre matching IA a analysé 42 CVs importés automatiquement de LinkedIn ce matin. 3 profils 'Cybersecurity' ont un score supérieur à 85% pour nos besoins futurs.",
    recommendations: [
      "Contacter Marc Colin pour planifier l'entretien RH.",
      "Valider l'offre d'embauche pour Sophie Martin."
    ]
  },
  table: {
    title: "Pipeline Candidats",
    description: "Suivi des candidatures à fort potentiel",
    columns: [
      { key: "candidate", label: "Candidat", align: "left" },
      { key: "title", label: "Poste visé", align: "left" },
      { key: "stage", label: "Étape", align: "center" },
      { key: "score", label: "Score Match IA", align: "right" }
    ],
    rows: [
      {
        id: "rre1",
        href: "/recruitment",
        cells: {
          candidate: "Marc Colin",
          title: "Consultant Cyber",
          stage: "Entretien tech",
          score: "92%"
        }
      },
      {
        id: "rre2",
        href: "/recruitment",
        cells: {
          candidate: "Sophie Martin",
          title: "Dev Lead React",
          stage: "Offre émise",
          score: "88%"
        }
      }
    ]
  },
  activityFeed: [
    {
      id: "reac1",
      label: "Nouveau candidat importé",
      description: "Marc Colin importé via LinkedIn Extension",
      dateLabel: "Il y a 30m"
    }
  ],
  quickActions: [
    { id: "reqa1", label: "Importer un CV (PDF)", variant: "secondary", href: "/recruitment/import" }
  ],
  syncStatus: {
    source: "Supabase Candidates & n8n Parser",
    lastSyncLabel: "Synchronisé il y a 1 min",
    status: "ok"
  }
}

export const mockSettingsDashboardData: SectionDashboardData = {
  metrics: [
    {
      id: "se1",
      label: "Workspace ID",
      value: "KREDO_ESN",
      description: "Tenant principal actif",
      status: "neutral"
    },
    {
      id: "se2",
      label: "Utilisateurs Actifs",
      value: "14",
      description: "Licences actives",
      status: "success"
    },
    {
      id: "se3",
      label: "Dernière sauvegarde",
      value: "Sauvegardé",
      description: "Aujourd'hui, 04h00",
      status: "success"
    }
  ],
  alerts: [],
  priorities: [
    {
      id: "sep1",
      title: "Mettre à jour les RLS Supabase",
      description: "Valider les nouvelles règles d'accès multi-tenant.",
      dueLabel: "Ce soir",
      status: "warning",
      href: "/settings"
    }
  ],
  mainInsight: {
    title: "Sécurité & Profils",
    summary: "Tous les utilisateurs du workspace ont activé l'authentification multifacteur (MFA). Deux clés API de connecteurs expireront dans moins de 30 jours.",
    recommendations: [
      "Renouveler la clé d'API Salesforce.",
      "Vérifier les logs de connexion anormaux."
    ]
  },
  table: {
    title: "Historique d'activité système",
    description: "Dernières modifications d'administration",
    columns: [
      { key: "action", label: "Action", align: "left" },
      { key: "user", label: "Utilisateur", align: "left" },
      { key: "ip", label: "Adresse IP", align: "right" },
      { key: "status", label: "Statut", align: "center" }
    ],
    rows: [
      {
        id: "rse1",
        href: "/settings",
        cells: {
          action: "Mise à jour variables d'env",
          user: "Guillaume K.",
          ip: "192.168.1.1",
          status: "Succès"
        }
      }
    ]
  },
  activityFeed: [
    {
      id: "seac1",
      label: "Paramètres modifiés",
      description: "Clé d'API n8n mise à jour par Guillaume K.",
      dateLabel: "Il y a 3h"
    }
  ],
  quickActions: [
    { id: "seqa1", label: "Voir les logs d'audit", variant: "secondary", href: "/automations" }
  ],
  syncStatus: {
    source: "Supabase Settings Schema",
    lastSyncLabel: "Synchronisé en temps réel",
    status: "ok"
  }
}


