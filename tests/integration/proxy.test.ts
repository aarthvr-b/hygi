import { createServerClient } from "@supabase/ssr";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import { proxy } from "@/proxy";
import { createAuthenticatedTestUser, type TestUser } from "../setup/test-user";

// Signs in through the same @supabase/ssr cookie contract the app uses, so
// the resulting cookie header is exactly what a real browser would send.
async function signInCookieHeader(email: string, password: string) {
  const store = new Map<string, string>();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => Array.from(store, ([name, value]) => ({ name, value })),
        setAll: (cookies) => cookies.forEach(({ name, value }) => store.set(name, value)),
      },
    },
  );

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  return Array.from(store, ([name, value]) => `${name}=${value}`).join("; ");
}

describe("proxy (route-protection gate, against the real test-Postgres harness)", () => {
  let testUser: TestUser | null = null;

  afterEach(async () => {
    await testUser?.cleanup();
    testUser = null;
  });

  it("redirects an unauthenticated visitor away from a protected route", async () => {
    const request = new NextRequest("http://localhost:3000/");

    const response = await proxy(request);

    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("lets an unauthenticated visitor reach /login", async () => {
    const request = new NextRequest("http://localhost:3000/login");

    const response = await proxy(request);

    expect(response.headers.get("location")).toBeNull();
  });

  it("lets an authenticated visitor reach the protected home screen", async () => {
    testUser = await createAuthenticatedTestUser();
    const cookie = await signInCookieHeader(testUser.email, testUser.password);

    const request = new NextRequest("http://localhost:3000/", { headers: { cookie } });
    const response = await proxy(request);

    expect(response.headers.get("location")).toBeNull();
  });

  it("sends an authenticated visitor away from /login to the home screen", async () => {
    testUser = await createAuthenticatedTestUser();
    const cookie = await signInCookieHeader(testUser.email, testUser.password);

    const request = new NextRequest("http://localhost:3000/login", { headers: { cookie } });
    const response = await proxy(request);

    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });
});
