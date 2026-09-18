import { Router } from "express";
import { query } from "../db";
import { asyncHandler } from "../middleware/errors";
import { requireAuth } from "../middleware/auth";

export const statsRouter = Router();
statsRouter.use(requireAuth);

const STATUSES = ["wishlist", "applied", "interviewing", "offer", "rejected"] as const;

statsRouter.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const rows = await query<{ status: string; count: string }>(
      "select status, count(*) from applications where user_id = $1 group by status",
      [req.userId],
    );

    const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<
      (typeof STATUSES)[number],
      number
    >;
    let total = 0;
    for (const row of rows) {
      const count = Number(row.count);
      if (row.status in byStatus) byStatus[row.status as (typeof STATUSES)[number]] = count;
      total += count;
    }

    const [{ count: addedLast7DaysRaw }] = await query<{ count: string }>(
      "select count(*) from applications where user_id = $1 and created_at >= now() - interval '7 days'",
      [req.userId],
    );

    const appliedOrBeyond = total - byStatus.wishlist;
    const interviewRate =
      appliedOrBeyond > 0 ? (byStatus.interviewing + byStatus.offer) / appliedOrBeyond : 0;
    const offerRate = appliedOrBeyond > 0 ? byStatus.offer / appliedOrBeyond : 0;

    res.json({
      total,
      byStatus,
      addedLast7Days: Number(addedLast7DaysRaw),
      interviewRate,
      offerRate,
    });
  }),
);
