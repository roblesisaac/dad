<template>
  <div class="flex flex-col transition-all pb-12 sm:pb-20 bg-transparent">
    <div class="sticky top-0 z-20 bg-white/90 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 py-4 mb-8 sm:mb-12 transition-all">
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
            type="button"
          >
            {{ selectedGroupLabel }}
          </button>
        </template>

        <template v-else-if="isCategoryView">
          <button
            @click="emit('navigate-group')"
            class="font-black text-black text-xs sm:text-sm uppercase tracking-[0.2em] truncate hover:opacity-70 transition-opacity focus:outline-none"
            type="button"
          >
            {{ selectedGroupLabel }}
          </button>
          <span class="text-gray-300 font-black text-xs sm:text-sm">/</span>
          <button
            @click="emit('navigate-tab')"
            class="font-black text-black text-xs sm:text-sm uppercase tracking-[0.2em] truncate hover:opacity-70 transition-opacity focus:outline-none"
            type="button"
          >
            {{ selectedTabLabel }}
          </button>
        </template>

        <template v-else>
          <button
            @click="emit('navigate-group')"
            class="font-black text-black text-xs sm:text-sm uppercase tracking-[0.2em] truncate hover:opacity-70 transition-opacity focus:outline-none"
            type="button"
          >
            {{ selectedGroupLabel }}
          </button>
          <span class="text-gray-300 font-black text-xs sm:text-sm">/</span>
          <button
            @click="emit('navigate-tab')"
            class="font-black text-black text-xs sm:text-sm uppercase tracking-[0.2em] truncate hover:opacity-70 transition-opacity focus:outline-none"
            type="button"
          >
            {{ selectedTabLabel }}
          </button>
          <span class="text-gray-300 font-black text-xs sm:text-sm">/</span>
          <span class="font-black text-black text-xs sm:text-sm uppercase tracking-[0.2em] truncate">
            {{ selectedCategoryLabel }}
          </span>
        </template>
      </div>

      <div class="flex-shrink-0">
        <ThemeCycleButton />
      </div>
    </div>

    <div class="flex flex-col items-center justify-center text-center">
      <span class="font-black text-black text-6xl sm:text-8xl tracking-tighter mb-4">
        {{ formatPrice(headerTotal, { toFixed: 0 }) }}
      </span>
      <SelectDate v-if="!isGroupSelectorView" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import { useUtils } from '@/shared/composables/useUtils';
import SelectDate from '@/features/select-date/views/SelectDate.vue';
import ThemeCycleButton from '@/shared/components/ThemeCycleButton.vue';

const props = defineProps({
  view: {
    type: String,
    default: 'group',
    validator: (value) => ['group', 'tab', 'category', 'category-detail'].includes(value)
  }
});

const emit = defineEmits(['navigate-group', 'navigate-tab']);
const { state } = useDashboardState();
const { formatPrice } = useUtils();

const isGroupSelectorView = computed(() => props.view === 'group');
const isTabSelectorView = computed(() => props.view === 'tab');
const isCategoryView = computed(() => props.view === 'category');
const isCategoryDetailView = computed(() => props.view === 'category-detail');

const selectedGroupLabel = computed(() => state.selected.group?.name || 'Select Account');
const selectedTabLabel = computed(() => state.selected.tab?.tabName || 'Select Tab');
const selectedCategoryLabel = computed(() => state.selected.category || 'Category');

function numberOrZero(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function resolveGroupAccount(account) {
  if (!account) return {};
  if (account.type) return account;

  return (
    state.allUserAccounts.find(
      (userAccount) =>
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

const totalNetBalance = computed(() => {
  const allAccounts = state.allUserAccounts || [];

  return allAccounts.reduce((accumulator, account) => {
    const accountType = account?.type;
    const availableBalance = numberOrZero(account?.balances?.available ?? account?.available);
    const currentBalance = numberOrZero(account?.balances?.current ?? account?.current);
    const effectiveBalance = accountType === 'credit' ? currentBalance : availableBalance;

    return accountType === 'credit'
      ? accumulator - effectiveBalance
      : accumulator + effectiveBalance;
  }, 0);
});

const selectedCategoryTotal = computed(() => {
  const selectedCategoryName = state.selected.category;
  const categorizedItems = state.selected.tab?.categorizedItems || [];
  const selectedCategory = categorizedItems.find(
    ([categoryName]) => categoryName === selectedCategoryName
  );

  const categoryTotal = Number(selectedCategory?.[2]);
  return Number.isFinite(categoryTotal) ? categoryTotal : 0;
});

const headerTotal = computed(() => {
  if (isGroupSelectorView.value) {
    return totalNetBalance.value;
  }

  if (isTabSelectorView.value) {
    return selectedGroupNetBalance.value;
  }

  if (isCategoryDetailView.value) {
    return selectedCategoryTotal.value;
  }

  const overrideTotal = Number(state.reportRowTotalOverride);
  if (state.isLoading && Number.isFinite(overrideTotal)) {
    return overrideTotal;
  }

  const liveTotal = Number(state.selected.tab?.total);
  return Number.isFinite(liveTotal) ? liveTotal : 0;
});
</script>
