import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { THEME_REGISTRY, THEME_STORAGE_KEY } from './themes.js';

function createThemeTestEnv({ storedTheme = null, prefersDark = false } = {}) {
  const storage = new Map();
  if (storedTheme !== null) {
    storage.set(THEME_STORAGE_KEY, storedTheme);
  }

  const localStorage = {
    getItem: vi.fn((key) => (storage.has(key) ? storage.get(key) : null)),
    setItem: vi.fn((key, value) => storage.set(key, value)),
    removeItem: vi.fn((key) => storage.delete(key))
  };

  let mediaChangeListener = null;
  const mediaQueryList = {
    matches: prefersDark,
    addEventListener: vi.fn((eventName, listener) => {
      if (eventName === 'change') {
        mediaChangeListener = listener;
      }
    }),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn()
  };

  const styleState = {};
  const style = {
    setProperty: vi.fn((name, value) => {
      styleState[name] = value;
    }),
    removeProperty: vi.fn((name) => {
      delete styleState[name];
    }),
    getPropertyValue: (name) => styleState[name] || ''
  };

  const themeColorMeta = {
    content: '',
    setAttribute: vi.fn((name, value) => {
      if (name === 'content') {
        themeColorMeta.content = value;
      }
    })
  };

  const appleStatusBarMeta = {
    content: 'default',
    setAttribute: vi.fn((name, value) => {
      if (name === 'content') {
        appleStatusBarMeta.content = value;
      }
    })
  };

  globalThis.window = {
    localStorage,
    matchMedia: vi.fn(() => mediaQueryList)
  };

  globalThis.document = {
    createElement: () => ({}),
    createElementNS: () => ({}),
    createTextNode: () => ({}),
    querySelector: vi.fn((selector) => {
      if (selector === 'meta[name="theme-color"]') {
        return themeColorMeta;
      }

      if (selector === 'meta[name="apple-mobile-web-app-status-bar-style"]') {
        return appleStatusBarMeta;
      }

      return null;
    }),
    documentElement: {
      dataset: {},
      style
    }
  };

  return {
    storage,
    localStorage,
    themeColorMeta,
    appleStatusBarMeta,
    emitSystemThemeChange(nextPrefersDark) {
      mediaQueryList.matches = nextPrefersDark;
      if (mediaChangeListener) {
        mediaChangeListener({ matches: nextPrefersDark });
      }
    }
  };
}

describe('useTheme', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    delete globalThis.window;
    delete globalThis.document;
    vi.restoreAllMocks();
  });

  test('uses light theme when no stored preference and system preference is light', async () => {
    createThemeTestEnv({ prefersDark: false });
    const themeModule = await import('./useTheme.js');

    themeModule.initTheme();

    expect(themeModule.resolvedTheme.value).toBe('light');
    expect(globalThis.document.documentElement.dataset.theme).toBe('light');
    expect(themeModule.isNonLightTheme.value).toBe(false);
  });

  test('uses dark theme when no stored preference and system preference is dark', async () => {
    createThemeTestEnv({ prefersDark: true });
    const themeModule = await import('./useTheme.js');

    themeModule.initTheme();

    expect(themeModule.resolvedTheme.value).toBe('dark');
    expect(globalThis.document.documentElement.dataset.theme).toBe('dark');
    expect(themeModule.isNonLightTheme.value).toBe(true);
  });

  test('stored preference overrides system theme preference', async () => {
    createThemeTestEnv({ storedTheme: 'dark', prefersDark: false });
    const themeModule = await import('./useTheme.js');

    themeModule.initTheme();

    expect(themeModule.resolvedTheme.value).toBe('dark');
    expect(globalThis.document.documentElement.dataset.theme).toBe('dark');
  });

  test('cycleTheme wraps through THEME_ORDER and persists preference', async () => {
    const env = createThemeTestEnv({ prefersDark: false });
    const themeModule = await import('./useTheme.js');

    themeModule.initTheme();
    expect(themeModule.resolvedTheme.value).toBe('light');

    themeModule.cycleTheme();
    expect(themeModule.resolvedTheme.value).toBe('dark');
    expect(env.storage.get(THEME_STORAGE_KEY)).toBe('dark');

    themeModule.cycleTheme();
    expect(themeModule.resolvedTheme.value).toBe('light');
    expect(env.storage.get(THEME_STORAGE_KEY)).toBe('light');
  });

  test('invalid stored theme falls back to system preference and clears storage', async () => {
    const env = createThemeTestEnv({ storedTheme: 'coffee', prefersDark: true });
    const themeModule = await import('./useTheme.js');

    themeModule.initTheme();

    expect(themeModule.resolvedTheme.value).toBe('dark');
    expect(env.localStorage.removeItem).toHaveBeenCalledWith(THEME_STORAGE_KEY);
    expect(env.storage.get(THEME_STORAGE_KEY)).toBeUndefined();
  });

  test('system theme changes only apply before user manually sets a theme', async () => {
    const env = createThemeTestEnv({ prefersDark: false });
    const themeModule = await import('./useTheme.js');

    themeModule.initTheme();
    expect(themeModule.resolvedTheme.value).toBe('light');

    env.emitSystemThemeChange(true);
    expect(themeModule.resolvedTheme.value).toBe('dark');

    themeModule.setTheme('light');
    env.emitSystemThemeChange(true);
    expect(themeModule.resolvedTheme.value).toBe('light');
  });

  test('updates browser theme meta colors when theme changes', async () => {
    const env = createThemeTestEnv({ prefersDark: false });
    const themeModule = await import('./useTheme.js');

    themeModule.initTheme();
    expect(env.themeColorMeta.content).toBe(THEME_REGISTRY.light['--theme-bg']);
    expect(env.appleStatusBarMeta.content).toBe('default');

    themeModule.setTheme('dark');
    expect(env.themeColorMeta.content).toBe(THEME_REGISTRY.dark['--theme-bg']);
    expect(env.appleStatusBarMeta.content).toBe('black');
  });
});
