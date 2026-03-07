<template>
  <div 
    class="flex flex-col transition-all bg-transparent"
    :class="state.isOnboarding ? 'pb-4 sm:pb-6' : 'pb-12 sm:pb-20'"
  >
    <div class="fixed inset-x-0 top-0 z-30 backdrop-blur-md">
      <div class="max-w-5xl mx-auto w-full sm:px-6">
        <div class="px-4 flex items-center justify-between py-4 transition-all">
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
            <template v-if="!isGroupSelectorView && !isTransactionSearchView">
              <span class="text-black font-black text-xs sm:text-sm flex-shrink-0">/</span>
              <span
                v-if="isTabSelectorView"
                class="font-black text-black text-xs sm:text-sm uppercase tracking-[0.2em] truncate"
              >
                {{ selectedGroupLabel }}
              </span>
              <button
                v-else
                @click="handleGroupSegmentNavigation"
                class="clickable-underline font-black text-black text-xs sm:text-sm uppercase tracking-[0.2em] truncate hover:opacity-70 transition-opacity focus:outline-none"
                type="button"
              >
                {{ selectedGroupLabel }}
              </button>
            </template>

            <!-- Tab segment -->
            <template v-if="isDrillView && !shouldCondenseSingleTabBreadcrumb">
              <span class="text-black font-black text-xs sm:text-sm flex-shrink-0">/</span>
              <button
                @click="emit('navigate-category')"
                class="clickable-underline font-black text-black text-xs sm:text-sm uppercase tracking-[0.2em] truncate hover:opacity-70 transition-opacity focus:outline-none"
                type="button"
              >
                {{ selectedTabLabel }}
              </button>
            </template>

            <!-- Drill path segments -->
            <template
              v-for="(segment, index) in drillBreadcrumbs"
              :key="`drill-segment-${index}-${segment.key}`"
            >
              <span class="text-black font-black text-xs sm:text-sm flex-shrink-0">/</span>
              <button
                v-if="index < drillBreadcrumbs.length - 1"
                class="clickable-underline font-black text-black text-xs sm:text-sm uppercase tracking-[0.2em] truncate hover:opacity-70 transition-opacity focus:outline-none"
                type="button"
                @click="emit('navigate-drill-depth', index + 1)"
              >
                {{ segment.label }}
              </button>
              <span v-else class="font-black text-black text-xs sm:text-sm uppercase tracking-[0.2em] truncate">
                {{ segment.label }}
              </span>
            </template>

            <template v-if="isTransactionSearchView">
              <span class="text-black font-black text-xs sm:text-sm flex-shrink-0">/</span>
              <span class="font-black text-black text-xs sm:text-sm uppercase tracking-[0.2em] truncate">
                Transactions
              </span>
            </template>
          </nav>

          <div class="flex-shrink-0 flex items-center gap-2">
            <button
              v-if="showRearrangeAction"
              type="button"
              class="header-action-button px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-opacity hover:opacity-70 focus:outline-none"
              @click="emit('toggle-rearrange')"
            >
              {{ isRearrangeActive ? 'Done' : 'Rearrange' }}
            </button>

            <button
              v-else-if="showEditTabAction"
              type="button"
              class="header-action-button px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-opacity hover:opacity-70 focus:outline-none"
              @click="emit('edit-tab')"
            >
              Edit Tab
            </button>

            <button
              v-if="showRecategorizeOverrideWarning"
              type="button"
              class="header-action-button inline-flex items-center justify-center p-2 rounded-full text-[#b45309] hover:opacity-70 transition-opacity focus:outline-none"
              :title="recategorizeOverrideWarningLabel"
              @click="emit('edit-tab')"
            >
              <AlertTriangle class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <div :class="state.isOnboarding ? 'pt-16' : 'pt-20 sm:pt-24'">
      <div v-if="isTransactionSearchView" class="flex flex-col items-center justify-center text-center">
        <span class="font-black text-black text-lg sm:text-xl uppercase tracking-[0.2em]">
          Transaction Search
        </span>
      </div>

      <div v-else-if="!state.isOnboarding" class="flex flex-col items-center justify-center text-center">
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
        <SelectDate
          v-if="!isGroupSelectorView"
          class="clickable-date-selector"
        />
        <span v-else>Available</span>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="isHeaderInfoModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-[var(--theme-overlay-30)] px-4"
        @click.self="closeHeaderInfoModal"
      >
        <div
          class="w-full max-w-sm rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-browser-chrome)] shadow-[0_20px_60px_-24px_var(--theme-overlay-50)]"
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
            <ul v-if="headerInfo.details" class="space-y-1.5">
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
import { format, isSameYear, isValid, parseISO, startOfMonth, startOfYear } from 'date-fns';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import { useUtils } from '@/shared/composables/useUtils';
import { AlertTriangle, Home, Info, X } from 'lucide-vue-next';
import SelectDate from '@/features/select-date/views/SelectDate.vue';

