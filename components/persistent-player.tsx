"use client";

import { Pause, Play } from "lucide-react";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { Talk } from "@/lib/domain/talk";
import { readPlaybackProgress, savePlaybackProgress } from "@/lib/user/preferences";

export interface PersistentPlayerHandle {
  play: () => Promise<void>;
}

export const PersistentPlayer = forwardRef<
  PersistentPlayerHandle,
  {
    talk: Talk;
    teacherNames: string;
    onClose: () => void;
  }
>(function PersistentPlayer({ talk, teacherNames, onClose }, ref) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackMessage, setPlaybackMessage] = useState<string | null>(null);
  const lastSavedAt = useRef(0);
  const metadataLoaded = useRef(false);
  const requestId = useRef<symbol | null>(null);

  const requestPlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    const id = Symbol();
    requestId.current = id;
    try {
      await audio.play();
    } catch (error) {
      if (id !== requestId.current) return;
      setIsPlaying(false);
      setPlaybackMessage(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Tap play to start audio"
          : "Audio could not start. Try play again.",
      );
    }
  }, []);
  useImperativeHandle(ref, () => ({ play: requestPlay }), [requestPlay]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    // StrictMode can replay this setup after cleanup removed the source.
    if (!audio.getAttribute("src")) audio.src = talk.audioUrl;
    function flushProgress() {
      // Closing an unloaded track must not erase an earlier saved position.
      if (audio && metadataLoaded.current) savePlaybackProgress(talk.id, audio.currentTime);
    }
    function onVisibility() {
      if (document.visibilityState === "hidden") flushProgress();
    }
    window.addEventListener("pagehide", flushProgress);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      requestId.current = null;
      flushProgress();
      metadataLoaded.current = false;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      window.removeEventListener("pagehide", flushProgress);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [talk.id, talk.audioUrl]);

  useEffect(() => {
    if (!("mediaSession" in navigator) || typeof MediaMetadata === "undefined") return;
    const metadata = new MediaMetadata({
      title: talk.title,
      artist: teacherNames,
      album: "Dharma Seed",
    });
    const session = navigator.mediaSession;
    session.metadata = metadata;
    const handlers: Partial<Record<MediaSessionAction, MediaSessionActionHandler>> = {
      play: () => void requestPlay(),
      pause: () => audioRef.current?.pause(),
      seekto: (details) => {
        const audio = audioRef.current;
        if (audio && details.seekTime !== undefined && Number.isFinite(audio.duration))
          audio.currentTime = Math.max(0, Math.min(details.seekTime, audio.duration));
      },
    };
    for (const [action, handler] of Object.entries(handlers)) {
      try {
        session.setActionHandler(action as MediaSessionAction, handler);
      } catch {
        /* Some browsers expose only a subset of media actions. */
      }
    }
    return () => {
      if (session.metadata !== metadata) return;
      session.metadata = null;
      for (const action of Object.keys(handlers)) {
        try {
          session.setActionHandler(action as MediaSessionAction, null);
        } catch {
          /* Unsupported action. */
        }
      }
    };
  }, [talk.title, teacherNames, requestPlay]);

  function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void requestPlay();
    else audio.pause();
  }

  function storeProgress() {
    const audio = audioRef.current;
    if (!audio || !metadataLoaded.current) return;
    const now = Date.now();
    if (now - lastSavedAt.current >= 5_000 || audio.paused || audio.ended) {
      savePlaybackProgress(talk.id, audio.currentTime);
      lastSavedAt.current = now;
    }
  }

  function restoreProgress() {
    const audio = audioRef.current;
    if (!audio) return;
    metadataLoaded.current = true;
    const saved = readPlaybackProgress(talk.id);
    if (saved > 0 && saved < audio.duration) audio.currentTime = saved;
  }

  return (
    <aside className="player" aria-label="Now playing">
      <button className="player-toggle" type="button" onClick={togglePlayback}>
        {isPlaying ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
        <span className="sr-only">{isPlaying ? "Pause" : "Play"}</span>
      </button>
      <div className="player-copy">
        <strong>{talk.title}</strong>
        <span aria-live="polite">{playbackMessage ?? teacherNames}</span>
      </div>
      <audio
        ref={audioRef}
        src={talk.audioUrl}
        preload="metadata"
        controls
        onLoadedMetadata={restoreProgress}
        onPlay={() => {
          setIsPlaying(true);
          setPlaybackMessage(null);
        }}
        onPlaying={() => {
          setIsPlaying(true);
          setPlaybackMessage(null);
        }}
        onWaiting={() => setPlaybackMessage("Loading audio…")}
        onPause={() => {
          setIsPlaying(false);
          storeProgress();
        }}
        onEnded={() => {
          setIsPlaying(false);
          storeProgress();
          setPlaybackMessage("Recording complete");
        }}
        onError={() => {
          setIsPlaying(false);
          setPlaybackMessage("Audio could not be loaded");
        }}
        onTimeUpdate={storeProgress}
      />
      <button className="player-close" type="button" onClick={onClose} aria-label="Close player">
        ×
      </button>
    </aside>
  );
});
