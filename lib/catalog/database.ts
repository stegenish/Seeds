import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Talk, Teacher } from "@/lib/domain/talk";
import { CLASSIFICATION_VERSION, reclassifyTalk } from "@/lib/domain/classify";

interface MetadataRecord {
  key: string;
  value: unknown;
}

interface StillpointDatabase extends DBSchema {
  talks: {
    key: number;
    value: Talk;
  };
  teachers: {
    key: number;
    value: Teacher;
  };
  metadata: {
    key: string;
    value: MetadataRecord;
  };
}

const DATABASE_NAME = "stillpoint-catalog";
const DATABASE_VERSION = 1;

let databasePromise: Promise<IDBPDatabase<StillpointDatabase>> | null = null;

export function getDatabase(): Promise<IDBPDatabase<StillpointDatabase>> {
  databasePromise ??= openDB<StillpointDatabase>(DATABASE_NAME, DATABASE_VERSION, {
    upgrade(database) {
      database.createObjectStore("talks", { keyPath: "id" });
      database.createObjectStore("teachers", { keyPath: "id" });
      database.createObjectStore("metadata", { keyPath: "key" });
    },
  }).catch((error: unknown) => {
    databasePromise = null;
    throw error;
  });

  return databasePromise;
}

export async function getAllTalks(): Promise<Talk[]> {
  await refreshClassifications();
  return (await getDatabase()).getAll("talks");
}

export async function refreshClassifications(): Promise<void> {
  const transaction = (await getDatabase()).transaction(["talks", "metadata"], "readwrite");
  const metadata = transaction.objectStore("metadata");
  if ((await metadata.get("classification-version"))?.value !== CLASSIFICATION_VERSION) {
    const talks = transaction.objectStore("talks");
    for (const talk of await talks.getAll()) await talks.put(reclassifyTalk(talk));
    await metadata.put({ key: "classification-version", value: CLASSIFICATION_VERSION });
  }
  await transaction.done;
}

export async function getAllTeachers(): Promise<Teacher[]> {
  const teachers = await (await getDatabase()).getAll("teachers");
  return teachers
    .filter((teacher) => teacher.isPublic)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function putTalks(talks: Talk[]): Promise<void> {
  if (talks.length === 0) return;
  const transaction = (await getDatabase()).transaction("talks", "readwrite");
  await Promise.all([
    ...talks.map((talk) => transaction.store.put(reclassifyTalk(talk))),
    transaction.done,
  ]);
}

export async function putTeachers(teachers: Teacher[]): Promise<void> {
  if (teachers.length === 0) return;
  const transaction = (await getDatabase()).transaction("teachers", "readwrite");
  await Promise.all([
    ...teachers.map((teacher) => transaction.store.put(teacher)),
    transaction.done,
  ]);
}

export async function deleteCatalogItems(
  storeName: "talks" | "teachers",
  ids: number[],
): Promise<void> {
  if (ids.length === 0) return;
  const transaction = (await getDatabase()).transaction(storeName, "readwrite");
  await Promise.all([...ids.map((id) => transaction.store.delete(id)), transaction.done]);
}

export async function getMetadata<T>(key: string): Promise<T | null> {
  const record = await (await getDatabase()).get("metadata", key);
  return (record?.value as T | undefined) ?? null;
}

export async function setMetadata(key: string, value: unknown): Promise<void> {
  await (await getDatabase()).put("metadata", { key, value });
}

export async function deleteMetadata(key: string): Promise<void> {
  await (await getDatabase()).delete("metadata", key);
}

export async function resetDatabaseForTests(): Promise<void> {
  const database = await getDatabase();
  database.close();
  databasePromise = null;
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DATABASE_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Database deletion was blocked"));
  });
}
