import { test, expect } from "../fixtures/api";

test.describe("applications", () => {
  test("rejects unauthenticated requests", async ({ playwright, baseURL }) => {
    const anon = await playwright.request.newContext({ baseURL });
    const response = await anon.get("/api/applications");
    expect(response.status()).toBe(401);
    await anon.dispose();
  });

  test("creates an application with defaults applied", async ({ authedRequest }) => {
    const response = await authedRequest.post("/api/applications", {
      data: { company: "Acme Co", role: "SDET" },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body).toMatchObject({
      company: "Acme Co",
      role: "SDET",
      status: "wishlist",
      tags: [],
    });
  });

  test("rejects creating an application without a company", async ({ authedRequest }) => {
    const response = await authedRequest.post("/api/applications", { data: { role: "SDET" } });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error.fieldErrors).toHaveProperty("company");
  });

  test("lists only the current user's applications", async ({ authedRequest, playwright, baseURL }) => {
    await authedRequest.post("/api/applications", { data: { company: "Mine Co", role: "QA" } });

    const otherUser = await playwright.request.newContext({ baseURL });
    await otherUser.post("/api/auth/register", {
      data: { name: "Other", email: `other-${Date.now()}@example.com`, password: "password123" },
    });
    await otherUser.post("/api/applications", { data: { company: "Theirs Co", role: "QA" } });

    const response = await authedRequest.get("/api/applications");
    const body = await response.json();

    expect(body.items).toHaveLength(1);
    expect(body.items[0].company).toBe("Mine Co");
    await otherUser.dispose();
  });

  test("filters by search and by tag", async ({ authedRequest }) => {
    await authedRequest.post("/api/applications", {
      data: { company: "Searchable Corp", role: "Engineer", tags: ["dream-job"] },
    });
    await authedRequest.post("/api/applications", {
      data: { company: "Other Corp", role: "Engineer", tags: ["backup"] },
    });

    const bySearch = await authedRequest.get("/api/applications?search=searchable");
    expect((await bySearch.json()).items).toHaveLength(1);

    const byTag = await authedRequest.get("/api/applications?tag=backup");
    const byTagBody = await byTag.json();
    expect(byTagBody.items).toHaveLength(1);
    expect(byTagBody.items[0].company).toBe("Other Corp");
  });

  test("paginates results", async ({ authedRequest }) => {
    for (let i = 0; i < 3; i++) {
      await authedRequest.post("/api/applications", { data: { company: `Company ${i}`, role: "Engineer" } });
    }

    const response = await authedRequest.get("/api/applications?page=1&pageSize=2");
    const body = await response.json();

    expect(body.items).toHaveLength(2);
    expect(body.total).toBe(3);
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(2);
  });

  test("gets, updates, and deletes a single application", async ({ authedRequest }) => {
    const created = await (
      await authedRequest.post("/api/applications", { data: { company: "Acme Co", role: "SDET" } })
    ).json();

    const fetched = await authedRequest.get(`/api/applications/${created.id}`);
    expect(fetched.status()).toBe(200);

    const updated = await authedRequest.patch(`/api/applications/${created.id}`, {
      data: { role: "Senior SDET" },
    });
    expect(updated.status()).toBe(200);
    expect((await updated.json()).role).toBe("Senior SDET");

    const deleted = await authedRequest.delete(`/api/applications/${created.id}`);
    expect(deleted.status()).toBe(204);

    const afterDelete = await authedRequest.get(`/api/applications/${created.id}`);
    expect(afterDelete.status()).toBe(404);
  });

  test("moves an application between statuses", async ({ authedRequest }) => {
    const created = await (
      await authedRequest.post("/api/applications", { data: { company: "Acme Co", role: "SDET" } })
    ).json();

    const response = await authedRequest.patch(`/api/applications/${created.id}/status`, {
      data: { status: "interviewing" },
    });

    expect(response.status()).toBe(200);
    expect((await response.json()).status).toBe("interviewing");
  });

  test("rejects an invalid status transition value", async ({ authedRequest }) => {
    const created = await (
      await authedRequest.post("/api/applications", { data: { company: "Acme Co", role: "SDET" } })
    ).json();

    const response = await authedRequest.patch(`/api/applications/${created.id}/status`, {
      data: { status: "not-a-real-status" },
    });

    expect(response.status()).toBe(400);
  });

  test("returns 404 for another user's application", async ({ authedRequest, playwright, baseURL }) => {
    const otherUser = await playwright.request.newContext({ baseURL });
    await otherUser.post("/api/auth/register", {
      data: { name: "Other", email: `other-${Date.now()}@example.com`, password: "password123" },
    });
    const theirs = await (
      await otherUser.post("/api/applications", { data: { company: "Theirs Co", role: "QA" } })
    ).json();

    const response = await authedRequest.get(`/api/applications/${theirs.id}`);
    expect(response.status()).toBe(404);
    await otherUser.dispose();
  });
});
