import { notFound } from "next/navigation"
import { KredoIdentityLab } from "@/components/design-lab/kredo-identity/KredoIdentityLab"

export const metadata = {
  title: "KREDO Design Lab - Identite visuelle",
  description: "Laboratoire isole de comparaison des directions artistiques KREDO.",
}

export default function Page() {
  if (process.env.VERCEL_ENV === "production") {
    notFound()
  }

  return <KredoIdentityLab initialDirection="a" />
}
