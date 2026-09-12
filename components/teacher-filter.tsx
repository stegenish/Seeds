"use client";

import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { Teacher } from "@/lib/domain/talk";

export function TeacherFilter({
  teachers,
  selectedId,
  onSelect,
}: {
  teachers: Teacher[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}) {
  const [query, setQuery] = useState("");
  const selectedTeacher = teachers.find((teacher) => teacher.id === selectedId);
  const matches = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("en");
    if (!normalized) return [];
    return teachers
      .filter((teacher) => teacher.name.toLocaleLowerCase("en").includes(normalized))
      .slice(0, 8);
  }, [query, teachers]);

  return (
    <div className="teacher-filter">
      <label className="field-label" htmlFor="teacher-search">
        Teacher
      </label>
      {selectedTeacher ? (
        <button className="selected-teacher" type="button" onClick={() => onSelect(null)}>
          <span>{selectedTeacher.name}</span>
          <X size={16} aria-hidden="true" />
          <span className="sr-only">Remove teacher filter</span>
        </button>
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
                  <button
                    type="button"
                    key={teacher.id}
                    onClick={() => {
                      onSelect(teacher.id);
                      setQuery("");
                    }}
                  >
                    {teacher.name}
                  </button>
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
