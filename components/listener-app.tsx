"use client";

import { BookOpenText, ChevronDown, Clock3, ExternalLink, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { CatalogStatus, type CatalogSyncState } from "@/components/catalog-status";
import { FilterSelect } from "@/components/filter-select";
import { PersistentPlayer, type PersistentPlayerHandle } from "@/components/persistent-player";
import { QuickListenActions } from "@/components/quick-listen-actions";
import { TalkSelection } from "@/components/talk-selection";
import { TeacherFilter } from "@/components/teacher-filter";
import { TopicFilter } from "@/components/topic-filter";
import { getAllTalks, getAllTeachers } from "@/lib/catalog/database";
import { syncCatalog } from "@/lib/catalog/sync";
import { filterTalks, selectRandomTalk } from "@/lib/domain/selection";
import type { RecordingKindFilter, SelectionFilters, Talk, Teacher } from "@/lib/domain/talk";
import {
  addSelectionToHistory,
  readFavorites,
  readLastPlayedTalkId,
  readSelectionHistory,
  saveLastPlayedTalkId,
  toggleFavorite,
} from "@/lib/user/preferences";

const LICENSE_URL = "https://creativecommons.org/licenses/by-nc-nd/4.0/";
const DHARMA_SEED_DONATION_URL = "https://dharmaseed.org/about/donation/";

const EMPTY_FILTERS: SelectionFilters = {
  kind: "all",
  topicIds: [],
  teacherId: null,
  languageId: 1,
  maximumDurationMinutes: null,
};

export function ListenerApp() {
  const [talks, setTalks] = useState<Talk[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [filters, setFilters] = useState<SelectionFilters>(EMPTY_FILTERS);
  const [currentTalk, setCurrentTalk] = useState<Talk | null>(null);
  const [lastPlayedId, setLastPlayedId] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [syncState, setSyncState] = useState<CatalogSyncState>({ status: "loading" });
  const [selectionMessage, setSelectionMessage] = useState<string | null>(null);
  const syncStarted = useRef(false);
  const playerRef = useRef<PersistentPlayerHandle>(null);

  useEffect(() => {
    if (syncStarted.current) return;
    syncStarted.current = true;
    const controller = new AbortController();

    async function prepareCatalog() {
      try {
        const [storedTalks, storedTeachers] = await Promise.all([getAllTalks(), getAllTeachers()]);
        setTalks(storedTalks);
        setTeachers(storedTeachers);
        setHistory(readSelectionHistory());
        setFavorites(readFavorites());
        setLastPlayedId(readLastPlayedTalkId());
        if (storedTalks.length > 0) setSyncState({ status: "ready" });

        await syncCatalog({
          signal: controller.signal,
          onProgress(progress) {
            setSyncState({ status: "syncing", progress });
            if (progress.addedTalks.length > 0) {
              setTalks((current) => mergeById(current, progress.addedTalks));
            }
            if (progress.addedTeachers.length > 0) {
              setTeachers((current) =>
                mergeById(current, progress.addedTeachers)
                  .filter((teacher) => teacher.isPublic)
                  .sort((a, b) => a.name.localeCompare(b.name)),
              );
            }
          },
        });
        setSyncState({ status: "ready" });
      } catch (error) {
        if (controller.signal.aborted) return;
        const message =
          error instanceof Error ? error.message : "The archive could not be prepared.";
        setSyncState({ status: "error", message });
      }
    }

    void prepareCatalog();
    return () => controller.abort();
  }, []);

  const teacherById = useMemo(
    () => new Map(teachers.map((teacher) => [teacher.id, teacher])),
    [teachers],
  );
  const counts = useMemo(
    () => ({
      all: filterTalks(talks, { ...filters, kind: "all" }).length,
      talk: filterTalks(talks, { ...filters, kind: "talk" }).length,
      "guided-meditation": filterTalks(talks, {
        ...filters,
        kind: "guided-meditation",
      }).length,
    }),
    [talks, filters],
  );
  const lastPlayedTalk = useMemo(
    () => talks.find((talk) => talk.id === lastPlayedId) ?? null,
    [lastPlayedId, talks],
  );
  const selectedTeacherName =
    filters.teacherId === null ? null : teacherById.get(filters.teacherId)?.name;
  const hasRefinements =
    filters.topicIds.length > 0 ||
    filters.teacherId !== null ||
    filters.languageId !== 1 ||
    filters.maximumDurationMinutes !== null;

  function startTalk(talk: Talk) {
    flushSync(() => {
      setCurrentTalk(talk);
      setLastPlayedId(talk.id);
      setSelectionMessage(null);
    });
    saveLastPlayedTalkId(talk.id);
    void playerRef.current?.play();
  }

  function playRandom(kind: RecordingKindFilter) {
    const nextFilters = { ...filters, kind };
    const result = selectRandomTalk(talks, nextFilters, new Set(history));
    if (!result.talk) {
      setSelectionMessage(
        talks.length === 0
          ? "The archive is still preparing. Try again when the first talks arrive."
          : "No synchronized recordings match these choices. Try clearing a refinement.",
      );
      return;
    }

    setFilters(nextFilters);
    setHistory(addSelectionToHistory(result.talk.id));
    startTalk(result.talk);
    if (result.historyWasReset) {
      setSelectionMessage("You heard every talk in this pool, so the shuffle started again.");
    }
  }

  function toggleTopic(topicId: string) {
    setFilters((current) => ({
      ...current,
      topicIds: current.topicIds.includes(topicId)
        ? current.topicIds.filter((id) => id !== topicId)
        : [...current.topicIds, topicId],
    }));
  }

  function handleFavorite(talkId: number) {
    setFavorites(toggleFavorite(talkId));
  }

  return (
    <main className={`app-shell ${currentTalk ? "has-player" : ""}`}>
      <header className="topbar">
        <a className="wordmark" href="#top" aria-label="Stillpoint home">
          <span className="wordmark-mark" aria-hidden="true">
            ◉
          </span>
          Stillpoint
        </a>
        <div className="topbar-actions">
          <a
            className="donation-link"
            href={DHARMA_SEED_DONATION_URL}
            target="_blank"
            rel="noreferrer"
          >
            Donate to DharmaSeed
          </a>
          <CatalogStatus state={syncState} talkCount={talks.length} />
        </div>
      </header>

      <section className="picker" id="top" aria-labelledby="picker-title">
        <div className="picker-intro">
          <h1 id="picker-title">Listen now</h1>
          <p className="lede">One tap starts a teaching.</p>
        </div>

        <QuickListenActions
          counts={counts}
          activeKind={currentTalk ? filters.kind : null}
          isPreparing={talks.length === 0}
          lastTalk={currentTalk ? null : lastPlayedTalk}
          lastTeacherNames={lastPlayedTalk ? getTeacherNames(lastPlayedTalk, teacherById) : ""}
          onListen={playRandom}
          onContinue={() => {
            if (lastPlayedTalk) startTalk(lastPlayedTalk);
          }}
        />

        {selectionMessage ? <p className="selection-message">{selectionMessage}</p> : null}

        {currentTalk ? (
          <TalkSelection
            talk={currentTalk}
            teacherNames={getTeacherNames(currentTalk, teacherById)}
            isFavorite={favorites.includes(currentTalk.id)}
            onFavorite={handleFavorite}
            onPlayAnother={() => playRandom(filters.kind)}
          />
        ) : null}

        <details className="refine-panel">
          <summary>
            <SlidersHorizontal size={19} aria-hidden="true" />
            <span>
              <strong>Refine the selection</strong>
              <small>{formatRefinementSummary(filters, selectedTeacherName)}</small>
            </span>
            <ChevronDown className="refine-chevron" size={18} aria-hidden="true" />
          </summary>

          <div className="filters" aria-label="Listening refinements">
            <TopicFilter selectedIds={filters.topicIds} onToggle={toggleTopic} />

            <TeacherFilter
              teachers={teachers}
              selectedId={filters.teacherId}
              onSelect={(teacherId) => setFilters((current) => ({ ...current, teacherId }))}
            />

            <details className="more-options">
              <summary>Duration and language</summary>
              <div className="filter-grid">
                <FilterSelect
                  id="duration"
                  label="Duration"
                  icon={<Clock3 size={17} aria-hidden="true" />}
                  value={filters.maximumDurationMinutes ?? ""}
                  onChange={(value) =>
                    setFilters((current) => ({
                      ...current,
                      maximumDurationMinutes: value ? Number(value) : null,
                    }))
                  }
                >
                  <option value="">Any length</option>
                  <option value="15">Up to 15 minutes</option>
                  <option value="30">Up to 30 minutes</option>
                  <option value="45">Up to 45 minutes</option>
                  <option value="60">Up to 1 hour</option>
                </FilterSelect>

                <FilterSelect
                  id="language"
                  label="Language"
                  icon={<BookOpenText size={17} aria-hidden="true" />}
                  value={filters.languageId ?? ""}
                  onChange={(value) =>
                    setFilters((current) => ({
                      ...current,
                      languageId: value ? Number(value) : null,
                    }))
                  }
                >
                  <option value="1">English</option>
                  <option value="">Any language</option>
                </FilterSelect>
              </div>
            </details>

            {hasRefinements ? (
              <button
                className="clear-button"
                type="button"
                onClick={() => setFilters((current) => ({ ...EMPTY_FILTERS, kind: current.kind }))}
              >
                Clear refinements
              </button>
            ) : null}
          </div>
        </details>
      </section>

      <footer className="site-footer">
        <p>
          An unofficial, noncommercial listener. Audio is served by Dharma Seed and remains
          unmodified. Each selection credits its teacher and original source.
        </p>
        <a href={LICENSE_URL} target="_blank" rel="noreferrer">
          CC BY-NC-ND 4.0 <ExternalLink size={13} aria-hidden="true" />
        </a>
      </footer>

      {currentTalk ? (
        <PersistentPlayer
          ref={playerRef}
          key={currentTalk.id}
          talk={currentTalk}
          teacherNames={getTeacherNames(currentTalk, teacherById)}
          onClose={() => setCurrentTalk(null)}
        />
      ) : null}
    </main>
  );
}

function formatRefinementSummary(
  filters: SelectionFilters,
  teacherName: string | undefined | null,
): string {
  const topics =
    filters.topicIds.length === 0
      ? "Any topic"
      : `${filters.topicIds.length} topic${filters.topicIds.length === 1 ? "" : "s"}`;
  const teacher = teacherName ?? (filters.teacherId === null ? "Any teacher" : "Teacher selected");
  return `${topics} · ${teacher}`;
}

function getTeacherNames(talk: Talk, teachers: ReadonlyMap<number, Teacher>): string {
  const names = talk.teacherIds
    .map((teacherId) => teachers.get(teacherId)?.name)
    .filter((name): name is string => Boolean(name));
  return names.length > 0 ? names.join(" & ") : "Teacher attribution loading";
}

function mergeById<T extends { id: number }>(current: T[], incoming: T[]): T[] {
  const merged = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) merged.set(item.id, item);
  return [...merged.values()];
}
