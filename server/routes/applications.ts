import { Router } from "express";
import { z } from "zod";
import { query, queryOne } from "../db";
import { validateBody, validateQuery } from "../middleware/validate";
import { asyncHandler, notFound } from "../middleware/errors";
import { requireAuth } from "../middleware/auth";
import { mapApplication } from "../mappers";

export const applicationsRouter = Router();
applicationsRouter.use(requireAuth);

const STATUSES = ["wishlist", "applied", "interviewing", "offer", "rejected"] as const;
const SOURCES = ["linkedin", "referral", "company_website", "job_board", "recruiter", "other"] as const;

const listQuerySchema = z.object({
  status: z.enum(STATUSES).optional(),
  search: z.string().trim().min(1).optional(),
  tag: z.string().trim().min(1).optional(),
  sort: z.enum(["newest", "oldest", "company"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const applicationInputSchema = z.object({
  company: z.string().trim().min(1, "Company is required"),
  role: z.string().trim().min(1, "Role is required"),
  jobUrl: z.string().trim().url().nullable().optional(),
  salaryMin: z.number().int().nonnegative().nullable().optional(),
  salaryMax: z.number().int().nonnegative().nullable().optional(),
  location: z.string().trim().nullable().optional(),
  status: z.enum(STATUSES).optional(),
  source: z.enum(SOURCES, { required_error: "Source is required", invalid_type_error: "Source is required" }),
  tags: z.array(z.string().trim().min(1)).optional(),
  nextFollowUp: z.string().date().nullable().optional(),
});

const applicationUpdateSchema = applicationInputSchema.partial();

const statusUpdateSchema = z.object({ status: z.enum(STATUSES) });

interface ApplicationRow {
  id: string;
  company: string;
  role: string;
  job_url: string | null;
  salary_min: number | null;
  salary_max: number | null;
  location: string | null;
  status: string;
  source: string;
  tags: string[];
  next_follow_up: string | null;
  created_at: string;
  updated_at: string;
}

applicationsRouter.get(
  "/",
  validateQuery(listQuerySchema),
  asyncHandler(async (req, res) => {
    const filters = req.validatedQuery as z.infer<typeof listQuerySchema>;
    const conditions: string[] = ["user_id = $1"];
    const params: unknown[] = [req.userId];

    if (filters.status) {
      params.push(filters.status);
      conditions.push(`status = $${params.length}`);
    }
    if (filters.search) {
      params.push(`%${filters.search.toLowerCase()}%`);
      conditions.push(`(lower(company) like $${params.length} or lower(role) like $${params.length})`);
    }
    if (filters.tag) {
      params.push(filters.tag);
      conditions.push(`$${params.length} = any(tags)`);
    }

    const whereClause = conditions.join(" and ");
    const orderBy =
      filters.sort === "oldest" ? "created_at asc" : filters.sort === "company" ? "company asc" : "created_at desc";

    const countRow = await queryOne<{ count: string }>(
      `select count(*) from applications where ${whereClause}`,
      params,
    );
    const total = Number(countRow?.count ?? 0);

    const offset = (filters.page - 1) * filters.pageSize;
    const rows = await query<ApplicationRow>(
      `select * from applications where ${whereClause} order by ${orderBy} limit $${params.length + 1} offset $${params.length + 2}`,
      [...params, filters.pageSize, offset],
    );

    res.json({
      items: rows.map(mapApplication),
      page: filters.page,
      pageSize: filters.pageSize,
      total,
    });
  }),
);

applicationsRouter.post(
  "/",
  validateBody(applicationInputSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as z.infer<typeof applicationInputSchema>;

    const row = await queryOne<ApplicationRow>(
      `insert into applications
        (user_id, company, role, job_url, salary_min, salary_max, location, status, source, tags, next_follow_up)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       returning *`,
      [
        req.userId,
        input.company,
        input.role,
        input.jobUrl ?? null,
        input.salaryMin ?? null,
        input.salaryMax ?? null,
        input.location ?? null,
        input.status ?? "wishlist",
        input.source,
        input.tags ?? [],
        input.nextFollowUp ?? null,
      ],
    );

    res.status(201).json(mapApplication(row!));
  }),
);

async function findOwnedApplication(id: string | string[], userId: string) {
  const row = await queryOne<ApplicationRow>("select * from applications where id = $1 and user_id = $2", [
    String(id),
    userId,
  ]);
  if (!row) throw notFound("Application not found");
  return row;
}

applicationsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const row = await findOwnedApplication(req.params.id, req.userId!);
    res.json(mapApplication(row));
  }),
);

applicationsRouter.patch(
  "/:id/status",
  validateBody(statusUpdateSchema),
  asyncHandler(async (req, res) => {
    const applicationId = String(req.params.id);
    await findOwnedApplication(applicationId, req.userId!);
    const { status } = req.body as z.infer<typeof statusUpdateSchema>;

    const row = await queryOne<ApplicationRow>(
      "update applications set status = $1, updated_at = now() where id = $2 returning *",
      [status, applicationId],
    );
    res.json(mapApplication(row!));
  }),
);

applicationsRouter.patch(
  "/:id",
  validateBody(applicationUpdateSchema),
  asyncHandler(async (req, res) => {
    const applicationId = String(req.params.id);
    await findOwnedApplication(applicationId, req.userId!);
    const input = req.body as z.infer<typeof applicationUpdateSchema>;

    const fieldMap: Record<string, unknown> = {
      company: input.company,
      role: input.role,
      job_url: input.jobUrl,
      salary_min: input.salaryMin,
      salary_max: input.salaryMax,
      location: input.location,
      status: input.status,
      source: input.source,
      tags: input.tags,
      next_follow_up: input.nextFollowUp,
    };

    const setClauses: string[] = [];
    const params: unknown[] = [];
    for (const [column, value] of Object.entries(fieldMap)) {
      if (value === undefined) continue;
      params.push(value);
      setClauses.push(`${column} = $${params.length}`);
    }

    if (setClauses.length === 0) {
      const row = await findOwnedApplication(applicationId, req.userId!);
      res.json(mapApplication(row));
      return;
    }

    setClauses.push("updated_at = now()");
    params.push(applicationId);

    const row = await queryOne<ApplicationRow>(
      `update applications set ${setClauses.join(", ")} where id = $${params.length} returning *`,
      params,
    );
    res.json(mapApplication(row!));
  }),
);

applicationsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const applicationId = String(req.params.id);
    await findOwnedApplication(applicationId, req.userId!);
    await query("delete from applications where id = $1", [applicationId]);
    res.status(204).end();
  }),
);
