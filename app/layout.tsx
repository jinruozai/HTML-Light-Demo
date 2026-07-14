import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0];
  const protocol = forwardedProtocol ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = new URL(`${protocol}://${host}`);
  const previewUrl = new URL("/og.png", origin).toString();

  return {
    metadataBase: origin,
    title: {
      default: "MORS² Game Engine",
      template: "%s — MORS²",
    },
    description:
      "MORS² is a small, elegant, high-performance Rust game engine architecture.",
    icons: {
      icon: "/mors-logo.svg",
      shortcut: "/mors-logo.svg",
    },
    openGraph: {
      title: "MORS² Game Engine",
      description: "Meta is observed by Rule to Step in Space.",
      type: "website",
      url: origin,
      images: [{ url: previewUrl, width: 1200, height: 630, alt: "A hanging light reveals the MORS² engine architecture." }],
    },
    twitter: {
      card: "summary_large_image",
      title: "MORS² Game Engine",
      description: "Meta is observed by Rule to Step in Space.",
      images: [previewUrl],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
