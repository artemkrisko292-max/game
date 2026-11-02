import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

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
      <body className="antialiased bg-background text-foreground font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
