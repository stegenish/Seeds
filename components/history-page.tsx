"use client";

import { Clock3 } from "lucide-react";
import { RecordingListRow } from "@/components/recording-list-row";
import { useStillpoint } from "@/components/stillpoint-provider";
import { getTeacherNames } from "@/lib/presentation/teachers";

export function HistoryPage() {
  const { listeningHistory, talks, teacherById, favoriteTalkIds, startTalk, toggleTalkFavorite } =
    useStillpoint();
  const rows = listeningHistory.flatMap((entry, index) => {
    const talk = talks.find((candidate) => candidate.id === entry.talkId);
    return talk ? [{ entry, talk, index }] : [];
  });
  const missing = listeningHistory.length - rows.length;

  return (
    <main className="favorites-page" aria-labelledby="history-title">
      <div className="favorites-heading">
        <h1 id="history-title">History</h1>
        <p>Your 50 most recent listens, newest first. Saved only on this device.</p>
      </div>
      {rows.length ? (
        <div className="favorite-list history-list">
          {rows.map(({ entry, talk, index }) => (
            <RecordingListRow
              key={`${entry.listenedAt}-${entry.talkId}-${index}`}
              talk={talk}
              teacherNames={getTeacherNames(talk, teacherById)}
              context={formatListeningTime(entry.listenedAt)}
              isFavorite={favoriteTalkIds.includes(talk.id)}
              onPlay={() => startTalk(talk)}
              onFavorite={() => toggleTalkFavorite(talk.id)}
            />
          ))}
        </div>
      ) : (
        <div className="favorites-empty">
          <Clock3 size={24} />
          <p>Play a recording and it will appear here once playback begins.</p>
        </div>
      )}
      {missing > 0 ? (
        <p className="selection-message">
          {missing} history {missing === 1 ? "entry is" : "entries are"} waiting for catalog
          metadata.
        </p>
      ) : null}
    </main>
  );
}

function formatListeningTime(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}
