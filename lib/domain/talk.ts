import { z } from "zod";

export const recordingKindSchema = z.enum(["talk", "guided-meditation", "other"]);
export type RecordingKind = z.infer<typeof recordingKindSchema>;
export const positiveId = z.number().int().positive();
export const httpUrl = z
  .string()
  .url()
  .refine((value) => /^https?:\/\//.test(value));

export const talkSchema = z.object({
  id: positiveId,
  title: z.string(),
  description: z.string(),
  recordedAt: z.string().nullable(),
  durationMinutes: z.number().nonnegative().nullable(),
  recordingType: z.string(),
  kind: recordingKindSchema,
  topicIds: z.array(z.string()),
  teacherIds: z.array(positiveId),
  venueId: positiveId.nullable(),
  retreatId: positiveId.nullable(),
  languageId: positiveId.nullable(),
  audioUrl: httpUrl,
  sourceUrl: httpUrl,
});
export type Talk = z.infer<typeof talkSchema>;

export const teacherSchema = z.object({
  id: positiveId,
  name: z.string(),
  bio: z.string(),
  website: z.string().nullable(),
  donationUrl: z.string().nullable(),
  photoUrl: z.string().nullable(),
  isPublic: z.boolean(),
});
export type Teacher = z.infer<typeof teacherSchema>;

export type RecordingKindFilter = "all" | "talk" | "guided-meditation";

export interface SelectionFilters {
  kind: RecordingKindFilter;
  topicIds: string[];
  teacherId: number | null;
  languageId: number | null;
  maximumDurationMinutes: number | null;
}
