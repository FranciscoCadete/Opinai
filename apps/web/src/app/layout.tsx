import type { Metadata } from "next";
import { DM_Sans, Fraunces, DM_Mono, Inter } from "next/font/google";
import "./globals.css";

const fontSans = DM_Sans({
  variable: "--app-font-sans",
  subsets: ["latin"],
  display: "swap",
});

const fontDisplay = Fraunces({
  variable: "--app-font-display",
  subsets: ["latin"],
  display: "swap",
});

const fontMono = DM_Mono({
  variable: "--app-font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const fontInter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "OP1NA1 - Portal do Cidadão",
  description: "Portal do Cidadão e Sistema de Gestão OP1NA1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-AO"
      className={`${fontSans.variable} ${fontDisplay.variable} ${fontMono.variable} ${fontInter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
