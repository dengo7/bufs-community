import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "./components/ServiceWorkerRegister";
import NativePushBootstrap from "./components/NativePushBootstrap";
import NavigationProgressWrapper from "./components/NavigationProgressWrapper";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Well",
  description: "외국인 유학생을 위한 BUFS 생활 커뮤니티",
  appleWebApp: {
    capable: true,
    title: "The Well",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NavigationProgressWrapper />
        {children}
        <ServiceWorkerRegister />
        <NativePushBootstrap />
        {/* Vercel Web Analytics — 배포 환경에서만 집계(dev에서는 스크립트가 디버그 모드로 동작하고 전송 안 함) */}
        <Analytics />
      </body>
    </html>
  );
}
