import { ref } from 'vue'
import { registerSW } from 'virtual:pwa-register'

const needRefresh = ref(false)
const offlineReady = ref(false)

let isRegistered = false
let updateServiceWorker = null
let visibilityListenerAttached = false
let updateCheckIntervalId = null
let swRegistration = null

const INSTALLING_DETECT_TIMEOUT_MS = 900
const WAITING_DETECT_TIMEOUT_MS = 4500
const UPDATE_POLL_INTERVAL_MS = 120

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function applyUpdate() {
  if (typeof updateServiceWorker === 'function') {
    updateServiceWorker(true)
    return
  }

  if (typeof window !== 'undefined') {
    window.location.reload()
  }
}

function onVisibilityChange() {
  if (!needRefresh.value || typeof document === 'undefined') {
    return
  }

  if (document.visibilityState === 'hidden') {
    applyUpdate()
  }
}

function ensureVisibilityListener() {
  if (visibilityListenerAttached || typeof document === 'undefined') {
    return
  }

  visibilityListenerAttached = true
  document.addEventListener('visibilitychange', onVisibilityChange)
}

function ensureRegistration() {
  if (isRegistered || typeof window === 'undefined') {
    return
  }

  isRegistered = true

  updateServiceWorker = registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      swRegistration = registration || null

      if (!registration || updateCheckIntervalId !== null || typeof window === 'undefined') {
        return
      }

      updateCheckIntervalId = window.setInterval(() => {
        if (navigator.onLine) {
          registration.update()
        }
      }, 5 * 60 * 1000)
    },
    onNeedRefresh() {
      needRefresh.value = true
      offlineReady.value = false
      ensureVisibilityListener()
    },
    onOfflineReady() {
      offlineReady.value = true
    },
  })
}

function hasPendingUpdate(registration) {
  if (!registration) {
    return false
  }

  if (needRefresh.value || registration.waiting) {
    needRefresh.value = true
    return true
  }

  return false
}

async function waitForInstallingWorker(registration, timeoutMs = INSTALLING_DETECT_TIMEOUT_MS) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    if (hasPendingUpdate(registration)) {
      return true
    }

    if (registration.installing) {
      return true
    }

    await delay(UPDATE_POLL_INTERVAL_MS)
  }

  return false
}

async function waitForWaitingWorker(registration, timeoutMs = WAITING_DETECT_TIMEOUT_MS) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    if (hasPendingUpdate(registration)) {
      return true
    }

    // If install failed, there is no update to apply.
    if (registration.installing?.state === 'redundant') {
      return false
    }

    await delay(UPDATE_POLL_INTERVAL_MS)
  }

  return hasPendingUpdate(registration)
}

export function usePwaUpdate() {
  ensureRegistration()

  const getRegistration = async () => {
    if (swRegistration) {
      return swRegistration
    }

    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return null
    }

    swRegistration = await navigator.serviceWorker.getRegistration('/')
    return swRegistration
  }

  const dismiss = () => {
    needRefresh.value = false
    offlineReady.value = false
  }

  const reload = () => {
    applyUpdate()
  }

  const checkForUpdates = async () => {
    const registration = await getRegistration()
    if (!registration) {
      return {
        supported: false,
        updateFound: false,
      }
    }

    if (hasPendingUpdate(registration)) {
      return {
        supported: true,
        updateFound: true,
      }
    }

    await registration.update()
    if (hasPendingUpdate(registration)) {
      return {
        supported: true,
        updateFound: true,
      }
    }

    const sawInstallingWorker =
      Boolean(registration.installing) || (await waitForInstallingWorker(registration))

    if (!sawInstallingWorker) {
      return {
        supported: true,
        updateFound: false,
      }
    }

    const updateReady = await waitForWaitingWorker(registration)
    if (updateReady) {
      return {
        supported: true,
        updateFound: true,
      }
    }

    return {
      supported: true,
      updateFound: false,
    }
  }

  return {
    needRefresh,
    offlineReady,
    dismiss,
    reload,
    checkForUpdates,
  }
}
