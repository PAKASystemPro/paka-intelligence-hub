import type { Metadata } from "next";

import "./globals.css";


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
    <html lang="en">
      {/* The body now uses the default font, which we've set to Geist */}
      <body>{children}</body>
    </html>
  );
}