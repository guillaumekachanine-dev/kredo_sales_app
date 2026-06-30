import { SyntheseSection } from "@/components/prospection/synthese"
import { parseSyntheseDesignVariant } from "@/components/prospection/synthese/design-variants"

export const dynamic = "force-dynamic"

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function ProspectionPage({ searchParams }: PageProps) {
  const params = await searchParams
  const lens = typeof params.lens === "string" ? params.lens : undefined
  const design = process.env.NODE_ENV !== "production" && typeof params.design === "string"
    ? parseSyntheseDesignVariant(params.design)
    : null

  return <SyntheseSection lens={lens} design={design} />
}
