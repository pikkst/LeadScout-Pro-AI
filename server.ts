// Unitel Global — CarrierScout AI backend server.
// Serves the REST API and the React app (Vite dev middleware or static production build).
import express from "express";
import path from "path";
import { readFile } from "fs/promises";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { config } from "./server/config";
import { prisma } from "./server/db";
import { apiRouter } from "./server/routes";
import { settingsRouter } from "./server/routes/settings.routes";
import { uploadRouter } from "./server/routes/upload.routes";
import { webhookRouter } from "./server/routes/webhook.routes";
import { inboundRouter } from "./server/routes/inbound.routes";
import { errorHandler, notFoundHandler } from "./server/middleware/error";
import { sendPitchEmail } from "./server/services/email.service";
import { logActivity } from "./server/utils/activity";
import { getOrCreateBookingLink } from "./server/services/calendar.service";
import { getOrCreateUnsubscribeLink } from "./server/services/compliance.service";
import { recordActivationEvent } from "./server/services/activation.service";

async function startServer() {
  const app = express();
  if (config.trustProxy !== false) app.set("trust proxy", config.trustProxy);

  // --- Security & parsing middleware ---
  const helmetConfig: Parameters<typeof helmet>[0] = {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: config.isProduction ? ["'self'"] : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: config.isProduction ? ["'self'"] : ["'self'", "'unsafe-inline'"],
        styleSrcAttr: ["'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: config.isProduction ? ["'self'"] : ["'self'", `ws://localhost:${config.port}`],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  };
  app.use(helmet(helmetConfig));
  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
    }),
  );

  // Chrome DevTools probes this URL when automatic workspace discovery is
  // enabled. A deliberate empty response avoids Express/Vite's CSP-locked 404
  // document, which browser extensions may otherwise try to modify.
  app.get("/.well-known/appspecific/com.chrome.devtools.json", (_req, res) => {
    res.status(204).end();
  });

  // Webhook endpoints need the raw body for signature verification; parse them
  // as raw text and JSON-decode manually inside the route. Mounted before the
  // global JSON parser so the raw stream is still available.
  app.use(
    "/api/webhooks",
    express.text({ type: "*/*", limit: "1mb" }),
    (req, _res, next) => {
      (req as express.Request & { rawBody?: string }).rawBody = typeof req.body === "string" ? req.body : "";
      if (req.body) {
        try {
          req.body = JSON.parse(req.body);
        } catch {
          /* leave as-is; route will validate */
        }
      }
      next();
    },
  );
  app.use("/api/webhooks", webhookRouter);

  app.use(
    "/api/inbound",
    express.text({ type: "*/*", limit: "1mb" }),
    (req, _res, next) => {
      (req as express.Request & { rawBody?: string }).rawBody = typeof req.body === "string" ? req.body : "";
      if (req.body) {
        try {
          req.body = JSON.parse(req.body);
        } catch {
          /* leave as-is; route will validate */
        }
      }
      next();
    },
  );
  app.use("/api/inbound", inboundRouter);

  app.use(express.json({ limit: "2mb" }));
  // Global light rate limit as a safety net.
  app.use(
    "/api",
    rateLimit({
      windowMs: 60 * 1000,
      max: 200,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: "Too many requests. Please try again shortly.", code: "RATE_LIMITED" },
    }),
  );

  // --- API ---
  app.use("/api", apiRouter);
  // Uploaded assets (e.g. company logo) served publicly before the 404 handler.
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
  app.use("/api/settings", settingsRouter);
  app.use("/api/settings", uploadRouter);
  app.use("/api", notFoundHandler);

  let servesStaticFrontend = config.isProduction || process.argv.includes("--serve-static");

  const mountStaticFrontend = () => {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.use(
      rateLimit({
        windowMs: 60 * 1000,
        max: 200,
        standardHeaders: true,
        legacyHeaders: false,
      }),
      (req, res, next) => {
        if (req.method !== "GET") return next();
        res.sendFile(path.join(distPath, "index.html"));
      },
    );
    console.log("[server] Serving production build from " + path.basename(distPath) + " (" + distPath + ")");
  };

  if (servesStaticFrontend) mountStaticFrontend();

  const server = app.listen(config.port, "0.0.0.0", () => {
    console.log(
      `[server] Unitel Global CarrierScout AI running on http://localhost:${config.port} (${
        config.isProduction ? "production" : servesStaticFrontend ? "static development" : "development"
      })`,
    );
    console.log("[server] Runtime settings (AI, Email) are managed in Settings → Admin.");
  });

  // --- Frontend (Vite dev middleware or static build) ---
  if (!servesStaticFrontend) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true, host: "0.0.0.0", hmr: { server: server } },
        appType: "spa",
      });
      app.use(vite.middlewares);
      app.use(async (req, res, next) => {
        if (req.method !== "GET" || req.path.startsWith("/api")) return next();
        try {
          const templatePath = path.join(process.cwd(), "index.html");
          const template = await readFile(templatePath, "utf-8");
          const html = await vite.transformIndexHtml(req.originalUrl, template);
          res.status(200).type("html").send(html);
        } catch (error) {
          vite.ssrFixStacktrace(error as Error);
          next(error);
        }
      });
      console.log("[server] Vite development middleware loaded.");
    } catch (err) {
      console.warn("[server] Vite dev middleware unavailable; falling back to static mode.", err);
      servesStaticFrontend = true;
      mountStaticFrontend();
    }
  }

  // Error handler must be last.
  app.use(errorHandler);

  // --- DB connectivity check ---
  let dbConnected = false;
  try {
    await prisma.$connect();
    console.log("[server] Database connected.");
    dbConnected = true;
  } catch (err) {
    console.warn("[server] WARNING: could not connect to the database. Check DATABASE_URL. API routes will fail until the database is available.", err);
  }

  // --- Pitch scheduler (send scheduled pitches at their optimized time) ---
  const pitchSendLocks = new Set<string>();

  async function runPitchScheduler() {
    if (!dbConnected) return;
    try {
      const now = new Date();
      await prisma.pitch.updateMany({
        where: { status: "SENDING", updatedAt: { lt: new Date(now.getTime() - 15 * 60 * 1000) } },
        data: { status: "FAILED" },
      });
      const due = await prisma.pitch.findMany({
        where: {
          status: "DRAFT",
          scheduledSendAt: { lte: now, not: null },
        },
        include: { createdBy: true },
      });

      for (const pitch of due) {
        if (pitchSendLocks.has(pitch.id)) continue;

        pitchSendLocks.add(pitch.id);
        try {
          // Claim in the database before SMTP. If the process crashes after the
          // provider accepts the message, the cleared schedule prevents a resend.
          const claimed = await prisma.pitch.updateMany({
            where: {
              id: pitch.id,
              status: "DRAFT",
              scheduledSendAt: { lte: now, not: null },
            },
            data: { scheduledSendAt: null, status: "SENDING" },
          });
          if (claimed.count !== 1) continue;

          const sender = pitch.createdBy;
          if (!sender) {
            await prisma.pitch.update({ where: { id: pitch.id }, data: { status: "FAILED" } });
            continue;
          }

          try {
            const bookingLink = await getOrCreateBookingLink({
              pitchId: pitch.id,
              leadId: pitch.leadId,
              agentId: sender.id,
            });
            const unsubscribeLink = await getOrCreateUnsubscribeLink(pitch.id, pitch.leadEmail);
            const result = await sendPitchEmail({
              to: pitch.leadEmail,
              subject: pitch.subject,
              html: pitch.htmlContent,
              text: pitch.textContent,
              replyTo: undefined,
              pitchId: pitch.id,
              bookingUrl: bookingLink.url,
              unsubscribeUrl: unsubscribeLink.url,
            });

            await prisma.$transaction([
              prisma.pitch.update({
                where: { id: pitch.id },
                data: {
                  status: "SENT",
                  sentAt: now,
                  sentFromName: sender.name,
                  sentFromEmail: sender.email,
                  replyToEmail: config.inboundEmailAddress,
                  sentMessageId: result.messageId,
                } as any,
              }),
              prisma.pitchEvent.create({ data: { pitchId: pitch.id, type: "SENT" } }),
              prisma.lead.updateMany({
                where: { id: pitch.leadId, stage: "DISCOVERED" },
                data: { stage: "CONTACTED", lastContactedAt: now },
              }),
            ]);

            await logActivity({
              action: "PITCH_SENT",
              detail: `Scheduled send: From: ${sender.name} <${sender.email}> → To: ${pitch.leadName} <${pitch.leadEmail}>`,
              userId: sender.id,
              leadId: pitch.leadId,
            });
            await recordActivationEvent({ type: "PITCH_SENT", userId: sender.id, leadId: pitch.leadId, pitchId: pitch.id, metadata: { scheduled: true } });
          } catch (err) {
            await prisma.pitch.update({ where: { id: pitch.id }, data: { status: "FAILED" } });
            await prisma.pitchEvent.create({ data: { pitchId: pitch.id, type: "FAILED" } });
            await logActivity({
              action: "PITCH_SEND_FAILED",
              detail: `Scheduled send failed for ${pitch.leadName}: ${(err as Error).message}`,
              userId: sender.id,
              leadId: pitch.leadId,
            });
            console.error(`[PitchScheduler] Failed pitch ${pitch.id}:`, err);
          }
        } finally {
          pitchSendLocks.delete(pitch.id);
        }
      }
    } catch (err) {
      console.error("[PitchScheduler] Error:", err);
    }
  }

  if (dbConnected) {
    runPitchScheduler();
    setInterval(runPitchScheduler, 30 * 1000);
  }

