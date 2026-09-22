"use client";

import { Heart, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { Teacher } from "@/lib/domain/talk";
import { normalizeText } from "@/lib/domain/text";

export function TeacherFilter({
  teachers,
  selectedId,
  onSelect,
  favoriteIds,
  onFavorite,
}: {
  teachers: Teacher[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  favoriteIds: number[];
  onFavorite: (id: number) => void;
}) {
  const [query, setQuery] = useState("");
  const selectedTeacher = teachers.find((teacher) => teacher.id === selectedId);
  const matches = useMemo(() => {
    const normalized = normalizeText(query);
    if (!normalized) return [];
    return teachers
      .filter((teacher) => normalizeText(teacher.name).includes(normalized))
      .slice(0, 8);
  }, [query, teachers]);

  return (
    <div className="teacher-filter">
      <label className="field-label" htmlFor="teacher-search">
        Teacher
      </label>
      {selectedTeacher ? (
        <div className="selected-teacher-row">
          <button className="selected-teacher" type="button" onClick={() => onSelect(null)}>
            <span>{selectedTeacher.name}</span>
            <X size={16} aria-hidden="true" />
            <span className="sr-only">Remove teacher filter</span>
          </button>
          <button
            className={`selected-teacher-favorite ${favoriteIds.includes(selectedTeacher.id) ? "is-favorite" : ""}`}
            type="button"
            onClick={() => onFavorite(selectedTeacher.id)}
            aria-label={`${favoriteIds.includes(selectedTeacher.id) ? "Remove" : "Add"} ${selectedTeacher.name} ${favoriteIds.includes(selectedTeacher.id) ? "from" : "to"} favorite teachers`}
          >
            <Heart
              size={18}
              fill={favoriteIds.includes(selectedTeacher.id) ? "currentColor" : "none"}
            />
          </button>
        </div>
      ) : (
        <>
          <span className="search-input">
            <Search size={17} aria-hidden="true" />
            <input
              id="teacher-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search teachers"
              autoComplete="off"
            />
          </span>
          {query.trim() ? (
            <div className="teacher-results" aria-label="Teacher results">
              {matches.length > 0 ? (
                matches.map((teacher) => (
                  <div className="teacher-result" key={teacher.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(teacher.id);
                        setQuery("");
                      }}
                    >
                      {teacher.name}
                    </button>
                    <button
                      type="button"
                      className={favoriteIds.includes(teacher.id) ? "is-favorite" : ""}
                      onClick={() => onFavorite(teacher.id)}
                      aria-label={`${favoriteIds.includes(teacher.id) ? "Remove" : "Add"} ${teacher.name} ${favoriteIds.includes(teacher.id) ? "from" : "to"} favorite teachers`}
                    >
                      <Heart
                        size={17}
                        fill={favoriteIds.includes(teacher.id) ? "currentColor" : "none"}
                      />
                    </button>
                  </div>
                ))
              ) : (
                <p>No teachers found</p>
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
