import { describe, expect, it } from "vitest";
import { userBatchWhere } from "@/surfboard/utils/batchScope";

describe("userBatchWhere", () => {
  it("puts a batch in History once every plan in it is lodged, and never an empty batch", () => {
    expect(userBatchWhere("u1", "history")).toEqual({
      submittedBy: "u1",
      plans: { some: {}, every: { status: "LODGED" } },
    });
  });

  it("keeps a batch Active while any plan in it is not lodged", () => {
    expect(userBatchWhere("u1", "active")).toEqual({
      submittedBy: "u1",
      plans: { some: { status: { not: "LODGED" } } },
    });
  });

  it("only ever looks at the caller's own batches", () => {
    expect(userBatchWhere("someone-else", "active")).toMatchObject({
      submittedBy: "someone-else",
    });
  });

  it("searches the batch code, plan number, title and facilitator", () => {
    const where = userBatchWhere("u1", "active", "ajah");
    const like = { contains: "ajah", mode: "insensitive" };
    expect(where.OR).toEqual([
      { batchCode: like },
      {
        plans: {
          some: {
            OR: [{ planNumber: like }, { planNumberKey: { contains: "AJAH" } }],
          },
        },
      },
      { plans: { some: { surveyTitle: like } } },
      { plans: { some: { facilitator: like } } },
    ]);
  });

  it("has no search clause when there is no search", () => {
    expect(userBatchWhere("u1", "active", "")).not.toHaveProperty("OR");
    expect(userBatchWhere("u1", "active")).not.toHaveProperty("OR");
  });
});
