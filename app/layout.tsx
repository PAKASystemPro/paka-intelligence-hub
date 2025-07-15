import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

// Initialize Montserrat font
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-montserrat', // This remains the same
});

export const metadata: Metadata = {
  title: "PAKA Intelligence Hub",
  description: "Internal analytics and action hub",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The font variable is now correctly applied here
    <html lang="en" className={montserrat.variable}>
      {/* The body now uses the default font, which we just set to Montserrat */}
      <body>{children}</body>
    </html>
  );
}