const props = defineProps({
  view: {
    type: String,
    default: 'group',
    validator: (value) => ['group', 'tab', 'drill', 'transaction-search'].includes(value)
  },
  isRearrangeActive: {
    type: Boolean,
    default: false
  },
  drillBreadcrumbs: {
    type: Array,
    default: () => []
  },
  drillTabTotal: {
    type: Number,
    default: 0
  },
  isDrillLeaf: {
    type: Boolean,
    default: false
  },
  overriddenRecategorizeCount: {
    type: Number,
    default: 0
  },
  isHonoringRecategorizeAs: {
    type: Boolean,
    default: false
  },
  hasRecategorizeBehaviorDecision: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits([
  'navigate-group',
  'navigate-tab',
  'navigate-category',
  'navigate-drill-depth',
  'toggle-rearrange',
  'edit-tab'
]);
const { state } = useDashboardState();
const { formatPrice } = useUtils();
const isHeaderInfoModalOpen = ref(false);

const isGroupSelectorView = computed(() => props.view === 'group');
const isTabSelectorView = computed(() => props.view === 'tab');
const isDrillView = computed(() => props.view === 'drill');
const isTransactionSearchView = computed(() => props.view === 'transaction-search');
const drillBreadcrumbs = computed(() => (Array.isArray(props.drillBreadcrumbs) ? props.drillBreadcrumbs : []));
const selectedDrillLabel = computed(() => drillBreadcrumbs.value[drillBreadcrumbs.value.length - 1]?.label || 'Selected Level');
const shouldCondenseSingleTabBreadcrumb = computed(() => (
  isDrillView.value
  && state.selected.tabsForGroup.length === 1
));
const isRearrangeActive = computed(() => props.isRearrangeActive);
const showRearrangeAction = computed(() => isGroupSelectorView.value || isTabSelectorView.value);
const showEditTabAction = computed(() => (
  isDrillView.value
  && Boolean(state.selected.tab)
));
const showRecategorizeOverrideWarning = computed(() => (
  showEditTabAction.value
  && !props.hasRecategorizeBehaviorDecision
  && !props.isHonoringRecategorizeAs
  && Number(props.overriddenRecategorizeCount) > 0
));
const recategorizeOverrideWarningLabel = computed(() => {
  const count = Number(props.overriddenRecategorizeCount);
  const safeCount = Number.isFinite(count) && count > 0 ? Math.round(count) : 0;
  const noun = safeCount === 1 ? 'transaction' : 'transactions';
  return `${safeCount} recategorized ${noun} were overridden by tab categorize rules`;
});

const selectedGroupLabel = computed(() => state.selected.group?.name || 'Select Account');
const selectedTabLabel = computed(() => state.selected.tab?.tabName || 'Select Tab');
const activeDateRangeLabel = computed(() => formatActiveDateRange(state.date.start, state.date.end));

function handleGroupSegmentNavigation() {
  if (isDrillView.value && shouldCondenseSingleTabBreadcrumb.value) {
    emit('navigate-category');
    return;
  }

  emit('navigate-tab');
}

function numberOrZero(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function accountIdentifiers(account) {
  if (!account) {
    return [];
  }

  if (typeof account === 'string') {
    return [account];
  }

  return [account._id, account.account_id, account.id, account.accountId].filter(Boolean);
}

function resolveGroupAccount(account) {
  const ids = accountIdentifiers(account);
  if (!ids.length) {
    return typeof account === 'object' ? account : null;
  }

  return (
    state.allUserAccounts.find((userAccount) => {
      const userAccountIds = accountIdentifiers(userAccount);
      return userAccountIds.some(id => ids.includes(id));
    }) || (typeof account === 'object' ? account : null)
  );
}

function accountNetBalance(account) {
  const resolvedAccount = resolveGroupAccount(account) || account;
  const accountType = resolvedAccount?.type;
  const availableBalance = numberOrZero(
    resolvedAccount?.available ?? resolvedAccount?.balances?.available
  );
  const currentBalance = numberOrZero(
    resolvedAccount?.current ?? resolvedAccount?.balances?.current
  );
  const effectiveBalance = accountType === 'credit' ? currentBalance : availableBalance;

  return accountType === 'credit' ? -effectiveBalance : effectiveBalance;
}

const selectedGroupNetBalance = computed(() => {
  const groupAccounts = state.selected.group?.accounts || [];

  return groupAccounts.reduce((accumulator, account) => accumulator + accountNetBalance(account), 0);
});

const totalNetBalance = computed(() => {
  const allAccounts = state.allUserAccounts || [];

  return allAccounts.reduce((accumulator, account) => accumulator + accountNetBalance(account), 0);
});

const selectedDrillTotal = computed(() => {
  if (!props.isDrillLeaf) {
    return Number(props.drillTabTotal || 0);
  }

  const selectedCrumbTotal = Number(drillBreadcrumbs.value[drillBreadcrumbs.value.length - 1]?.total);
  if (Number.isFinite(selectedCrumbTotal)) {
    return selectedCrumbTotal;
  }

  return Number(props.drillTabTotal || 0);
});

const headerTotal = computed(() => {
  if (isGroupSelectorView.value) {
    return totalNetBalance.value;
  }

  if (isTabSelectorView.value) {
    return selectedGroupNetBalance.value;
  }

  if (isDrillView.value) {
    return selectedDrillTotal.value;
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
      title: 'Available',
      summary: 'This is your total available money across all connected accounts.',
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

  if (isDrillView.value && props.isDrillLeaf) {
    return {
      title: 'Drill Level Total',
      summary: `This is the total for ${selectedDrillLabel.value} in ${activeDateRangeLabel.value}.`
    };
  }

  return {
    title: 'Tab Total',
    summary: `This is the total for ${selectedTabLabel.value} in ${activeDateRangeLabel.value}.`,
    details: ['Click the date selector below to change the range.']
  };
});

function parseDateForSummary(value) {
  if (!value) return null;

  if (value === 'firstOfMonth') {
    return startOfMonth(new Date());
  }

  if (value === 'firstOfYear') {
    return startOfYear(new Date());
  }

  if (value === 'today') {
    return new Date();
  }

  if (value instanceof Date) {
    return isValid(value) ? value : null;
  }

  const parsed = parseISO(String(value));
  return isValid(parsed) ? parsed : null;
}

function formatDateLabel(date, includeYear = false) {
  return format(date, includeYear ? 'MMM d yyyy' : 'MMM d');
}

function formatActiveDateRange(startValue, endValue) {
  const startDate = parseDateForSummary(startValue);
  const endDate = parseDateForSummary(endValue);

  if (!startDate && !endDate) {
    return 'the selected date range';
  }

  if (startDate && !endDate) {
    return `the range from ${formatDateLabel(startDate, true)}`;
  }

  if (!startDate && endDate) {
    return `the range through ${formatDateLabel(endDate, true)}`;
  }

  if (startDate.getTime() === endDate.getTime()) {
    return formatDateLabel(startDate, true);
  }

  if (isSameYear(startDate, endDate)) {
    return `${formatDateLabel(startDate)} - ${formatDateLabel(endDate, true)}`;
  }

  return `${formatDateLabel(startDate, true)} - ${formatDateLabel(endDate, true)}`;
}

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
.clickable-underline {
  text-decoration: none;
  background-image: radial-gradient(circle, currentColor 1px, transparent 1.2px);
  background-size: 6px 2px;
  background-repeat: repeat-x;
  background-position: left calc(100% - 0.04em);
  padding-bottom: 0.18em;
  opacity: 0.8;
  transition: opacity 160ms ease;
}

.clickable-underline:hover,
.clickable-underline:focus-visible {
  opacity: 1;
}

:deep(.clickable-date-selector > button > span:first-child) {
  text-decoration: none;
  background-image: radial-gradient(circle, currentColor 1px, transparent 1.2px);
  background-size: 6px 2px;
  background-repeat: repeat-x;
  background-position: left calc(100% - 0.04em);
  padding-bottom: 0.18em;
  opacity: 0.8;
  transition: opacity 160ms ease;
}

:deep(.clickable-date-selector > button:hover > span:first-child),
:deep(.clickable-date-selector > button:focus-visible > span:first-child) {
  opacity: 1;
}

.header-info-trigger {
  background-color: inherit;
}

.header-action-button {
  color: var(--theme-text);
}

[data-theme]:not([data-theme='light']) .header-info-trigger {
  background-color: var(--theme-browser-chrome);
}
</style>
