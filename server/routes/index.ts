// Root API router: mounts all sub-routers and a health endpoint.
import { Router } from "express";
import { authRouter } from "./auth.routes";
import { leadsRouter } from "./leads.routes";
import { pitchesRouter } from "./pitches.routes";
import { templatesRouter } from "./templates.routes";
import { eventsRouter } from "./events.routes";
import { customFieldsRouter, dealStagesRouter } from "./custom-fields.routes";
import { sequencesRouter } from "./sequences.routes";
import { aiRouter } from "./ai.routes";
import { statsRouter } from "./stats.routes";
import { settingsRouter } from "./settings.routes";
import { revenueRouter } from "./revenue.routes";
import { routingRouter } from "./routing.routes";
import { calendarRouter } from "./calendar.routes";
import { documentsRouter } from "./documents.routes";
import { apiKeysRouter } from "./api-keys.routes";
import { monitoringRouter } from "./monitoring.routes";
import { optimizationRouter } from "./optimization.routes";
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
apiRouter.use("/templates", templatesRouter);
apiRouter.use("/events", eventsRouter);
apiRouter.use("/custom-fields", customFieldsRouter);
apiRouter.use("/custom-fields/stages", dealStagesRouter);
apiRouter.use("/sequences", sequencesRouter);
apiRouter.use("/stats", statsRouter);
apiRouter.use("/ai", aiRouter);
apiRouter.use("/settings", settingsRouter);
apiRouter.use("/revenue", revenueRouter);
apiRouter.use("/routing", routingRouter);
apiRouter.use("/calendar", calendarRouter);
apiRouter.use("/documents", documentsRouter);
apiRouter.use("/api-keys", apiKeysRouter);
apiRouter.use("/monitoring", monitoringRouter);
apiRouter.use("/optimization", optimizationRouter);
