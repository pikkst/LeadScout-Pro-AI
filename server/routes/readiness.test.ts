import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
}));

vi.mock("../db", () => ({
  prisma: { $queryRaw: mocks.queryRaw },
}));

describe("API readiness", () => {
  beforeEach(() => {
    mocks.queryRaw.mockReset();
  });

  it("reports readiness only after a successful database round-trip", async () => {
    process.env.DATABASE_URL ||= "postgresql://example:example@localhost:5432/test";
    const { apiRouter } = await import("./index");
    mocks.queryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);
    const app = express().use("/api", apiRouter);

    const response = await request(app).get("/api/ready");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ready" });
    expect(mocks.queryRaw).toHaveBeenCalledOnce();
  });

  it("returns 503 and hides database errors when unavailable", async () => {
    process.env.DATABASE_URL ||= "postgresql://example:example@localhost:5432/test";
    const { apiRouter } = await import("./index");
    mocks.queryRaw.mockRejectedValueOnce(new Error("postgresql://secret:credential@db.example/leadscout"));
    const app = express().use("/api", apiRouter);

    const response = await request(app).get("/api/ready");
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: "unavailable" });
    expect(response.text).not.toContain("credential");
  });
});
