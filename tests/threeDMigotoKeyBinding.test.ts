import { describe, expect, it } from "vitest";
import {
  isNumericToggleState,
  KeyboardChordEvent,
  toThreeDMigotoKeyBinding,
} from "../src/renderer/src/utils/threeDMigotoKeyBinding";

const keyboardEvent = (overrides: Partial<KeyboardChordEvent>): KeyboardChordEvent => ({
  code: "KeyA",
  key: "a",
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  metaKey: false,
  ...overrides,
});

describe("3DMigoto keyboard binding conversion", () => {
  it("formats alphanumeric keys without a redundant no-modifiers prefix", () => {
    expect(toThreeDMigotoKeyBinding(keyboardEvent({ code: "Digit1", key: "1" }))).toBe("1");
    expect(toThreeDMigotoKeyBinding(keyboardEvent({ code: "Digit2", key: "2", ctrlKey: true }))).toBe("ctrl 2");
    expect(toThreeDMigotoKeyBinding(keyboardEvent({ code: "Digit1", key: "!", shiftKey: true }))).toBe("shift 1");
  });

  it("uses virtual key names and ignores modifier-only input", () => {
    expect(toThreeDMigotoKeyBinding(keyboardEvent({ code: "ArrowUp", key: "ArrowUp" }))).toBe("VK_UP");
    expect(toThreeDMigotoKeyBinding(keyboardEvent({ code: "F10", key: "F10", altKey: true }))).toBe("alt VK_F10");
    expect(toThreeDMigotoKeyBinding(keyboardEvent({ code: "Numpad3", key: "3" }))).toBe("VK_NUMPAD3");
    expect(
      toThreeDMigotoKeyBinding(keyboardEvent({ code: "ControlLeft", key: "Control", ctrlKey: true }))
    ).toBeUndefined();
  });

  it("uses literal characters for printable punctuation keys", () => {
    expect(toThreeDMigotoKeyBinding(keyboardEvent({ code: "Semicolon", key: ";" }))).toBe(";");
    expect(toThreeDMigotoKeyBinding(keyboardEvent({ code: "Equal", key: "=" }))).toBe("=");
    expect(toThreeDMigotoKeyBinding(keyboardEvent({ code: "BracketLeft", key: "[", ctrlKey: true }))).toBe("ctrl [");
  });

  it("soft-validates finite numeric state text", () => {
    expect(isNumericToggleState("-1.5")).toBe(true);
    expect(isNumericToggleState("1e3")).toBe(true);
    expect(isNumericToggleState("")).toBe(false);
    expect(isNumericToggleState("not numeric")).toBe(false);
    expect(isNumericToggleState("Infinity")).toBe(false);
  });
});
