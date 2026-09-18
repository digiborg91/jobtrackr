import { Router } from "express";
import { z } from "zod";
import { query, queryOne } from "../db";
import { validateBody } from "../middleware/validate";
import { asyncHandler, notFound } from "../middleware/errors";
import { requireAuth } from "../middleware/auth";
import { mapNote } from "../mappers";

export const notesRouter = Router();
notesRouter.use(requireAuth);

const noteInputSchema = z.object({
  body: z.string().trim().min(1, "Note cannot be empty"),
});

interface NoteRow {
  id: string;
  application_id: string;
  body: string;
  created_at: string;
}

async function assertOwnsApplication(applicationId: string, userId: string) {
  const row = await queryOne("select id from applications where id = $1 and user_id = $2", [
    applicationId,
    userId,
  ]);
  if (!row) throw notFound("Application not found");
}

notesRouter.get(
  "/applications/:applicationId/notes",
  asyncHandler(async (req, res) => {
    const applicationId = String(req.params.applicationId);
    await assertOwnsApplication(applicationId, req.userId!);
    const rows = await query<NoteRow>(
      "select * from notes where application_id = $1 order by created_at desc",
      [applicationId],
    );
    res.json(rows.map(mapNote));
  }),
);

notesRouter.post(
  "/applications/:applicationId/notes",
  validateBody(noteInputSchema),
  asyncHandler(async (req, res) => {
    const applicationId = String(req.params.applicationId);
    await assertOwnsApplication(applicationId, req.userId!);
    const { body } = req.body as z.infer<typeof noteInputSchema>;

    const row = await queryOne<NoteRow>(
      "insert into notes (application_id, body) values ($1, $2) returning *",
      [applicationId, body],
    );
    res.status(201).json(mapNote(row!));
  }),
);

notesRouter.delete(
  "/notes/:noteId",
  asyncHandler(async (req, res) => {
    const noteId = String(req.params.noteId);
    const row = await queryOne<NoteRow>(
      `delete from notes
       using applications
       where notes.id = $1
         and notes.application_id = applications.id
         and applications.user_id = $2
       returning notes.id`,
      [noteId, req.userId],
    );
    if (!row) throw notFound("Note not found");
    res.status(204).end();
  }),
);
