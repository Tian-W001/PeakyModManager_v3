import { describe, it, expect } from "vitest";
import { escapeRegExp, isZippedFile } from "../src/main/utils";

describe("escapeRegExp", () => {
  it("should escape special regex characters", () => {
    expect(escapeRegExp("test.mod")).toBe("test\\.mod");
    expect(escapeRegExp("a+b")).toBe("a\\+b");
    expect(escapeRegExp("a*b")).toBe("a\\*b");
    expect(escapeRegExp("a?b")).toBe("a\\?b");
    expect(escapeRegExp("a^b")).toBe("a\\^b");
    expect(escapeRegExp("a$b")).toBe("a\\$b");
    expect(escapeRegExp("a{b}")).toBe("a\\{b\\}");
    expect(escapeRegExp("a(b)")).toBe("a\\(b\\)");
    expect(escapeRegExp("a|b")).toBe("a\\|b");
    expect(escapeRegExp("a[b]")).toBe("a\\[b\\]");
    expect(escapeRegExp("a\\b")).toBe("a\\\\b");
  });

  it("should return normal strings unchanged", () => {
    expect(escapeRegExp("hello")).toBe("hello");
    expect(escapeRegExp("TestMod")).toBe("TestMod");
    expect(escapeRegExp("mod_name-123")).toBe("mod_name-123");
  });

  it("should handle empty string", () => {
    expect(escapeRegExp("")).toBe("");
  });
});

describe("isZippedFile", () => {
  it("should return true for zip extensions", () => {
    expect(isZippedFile("mod.zip")).toBe(true);
    expect(isZippedFile("MOD.ZIP")).toBe(true);
    expect(isZippedFile("file.7z")).toBe(true);
    expect(isZippedFile("archive.rar")).toBe(true);
    expect(isZippedFile("backup.tar")).toBe(true);
  });

  it("should return false for non-zip extensions", () => {
    expect(isZippedFile("mod.txt")).toBe(false);
    expect(isZippedFile("image.png")).toBe(false);
    expect(isZippedFile("folder")).toBe(false);
    expect(isZippedFile("noextension")).toBe(false);
  });
});
