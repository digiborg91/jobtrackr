import { test, expect } from "../fixtures/api";

test.describe("stats", () => {
  test("returns zeroed stats for a brand new user", async ({ authedRequest }) => {
    const response = await authedRequest.get("/api/stats/summary");
    const body = await response.json();

    expect(body.total).toBe(0);
    expect(body.byStatus).toEqual({
      wishlist: 0,
      applied: 0,
      interviewing: 0,
      offer: 0,
      rejected: 0,
    });
    expect(body.interviewRate).toBe(0);
    expect(body.offerRate).toBe(0);
  });

  test("computes counts and rates as applications move through statuses", async ({ authedRequest }) => {
    await authedRequest.post("/api/applications", { data: { company: "A", role: "SDET", status: "wishlist" } });
    await authedRequest.post("/api/applications", { data: { company: "B", role: "SDET", status: "applied" } });
    const interviewing = await (
      await authedRequest.post("/api/applications", { data: { company: "C", role: "SDET", status: "applied" } })
    ).json();
    await authedRequest.patch(`/api/applications/${interviewing.id}/status`, { data: { status: "interviewing" } });
    const offer = await (
      await authedRequest.post("/api/applications", { data: { company: "D", role: "SDET", status: "applied" } })
    ).json();
    await authedRequest.patch(`/api/applications/${offer.id}/status`, { data: { status: "offer" } });

    const response = await authedRequest.get("/api/stats/summary");
    const body = await response.json();

    expect(body.total).toBe(4);
    expect(body.byStatus.wishlist).toBe(1);
    expect(body.byStatus.applied).toBe(1);
    expect(body.byStatus.interviewing).toBe(1);
    expect(body.byStatus.offer).toBe(1);

    // appliedOrBeyond = total - wishlist = 3; interviewing+offer = 2
    expect(body.interviewRate).toBeCloseTo(2 / 3);
    expect(body.offerRate).toBeCloseTo(1 / 3);
  });
});
