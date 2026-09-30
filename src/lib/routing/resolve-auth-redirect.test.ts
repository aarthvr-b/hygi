import { describe, expect, it } from "vitest";
import { resolveAuthRedirect } from "./resolve-auth-redirect";

describe("resolveAuthRedirect", () => {
  it("sends an unauthenticated visitor from a protected route to /login", () => {
    expect(resolveAuthRedirect("/", false)).toBe("/login");
    expect(resolveAuthRedirect("/some/deep/route", false)).toBe("/login");
  });

  it("lets an unauthenticated visitor reach /login", () => {
    expect(resolveAuthRedirect("/login", false)).toBeNull();
  });

  it("sends an authenticated visitor away from /login to the home screen", () => {
    expect(resolveAuthRedirect("/login", true)).toBe("/");
  });

  it("lets an authenticated visitor reach any other route", () => {
    expect(resolveAuthRedirect("/", true)).toBeNull();
    expect(resolveAuthRedirect("/some/deep/route", true)).toBeNull();
  });
});
