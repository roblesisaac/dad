<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="isOpen"
        class="account-modal-overlay fixed inset-0 z-50 flex items-center justify-center px-4"
        @click.self="closeModal"
      >
        <div
          class="account-modal-panel w-full max-w-sm rounded-3xl"
          role="dialog"
          aria-modal="true"
          aria-label="Account"
        >
          <div class="account-modal-header flex items-center justify-between px-6 py-5">
            <h3 class="account-modal-title text-[10px] font-black uppercase tracking-[0.2em]">
              Account
            </h3>
            <button
              type="button"
              class="account-modal-close rounded-full p-2 transition-colors focus:outline-none"
              aria-label="Close account modal"
              @click="closeModal"
            >
              <X class="h-4 w-4" />
            </button>
          </div>

          <div class="px-6 py-8">
            <div class="mb-10">
              <div class="flex items-center justify-between mb-6">
                <p class="account-modal-label text-[10px] font-black uppercase tracking-[0.2em]">
                  Theme
                </p>
                <span class="theme-label-badge text-[9px] font-black tracking-[0.16em] uppercase px-3 py-1.5 rounded-lg">
                  {{ accountThemeOptions.find(t => t.value === themePreference)?.label || 'System' }}
                </span>
              </div>

              <div 
                class="flex flex-wrap gap-6"
                :style="{ '--active-ring-color': activeRingColor }"
              >
                <button
                  v-for="themeOption in accountThemeOptions"
                  :key="themeOption.value"
                  type="button"
                  class="theme-circle-button relative rounded-full h-9 w-9 transition-all duration-300 border-0 focus:outline-none cursor-pointer"
                  :class="[
                    themePreference === themeOption.value 
                      ? 'theme-circle-active scale-110 z-10' 
                      : 'theme-circle-inactive hover:scale-110'
                  ]"
                  :title="themeOption.label"
                  @click="setTheme(themeOption.value)"
                >
                  <span 
                    class="theme-circle-color block w-full h-full rounded-full"
                    :style="themeOption.style"
                  ></span>
                  <span class="sr-only">{{ themeOption.label }}</span>
                </button>
              </div>
            </div>

            <div class="mb-6">
              <button
                type="button"
                class="account-update-button w-full rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all"
                :disabled="isCheckingUpdates"
                @click="handleCheckForUpdates"
              >
                {{ updateButtonLabel }}
              </button>
              <p v-if="updateStatusMessage" class="account-update-status mt-3 text-[9px] font-black uppercase tracking-[0.15em]">
                {{ updateStatusMessage }}
              </p>
            </div>

            <div class="mb-4 space-y-3">
              <button
                type="button"
                class="account-action-button w-full rounded-2xl px-6 py-4 flex items-center justify-between transition-all"
                :disabled="isSyncingBankData"
                @click="handleSyncBankData"
              >
                <span class="text-[10px] font-black uppercase tracking-[0.2em]">
                  {{ syncBankDataLabel }}
                </span>
                <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isSyncingBankData }" />
              </button>

              <button
                type="button"
                class="account-action-button w-full rounded-2xl px-6 py-4 flex items-center justify-between transition-all"
                @click="showBanksModal = true"
              >
                <span class="text-[10px] font-black uppercase tracking-[0.2em]">
                  Manage Banks
                </span>
                <Building class="h-4 w-4" />
              </button>

              <button
                type="button"
                class="account-action-button w-full rounded-2xl px-6 py-4 flex items-center justify-between transition-all"
                @click="showGlobalCategoriesModal = true"
              >
                <span class="text-[10px] font-black uppercase tracking-[0.2em]">
                  Global Categories
                </span>
                <Tags class="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              class="account-logout-button w-full rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all"
              @click="handleLogout"
            >
              Sign Out
            </button>
          </div>

          <BanksModal
            v-if="showBanksModal"
            :is-open="showBanksModal"
            @close="showBanksModal = false"
            @connect-bank-complete="handleBankConnected"
            @banks-data-changed="handleBanksDataChanged"
          />
          <GlobalCategorizeRulesModal
            :is-open="showGlobalCategoriesModal"
            @close="showGlobalCategoriesModal = false"
          />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, ref } from 'vue';
import { X, Building, RefreshCw, Tags } from 'lucide-vue-next';
import { useTheme } from '@/theme/useTheme.js';
import { useAuth } from '@/shared/composables/useAuth.js';
import { usePwaUpdate } from '@/shared/composables/usePwaUpdate.js';
import { usePlaidSync } from '@/shared/composables/usePlaidSync.js';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import { useSelectGroup } from '@/features/select-group/composables/useSelectGroup';
import BanksModal from '@/features/banks/components/BanksModal.vue';
import GlobalCategorizeRulesModal from '@/features/rule-manager/components/GlobalCategorizeRulesModal.vue';

defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close']);
const { themePreference, setTheme, resolvedTheme } = useTheme();
const { logoutUser } = useAuth();
const { needRefresh, reload, checkForUpdates } = usePwaUpdate();
const { isSyncing: isSyncingBankData, syncLatestTransactionsForAllBanks } = usePlaidSync();
const { state } = useDashboardState();
const { fetchGroupsAndAccounts, handleGroupChange } = useSelectGroup();

