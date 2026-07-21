// Centralized, validated environment configuration for the backend.
import "dotenv/config";

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(value: string | undefined, fallback: string): string {
  return value && value.trim() !== "" ? value : fallback;
}

const NODE_ENV = optional(process.env.NODE_ENV, "development");
const isProduction = NODE_ENV === "production";

export const config = {
  nodeEnv: NODE_ENV,
  isProduction,
  port: parseInt(optional(process.env.PORT, "3000"), 10),

  // Database
  databaseUrl: required("DATABASE_URL", process.env.DATABASE_URL),

  // Auth
  jwtSecret: (() => {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 16) {
      if (isProduction) {
        throw new Error("JWT_SECRET must be set to a strong value (>=16 chars) in production.");
      }
      console.warn("[config] JWT_SECRET is weak or missing — using an insecure development default.");
      return "dev-insecure-secret-change-me";
    }
    return secret;
  })(),
  jwtExpiresIn: optional(process.env.JWT_EXPIRES_IN, "7d"),
  cookieName: optional(process.env.AUTH_COOKIE_NAME, "unitel_token"),

  // CORS
  corsOrigin: isProduction
    ? required("CORS_ORIGIN", process.env.CORS_ORIGIN)
    : process.env.CORS_ORIGIN || "http://localhost:3000",

  // AI
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiModel: optional(process.env.GEMINI_MODEL, "gemini-2.5-flash"),

  // Whether new users may self-register. When false, only admins create accounts.
  allowPublicRegistration: optional(process.env.ALLOW_PUBLIC_REGISTRATION, "false") === "true",

  // SMTP / email
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: parseInt(optional(process.env.SMTP_PORT, "587"), 10),
    secure: optional(process.env.SMTP_SECURE, "false") === "true",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    fromName: optional(process.env.SMTP_FROM_NAME, "Unitel Global — Carrier Relations"),
    fromEmail: optional(process.env.SMTP_FROM_EMAIL, "info@unitelglobal.com"),
  },

  get emailEnabled(): boolean {
    return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  },
};

export type AppConfig = typeof config;
