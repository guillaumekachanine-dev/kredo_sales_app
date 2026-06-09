import type { Metadata } from "next";
import { Lato, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const lato = Lato({
  variable: "--font-sans",
  weight: ["300", "400", "700", "900"],
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-heading",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
});

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
