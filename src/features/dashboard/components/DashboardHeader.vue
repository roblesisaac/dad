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

            <!-- Expanded Breadcrumbs (<= 2 items) -->
            <template v-if="breadcrumbSegments.length <= 2">
              <template
                v-for="segment in breadcrumbSegments"
                :key="segment.id"
              >
                <span class="text-black font-black text-xs sm:text-sm flex-shrink-0">/</span>
                
                <span
                  v-if="segment.type === 'current'"
                  class="font-black text-black text-xs sm:text-sm uppercase tracking-[0.2em] truncate"
                >
                  {{ segment.label }}
                </span>
                <button
                  v-else
                  @click="segment.action"
                  class="clickable-underline text-left font-black text-black text-xs sm:text-sm uppercase tracking-[0.2em] truncate hover:opacity-70 transition-opacity focus:outline-none"
                  type="button"
                >
                  {{ segment.label }}
                </button>
              </template>
            </template>

            <!-- Collapsed Breadcrumbs (> 2 items) -->
            <template v-else>
              <span class="text-black font-black text-xs sm:text-sm flex-shrink-0">/</span>
              
              <!-- Dropdown trigger -->
              <div class="relative breadcrumb-dropdown-container" ref="breadcrumbDropdownRef">
                <button
                  @click="toggleBreadcrumbDropdown"
                  class="clickable-underline font-black text-black text-xs sm:text-sm uppercase tracking-[0.2em] flex items-center justify-center hover:opacity-70 transition-opacity focus:outline-none min-w-[20px]"
                  type="button"
                  aria-label="More path levels"
                >
                  ...
                </button>
                
                <!-- Dropdown menu -->
                <div
                  v-if="isBreadcrumbDropdownOpen"
                  class="absolute top-full left-0 mt-3 py-1.5 min-w-[200px] rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-browser-chrome)] shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-50 flex flex-col overflow-hidden"
                >
                  <button
                    v-for="segment in breadcrumbSegments.slice(0, -1)"
                    :key="segment.id"
                    @click="handleDropdownNavigation(segment.action)"
                    class="px-5 py-3 text-left text-[11px] sm:text-xs font-black uppercase tracking-[0.2em] text-[var(--theme-text)] hover:bg-[var(--theme-overlay-5)] focus:bg-[var(--theme-overlay-10)] focus:outline-none transition-colors truncate"
                    type="button"
                  >
                    {{ segment.label }}
                  </button>
                </div>
              </div>
              
              <span class="text-black font-black text-xs sm:text-sm flex-shrink-0">/</span>
              
              <span
                class="font-black text-black text-xs sm:text-sm uppercase tracking-[0.2em] truncate"
              >
                {{ breadcrumbSegments[breadcrumbSegments.length - 1].label }}
              </span>
            </template>
          </nav>

          <div class="flex-shrink-0 flex items-center gap-2" ref="editTabDropdownRef">
            <button
              v-if="showRearrangeAction"
              type="button"
              class="header-action-button px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-opacity hover:opacity-70 focus:outline-none"
              @click="emit('toggle-rearrange')"
            >
              {{ isRearrangeActive ? 'Done' : 'Rearrange' }}
            </button>

            <div v-else-if="showEditTabAction" class="relative">
              <button
                type="button"
                class="header-action-button px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-opacity hover:opacity-70 focus:outline-none flex items-center gap-1"
                @click="toggleEditTabDropdown"
              >
                Edit Tab
                <ChevronDown class="w-3 h-3 transition-transform" :class="isEditTabDropdownOpen ? 'rotate-180' : ''" />
              </button>
              
              <div
                v-if="isEditTabDropdownOpen"
                class="absolute top-full right-0 mt-3 py-1.5 min-w-[160px] rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-browser-chrome)] shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-50 flex flex-col overflow-hidden"
              >
                <button
                  v-for="option in editTabOptions"
                  :key="option.id"
                  @click="handleEditTabOption(option.id)"
                  class="px-5 py-3 text-left text-[11px] sm:text-xs font-black uppercase tracking-[0.2em] text-[var(--theme-text)] hover:bg-[var(--theme-overlay-5)] focus:bg-[var(--theme-overlay-10)] focus:outline-none transition-colors truncate"
                  type="button"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>

            <button
              v-if="showRecategorizeOverrideWarning"
              type="button"
              class="header-action-button inline-flex items-center justify-center p-2 rounded-full text-[#b45309] hover:opacity-70 transition-opacity focus:outline-none"
              :title="recategorizeOverrideWarningLabel"
              @click="emit('edit-tab', 'advanced')"
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
            <div class="flex items-center gap-1">
              <div v-if="showViewNoteActions" ref="headerInfoMenuRef" class="relative">
                <button
                  type="button"
                  class="rounded-full p-1 text-[var(--theme-text-soft)] transition-colors hover:text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-ring)]"
                  aria-label="Helper options"
                  @click="toggleHeaderInfoMenu"
                >
                  <MoreVertical class="h-4 w-4" />
                </button>
                <div
                  v-if="isHeaderInfoMenuOpen"
                  class="absolute right-0 top-full mt-2 min-w-[190px] overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-browser-chrome)] shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
                >
                  <button
                    type="button"
                    class="w-full px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-[var(--theme-text)] transition-colors hover:bg-[var(--theme-overlay-5)] focus:bg-[var(--theme-overlay-10)] focus:outline-none"
                    @click="startHelperBodyEdit"
                  >
                    {{ hasViewNote ? 'Edit Helper Text' : 'Customize Helper Text' }}
                  </button>
                  <button
                    v-if="hasViewNote"
                    type="button"
                    class="w-full px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-[#b91c1c] transition-colors hover:bg-[var(--theme-overlay-5)] focus:bg-[var(--theme-overlay-10)] focus:outline-none"
                    :disabled="isSavingViewNote"
                    @click="removeHelperBodyText"
                  >
                    Use Default Helper
                  </button>
                </div>
              </div>
              <button
                type="button"
                class="rounded-full p-1 text-[var(--theme-text-soft)] transition-colors hover:text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-ring)]"
                aria-label="Close total info"
                @click="closeHeaderInfoModal"
              >
                <X class="h-4 w-4" />
              </button>
            </div>
          </div>
          <div class="space-y-3 px-4 py-4 text-left">
            <template v-if="isEditingHelperBody">
              <p class="text-xs leading-relaxed text-[var(--theme-text-soft)]">
                Edit the helper text body for this specific tab view. Dynamic tokens and arithmetic are supported.
              </p>
              <textarea
                v-model="helperBodyDraft"
                rows="5"
                class="w-full rounded-xl border border-[var(--theme-border)] bg-transparent px-3 py-2 text-sm leading-relaxed text-[var(--theme-text)] placeholder:text-[var(--theme-text-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-ring)]"
                placeholder="Example: Shop subscriptions totaled {{ shop-subscriptions }} in {{ date }}."
              />
              <div class="space-y-1">
                <div class="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--theme-text-soft)]">
                  Available Tokens
                </div>
                <div class="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto rounded-xl border border-[var(--theme-border)] bg-[var(--theme-overlay-5)] p-2">
                  <div
                    v-for="tokenEntry in availableNoteTokenEntries"
                    :key="tokenEntry.token"
                    class="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-browser-chrome)] px-2 py-1 text-[10px] leading-relaxed text-[var(--theme-text)]"
                  >
                    {{ tokenEntry.token }} = {{ tokenEntry.value }}
                  </div>
                </div>
              </div>
              <div class="space-y-1">
                <div class="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--theme-text-soft)]">
                  Preview
                </div>
                <div class="min-h-[52px] rounded-xl border border-[var(--theme-border)] bg-[var(--theme-overlay-5)] px-3 py-2 text-sm leading-relaxed text-[var(--theme-text)]" style="white-space: pre-wrap;">
                  {{ renderedHelperBodyDraft || 'No helper text yet.' }}
                </div>
              </div>
              <div class="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  class="rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--theme-text)] transition-opacity hover:opacity-70 focus:outline-none focus:ring-2 focus:ring-[var(--theme-ring)]"
                  :disabled="isSavingViewNote"
                  @click="cancelHelperBodyEdit"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  class="rounded-xl bg-[var(--theme-text)] px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--theme-bg)] transition-opacity hover:opacity-70 focus:outline-none focus:ring-2 focus:ring-[var(--theme-ring)]"
                  :disabled="isSavingViewNote"
                  @click="saveHelperBodyText"
                >
                  {{ isSavingViewNote ? 'Saving' : 'Save' }}
                </button>
              </div>
            </template>
            <template v-else>
              <p class="text-sm leading-relaxed text-[var(--theme-text)]">
                {{ helperBodyDisplay }}
              </p>
              <ul v-if="!hasViewNote && headerInfo.details" class="space-y-1.5">
                <li
                  v-for="detail in headerInfo.details"
                  :key="detail"
                  class="text-xs leading-relaxed text-[var(--theme-text-soft)]"
                >
                  {{ detail }}
                </li>
              </ul>
            </template>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { format, isSameYear, isValid, parseISO, startOfMonth, startOfYear } from 'date-fns';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import { useUtils } from '@/shared/composables/useUtils';
