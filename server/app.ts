import express from "express";
import cookieParser from "cookie-parser";
import { authRouter } from "./routes/auth";
import { applicationsRouter } from "./routes/applications";
import { notesRouter } from "./routes/notes";
import { statsRouter } from "./routes/stats";
import { errorHandler } from "./middleware/errors";

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());

  // Netlify passes the original request path (e.g. /api/applications) through to
  // the function even when a redirect proxied it here, so mount at /api. Also mount
  // at the function's own path so hitting it directly (bypassing the redirect) works too.
  for (const base of ["/api", "/.netlify/functions/api"]) {
    app.use(`${base}/auth`, authRouter);
    app.use(`${base}/applications`, applicationsRouter);
    app.use(base, notesRouter);
    app.use(`${base}/stats`, statsRouter);
  }

  app.use(errorHandler);

  return app;
}
