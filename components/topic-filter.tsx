"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { TOPICS } from "@/lib/domain/topics";

export function TopicFilter({
  selectedIds,
  onToggle,
}: {
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const visibleTopics = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("en");
    return [...TOPICS]
      .sort((left, right) => left.label.localeCompare(right.label))
      .filter(
        (topic) =>
          !normalized ||
          topic.label.toLocaleLowerCase("en").includes(normalized) ||
          topic.group.toLocaleLowerCase("en").includes(normalized) ||
          topic.id.replaceAll("-", " ").includes(normalized),
      );
  }, [query]);

  return (
    <fieldset>
      <legend>Topics</legend>
      <span className="search-input topic-search">
        <Search size={17} aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search all topics"
          aria-label="Search topics"
        />
      </span>
      <div className="topic-list" aria-label={`${visibleTopics.length} matching topics`}>
        {visibleTopics.map((topic) => (
          <TopicChip
            key={topic.id}
            id={topic.id}
            label={topic.label}
            selected={selectedIds.includes(topic.id)}
            onToggle={onToggle}
          />
        ))}
      </div>
      {visibleTopics.length === 0 ? <p className="empty-filter">No topics found</p> : null}
    </fieldset>
  );
}

function TopicChip({
  id,
  label,
  selected,
  onToggle,
}: {
  id: string;
  label: string;
  selected: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <label className="topic-chip">
      <input type="checkbox" checked={selected} onChange={() => onToggle(id)} />
      <span>{label}</span>
    </label>
  );
}
