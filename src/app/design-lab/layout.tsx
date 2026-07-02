import { notFound } from "next/navigation";
import "@/styles/design-lab/kredo-identity.css";

export default function DesignLabLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const canRenderDesignLab =
    process.env.VERCEL_ENV === "preview" ||
    process.env.NODE_ENV === "development";

  if (!canRenderDesignLab) {
    notFound();
  }

  return children;
}
