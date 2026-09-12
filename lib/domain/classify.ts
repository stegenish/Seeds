import type { RecordingKind } from "./talk";
import { TOPICS } from "./topics";

const GUIDED_MEDITATION_PATTERNS = [
  /\bguided meditation\b/,
  /\bmeditation instructions?\b/,
  /\binstructions? (?:and|for) (?:sitting|meditation|practice)\b/,
  /\bmorning (?:guided )?meditation\b/,
  /\bevening (?:guided )?meditation\b/,
  /\bsitting meditation\b/,
  /\bwalking meditation\b/,
  /\bbody scan\b/,
];

const OTHER_RECORDING_PATTERNS = [
  /\bchant(?:ing)?\b/,
  /\binterview\b/,
  /\bceremony\b/,
  /\bquestions? (?:and|&) answers?\b/,
  /\bq\s*&\s*a\b/,
];

export function normalizeForClassification(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[’']/g, "")
    .replace(/[_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function classifyRecordingKind(
  recordingType: string,
  title: string,
  description: string,
): RecordingKind {
  const normalizedType = normalizeForClassification(recordingType);
  const text = normalizeForClassification(`${title} ${description}`);

  if (
    normalizedType.includes("meditation") ||
    normalizedType.includes("instruction") ||
    GUIDED_MEDITATION_PATTERNS.some((pattern) => pattern.test(text))
  ) {
    return "guided-meditation";
  }

  if (
    normalizedType.includes("talk") ||
    normalizedType.includes("dhamma") ||
    normalizedType.includes("dharma")
  ) {
    return "talk";
  }

  if (OTHER_RECORDING_PATTERNS.some((pattern) => pattern.test(text))) {
    return "other";
  }

  return "other";
}

export function classifyTopics(title: string, description: string): string[] {
  const text = normalizeForClassification(`${title} ${description}`);
  return TOPICS.filter((topic) => topic.patterns.some((pattern) => pattern.test(text))).map(
    (topic) => topic.id,
  );
}
