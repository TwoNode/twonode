import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Stored files are private in the bucket (ADR-0013): a raw stored URL in an
 * `<img src>`, `<iframe src>` or PDF `source` shows "Access Denied". Those
 * fields must go through the file gateway (`surfboardApi.files.getViewUrl`,
 * `revaApi.files.linkFor`, `MediaLink`). This fails when one is used raw.
 */
const RAW =
  /(?:src|source)=\{\s*(?:[\w$?.]+\.)?(?:redCopyFileUrl|directFileLink|imageUrls\.\w+|report\??\.images\??\.\w+)\s*\}/g;

const SCAN_DIRS = ["app", "components", "reva", "gbc", "surfboard"];
const SKIP = /(^|\/)(node_modules|__tests__|\.next)(\/|$)/;

function walk(dir: string, root: string, out: string[]) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = relative(root, full);
    if (SKIP.test(rel)) continue;
    if (statSync(full).isDirectory()) walk(full, root, out);
    else if (/\.tsx$/.test(name)) out.push(rel);
  }
}

describe("stored files are never used as a raw src", () => {
  it("finds no raw stored-file URL in src / source", () => {
    const root = process.cwd();
    const files: string[] = [];
    for (const d of SCAN_DIRS) walk(join(root, d), root, files);
    const found: string[] = [];
    for (const rel of files) {
      const hits = readFileSync(join(root, rel), "utf8").match(RAW);
      if (hits) found.push(`${rel}: ${hits.join(", ")}`);
    }
    expect(found).toEqual([]);
  });
});
