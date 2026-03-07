import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const {
  getTokenMock,
  getClientIdMock,
  onBeforeUnmountMock
} = vi.hoisted(() => ({
  getTokenMock: vi.fn(),
  getClientIdMock: vi.fn(),
  onBeforeUnmountMock: vi.fn()
}));

vi.mock('@/shared/composables/useAuth.js', () => ({
  useAuth: () => ({
    getToken: getTokenMock
  })
}));

vi.mock('@/shared/utils/clientIdentity.js', () => ({
  getClientId: () => getClientIdMock()
}));

vi.mock('vue', async () => {
  const actual = await vi.importActual('vue');
  return {
    ...actual,
    onBeforeUnmount: onBeforeUnmountMock
  };
});

import { useRemoteSync } from './useRemoteSync.js';

function flushPromises() {
  return Promise.resolve().then(() => Promise.resolve());
}

async function settleAsync() {
  await flushPromises();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await flushPromises();
}

function createWindowStub() {
  const listeners = new Map();

  return {
    location: { origin: 'https://tracktabs.com' },
    setInterval: globalThis.setInterval.bind(globalThis),
    clearInterval: globalThis.clearInterval.bind(globalThis),
    addEventListener: vi.fn((eventName, listener) => {
      listeners.set(eventName, listener);
    }),
    removeEventListener: vi.fn((eventName, listener) => {
      if (listeners.get(eventName) === listener) {
        listeners.delete(eventName);
      }
    }),
    emit(eventName) {
      const listener = listeners.get(eventName);
      if (typeof listener === 'function') {
        listener();
      }
    }
  };
}

describe('useRemoteSync', () => {
  let windowStub;

  beforeEach(() => {
    vi.clearAllMocks();
    getTokenMock.mockResolvedValue(null);
    getClientIdMock.mockReturnValue('client-1');

    windowStub = createWindowStub();
    globalThis.window = windowStub;
    globalThis.document = {
      hidden: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };
    globalThis.fetch = vi.fn();

    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: true },
      writable: true,
      configurable: true
    });
  });

  afterEach(() => {
    delete globalThis.window;
    delete globalThis.document;
    delete globalThis.fetch;
    delete globalThis.navigator;
    vi.restoreAllMocks();
  });

  test('skips polling requests while the browser is offline', async () => {
    globalThis.navigator.onLine = false;
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const sync = useRemoteSync({ intervalMs: 60000 });

    sync.start();
    await flushPromises();

    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(getTokenMock).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    sync.stop();
  });

  test('suppresses expected network fetch failures and allows the next check to continue', async () => {
    globalThis.fetch
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ appRevision: 'rev-1', resources: {}, mutations: {} })
      });

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const sync = useRemoteSync({ intervalMs: 60000 });

    sync.start();
    await settleAsync();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    await sync.checkNow();
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    sync.stop();
  });
});
