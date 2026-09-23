import { ExternalLink, Heart, Play } from "lucide-react";
import type { Talk } from "@/lib/domain/talk";
import { formatDuration } from "@/lib/presentation/format";

export function RecordingListRow({
  talk,
  teacherNames,
  context,
  isFavorite,
  onPlay,
  onFavorite,
}: {
  talk: Talk;
  teacherNames: string;
  context?: string;
  isFavorite: boolean;
  onPlay: () => void;
  onFavorite: () => void;
}) {
  return (
    <article className="favorite-talk-card">
      <button className="favorite-talk-main" type="button" onClick={onPlay}>
        <span className="row-play">
          <Play size={17} fill="currentColor" />
        </span>
        <span>
          <strong>{talk.title}</strong>
          <small>
            {context ? `${context} · ` : ""}
            {teacherNames}
            {talk.durationMinutes ? ` · ${formatDuration(talk.durationMinutes)}` : ""}
          </small>
        </span>
      </button>
      <div className="favorite-row-actions">
        <a
          href={talk.sourceUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open ${talk.title} on Dharma Seed`}
        >
          <ExternalLink size={18} />
        </a>
        <button
          className={`remove-favorite-button ${isFavorite ? "is-favorite" : ""}`}
          type="button"
          onClick={onFavorite}
          aria-label={`${isFavorite ? "Remove" : "Add"} ${talk.title} ${isFavorite ? "from" : "to"} favorites`}
        >
          <Heart size={19} fill={isFavorite ? "currentColor" : "none"} />
        </button>
      </div>
    </article>
  );
}
