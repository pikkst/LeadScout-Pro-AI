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
  app.use("/api", notFoundHandler);

  // --- Frontend (Vite dev middleware or static build) ---
  let isProduction = config.isProduction;

  if (!isProduction) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
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
