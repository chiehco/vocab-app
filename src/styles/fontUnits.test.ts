/// <reference types="node" />

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function cssFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return cssFiles(path);
    return entry.name.endsWith(".css") ? [path] : [];
  });
}

describe("scalable typography", () => {
  it("keeps CSS font declarations relative to the root scale", () => {
    const offenders = cssFiles(join(process.cwd(), "src")).filter((path) => {
      const css = readFileSync(path, "utf8");
      return /\bfont(?:-size)?\s*:[^;{}]*\d(?:\.\d+)?px\b/i.test(css);
    });

    expect(offenders).toEqual([]);
  });
});
