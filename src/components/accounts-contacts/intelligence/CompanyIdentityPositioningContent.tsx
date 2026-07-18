import type {
  CompanyIdentityProfile,
  CompanyMarketPositioning,
} from "@/lib/intelligence/client-intelligence-company"

function EditorialList({ items, emptyLabel = "Non renseigné" }: { items: string[]; emptyLabel?: string }) {
  if (items.length === 0) return <p className="text-xs italic text-muted">{emptyLabel}</p>
  return (
    <ul className="space-y-1.5 pl-4 text-xs leading-relaxed text-body">
      {items.map((item) => <li key={item} className="list-disc">{item}</li>)}
    </ul>
  )
}

export function CompanyIdentityPositioningContent({
  identity,
  positioning,
}: {
  identity: CompanyIdentityProfile
  positioning: CompanyMarketPositioning
}) {
  const identityRows = [
    ["Nom", identity.name],
    ["Raison sociale", identity.legalName],
    ["Siège social", identity.hqLocation],
    ["Secteur", identity.sector],
    ["Segment métier", identity.segment],
    ["Chiffre d’affaires", identity.revenue],
    ["Nombre de salariés", identity.employeeCount],
    ["Rayonnement géographique", identity.geographicReach],
  ]

  return (
    <div className="space-y-7">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-heading">Fiche d’identité</h3>
        <dl className="mt-3 grid border-x border-t border-border sm:grid-cols-2">
          {identityRows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[9rem_1fr] gap-3 border-b border-border px-3 py-2.5 sm:odd:border-r">
              <dt className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</dt>
              <dd className="text-xs font-semibold leading-relaxed text-body">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="border-x border-b border-border px-3 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Dynamique de l’entreprise</p>
          <p className="mt-1 text-xs leading-relaxed text-body">{identity.companyMomentum}</p>
        </div>
      </div>

      <div className="space-y-5">
        <div className="border-l-2 border-brand-brass pl-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-heading">Proposition de valeur</h3>
          <p className="mt-2 text-sm leading-relaxed text-body">{positioning.valueProposition}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <article className="border-t border-border pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-heading">Clientèle</h3>
            <div className="mt-3 space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Profil client type</p>
                <p className="mt-1 text-xs leading-relaxed text-body">{positioning.customer.typicalProfile}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Segments</p>
                {positioning.customer.segments.length > 0 ? (
                  <div className="mt-2 overflow-hidden border border-border">
                    {positioning.customer.segments.map((segment) => (
                      <div key={segment.name} className="border-b border-border p-3 last:border-b-0">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-xs font-bold text-heading">{segment.name}</p>
                          {segment.estimatedWeight && (
                            <span className="shrink-0 text-[10px] font-semibold text-muted">{segment.estimatedWeight}</span>
                          )}
                        </div>
                        {segment.description && <p className="mt-1 text-[11px] leading-relaxed text-body">{segment.description}</p>}
                      </div>
                    ))}
                  </div>
                ) : <p className="mt-1 text-xs italic text-muted">Non renseigné</p>}
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Besoins non couverts</p>
                <div className="mt-2"><EditorialList items={positioning.customer.unmetNeeds} /></div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Tendances comportementales</p>
                <div className="mt-2"><EditorialList items={positioning.customer.behavioralTrends} /></div>
              </div>
            </div>
          </article>

          <article className="border-t border-border pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-heading">Chaîne de valeur</h3>
            <p className="mt-3 text-xs leading-relaxed text-body">{positioning.valueChain.description}</p>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Maillons clés</p>
                <div className="mt-2"><EditorialList items={positioning.valueChain.keyLinks} /></div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Dépendances critiques</p>
                <div className="mt-2"><EditorialList items={positioning.valueChain.criticalDependencies} /></div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Points de vulnérabilité</p>
                <div className="mt-2"><EditorialList items={positioning.valueChain.vulnerabilities} /></div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  )
}
