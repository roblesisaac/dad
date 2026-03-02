<template>
  <div class="flex flex-col transition-all pb-12 sm:pb-20 bg-transparent">
    <!-- Row 1: Top Navigation (Group & Date) -->
    <div class="sticky top-0 z-20 bg-white/90 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 py-4 mb-8 sm:mb-12 transition-all">
      <!-- Breadcrumbs (Left) -->
      <div class="flex items-center gap-2 min-w-0">
        <template v-if="isGroupSelectorView">
          <span class="font-black text-black text-xs sm:text-sm uppercase tracking-[0.2em] truncate">
            Select Account
          </span>
        </template>

        <template v-else-if="isTabSelectorView">
          <button
            @click="emit('navigate-group')"
            class="font-black text-black text-xs sm:text-sm uppercase tracking-[0.2em] truncate hover:opacity-70 transition-opacity focus:outline-none"
          >
            {{ selectedGroupLabel }}
          </button>
        </template>

        <template v-else>
          <button
            @click="emit('navigate-group')"
            class="font-black text-black text-xs sm:text-sm uppercase tracking-[0.2em] truncate hover:opacity-70 transition-opacity focus:outline-none"
          >
            {{ selectedGroupLabel }}
          </button>
          <span class="text-gray-300 font-black text-xs sm:text-sm">/</span>
          <button
            @click="emit('navigate-tab')"
            class="font-black text-black text-xs sm:text-sm uppercase tracking-[0.2em] truncate hover:opacity-70 transition-opacity focus:outline-none"
          >
            {{ selectedTabLabel }}
          </button>
        </template>
      </div>

      <!-- Date Selection (Right) -->
      <div class="flex-shrink-0">
        <SelectDate />
      </div>
    </div>

    <!-- Row 2: Hero Section -->
    <div class="flex flex-col items-center justify-center text-center">
      <button
        v-if="isCategoryView"
        @click="showAllTabsModal = true"
        class="flex flex-col items-center group hover:opacity-80 transition-opacity focus:outline-none"
      >
        <span class="font-black text-black text-6xl sm:text-8xl tracking-tighter mb-4 transition-all group-active:scale-[0.98]">
          {{ formatPrice(headerTotal, { toFixed: 0 }) }}
        </span>

        <div class="flex items-center gap-2">
          <span class="text-md uppercase tracking-[0.4em]">
            {{ state.selected.tab?.tabName || 'Tab' }}
          </span>
          <ChevronDown class="w-3 h-3 text-gray-200 group-hover:text-gray-400 transition-colors" />
        </div>
      </button>

      <div v-else class="flex flex-col items-center">
        <span class="font-black text-black text-6xl sm:text-8xl tracking-tighter mb-4">
          {{ formatPrice(headerTotal, { toFixed: 0 }) }}
        </span>
        <span class="text-md uppercase tracking-[0.4em]">
          {{ selectorLabel }}
        </span>
      </div>
    </div>

    <!-- Modal -->
    <AllTabsModal
      v-if="isCategoryView"
      :is-open="showAllTabsModal"
      @close="showAllTabsModal = false"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import { useUtils } from '@/shared/composables/useUtils';
import { ChevronDown } from 'lucide-vue-next';

import SelectDate from '@/features/select-date/views/SelectDate.vue';
import AllTabsModal from '@/features/tabs/components/AllTabsModal.vue';

const props = defineProps({
  view: {
    type: String,
    default: 'tab',
    validator: (value) => ['group', 'tab', 'category'].includes(value)
  }
});
const emit = defineEmits(['navigate-group', 'navigate-tab']);

const { state } = useDashboardState();
const { formatPrice } = useUtils();

const showAllTabsModal = ref(false);
const isGroupSelectorView = computed(() => props.view === 'group');
const isTabSelectorView = computed(() => props.view === 'tab');
const isCategoryView = computed(() => props.view === 'category');
const selectedGroupLabel = computed(() => state.selected.group?.name || 'Select Account');
const selectedTabLabel = computed(() => state.selected.tab?.tabName || 'Select Tab');
const selectorLabel = computed(() => (isGroupSelectorView.value ? 'Select Account' : 'Select Tab'));

function numberOrZero(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function resolveGroupAccount(account) {
  if (!account) return {};

  if (account.type) {
    return account;
  }

  return (
    state.allUserAccounts.find((userAccount) =>
      userAccount._id === account._id || userAccount.account_id === account.account_id
    ) || account
  );
}

const selectedGroupNetBalance = computed(() => {
  const groupAccounts = state.selected.group?.accounts || [];

  return groupAccounts.reduce((accumulator, account) => {
    const resolvedAccount = resolveGroupAccount(account);
    const accountType = resolvedAccount?.type;
    const availableBalance = numberOrZero(
      resolvedAccount?.available ?? resolvedAccount?.balances?.available
    );
    const currentBalance = numberOrZero(
      resolvedAccount?.current ?? resolvedAccount?.balances?.current
    );
    const effectiveBalance = accountType === 'credit' ? currentBalance : availableBalance;

    return accountType === 'credit'
      ? accumulator - effectiveBalance
      : accumulator + effectiveBalance;
  }, 0);
});

const headerTotal = computed(() => {
  if (!isCategoryView.value) {
    return selectedGroupNetBalance.value;
  }

  const overrideTotal = Number(state.reportRowTotalOverride);
  if (state.isLoading && Number.isFinite(overrideTotal)) {
    return overrideTotal;
  }

  const liveTotal = Number(state.selected.tab?.total);
  return Number.isFinite(liveTotal) ? liveTotal : 0;
});
</script>
