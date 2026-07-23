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
    where: { email: 'phase2admin@test.com' },
    update: {},
    create: { email: 'phase2admin@test.com', name: 'Phase2 Admin', passwordHash: hash, role: 'ADMIN' },
  });
  adminId = user.id;
  adminToken = signToken({ id: user.id });
});

describe('Phase 2 Playbooks Routes', () => {
  it('creates and lists playbooks', async () => {
    const createRes = await request(app)
      .post('/api/playbooks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test Playbook', type: 'OUTREACH', isActive: true })
      .expect(201);

    expect(createRes.body.name).toBe('Test Playbook');

    const listRes = await request(app)
      .get('/api/playbooks')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.some((p: any) => p.name === 'Test Playbook')).toBe(true);
  });

  it('creates playbook versions', async () => {
    const playbook = await prisma.playbook.create({
      data: { name: 'Versioned Playbook', type: 'OUTREACH', createdById: adminId },
    });

    const res = await request(app)
      .post(`/api/playbooks/${playbook.id}/versions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ changelog: 'v1', steps: [{ order: 0, name: 'Step 1' }] })
      .expect(201);

    expect(res.body.version).toBe(1);
    expect(res.body.steps).toHaveLength(1);
  });

  it('publishes a playbook version', async () => {
    const playbook = await prisma.playbook.create({
      data: { name: 'Publish PB', type: 'OUTREACH', createdById: adminId },
    });
    const version = await prisma.playbookVersion.create({
      data: { version: 1, playbookId: playbook.id },
    });

    const res = await request(app)
      .post(`/api/playbooks/${playbook.id}/versions/${version.id}/publish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.isActive).toBe(true);
    expect(res.body.status).toBe('PUBLISHED');
  });
});

describe('Phase 2 Qualification Routes', () => {
  it('creates qualification playbook', async () => {
    const res = await request(app)
      .post('/api/qualification/playbooks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'BANT', framework: 'BANT' })
      .expect(201);

    expect(res.body.framework).toBe('BANT');
  });

  it('lists qualification playbooks', async () => {
    await prisma.qualificationPlaybook.create({
      data: { name: 'MEDDPICC', framework: 'MEDDPICC', createdById: adminId },
    });

    const res = await request(app)
      .get('/api/qualification/playbooks')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.some((p: any) => p.framework === 'MEDDPICC')).toBe(true);
  });
});

describe('Phase 2 Queue Routes', () => {
  it('creates and lists queues', async () => {
    const createRes = await request(app)
      .post('/api/queues/queues')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Approvals', type: 'approvals' })
      .expect(201);

    expect(createRes.body.name).toBe('Approvals');

    const listRes = await request(app)
      .get('/api/queues/queues')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(listRes.body.some((q: any) => q.name === 'Approvals')).toBe(true);
  });

  it('creates queue items', async () => {
    const queue = await prisma.dealQueue.create({
      data: { name: 'Stalled', type: 'stalled', createdById: adminId },
    });

    const res = await request(app)
      .post('/api/queues/items')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ queueId: queue.id, notes: 'Test item', priority: 'HIGH' })
      .expect(201);

    expect(res.body.priority).toBe('HIGH');
  });
});

describe('Phase 2 Attribution Routes', () => {
  it('records attribution', async () => {
    const playbook = await prisma.playbook.create({
      data: { name: 'Attr PB', type: 'OUTREACH', createdById: adminId, status: 'PUBLISHED', isActive: true },
    });
    const version = await prisma.playbookVersion.create({
      data: { version: 1, playbookId: playbook.id, status: 'PUBLISHED', isActive: true },
    });

    const res = await request(app)
      .post('/api/attribution')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ outcome: 'POSITIVE_REPLY', leadId: 'test-lead', versionId: version.id })
      .expect(201);

    expect(res.body.outcome).toBe('POSITIVE_REPLY');
  });
});

describe('Phase 2 Webhook Routes', () => {
  it('creates outbound webhook', async () => {
    const res = await request(app)
      .post('/api/webhooks/webhooks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test Hook', url: 'https://example.com/hook', events: ['PLAYBOOK_PUBLISHED'] })
      .expect(201);

    expect(res.body.url).toBe('https://example.com/hook');
  });

  it('creates integration mapping', async () => {
    const res = await request(app)
      .post('/api/webhooks/mappings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ provider: 'zapier', mappingType: 'playbook_import', mapping: {} })
      .expect(201);

    expect(res.body.provider).toBe('zapier');
  });
});
