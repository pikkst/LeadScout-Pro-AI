import express from 'express';
import request from 'supertest';
import { describe, expect, it, beforeEach } from 'vitest';
import { apiRouter } from '../server/routes';
import { errorHandler, notFoundHandler } from '../server/middleware/error';
import { prisma } from '../server/db';
import { signToken } from '../server/middleware/auth';
import bcrypt from 'bcryptjs';

const app = express();
app.use(express.json());
app.use('/api', apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);

let adminToken: string;
let adminId: string;

beforeEach(async () => {
  const hash = await bcrypt.hash('testpass', 12);
  const user = await prisma.user.upsert({
    where: { email: 'phase3admin@test.com' },
    update: {},
    create: { email: 'phase3admin@test.com', name: 'Phase3 Admin', passwordHash: hash, role: 'ADMIN' },
  });
  adminId = user.id;
  adminToken = signToken({ id: user.id });
});

describe('Phase 3 Signal Routes', () => {
  it('ingests a signal', async () => {
    const res = await request(app)
      .post('/api/signals')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'INTENT', source: 'test', evidence: 'Company is expanding', confidence: 0.8 })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.type).toBe('INTENT');
    expect(res.body.isVerified).toBe(false);
  });

  it('lists signals', async () => {
    await request(app)
      .post('/api/signals')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'HIRING', source: 'test', evidence: 'Hiring engineers', confidence: 0.9 });

    const res = await request(app)
      .get('/api/signals')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('verifies a signal', async () => {
    const createRes = await request(app)
      .post('/api/signals')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'FUNDING', source: 'test', evidence: 'Raised $10M', confidence: 0.7 });

    const verifyRes = await request(app)
      .post(`/api/signals/${createRes.body.id}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ verified: true })
      .expect(200);

    expect(verifyRes.body.isVerified).toBe(true);
    expect(verifyRes.body.verifiedAt).toBeDefined();
  });

  it('deletes a signal', async () => {
    const createRes = await request(app)
      .post('/api/signals')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'TECHNOLOGY', source: 'test', evidence: 'Using React', confidence: 0.6 });

    await request(app)
      .delete(`/api/signals/${createRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const res = await request(app)
      .get('/api/signals')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.find((s: any) => s.id === createRes.body.id)).toBeUndefined();
  });
});

describe('Phase 3 Agent Routes', () => {
  it('creates an agent definition', async () => {
    const res = await request(app)
      .post('/api/agents/definitions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Research Bot', type: 'RESEARCH', budget: 100, approvalThreshold: 0 })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe('Research Bot');
  });

  it('lists agents', async () => {
    await request(app)
      .post('/api/agents/definitions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Routing Bot', type: 'ROUTING', budget: 50 });

    const res = await request(app)
      .get('/api/agents/definitions')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('runs an agent', async () => {
    const createRes = await request(app)
      .post('/api/agents/definitions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Follow-up Bot', type: 'FOLLOW_UP', budget: 10, approvalThreshold: 0 });

    const runRes = await request(app)
      .post(`/api/agents/definitions/${createRes.body.id}/run`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(201);

    expect(runRes.body.id).toBeDefined();
    expect(['COMPLETED', 'AWAITING_APPROVAL']).toContain(runRes.body.status);
  });
});

describe('Phase 3 Marketplace Routes', () => {
  it('creates a pack', async () => {
    const res = await request(app)
      .post('/api/marketplace/packs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'SaaS Pack', slug: 'saas', visibility: 'CURATED', vertical: 'enterprise_saas' })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.slug).toBe('saas');
  });

  it('lists packs', async () => {
    await request(app)
      .post('/api/marketplace/packs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Finance Pack', slug: 'finance', visibility: 'PRIVATE' });

    const res = await request(app)
      .get('/api/marketplace/packs')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('gets a pack by slug', async () => {
    await request(app)
      .post('/api/marketplace/packs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Retail Pack', slug: 'retail' });

    const res = await request(app)
      .get('/api/marketplace/packs/retail')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.slug).toBe('retail');
  });
});

describe('Phase 3 Rankings Routes', () => {
  it('returns empty rankings when none exist', async () => {
    const res = await request(app)
      .get('/api/rankings')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });
});
