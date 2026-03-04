<template>
  <section v-if="shouldShowBanner" class="pwa-install-banner" role="dialog" aria-live="polite">
    <div class="pwa-install-copy">
      <p class="pwa-install-title">Install TrackTabs</p>
      <p class="pwa-install-text">Add this app to your home screen for quick access.</p>
      <p v-if="showManualInstructions" class="pwa-install-text">
        {{ manualInstructionsText }}
      </p>
    </div>
    <div class="pwa-install-actions">
      <button v-if="showPrimaryAction" type="button" class="pwa-install-primary" @click="handlePrimaryAction">
        {{ primaryActionLabel }}
      </button>
      <button type="button" class="pwa-install-secondary" @click="dismiss">
        Not now
      </button>
    </div>
    <p v-if="isIosManualInstallFlow && showInstallSteps" class="pwa-install-text pwa-install-steps">
      Tap Safari's Share icon, choose Add to Home Screen, then tap Add.
    </p>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { usePwaInstallPrompt } from '@/shared/composables/usePwaInstallPrompt.js'

const {
  canPromptInstall,
  dismiss,
  install,
  isIosManualInstallFlow,
  manualInstructionsText,
  shouldShowBanner,
  showManualInstructions,
  showPrimaryAction,
} = usePwaInstallPrompt()

const showInstallSteps = ref(false)

const primaryActionLabel = computed(() => {
  if (canPromptInstall.value) {
    return 'Add to Home Screen'
  }

  return showInstallSteps.value ? 'Hide Steps' : 'Show Install Steps'
})

async function handlePrimaryAction() {
  if (canPromptInstall.value) {
    await install()
    return
  }

  showInstallSteps.value = !showInstallSteps.value
}
</script>

<style scoped>
.pwa-install-banner {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  left: 1rem;
  z-index: 999;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border: 1px solid var(--theme-border);
  border-radius: 0.75rem;
  padding: 0.875rem;
  background: var(--theme-bg-soft);
  color: var(--theme-text);
  box-shadow: 0 12px 32px var(--theme-overlay-20);
}

.pwa-install-copy {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.pwa-install-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
}

.pwa-install-text {
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.4;
}

.pwa-install-steps {
  border-top: 1px solid var(--theme-border);
  padding-top: 0.65rem;
}

.pwa-install-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.pwa-install-primary,
.pwa-install-secondary {
  border-radius: 0.5rem;
  border: 1px solid transparent;
  padding: 0.45rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.pwa-install-primary {
  background: var(--theme-btn-primary-bg);
  color: var(--theme-btn-primary-text);
}

.pwa-install-secondary {
  background: transparent;
  color: var(--theme-btn-secondary-text);
  border-color: var(--theme-btn-secondary-border);
}

@media (min-width: 640px) {
  .pwa-install-banner {
    left: auto;
    width: min(22rem, calc(100vw - 2rem));
  }
}
</style>
