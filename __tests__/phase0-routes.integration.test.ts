import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { apiRouter } from '../server/routes';
import { errorHandler, notFoundHandler } from '../server/middleware/error';

const app = express();
app.use(express.json());
app.use('/api', apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);

describe('core route integration contracts', () => {
  it('exposes a health endpoint through the complete router', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  it('validates login input before accessing account data', async () => {
    const response = await request(app).post('/api/auth/login').send({ email: 'invalid', password: 'short' });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  it.each([
    ['settings', 'get', '/api/settings'],
    ['pitch send', 'post', '/api/pitches/pitch-id/send'],
    ['custom stages', 'post', '/api/custom-fields/stages'],
  ])('protects the %s route with authentication', async (_name, method, path) => {
    const response = await (request(app) as any)[method](path).send({});
    expect(response.status).toBe(401);
    expect(response.body.code).toBe('UNAUTHORIZED');
  });

  it('rejects malformed public booking capabilities before database access', async () => {
    const response = await request(app).get('/api/public/booking/too-short');
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  it('rejects malformed unsubscribe capabilities before database access', async () => {
    const response = await request(app).post('/api/public/unsubscribe/too-short').send({});
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });
});
