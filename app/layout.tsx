import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css"; // This line imports the CSS file

// Initialize Montserrat font
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-montserrat',
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
    <html lang="en" className={`${montserrat.variable}`}>
      <body className="font-montserrat">{children}</body>
    </html>
  );
}
