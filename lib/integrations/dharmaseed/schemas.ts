import { z } from "zod";

const nullableNumber = z.number().nullable().optional();
const nullableString = z.string().nullable().optional();

export const remoteTalkSchema = z
  .object({
    id: z.number().int().positive(),
    title: z.string().default("Untitled recording"),
    description: z.string().nullish().default(""),
    rec_date: nullableString,
    duration_in_minutes: nullableNumber,
    recording_type: z.string().nullish().default(""),
    teacher_id: nullableNumber,
    teachers: z.array(z.number().int().positive()).optional(),
    venue_id: nullableNumber,
    retreat_id: nullableNumber,
    language_id: nullableNumber,
    audio_url: z.string().min(1),
    publishability: z.string().optional(),
    destination: z.string().optional(),
  })
  .passthrough();

export const remoteTeacherSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string().min(1),
    bio: z.string().nullish().default(""),
    website: nullableString,
    donation_url: nullableString,
    photo: nullableString,
    public: z.union([z.boolean(), z.number(), z.string()]).optional(),
  })
  .passthrough();

const keyedItemsSchema = z.record(z.string(), z.unknown());

export const remoteIndexResponseSchema = z.object({
  edition: z.string(),
  items: z.array(z.number().int().positive()),
  x_items: z.array(z.number().int().positive()).optional().default([]),
});

export const remoteDetailResponseSchema = z.object({
  edition: z.string(),
  items: keyedItemsSchema,
  x_items: z.array(z.number().int().positive()).optional().default([]),
});

export type RemoteTalk = z.infer<typeof remoteTalkSchema>;
export type RemoteTeacher = z.infer<typeof remoteTeacherSchema>;
