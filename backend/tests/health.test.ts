import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';

describe('Kairos Backend Health Endpoints (Phase E.1)', () => {
  let app: FastifyInstance;

  before(async () => {
    process.env.NODE_ENV = 'test';
    app = await buildApp({ logger: false });
    await app.ready();
  });

  after(async () => {
    await app.close();
  });

  test('1. App initializes successfully without errors', () => {
    assert.ok(app, 'Fastify application instance should be defined');
    assert.equal(typeof app.inject, 'function', 'App should provide inject method for testing');
  });

  test('2. GET /health returns HTTP 200 with status: "ok"', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health'
    });

    assert.equal(response.statusCode, 200, 'Status code should be 200');
    const body = JSON.parse(response.body);

    assert.equal(body.status, 'ok', 'Status should be "ok"');
    assert.equal(body.service, 'kairos-backend', 'Service name should match');
    assert.equal(body.version, '1.0.0', 'Version should match');
    assert.ok(body.timestamp, 'Timestamp should be present');
    assert.ok(typeof body.uptime === 'number', 'Uptime should be a number');
  });

  test('3. GET /api/v1/health returns HTTP 200 with status: "ok"', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health'
    });

    assert.equal(response.statusCode, 200, 'Status code should be 200');
    const body = JSON.parse(response.body);

    assert.equal(body.status, 'ok', 'Status should be "ok"');
    assert.equal(body.service, 'kairos-backend', 'Service name should match');
    assert.ok(body.timestamp, 'Timestamp should be present');
  });

  test('4. GET / returns 200 root service info', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/'
    });

    assert.equal(response.statusCode, 200, 'Root endpoint should return 200');
    const body = JSON.parse(response.body);
    assert.equal(body.message, 'Kairos Backend API Service');
  });
});
