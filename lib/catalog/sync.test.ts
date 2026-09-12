import { afterEach, describe, expect, it, vi } from "vitest";
import { getAllTalks, getAllTeachers, resetDatabaseForTests } from "./database";
import { syncCatalog } from "./sync";

afterEach(async () => {
  await resetDatabaseForTests();
});

describe("syncCatalog", () => {
  it("hydrates teachers and talks through the stable local API", async () => {
    const responses = [
      { edition: "teachers-1", ids: [10], removedIds: [] },
      {
        edition: "teachers-1",
        items: [
          {
            id: 10,
            name: "Test Teacher",
            bio: "",
            website: null,
            donationUrl: null,
            photoUrl: null,
            isPublic: true,
          },
        ],
        removedIds: [],
      },
      { edition: "talks-1", ids: [1], removedIds: [] },
      {
        edition: "talks-1",
        items: [
          {
            id: 1,
            title: "A talk",
            description: "",
            recordedAt: null,
            durationMinutes: 30,
            recordingType: "Talk",
            kind: "talk",
            topicIds: [],
            teacherIds: [10],
            venueId: null,
            retreatId: null,
            languageId: 1,
            audioUrl: "https://www.dharmaseed.org/talks/1/talk.mp3",
            sourceUrl: "https://www.dharmaseed.org/talks/1/",
          },
        ],
        removedIds: [],
      },
    ];
    const fetcher = vi.fn(async () =>
      Response.json(responses.shift(), { status: 200 }),
    ) as unknown as typeof fetch;

    await syncCatalog({ fetcher });

    expect((await getAllTeachers()).map((teacher) => teacher.id)).toEqual([10]);
    expect((await getAllTalks()).map((talk) => talk.id)).toEqual([1]);
    expect(fetcher).toHaveBeenCalledTimes(4);
  });
});
