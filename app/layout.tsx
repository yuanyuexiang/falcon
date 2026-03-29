import type { Metadata } from "next";
import { IBM_Plex_Mono, Oxanium } from "next/font/google";

import { Providers } from "@/app/providers";

import "./globals.css";

const geistSans = Oxanium({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = IBM_Plex_Mono({
  variable: "--font-geist-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Loan BI Report Manager",
  description: "Management dashboard for Platform Overview, Data Analytics, and Pricing & Scenario reports",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
