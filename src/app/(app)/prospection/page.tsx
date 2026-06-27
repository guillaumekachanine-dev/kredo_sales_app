import { SyntheseSection } from "@/components/prospection/synthese"

export const dynamic = "force-dynamic"

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function ProspectionPage({ searchParams }: PageProps) {
  const params = await searchParams
  const lens = typeof params.lens === "string" ? params.lens : undefined
  return <SyntheseSection lens={lens} />
}
