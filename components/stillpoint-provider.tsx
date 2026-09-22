"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import { PersistentPlayer, type PersistentPlayerHandle } from "@/components/persistent-player";
import { useCatalog } from "@/lib/catalog/use-catalog";
import { selectRandomTalk, type RandomSelection } from "@/lib/domain/selection";
import type { SelectionFilters, Talk, Teacher } from "@/lib/domain/talk";
import { getTeacherNames } from "@/lib/presentation/teachers";
import {
  readFavoriteTeachers,
  readFavorites,
  readLastPlayedTalkId,
  readSelectionHistory,
  saveLastPlayedTalkId,
  saveSelectionHistory,
  toggleFavorite,
  toggleFavoriteTeacher,
} from "@/lib/user/preferences";

type Catalog = ReturnType<typeof useCatalog>;
interface StillpointValue {
  talks: Talk[];
  teachers: Teacher[];
  syncState: Catalog["state"];
  retry: Catalog["retry"];
  currentTalk: Talk | null;
  lastPlayedTalk: Talk | null;
  teacherById: Map<number, Teacher>;
  favoriteTalkIds: number[];
  favoriteTeacherIds: number[];
  startTalk: (talk: Talk) => void;
  selectAndStart: (filters: SelectionFilters) => RandomSelection;
  toggleTalkFavorite: (id: number) => void;
  toggleTeacherFavorite: (id: number) => void;
}

const Context = createContext<StillpointValue | null>(null);

export function StillpointProvider({ children }: { children: ReactNode }) {
  const { talks, teachers, state: syncState, retry } = useCatalog();
  const [currentTalkId, setCurrentTalkId] = useState<number | null>(null);
  const [lastPlayedId, setLastPlayedId] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [favoriteTalkIds, setFavoriteTalkIds] = useState<number[]>([]);
  const [favoriteTeacherIds, setFavoriteTeacherIds] = useState<number[]>([]);
  const playerRef = useRef<PersistentPlayerHandle>(null);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      setHistory(readSelectionHistory());
      setFavoriteTalkIds(readFavorites());
      setFavoriteTeacherIds(readFavoriteTeachers());
      setLastPlayedId(readLastPlayedTalkId());
    });
    return () => {
      active = false;
    };
  }, []);

  const teacherById = useMemo(
    () => new Map(teachers.map((teacher) => [teacher.id, teacher])),
    [teachers],
  );
  const currentTalk = talks.find((talk) => talk.id === currentTalkId) ?? null;
  const lastPlayedTalk = talks.find((talk) => talk.id === lastPlayedId) ?? null;

  function startTalk(talk: Talk) {
    flushSync(() => {
      setCurrentTalkId(talk.id);
      setLastPlayedId(talk.id);
    });
    saveLastPlayedTalkId(talk.id);
    void playerRef.current?.play();
  }

  function selectAndStart(filters: SelectionFilters) {
    const result = selectRandomTalk(talks, filters, new Set(history));
    if (result.talk) {
      setHistory(result.nextHistory);
      saveSelectionHistory(result.nextHistory);
      startTalk(result.talk);
    }
    return result;
  }

  const value: StillpointValue = {
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
    toggleTalkFavorite(id) {
      setFavoriteTalkIds(toggleFavorite(id));
    },
    toggleTeacherFavorite(id) {
      setFavoriteTeacherIds(toggleFavoriteTeacher(id));
    },
  };

  return (
    <Context.Provider value={value}>
      {children}
      {currentTalk ? (
        <PersistentPlayer
          ref={playerRef}
          key={currentTalk.id}
          talk={currentTalk}
          teacherNames={getTeacherNames(currentTalk, teacherById)}
          onClose={() => setCurrentTalkId(null)}
        />
      ) : null}
    </Context.Provider>
  );
}

export function useStillpoint() {
  const value = useContext(Context);
  if (!value) throw new Error("useStillpoint must be used inside StillpointProvider");
  return value;
}
