import { describe, expect, it } from "vitest";
import { parseIndexResponse, parseTalkDetails, parseTeacherDetails } from "./adapter";

describe("Dharma Seed adapter", () => {
  it("maps talk payloads into stable domain records", () => {
    const result = parseTalkDetails({
      edition: "2026-09-12 08:49:06",
      items: {
        "99297": {
          id: 99297,
          title: "Guided Meditation: Mettā",
          description: "A loving-kindness practice.",
          rec_date: "2026-09-09 19:30:00",
          duration_in_minutes: 39.88,
          recording_type: "Guided Meditation",
          teacher_id: 43,
          teachers: [43],
          venue_id: 2,
          retreat_id: 1,
          language_id: 1,
          audio_url: "/talks/99297/example.mp3",
        },
      },
      x_items: [],
    });

    expect(result.items[0]).toMatchObject({
      id: 99297,
      kind: "guided-meditation",
      teacherIds: [43],
      topicIds: ["loving-kindness"],
      audioUrl: "https://www.dharmaseed.org/talks/99297/example.mp3",
      sourceUrl: "https://www.dharmaseed.org/talks/99297/",
    });
  });

  it("maps public teachers and photo endpoints", () => {
    const result = parseTeacherDetails({
      edition: "1",
      items: {
        "43": {
          id: 43,
          name: "Chas DiCapua",
          bio: "Teacher biography",
          website: "https://example.com",
          donation_url: "",
          photo: "portrait.jpg",
          public: 1,
        },
      },
    });

    expect(result.items[0]).toMatchObject({
      id: 43,
      name: "Chas DiCapua",
      donationUrl: null,
      isPublic: true,
    });
    expect(result.items[0]?.photoUrl).toContain("/api/1/teachers/43/portrait.jpg/");
  });

  it("rejects malformed indexes", () => {
    expect(() => parseIndexResponse({ edition: "1", items: ["not-an-id"] })).toThrow();
  });
});
