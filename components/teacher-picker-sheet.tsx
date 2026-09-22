"use client";

import { Heart, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { filterTalks } from "@/lib/domain/selection";
import { normalizeText } from "@/lib/domain/text";
import type { RecordingKindFilter, SelectionFilters, Talk, Teacher } from "@/lib/domain/talk";

const LABELS: Record<RecordingKindFilter, string> = {
  talk: "Dhamma talks",
  "guided-meditation": "guided meditations",
  all: "any recording",
};

export function TeacherPickerSheet({
  kind,
  filters,
  talks,
  teachers,
  favoriteIds,
  onFavorite,
  onChoose,
  onClose,
}: {
  kind: RecordingKindFilter;
  filters: SelectionFilters;
  talks: Talk[];
  teachers: Teacher[];
  favoriteIds: number[];
  onFavorite: (id: number) => void;
  onChoose: (id: number) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = sheetRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
  const visible = useMemo(() => {
    const normalized = normalizeText(query);
    const pool = normalized
      ? teachers.filter((teacher) => normalizeText(teacher.name).includes(normalized))
      : teachers.filter((teacher) => favoriteIds.includes(teacher.id));
    return pool.slice(0, 20).map((teacher) => ({
      teacher,
      count: filterTalks(talks, { ...filters, kind, teacherId: teacher.id }).length,
    }));
  }, [favoriteIds, filters, kind, query, talks, teachers]);
  return (
    <div
      className="sheet-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={sheetRef}
        className="teacher-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="teacher-sheet-title"
      >
        <div className="sheet-handle" aria-hidden="true" />
        <header>
          <div>
            <p className="eyebrow">Play by teacher</p>
            <h2 id="teacher-sheet-title">Choose for {LABELS[kind]}</h2>
          </div>
          <button
            ref={closeRef}
            className="sheet-close"
            type="button"
            onClick={onClose}
            aria-label="Close teacher chooser"
          >
            <X />
          </button>
        </header>
        <p className="sheet-context">Your topic, language, and duration refinements still apply.</p>
        <span className="search-input">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            aria-label="Find teachers to favorite"
            placeholder="Find teachers to favorite"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </span>
        <div className="teacher-choice-list">
          {visible.length ? (
            visible.map(({ teacher, count }) => (
              <div className="teacher-choice" key={teacher.id}>
                <button
                  type="button"
                  className="teacher-choice-main"
                  disabled={count === 0}
                  onClick={() => onChoose(teacher.id)}
                >
                  <strong>{teacher.name}</strong>
                  <small>
                    {count === 0
                      ? "No matches with current refinements"
                      : `${count.toLocaleString()} matching`}
                  </small>
                </button>
                <button
                  type="button"
                  className={`favorite-teacher-button ${favoriteIds.includes(teacher.id) ? "is-favorite" : ""}`}
                  onClick={() => onFavorite(teacher.id)}
                  aria-label={`${favoriteIds.includes(teacher.id) ? "Remove" : "Add"} ${teacher.name} ${favoriteIds.includes(teacher.id) ? "from" : "to"} favorite teachers`}
                >
                  <Heart
                    size={19}
                    fill={favoriteIds.includes(teacher.id) ? "currentColor" : "none"}
                  />
                </button>
              </div>
            ))
          ) : (
            <div className="sheet-empty">
              <p>{query ? "No teachers found." : "No favorite teachers yet."}</p>
              <small>Search above, then tap the heart to add one.</small>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
