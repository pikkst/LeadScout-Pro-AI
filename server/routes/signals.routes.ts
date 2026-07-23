// Signal routes: CRUD for verified signals and account signals.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { asyncHandler } from "../utils/asyncHandler";
import { notFound } from "../utils/httpError";
import { requireAuth, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { param } from "../utils/param";
import { ingestSignal, verifySignal as serviceVerifySignal, deleteSignal as serviceDeleteSignal, getSignals } from "../services/signalIngestion.service";

export const signalsRouter = Router();
signalsRouter.use(requireAuth);

const signalTypeSchema = z.enum([
  "HIRING",
  "FUNDING",
  "LEADERSHIP_CHANGE",
  "TECHNOLOGY",
  "INTENT",
  "PRODUCT_USAGE",
  "RENEWAL",
  "RELATIONSHIP_ACTIVITY",
]);

type SignalType = z.infer<typeof signalTypeSchema>;

const ingestSchema = z.object({
  type: signalTypeSchema,
  source: z.string().min(1).max(200),
  evidence: z.string().min(1).max(2000),
  confidence: z.number().min(0).max(1),
  rawPayload: z.record(z.unknown()).optional(),
  accountIds: z.array(z.string()).nonempty().optional(),
});

type IngestInput = z.infer<typeof ingestSchema>;

const accountSignalSchema = z.object({
  relevance: z.number().min(0).max(1),
  freshness: z.number().int().nonnegative(),
  context: z.string().optional(),
});

signalsRouter.post("/", validate({ body: ingestSchema }), asyncHandler(async (req, res) => {
  const body = req.body as IngestInput;
  const signal = await ingestSignal({
    type: body.type,
    source: body.source,
    evidence: body.evidence,
    confidence: body.confidence,
    rawPayload: body.rawPayload,
    accountIds: body.accountIds,
  });
  res.status(201).json(signal);
}));

signalsRouter.get("/", asyncHandler(async (req, res) => {
  const accountId = typeof req.query.accountId === "string" ? req.query.accountId : undefined;
  const type = typeof req.query.type === "string" ? req.query.type : undefined;
  const isVerified = typeof req.query.isVerified === "string" ? req.query.isVerified === "true" : undefined;
  const limit = typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : undefined;

  const signals = await getSignals({ accountId, type, isVerified, limit });
  res.json(signals);
}));

signalsRouter.post("/:id/verify", validate({ body: z.object({ verified: z.boolean() }) }), asyncHandler(async (req, res) => {
  const verified = (req.body as { verified: boolean }).verified;
  const signal = await serviceVerifySignal(param(req, "id"), verified);
  res.json(signal);
}));

signalsRouter.delete("/:id", asyncHandler(async (req, res) => {
  await serviceDeleteSignal(param(req, "id"));
  res.json({ ok: true });
}));

// Account Signals
signalsRouter.get("/accounts/:accountId", asyncHandler(async (req, res) => {
  const accountId = param(req, "accountId");

  const signals = await prisma.signal.findMany({
    where: {
      accountSignals: { some: { accountId } },
    },
    orderBy: { ingestedAt: "desc" },
    take: 50,
    include: {
      accountSignals: { where: { accountId } },
    },
  });

  res.json(signals.map((s) => ({
    id: s.id,
    type: s.type,
    source: s.source,
    evidence: s.evidence,
    confidence: s.confidence,
    isVerified: s.isVerified,
    ingestedAt: s.ingestedAt.toISOString(),
    verifiedAt: s.verifiedAt?.toISOString() ?? undefined,
    accountSignals: s.accountSignals.map((a) => ({
      relevance: a.relevance,
      freshness: a.freshness,
      context: a.context ?? undefined,
    })),
  })));
}));

signalsRouter.post("/accounts/:accountId", validate({ body: accountSignalSchema }), asyncHandler(async (req, res) => {
  const accountId = param(req, "accountId");
  const body = req.body as z.infer<typeof accountSignalSchema>;

  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) throw notFound("Account not found");

  const signal = await prisma.signal.create({
    data: {
      type: "RELATIONSHIP_ACTIVITY",
      source: "manual",
      evidence: body.context ?? "Account signal",
      confidence: body.relevance,
      rawPayload: { accountId, context: body.context },
    },
  });

  const accountSignal = await prisma.accountSignal.create({
    data: {
      accountId,
      signalId: signal.id,
      relevance: body.relevance,
      freshness: body.freshness,
      context: body.context,
    },
  });

  res.status(201).json({
    signalId: signal.id,
    accountSignalId: accountSignal.id,
    relevance: accountSignal.relevance,
    freshness: accountSignal.freshness,
  });
}));
