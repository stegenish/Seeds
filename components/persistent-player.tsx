"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Talk } from "@/lib/domain/talk";
import { readPlaybackProgress, savePlaybackProgress } from "@/lib/user/preferences";

export function PersistentPlayer({
  talk,
  teacherNames,
  onClose,
}: {
  talk: Talk;
  teacherNames: string;
  onClose: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const lastSavedAt = useRef(0);

  useEffect(() => {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: talk.title,
        artist: teacherNames,
        album: "Dharma Seed",
      });
    }
  }, [talk, teacherNames]);

  function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play();
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
      <button className="player-toggle" type="button" onClick={togglePlayback}>
        {isPlaying ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
        <span className="sr-only">{isPlaying ? "Pause" : "Play"}</span>
      </button>
      <div className="player-copy">
        <strong>{talk.title}</strong>
        <span>{teacherNames}</span>
      </div>
      <audio
        ref={audioRef}
        src={talk.audioUrl}
        preload="metadata"
        controls
        autoPlay
        onLoadedMetadata={restoreProgress}
        onPlay={() => setIsPlaying(true)}
        onPause={() => {
          setIsPlaying(false);
          storeProgress();
        }}
        onTimeUpdate={storeProgress}
      />
      <button className="player-close" type="button" onClick={onClose} aria-label="Close player">
        ×
      </button>
    </aside>
  );
}
