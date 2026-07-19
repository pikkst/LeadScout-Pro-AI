// AI routes: proxy to Gemini for scouting/verification. Authenticated + rate-limited.
import { Router } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { asyncHandler } from "../utils/asyncHandler";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";
import * as ai from "../services/ai.service";

export const aiRouter = Router();
aiRouter.use(requireAuth);

// AI calls are expensive — throttle per client.
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many AI requests. Please slow down.", code: "RATE_LIMITED" },
});
aiRouter.use(aiLimiter);

aiRouter.post(
  "/cities",
  validate({ body: z.object({ location: z.string().min(1), focus: z.string().min(1) }) }),
  asyncHandler(async (req, res) => {
    const { location, focus } = req.body;
    res.json(await ai.findMajorCities(location, focus));
  }),
);

aiRouter.post(
  "/verify",
  validate({
    body: z.object({ email: z.string().min(1), companyName: z.string().min(1), website: z.string().min(1) }),
  }),
  asyncHandler(async (req, res) => {
    const { email, companyName, website } = req.body;
    const result = await ai.verifyEmail(email, companyName, website);
    res.json(result);
  }),
);

aiRouter.post(
  "/leads",
  validate({
    body: z.object({ city: z.string().min(1), country: z.string().min(1), focus: z.string().min(1) }),
  }),
  asyncHandler(async (req, res) => {
    const { city, country, focus } = req.body;
    const raw = await ai.findLeads(city, country, focus);
    const withIds = raw.map((lead, index) => ({
      ...lead,
      id: `lead-${city}-${Date.now()}-${index}`,
    }));
    res.json(withIds);
  }),
);

aiRouter.post(
  "/pitch",
  validate({
    body: z.object({
      lead: z.object({
        name: z.string(),
        category: z.string(),
        website: z.string(),
        description: z.string().optional().default(""),
      }),
      focus: z.string().min(1),
      preferredLanguage: z.string().default("Auto-Detect"),
    }),
  }),
  asyncHandler(async (req, res) => {
    const { lead, focus, preferredLanguage } = req.body;
    const pitch = await ai.generatePitch(lead, focus, preferredLanguage);
    res.json(pitch);
  }),
);
