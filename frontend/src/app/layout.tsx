import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/nav-bar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PAKA Intelligence Hub",
  description: "Customer cohort analysis and data visualization",
  icons: {
    icon: "https://cdn.shopify.com/s/files/1/0549/9473/1068/files/favicon.png?v=1750033563",
    shortcut: "https://cdn.shopify.com/s/files/1/0549/9473/1068/files/favicon.png?v=1750033563",
    apple: "https://cdn.shopify.com/s/files/1/0549/9473/1068/files/favicon.png?v=1750033563",
  },
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
        <NavBar />
        <main className="min-h-screen bg-gray-50">
          {children}
        </main>
      </body>
    </html>
  );
}
