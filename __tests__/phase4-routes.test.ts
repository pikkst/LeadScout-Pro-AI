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
let agentToken: string;
let agentId: string;

beforeEach(async () => {
  const hash = await bcrypt.hash('testpass', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'phase4admin@test.com' },
    update: {},
    create: { email: 'phase4admin@test.com', name: 'Phase4 Admin', passwordHash: hash, role: 'ADMIN' },
  });
  const agent = await prisma.user.upsert({
    where: { email: 'phase4agent@test.com' },
    update: {},
    create: { email: 'phase4agent@test.com', name: 'Phase4 Agent', passwordHash: hash, role: 'AGENT' },
  });
  adminId = admin.id;
  adminToken = signToken({ id: admin.id });
  agentId = agent.id;
  agentToken = signToken({ id: agent.id });
});

describe('Phase 4 Graph Routes', () => {
  beforeEach(async () => {
    await prisma.outcomeGraphNode.deleteMany();
    await prisma.outcomeGraphEdge.deleteMany();
  });

  it('requires authentication', async () => {
    await request(app).get('/api/graph').expect(401);
  });

  it('lists graph nodes', async () => {
    await prisma.outcomeGraphNode.create({
      data: { nodeType: 'ACCOUNT', nodeId: `acc-${Date.now()}`, workspaceKey: adminId, title: 'Test Account' },
    });

    const res = await request(app)
      .get('/api/graph')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body.nodes)).toBe(true);
    expect(Array.isArray(res.body.edges)).toBe(true);
  });

  it('creates a node with metadata', async () => {
    const res = await request(app)
      .post('/api/graph/nodes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nodeType: 'ACCOUNT', nodeId: 'acc2', title: 'Account 2', metadata: { domain: 'test.com' } })
      .expect(201);

    expect(res.body.title).toBe('Account 2');
    expect(res.body.metadata).toEqual({ domain: 'test.com' });
  });

  it('creates an edge', async () => {
    const nodeRes = await request(app)
      .post('/api/graph/nodes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nodeType: 'ACCOUNT', nodeId: 'acc3', title: 'Account 3' })
      .expect(201);

    const res = await request(app)
      .post('/api/graph/edges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sourceType: 'ACCOUNT', sourceId: 'acc3', targetType: 'CONTACT', targetId: 'c1', edgeType: 'OWNS' })
      .expect(201);

    expect(res.body.edgeType).toBe('OWNS');
  });

  it('syncs account graph with resource auth', async () => {
    const account = await prisma.account.create({
      data: { name: 'Sync Account', domain: `sync-${Date.now()}.test`, ownerId: adminId },
    });
    await prisma.contact.create({
      data: { fullName: 'Contact', email: 'c@test.com', accountId: account.id, ownerId: adminId },
    });

    const res = await request(app)
      .post(`/api/graph/sync/account/${account.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.synced).toBe(true);
    expect(res.body.nodeCount).toBeGreaterThanOrEqual(2);
  });

  it('rejects sync for non-owner non-admin', async () => {
    const account = await prisma.account.create({
      data: { name: 'Other Account', domain: `other-${Date.now()}.test`, ownerId: adminId },
    });

    await request(app)
      .post(`/api/graph/sync/account/${account.id}`)
      .set('Authorization', `Bearer ${agentToken}`)
      .expect(403);
  });
});

describe('Phase 4 Evidence Routes', () => {
  beforeEach(async () => {
    await prisma.evidenceReview.deleteMany();
  });

  it('creates and lists evidence reviews', async () => {
    const createRes = await request(app)
      .post('/api/evidence')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ entityType: 'ACCOUNT_RANK', entityId: 'rank1', recommendation: 'Looks good', sources: [{ url: 'test' }], confidence: 0.9 })
      .expect(201);

    expect(createRes.body.status).toBe('PENDING');

    const listRes = await request(app)
      .get('/api/evidence')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(listRes.body)).toBe(true);
  });

  it('prevents horizontal privilege escalation on list', async () => {
    await request(app)
      .post('/api/evidence')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ entityType: 'ACCOUNT_RANK', entityId: 'rank2', recommendation: 'Test', sources: [], confidence: 0.5 });

    const agentRes = await request(app)
      .get('/api/evidence')
      .set('Authorization', `Bearer ${agentToken}`)
      .expect(200);

    expect(agentRes.body.every((r: any) => r.createdById === agentId)).toBe(true);
  });

  it('approves and rejects evidence reviews', async () => {
    const approveRes = await request(app)
      .post('/api/evidence')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ entityType: 'ACCOUNT_RANK', entityId: 'rank3', recommendation: 'Test', sources: [], confidence: 0.5 })
      .expect(201);

    const rejectRes = await request(app)
      .post('/api/evidence')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ entityType: 'ACCOUNT_RANK', entityId: 'rank4', recommendation: 'Test2', sources: [], confidence: 0.5 })
      .expect(201);

    await request(app)
      .patch(`/api/evidence/${approveRes.body.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ comment: 'Approved' })
      .expect(200);

    const approved = await prisma.evidenceReview.findUnique({ where: { id: approveRes.body.id } });
    expect(approved?.status).toBe('APPROVED');

    await request(app)
      .patch(`/api/evidence/${rejectRes.body.id}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ comment: 'Actually no' })
      .expect(200);

    const rejected = await prisma.evidenceReview.findUnique({ where: { id: rejectRes.body.id } });
    expect(rejected?.status).toBe('REJECTED');
  });

  it('rejects decay endpoint for non-admin', async () => {
    await request(app)
      .post('/api/evidence/decay')
      .set('Authorization', `Bearer ${agentToken}`)
      .expect(403);
  });
});

describe('Phase 4 Workspace Thresholds Routes', () => {
  beforeEach(async () => {
    await prisma.workspaceThreshold.deleteMany();
  });

  it('returns or creates workspace threshold', async () => {
    const res = await request(app)
      .get('/api/workspace-thresholds')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.workspaceKey).toBeDefined();
    expect(typeof res.body.soloMode).toBe('boolean');
  });

  it('updates workspace threshold', async () => {
    await request(app)
      .get('/api/workspace-thresholds')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const res = await request(app)
      .put('/api/workspace-thresholds')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ autoPromoteUsers: 5, autoPromoteLeads: 50, autoPromoteAutomation: 10 })
      .expect(200);

    expect(res.body.autoPromoteUsers).toBe(5);
    expect(res.body.autoPromoteLeads).toBe(50);
  });
});
