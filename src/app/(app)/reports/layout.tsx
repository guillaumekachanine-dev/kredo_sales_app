// Thème du workspace Rapports & rédaction, posé une fois pour la page ET son
// squelette (audit d'ouverture des pages, O-3). L'ancien `loading.tsx` peignait
// l'ancien thème sombre `intelligence-reports` avant la page claire.
export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="edito-bright-reports" className="h-full min-h-0 bg-canvas text-body">
      {children}
    </div>
  )
}
