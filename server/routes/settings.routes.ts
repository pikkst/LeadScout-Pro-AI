// Admin settings routes: view and edit runtime configuration from the UI,
// and test AI / SMTP connections. All routes require ADMIN.
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { validate } from "../middleware/validate";
import { requireAuth, requireRole } from "../middleware/auth";
import { logActivity } from "../utils/activity";
import {
  SETTING_DEFS,
  getSettingsForUi,
  getBootstrapInfo,
  updateSettings,
  isSecretKey,
  getEmailSettings,
  setInternalSetting,
} from "../services/settings.service";
import { verifyAiConfig } from "../services/ai.service";
import { verifySmtpConfig, resetEmailTransport } from "../services/email.service";
import { markSenderVerified } from "../services/compliance.service";
import { recordActivationEvent } from "../services/activation.service";

export const settingsRouter = Router();
settingsRouter.use(requireAuth, requireRole("ADMIN"));

// Metadata + current (masked) values for rendering the settings form.
settingsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json({
      defs: SETTING_DEFS.map((d) => ({
        key: d.key,
        label: d.label,
        group: d.group,
        type: d.type,
        placeholder: d.placeholder ?? "",
        help: d.help ?? "",
      })),
      values: await getSettingsForUi(),
      bootstrap: getBootstrapInfo(),
    });
  }),
);

// Save a batch of settings. Empty secret values are ignored (keep existing).
const updateSchema = z.object({
  values: z.record(z.string(), z.union([z.string(), z.boolean(), z.number()])),
});

settingsRouter.put(
  "/",
  validate({ body: updateSchema }),
  asyncHandler(async (req, res) => {
    const { values } = req.body as { values: Record<string, string | boolean | number> };

    const normalized: Record<string, string> = {};
    for (const [key, raw] of Object.entries(values)) {
      // Skip UI-only helper flags.
      if (key.endsWith("__set")) continue;
      const stringVal = typeof raw === "boolean" ? String(raw) : String(raw);
      // Do not overwrite a stored secret with an empty string (means "unchanged").
      if (isSecretKey(key) && stringVal.trim() === "") continue;
      normalized[key] = stringVal;
    }

    const emailBefore = await getEmailSettings();
    await updateSettings(normalized, req.user!.id);
    const emailAfter = await getEmailSettings();
    const senderConfigurationChanged = (["host", "port", "secure", "user", "pass", "fromEmail"] as const)
      .some((key) => emailBefore[key] !== emailAfter[key]);
    if (senderConfigurationChanged) {
      await setInternalSetting("EMAIL_VERIFIED_AT", "", req.user!.id);
    }
    if (Object.keys(normalized).some((key) => key.startsWith("COMPANY_"))) {
      await recordActivationEvent({ type: "COMPANY_PROFILE_SAVED", userId: req.user!.id });
    }
    resetEmailTransport();
    await logActivity({
      action: "SETTINGS_UPDATED",
      detail: Object.keys(normalized).join(", "),
      userId: req.user!.id,
    });
    res.json({ ok: true, values: await getSettingsForUi() });
  }),
);

// Test AI connection. If apiKey provided, test that; else test saved settings.
const testAiSchema = z.object({
  apiKey: z.string().optional(),
  model: z.string().optional(),
});

settingsRouter.post(
  "/test/ai",
  validate({ body: testAiSchema }),
  asyncHandler(async (req, res) => {
    const { apiKey, model } = req.body as z.infer<typeof testAiSchema>;
    const result = await verifyAiConfig(apiKey ? { apiKey, model } : undefined);
    res.json(result);
  }),
);

// Test SMTP connection. Blank fields fall back to currently saved settings,
// so an admin can test without re-typing the stored password.
const testSmtpSchema = z.object({
  host: z.string().optional(),
  port: z.coerce.number().int().positive().optional(),
  secure: z.boolean().optional(),
  user: z.string().optional(),
  pass: z.string().optional(),
});

settingsRouter.post(
  "/test/email",
  validate({ body: testSmtpSchema }),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof testSmtpSchema>;
    const saved = await getEmailSettings();
    const result = await verifySmtpConfig({
      host: body.host || saved.host,
      port: body.port || saved.port,
      secure: body.secure ?? saved.secure,
      user: body.user || saved.user,
      pass: body.pass || saved.pass,
    });
    const testingSavedConfiguration =
      (!body.host || body.host === saved.host) &&
      (!body.port || body.port === saved.port) &&
      (body.secure === undefined || body.secure === saved.secure) &&
      (!body.user || body.user === saved.user) &&
      (!body.pass || body.pass === saved.pass);
    if (result.ok && testingSavedConfiguration) {
      await markSenderVerified(req.user!.id);
      await recordActivationEvent({ type: "SENDER_VERIFIED", userId: req.user!.id });
    }
    res.json(result.ok && !testingSavedConfiguration
      ? { ok: true, message: "Connection successful. Save these sender settings, then test again to verify the active sender." }
      : result);
  }),
);
