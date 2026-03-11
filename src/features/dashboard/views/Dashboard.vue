<template>
  <div class="min-h-screen bg-white pull-refresh-root">
    <div
      class="pull-refresh-indicator"
      :style="pullToRefreshIndicatorStyle"
      aria-live="polite"
    >
      <Loader2
        v-if="isPullRefreshing"
        class="w-4 h-4 text-black animate-spin"
      />
      <ChevronDown
        v-else
        class="w-4 h-4 text-black transition-transform duration-150"
        :class="{ 'rotate-180': isPullReady }"
      />
      <span class="pull-refresh-label">{{ pullToRefreshLabel }}</span>
    </div>

    <BlueBar />

    <div class="max-w-5xl mx-auto w-full relative">
      <div>
        <DashboardHeader
          :view="dashboardView"
          :is-rearrange-active="isRearrangeModeActive"
          :drill-breadcrumbs="drillState.breadcrumbs"
          :drill-groups="drillState.groups"
          :drill-transaction-count="drillState.transactions.length"
          :drill-tab-total="drillState.tabTotal"
          :drill-level-total="drillState.currentLevelTotal"
          :is-drill-leaf="drillState.isLeaf"
          :overridden-recategorize-count="drillState.overriddenRecategorizeCount"
          :is-honoring-recategorize-as="drillState.honorRecategorizeAs"
          :has-recategorize-behavior-decision="drillState.hasRecategorizeBehaviorDecision"
          :view-note-template="selectedTabViewNoteTemplate"
          :view-note-show-in-main-view="selectedTabViewNoteShowInMainView"
          :is-saving-view-note="isSavingViewNote"
          :can-copy-current-rows="canCopyCurrentRows"
          :home-switcher-options="homeSwitcherOptions"
          @navigate-group="openGroupSelector"
          @home-switcher-select="handleHomeSwitcherSelect"
          @navigate-tab="openTabSelector"
          @navigate-category="openDrillRoot"
          @navigate-drill-depth="handleNavigateDrillDepth"
          @toggle-rearrange="toggleRearrangeMode"
          @edit-tab="openTabEditor"
          @save-view-note="handleSaveViewNote"
          @remove-view-note="handleRemoveViewNote"
          @copy-current-rows="handleCopyCurrentRows"
          @open-export-rows-modal="openExportRowsModal"
        />
      </div>

      <div
        class="mt-4 px-4 "
        :class="showSelectorView ? 'pb-12 sm:pb-16 sm:px-6' : 'pb-32'"
      >
        <Transition name="fade">
          <div v-if="state.isLoading && !isGroupSelectorView && !isTransactionSearchView && !state.isOnboarding" class="w-full flex justify-center py-20">
            <LoadingDots />
          </div>
        </Transition>

        <Transition name="fade">
          <div v-if="!state.isLoading && state.isOnboarding" class="w-full">
            <OnboardingView @complete="handleOnboardingComplete" />
          </div>
        </Transition>

        <Transition name="fade">
          <div v-if="!state.isLoading && !state.isOnboarding && isGroupSelectorView" class="w-full">
            <SelectGroup
              variant="dashboard"
              :is-open="true"
              :rearrange-active="isRearrangeModeActive"
              @group-selected="handleGroupSelected"
            />

            <!-- <button
              @click="router.push('/reports')"
              class="w-full text-left py-6 flex items-center justify-between transition-colors"
              type="button"
            >
              <span class="text-base font-black uppercase tracking-tight text-[var(--theme-text)]">
                Reports
              </span>
              <ChevronRight class="w-4 h-4 text-[var(--theme-text-soft)]" />
            </button> -->
          </div>
        </Transition>

        <Transition name="fade">
          <div v-if="!state.isLoading && !state.isOnboarding && isTabSelectorView" class="w-full">
            <AllTabs
              variant="dashboard"
              :rearrange-active="isRearrangeModeActive"
              @tab-selected="handleTabSelected"
            />
          </div>
        </Transition>

        <Transition name="fade">
          <div v-if="!state.isLoading && !state.isOnboarding && isDrillView" class="w-full">
            <DrillExplorer
              :groups="drillState.groups"
              :transactions="drillState.transactions"
              :hidden-items="drillState.hiddenItems"
              :is-leaf="drillState.isLeaf"
              :group-by-mode="drillState.groupByMode"
              :sort-property="drillState.sortProperty"
              :sort-direction="drillState.sortDirection"
              @group-selected="handleDrillGroupSelected"
            />
          </div>
        </Transition>

        <Transition name="fade">
          <div v-if="!state.isLoading && !state.isOnboarding && isTransactionSearchView" class="w-full">
            <TransactionSearchView />
          </div>
        </Transition>
      </div>
      <!-- Footer (removed bg-white/90)▊ -->
      <footer
        v-if="!state.isLoading && shouldShowFooter"
        class="fixed bottom-0 left-0 right-0 z-20 backdrop-blur-md themed-footer-border rounded-t-xl py-4"
      >
        <div class="max-w-5xl mx-auto w-full px-6 py-2 grid grid-cols-3 items-center">
          <div class="flex justify-start">
            <button
              class="group focus:outline-none inline-flex items-center gap-1.5 hover:opacity-70 transition-opacity"
              type="button"
              aria-label="Transactions"
              @click="openTransactionSearch"
            >
              <span class="text-xs sm:text-sm font-black text-black uppercase tracking-[0.2em]">
                Transactions
              </span>
            </button>
          </div>

          <!-- Route to /reports -->
          <div class="flex justify-center">
            <button @click="router.push('/reports')"
              class="group focus:outline-none inline-flex items-center gap-1.5 hover:opacity-70 transition-opacity"
              type="button"
            >
              <span class="text-xs sm:text-sm font-black text-black uppercase tracking-[0.2em]">
                Reports
              </span>
            </button>
          </div>

          <div class="flex justify-end items-center gap-6">
            <button
              @click="isAccountModalOpen = true"
              class="group focus:outline-none flex items-center gap-1.5 hover:opacity-70 transition-opacity"
              type="button"
            >
              <span class="text-xs sm:text-sm font-black text-black uppercase tracking-[0.2em]">
                Account
              </span>
            </button>
          </div>
        </div>
      </footer>

      <RuleManagerModal
        :is-open="showRuleManagerModal"
        :initial-section="targetTabEditorSection"
        :open-custom-rule-editor="openCustomRuleEditor"
        @close="handleRuleManagerClose"
      />

      <AccountModal
        :is-open="isAccountModalOpen"
        @close="isAccountModalOpen = false"
      />

      <Teleport to="body">
        <div
          v-if="isExportRowsModalOpen"
          class="fixed inset-0 z-50 flex items-center justify-center bg-[var(--theme-overlay-30)] backdrop-blur-md px-4 py-4"
          @click.self="closeExportRowsModal"
        >
          <div
            class="w-full max-w-sm rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-browser-chrome)] shadow-[0_20px_60px_-24px_var(--theme-overlay-50)]"
            role="dialog"
            aria-modal="true"
            aria-label="Export rows"
          >
            <div class="flex items-center justify-between gap-4 border-b border-[var(--theme-border)] px-4 py-3">
              <h3 class="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--theme-text)]">
                Export Rows
              </h3>
              <button
                type="button"
                class="rounded-full p-1 text-[var(--theme-text-soft)] transition-colors hover:text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-ring)]"
                aria-label="Close export rows modal"
                @click="closeExportRowsModal"
              >
                <X class="h-4 w-4" />
              </button>
            </div>

            <div class="space-y-3 px-4 py-4">
              <label class="block text-[10px] font-black uppercase tracking-[0.2em] text-[var(--theme-text-soft)]" for="rows-export-filename">
                Filename
              </label>
              <input
                id="rows-export-filename"
                v-model="exportRowsFilenameDraft"
                type="text"
                class="w-full rounded-xl border border-[var(--theme-border)] bg-transparent px-3 py-2 text-sm text-[var(--theme-text)] placeholder:text-[var(--theme-text-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-ring)]"
                placeholder="rows-2026-03-11"
              />

              <div class="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--theme-text-soft)]">
                Export Format
              </div>
              <div class="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  class="rounded-xl border border-[var(--theme-border)] px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--theme-text)] transition-colors hover:bg-[var(--theme-overlay-5)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-ring)]"
                  @click="handleExportRowsAs('json')"
                >
                  JSON
                </button>
                <button
                  type="button"
                  class="rounded-xl border border-[var(--theme-border)] px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--theme-text)] transition-colors hover:bg-[var(--theme-overlay-5)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-ring)]"
                  @click="handleExportRowsAs('markdown')"
                >
                  Markdown
                </button>
                <button
                  type="button"
                  class="rounded-xl border border-[var(--theme-border)] px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--theme-text)] transition-colors hover:bg-[var(--theme-overlay-5)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-ring)]"
                  @click="handleExportRowsAs('csv')"
                >
                  CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      </Teleport>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.pull-refresh-root {
  overscroll-behavior-y: contain;
}

