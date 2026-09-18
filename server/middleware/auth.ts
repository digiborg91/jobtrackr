import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { unauthorized } from "./errors";

export const AUTH_COOKIE_NAME = "jobtrackr_token";

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is not set");
  return secret;
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, getSecret(), { expiresIn: "30d" });
}

export function verifyToken(token: string): string {
  const payload = jwt.verify(token, getSecret());
  if (typeof payload === "string" || !payload.sub) {
    throw new Error("Invalid token payload");
  }
  return payload.sub;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  if (!token) {
    next(unauthorized());
    return;
  }
  try {
    req.userId = verifyToken(token);
    next();
  } catch {
    next(unauthorized("Your session has expired, please sign in again"));
  }
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(AUTH_COOKIE_NAME, { path: "/" });
}