import { AlertTriangle, Home, Info, X, ChevronDown, MoreVertical } from 'lucide-vue-next';
import SelectDate from '@/features/select-date/views/SelectDate.vue';
import {
  buildDynamicNoteTokens,
  renderTemplateWithTokens
} from '@/features/dashboard/utils/noteTemplate.js';

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
  drillGroups: {
    type: Array,
    default: () => []
  },
  viewNoteTemplate: {
    type: String,
    default: ''
  },
  isSavingViewNote: {
    type: Boolean,
    default: false
  },
  drillTabTotal: {
    type: Number,
    default: 0
  },
  drillLevelTotal: {
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
  'edit-tab',
  'save-view-note',
  'remove-view-note'
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
const drillGroups = computed(() => (Array.isArray(props.drillGroups) ? props.drillGroups : []));
const viewNoteTemplate = computed(() => String(props.viewNoteTemplate || ''));
const isSavingViewNote = computed(() => props.isSavingViewNote);
const showViewNoteActions = computed(() => (
  isDrillView.value
  && Boolean(state.selected.tab)
));
const hasViewNote = computed(() => Boolean(viewNoteTemplate.value.trim()));
const isHeaderInfoMenuOpen = ref(false);
const headerInfoMenuRef = ref(null);
const isEditingHelperBody = ref(false);
const helperBodyDraft = ref('');

const noteTokens = computed(() => buildDynamicNoteTokens({
  selectedTabLabel: selectedTabLabel.value,
  selectedGroupLabel: selectedGroupLabel.value,
  selectedDrillLabel: selectedDrillLabel.value,
  dateLabel: activeDateRangeLabel.value,
  totalLabel: formatPrice(headerTotal.value, { toFixed: 0 }),
  drillGroups: drillGroups.value,
  formatAmount: (amount) => formatPrice(amount, { toFixed: 0 })
}));

const availableNoteTokenEntries = computed(() => {
  const orderedStaticTokens = ['selected-tab', 'selected-account', 'selected-level', 'date', 'total'];
  const tokenKeys = Object.keys(noteTokens.value);
  const dynamicKeys = tokenKeys
    .filter(token => !orderedStaticTokens.includes(token))
    .sort((a, b) => a.localeCompare(b));
  const orderedKeys = [
    ...orderedStaticTokens.filter(token => tokenKeys.includes(token)),
    ...dynamicKeys
  ];

  return orderedKeys.map(token => ({
    token: `{{ ${token} }}`,
    value: noteTokens.value[token]
  }));
});

function renderNoteTemplate(template) {
  return renderTemplateWithTokens(template, noteTokens.value, {
    formatExpressionResult: (value) => formatPrice(value, { toFixed: 0 })
  });
}

const renderedViewNote = computed(() => renderNoteTemplate(viewNoteTemplate.value));
const renderedHelperBodyDraft = computed(() => renderNoteTemplate(helperBodyDraft.value));
const helperBodyDisplay = computed(() => (
  hasViewNote.value
    ? renderedViewNote.value
    : headerInfo.value.summary
));

const isBreadcrumbDropdownOpen = ref(false);
const breadcrumbDropdownRef = ref(null);

const isEditTabDropdownOpen = ref(false);
const editTabDropdownRef = ref(null);

const editTabOptions = [
  { id: 'groupBy', label: 'Group By' },
  { id: 'sort', label: 'Sort' },
  { id: 'categorize', label: 'Categorize' },
  { id: 'filter', label: 'Filter' },
  { id: 'custom', label: 'Custom' }
];

function toggleEditTabDropdown() {
  isEditTabDropdownOpen.value = !isEditTabDropdownOpen.value;
}

function closeEditTabDropdown() {
  isEditTabDropdownOpen.value = false;
}

function handleEditTabOption(sectionId) {
  emit('edit-tab', sectionId);
  closeEditTabDropdown();
}

function toggleBreadcrumbDropdown() {
  isBreadcrumbDropdownOpen.value = !isBreadcrumbDropdownOpen.value;
}

function closeBreadcrumbDropdown() {
  isBreadcrumbDropdownOpen.value = false;
}

function handleDropdownNavigation(action) {
  if (action) action();
  closeBreadcrumbDropdown();
}

function handleGroupSegmentNavigation() {
  if (isDrillView.value && shouldCondenseSingleTabBreadcrumb.value) {
    emit('navigate-category');
    return;
  }

  emit('navigate-tab');
}

function toggleHeaderInfoMenu() {
  if (!showViewNoteActions.value) {
    return;
  }

  isHeaderInfoMenuOpen.value = !isHeaderInfoMenuOpen.value;
}

function closeHeaderInfoMenu() {
  isHeaderInfoMenuOpen.value = false;
}

function startHelperBodyEdit() {
  helperBodyDraft.value = hasViewNote.value
    ? viewNoteTemplate.value
    : headerInfo.value.summary;
  isEditingHelperBody.value = true;
  closeHeaderInfoMenu();
}

function cancelHelperBodyEdit() {
  isEditingHelperBody.value = false;
  helperBodyDraft.value = viewNoteTemplate.value;
}

function saveHelperBodyText() {
  if (isSavingViewNote.value) {
    return;
  }

  emit('save-view-note', helperBodyDraft.value);
  isEditingHelperBody.value = false;
  closeHeaderInfoMenu();
}

function removeHelperBodyText() {
  if (isSavingViewNote.value) {
    return;
  }

  emit('remove-view-note');
  isEditingHelperBody.value = false;
  closeHeaderInfoMenu();
}

watch(
  () => viewNoteTemplate.value,
  (nextTemplate) => {
    if (!isEditingHelperBody.value) {
      helperBodyDraft.value = nextTemplate;
    }
  },
  { immediate: true }
);

watch(
  () => showViewNoteActions.value,
  (canShowNotes) => {
    if (!canShowNotes) {
      closeHeaderInfoMenu();
      isEditingHelperBody.value = false;
    }
  }
);

watch(
  () => isHeaderInfoModalOpen.value,
  (isOpen) => {
    if (isOpen) {
      helperBodyDraft.value = hasViewNote.value
        ? viewNoteTemplate.value
        : headerInfo.value.summary;
      return;
    }

    closeHeaderInfoMenu();
    isEditingHelperBody.value = false;
  }
);

const breadcrumbSegments = computed(() => {
  const segments = [];

  if (!isGroupSelectorView.value && !isTransactionSearchView.value) {
    const isSingleTabDrillRoot = isDrillView.value
      && shouldCondenseSingleTabBreadcrumb.value
      && drillBreadcrumbs.value.length === 0;

    segments.push({
      id: 'account',
      type: (isTabSelectorView.value || isSingleTabDrillRoot) ? 'current' : 'link',
      label: selectedGroupLabel.value,
      action: () => handleGroupSegmentNavigation()
    });
  }

  if (isDrillView.value && !shouldCondenseSingleTabBreadcrumb.value) {
    segments.push({
      id: 'tab',
      type: drillBreadcrumbs.value.length === 0 ? 'current' : 'link',
      label: selectedTabLabel.value,
      action: () => emit('navigate-category')
    });
  }

  drillBreadcrumbs.value.forEach((segment, index) => {
    segments.push({
      id: `drill-${index}-${segment.key}`,
      type: index === drillBreadcrumbs.value.length - 1 ? 'current' : 'link',
      label: segment.label,
      action: () => emit('navigate-drill-depth', index + 1)
    });
  });

  if (isTransactionSearchView.value) {
    segments.push({
      id: 'transaction-search',
      type: 'current',
      label: 'Transactions'
    });
  }

  return segments;
});

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
  const levelTotal = Number(props.drillLevelTotal);
  if (Number.isFinite(levelTotal)) {
    return levelTotal;
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

  if (isDrillView.value) {
    const hasDrillBreadcrumb = drillBreadcrumbs.value.length > 0;
    if (hasDrillBreadcrumb) {
      return {
        title: 'Drill Level Total',
        summary: `This is the total for ${selectedDrillLabel.value} in ${selectedTabLabel.value} in ${selectedGroupLabel.value} for ${activeDateRangeLabel.value}.`
      };
    }

    return {
      title: 'Tab Total',
      summary: `This is the total for ${selectedTabLabel.value} in ${selectedGroupLabel.value} for ${activeDateRangeLabel.value}.`
    };
  }

  return {
    title: 'Tab Total',
    summary: `This is the total for ${selectedTabLabel.value} in ${selectedGroupLabel.value} for ${activeDateRangeLabel.value}.`
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
  isEditingHelperBody.value = false;
  closeHeaderInfoMenu();
  isHeaderInfoModalOpen.value = true;
}

function closeHeaderInfoModal() {
  closeHeaderInfoMenu();
  isEditingHelperBody.value = false;
  isHeaderInfoModalOpen.value = false;
}

function onWindowKeydown(event) {
  if (event.key === 'Escape') {
    if (isHeaderInfoModalOpen.value) {
      closeHeaderInfoModal();
    }
    if (isBreadcrumbDropdownOpen.value) {
      closeBreadcrumbDropdown();
    }
    if (isEditTabDropdownOpen.value) {
      closeEditTabDropdown();
    }
    if (isHeaderInfoMenuOpen.value) {
      closeHeaderInfoMenu();
    }
  }
}

function onWindowClick(event) {
  if (isBreadcrumbDropdownOpen.value && breadcrumbDropdownRef.value && !breadcrumbDropdownRef.value.contains(event.target)) {
    closeBreadcrumbDropdown();
  }
  if (isEditTabDropdownOpen.value && editTabDropdownRef.value && !editTabDropdownRef.value.contains(event.target)) {
    closeEditTabDropdown();
  }
  if (isHeaderInfoMenuOpen.value && headerInfoMenuRef.value && !headerInfoMenuRef.value.contains(event.target)) {
    closeHeaderInfoMenu();
  }
}

onMounted(() => {
  window.addEventListener('keydown', onWindowKeydown);
  window.addEventListener('click', onWindowClick, { capture: true });
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onWindowKeydown);
  window.removeEventListener('click', onWindowClick, { capture: true });
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
