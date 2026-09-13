import { z } from "zod";
import { positiveId, talkSchema, teacherSchema } from "@/lib/domain/talk";

export const DETAIL_BATCH_SIZE = 500;
export const catalogResourceSchema = z.enum(["talks", "teachers"]);
export type CatalogResource = z.infer<typeof catalogResourceSchema>;
const envelope = { edition: z.string().min(1), removedIds: z.array(positiveId) };
export const indexSchema = z.object({ ...envelope, ids: z.array(positiveId) });
export const talkDetailsSchema = z.object({ ...envelope, items: z.array(talkSchema) });
export const teacherDetailsSchema = z.object({ ...envelope, items: z.array(teacherSchema) });
export type CatalogIndex = z.infer<typeof indexSchema>;
export interface CatalogDetails<T> {
  edition: string;
  items: T[];
  removedIds: number[];
}

// Hosted catalog editions are monotonic integers; upstream editions are UTC
// timestamps. Equal opaque editions remain compatible, while unknown differing
// formats must never silently advance a checkpoint.
export function isCompatibleEdition(received: string, expected: string): boolean {
  if (received === expected) return true;
  const version = /^(0|[1-9]\d*)$/;
  if (version.test(received) && version.test(expected)) {
    return BigInt(received) > BigInt(expected);
  }
  const timestamp = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
  return timestamp.test(received) && timestamp.test(expected) && received > expected;
}
