"use client";

import { ExternalLink, Heart, Play, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useStillpoint } from "@/components/stillpoint-provider";
import { DEFAULT_FILTERS } from "@/lib/domain/filters";
import { normalizeText } from "@/lib/domain/text";
import type { RecordingKind, Talk } from "@/lib/domain/talk";
import { formatDuration } from "@/lib/presentation/format";
import { getTeacherNames } from "@/lib/presentation/teachers";

const GROUPS: Array<{ kind: RecordingKind; label: string }> = [
  { kind: "talk", label: "Dhamma talks" },
  { kind: "guided-meditation", label: "Guided meditations" },
  { kind: "other", label: "Other recordings" },
];

export function FavoritesPage() {
  const {
    talks,
    teachers,
    teacherById,
    favoriteTalkIds,
    favoriteTeacherIds,
    startTalk,
    selectAndStart,
    toggleTalkFavorite,
    toggleTeacherFavorite,
  } = useStillpoint();
  const [tab, setTab] = useState<"recordings" | "teachers">("recordings");
  const [query, setQuery] = useState("");
  const [undo, setUndo] = useState<{
    type: "recording" | "teacher";
    id: number;
    label: string;
  } | null>(null);
  const favoriteTalks = useMemo(
    () => talks.filter((talk) => favoriteTalkIds.includes(talk.id)),
    [favoriteTalkIds, talks],
  );
  const favoriteTeachers = teachers.filter(
    (teacher) =>
      favoriteTeacherIds.includes(teacher.id) &&
      normalizeText(teacher.name).includes(normalizeText(query)),
  );
  const missingTalks = favoriteTalkIds.length - favoriteTalks.length;
  return (
    <main className="favorites-page" aria-labelledby="favorites-title">
      <div className="favorites-heading">
        <h1 id="favorites-title">Favorites</h1>
        <p>Saved only on this device.</p>
      </div>
      <div className="favorites-tabs" role="tablist" aria-label="Favorite type">
        <button
          role="tab"
          aria-selected={tab === "recordings"}
          onClick={() => setTab("recordings")}
        >
          Recordings <span>{favoriteTalkIds.length}</span>
        </button>
        <button role="tab" aria-selected={tab === "teachers"} onClick={() => setTab("teachers")}>
          Teachers <span>{favoriteTeacherIds.length}</span>
        </button>
      </div>
      {tab === "recordings" ? (
        <div className="favorite-sections">
          {favoriteTalks.length === 0 ? (
            <Empty text="Favorite a recording while listening and it will appear here." />
          ) : (
            GROUPS.map(({ kind, label }) => {
              const items = favoriteTalks.filter((talk) => talk.kind === kind);
              return items.length ? (
                <section key={kind}>
                  <h2>
                    {label}
                    <span>{items.length}</span>
                  </h2>
                  <div className="favorite-list">
                    {items.map((talk) => (
                      <FavoriteTalk
                        key={talk.id}
                        talk={talk}
                        teacherNames={getTeacherNames(talk, teacherById)}
                        onPlay={() => startTalk(talk)}
                        onRemove={() => {
                          toggleTalkFavorite(talk.id);
                          setUndo({ type: "recording", id: talk.id, label: talk.title });
                        }}
                      />
                    ))}
                  </div>
                </section>
              ) : null;
            })
          )}
          {missingTalks > 0 ? (
            <p className="selection-message">
              {missingTalks} saved {missingTalks === 1 ? "recording is" : "recordings are"} waiting
              for catalog metadata.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="favorite-sections">
          <span className="search-input">
            <Search size={17} aria-hidden="true" />
            <input
              type="search"
              aria-label="Search favorite teachers"
              placeholder="Search favorite teachers"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </span>
          {favoriteTeachers.length ? (
            <div className="favorite-list">
              {favoriteTeachers.map((teacher) => (
                <article className="favorite-teacher-card" key={teacher.id}>
                  <div>
                    <h2>{teacher.name}</h2>
                    <small>
                      {talks
                        .filter((talk) => talk.teacherIds.includes(teacher.id))
                        .length.toLocaleString()}{" "}
                      recordings
                    </small>
                  </div>
                  <div className="favorite-row-actions">
                    <button
                      className="play-row-button"
                      type="button"
                      onClick={() => selectAndStart({ ...DEFAULT_FILTERS, teacherId: teacher.id })}
                    >
                      <Play size={17} fill="currentColor" /> Play anything
                    </button>
                    <button
                      className="remove-favorite-button"
                      type="button"
                      onClick={() => {
                        toggleTeacherFavorite(teacher.id);
                        setUndo({ type: "teacher", id: teacher.id, label: teacher.name });
                      }}
                      aria-label={`Remove ${teacher.name} from favorite teachers`}
                    >
                      <Heart size={19} fill="currentColor" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Empty
              text={
                query
                  ? "No favorite teachers match your search."
                  : "Favorite a teacher from a current recording or the teacher chooser."
              }
            />
          )}
        </div>
      )}
      {undo ? (
        <div className="undo-toast" role="status">
          <span>{undo.label} removed</span>
          <button
            type="button"
            onClick={() => {
              if (undo.type === "recording") toggleTalkFavorite(undo.id);
              else toggleTeacherFavorite(undo.id);
              setUndo(null);
            }}
          >
            Undo
          </button>
        </div>
      ) : null}
    </main>
  );
}

function FavoriteTalk({
  talk,
  teacherNames,
  onPlay,
  onRemove,
}: {
  talk: Talk;
  teacherNames: string;
  onPlay: () => void;
  onRemove: () => void;
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
          className="remove-favorite-button"
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${talk.title} from favorites`}
        >
          <Heart size={19} fill="currentColor" />
        </button>
      </div>
    </article>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="favorites-empty">
      <Heart size={24} />
      <p>{text}</p>
    </div>
  );
}
