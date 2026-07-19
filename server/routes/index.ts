// Root API router: mounts all sub-routers and a health endpoint.
import { Router } from "express";
import { authRouter } from "./auth.routes";
import { leadsRouter } from "./leads.routes";
import { pitchesRouter } from "./pitches.routes";
import { aiRouter } from "./ai.routes";
import { statsRouter } from "./stats.routes";
import { settingsRouter } from "./settings.routes";
import { getAiSettings, getEmailSettings } from "../services/settings.service";

export const apiRouter = Router();

apiRouter.get("/health", async (_req, res) => {
  const [ai, email] = await Promise.all([getAiSettings(), getEmailSettings()]);
  res.json({
    status: "ok",
    time: new Date().toISOString(),
    aiConfigured: ai.configured,
    emailConfigured: email.configured,
  });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/leads", leadsRouter);
apiRouter.use("/pitches", pitchesRouter);
apiRouter.use("/stats", statsRouter);
apiRouter.use("/ai", aiRouter);
apiRouter.use("/settings", settingsRouter);
