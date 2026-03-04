<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="account-modal-overlay fixed inset-0 z-50 flex items-center justify-center px-4"
      @click.self="closeModal"
    >
      <div
        class="account-modal-panel w-full max-w-sm rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Account"
      >
        <div class="account-modal-header flex items-center justify-between px-4 py-3">
          <h3 class="account-modal-title text-[10px] font-black uppercase tracking-[0.2em]">
            Account
          </h3>
          <button
            type="button"
            class="account-modal-close rounded-full p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-ring)]"
            aria-label="Close account modal"
            @click="closeModal"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="space-y-5 px-4 py-4">
          <div>
            <p class="account-modal-label text-[10px] font-black uppercase tracking-[0.2em]">
              Theme
            </p>
            <div class="mt-2 grid grid-cols-2 gap-2">
              <button
                v-for="themeOption in accountThemeOptions"
                :key="themeOption.value"
                type="button"
                class="account-theme-button rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-colors"
                :class="{ 'account-theme-button-active': resolvedTheme === themeOption.value }"
                @click="setTheme(themeOption.value)"
              >
                {{ themeOption.label }}
              </button>
            </div>
          </div>

          <button
            type="button"
            class="account-logout-button w-full rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-colors"
            @click="handleLogout"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { X } from 'lucide-vue-next';
import { useTheme } from '@/theme/useTheme.js';
import { useAuth } from '@/shared/composables/useAuth.js';

defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close']);
const { resolvedTheme, setTheme } = useTheme();
const { logoutUser } = useAuth();

const accountThemeOptions = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' }
];

function closeModal() {
  emit('close');
}

function handleLogout() {
  closeModal();
  logoutUser();
}
</script>

<style scoped>
.account-modal-overlay {
  background: var(--theme-overlay-30);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.account-modal-panel {
  border: 1px solid var(--theme-border);
  background: var(--theme-bg);
  box-shadow: 0 20px 60px -24px var(--theme-overlay-50);
}

.account-modal-header {
  border-bottom: 1px solid var(--theme-border);
}

.account-modal-title {
  color: var(--theme-text);
}

.account-modal-label {
  color: var(--theme-text-soft);
}

.account-modal-close {
  color: var(--theme-text-soft);
}

.account-modal-close:hover {
  color: var(--theme-text);
  background: var(--theme-bg-soft);
}

.account-theme-button {
  border-color: var(--theme-border);
  color: var(--theme-text-soft);
  background: var(--theme-bg);
}

.account-theme-button:hover {
  color: var(--theme-text);
  background: var(--theme-bg-soft);
}

.account-theme-button-active {
  border-color: var(--theme-text);
  color: var(--theme-text);
  background: var(--theme-bg-subtle);
}

.account-logout-button {
  border-color: var(--theme-border);
  color: var(--theme-text);
  background: var(--theme-bg);
}

.account-logout-button:hover {
  background: var(--theme-bg-soft);
}
</style>
