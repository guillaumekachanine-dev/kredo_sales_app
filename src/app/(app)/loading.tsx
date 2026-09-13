// Fallback du groupe (app) — volontairement NEUTRE.
//
// Audit d'ouverture des pages (O-2, docs/audits/AUDIT-OUVERTURE-DES-PAGES.md) :
// ce fichier dessinait un gabarit « KPI + cartes » qui ne correspondait plus à
// aucune page. Il s'affichait sur toutes les routes sans loading propre, et c'est
// lui que l'on percevait comme « l'ancienne version » avant la nouvelle.
//
// Un squelette générique ne peut ressembler qu'à une page fictive : la forme d'une
// page appartient au `loading.tsx` de son module. Ici, seulement le fond et une
// barre de progression fine (apparition différée, rien sur une navigation rapide).
// Ne pas supprimer : sans frontière à ce niveau, une route sans loading propre
// bloquerait la navigation sans aucun retour visuel.
export default function AppRouteLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Chargement…"
      className="relative min-h-full w-full flex-1 bg-canvas"
    >
      <div className="kredo-route-progress" aria-hidden="true" />
    </div>
  )
}
