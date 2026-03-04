import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const DISMISSED_STORAGE_KEY = 'tracktabs:pwa-install-dismissed'

function isStandaloneMode() {
  if (typeof window === 'undefined') return false

  const displayModeStandalone = window.matchMedia('(display-mode: standalone)').matches
  const iosStandalone = window.navigator.standalone === true

  return displayModeStandalone || iosStandalone
}

function isIosDevice() {
  if (typeof window === 'undefined') return false

  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

function isSafariBrowser() {
  if (typeof window === 'undefined') return false

  const userAgent = window.navigator.userAgent
  const isSafari = /safari/i.test(userAgent)
  const isNonSafariEngine = /chrome|chromium|crios|edg|opr|opera|fxios|android|brave/i.test(userAgent)

  return isSafari && !isNonSafariEngine
}

export function usePwaInstallPrompt() {
  const deferredPrompt = ref(null)
  const installed = ref(false)
  const dismissed = ref(false)
  const iosDevice = ref(false)
  const safariBrowser = ref(false)
  const canPromptInstall = computed(() => Boolean(deferredPrompt.value))
  const showIosInstructions = computed(() => {
    return safariBrowser.value && iosDevice.value && !installed.value && !canPromptInstall.value
  })
  const showSafariDesktopInstructions = computed(() => {
    return safariBrowser.value && !iosDevice.value && !installed.value && !canPromptInstall.value
  })
  const showManualInstructions = computed(() => {
    return showIosInstructions.value || showSafariDesktopInstructions.value
  })
  const isIosManualInstallFlow = computed(() => showIosInstructions.value)
  const showPrimaryAction = computed(() => {
    return canPromptInstall.value || showIosInstructions.value
  })
  const manualInstructionsText = computed(() => {
    if (showIosInstructions.value) {
      return 'On Safari, tap Share, then tap Add to Home Screen.'
    }

    if (showSafariDesktopInstructions.value) {
      return 'In Safari on Mac, choose File, then Add to Dock.'
    }

    return ''
  })

  const shouldShowBanner = computed(() => {
    return !installed.value && !dismissed.value && (canPromptInstall.value || showManualInstructions.value)
  })

  const markDismissed = () => {
    dismissed.value = true
    localStorage.setItem(DISMISSED_STORAGE_KEY, 'true')
  }

  const markInstalled = () => {
    installed.value = true
    deferredPrompt.value = null
    localStorage.removeItem(DISMISSED_STORAGE_KEY)
  }

  const handleBeforeInstallPrompt = (event) => {
    event.preventDefault()
    deferredPrompt.value = event
  }

  const handleAppInstalled = () => {
    markInstalled()
  }

  const install = async () => {
    if (deferredPrompt.value) {
      deferredPrompt.value.prompt()
      const { outcome } = await deferredPrompt.value.userChoice

      if (outcome === 'accepted') {
        markInstalled()
        return
      }

      // Treat a dismissed browser prompt as "ignore for now".
      markDismissed()
      return 'dismissed'
    }

    if (showIosInstructions.value) {
      return 'manual'
    }

    return 'unsupported'
  }

  const dismiss = () => {
    markDismissed()
  }

  onMounted(() => {
    iosDevice.value = isIosDevice()
    safariBrowser.value = isSafariBrowser()
    installed.value = isStandaloneMode()
    dismissed.value = localStorage.getItem(DISMISSED_STORAGE_KEY) === 'true'

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.removeEventListener('appinstalled', handleAppInstalled)
  })

  return {
    canPromptInstall,
    install,
    dismiss,
    shouldShowBanner,
    manualInstructionsText,
    showManualInstructions,
    isIosManualInstallFlow,
    showPrimaryAction,
  }
}
