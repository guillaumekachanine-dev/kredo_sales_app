import { SyntheseSection } from "@/features/legacy/crm-synthese"
import { parseSyntheseDesignVariant } from "@/features/legacy/crm-synthese/design-variants"
import { LegacyBanner } from "@/features/legacy/LegacyBanner"

export const dynamic = "force-dynamic"

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function LegacyCrmSynthesePage({ searchParams }: PageProps) {
  const params = await searchParams
  const lens = typeof params.lens === "string" ? params.lens : undefined
  const design = process.env.NODE_ENV !== "production" && typeof params.design === "string"
    ? parseSyntheseDesignVariant(params.design)
    : null

  return (
    <div className="flex flex-col min-h-screen">
      <LegacyBanner />
      <div className="flex-1">
        <SyntheseSection lens={lens} design={design} />
      </div>
    </div>
  )
}
