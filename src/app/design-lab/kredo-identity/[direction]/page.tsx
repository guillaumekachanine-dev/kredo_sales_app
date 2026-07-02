import { notFound } from "next/navigation"
import { KredoIdentityLab } from "@/components/design-lab/kredo-identity/KredoIdentityLab"
import { directions, type DirectionId } from "@/components/design-lab/kredo-identity/identity-data"

export async function generateStaticParams() {
  return directions.map((direction) => ({ direction: direction.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ direction: string }> }) {
  const { direction: slug } = await params
  const visualDirection = directions.find((item) => item.slug === slug)

  return {
    title: visualDirection
      ? `KREDO Design Lab - ${visualDirection.name}`
      : "KREDO Design Lab",
  }
}

export default async function Page({ params }: { params: Promise<{ direction: string }> }) {
  const { direction: slug } = await params
  const visualDirection = directions.find((item) => item.slug === slug)

  if (!visualDirection) {
    notFound()
  }

  return <KredoIdentityLab initialDirection={visualDirection.id as DirectionId} />
}
