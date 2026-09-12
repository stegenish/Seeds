import type { Talk, Teacher } from "@/lib/domain/talk";

export function makeTalk(overrides: Partial<Talk> = {}): Talk {
  return {
    id: 1,
    title: "A talk about practice",
    description: "A useful description.",
    recordedAt: "2026-01-02 19:30:00",
    durationMinutes: 42,
    recordingType: "Talk",
    kind: "talk",
    topicIds: [],
    teacherIds: [10],
    venueId: 2,
    retreatId: 3,
    languageId: 1,
    audioUrl: "https://www.dharmaseed.org/talks/1/talk.mp3",
    sourceUrl: "https://www.dharmaseed.org/talks/1/",
    ...overrides,
  };
}

export function makeTeacher(overrides: Partial<Teacher> = {}): Teacher {
  return {
    id: 10,
    name: "Test Teacher",
    bio: "",
    website: null,
    donationUrl: null,
    photoUrl: null,
    isPublic: true,
    ...overrides,
  };
}
