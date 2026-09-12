"use client";

import { Pause, Play } from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
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

  useImperativeHandle(ref, () => ({
    async play() {
      const audio = audioRef.current;
      if (!audio) return;
      try {
        await audio.play();
      } catch {
        setPlaybackMessage("Tap play to start audio");
      }
    },
  }));

  useEffect(() => {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: talk.title,
        artist: teacherNames,
        album: "Dharma Seed",
      });
    }
  }, [talk, teacherNames]);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        setPlaybackMessage("Audio could not start");
      }
    } else {
      audio.pause();
    }
  }

  function storeProgress() {
    const audio = audioRef.current;
    if (!audio) return;
    const now = Date.now();
    if (now - lastSavedAt.current >= 5_000 || audio.paused) {
      savePlaybackProgress(talk.id, audio.currentTime);
      lastSavedAt.current = now;
    }
  }

  function restoreProgress() {
    const audio = audioRef.current;
    if (!audio) return;
    const savedProgress = readPlaybackProgress(talk.id);
    if (savedProgress > 0 && savedProgress < audio.duration) {
      audio.currentTime = savedProgress;
    }
  }

  return (
    <aside className="player" aria-label="Now playing">
      <button className="player-toggle" type="button" onClick={() => void togglePlayback()}>
        {isPlaying ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
        <span className="sr-only">{isPlaying ? "Pause" : "Play"}</span>
      </button>
      <div className="player-copy">
        <strong>{talk.title}</strong>
        <span>{playbackMessage ?? teacherNames}</span>
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
        onPause={() => {
          setIsPlaying(false);
          storeProgress();
        }}
        onError={() => setPlaybackMessage("Audio could not be loaded")}
        onTimeUpdate={storeProgress}
      />
      <button className="player-close" type="button" onClick={onClose} aria-label="Close player">
        ×
      </button>
    </aside>
  );
});
