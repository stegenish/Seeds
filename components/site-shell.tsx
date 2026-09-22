"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { CatalogStatus } from "@/components/catalog-status";
import { useStillpoint } from "@/components/stillpoint-provider";

export function SiteShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { currentTalk, syncState, talks } = useStillpoint();
  return (
    <div className={`app-shell ${currentTalk ? "has-player" : ""}`}>
      <header className="topbar">
        <Link className="wordmark" href="/" aria-label="Stillpoint home">
          <span className="wordmark-mark" aria-hidden="true">
            ◉
          </span>
          Stillpoint
        </Link>
        <nav className="primary-nav" aria-label="Primary navigation">
          <Link href="/" aria-current={path === "/" ? "page" : undefined}>
            Listen
          </Link>
          <Link href="/favorites" aria-current={path === "/favorites" ? "page" : undefined}>
            Favorites
          </Link>
        </nav>
        <div className="topbar-actions">
          <a
            className="donation-link"
            href="https://dharmaseed.org/about/donation/"
            target="_blank"
            rel="noreferrer"
          >
            Donate
          </a>
          <CatalogStatus state={syncState} talkCount={talks.length} />
        </div>
      </header>
      {children}
      <footer className="site-footer">
        <p>
          An unofficial, noncommercial listener. Audio is served by Dharma Seed and remains
          unmodified.
        </p>
        <a
          href="https://creativecommons.org/licenses/by-nc-nd/4.0/"
          target="_blank"
          rel="noreferrer"
        >
          CC BY-NC-ND 4.0 <ExternalLink size={13} aria-hidden="true" />
        </a>
      </footer>
    </div>
  );
}
