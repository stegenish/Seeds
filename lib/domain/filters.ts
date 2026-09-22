import type { SelectionFilters } from "./talk";

export const DEFAULT_FILTERS: SelectionFilters = {
  kind: "all",
  topicIds: [],
  teacherId: null,
  languageId: 1,
  maximumDurationMinutes: null,
};