.pull-refresh-indicator {
  position: fixed;
  top: 0;
  left: 50%;
  z-index: 60;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  pointer-events: none;
  padding: 0.45rem 0.7rem;
  border-radius: 999px;
  border: 1px solid rgba(17, 24, 39, 0.08);
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 10px 24px rgba(17, 24, 39, 0.14);
  backdrop-filter: blur(8px);
  transition: transform 140ms ease, opacity 140ms ease;
}

.pull-refresh-label {
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: #111827;
  white-space: nowrap;
}

.themed-footer-border {
  border-top: 1px solid var(--theme-footer-border);
}
</style>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { isValid, parseISO } from 'date-fns';
import { useRoute, useRouter } from 'vue-router';
import { useDashboardState } from '../composables/useDashboardState.js';
import { useInit } from '../composables/useInit.js';
import { useSelectGroup } from '@/features/select-group/composables/useSelectGroup.js';
import { useTabs } from '@/features/tabs/composables/useTabs.js';
import { useTabProcessing } from '@/features/tabs/composables/useTabProcessing.js';
import {
  ALL_ACCOUNTS_GROUP_ID,
  ALL_ACCOUNTS_HIDDEN_GROUP_ID
} from '@/features/dashboard/constants/groups.js';
import { resolveDrillState } from '@/features/tabs/utils/drillEvaluator.js';
import { decodeDrillPath, encodeDrillPath, sameDrillPath } from '@/features/dashboard/utils/drillPathQuery.js';
import { resolveSingleTabAutoSelectTarget } from '@/features/dashboard/utils/singleTabAutoSelect.js';
import {
  buildTabViewNoteScopeKey,
  normalizeTabNotesByView,
  normalizeTabViewNoteShowInMainView,
  normalizeTabViewNoteTemplate,
  resolveTabViewNoteShowInMainView,
  resolveTabViewNoteTemplate
} from '@/features/tabs/utils/tabNotes.js';
import { useRemoteSync } from '@/shared/composables/useRemoteSync.js';
import { usePullToRefresh } from '@/shared/composables/usePullToRefresh.js';
import { ChevronDown, Loader2, X } from 'lucide-vue-next';

import BlueBar from '../components/BlueBar.vue';
import LoadingDots from '@/shared/components/LoadingDots.vue';
import DrillExplorer from '../components/DrillExplorer.vue';
import TransactionSearchView from '../components/TransactionSearchView.vue';
import DashboardHeader from '../components/DashboardHeader.vue';
import SelectGroup from '@/features/select-group/views/SelectGroup.vue';
import AllTabs from '@/features/tabs/components/AllTabs.vue';
import RuleManagerModal from '@/features/rule-manager/components/RuleManagerModal.vue';
import AccountModal from '@/shared/components/AccountModal.vue';
import OnboardingView from '@/features/onboarding/views/OnboardingView.vue';

const router = useRouter();
const route = useRoute();
const { state } = useDashboardState();
const { init } = useInit();
const { selectGroup, handleGroupChange, getAccountContextGroup } = useSelectGroup();
const { selectTab, ensureDefaultTabsForTabView, setTabNotesByView } = useTabs();
const { processAllTabsForSelectedGroup } = useTabProcessing();

