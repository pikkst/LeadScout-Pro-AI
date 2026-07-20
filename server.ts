// Unitel Global — CarrierScout AI backend server.
// Serves the REST API and the React app (Vite dev middleware or static production build).
import express from "express";
import path from "path";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { config } from "./server/config";
import { prisma } from "./server/db";
import { apiRouter } from "./server/routes";
import { settingsRouter } from "./server/routes/settings.routes";
import { uploadRouter } from "./server/routes/upload.routes";
import { webhookRouter } from "./server/routes/webhook.routes";
import { errorHandler, notFoundHandler } from "./server/middleware/error";

async function startServer() {
  const app = express();
  app.set("trust proxy", 1);

  // --- Security & parsing middleware ---
  app.use(
    helmet({
      // The SPA uses the Tailwind CDN + esm.sh import maps, so relax CSP in dev.
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(
    cors({
      origin: config.isProduction ? true : true,
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

  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());

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

  // --- Frontend (Vite dev middleware or static build) ---
  let isProduction = config.isProduction;

  if (!isProduction) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true, host: "0.0.0.0" },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("[server] Vite development middleware loaded.");
    } catch (err) {
      console.warn("[server] Vite dev middleware unavailable; falling back to static mode.", err);
      isProduction = true;
    }
  }

  if (isProduction) {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("[server] Serving production build from " + distPath);
  }

  // Error handler must be last.
  app.use(errorHandler);

  // --- DB connectivity check ---
  try {
    await prisma.$connect();
    console.log("[server] Database connected.");
  } catch (err) {
    console.error("[server] FATAL: could not connect to the database. Check DATABASE_URL.", err);
    process.exit(1);
  }

  const server = app.listen(config.port, "0.0.0.0", () => {
    console.log(
      `[server] Unitel Global CarrierScout AI running on http://0.0.0.0:${config.port} (${
        isProduction ? "production" : "development"
      })`,
    );
    console.log("[server] Runtime settings (AI, Email) are managed in Settings → Admin.");
  });

  // --- Sequence execution engine (simple in-memory scheduler) ---
  const runSequenceEngine = async () => {
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
          data: { status: "COMPLETED", completedAt: new Date() },
        });
        continue;
      }

      const step = steps[currentStepIndex];
      if (!step?.isActive) {
        await prisma.sequenceExecution.update({
          where: { id: exec.id },
          data: { currentStep: currentStepIndex + 1 },
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
        // Email would be sent here via SMTP service
        console.log(`[Sequence] Would send email to lead ${exec.leadId}: ${step.subject}`);
      }

      // Advance to next step
      const nextStepIndex = currentStepIndex + 1;
      if (nextStepIndex >= steps.length) {
        await prisma.sequenceExecution.update({
          where: { id: exec.id },
          data: { status: "COMPLETED", completedAt: new Date() },
        });
      } else {
        const nextStep = steps[nextStepIndex];
        const nextRun = new Date();
        nextRun.setDate(nextRun.getDate() + (nextStep?.delayDays ?? 0));
        await prisma.sequenceExecution.update({
          where: { id: exec.id },
          data: { currentStep: nextStepIndex, nextRunAt: nextRun },
        });
      }
    }
    } catch (err) {
      console.error("[SequenceEngine] Error:", err);
    }
  };

  // Run immediately on start, then every 5 minutes
  runSequenceEngine();
  setInterval(runSequenceEngine, 5 * 60 * 1000);

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
