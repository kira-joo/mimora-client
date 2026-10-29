import { describe, expect, it } from "vitest";
import { CONSENT_VERSION, analyticsAllowed, needsChoice, parseConsent, serializeConsent } from "./consent";

const NOW = new Date("2026-10-24T10:00:00.000Z");

describe("consent state", () => {
  it("no stored choice is unset: analytics is off and the notice is due", () => {
    for (const raw of [null, undefined, ""]) {
      const state = parseConsent(raw);
      expect(state).toEqual({ status: "unset" });
      expect(analyticsAllowed(state)).toBe(false);
      expect(needsChoice(state)).toBe(true);
    }
  });

  it("round-trips an accept and a decline, with when it was chosen", () => {
    expect(parseConsent(serializeConsent("granted", NOW))).toEqual({ status: "granted", at: NOW.toISOString() });
    expect(parseConsent(serializeConsent("denied", NOW))).toEqual({ status: "denied", at: NOW.toISOString() });
  });

  it("only an explicit, current accept allows analytics; a decline allows nothing but stops the notice", () => {
    const granted = parseConsent(serializeConsent("granted", NOW));
    const denied = parseConsent(serializeConsent("denied", NOW));
    expect(analyticsAllowed(granted)).toBe(true);
    expect(needsChoice(granted)).toBe(false);
    expect(analyticsAllowed(denied)).toBe(false);
    expect(needsChoice(denied)).toBe(false);
  });

  it("a change of legal version re-asks: a choice stored under another version is no choice", () => {
    const old = serializeConsent("granted", NOW, CONSENT_VERSION);
    expect(parseConsent(old, CONSENT_VERSION + 1)).toEqual({ status: "unset" });
    expect(analyticsAllowed(parseConsent(old, CONSENT_VERSION + 1))).toBe(false);
    expect(needsChoice(parseConsent(old, CONSENT_VERSION + 1))).toBe(true);
    // And a record from a future/other version never reads as current.
    expect(parseConsent(serializeConsent("granted", NOW, 0))).toEqual({ status: "unset" });
  });

  it("the old dismiss-only notice's marker, and any malformed value, never count as consent", () => {
    for (const raw of ["1", "true", "granted", "{", "null", "[]", '{"v":1}', `{"v":${CONSENT_VERSION},"analytics":"yes","at":"x"}`, `{"v":${CONSENT_VERSION},"analytics":true}`]) {
      const state = parseConsent(raw);
      expect(state, raw).toEqual({ status: "unset" });
      expect(analyticsAllowed(state), raw).toBe(false);
    }
  });

  it("stores nothing about the visitor — only version, verdict and time", () => {
    expect(Object.keys(JSON.parse(serializeConsent("granted", NOW))).sort()).toEqual(["analytics", "at", "v"]);
  });
});