const showRuleManagerModal = ref(false);
const targetTabEditorSection = ref(null);
const openCustomRuleEditor = ref(false);
const isAccountModalOpen = ref(false);
const isRearrangeModeActive = ref(false);
const dashboardView = ref('group');
const isGroupSelectorView = computed(() => dashboardView.value === 'group');
const isTabSelectorView = computed(() => dashboardView.value === 'tab');
const isDrillView = computed(() => dashboardView.value === 'drill');
const isTransactionSearchView = computed(() => dashboardView.value === 'transaction-search');
const showSelectorView = computed(() => isGroupSelectorView.value || isTabSelectorView.value);
const shouldShowFooter = computed(() => (
  state.isOnboarding ||
  isGroupSelectorView.value ||
  isTabSelectorView.value ||
  isDrillView.value ||
  isTransactionSearchView.value
));

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DASHBOARD_VIEW_QUERY_KEY = 'dashboardView';
const DRILL_PATH_QUERY_KEY = 'drillPath';
const PREFERRED_GROUP_STORAGE_KEY = 'tracktabs.preferred-group-id';
const DASHBOARD_VIEWS = ['group', 'tab', 'drill', 'transaction-search'];
const DASHBOARD_VIEW_SET = new Set(DASHBOARD_VIEWS);
const HOME_SWITCHER_HOME_KIND = 'home';
const HOME_SWITCHER_GROUP_KIND = 'group';
const HOME_SWITCHER_ACCOUNT_KIND = 'account';
const isSyncingDashboardRouteQuery = ref(false);
const isApplyingRemoteDashboardSync = ref(false);
const isHandlingHistoryPopNavigation = ref(false);
const historyPopDirection = ref('');
const lastKnownHistoryPosition = ref(getHistoryPosition());
const pendingSingleTabSelection = ref(null);
const tabEditorSnapshot = ref({ tabId: '', fingerprint: '' });
const isSavingViewNote = ref(false);
const isExportRowsModalOpen = ref(false);
const exportRowsFilenameDraft = ref('');
const EMPTY_DRILL_STATE = Object.freeze({
  tabTotal: 0,
  currentLevelTotal: 0,
  depth: 0,
  validPath: [],
  breadcrumbs: [],
  groups: [],
  transactions: [],
  hiddenItems: [],
  groupByMode: 'none',
  sortProperty: 'date',
  sortDirection: 'desc',
  isLeaf: true,
  overriddenRecategorizeCount: 0,
  honorRecategorizeAs: false,
  hasRecategorizeBehaviorDecision: false,
  recategorizeBehaviorDecision: ''
});
const shouldComputeDrillState = computed(() => (
  Boolean(state.selected.tab) && (isDrillView.value || showRuleManagerModal.value)
));
const drillState = computed(() => {
  if (!shouldComputeDrillState.value) {
    return EMPTY_DRILL_STATE;
  }

  return resolveDrillState({
    tab: state.selected.tab,
    transactions: state.selected.allGroupTransactions,
    allRules: state.allUserRules,
    drillPath: state.selected.drillPath
  });
});
const copyableDrillRows = computed(() => {
  if (!isDrillView.value) {
    return [];
  }

  if (drillState.value.isLeaf) {
    return drillState.value.transactions.map((transaction) => {
      const date = String(transaction?.authorized_date || transaction?.date || '').trim();
      const row = {
        title: String(transaction?.name || '').trim(),
        amount: normalizeCopyRowTotal(transaction?.amount)
      };

      if (date) {
        row.date = date;
      }

      return row;
    });
  }

  return drillState.value.groups.map((group) => {
    const date = resolveCopyGroupDate(group);
    const row = {
      title: String(group?.label || '').trim(),
      amount: normalizeCopyRowTotal(group?.total)
    };

    if (date) {
      row.date = date;
    }

    return row;
  });
});
const canCopyCurrentRows = computed(() => copyableDrillRows.value.length > 0);

const {
  isRefreshing: isPullRefreshing,
  isReady: isPullReady,
  label: pullToRefreshLabel,
  indicatorStyle: pullToRefreshIndicatorStyle
} = usePullToRefresh({
  onRefresh: async () => {
    await applyRemoteDashboardSyncRefresh({ runPlaidSync: false });
  },
  canStart: () => !state.isLoading && !showRuleManagerModal.value && !isAccountModalOpen.value && !state.isOnboarding
});

async function handleOnboardingComplete() {
  state.isOnboarding = false;
  state.isLoading = true;
  await init({ prioritizeFirstPaint: true, runPlaidSync: false });
}

function resetDrillSelection() {
  state.selected.drillPath = [];
  state.selected.transaction = false;
}

function normalizeSelectionGroupId(group) {
  if (!group) {
    return '';
  }

  if (group?.isVirtualAllAccounts || group?._id === ALL_ACCOUNTS_GROUP_ID) {
    return ALL_ACCOUNTS_GROUP_ID;
  }

  return String(group?._id || '').trim();
}

const selectedTabViewNoteScopeKey = computed(() => {
  const normalizedGroupId = normalizeSelectionGroupId(state.selected.group);
  if (!normalizedGroupId) {
    return '';
  }

  return buildTabViewNoteScopeKey({
    groupId: normalizedGroupId,
    drillPath: state.selected.drillPath
  });
});

const selectedTabViewNoteTemplate = computed(() => {
  const selectedTab = state.selected.tab;
  const scopeKey = selectedTabViewNoteScopeKey.value;
  if (!selectedTab || !scopeKey) {
    return '';
  }

  return resolveTabViewNoteTemplate(selectedTab, scopeKey);
});

const selectedTabViewNoteShowInMainView = computed(() => {
  const selectedTab = state.selected.tab;
  const scopeKey = selectedTabViewNoteScopeKey.value;
  if (!selectedTab || !scopeKey) {
    return false;
  }

  return resolveTabViewNoteShowInMainView(selectedTab, scopeKey);
});

function readPreferredGroupIdFromStorage() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return '';
  }

  try {
    return String(window.localStorage.getItem(PREFERRED_GROUP_STORAGE_KEY) || '').trim();
  } catch (_error) {
    return '';
  }
}

function writePreferredGroupIdToStorage(group) {
  const preferredGroupId = normalizeSelectionGroupId(group);
  if (!preferredGroupId || typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.setItem(PREFERRED_GROUP_STORAGE_KEY, preferredGroupId);
  } catch (_error) {
    // Ignore storage write failures.
  }
}

function selectionAccountIdentifiers(account) {
  if (!account) {
    return [];
  }

  return [
    account._id,
    account.account_id,
    account.id,
    account.accountId
  ]
    .map(identifier => String(identifier || '').trim())
    .filter(Boolean);
}

function selectionAccountsMatch(accountA, accountB) {
  const accountAIds = selectionAccountIdentifiers(accountA);
  const accountBIdSet = new Set(selectionAccountIdentifiers(accountB));
  return accountAIds.some(accountId => accountBIdSet.has(accountId));
}

function normalizeHomeSwitcherAccountId(account) {
  return selectionAccountIdentifiers(account)[0] || '';
}

function formatHomeSwitcherAccountLabel(account) {
  const baseName = String(account?.name || account?.official_name || account?.subtype || 'Unnamed Account').trim();
  const mask = String(account?.mask || '').trim();
  if (!mask) {
    return baseName;
  }

  return `${baseName} •••${mask}`;
}

function formatHomeSwitcherGroupLabel(group) {
  return String(group?.name || 'Unnamed Group').trim() || 'Unnamed Group';
}

function groupContainsAccount(group, account) {
  const groupAccounts = Array.isArray(group?.accounts) ? group.accounts : [];
  return groupAccounts.some(groupAccount => selectionAccountsMatch(groupAccount, account));
}

function resolveFallbackGroupForAccount(account) {
  if (!account) {
    return null;
  }

  const accountContextGroup = state.allUserGroups.find((group) => (
    group?.isLabel === false
    && groupContainsAccount(group, account)
  ));
  if (accountContextGroup) {
    return accountContextGroup;
  }

  return state.allUserGroups.find(group => groupContainsAccount(group, account)) || null;
}

function resolveAccountFromHomeSwitcherOption(option = {}) {
  const requestedAccountId = String(option?.accountId || '').trim();
  if (!requestedAccountId) {
    return null;
  }

  return state.allUserAccounts.find((account) => (
    selectionAccountIdentifiers(account).includes(requestedAccountId)
  )) || null;
}

function resolveTargetGroupForHomeSwitcherOption(option = {}) {
  const optionKind = String(option?.kind || '').trim().toLowerCase();
  if (optionKind === HOME_SWITCHER_GROUP_KIND) {
    const groupId = String(option?.groupId || '').trim();
    if (!groupId) {
      return null;
    }

    return state.allUserGroups.find(group => String(group?._id || '').trim() === groupId) || null;
  }

  if (optionKind !== HOME_SWITCHER_ACCOUNT_KIND) {
    return null;
  }

  const account = resolveAccountFromHomeSwitcherOption(option);
  if (!account) {
    return null;
  }

  return getAccountContextGroup(account)
    || resolveFallbackGroupForAccount(account)
    || null;
}

