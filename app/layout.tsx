import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { PwaRegistration } from "@/components/pwa-registration";
import { SiteShell } from "@/components/site-shell";
import { StillpointProvider } from "@/components/stillpoint-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stillpoint — Dharma Seed listener",
  description: "A quiet, unofficial way to discover and listen to Dharma Seed talks.",
  applicationName: "Stillpoint",
  manifest: "/manifest.webmanifest",
  icons: [{ rel: "icon", url: "/favicon.svg", type: "image/svg+xml" }],
};

export const viewport: Viewport = {
  themeColor: "#121a2b",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <PwaRegistration />
        <StillpointProvider>
          <SiteShell>{children}</SiteShell>
        </StillpointProvider>
      </body>
    </html>
  );
}
