import rateLimit from "express-rate-limit";

export const expensiveOperationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many AI operations. Please try again later.", code: "RATE_LIMITED" },
});