const homeSwitcherOptions = computed(() => {
  const selectedGroupId = normalizeSelectionGroupId(state.selected.group);

  const accountOptions = state.allUserAccounts
    .map((account) => {
      const accountId = normalizeHomeSwitcherAccountId(account);
      if (!accountId) {
        return null;
      }

      const targetGroup = getAccountContextGroup(account)
        || resolveFallbackGroupForAccount(account);
      const targetGroupId = normalizeSelectionGroupId(targetGroup);

      return {
        id: `account:${accountId}`,
        kind: HOME_SWITCHER_ACCOUNT_KIND,
        label: formatHomeSwitcherAccountLabel(account),
        caption: 'Account',
        accountId,
        groupId: targetGroupId,
        isCurrent: Boolean(targetGroupId && targetGroupId === selectedGroupId)
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.label.localeCompare(b.label));

  const groupOptions = state.allUserGroups
    .map((group) => {
      const groupId = normalizeSelectionGroupId(group);
      if (!groupId) {
        return null;
      }

      return {
        id: `group:${groupId}`,
        kind: HOME_SWITCHER_GROUP_KIND,
        label: formatHomeSwitcherGroupLabel(group),
        caption: 'Group',
        groupId,
        isCurrent: groupId === selectedGroupId
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.label.localeCompare(b.label));

  return [{
    id: 'home:go',
    kind: HOME_SWITCHER_HOME_KIND,
    label: 'Go Home',
    caption: 'Home',
    isCurrent: isGroupSelectorView.value
  }, ...accountOptions, ...groupOptions];
});

function tabsEnabledForGroup(group) {
  const targetGroupId = normalizeSelectionGroupId(group);
  if (!targetGroupId) {
    return [];
  }

  const isAllAccountsGroup = targetGroupId === ALL_ACCOUNTS_GROUP_ID;

  return state.allUserTabs.filter((tab) => {
    const showForGroup = Array.isArray(tab?.showForGroup) ? tab.showForGroup : [];

    if (isAllAccountsGroup) {
      return !showForGroup.includes(ALL_ACCOUNTS_HIDDEN_GROUP_ID);
    }

    return showForGroup.includes(targetGroupId) || showForGroup.includes('_GLOBAL');
  });
}

function queryValue(key) {
  const value = route.query[key];
  return typeof value === 'string' ? value : '';
}

function normalizeDashboardView(view) {
  return DASHBOARD_VIEW_SET.has(view) ? view : '';
}

function queryDrillPath() {
  return decodeDrillPath(queryValue(DRILL_PATH_QUERY_KEY));
}

function getHistoryPosition() {
  if (typeof window === 'undefined' || !window.history) {
    return null;
  }

  const rawPosition = Number(window.history.state?.position);
  return Number.isFinite(rawPosition) ? rawPosition : null;
}

function defaultDashboardView() {
  if (state.selected.tab) {
    return 'drill';
  }

  return 'group';
}

function resolveDashboardViewForState(view) {
  if (view === 'tab') {
    return state.selected.group ? 'tab' : 'group';
  }

  if (view === 'drill') {
    if (!state.selected.tab) {
      return state.selected.group ? 'tab' : 'group';
    }
    return 'drill';
  }

  return view;
}

function shouldResetDrillPathForView(view) {
  return view === 'group' || view === 'tab' || view === 'transaction-search';
}

function dashboardQueryForView(view) {
  const nextQuery = { ...route.query };

  if (view === 'group') {
    delete nextQuery[DASHBOARD_VIEW_QUERY_KEY];
    delete nextQuery[DRILL_PATH_QUERY_KEY];
  } else {
    nextQuery[DASHBOARD_VIEW_QUERY_KEY] = view;
  }

  if (view === 'drill') {
    const encodedPath = encodeDrillPath(state.selected.drillPath);
    if (encodedPath) {
      nextQuery[DRILL_PATH_QUERY_KEY] = encodedPath;
    } else {
      delete nextQuery[DRILL_PATH_QUERY_KEY];
    }
  } else {
    delete nextQuery[DRILL_PATH_QUERY_KEY];
  }

  return Object.keys(nextQuery).length ? nextQuery : undefined;
}

async function syncDashboardViewQuery(view, historyMode = 'push') {
  const normalizedQueryValue = view === 'group' ? '' : view;
  const encodedDrillPath = view === 'drill' ? encodeDrillPath(state.selected.drillPath) : '';
  const currentDrillPath = queryValue(DRILL_PATH_QUERY_KEY);
  const currentView = queryValue(DASHBOARD_VIEW_QUERY_KEY);
  if (currentView === normalizedQueryValue && currentDrillPath === encodedDrillPath) {
    return;
  }

  isSyncingDashboardRouteQuery.value = true;

  try {
    const routeTarget = {
      name: 'dashboard',
      query: dashboardQueryForView(view)
    };

    if (historyMode === 'replace') {
      await router.replace(routeTarget);
      return;
    }

    await router.push(routeTarget);
  } finally {
    isSyncingDashboardRouteQuery.value = false;
  }
}

function setDashboardView(view, options = {}) {
  const {
    syncRoute = false,
    historyMode = 'push'
  } = options;
  const normalized = normalizeDashboardView(view) || 'group';
  const resolvedView = resolveDashboardViewForState(normalized);

  if (shouldResetDrillPathForView(resolvedView)) {
    resetDrillSelection();
  }

  dashboardView.value = resolvedView;

  if (syncRoute) {
    void syncDashboardViewQuery(resolvedView, historyMode);
  }

  return resolvedView;
}

function resolveParentBreadcrumbTarget() {
  if (isDrillView.value) {
    const currentPath = Array.isArray(state.selected.drillPath) ? state.selected.drillPath : [];
    if (currentPath.length > 0) {
      return {
        view: 'drill',
        drillPath: currentPath.slice(0, -1)
      };
    }

    const shouldCondenseSingleTabBreadcrumb = state.selected.tabsForGroup.length === 1;
    if (shouldCondenseSingleTabBreadcrumb) {
      return {
        view: 'group',
        drillPath: []
      };
    }

    return {
      view: state.selected.group ? 'tab' : 'group',
      drillPath: []
    };
  }

  if (isTabSelectorView.value || isTransactionSearchView.value) {
    return {
      view: 'group',
      drillPath: []
    };
  }

  return null;
}

function navigateToParentBreadcrumb(options = {}) {
  const {
    syncRoute = true,
    historyMode = 'replace'
  } = options;
  const target = resolveParentBreadcrumbTarget();
  if (!target) {
    return false;
  }

  state.selected.drillPath = target.drillPath;
  state.selected.transaction = false;
  setDashboardView(target.view, { syncRoute, historyMode });
  return true;
}

function handleBrowserHistoryPop(event) {
  const nextPosition = Number(event?.state?.position);
  const normalizedNextPosition = Number.isFinite(nextPosition) ? nextPosition : null;
  const previousPosition = lastKnownHistoryPosition.value;

  historyPopDirection.value = '';
  if (normalizedNextPosition !== null && previousPosition !== null) {
    if (normalizedNextPosition < previousPosition) {
      historyPopDirection.value = 'back';
    } else if (normalizedNextPosition > previousPosition) {
      historyPopDirection.value = 'forward';
    }
  }

  isHandlingHistoryPopNavigation.value = true;
  lastKnownHistoryPosition.value = normalizedNextPosition;
}

function parseReportDate(value) {
  if (!ISO_DATE_PATTERN.test(value)) return null;

  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

function parseReportRowTotal(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeCopyRowTotal(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? String(parsed) : '0';
}

function resolveCopyGroupDate(group) {
  const groupLabel = String(group?.label || '').trim();
  if (ISO_DATE_PATTERN.test(groupLabel)) {
    return groupLabel;
  }

  const groupKey = String(group?.key || '').trim();
  if (ISO_DATE_PATTERN.test(groupKey)) {
    return groupKey;
  }

  return '';
}

function sanitizeCopyCell(value) {
  return String(value ?? '').replace(/[\t\n\r]+/g, ' ').trim();
}

function resolveCopyRowColumns(rows = []) {
  const preferredColumnOrder = ['date', 'title', 'amount'];
  const discoveredColumns = [];
  const discoveredColumnSet = new Set();

  rows.forEach((row) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      return;
    }

    Object.keys(row).forEach((column) => {
      if (discoveredColumnSet.has(column)) {
        return;
      }

      discoveredColumnSet.add(column);
      discoveredColumns.push(column);
    });
  });

  const preferredColumns = preferredColumnOrder.filter(column => discoveredColumnSet.has(column));
  const dynamicColumns = discoveredColumns.filter(column => !preferredColumns.includes(column));
  return [...preferredColumns, ...dynamicColumns];
}

function buildCopyRowsClipboardText(rows = []) {
  const toMarkdownCell = (value) => sanitizeCopyCell(value).replace(/\|/g, '\\|');
  const columns = resolveCopyRowColumns(rows);
  if (!columns.length) {
    return '';
  }

  const headerLine = `| ${columns.join(' | ')} |`;
  const dividerLine = `| ${columns.map(() => '---').join(' | ')} |`;
  const rowLines = rows.map((row) => (
    `| ${columns.map(column => toMarkdownCell(row?.[column])).join(' | ')} |`
  ));

  return [headerLine, dividerLine, ...rowLines].join('\n');
}

function buildRowsCsvText(rows = []) {
  const columns = resolveCopyRowColumns(rows);
  if (!columns.length) {
    return '';
  }

  const toCsvCell = (value) => {
    const normalizedCell = sanitizeCopyCell(value).replace(/"/g, '""');
    if (normalizedCell.includes(',') || normalizedCell.includes('"')) {
      return `"${normalizedCell}"`;
    }

    return normalizedCell;
  };

  const headerLine = columns.map(column => toCsvCell(column)).join(',');
  const rowLines = rows.map((row) => (
    columns.map(column => toCsvCell(row?.[column])).join(',')
  ));

  return [headerLine, ...rowLines].join('\n');
}

function buildRowsJsonText(rows = []) {
  return JSON.stringify(rows, null, 2);
}

async function copyTextToClipboard(text = '') {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_error) {
      // Fallback below.
    }
  }

  if (typeof document === 'undefined') {
    return false;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  let didCopy = false;

  try {
    didCopy = document.execCommand('copy');
  } catch (_error) {
    didCopy = false;
  }

  document.body.removeChild(textarea);
  return didCopy;
}

async function handleCopyCurrentRows() {
  const rows = copyableDrillRows.value;
  if (!rows.length) {
    return;
  }

  const didCopy = await copyTextToClipboard(buildCopyRowsClipboardText(rows));
  if (!didCopy && typeof window !== 'undefined' && typeof window.alert === 'function') {
    window.alert('Unable to copy rows.');
  }
}

function defaultExportRowsFilename() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `rows-${year}-${month}-${day}`;
}

function sanitizeExportFilenameInput(value) {
  const normalizedValue = String(value ?? '').trim();
  const withoutIllegalCharacters = normalizedValue.replace(/[\\/:*?"<>|]+/g, '-');
  const compactedValue = withoutIllegalCharacters
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return compactedValue || defaultExportRowsFilename();
}

function resolveExportFilenameWithExtension(baseName, extension) {
  const normalizedBaseName = sanitizeExportFilenameInput(baseName);
  const normalizedExtension = String(extension || '').trim().toLowerCase().replace(/^\./, '');
  if (!normalizedExtension) {
    return normalizedBaseName;
  }

  const extensionSuffix = `.${normalizedExtension}`;
  if (normalizedBaseName.toLowerCase().endsWith(extensionSuffix)) {
    return normalizedBaseName;
  }

  return `${normalizedBaseName}${extensionSuffix}`;
}

function downloadRowsFile({ filename, contents, mimeType }) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  try {
    const blob = new Blob([contents], { type: mimeType });
    const downloadUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(downloadUrl);
    return true;
  } catch (_error) {
    return false;
  }
}

function openExportRowsModal() {
  if (!copyableDrillRows.value.length) {
    return;
  }

  exportRowsFilenameDraft.value = defaultExportRowsFilename();
  isExportRowsModalOpen.value = true;
}

function closeExportRowsModal() {
  isExportRowsModalOpen.value = false;
}

function handleExportRowsAs(format = 'json') {
  const rows = copyableDrillRows.value;
  if (!rows.length) {
    return;
  }

  const normalizedFormat = String(format || '').trim().toLowerCase();
  let fileContents = '';
  let fileExtension = '';
  let mimeType = 'text/plain;charset=utf-8';

  if (normalizedFormat === 'json') {
    fileContents = buildRowsJsonText(rows);
    fileExtension = 'json';
    mimeType = 'application/json;charset=utf-8';
  } else if (normalizedFormat === 'markdown') {
    fileContents = buildCopyRowsClipboardText(rows);
    fileExtension = 'md';
    mimeType = 'text/markdown;charset=utf-8';
  } else if (normalizedFormat === 'csv') {
    fileContents = buildRowsCsvText(rows);
    fileExtension = 'csv';
    mimeType = 'text/csv;charset=utf-8';
  } else {
    return;
  }

  const filename = resolveExportFilenameWithExtension(exportRowsFilenameDraft.value, fileExtension);
  const didDownload = downloadRowsFile({
    filename,
    contents: fileContents,
    mimeType
  });

  if (!didDownload && typeof window !== 'undefined' && typeof window.alert === 'function') {
    window.alert('Unable to export rows.');
    return;
  }

  closeExportRowsModal();
}

function getReportContextFromQuery() {
  const groupId = queryValue('reportGroupId');
  const tabId = queryValue('reportTabId');
  const dateStartRaw = queryValue('reportDateStart');
  const dateEndRaw = queryValue('reportDateEnd');
  const rowTotalRaw = queryValue('reportRowTotal');

  const dateStart = parseReportDate(dateStartRaw);
  const dateEnd = parseReportDate(dateEndRaw);
  const hasValidDateRange = Boolean(dateStart && dateEnd && dateStart <= dateEnd);
  const rowTotal = parseReportRowTotal(rowTotalRaw);
  const hasContext = Boolean(groupId || tabId || dateStartRaw || dateEndRaw || rowTotalRaw);

  return {
    groupId,
    tabId,
    dateStart,
    dateEnd,
    hasValidDateRange,
    rowTotal,
    hasContext
  };
}

const reportContext = getReportContextFromQuery();

if (reportContext.hasValidDateRange) {
  state.date.start = reportContext.dateStart;
  state.date.end = reportContext.dateEnd;
}

state.reportRowTotalOverride = Number.isFinite(reportContext.rowTotal)
  ? reportContext.rowTotal
  : null;

async function applyReportRowContextFromQuery(context) {
  if (!context?.hasContext) {
    return;
  }

  if (context.hasValidDateRange) {
    state.date.start = context.dateStart;
    state.date.end = context.dateEnd;
  }

  let didRunGroupChange = false;
  if (context.groupId) {
    if (context.groupId === ALL_ACCOUNTS_GROUP_ID) {
      const isAllAccountsSelected = Boolean(
        state.selected.group?.isVirtualAllAccounts || state.selected.group?._id === ALL_ACCOUNTS_GROUP_ID
      );

      if (!isAllAccountsSelected) {
        state.selected.groupOverride = {
          _id: ALL_ACCOUNTS_GROUP_ID,
          name: 'All Accounts',
          isVirtualAllAccounts: true,
          accounts: state.allUserAccounts
        };
        await handleGroupChange();
        didRunGroupChange = true;
      }
    } else {
      const targetGroup = state.allUserGroups.find(group => group._id === context.groupId);
      if (targetGroup && state.selected.group?._id !== targetGroup._id) {
        await selectGroup(targetGroup);
        didRunGroupChange = true;
      }
    }
  }

  if (!didRunGroupChange && context.hasValidDateRange && state.selected.group) {
    await handleGroupChange();
  }

  if (context.tabId) {
    const targetTab = state.selected.tabsForGroup.find(tab => tab._id === context.tabId);
    if (targetTab) {
      await selectTab(targetTab);
      setDashboardView('drill');
    }
  }

  const nextQuery = { ...route.query };
  delete nextQuery.reportGroupId;
  delete nextQuery.reportTabId;
  delete nextQuery.reportDateStart;
  delete nextQuery.reportDateEnd;
  delete nextQuery.reportRowTotal;

  await router.replace({
    name: 'dashboard',
    query: Object.keys(nextQuery).length ? nextQuery : undefined
  });

  state.reportRowTotalOverride = null;
}

function setDefaultDashboardView(options = {}) {
  return setDashboardView(defaultDashboardView(), options);
}

function openGroupSelector() {
  pendingSingleTabSelection.value = null;
  setDashboardView('group', { syncRoute: true });
}

async function handleHomeSwitcherSelect(option = {}) {
  const optionKind = String(option?.kind || '').trim().toLowerCase();

  if (optionKind === HOME_SWITCHER_HOME_KIND) {
    openGroupSelector();
    return;
  }

  const targetGroup = resolveTargetGroupForHomeSwitcherOption(option);
  const targetGroupId = normalizeSelectionGroupId(targetGroup);
  if (!targetGroup || !targetGroupId) {
    openGroupSelector();
    return;
  }

  const currentGroupId = normalizeSelectionGroupId(state.selected.group);
  const previousView = dashboardView.value;
  const previousTabId = String(state.selected.tab?._id || '').trim();
  const previousDrillPath = Array.isArray(state.selected.drillPath)
    ? [...state.selected.drillPath]
    : [];
  const tabsForTargetGroup = tabsEnabledForGroup(targetGroup);
  const matchingTab = previousTabId
    ? tabsForTargetGroup.find(tab => String(tab?._id || '').trim() === previousTabId)
    : null;
  const shouldPreserveSelectedTab = Boolean(matchingTab);

  pendingSingleTabSelection.value = null;

  try {
    if (targetGroupId !== currentGroupId) {
      await selectGroup(targetGroup, {
        preserveSelectedTab: shouldPreserveSelectedTab
      });
    }
  } catch (error) {
    console.error('Error switching account/group from home menu:', error);
    return;
  }

  if (shouldPreserveSelectedTab) {
    const selectedMatchingTab = state.selected.tabsForGroup.find(
      tab => String(tab?._id || '').trim() === String(matchingTab?._id || '').trim()
    );
    if (selectedMatchingTab) {
      selectTab(selectedMatchingTab);
    }

    if (previousView === 'drill') {
      state.selected.drillPath = previousDrillPath;
      state.selected.transaction = false;
      setDashboardView('drill', {
        syncRoute: true,
        historyMode: 'replace'
      });
      return;
    }

    if (previousView === 'transaction-search') {
      setDashboardView('transaction-search', {
        syncRoute: true,
        historyMode: 'replace'
      });
      return;
    }
  }

  resetDrillSelection();

  const nextTabs = state.selected.tabsForGroup;
  if (!nextTabs.length) {
    setDashboardView('group', {
      syncRoute: true,
      historyMode: 'replace'
    });
    return;
  }

  if (nextTabs.length === 1) {
    const onlyTabId = String(nextTabs[0]?._id || '').trim();
    if (onlyTabId) {
      pendingSingleTabSelection.value = {
        groupId: targetGroupId,
        tabId: onlyTabId
      };
    }
  }

  setDashboardView('tab', {
    syncRoute: true,
    historyMode: 'replace'
  });
}

function openTabSelector() {
  pendingSingleTabSelection.value = null;
  if (!state.selected.group) {
    setDashboardView('group', { syncRoute: true });
    return;
  }

  setDashboardView('tab', { syncRoute: true });
}

function openDrillRoot() {
  if (!state.selected.tab) {
    openTabSelector();
    return;
  }

  resetDrillSelection();
  setDashboardView('drill', { syncRoute: true });
}

function toggleRearrangeMode() {
  if (!isGroupSelectorView.value && !isTabSelectorView.value) {
    return;
  }

  isRearrangeModeActive.value = !isRearrangeModeActive.value;
}

function openTabEditor(sectionValue = null) {
  if (!state.selected.tab) {
    return;
  }

  const canEditFromCurrentView = isDrillView.value;
  if (!canEditFromCurrentView) {
    return;
  }

  targetTabEditorSection.value = typeof sectionValue === 'string'
    ? sectionValue
    : null;
  openCustomRuleEditor.value = false;

  tabEditorSnapshot.value = {
    tabId: String(state.selected.tab._id || ''),
    fingerprint: buildTabEditorFingerprint(state.selected.tab)
  };
  showRuleManagerModal.value = true;
}

function buildTabEditorFingerprint(tab) {
  if (!tab?._id) {
    return '';
  }

  try {
    return JSON.stringify({
      tabId: String(tab._id || ''),
      drillSchema: tab.drillSchema || null,
      honorRecategorizeAs: Boolean(tab.honorRecategorizeAs),
      recategorizeBehaviorDecision: String(tab.recategorizeBehaviorDecision || '')
    });
  } catch (_error) {
    return '';
  }
}

async function handleRuleManagerClose() {
  showRuleManagerModal.value = false;
  openCustomRuleEditor.value = false;

  const currentTab = state.selected.tab;
  const previousSnapshot = tabEditorSnapshot.value;
  tabEditorSnapshot.value = { tabId: '', fingerprint: '' };
  const hasRuleManagerChanges = Boolean(
    currentTab
    && previousSnapshot.fingerprint
    && previousSnapshot.tabId === String(currentTab._id || '')
    && previousSnapshot.fingerprint !== buildTabEditorFingerprint(currentTab)
  );

  if (hasRuleManagerChanges) {
    await processAllTabsForSelectedGroup({ showLoading: true });
  }

  if (!state.selected.tab) {
    return;
  }

  const resolvedPath = drillState.value.validPath || [];
  if (!sameDrillPath(resolvedPath, state.selected.drillPath || [])) {
    state.selected.drillPath = resolvedPath;
    setDashboardView('drill', {
      syncRoute: true,
      historyMode: 'replace'
    });
  }
}

function openTransactionSearch() {
  setDashboardView('transaction-search', { syncRoute: true });
}

async function handleSaveViewNote(payload = {}) {
  const selectedTab = state.selected.tab;
  const scopeKey = selectedTabViewNoteScopeKey.value;
  if (!selectedTab?._id || !scopeKey) {
    return;
  }

  const requestedTemplate = typeof payload === 'string'
    ? payload
    : payload?.template;
  const requestedShowInMainView = typeof payload === 'object' && payload !== null
    ? payload.showInMainView
    : undefined;
  const normalizedTemplate = normalizeTabViewNoteTemplate(requestedTemplate);
  const nextTabNotesByView = normalizeTabNotesByView(selectedTab.tabNotesByView);
  const previousEntry = nextTabNotesByView[scopeKey] || null;
  const previousTemplate = String(previousEntry?.template || '');
  const previousShowInMainView = normalizeTabViewNoteShowInMainView(previousEntry?.showInMainView);
  const nextShowInMainView = normalizedTemplate
    ? normalizeTabViewNoteShowInMainView(
      requestedShowInMainView === undefined ? previousShowInMainView : requestedShowInMainView
    )
    : false;

  if (!normalizedTemplate) {
    if (!previousTemplate) {
      return;
    }
    delete nextTabNotesByView[scopeKey];
  } else {
    if (previousTemplate === normalizedTemplate && previousShowInMainView === nextShowInMainView) {
      return;
    }

    nextTabNotesByView[scopeKey] = {
      template: normalizedTemplate,
      showInMainView: nextShowInMainView,
      updatedAt: new Date().toISOString()
    };
  }

  isSavingViewNote.value = true;

  try {
    await setTabNotesByView(selectedTab._id, nextTabNotesByView);
  } catch (error) {
    console.error('Error saving tab view note:', error);
  } finally {
    isSavingViewNote.value = false;
  }
}

async function handleRemoveViewNote() {
  await handleSaveViewNote('');
}

function handleGroupSelected(group) {
  const enabledTabs = tabsEnabledForGroup(group);
  if (enabledTabs.length === 1) {
    const targetGroupId = normalizeSelectionGroupId(group);
    const targetTabId = String(enabledTabs[0]?._id || '').trim();

    if (targetGroupId && targetTabId) {
      pendingSingleTabSelection.value = {
        groupId: targetGroupId,
        tabId: targetTabId
      };
    } else {
      pendingSingleTabSelection.value = null;
    }
  } else {
    pendingSingleTabSelection.value = null;
  }

  setDashboardView('tab', { syncRoute: true });
}

function openSelectedTabView() {
  resetDrillSelection();
  setDashboardView('drill', { syncRoute: true });
}

function handleTabSelected() {
  pendingSingleTabSelection.value = null;
  openSelectedTabView();
}

function handleDrillGroupSelected(group) {
  const nextKey = String(group?.key || '').trim();
  if (!nextKey) return;

  state.selected.drillPath = [...state.selected.drillPath, nextKey];
  state.selected.transaction = false;
  setDashboardView('drill', { syncRoute: true });
}

function handleNavigateDrillDepth(depth = 0) {
  const safeDepth = Number.isFinite(Number(depth)) && Number(depth) >= 0
    ? Number(depth)
    : 0;

  state.selected.drillPath = state.selected.drillPath.slice(0, safeDepth);
  state.selected.transaction = false;
  setDashboardView('drill', { syncRoute: true });
}

watch(
  () => dashboardView.value,
  (view, previousView) => {
    if (view !== previousView) {
      isRearrangeModeActive.value = false;
    }
  }
);

watch(
  [() => dashboardView.value, () => state.selected.group?._id],
  async ([view, selectedGroupId]) => {
    if (view !== 'tab' || !selectedGroupId) {
      return;
    }

    await ensureDefaultTabsForTabView();
  }
);

watch(
  [
    () => pendingSingleTabSelection.value?.groupId || '',
    () => pendingSingleTabSelection.value?.tabId || '',
    () => normalizeSelectionGroupId(state.selected.group),
    () => state.selected.tabsForGroup.map(tab => tab?._id).filter(Boolean).join(',')
  ],
  ([pendingGroupId, pendingTabId, selectedGroupId]) => {
    if (!pendingGroupId || !pendingTabId) {
      return;
    }

    if (pendingGroupId !== selectedGroupId) {
      return;
    }

    const tabToSelect = state.selected.tabsForGroup.find(tab => tab?._id === pendingTabId);
    if (!tabToSelect) {
      return;
    }

    selectTab(tabToSelect);
    resetDrillSelection();
    setDashboardView('drill', {
      syncRoute: true,
      historyMode: 'replace'
    });
    pendingSingleTabSelection.value = null;
  }
);

watch(
  [
    () => dashboardView.value,
    () => normalizeSelectionGroupId(state.selected.group),
    () => state.selected.tab?._id || '',
    () => state.selected.tabsForGroup.map(tab => tab?._id).filter(Boolean).join(',')
  ],
  ([currentView, selectedGroupId, selectedTabId]) => {
    const autoSelectedTab = resolveSingleTabAutoSelectTarget({
      dashboardView: currentView,
      selectedGroupId,
      selectedTabId,
      tabsForGroup: state.selected.tabsForGroup
    });

    if (!autoSelectedTab) {
      return;
    }

    selectTab(autoSelectedTab);
    pendingSingleTabSelection.value = null;
    resetDrillSelection();
    setDashboardView('drill', {
      syncRoute: true,
      historyMode: 'replace'
    });
  }
);

watch(
  () => state.selected.tab?._id,
  (selectedTabId, previousTabId) => {
    if (!selectedTabId) {
      resetDrillSelection();
      if (isDrillView.value) {
        setDashboardView(state.selected.group ? 'tab' : 'group', {
          syncRoute: true,
          historyMode: 'replace'
        });
      }
      return;
    }

    if (selectedTabId !== previousTabId && previousTabId) {
      resetDrillSelection();
      if (isDrillView.value) {
        setDashboardView('drill', {
          syncRoute: true,
          historyMode: 'replace'
        });
      }
    }
  }
);

watch(
  () => state.selected.group?._id,
  (selectedGroupId, previousGroupId) => {
    if (selectedGroupId !== previousGroupId) {
      resetDrillSelection();
    }

    if (selectedGroupId) {
      writePreferredGroupIdToStorage(state.selected.group);
    }

    const pendingGroupId = pendingSingleTabSelection.value?.groupId || '';
    const normalizedSelectedGroupId = normalizeSelectionGroupId(state.selected.group);
    if (pendingGroupId && pendingGroupId !== normalizedSelectedGroupId) {
      pendingSingleTabSelection.value = null;
    }

    if (!selectedGroupId && !state.isLoading) {
      setDashboardView('group', {
        syncRoute: true,
        historyMode: 'replace'
      });
    }
  },
  { flush: 'sync' }
);

watch(
  () => drillState.value.validPath,
  (nextValidPath) => {
    const safePath = Array.isArray(nextValidPath) ? nextValidPath : [];
    const currentPath = Array.isArray(state.selected.drillPath) ? state.selected.drillPath : [];

    if (sameDrillPath(safePath, currentPath)) {
      return;
    }

    state.selected.drillPath = safePath;
    if (isDrillView.value) {
      setDashboardView('drill', {
        syncRoute: true,
        historyMode: 'replace'
      });
    }
  }
);

watch(
  [() => dashboardView.value, () => encodeDrillPath(state.selected.drillPath), () => queryValue(DRILL_PATH_QUERY_KEY)],
  ([view, encodedSelectedPath, encodedRoutePath]) => {
    if (route.name !== 'dashboard') {
      return;
    }

    if (view !== 'drill') {
      return;
    }

    if (isSyncingDashboardRouteQuery.value) {
      return;
    }

    if (encodedSelectedPath === encodedRoutePath) {
      return;
    }

    void syncDashboardViewQuery('drill', 'replace');
  }
);

watch(
  [() => queryValue(DASHBOARD_VIEW_QUERY_KEY), () => queryValue(DRILL_PATH_QUERY_KEY)],
  ([routeViewRaw]) => {
    const wasHistoryPopNavigation = isHandlingHistoryPopNavigation.value;
    const popDirection = historyPopDirection.value;
    isHandlingHistoryPopNavigation.value = false;
    historyPopDirection.value = '';
    lastKnownHistoryPosition.value = getHistoryPosition();

    if (route.name !== 'dashboard') {
      return;
    }

    if (isSyncingDashboardRouteQuery.value) {
      return;
    }

    if (wasHistoryPopNavigation && popDirection === 'back') {
      if (navigateToParentBreadcrumb({ syncRoute: true, historyMode: 'replace' })) {
        return;
      }
    }

    if (!routeViewRaw) {
      setDashboardView('group');
      return;
    }

    const normalizedRouteView = normalizeDashboardView(routeViewRaw);
    if (!normalizedRouteView) {
      const fallbackView = setDefaultDashboardView();
      void syncDashboardViewQuery(fallbackView, 'replace');
      return;
    }

    if (normalizedRouteView === 'drill') {
      state.selected.drillPath = queryDrillPath();
    } else if (state.selected.drillPath.length) {
      resetDrillSelection();
    }

    const resolvedRouteView = setDashboardView(normalizedRouteView);
    if (resolvedRouteView !== normalizedRouteView) {
      void syncDashboardViewQuery(resolvedRouteView, 'replace');
      return;
    }

    if (resolvedRouteView === 'drill') {
      const routePath = queryDrillPath();
      const resolvedPath = Array.isArray(state.selected.drillPath) ? state.selected.drillPath : [];
      if (!sameDrillPath(routePath, resolvedPath)) {
        void syncDashboardViewQuery('drill', 'replace');
      }
    }
  }
);

async function applyRemoteDashboardSyncRefresh(options = {}) {
  const {
    runPlaidSync = false,
    preserveSelectedTab = true
  } = options;

  if (isApplyingRemoteDashboardSync.value) {
    return true;
  }

  isApplyingRemoteDashboardSync.value = true;

  try {
    const preferredGroupId = normalizeSelectionGroupId(state.selected.group);

    await init({
      preferredGroupId,
      prioritizeFirstPaint: true,
      awaitPostInitWorkflow: true,
      runPlaidSync,
      preserveSelectedTab
    });

    const routeView = normalizeDashboardView(queryValue(DASHBOARD_VIEW_QUERY_KEY));
    if (routeView) {
      if (routeView === 'drill') {
        state.selected.drillPath = queryDrillPath();
      }
      const resolvedRouteView = setDashboardView(routeView);
      if (resolvedRouteView !== routeView) {
        await syncDashboardViewQuery(resolvedRouteView, 'replace');
      }
      return true;
    }

    const fallbackView = setDefaultDashboardView();
    await syncDashboardViewQuery(fallbackView, 'replace');
    return true;
  } finally {
    isApplyingRemoteDashboardSync.value = false;
  }
}

const {
  start: startRemoteDashboardSync,
  stop: stopRemoteDashboardSync
} = useRemoteSync({
  resourceKeys: ['groups', 'tabs', 'rules'],
  intervalMs: 15000,
  onChange: async () => {
    if (showRuleManagerModal.value || state.isLoading) {
      return false;
    }

    return await applyRemoteDashboardSyncRefresh();
  }
});

onMounted(async () => {
  if (typeof window !== 'undefined') {
    lastKnownHistoryPosition.value = getHistoryPosition();
    window.addEventListener('popstate', handleBrowserHistoryPop);
  }

  const preferredGroupIdFromStorage = readPreferredGroupIdFromStorage();
  const initialPreferredGroupId = String(reportContext.groupId || preferredGroupIdFromStorage || '').trim();

  await init({
    preferredGroupId: initialPreferredGroupId,
    prioritizeFirstPaint: !reportContext.hasContext
  });
  await applyReportRowContextFromQuery(reportContext);

  const routeView = normalizeDashboardView(queryValue(DASHBOARD_VIEW_QUERY_KEY));
  if (routeView) {
    if (routeView === 'drill') {
      state.selected.drillPath = queryDrillPath();
    }
    const resolvedRouteView = setDashboardView(routeView);
    if (resolvedRouteView !== routeView) {
      await syncDashboardViewQuery(resolvedRouteView, 'replace');
    }
  } else {
    const initialView = setDefaultDashboardView();
    await syncDashboardViewQuery(initialView, 'replace');
  }

  startRemoteDashboardSync();
});

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('popstate', handleBrowserHistoryPop);
  }

  stopRemoteDashboardSync();
});
</script>
