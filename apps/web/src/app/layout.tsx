import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Highkey Community - Assign Keyboard Shortcuts to Any UI",
  description: "Browse, download, and share custom keyboard shortcuts for popular websites. Control the web at high speed.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body className="antialiased bg-[#040406] text-gray-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