const isCheckingUpdates = ref(false);
const updateStatusMessage = ref('');
const showBanksModal = ref(false);
const showGlobalCategoriesModal = ref(false);

const syncBankDataLabel = computed(() => (
  isSyncingBankData.value ? 'Syncing Bank Data' : 'Sync Bank Data'
));

async function handleSyncBankData() {
  if (isSyncingBankData.value) {
    return;
  }

  try {
    await syncLatestTransactionsForAllBanks();
    await handleGroupChange({ forceRefresh: true, preserveSelectedTab: true });
  } catch (error) {
    console.error('Failed to sync bank data:', error);
  }
}

async function handleBankConnected() {
  showBanksModal.value = false;
  await fetchGroupsAndAccounts();
}

async function handleBanksDataChanged() {
  try {
    const { groups, accounts, itemsNeedingReauth } = await fetchGroupsAndAccounts();

    state.itemsNeedingReauth = itemsNeedingReauth || [];
    state.allUserGroups = (groups || []).sort((a, b) => Number(a?.sort || 0) - Number(b?.sort || 0));
    state.allUserAccounts = accounts || [];

    if (!state.allUserGroups.length || !state.allUserAccounts.length) {
      showBanksModal.value = false;
      state.isOnboarding = true;
      return;
    }

    await handleGroupChange({ forceRefresh: true, preserveSelectedTab: true });
  } catch (error) {
    console.error('Error refreshing groups and accounts after bank data change', error);
  }
}

const accountThemeOptions = [
  { value: 'system', label: 'System', style: { background: 'linear-gradient(135deg, #f3f3ee 50%, #000000 50%)' } },
  { value: 'light', label: 'Light', style: { background: '#f3f3ee' } },
  { value: 'dark', label: 'Dark', style: { background: '#000000' } },
  { value: 'bw', label: 'B/W', style: { background: '#ffffff', border: '1px solid #000000' } }
];

const activeRingColor = computed(() => {
  return resolvedTheme.value === 'dark' ? '#ffffff' : '#000000';
});

const updateButtonLabel = computed(() => {
  if (needRefresh.value) {
    return 'Reload To Update';
  }

  return isCheckingUpdates.value ? 'Checking For Updates' : 'Check For Updates';
});

function closeModal() {
  emit('close');
}

async function handleCheckForUpdates() {
  if (needRefresh.value) {
    reload();
    return;
  }

  isCheckingUpdates.value = true;
  updateStatusMessage.value = '';

  try {
    const result = await checkForUpdates();
    if (!result.supported) {
      updateStatusMessage.value = 'Update Check Unavailable';
      return;
    }

    updateStatusMessage.value = result.updateFound
      ? 'Update Ready: Reload'
      : 'You Are On Latest Version';
  } catch {
    updateStatusMessage.value = 'Update Check Failed';
  } finally {
    isCheckingUpdates.value = false;
  }
}

function handleLogout() {
  closeModal();
  logoutUser();
}
</script>

<style scoped>
.account-modal-overlay {
  background: var(--theme-overlay-30);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.account-modal-panel {
  border: 1px solid var(--theme-border);
  background: var(--theme-browser-chrome);
  box-shadow: 0 20px 60px -16px var(--theme-overlay-50);
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

.theme-label-badge {
  color: var(--theme-text);
  background: var(--theme-bg-soft);
}

.theme-circle-button {
  background: transparent;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.theme-circle-color {
  overflow: hidden;
  box-shadow: 0 2px 4px var(--theme-overlay-10);
  border: 1px solid var(--theme-border);
  /* Force Safari to clip correctly on transforms */
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  -webkit-mask-image: -webkit-radial-gradient(white, black);
  mask-image: radial-gradient(white, black);
}

.theme-circle-inactive:hover .theme-circle-color {
  border-color: var(--theme-text-soft);
}

.theme-circle-active .theme-circle-color {
  border-color: var(--theme-browser-chrome);
  border-width: 2px;
}

.theme-circle-active {
  box-shadow: 0 0 0 4px var(--active-ring-color);
}

.account-logout-button {
  background: var(--theme-text);
  color: var(--theme-browser-chrome);
  box-shadow: 0 4px 6px -1px var(--theme-overlay-10);
  border: 1px solid transparent;
}

.account-update-button {
  background: transparent;
  color: var(--theme-btn-secondary-text);
  border: 1px solid var(--theme-btn-secondary-border);
}

.account-action-button {
  background: var(--theme-bg-soft);
  color: var(--theme-text);
  border: 1px solid var(--theme-border);
}

.account-action-button:hover:not(:disabled) {
  background: var(--theme-bg-subtle);
}

.account-action-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.account-update-button:hover:not(:disabled) {
  background: var(--theme-btn-secondary-hover-bg);
}

.account-update-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.account-update-status {
  color: var(--theme-text-soft);
}

.account-logout-button:hover {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 6px 8px -1px var(--theme-overlay-20);
}

.account-logout-button:active {
  transform: translateY(1px);
  box-shadow: 0 2px 4px -1px var(--theme-overlay-10);
}

/* Modal Fade Transition */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}
</style>
