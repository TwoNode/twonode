import { describe, expect, it } from "vitest";
import { buildSurfboardPanelInitial } from "../panelInitial";

const profile = {
  firstName: "Ada",
  lastName: "Obi",
  email: "ada@example.test",
  logo: null,
  // fields the panel must not receive
  signature: "sig",
  phoneNumber: "080",
} as any;

describe("buildSurfboardPanelInitial", () => {
  it("maps the profile to the names the panel already uses", () => {
    expect(buildSurfboardPanelInitial({ id: "s" }, profile).user).toEqual({
      firstName: "Ada",
      family_name: "Obi",
      email: "ada@example.test",
      picture: null,
    });
  });

  it("passes on nothing but those four fields", () => {
    const user = buildSurfboardPanelInitial({}, profile).user!;
    expect(Object.keys(user).sort()).toEqual([
      "email",
      "family_name",
      "firstName",
      "picture",
    ]);
  });

  it("has subscription access only when there is an active subscription", () => {
    expect(
      buildSurfboardPanelInitial({ id: "s" }, profile).hasSubscriptionAccess
    ).toBe(true);
    expect(
      buildSurfboardPanelInitial(null, profile).hasSubscriptionAccess
    ).toBe(false);
    expect(
      buildSurfboardPanelInitial(undefined, profile).hasSubscriptionAccess
    ).toBe(false);
  });

  it("keeps working when the profile could not be read", () => {
    expect(buildSurfboardPanelInitial({ id: "s" }, null)).toEqual({
      user: null,
      hasSubscriptionAccess: true,
    });
  });
});
