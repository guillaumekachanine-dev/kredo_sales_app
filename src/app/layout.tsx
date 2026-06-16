import type { Metadata, Viewport } from "next";
import { Lato, Manrope } from "next/font/google";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2554B8",
};

export const metadata: Metadata = {
  title: "KREDO",
  description: "Workspace de pilotage",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KREDO",
    startupImage: [
      {
        url: "/apple-touch-startup-image-1170x2532.png",
        media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
    ],
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${lato.variable} ${manrope.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="apple-touch-startup-image"
          media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
          href="/apple-touch-startup-image-1170x2532.png"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
