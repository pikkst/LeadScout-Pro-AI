// Logo upload route: lets an admin upload/replace/remove the company logo image
// used in outreach emails. Saved under /uploads and referenced via COMPANY_LOGO_URL.
import { Router, Request } from "express";
import path from "path";
import fs from "fs/promises";
import multer from "multer";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/auth";
import { updateSettings, getCompanyProfile } from "../services/settings.service";
import { HttpError } from "../utils/httpError";
import { config } from "../config";

export const uploadRouter = Router();
uploadRouter.use(requireAuth, requireRole("ADMIN"));

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, _file, cb) => {
    const ext = EXT_BY_TYPE[_file.mimetype] || "png";
    cb(null, `company-logo.${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) cb(null, true);
    else cb(new HttpError(400, "Only image files (PNG, JPG, WEBP, GIF) are allowed.", "BAD_FILE"));
  },
});

function toAbsoluteUrl(relativePath: string): string {
  return `${config.baseUrl.replace(/\/$/, "")}${relativePath}`;
}

async function removeOtherLogoFiles(keepFilename?: string) {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const entries = await fs.readdir(UPLOAD_DIR);
  await Promise.all(entries
    .filter((name) => /^company-logo\.(png|jpg|webp|gif)$/i.test(name) && name !== keepFilename)
    .map((name) => fs.unlink(path.join(UPLOAD_DIR, name)).catch(() => undefined)));
}

// Upload or replace the logo.
uploadRouter.post(
  "/company-logo",
  upload.single("logo"),
  async (req: Request & { file?: Express.Multer.File }, res) => {
    if (!req.file) throw new HttpError(400, "No logo file provided.", "BAD_FILE");
    const relativePath = `/uploads/${req.file.filename}`;
    const absoluteUrl = toAbsoluteUrl(relativePath);
    await removeOtherLogoFiles(req.file.filename);
    await updateSettings({ COMPANY_LOGO_URL: relativePath }, req.user!.id);
    res.status(200).json({ url: relativePath, logoUrl: absoluteUrl });
  },
);

// Remove the logo (clears the setting and deletes the file).
uploadRouter.delete("/company-logo", async (req, res) => {
  const profile = await getCompanyProfile();
  const logoPath = (() => {
    try { return new URL(profile.logoUrl, config.baseUrl).pathname; } catch { return ""; }
  })();
  if (/^\/uploads\/company-logo\.(png|jpg|webp|gif)$/i.test(logoPath)) await removeOtherLogoFiles();
  await updateSettings({ COMPANY_LOGO_URL: "" }, req.user!.id);
  res.status(200).json({ ok: true, logoUrl: "" });
});
