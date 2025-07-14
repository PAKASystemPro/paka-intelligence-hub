import type { Metadata } from "next";
import "./globals.css"; // This line imports the CSS file

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
