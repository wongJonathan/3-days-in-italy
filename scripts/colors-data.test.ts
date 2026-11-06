// Guards the single source of colours (src/utils/colors.ts): no colour is written
// anywhere else, and every CSS variable the stylesheet uses is defined.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { cssVariables } from "../src/utils/colors.ts";

// fileURLToPath (not .pathname): it decodes "%20" and handles Windows drive letters.
const SRC = fileURLToPath(new URL("../src/", import.meta.url));

/** Every .ts / .tsx / .css file under src/, except tests and colors.ts itself. */
const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    const isSource = /\.(ts|tsx|css)$/.test(name) && !/\.test\./.test(name);
    return isSource && name !== "colors.ts" ? [path] : [];
  });

const HEX_COLOUR = /#[0-9a-fA-F]{3,8}\b/g;

describe("colours", () => {
  it("are only written in src/utils/colors.ts", () => {
    const strays = sourceFiles(SRC).flatMap((file) =>
      (readFileSync(file, "utf8").match(HEX_COLOUR) ?? []).map(
        (colour) => `${file.slice(SRC.length)}: ${colour}`,
      ),
    );
    expect(strays).toEqual([]);
  });

  it("cover every CSS variable that index.css uses", () => {
    const css = readFileSync(join(SRC, "index.css"), "utf8");
    const used = new Set(
      [...css.matchAll(/var\((--[a-z-]+)\)/g)].map((m) => m[1]),
    );
    const defined = new Set(Object.keys(cssVariables()));
    expect([...used].filter((name) => !defined.has(name))).toEqual([]);
  });
});
