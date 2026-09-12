import { classifyRecordingKind, classifyTopics } from "@/lib/domain/classify";
import { talkSchema, type Talk, type Teacher } from "@/lib/domain/talk";
import type { CatalogDetails, CatalogIndex, CatalogResource } from "@/lib/catalog/contracts";
import {
  remoteDetailResponseSchema,
  remoteIndexResponseSchema,
  remoteTalkSchema,
  remoteTeacherSchema,
} from "./schemas";

const DHARMA_SEED_ORIGIN = "https://www.dharmaseed.org";

export type DharmaSeedResource = CatalogResource;

export function parseIndexResponse(payload: unknown): CatalogIndex {
  const parsed = remoteIndexResponseSchema.parse(payload);
  return { edition: parsed.edition, ids: parsed.items, removedIds: parsed.x_items };
}

export function parseTalkDetails(payload: unknown): CatalogDetails<Talk> {
  const parsed = remoteDetailResponseSchema.parse(payload);
  return {
    edition: parsed.edition,
    items: Object.values(parsed.items).map((item) => toTalk(remoteTalkSchema.parse(item))),
    removedIds: parsed.x_items,
  };
}

export function parseTeacherDetails(payload: unknown): CatalogDetails<Teacher> {
  const parsed = remoteDetailResponseSchema.parse(payload);
  return {
    edition: parsed.edition,
    items: Object.values(parsed.items).map((item) => toTeacher(remoteTeacherSchema.parse(item))),
    removedIds: parsed.x_items,
  };
}

function toTalk(remote: ReturnType<typeof remoteTalkSchema.parse>): Talk {
  const teacherIds = remote.teachers ?? (remote.teacher_id ? [remote.teacher_id] : []);
  const audioUrl = new URL(remote.audio_url, DHARMA_SEED_ORIGIN).toString();
  const description = remote.description ?? "";
  const recordingType = remote.recording_type ?? "";

  return talkSchema.parse({
    id: remote.id,
    title: remote.title.trim() || "Untitled recording",
    description: description.trim(),
    recordedAt: remote.rec_date ?? null,
    durationMinutes: remote.duration_in_minutes ?? null,
    recordingType,
    kind: classifyRecordingKind(recordingType, remote.title, description),
    topicIds: classifyTopics(remote.title, description),
    teacherIds: [...new Set(teacherIds)],
    venueId: remote.venue_id ?? null,
    retreatId: remote.retreat_id ?? null,
    languageId: remote.language_id ?? null,
    audioUrl,
    sourceUrl: `${DHARMA_SEED_ORIGIN}/talks/${remote.id}/`,
  });
}

function toTeacher(remote: ReturnType<typeof remoteTeacherSchema.parse>): Teacher {
  const isPublic = remote.public === undefined || [true, 1, "1", "true"].includes(remote.public);

  return {
    id: remote.id,
    name: remote.name.trim(),
    bio: (remote.bio ?? "").trim(),
    website: remote.website || null,
    donationUrl: remote.donation_url || null,
    photoUrl: remote.photo
      ? `${DHARMA_SEED_ORIGIN}/api/1/teachers/${remote.id}/${remote.photo}/?maxW=240&maxH=360`
      : null,
    isPublic,
  };
}
