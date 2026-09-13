// Thème du workspace Veille & actualités, posé une fois pour la page ET son
// squelette (audit d'ouverture des pages, O-1 / O-3).
export default function VeilleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-theme="edito-bright-veille"
      className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-canvas text-body"
    >
      {children}
    </div>
  )
}
