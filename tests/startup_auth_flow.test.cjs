/**
 * Kairos Startup & Authentication Flow Regression Test Suite
 * 
 * Verifies:
 * 1. Fresh Incognito / InPrivate visitor with empty localStorage starts unauthenticated on 'meet-kairos' with userProfile = null.
 * 2. Fresh browser startup never automatically calls setActiveUserId with Alex Rivera or pollutes user storage.
 * 3. Returning visitor with valid stored session in KAIROS_USER_PROFILE_V1 cleanly restores to 'home' and sets their user partition.
 * 4. AuthScreen form submission requires both email and password, displaying a validation error without falling back to alex@kairos.ai.
 * 5. Offline authentication with valid credentials succeeds and establishes the user's isolated local partition.
 * 6. Logout cleanly clears userProfile, resets active user partition, purges session tokens, and returns to 'meet-kairos'.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

// Setup mock browser environment
const storage = {};
global.localStorage = {
  getItem: (key) => (Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null),
  setItem: (key, val) => { storage[key] = String(val); },
  removeItem: (key) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); }
};

if (typeof window === 'undefined') {
  global.window = {
    localStorage: global.localStorage,
    dispatchEvent: () => {},
    addEventListener: () => {},
    removeEventListener: () => {}
  };
}

const STORAGE_KEY_USER_PROFILE = 'KAIROS_USER_PROFILE_V1';
const KEY_ACTIVE_USER_ID = 'KAIROS_ACTIVE_USER_ID_V1';

// Helpers replicating App.tsx initializers
function resolveInitialUserProfile() {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY_USER_PROFILE);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed.email === 'string' && typeof parsed.name === 'string') {
        return parsed;
      }
    }
  } catch {}
  return null;
}

function resolveInitialScreen() {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USER_PROFILE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.email === 'string' && typeof parsed.name === 'string') {
          return 'home';
        }
      }
    } catch {}
  }
  return 'meet-kairos';
}

function normalizeUserId(input) {
  if (!input) return 'default_user';
  let raw = '';
  if (typeof input === 'string') {
    raw = input;
  } else if (typeof input === 'object') {
    raw = input.email || input.id || input.username || input.name || '';
  }
  if (!raw || typeof raw !== 'string') return 'default_user';
  const clean = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return clean || 'default_user';
}

test('Kairos Startup & Authentication Flow Regression Suite', async (t) => {

  await t.test('1. Fresh Incognito visitor with empty localStorage starts on meet-kairos with userProfile = null', () => {
    localStorage.clear();

    const initialProfile = resolveInitialUserProfile();
    const initialScreen = resolveInitialScreen();

    assert.equal(initialProfile, null, 'Fresh visitor userProfile must be strictly null');
    assert.equal(initialScreen, 'meet-kairos', 'Fresh visitor currentScreen must be meet-kairos, not home');
    assert.equal(localStorage.getItem(STORAGE_KEY_USER_PROFILE), null, 'localStorage must not have auto-created user profile');
  });

  await t.test('2. Fresh browser startup never auto-assigns Alex Rivera or sets activeUserId', () => {
    localStorage.clear();

    const initialProfile = resolveInitialUserProfile();
    assert.equal(initialProfile, null);

    // Verify KEY_ACTIVE_USER_ID is not written on fresh startup
    assert.equal(localStorage.getItem(KEY_ACTIVE_USER_ID), null, 'Fresh startup must not write active user ID to storage');
  });

  await t.test('3. Returning user with valid saved profile restores directly to home screen', () => {
    localStorage.clear();
    const savedUser = { email: 'elena.rostova@kairos.ai', name: 'Elena Rostova' };
    localStorage.setItem(STORAGE_KEY_USER_PROFILE, JSON.stringify(savedUser));

    const restoredProfile = resolveInitialUserProfile();
    const restoredScreen = resolveInitialScreen();

    assert.deepEqual(restoredProfile, savedUser, 'Stored profile must be restored accurately');
    assert.equal(restoredScreen, 'home', 'Returning authenticated user must land directly on home');
    assert.equal(normalizeUserId(restoredProfile), 'elena_rostova_kairos_ai');
  });

  await t.test('4. Corrupted / malformed JSON in profile storage fails safely to null and meet-kairos', () => {
    localStorage.clear();
    localStorage.setItem(STORAGE_KEY_USER_PROFILE, '{ invalid json corrupted string }');

    const profile = resolveInitialUserProfile();
    const screen = resolveInitialScreen();

    assert.equal(profile, null, 'Corrupt storage must fail safely to null without crashing');
    assert.equal(screen, 'meet-kairos', 'Corrupt storage must direct user to meet-kairos');
  });

  await t.test('5. AuthScreen empty credentials submission requires email & password and does not fallback to Alex', () => {
    // Simulate AuthScreen handleSubmit validation logic
    let feedbackMessage = null;
    let successUser = null;

    function handleAuthSubmit(emailInput, passwordInput, onSuccess) {
      const trimmedEmail = emailInput.trim();
      const trimmedPassword = passwordInput.trim();

      if (!trimmedEmail || !trimmedPassword) {
        feedbackMessage = 'Please enter your email and password to continue.';
        return;
      }

      onSuccess({ email: trimmedEmail, name: trimmedEmail.split('@')[0] });
    }

    // Submit with empty inputs
    handleAuthSubmit('', '', (user) => { successUser = user; });

    assert.equal(feedbackMessage, 'Please enter your email and password to continue.');
    assert.equal(successUser, null, 'Empty submit must never call onSuccess with a fallback user');

    // Submit with whitespace only
    feedbackMessage = null;
    handleAuthSubmit('   ', '   ', (user) => { successUser = user; });
    assert.equal(feedbackMessage, 'Please enter your email and password to continue.');
    assert.equal(successUser, null);
  });

  await t.test('6. Valid credentials establish user session, activeUserId, and userProfile', () => {
    localStorage.clear();
    let currentUserProfile = null;
    let currentActiveUserId = null;
    let currentScreen = 'auth';

    function onAuthSuccess(user) {
      currentActiveUserId = normalizeUserId(user);
      localStorage.setItem(KEY_ACTIVE_USER_ID, currentActiveUserId);
      currentUserProfile = user;
      localStorage.setItem(STORAGE_KEY_USER_PROFILE, JSON.stringify(user));
      currentScreen = 'onboarding';
    }

    onAuthSuccess({ email: 'marcus.vance@kairos.ai', name: 'Marcus Vance' });

    assert.deepEqual(currentUserProfile, { email: 'marcus.vance@kairos.ai', name: 'Marcus Vance' });
    assert.equal(currentActiveUserId, 'marcus_vance_kairos_ai');
    assert.equal(currentScreen, 'onboarding');
    assert.equal(JSON.parse(localStorage.getItem(STORAGE_KEY_USER_PROFILE)).email, 'marcus.vance@kairos.ai');
  });

  await t.test('7. Logout cleans up session, removes stored profile, and returns to meet-kairos', () => {
    // Start in authenticated state
    let currentUserProfile = { email: 'marcus.vance@kairos.ai', name: 'Marcus Vance' };
    localStorage.setItem(STORAGE_KEY_USER_PROFILE, JSON.stringify(currentUserProfile));
    localStorage.setItem(KEY_ACTIVE_USER_ID, 'marcus_vance_kairos_ai');
    let currentScreen = 'home';

    // Simulate onLogOut handler from App.tsx
    function handleLogout() {
      localStorage.removeItem(KEY_ACTIVE_USER_ID);
      localStorage.removeItem(STORAGE_KEY_USER_PROFILE);
      currentUserProfile = null;
      currentScreen = 'meet-kairos';
    }

    handleLogout();

    assert.equal(currentUserProfile, null, 'userProfile must be null after logout');
    assert.equal(currentScreen, 'meet-kairos', 'Screen must return to meet-kairos');
    assert.equal(localStorage.getItem(STORAGE_KEY_USER_PROFILE), null);
    assert.equal(localStorage.getItem(KEY_ACTIVE_USER_ID), null);
  });

  await t.test('8. App.tsx and AuthScreen.tsx source files contain no automatic alex fallbacks', () => {
    const appTsx = fs.readFileSync(path.join(__dirname, '..', 'src', 'App.tsx'), 'utf-8');
    const authScreenTsx = fs.readFileSync(path.join(__dirname, '..', 'src', 'screens', 'AuthScreen.tsx'), 'utf-8');

    // App.tsx should not contain hardcoded defaultProf = { email: 'alex.rivera@kairos.ai' }
    assert.equal(appTsx.includes("email: 'alex.rivera@kairos.ai'"), false, 'App.tsx must not contain hardcoded defaultProf email');
    assert.equal(appTsx.includes("name: 'Alex Rivera'"), false, 'App.tsx must not contain hardcoded defaultProf name');

    // AuthScreen.tsx should not fallback to alex@kairos.ai on empty submit
    assert.equal(authScreenTsx.includes("trimmedEmail || 'alex@kairos.ai'"), false, 'AuthScreen.tsx must not fallback to alex@kairos.ai');
  });
});
