import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Nunito } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "cyrillic"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "ЭнергоГерой — 2D-платформер про энергосбережение",
  description:
    "Помоги Вжику, светодиодной лампочке, спасти дом от ЭнергоВампиров: собирай LED-лампочки, выключай лишний свет и береги энергию!",
  keywords: [
    "игра",
    "платформер",
    "энергосбережение",
    "экология",
    "2D игра",
    "ЭнергоГерой",
  ],
  authors: [{ name: "Z.ai" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "ЭнергоГерой — 2D-платформер про энергосбережение",
    description:
      "Собирай LED-лампочки, выключай лишний свет и спаси дом от ЭнергоВампиров!",
    siteName: "ЭнергоГерой",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b120c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${nunito.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
