import { test, expect } from "@playwright/test";
import { newUserCredentials } from "../fixtures/test-data";

test.describe("auth", () => {
  test("registers a new user and returns it without the password", async ({ request }) => {
    const user = newUserCredentials();

    const response = await request.post("/api/auth/register", { data: user });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body).toMatchObject({ email: user.email, name: user.name });
    expect(body).not.toHaveProperty("password");
    expect(body).not.toHaveProperty("passwordHash");
  });

  test("rejects registering the same email twice", async ({ request }) => {
    const user = newUserCredentials();
    await request.post("/api/auth/register", { data: user });

    const response = await request.post("/api/auth/register", { data: user });

    expect(response.status()).toBe(409);
    const body = await response.json();
    expect(body.error.code).toBe("conflict");
  });

  test("rejects registration with an invalid email", async ({ request }) => {
    const user = newUserCredentials();

    const response = await request.post("/api/auth/register", {
      data: { ...user, email: "not-an-email" },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error.fieldErrors).toHaveProperty("email");
  });

  test("rejects registration with a short password", async ({ request }) => {
    const user = newUserCredentials();

    const response = await request.post("/api/auth/register", {
      data: { ...user, password: "short" },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error.fieldErrors).toHaveProperty("password");
  });

  test("logs in with correct credentials", async ({ request }) => {
    const user = newUserCredentials();
    await request.post("/api/auth/register", { data: user });

    const response = await request.post("/api/auth/login", {
      data: { email: user.email, password: user.password },
    });

    expect(response.status()).toBe(200);
    expect(response.headers()["set-cookie"]).toContain("jobtrackr_token");
  });

  test("rejects login with the wrong password", async ({ request }) => {
    const user = newUserCredentials();
    await request.post("/api/auth/register", { data: user });

    const response = await request.post("/api/auth/login", {
      data: { email: user.email, password: "wrong-password" },
    });

    expect(response.status()).toBe(401);
  });

  test("rejects login for an unknown email", async ({ request }) => {
    const response = await request.post("/api/auth/login", {
      data: { email: "nobody@example.com", password: "password123" },
    });

    expect(response.status()).toBe(401);
  });

  test("rejects /me without a session", async ({ request }) => {
    const response = await request.get("/api/auth/me");
    expect(response.status()).toBe(401);
  });

  test("returns the current user for a valid session, and clears it on logout", async ({ request }) => {
    const user = newUserCredentials();
    await request.post("/api/auth/register", { data: user });
    await request.post("/api/auth/login", { data: { email: user.email, password: user.password } });

    const me = await request.get("/api/auth/me");
    expect(me.status()).toBe(200);
    expect((await me.json()).email).toBe(user.email);

    const logout = await request.post("/api/auth/logout");
    expect(logout.status()).toBe(204);

    const meAfterLogout = await request.get("/api/auth/me");
    expect(meAfterLogout.status()).toBe(401);
  });
});
