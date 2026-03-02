import { computed, ref } from 'vue';
import {
  isThemeName,
  THEME_ORDER,
  THEME_REGISTRY,
  THEME_STORAGE_KEY
} from './themes.js';

const activeTheme = ref('light');
const hasStoredPreference = ref(false);
const resolvedTheme = computed(() => activeTheme.value);
const isNonLightTheme = computed(() => resolvedTheme.value !== 'light');

const THEME_TOKEN_KEYS = [...new Set(
  Object.values(THEME_REGISTRY).flatMap((tokenMap) => Object.keys(tokenMap))
)];

let isInitialized = false;
let mediaQueryList = null;

function getRoot() {
  if (typeof document === 'undefined') {
    return null;
  }

  return document.documentElement;
}

function getSystemTheme() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function readStoredTheme() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  return window.localStorage.getItem(THEME_STORAGE_KEY);
}

function writeStoredTheme(themeName) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  window.localStorage.setItem(THEME_STORAGE_KEY, themeName);
}

function clearStoredTheme() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  window.localStorage.removeItem(THEME_STORAGE_KEY);
}

function applyThemeTokens(themeName) {
  const root = getRoot();
  if (!root) {
    return;
  }

  const tokenMap = THEME_REGISTRY[themeName] || THEME_REGISTRY.light;

  for (const token of THEME_TOKEN_KEYS) {
    const value = tokenMap[token];
    if (value) {
      root.style.setProperty(token, value);
    } else {
      root.style.removeProperty(token);
    }
  }
}

function applyTheme(themeName) {
  const nextTheme = isThemeName(themeName) ? themeName : 'light';
  activeTheme.value = nextTheme;

  const root = getRoot();
  if (root) {
    root.dataset.theme = nextTheme;
  }

  applyThemeTokens(nextTheme);
}

function handleSystemThemeChange(event) {
  if (hasStoredPreference.value) {
    return;
  }

  applyTheme(event.matches ? 'dark' : 'light');
}

function setupSystemThemeListener() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return;
  }

  mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
  if (typeof mediaQueryList.addEventListener === 'function') {
    mediaQueryList.addEventListener('change', handleSystemThemeChange);
    return;
  }

  if (typeof mediaQueryList.addListener === 'function') {
    mediaQueryList.addListener(handleSystemThemeChange);
  }
}

export function setTheme(themeName) {
  const nextTheme = isThemeName(themeName) ? themeName : 'light';
  hasStoredPreference.value = true;
  applyTheme(nextTheme);
  writeStoredTheme(nextTheme);
}

export function cycleTheme() {
  const currentIndex = THEME_ORDER.indexOf(resolvedTheme.value);
  const safeIndex = currentIndex < 0 ? 0 : currentIndex;
  const nextIndex = (safeIndex + 1) % THEME_ORDER.length;
  setTheme(THEME_ORDER[nextIndex]);
}

export function initTheme() {
  if (isInitialized) {
    return;
  }

  isInitialized = true;

  const storedTheme = readStoredTheme();
  if (isThemeName(storedTheme)) {
    hasStoredPreference.value = true;
    applyTheme(storedTheme);
  } else {
    hasStoredPreference.value = false;
    clearStoredTheme();
    applyTheme(getSystemTheme());
  }

  setupSystemThemeListener();
}

export function useTheme() {
  return {
    resolvedTheme,
    isNonLightTheme,
    cycleTheme,
    setTheme,
    initTheme
  };
}

export { resolvedTheme, isNonLightTheme };

