import { OpportunitiesTriPanel } from "@/features/opportunities/desktop/OpportunitiesTriPanel"
import { EmptyState } from "@/components/dashboard/widgets/EmptyState"

// ─────────────────────────────────────────────────────────────────────────────
//  Opportunities Workspace — chapitre Avant-vente (Lot 7)
//
//  Chantier : docs/FEATURES/opportunities_workspace/ (§ 11).
//
//  **STRUCTURE UNIQUEMENT.** Aucun faux projet, aucune donnée seed, aucun modèle
//  métier inventé. Trois panneaux avec de vrais `EmptyState`.
//
//  `OPEN QUESTION PRODUCT-05` reste ouverte : la relation entre opportunité
//  commerciale, projet avant-vente et mission / projet gagné (`projects`) n'est
//  pas cadrée. Tant qu'elle ne l'est pas, ce chapitre reste structurel — aucune
//  `Data` (fiche Lot 7).
// ─────────────────────────────────────────────────────────────────────────────

function PanelFrame({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-0 flex-1 items-center justify-center p-6">{children}</div>
}

export function PresalesDesktop() {
  return (
    <OpportunitiesTriPanel
      ariaLabel="Avant-vente"
      list={
        <PanelFrame>
          <EmptyState
            title="Aucun projet avant-vente"
            description="La liste des projets d'avant-vente apparaîtra ici une fois le modèle métier arrêté."
            className="w-full"
          />
        </PanelFrame>
      }
      main={
        <PanelFrame>
          <EmptyState
            title="Avant-vente à structurer"
            description="Le suivi des projets d'avant-vente — relation entre opportunité commerciale, projet et mission gagnée — n'est pas encore modélisé (question produit ouverte). Ce chapitre livre la structure ; le contenu suivra une décision produit."
            className="max-w-md"
          />
        </PanelFrame>
      }
      detailsEmpty={
        <aside
          className="flex min-h-0 flex-col border-l border-border bg-surface"
          aria-label="Détails du projet avant-vente"
        >
          <PanelFrame>
            <EmptyState
              title="Aucune sélection"
              description="Sélectionnez un projet pour afficher ses détails."
              className="w-full"
            />
          </PanelFrame>
        </aside>
      }
    />
  )
}
