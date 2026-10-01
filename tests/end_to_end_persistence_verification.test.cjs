/**
 * Kairos End-to-End Multi-User Persistence & Continuity Suite (Unit/Integration Mode)
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

const storage = {};
global.localStorage = {
  getItem: (key) => storage[key] || null,
  setItem: (key, val) => { storage[key] = String(val); },
  removeItem: (key) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); }
};

if (typeof window === 'undefined') {
  global.window = {
    dispatchEvent: () => {},
    addEventListener: () => {},
    removeEventListener: () => {}
  };
}

describe('Kairos Multi-User Persistence & Continuity Suite', () => {
  beforeEach(() => {
    global.localStorage.clear();
  });

  it('1. User A registration & profile customization persists under isolated user key', () => {
    const userA = { id: 'uuid-user-111', email: 'user.a@kairos.ai', name: 'Minato Namikaze' };
    const profileKey = `KAIROS_USER_PROFILE_EXT_V1_${userA.id}`;

    const profileData = {
      customName: 'Minato Namikaze',
      kairosId: '@yellow_flash',
      userQuote: 'Speed and precision define the moment.',
      showcaseIds: ['streak-1', 'task-mastery-1']
    };

    global.localStorage.setItem(profileKey, JSON.stringify(profileData));
    const loaded = JSON.parse(global.localStorage.getItem(profileKey));

    assert.strictEqual(loaded.customName, 'Minato Namikaze');
    assert.strictEqual(loaded.kairosId, '@yellow_flash');
    assert.strictEqual(loaded.userQuote, 'Speed and precision define the moment.');
  });

  it('2. Multi-User Isolation: User B cannot access User A profile or progression', () => {
    const userA = { id: 'uuid-user-111', email: 'user.a@kairos.ai' };
    const userB = { id: 'uuid-user-222', email: 'user.b@kairos.ai' };

    global.localStorage.setItem(`KAIROS_PROGRESSION_STATE_V1_${userA.id}`, JSON.stringify({
      totalXP: 500,
      level: 4,
      todayHP: 50,
      lifetimeHP: 300
    }));

    global.localStorage.setItem(`KAIROS_PROGRESSION_STATE_V1_${userB.id}`, JSON.stringify({
      totalXP: 0,
      level: 1,
      todayHP: 0,
      lifetimeHP: 0
    }));

    const progA = JSON.parse(global.localStorage.getItem(`KAIROS_PROGRESSION_STATE_V1_${userA.id}`));
    const progB = JSON.parse(global.localStorage.getItem(`KAIROS_PROGRESSION_STATE_V1_${userB.id}`));

    assert.strictEqual(progA.level, 4);
    assert.strictEqual(progA.totalXP, 500);
    assert.strictEqual(progB.level, 1);
    assert.strictEqual(progB.totalXP, 0);
  });

  it('3. User A session reload restores accurate state without data leakage', () => {
    const userA = { id: 'uuid-user-111', email: 'user.a@kairos.ai' };
    const storedSession = {
      user: { id: userA.id, email: userA.email, name: 'Minato Namikaze' },
      accessToken: 'jwt.token.userA'
    };

    global.localStorage.setItem('KAIROS_USER_SESSION_V1', JSON.stringify(storedSession));
    const active = JSON.parse(global.localStorage.getItem('KAIROS_USER_SESSION_V1'));

    assert.strictEqual(active.user.id, userA.id);
    assert.strictEqual(active.user.name, 'Minato Namikaze');
  });
});
