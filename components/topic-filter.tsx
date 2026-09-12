import { ChevronDown, Search } from "lucide-react";
import { FEATURED_TOPIC_IDS, TOPICS, getTopic } from "@/lib/domain/topics";

export function TopicFilter({
  selectedIds,
  onToggle,
}: {
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <fieldset>
      <legend>Topics · choose any</legend>
      <div className="topic-list">
        {FEATURED_TOPIC_IDS.map((topicId) => {
          const topic = getTopic(topicId);
          return topic ? (
            <TopicChip
              key={topic.id}
              id={topic.id}
              label={topic.label}
              selected={selectedIds.includes(topic.id)}
              onToggle={onToggle}
            />
          ) : null;
        })}
      </div>
      <details className="topic-drawer">
        <summary>
          <span>
            <Search size={16} aria-hidden="true" /> Browse all {TOPICS.length} topics
          </span>
          <ChevronDown size={17} aria-hidden="true" />
        </summary>
        <div className="topic-groups">
          {[...new Set(TOPICS.map((topic) => topic.group))].map((group) => (
            <section key={group} aria-labelledby={`topic-group-${slugify(group)}`}>
              <h2 id={`topic-group-${slugify(group)}`}>{group}</h2>
              <div className="topic-list">
                {TOPICS.filter((topic) => topic.group === group).map((topic) => (
                  <TopicChip
                    key={topic.id}
                    id={topic.id}
                    label={topic.label}
                    selected={selectedIds.includes(topic.id)}
                    onToggle={onToggle}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </details>
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

function slugify(value: string): string {
  return value.toLocaleLowerCase("en").replace(/[^a-z0-9]+/g, "-");
}
