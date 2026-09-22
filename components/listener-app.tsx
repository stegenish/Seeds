"use client";

import { BookOpenText, ChevronDown, Clock3, SlidersHorizontal } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";
import { FilterSelect } from "@/components/filter-select";
import { QuickListenActions } from "@/components/quick-listen-actions";
import { TalkSelection } from "@/components/talk-selection";
import { TeacherFilter } from "@/components/teacher-filter";
import { TeacherPickerSheet } from "@/components/teacher-picker-sheet";
import { TopicFilter } from "@/components/topic-filter";
import { useStillpoint } from "@/components/stillpoint-provider";
import { DEFAULT_FILTERS } from "@/lib/domain/filters";
import { filterTalks } from "@/lib/domain/selection";
import type { RecordingKindFilter, SelectionFilters } from "@/lib/domain/talk";
import { formatRefinementSummary } from "@/lib/presentation/refinements";
import { getTeacherNames } from "@/lib/presentation/teachers";
import { getStorageUnavailable, subscribeStorage } from "@/lib/user/safe-storage";

export function ListenerApp() {
  const storageUnavailable = useSyncExternalStore(
    subscribeStorage,
    getStorageUnavailable,
    () => false,
  );
  const app = useStillpoint();
  const {
    talks,
    teachers,
    syncState,
    retry,
    currentTalk,
    lastPlayedTalk,
    teacherById,
    favoriteTalkIds,
    favoriteTeacherIds,
    startTalk,
    selectAndStart,
    toggleTalkFavorite,
    toggleTeacherFavorite,
  } = app;
  const [filters, setFilters] = useState<SelectionFilters>(DEFAULT_FILTERS);
  const [selectionMessage, setSelectionMessage] = useState<string | null>(null);
  const [teacherPickerKind, setTeacherPickerKind] = useState<RecordingKindFilter | null>(null);
  const counts = useMemo(
    () => ({
      all: filterTalks(talks, { ...filters, kind: "all" }).length,
      talk: filterTalks(talks, { ...filters, kind: "talk" }).length,
      "guided-meditation": filterTalks(talks, { ...filters, kind: "guided-meditation" }).length,
    }),
    [talks, filters],
  );
  const selectedTeacherName =
    filters.teacherId === null ? null : teacherById.get(filters.teacherId)?.name;
  const hasRefinements =
    filters.topicIds.length > 0 ||
    filters.teacherId !== null ||
    filters.languageId !== 1 ||
    filters.maximumDurationMinutes !== null;

  function playRandom(nextFilters: SelectionFilters) {
    const result = selectAndStart(nextFilters);
    if (!result.talk)
      setSelectionMessage(
        talks.length === 0
          ? "The archive is still preparing. Try again when the first talks arrive."
          : "No synchronized recordings match these choices. Try clearing a refinement.",
      );
    else {
      setFilters(nextFilters);
      setSelectionMessage(
        result.historyWasReset
          ? "You selected every recording in this pool, so the shuffle started again."
          : null,
      );
    }
  }

  return (
    <main className="picker" id="top" aria-labelledby="picker-title">
      <div className="picker-intro">
        <h1 id="picker-title">Listen now</h1>
        <p className="lede">One tap starts a teaching.</p>
      </div>
      <QuickListenActions
        counts={counts}
        activeKind={currentTalk ? filters.kind : null}
        isPreparing={
          talks.length === 0 && (syncState.status === "loading" || syncState.status === "syncing")
        }
        lastTalk={currentTalk ? null : lastPlayedTalk}
        lastTeacherNames={lastPlayedTalk ? getTeacherNames(lastPlayedTalk, teacherById) : ""}
        onListen={(kind) => playRandom({ ...filters, kind })}
        onChooseTeacher={setTeacherPickerKind}
        onContinue={() => {
          if (lastPlayedTalk) startTalk(lastPlayedTalk);
        }}
      />
      {selectionMessage ? <p className="selection-message">{selectionMessage}</p> : null}
      {storageUnavailable ? (
        <p className="selection-message" role="status">
          Listening still works. Preferences are kept for this session, but may not survive closing
          the app because device storage is unavailable.
        </p>
      ) : null}
      {syncState.status === "error" ? (
        <div className="selection-message" role="alert">
          <p>{syncState.message} Cached recordings remain available.</p>
          <button type="button" className="clear-button" onClick={retry}>
            Retry archive sync
          </button>
        </div>
      ) : null}
      {currentTalk ? (
        <TalkSelection
          talk={currentTalk}
          teachers={teacherById}
          favoriteTeacherIds={favoriteTeacherIds}
          isFavorite={favoriteTalkIds.includes(currentTalk.id)}
          onFavorite={toggleTalkFavorite}
          onTeacherFavorite={toggleTeacherFavorite}
          onPlayAnother={() => playRandom(filters)}
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
          <TopicFilter
            selectedIds={filters.topicIds}
            onToggle={(topicId) =>
              setFilters((current) => ({
                ...current,
                topicIds: current.topicIds.includes(topicId)
                  ? current.topicIds.filter((id) => id !== topicId)
                  : [...current.topicIds, topicId],
              }))
            }
          />
          <TeacherFilter
            teachers={teachers}
            selectedId={filters.teacherId}
            favoriteIds={favoriteTeacherIds}
            onFavorite={toggleTeacherFavorite}
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
              onClick={() => setFilters((current) => ({ ...DEFAULT_FILTERS, kind: current.kind }))}
            >
              Clear refinements
            </button>
          ) : null}
        </div>
      </details>
      {teacherPickerKind ? (
        <TeacherPickerSheet
          kind={teacherPickerKind}
          filters={filters}
          talks={talks}
          teachers={teachers}
          favoriteIds={favoriteTeacherIds}
          onFavorite={toggleTeacherFavorite}
          onClose={() => setTeacherPickerKind(null)}
          onChoose={(teacherId) => {
            playRandom({ ...filters, kind: teacherPickerKind, teacherId });
            setTeacherPickerKind(null);
          }}
        />
      ) : null}
    </main>
  );
}
