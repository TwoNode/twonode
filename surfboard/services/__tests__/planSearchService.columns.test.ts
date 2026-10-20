import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ queryRaw: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ default: { $queryRaw: mocks.queryRaw } }));

const { findColumnMatchIds, MATCH_COLUMNS } =
  await import("@/surfboard/services/planSearchService");

/** The text of the SQL a tagged-template call was made with, and its bound values. */
function lastQuery() {
  const [strings, ...values] = mocks.queryRaw.mock.calls.at(-1)!;
  return {
    sql: (strings as TemplateStringsArray).join("?"),
    values: values.map((v) => (typeof v === "object" ? "RAW" : v)),
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.queryRaw.mockResolvedValue([{ id: "a" }, { id: "b" }]);
});

describe("findColumnMatchIds", () => {
  it("returns the ids of the caller's own live plans whose value matches ignoring capitals and spaces", async () => {
    expect(await findColumnMatchIds("lga", " Eti-Osa", "u1", "mine")).toEqual([
      "a",
      "b",
    ]);
    const { sql, values } = lastQuery();
    expect(sql).toContain(`"userId" =`);
    expect(sql).toContain("deleted = false");
    expect(sql).toContain("lower(btrim(");
    // The value and the user go in as bound parameters, never into the text.
    expect(values).toContain("u1");
    expect(values).toContain(" Eti-Osa");
    expect(sql).not.toContain("Eti-Osa");
  });

  it("looks in plans shared with the caller for that scope", async () => {
    await findColumnMatchIds("facilitator", "Bello", "u1", "shared-with-me");
    expect(lastQuery().sql).toContain(`= ANY("sharedTo")`);
    expect(lastQuery().sql).not.toContain(`"userId" =`);
  });

  it("accepts exactly the four drill-down columns", async () => {
    expect([...MATCH_COLUMNS]).toEqual(["facilitator", "lga", "ward", "lcda"]);
    for (const column of MATCH_COLUMNS) {
      await findColumnMatchIds(column, "x", "u1", "mine");
    }
    expect(mocks.queryRaw).toHaveBeenCalledTimes(4);
  });

  it("refuses any other column rather than putting a name from outside into the SQL", async () => {
    await expect(
      findColumnMatchIds('lga"; DROP TABLE x; --' as never, "x", "u1", "mine")
    ).rejects.toThrow();
    await expect(
      findColumnMatchIds("redCopyFileUrl" as never, "x", "u1", "mine")
    ).rejects.toThrow();
    expect(mocks.queryRaw).not.toHaveBeenCalled();
  });
});
