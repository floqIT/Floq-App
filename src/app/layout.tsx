import type { Metadata } from "next";
import { Sora, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FLOQ — Outcome Flow Board",
  description: "The post-Agile framework for outcome-driven teams. Move fast without the ceremony.",
  openGraph: {
    title: "FLOQ — Outcome Flow Board",
    description: "The post-Agile framework for outcome-driven teams.",
    url: "https://floqit.com",
    siteName: "FLOQ Framework",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${sora.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased bg-[#040e17] text-[#e8f4f8]`}
      >
        {children}
      </body>
    </html>
  );
}
