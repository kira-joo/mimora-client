import { describe, expect, it } from "vitest";
import { frameRatio } from "./gallery";

describe("frameRatio — the gallery frame takes the first photograph's own shape", () => {
  it("matches a photograph within 4:5–16:9 exactly, so it fills the frame with nothing cut", () => {
    expect(frameRatio([{ src: "a", alt: "", ratio: 1536 / 1024 }])).toBeCloseTo(1.5);
    expect(frameRatio([{ src: "a", alt: "", ratio: 1 }])).toBe(1);
  });

  it("never grows taller than the old 4:5 frame, nor flatter than 16:9", () => {
    expect(frameRatio([{ src: "a", alt: "", ratio: 1024 / 1536 }])).toBe(4 / 5);
    expect(frameRatio([{ src: "a", alt: "", ratio: 4 }])).toBe(16 / 9);
  });

  it("follows the first image only, and falls back to 4:5 when no size is known", () => {
    expect(frameRatio([{ src: "a", alt: "", ratio: 1.5 }, { src: "b", alt: "", ratio: 0.5 }])).toBeCloseTo(1.5);
    expect(frameRatio([{ src: "a", alt: "" }])).toBe(4 / 5);
    expect(frameRatio([])).toBe(4 / 5);
  });
});
