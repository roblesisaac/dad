<template>
  <div class="flex flex-col transition-all pb-12 sm:pb-20 bg-transparent">
    <div class="sticky top-0 z-20 bg-white/90 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 py-4 mb-8 sm:mb-12 transition-all">
      <nav class="flex items-center gap-1.5 sm:gap-2 min-w-0">
        <button
          @click="emit('navigate-group')"
          class="flex-shrink-0 text-black hover:opacity-70 transition-opacity focus:outline-none"
          type="button"
          aria-label="Home"
        >
          <Home class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        <!-- Account segment -->
        <template v-if="!isGroupSelectorView">
          <span class="text-gray-300 font-black text-xs sm:text-sm flex-shrink-0">/</span>
          <span
            v-if="isTabSelectorView"
            class="font-black text-black text-xs sm:text-sm uppercase tracking-[0.2em] truncate"
          >
            {{ selectedGroupLabel }}
          </span>
          <button
            v-else
            @click="emit('navigate-tab')"
            class="font-black text-black text-xs sm:text-sm uppercase tracking-[0.2em] truncate hover:opacity-70 transition-opacity focus:outline-none"
            type="button"
          >
            {{ selectedGroupLabel }}
          </button>
        </template>

        <!-- Tab segment -->
        <template v-if="isCategoryView || isCategoryDetailView">
          <span class="text-gray-300 font-black text-xs sm:text-sm flex-shrink-0">/</span>
          <span
            v-if="isCategoryView"
            class="font-black text-black text-xs sm:text-sm uppercase tracking-[0.2em] truncate"
          >
            {{ selectedTabLabel }}
          </span>
          <button
            v-else
            @click="emit('navigate-category')"
            class="font-black text-black text-xs sm:text-sm uppercase tracking-[0.2em] truncate hover:opacity-70 transition-opacity focus:outline-none"
            type="button"
          >
            {{ selectedTabLabel }}
          </button>
        </template>

        <!-- Category segment -->
        <template v-if="isCategoryDetailView">
          <span class="text-gray-300 font-black text-xs sm:text-sm flex-shrink-0">/</span>
          <span class="font-black text-black text-xs sm:text-sm uppercase tracking-[0.2em] truncate">
            {{ selectedCategoryLabel }}
          </span>
        </template>
      </nav>

      <div class="flex-shrink-0">
        <ThemeCycleButton />
      </div>
    </div>

    <div class="flex flex-col items-center justify-center text-center">
      <div class="flex items-center gap-2 sm:gap-3 mb-4">
        <span class="font-black text-black text-6xl sm:text-8xl tracking-tighter">
          {{ formatPrice(headerTotal, { toFixed: 0 }) }}
        </span>
        <button
          type="button"
          class="header-info-trigger inline-flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full text-[var(--theme-text-soft)] transition-colors hover:text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-ring)]"
          aria-label="What this total means"
          :aria-expanded="isHeaderInfoModalOpen"
          @click="openHeaderInfoModal"
        >
          <Info class="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </button>
      </div>
      <SelectDate v-if="!isGroupSelectorView" />
      <span v-else>NET WORTH</span>
    </div>

    <Teleport to="body">
      <div
        v-if="isHeaderInfoModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-[var(--theme-overlay-30)] px-4"
        @click.self="closeHeaderInfoModal"
      >
        <div
          class="w-full max-w-sm rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg)] shadow-[0_20px_60px_-24px_var(--theme-overlay-50)]"
          role="dialog"
          aria-modal="true"
          :aria-label="headerInfo.title"
        >
          <div class="flex items-start justify-between gap-4 border-b border-[var(--theme-border)] px-4 py-3">
            <h3 class="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--theme-text)]">
              {{ headerInfo.title }}
            </h3>
            <button
              type="button"
              class="rounded-full p-1 text-[var(--theme-text-soft)] transition-colors hover:text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-ring)]"
              aria-label="Close total info"
              @click="closeHeaderInfoModal"
            >
              <X class="h-4 w-4" />
            </button>
          </div>
          <div class="space-y-3 px-4 py-4 text-left">
            <p class="text-sm leading-relaxed text-[var(--theme-text)]">
              {{ headerInfo.summary }}
            </p>
            <ul class="space-y-1.5">
              <li
                v-for="detail in headerInfo.details"
                :key="detail"
                class="text-xs leading-relaxed text-[var(--theme-text-soft)]"
              >
                {{ detail }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import { useUtils } from '@/shared/composables/useUtils';
import { Home, Info, X } from 'lucide-vue-next';
import SelectDate from '@/features/select-date/views/SelectDate.vue';
import ThemeCycleButton from '@/shared/components/ThemeCycleButton.vue';

const props = defineProps({
  view: {
    type: String,
    default: 'group',
    validator: (value) => ['group', 'tab', 'category', 'category-detail'].includes(value)
  }
});

const emit = defineEmits(['navigate-group', 'navigate-tab', 'navigate-category']);
const { state } = useDashboardState();
const { formatPrice } = useUtils();
const isHeaderInfoModalOpen = ref(false);

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

const headerInfo = computed(() => {
  if (isGroupSelectorView.value) {
    return {
      title: 'Net Worth',
      summary: 'This is your total net worth across all connected accounts.',
      details: [
        'Non-credit accounts use available balances.',
        'Credit accounts use current balances and are subtracted.'
      ]
    };
  }

  if (isTabSelectorView.value) {
    return {
      title: 'Selected Account Balance',
      summary: `This is the current net balance for ${selectedGroupLabel.value}.`,
      details: [
        'Non-credit accounts use available balances.',
        'Credit accounts use current balances and are subtracted.',
        'This value is balance-based and does not use the date range.'
      ]
    };
  }

  if (isCategoryDetailView.value) {
    return {
      title: 'Category Total',
      summary: 'This is the total for the selected category in the active date range.',
      details: ['Use the date selector below to change the range.']
    };
  }

  return {
    title: 'Tab Total',
    summary: 'This is the total for the selected tab in the active date range.',
    details: ['Use the date selector below to change the range.']
  };
});

function openHeaderInfoModal() {
  isHeaderInfoModalOpen.value = true;
}

function closeHeaderInfoModal() {
  isHeaderInfoModalOpen.value = false;
}

function onHeaderInfoEscape(event) {
  if (event.key === 'Escape' && isHeaderInfoModalOpen.value) {
    closeHeaderInfoModal();
  }
}

onMounted(() => {
  window.addEventListener('keydown', onHeaderInfoEscape);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onHeaderInfoEscape);
});
</script>

<style scoped>
.header-info-trigger {
  background-color: inherit;
}

[data-theme]:not([data-theme='light']) .header-info-trigger {
  background-color: var(--theme-bg);
}
</style>
