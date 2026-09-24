import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';

describe('Kairos Backend Error & 404 Handling (Phase E.1)', () => {
  let app: FastifyInstance;

  before(async () => {
    process.env.NODE_ENV = 'test';
    app = await buildApp({ logger: false });
    await app.ready();
  });

  after(async () => {
    await app.close();
  });

  test('1. Unknown route returns structured 404 JSON', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/non-existent-endpoint-xyz'
    });

    assert.equal(response.statusCode, 404, 'Status code should be 404');
    const body = JSON.parse(response.body);

    assert.equal(body.statusCode, 404);
    assert.equal(body.error, 'Not Found');
    assert.ok(body.message.includes('/non-existent-endpoint-xyz'), 'Message should indicate path');
    assert.ok(body.timestamp, 'Timestamp should be present');
  });

  test('2. Unknown API v1 route returns structured 404 JSON', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/unknown-action'
    });

    assert.equal(response.statusCode, 404);
    const body = JSON.parse(response.body);
    assert.equal(body.statusCode, 404);
    assert.equal(body.error, 'Not Found');
  });
});
