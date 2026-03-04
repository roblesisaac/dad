import { ref } from 'vue'
import { registerSW } from 'virtual:pwa-register'

const needRefresh = ref(false)
const offlineReady = ref(false)

let isRegistered = false
let updateServiceWorker = null
let visibilityListenerAttached = false
let updateCheckIntervalId = null

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

export function usePwaUpdate() {
  ensureRegistration()

  const dismiss = () => {
    needRefresh.value = false
    offlineReady.value = false
  }

  const reload = () => {
    applyUpdate()
  }

  return {
    needRefresh,
    offlineReady,
    dismiss,
    reload,
  }
}
