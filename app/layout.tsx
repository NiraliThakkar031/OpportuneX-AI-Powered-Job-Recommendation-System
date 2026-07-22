import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpportuneX",
  description:
    "OpportuneX is a job discovery app with matched openings pages, mixed-source backend fetching, and a guided assistant experience.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html data-scroll-behavior="smooth" lang="en">
      <body>{children}</body>
    </html>
  );
}
