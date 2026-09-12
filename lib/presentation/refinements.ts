import type { SelectionFilters } from "@/lib/domain/talk";
import { getTopic } from "@/lib/domain/topics";

export function formatRefinementSummary(
  filters: SelectionFilters,
  teacherName?: string | null,
): string {
  const topics =
    filters.topicIds.length === 0
      ? "Any topic"
      : filters.topicIds.map((id) => getTopic(id)?.label ?? id).join(", ");
  const teacher = teacherName ?? (filters.teacherId === null ? "Any teacher" : "Teacher selected");
  return [
    topics,
    teacher,
    filters.maximumDurationMinutes === null ? null : `Up to ${filters.maximumDurationMinutes} min`,
    filters.languageId === 1 ? "English" : "Any language",
  ]
    .filter(Boolean)
    .join(" · ");
}
