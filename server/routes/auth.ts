import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { queryOne } from "../db";
import { validateBody } from "../middleware/validate";
import { asyncHandler, conflict, unauthorized } from "../middleware/errors";
import { clearAuthCookie, requireAuth, setAuthCookie, signToken } from "../middleware/auth";
import { mapUser } from "../mappers";

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
}

authRouter.post(
  "/register",
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body as z.infer<typeof registerSchema>;

    const existing = await queryOne<UserRow>("select id from users where email = $1", [email]);
    if (existing) throw conflict("An account with this email already exists");

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await queryOne<UserRow>(
      "insert into users (name, email, password_hash) values ($1, $2, $3) returning id, email, name",
      [name, email, passwordHash],
    );

    const token = signToken(user!.id);
    setAuthCookie(res, token);
    res.status(201).json(mapUser(user!));
  }),
);

authRouter.post(
  "/login",
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as z.infer<typeof loginSchema>;

    const user = await queryOne<UserRow>(
      "select id, email, name, password_hash from users where email = $1",
      [email],
    );
    if (!user) throw unauthorized("Incorrect email or password");

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw unauthorized("Incorrect email or password");

    const token = signToken(user.id);
    setAuthCookie(res, token);
    res.json(mapUser(user));
  }),
);

authRouter.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.status(204).end();
});

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await queryOne<UserRow>("select id, email, name from users where id = $1", [req.userId]);
    if (!user) throw unauthorized();
    res.json(mapUser(user));
  }),
);
