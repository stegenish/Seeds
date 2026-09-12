import { ExternalLink, Heart, Play, RefreshCw } from "lucide-react";
import type { Talk } from "@/lib/domain/talk";
import { getTopic } from "@/lib/domain/topics";
import { formatDate, formatDuration } from "@/lib/presentation/format";

export function TalkSelection({
  talk,
  teacherNames,
  isFavorite,
  onFavorite,
  onPlay,
  onChooseAgain,
}: {
  talk: Talk;
  teacherNames: string;
  isFavorite: boolean;
  onFavorite: (id: number) => void;
  onPlay: (talk: Talk) => void;
  onChooseAgain: () => void;
}) {
  return (
    <article className="selection-card" aria-live="polite">
      <div className="selection-kicker">
        <span>Your teaching</span>
        <button
          className={`icon-button ${isFavorite ? "is-favorite" : ""}`}
          type="button"
          onClick={() => onFavorite(talk.id)}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart size={19} fill={isFavorite ? "currentColor" : "none"} aria-hidden="true" />
        </button>
      </div>
      <div>
        <h2>{talk.title}</h2>
        <p className="teacher-name">{teacherNames}</p>
      </div>
      <div className="talk-meta">
        {talk.durationMinutes ? <span>{formatDuration(talk.durationMinutes)}</span> : null}
        {talk.recordedAt ? <span>{formatDate(talk.recordedAt)}</span> : null}
      </div>
      {talk.description ? <p className="talk-description">{talk.description}</p> : null}
      {talk.topicIds.length > 0 ? (
        <div className="matched-topics" aria-label="Matched topics">
          {talk.topicIds.slice(0, 4).map((topicId) => (
            <span key={topicId}>{getTopic(topicId)?.label ?? topicId}</span>
          ))}
        </div>
      ) : null}
      <div className="selection-actions">
        <button className="play-button" type="button" onClick={() => onPlay(talk)}>
          <Play size={19} fill="currentColor" aria-hidden="true" /> Play
        </button>
        <button className="again-button" type="button" onClick={onChooseAgain}>
          <RefreshCw size={17} aria-hidden="true" /> Choose again
        </button>
      </div>
      <a className="source-link" href={talk.sourceUrl} target="_blank" rel="noreferrer">
        Original on Dharma Seed <ExternalLink size={13} aria-hidden="true" />
      </a>
    </article>
  );
}
