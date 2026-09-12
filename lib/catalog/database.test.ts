import { afterEach, describe, expect, it } from "vitest";
import { makeTalk, makeTeacher } from "@/test/factories";
import {
  deleteCatalogItems,
  getAllTalks,
  getAllTeachers,
  getDatabase,
  getMetadata,
  putTalks,
  putTeachers,
  resetDatabaseForTests,
  setMetadata,
} from "./database";

afterEach(async () => {
  await resetDatabaseForTests();
});

describe("catalog database", () => {
  it("migrates previously stored classifications locally and records their version", async () => {
    const db = await getDatabase();
    await db.put(
      "talks",
      makeTalk({ title: "Guided meditation on metta", kind: "other", topicIds: [] }),
    );
    await setMetadata("classification-version", 0);
    expect(await getAllTalks()).toEqual([
      expect.objectContaining({ kind: "guided-meditation", topicIds: ["loving-kindness"] }),
    ]);
    expect(await getMetadata("classification-version")).toBe(1);
  });
  it("upserts and deletes talks transactionally", async () => {
    await putTalks([makeTalk({ id: 1 }), makeTalk({ id: 2 })]);
    await putTalks([makeTalk({ id: 2, title: "Updated" })]);
    await deleteCatalogItems("talks", [1]);

    expect(await getAllTalks()).toEqual([expect.objectContaining({ id: 2, title: "Updated" })]);
  });

  it("returns only public teachers in name order", async () => {
    await putTeachers([
      makeTeacher({ id: 2, name: "Zed" }),
      makeTeacher({ id: 1, name: "Ada" }),
      makeTeacher({ id: 3, name: "Hidden", isPublic: false }),
    ]);

    expect((await getAllTeachers()).map((teacher) => teacher.name)).toEqual(["Ada", "Zed"]);
  });

  it("stores synchronization metadata separately", async () => {
    await setMetadata("talks:edition", "edition-2");
    expect(await getMetadata("talks:edition")).toBe("edition-2");
  });
});
