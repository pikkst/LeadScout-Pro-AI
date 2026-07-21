import { Request, Response, NextFunction } from "express";
import { verifyApiKey } from "../routes/api-keys.routes";
import { asyncHandler } from "../utils/asyncHandler";

export const requireApiKey = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const key = req.header("x-api-key") || req.header("authorization")?.replace("Bearer ", "");
  if (!key) {
    return res.status(401).json({ error: "API key required" });
  }

  const record = await verifyApiKey(key);
  if (!record) {
    return res.status(401).json({ error: "Invalid API key" });
  }

  (req as any).apiKey = record;
  (req as any).user = record.user;
  next();
});
