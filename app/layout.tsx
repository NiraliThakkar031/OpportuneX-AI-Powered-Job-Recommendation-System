import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpportuneX",
  description:
    "OpportuneX is an AI career platform with database-first job discovery, personalized matching, skill-gap analysis, career roadmaps, and guided career assistance.",
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