// --- Sequence execution engine ---
const escapeHtml = (value: string) => value
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const runSequenceEngine = async () => {
  if (!dbConnected) return;
  try {
    const now = new Date();
    const staleBefore = new Date(now.getTime() - 15 * 60 * 1000);
    await prisma.sequenceExecution.updateMany({
      where: { status: "ACTIVE", processingStartedAt: { lt: staleBefore } },
      data: { status: "PAUSED" },
    });

    const dueExecutions = await prisma.sequenceExecution.findMany({
      where: { status: "ACTIVE", nextRunAt: { lte: now }, processingStep: null },
      include: {
        sequence: { include: { steps: { orderBy: { order: "asc" } } } },
        lead: { include: { assignedAgent: true, createdBy: true } },
      },
    });

    for (const execution of dueExecutions) {
      const steps = execution.sequence.steps;
      const stepIndex = execution.currentStep;
      const step = steps[stepIndex];
      if (!step) {
        await prisma.sequenceExecution.update({
          where: { id: execution.id },
          data: { status: "COMPLETED", completedAt: now, nextRunAt: null },
        });
        continue;
      }

      const claimed = await prisma.sequenceExecution.updateMany({
        where: { id: execution.id, status: "ACTIVE", currentStep: stepIndex, processingStep: null },
        data: { processingStep: stepIndex, processingStartedAt: now },
      });
      if (claimed.count !== 1) continue;

      try {
        if (!step.isActive) {
          const next = steps[stepIndex + 1];
          const nextRunAt = next ? new Date(now.getTime() + next.delayDays * 86_400_000) : null;
          await prisma.sequenceExecution.update({
            where: { id: execution.id },
            data: {
              currentStep: stepIndex + 1,
              status: next ? "ACTIVE" : "COMPLETED",
              completedAt: next ? null : now,
              nextRunAt,
              processingStep: null,
              processingStartedAt: null,
              triggeredStep: null,
            },
          });
          continue;
        }

        if (step.triggerEvent && execution.triggeredStep !== stepIndex) {
          const since = execution.lastEventCheckedAt || execution.startedAt;
          const matchingEvent = await prisma.pitchEvent.findFirst({
            where: { pitch: { leadId: execution.leadId }, type: step.triggerEvent, createdAt: { gt: since } },
            orderBy: { createdAt: "asc" },
          });
          if (!matchingEvent) {
            await prisma.sequenceExecution.update({
              where: { id: execution.id },
              data: {
                lastEventCheckedAt: now,
                nextRunAt: new Date(now.getTime() + 5 * 60 * 1000),
                processingStep: null,
                processingStartedAt: null,
              },
            });
            continue;
          }
          if (step.stopOnEvent) {
            await prisma.sequenceExecution.update({
              where: { id: execution.id },
              data: {
                status: "COMPLETED",
                completedAt: now,
                nextRunAt: null,
                lastEventCheckedAt: now,
                processingStep: null,
                processingStartedAt: null,
              },
            });
            continue;
          }
          const eventDelay = step.eventDelayDays ?? 0;
          if (eventDelay > 0) {
            await prisma.sequenceExecution.update({
              where: { id: execution.id },
              data: {
                triggeredStep: stepIndex,
                lastEventCheckedAt: now,
                nextRunAt: new Date(now.getTime() + eventDelay * 86_400_000),
                processingStep: null,
                processingStartedAt: null,
              },
            });
            continue;
          }
        }

        if (step.actionType === "TASK" && step.taskName) {
          await prisma.followUpTask.upsert({
            where: { leadId: execution.leadId },
            update: { taskName: step.taskName, dueDate: now, notes: `Auto-created by sequence: ${execution.sequence.name}` },
            create: { leadId: execution.leadId, taskName: step.taskName, dueDate: now, notes: `Auto-created by sequence: ${execution.sequence.name}` },
          });
        } else if (step.actionType === "EMAIL" && step.subject && step.body) {
          const sender = execution.lead.assignedAgent || execution.lead.createdBy;
          if (!sender) throw new Error("Sequence email has no available sender");
          const pitch = await prisma.pitch.create({
            data: {
              leadId: execution.lead.id,
              leadName: execution.lead.name,
              leadEmail: execution.lead.email,
              subject: step.subject,
              htmlContent: `<p>${escapeHtml(step.body).replace(/\n/g, "<br>")}</p>`,
              textContent: step.body,
              language: "English",
              status: "DRAFT",
              createdById: sender.id,
            },
          });
          await recordActivationEvent({ type: "PITCH_CREATED", userId: sender.id, leadId: pitch.leadId, pitchId: pitch.id, metadata: { sequence: execution.sequence.id } });
          try {
            const bookingLink = await getOrCreateBookingLink({
              pitchId: pitch.id,
              leadId: pitch.leadId,
              agentId: sender.id,
            });
            const unsubscribeLink = await getOrCreateUnsubscribeLink(pitch.id, pitch.leadEmail);
            const sent = await sendPitchEmail({
              to: pitch.leadEmail,
              subject: pitch.subject,
              html: pitch.htmlContent,
              text: pitch.textContent,
              replyTo: sender.email,
              pitchId: pitch.id,
              bookingUrl: bookingLink.url,
              unsubscribeUrl: unsubscribeLink.url,
            });
            await prisma.$transaction([
              prisma.pitch.update({
                where: { id: pitch.id },
                data: {
                  status: "SENT",
                  sentAt: new Date(),
                  sentFromName: sender.name,
                  sentFromEmail: sender.email,
                  replyToEmail: sender.email,
                  sentMessageId: sent.messageId,
                },
              }),
              prisma.pitchEvent.create({ data: { pitchId: pitch.id, type: "SENT" } }),
              prisma.lead.updateMany({
                where: { id: pitch.leadId, stage: "DISCOVERED" },
                data: { stage: "CONTACTED", lastContactedAt: new Date() },
              }),
            ]);
            await recordActivationEvent({ type: "PITCH_SENT", userId: sender.id, leadId: pitch.leadId, pitchId: pitch.id, metadata: { sequence: execution.sequence.id } });
          } catch (error) {
            await prisma.pitch.update({ where: { id: pitch.id }, data: { status: "FAILED" } });
            throw error;
          }
        } else {
          throw new Error(`Sequence step ${step.id} is incomplete or unsupported`);
        }

        const nextStep = steps[stepIndex + 1];
        await prisma.sequenceExecution.update({
          where: { id: execution.id },
          data: {
            currentStep: stepIndex + 1,
            status: nextStep ? "ACTIVE" : "COMPLETED",
            completedAt: nextStep ? null : new Date(),
            nextRunAt: nextStep ? new Date(Date.now() + nextStep.delayDays * 86_400_000) : null,
            lastEventCheckedAt: now,
            triggeredStep: null,
            processingStep: null,
            processingStartedAt: null,
          },
        });
      } catch (error) {
        await prisma.sequenceExecution.update({
          where: { id: execution.id },
          data: { status: "PAUSED", processingStep: null, processingStartedAt: null },
        });
        console.error(`[SequenceEngine] Paused execution ${execution.id}:`, error);
      }
    }
  } catch (err) {
    console.error("[SequenceEngine] Error:", err);
  }
};

  // Run immediately on start, then every 5 minutes
  if (dbConnected) {
    runSequenceEngine();
    setInterval(runSequenceEngine, 5 * 60 * 1000);
  }

  // --- Graceful shutdown ---
  const shutdown = async (signal: string) => {
    console.log(`\n[server] ${signal} received, shutting down...`);
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

startServer().catch((err) => {
  console.error("[server] Failed to start:", err);
  process.exit(1);
});
