import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../src/config/env.js';

describe('Kairos Backend Configuration (Phase E.1)', () => {
  test('1. Configuration loads with valid defaults', () => {
    assert.ok(config, 'Config object should exist');
    assert.equal(typeof config.PORT, 'number', 'PORT should be parsed as number');
    assert.ok(config.PORT > 0 && config.PORT <= 65535, 'PORT should be a valid port number');
    assert.ok(['development', 'production', 'test'].includes(config.NODE_ENV), 'NODE_ENV should be valid');
    assert.ok(config.CORS_ORIGIN, 'CORS_ORIGIN should be configured');
  });

  test('2. Database URL is present and formatted', () => {
    assert.ok(config.DATABASE_URL, 'DATABASE_URL should be defined');
    assert.ok(config.DATABASE_URL.startsWith('postgresql://'), 'DATABASE_URL should use postgresql protocol');
  });
});
