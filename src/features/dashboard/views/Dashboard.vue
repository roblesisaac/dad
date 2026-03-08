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
          :drill-tab-total="drillState.tabTotal"
          :drill-level-total="drillState.currentLevelTotal"
          :is-drill-leaf="drillState.isLeaf"
          :overridden-recategorize-count="drillState.overriddenRecategorizeCount"
          :is-honoring-recategorize-as="drillState.honorRecategorizeAs"
          :has-recategorize-behavior-decision="drillState.hasRecategorizeBehaviorDecision"
          @navigate-group="openGroupSelector"
          @navigate-tab="openTabSelector"
          @navigate-category="openDrillRoot"
          @navigate-drill-depth="handleNavigateDrillDepth"
          @toggle-rearrange="toggleRearrangeMode"
          @edit-tab="openTabEditor"
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

      <footer
        v-if="!state.isLoading && shouldShowFooter"
        class="fixed bottom-0 py-2 left-0 right-0 z-20 bg-white/90 backdrop-blur-md"
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
        @close="handleRuleManagerClose"
      />

      <AccountModal
        :is-open="isAccountModalOpen"
        @close="isAccountModalOpen = false"
      />
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
import { useRemoteSync } from '@/shared/composables/useRemoteSync.js';
import { usePullToRefresh } from '@/shared/composables/usePullToRefresh.js';
import { ChevronDown, Loader2 } from 'lucide-vue-next';

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
const { selectGroup, handleGroupChange } = useSelectGroup();
const { selectTab, ensureDefaultTabsForTabView } = useTabs();
const { processAllTabsForSelectedGroup } = useTabProcessing();

const showRuleManagerModal = ref(false);
const targetTabEditorSection = ref(null);
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
const isSyncingDashboardRouteQuery = ref(false);
const isApplyingRemoteDashboardSync = ref(false);
const pendingSingleTabSelection = ref(null);
const tabEditorSnapshot = ref({ tabId: '', fingerprint: '' });
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

function parseReportDate(value) {
  if (!ISO_DATE_PATTERN.test(value)) return null;

  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

function parseReportRowTotal(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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

  targetTabEditorSection.value = typeof sectionValue === 'string' ? sectionValue : null;

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
  [() => queryValue(DASHBOARD_VIEW_QUERY_KEY), () => queryValue(DRILL_PATH_QUERY_KEY)],
  ([routeViewRaw]) => {
    if (isSyncingDashboardRouteQuery.value) {
      return;
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
  stopRemoteDashboardSync();
});
</script>
