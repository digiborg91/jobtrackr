import { test, expect } from "../fixtures/api";

async function createApplication(authedRequest: import("@playwright/test").APIRequestContext) {
  const response = await authedRequest.post("/api/applications", {
    data: { company: "Acme Co", role: "SDET" },
  });
  return response.json();
}

test.describe("notes", () => {
  test("adds and lists notes for an application, newest first", async ({ authedRequest }) => {
    const application = await createApplication(authedRequest);

    await authedRequest.post(`/api/applications/${application.id}/notes`, {
      data: { body: "First note" },
    });
    await authedRequest.post(`/api/applications/${application.id}/notes`, {
      data: { body: "Second note" },
    });

    const response = await authedRequest.get(`/api/applications/${application.id}/notes`);
    const notes = await response.json();

    expect(notes).toHaveLength(2);
    expect(notes[0].body).toBe("Second note");
    expect(notes[1].body).toBe("First note");
  });

  test("rejects an empty note body", async ({ authedRequest }) => {
    const application = await createApplication(authedRequest);

    const response = await authedRequest.post(`/api/applications/${application.id}/notes`, {
      data: { body: "   " },
    });

    expect(response.status()).toBe(400);
  });

  test("returns 404 when adding a note to another user's application", async ({
    authedRequest,
    playwright,
    baseURL,
  }) => {
    const otherUser = await playwright.request.newContext({ baseURL });
    await otherUser.post("/api/auth/register", {
      data: { name: "Other", email: `other-${Date.now()}@example.com`, password: "password123" },
    });
    const theirs = await (
      await otherUser.post("/api/applications", { data: { company: "Theirs Co", role: "QA" } })
    ).json();

    const response = await authedRequest.post(`/api/applications/${theirs.id}/notes`, {
      data: { body: "Sneaky note" },
    });

    expect(response.status()).toBe(404);
    await otherUser.dispose();
  });

  test("deletes a note", async ({ authedRequest }) => {
    const application = await createApplication(authedRequest);
    const note = await (
      await authedRequest.post(`/api/applications/${application.id}/notes`, { data: { body: "Delete me" } })
    ).json();

    const deleted = await authedRequest.delete(`/api/notes/${note.id}`);
    expect(deleted.status()).toBe(204);

    const notes = await (await authedRequest.get(`/api/applications/${application.id}/notes`)).json();
    expect(notes).toHaveLength(0);
  });
});
