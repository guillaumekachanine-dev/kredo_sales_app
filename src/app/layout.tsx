import type { Metadata } from "next";
import { Lato, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Graisses limitées à celles réellement utilisées dans le code (audit perf) :
// font-light (300) et font-black (900) n'apparaissent nulle part → retirées
// pour éviter 2 téléchargements de fichiers de police inutiles.
const lato = Lato({
  variable: "--font-sans",
  weight: ["400", "700"],
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-heading",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
});

// Fix : la variable était "--" (jamais reliée à --font-mono dans globals.css),
// donc JetBrains_Mono était téléchargée mais jamais appliquée (font-mono tombait
// sur le mono système). On rétablit le mapping prévu par le design system.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KREDO",
  description: "Workspace de pilotage",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${lato.variable} ${manrope.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
