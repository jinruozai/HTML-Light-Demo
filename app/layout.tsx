import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://jinruozai.github.io/HTML-Light-Demo/";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const publicAsset = (path: string) => new URL(`${basePath}${path}`, siteUrl).toString();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "MORS² Game Engine",
    template: "%s — MORS²",
  },
  description:
    "MORS² is a small, elegant, high-performance Rust game engine architecture.",
  icons: {
    icon: publicAsset("/mors-logo.svg"),
    shortcut: publicAsset("/mors-logo.svg"),
  },
  openGraph: {
    title: "MORS² Game Engine",
    description: "Meta is observed by Rule to Step in Space.",
    type: "website",
    url: siteUrl,
    images: [{ url: publicAsset("/og.png"), width: 1200, height: 630, alt: "A hanging light reveals the MORS² engine architecture." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MORS² Game Engine",
    description: "Meta is observed by Rule to Step in Space.",
    images: [publicAsset("/og.png")],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
