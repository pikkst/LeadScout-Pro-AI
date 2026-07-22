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
import { usersRouter } from "./users.routes";
import { inboundRouter } from "./inbound.routes";
import { publicBookingRouter } from "./public-booking.routes";
import { integrationsRouter } from "./integrations.routes";
import { activationRouter } from "./activation.routes";
import { complianceRouter } from "./compliance.routes";
import { publicUnsubscribeRouter } from "./public-unsubscribe.routes";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    time: new Date().toISOString(),
  });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/public/booking", publicBookingRouter);
apiRouter.use("/public/unsubscribe", publicUnsubscribeRouter);
apiRouter.use("/integrations", integrationsRouter);
apiRouter.use("/activation", activationRouter);
apiRouter.use("/compliance", complianceRouter);
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
apiRouter.use("/admin/users", usersRouter);
apiRouter.use("/inbound", inboundRouter);
