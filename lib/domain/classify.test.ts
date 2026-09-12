import { describe, expect, it } from "vitest";
import { classifyRecordingKind, classifyTopics, normalizeForClassification } from "./classify";

describe("classifyRecordingKind", () => {
  it("keeps guided meditations out of the Dhamma-talk kind", () => {
    expect(classifyRecordingKind("Talk", "Guided Meditation on Mettā", "")).toBe(
      "guided-meditation",
    );
  });

  it("uses the explicit recording type for talks", () => {
    expect(classifyRecordingKind("Dhamma Talk", "Working with the heart", "")).toBe("talk");
  });

  it("does not force an ambiguous recording into the talk kind", () => {
    expect(classifyRecordingKind("", "Questions & Answers", "")).toBe("other");
  });
});

describe("classifyTopics", () => {
  it("recognizes English and Pali terminology", () => {
    expect(
      classifyTopics("Anattā and dependent origination", "Exploring paṭicca samuppāda"),
    ).toEqual(expect.arrayContaining(["not-self", "dependent-origination"]));
  });

  it("keeps related fine-grained topics", () => {
    expect(classifyTopics("The three characteristics", "Anicca, dukkha and anatta")).toEqual(
      expect.arrayContaining(["three-characteristics", "impermanence", "dukkha", "not-self"]),
    );
  });

  it("recognizes individual brahmaviharas", () => {
    expect(classifyTopics("Mettā and upekkhā", "Two divine abidings")).toEqual(
      expect.arrayContaining(["brahmaviharas", "loving-kindness", "equanimity"]),
    );
  });
});

describe("normalizeForClassification", () => {
  it("normalizes diacritics, punctuation, and whitespace", () => {
    expect(normalizeForClassification("  Paṭicca_Samuppāda’s  ")).toBe("paticca samuppadas");
  });
});
