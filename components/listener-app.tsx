"use client";

import { BookOpenText, Clock3, ExternalLink, Sparkles, UserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CatalogStatus, type CatalogSyncState } from "@/components/catalog-status";
import { FilterSelect } from "@/components/filter-select";
import { PersistentPlayer } from "@/components/persistent-player";
import { TalkSelection } from "@/components/talk-selection";
import { TopicFilter } from "@/components/topic-filter";
import { getAllTalks, getAllTeachers } from "@/lib/catalog/database";
import { syncCatalog } from "@/lib/catalog/sync";
import { filterTalks, selectRandomTalk } from "@/lib/domain/selection";
import type { RecordingKindFilter, SelectionFilters, Talk, Teacher } from "@/lib/domain/talk";
import {
  addSelectionToHistory,
  readFavorites,
  readSelectionHistory,
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
  const [selectedTalk, setSelectedTalk] = useState<Talk | null>(null);
  const [currentTalk, setCurrentTalk] = useState<Talk | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [syncState, setSyncState] = useState<CatalogSyncState>({ status: "loading" });
  const [selectionMessage, setSelectionMessage] = useState<string | null>(null);
  const syncStarted = useRef(false);

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

  const eligibleCount = useMemo(() => filterTalks(talks, filters).length, [talks, filters]);
  const teacherById = useMemo(
    () => new Map(teachers.map((teacher) => [teacher.id, teacher])),
    [teachers],
  );

  function chooseTeaching() {
    const result = selectRandomTalk(talks, filters, new Set(history));
    if (!result.talk) {
      setSelectionMessage(
        talks.length === 0
          ? "The archive is still preparing. Try again after the first recordings arrive."
          : "No synchronized recordings match these filters. Try widening the pool.",
      );
      return;
    }

    setHistory(addSelectionToHistory(result.talk.id));
    setSelectedTalk(result.talk);
    setSelectionMessage(
      result.historyWasReset
        ? "You reached the end of this listening pool, so it began again."
        : null,
    );
  }

  function changeKind(kind: RecordingKindFilter) {
    setFilters((current) => ({ ...current, kind }));
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

  const hasFilters =
    filters.kind !== "all" ||
    filters.topicIds.length > 0 ||
    filters.teacherId !== null ||
    filters.languageId !== 1 ||
    filters.maximumDurationMinutes !== null;

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
          <p className="eyebrow">Random listening</p>
          <h1 id="picker-title">What would you like to sit with?</h1>
          <p className="lede">Shape a listening pool, then let one teaching find you.</p>
        </div>

        <div className="filters" aria-label="Listening pool filters">
          <fieldset>
            <legend>Kind</legend>
            <div className="segmented-control" aria-label="Recording kind">
              {[
                ["all", "Any recording"],
                ["talk", "Dhamma talk"],
                ["guided-meditation", "Guided meditation"],
              ].map(([value, label]) => (
                <label key={value}>
                  <input
                    type="radio"
                    name="kind"
                    value={value}
                    checked={filters.kind === value}
                    onChange={() => changeKind(value as RecordingKindFilter)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <TopicFilter selectedIds={filters.topicIds} onToggle={toggleTopic} />

          <div className="filter-grid">
            <FilterSelect
              id="teacher"
              label="Teacher"
              icon={<UserRound size={17} aria-hidden="true" />}
              value={filters.teacherId ?? ""}
              onChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  teacherId: value ? Number(value) : null,
                }))
              }
            >
              <option value="">Any teacher</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </FilterSelect>

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

          {hasFilters ? (
            <button
              className="clear-button"
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
            >
              Clear filters
            </button>
          ) : null}
        </div>

        <section className="draw-area" aria-label="Random teaching selection">
          {selectedTalk ? (
            <TalkSelection
              talk={selectedTalk}
              teacherNames={getTeacherNames(selectedTalk, teacherById)}
              isFavorite={favorites.includes(selectedTalk.id)}
              onFavorite={handleFavorite}
              onPlay={setCurrentTalk}
              onChooseAgain={chooseTeaching}
            />
          ) : (
            <>
              <div className="draw-orbit" aria-hidden="true">
                <div className="draw-center">
                  <Sparkles size={27} />
                </div>
              </div>
              <button
                className="draw-button"
                type="button"
                onClick={chooseTeaching}
                disabled={talks.length === 0}
              >
                Choose a teaching
              </button>
              <p className="pool-note">
                {eligibleCount > 0
                  ? `${eligibleCount.toLocaleString()} synchronized recordings in this pool`
                  : talks.length > 0
                    ? "No synchronized recordings match yet"
                    : "Preparing the first recordings on this device"}
              </p>
            </>
          )}
          {selectionMessage ? <p className="selection-message">{selectionMessage}</p> : null}
        </section>
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
          talk={currentTalk}
          teacherNames={getTeacherNames(currentTalk, teacherById)}
          onClose={() => setCurrentTalk(null)}
        />
      ) : null}
    </main>
  );
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
