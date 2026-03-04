<template>
  <section v-if="isVisible" class="pwa-update-banner" role="status" aria-live="polite">
    <p class="pwa-update-text">{{ message }}</p>
    <div class="pwa-update-actions">
      <button v-if="needRefresh" type="button" class="pwa-update-primary" @click="reload">
        Reload now
      </button>
      <button type="button" class="pwa-update-secondary" @click="dismiss">
        Dismiss
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { usePwaUpdate } from '@/shared/composables/usePwaUpdate.js'

const { dismiss, needRefresh, offlineReady, reload } = usePwaUpdate()

const isVisible = computed(() => needRefresh.value || offlineReady.value)
const message = computed(() => {
  if (needRefresh.value) {
    return 'A new version is ready.'
  }

  return 'App is ready to work offline.'
})
</script>

<style scoped>
.pwa-update-banner {
  position: fixed;
  top: calc(env(safe-area-inset-top, 0px) + 0.75rem);
  right: 0.75rem;
  z-index: 1001;
  width: min(21rem, calc(100vw - 1.5rem));
  border: 1px solid var(--theme-border);
  border-radius: 0.75rem;
  padding: 0.75rem;
  background: var(--theme-bg-soft);
  color: var(--theme-text);
  box-shadow: 0 12px 32px var(--theme-overlay-20);
}

.pwa-update-text {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.4;
}

.pwa-update-actions {
  display: flex;
  gap: 0.45rem;
  margin-top: 0.65rem;
}

.pwa-update-primary,
.pwa-update-secondary {
  border-radius: 0.5rem;
  border: 1px solid transparent;
  padding: 0.45rem 0.75rem;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
}

.pwa-update-primary {
  background: var(--theme-btn-primary-bg);
  color: var(--theme-btn-primary-text);
}

.pwa-update-secondary {
  background: transparent;
  color: var(--theme-btn-secondary-text);
  border-color: var(--theme-btn-secondary-border);
}
</style>
