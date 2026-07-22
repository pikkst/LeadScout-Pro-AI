// Unitel Global — CarrierScout AI backend server.
// Serves the REST API and the React app (Vite dev middleware or static production build).
import express from "express";
import path from "path";
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

async function startServer() {
  const app = express();
  app.set("trust proxy", 1);

  // --- Security & parsing middleware ---
  const helmetConfig: Parameters<typeof helmet>[0] = {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: config.isProduction ? ["'self'"] : ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.tailwindcss.com"],
        styleSrc: config.isProduction ? ["'self'"] : ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: config.isProduction ? ["'self'"] : ["'self'", `ws://localhost:${config.port}`],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
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

  let isProduction = config.isProduction;

  if (isProduction) {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get(
      "*",
      rateLimit({
        windowMs: 60 * 1000,
        max: 200,
        standardHeaders: true,
        legacyHeaders: false,
      }),
      (_req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      },
    );
    console.log("[server] Serving production build from " + path.basename(distPath) + " (" + distPath + ")");
  }

  const server = app.listen(config.port, "0.0.0.0", () => {
    console.log(
      `[server] Unitel Global CarrierScout AI running on http://0.0.0.0:${config.port} (${
        isProduction ? "production" : "development"
      })`,
    );
    console.log("[server] Runtime settings (AI, Email) are managed in Settings → Admin.");
  });

  // --- Frontend (Vite dev middleware or static build) ---
  if (!isProduction) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true, host: "0.0.0.0", hmr: { server: server } },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("[server] Vite development middleware loaded.");
    } catch (err) {
      console.warn("[server] Vite dev middleware unavailable; falling back to static mode.", err);
      isProduction = true;
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
            data: { scheduledSendAt: null },
          });
          if (claimed.count !== 1) continue;

          const sender = pitch.createdBy;
          if (!sender) {
            await prisma.pitch.update({ where: { id: pitch.id }, data: { status: "FAILED" } });
            continue;
          }

          try {
            const result = await sendPitchEmail({
              to: pitch.leadEmail,
              subject: pitch.subject,
              html: pitch.htmlContent,
              text: pitch.textContent,
              replyTo: undefined,
              pitchId: pitch.id,
            });

            await prisma.pitch.update({
              where: { id: pitch.id },
              data: {
                status: "SENT",
                sentAt: now,
                sentFromName: sender.name,
                sentFromEmail: sender.email,
                replyToEmail: config.inboundEmailAddress,
                sentMessageId: result.messageId,
              } as any,
            });

            await prisma.pitchEvent.create({
              data: { pitchId: pitch.id, type: "SENT" },
            });

            await prisma.lead.updateMany({
              where: { id: pitch.leadId, stage: "DISCOVERED" },
              data: { stage: "CONTACTED", lastContactedAt: new Date() },
            });

            await logActivity({
            action: "PITCH_SENT",
            detail: `Scheduled send: From: ${sender.name} <${sender.email}> → To: ${pitch.leadName} <${pitch.leadEmail}>`,
            userId: sender.id,
            leadId: pitch.leadId,
          });
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

// --- Sequence execution engine (simple in-memory scheduler) ---
const runSequenceEngine = async () => {
    if (!dbConnected) return;
    try {
      const now = new Date();
      const dueExecutions = await prisma.sequenceExecution.findMany({
        where: {
          status: "ACTIVE",
          nextRunAt: { lte: now },
        },
        include: {
          sequence: { include: { steps: { orderBy: { order: "asc" } } } },
          lead: true,
        },
      });

    for (const exec of dueExecutions) {
      const sequence = exec.sequence;
      const steps = sequence.steps;
      const currentStepIndex = exec.currentStep;

      if (currentStepIndex >= steps.length) {
        await prisma.sequenceExecution.update({
          where: { id: exec.id },
          data: { status: "COMPLETED", completedAt: new Date(), lastEventCheckedAt: now },
        });
        continue;
      }

      const step = steps[currentStepIndex];
      if (!step?.isActive) {
        await prisma.sequenceExecution.update({
          where: { id: exec.id },
          data: { currentStep: currentStepIndex + 1, lastEventCheckedAt: now },
        });
        continue;
      }

      let shouldAdvance = true;
      let nextRun = new Date();

      // Event-driven step handling
      if (step.triggerEvent && exec.leadId) {
        const since = exec.lastEventCheckedAt || exec.startedAt;
        const matchingEvents = await prisma.pitchEvent.findMany({
          where: {
            pitch: {
              leadId: exec.leadId,
            },
            type: step.triggerEvent,
            createdAt: { gt: since },
          },
          take: 1,
        });

        if (matchingEvents.length > 0) {
          if (step.stopOnEvent) {
            await prisma.sequenceExecution.update({
              where: { id: exec.id },
              data: { status: "COMPLETED", completedAt: new Date(), lastEventCheckedAt: now },
            });
            continue;
          }
          const delay = step.eventDelayDays ?? step.delayDays ?? 0;
          nextRun.setDate(nextRun.getDate() + delay);
          shouldAdvance = true;
        } else {
          const delay = step.delayDays ?? 0;
          nextRun.setDate(nextRun.getDate() + delay);
          shouldAdvance = true;
        }
      } else {
        const delay = step.delayDays ?? 0;
        nextRun.setDate(nextRun.getDate() + delay);
        shouldAdvance = true;
      }

      if (!shouldAdvance) {
        await prisma.sequenceExecution.update({
          where: { id: exec.id },
          data: { lastEventCheckedAt: now },
        });
        continue;
      }

      // Execute step action
      if (step.actionType === "TASK" && step.taskName) {
        await prisma.followUpTask.upsert({
          where: { leadId: exec.leadId },
          update: {
            taskName: step.taskName,
            dueDate: new Date(),
            notes: `Auto-created by sequence: ${sequence.name}`,
          },
          create: {
            leadId: exec.leadId,
            taskName: step.taskName,
            dueDate: new Date(),
            notes: `Auto-created by sequence: ${sequence.name}`,
          },
        });
      } else if (step.actionType === "EMAIL" && step.subject && step.body) {
        console.log(`[Sequence] Would send email to lead ${exec.leadId}: ${step.subject}`);
      }

      // Advance to next step
      const nextStepIndex = currentStepIndex + 1;
      if (nextStepIndex >= steps.length) {
        await prisma.sequenceExecution.update({
          where: { id: exec.id },
          data: { status: "COMPLETED", completedAt: new Date(), lastEventCheckedAt: now },
        });
      } else {
        await prisma.sequenceExecution.update({
          where: { id: exec.id },
          data: { currentStep: nextStepIndex, nextRunAt: nextRun, lastEventCheckedAt: now },
        });
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
