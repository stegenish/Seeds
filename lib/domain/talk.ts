export type RecordingKind = "talk" | "guided-meditation" | "other";

export interface Talk {
  id: number;
  title: string;
  description: string;
  recordedAt: string | null;
  durationMinutes: number | null;
  recordingType: string;
  kind: RecordingKind;
  topicIds: string[];
  teacherIds: number[];
  venueId: number | null;
  retreatId: number | null;
  languageId: number | null;
  audioUrl: string;
  sourceUrl: string;
}

export interface Teacher {
  id: number;
  name: string;
  bio: string;
  website: string | null;
  donationUrl: string | null;
  photoUrl: string | null;
  isPublic: boolean;
}

export type RecordingKindFilter = "all" | "talk" | "guided-meditation";

export interface SelectionFilters {
  kind: RecordingKindFilter;
  topicIds: string[];
  teacherId: number | null;
  languageId: number | null;
  maximumDurationMinutes: number | null;
}
