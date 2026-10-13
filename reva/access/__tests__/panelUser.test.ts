import { describe, expect, it } from "vitest";
import { Platform } from "@/utils/platform";
import { pickRevaPanelUser } from "../panelUser";

describe("pickRevaPanelUser", () => {
  it("takes the REVA role from a multi-platform session", () => {
    expect(
      pickRevaPanelUser({
        email: "a@b.c",
        firstName: "A",
        lastName: "B",
        platforms: {
          [Platform.SURFBOARD]: { role: "USER" },
          [Platform.REVA]: { role: "SUPERADMIN" },
        },
      })
    ).toEqual({
      platform: Platform.REVA,
      role: "SUPERADMIN",
      email: "a@b.c",
      firstName: "A",
      lastName: "B",
    });
  });

  it("falls back to the legacy top-level fields of a REVA session", () => {
    expect(
      pickRevaPanelUser({ platform: Platform.REVA, role: "ADMIN" })?.role
    ).toBe("ADMIN");
  });

  it("is null when the session has no REVA role", () => {
    expect(
      pickRevaPanelUser({
        platforms: { [Platform.SURFBOARD]: { role: "USER" } },
      })
    ).toBeNull();
    expect(
      pickRevaPanelUser({ platform: Platform.SURFBOARD, role: "USER" })
    ).toBeNull();
    expect(pickRevaPanelUser(null)).toBeNull();
    expect(
      pickRevaPanelUser({ platforms: { [Platform.REVA]: {} } })
    ).toBeNull();
  });

  it("keeps only what the panels use", () => {
    const out = pickRevaPanelUser({
      platform: Platform.REVA,
      role: "USER",
      ...({ kindeId: "secret", sessionId: "s" } as object),
    });
    expect(Object.keys(out!).sort()).toEqual(
      ["email", "firstName", "lastName", "platform", "role"].sort()
    );
  });
});
