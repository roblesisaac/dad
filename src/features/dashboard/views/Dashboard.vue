<template>
  <div class="min-h-screen bg-white">
    <BlueBar />

    <div class="max-w-5xl mx-auto w-full relative">
      <div>
        <DashboardHeader
          :view="dashboardView"
          @navigate-group="openGroupSelector"
          @navigate-tab="openTabSelector"
          @navigate-category="openCategoryView"
        />
      </div>

      <div
        class="mt-4 px-4 "
        :class="showSelectorView ? 'pb-12 sm:pb-16 sm:px-6' : 'pb-32'"
      >
        <Transition name="fade">
          <div v-if="state.isLoading && !isGroupSelectorView" class="w-full flex justify-center py-20">
            <LoadingDots />
          </div>
        </Transition>

        <Transition name="fade">
          <div v-if="!state.isLoading && isGroupSelectorView" class="w-full">
            <SelectGroup
              variant="dashboard"
              :is-open="true"
              @group-selected="handleGroupSelected"
            />

            <button
              @click="router.push('/reports')"
              class="w-full text-left py-6 border-t border-[var(--theme-border)] flex items-center justify-between hover:bg-[var(--theme-bg-soft)] transition-colors"
              type="button"
            >
              <span class="text-base font-black uppercase tracking-tight text-[var(--theme-text)]">
                Reports
              </span>
              <ChevronRight class="w-4 h-4 text-[var(--theme-text-soft)]" />
            </button>
          </div>
        </Transition>

        <Transition name="fade">
          <div v-if="!state.isLoading && isTabSelectorView" class="w-full">
            <AllTabs variant="dashboard" @tab-selected="handleTabSelected" />
          </div>
        </Transition>

        <Transition name="fade">
          <div v-if="!state.isLoading && isCategoryView" class="w-full">
            <CategoriesWrapper @category-selected="handleCategorySelected" />
          </div>
        </Transition>

        <Transition name="fade">
          <div v-if="!state.isLoading && isCategoryDetailView" class="w-full">
            <CategoryTransactionsView />
          </div>
        </Transition>
      </div>

      <footer
        v-if="!state.isLoading && shouldShowFooter"
        class="fixed bottom-0 py-2 left-0 right-0 z-20 bg-white/90 backdrop-blur-md"
      >
        <div class="max-w-5xl mx-auto w-full px-6 py-2 grid grid-cols-[1fr_auto_1fr] items-center">
          <button
            class="group focus:outline-none inline-flex items-center justify-self-start hover:opacity-70 transition-opacity"
            type="button"
            aria-label="Search transactions"
          >
            <Search class="w-4 h-4 text-black group-hover:text-black transition-colors" />
          </button>

          <button
            v-if="shouldShowEditTabAction"
            @click="showRuleManagerModal = true"
            class="group focus:outline-none flex items-center gap-1.5 hover:opacity-70 transition-opacity justify-self-center"
            type="button"
          >
            <span class="text-xs sm:text-sm font-black text-black uppercase tracking-[0.2em]">
              Edit Tab
            </span>
            <ChevronDown class="w-3.5 h-3.5 text-black group-hover:text-black transition-colors" />
          </button>

          <button
            @click="isAccountModalOpen = true"
            class="group focus:outline-none flex items-center gap-1.5 hover:opacity-70 transition-opacity justify-self-end"
            type="button"
          >
            <span class="text-xs sm:text-sm font-black text-black uppercase tracking-[0.2em]">
              Account
            </span>
            <ChevronRight class="w-3.5 h-3.5 text-black group-hover:text-black transition-colors" />
          </button>
        </div>
      </footer>

      <RuleManagerModal
        :is-open="showRuleManagerModal"
        @close="showRuleManagerModal = false"
      />

      <Teleport to="body">
        <div
          v-if="isAccountModalOpen"
          class="fixed inset-0 z-50 flex items-center justify-center bg-[var(--theme-overlay-30)] px-4"
          @click.self="isAccountModalOpen = false"
        >
          <div
            class="w-full max-w-sm rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg)] shadow-[0_20px_60px_-24px_var(--theme-overlay-50)]"
            role="dialog"
            aria-modal="true"
            aria-label="Account"
          >
            <div class="flex items-center justify-between border-b border-[var(--theme-border)] px-4 py-3">
              <h3 class="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--theme-text)]">
                Account
              </h3>
              <button
                type="button"
                class="rounded-full p-1 text-[var(--theme-text-soft)] transition-colors hover:text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-ring)]"
                aria-label="Close account modal"
                @click="isAccountModalOpen = false"
              >
                <X class="h-4 w-4" />
              </button>
            </div>

            <div class="space-y-5 px-4 py-4">
              <div>
                <p class="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--theme-text-soft)]">
                  Theme
                </p>
                <div class="mt-2 grid grid-cols-2 gap-2">
                  <button
                    v-for="themeOption in accountThemeOptions"
                    :key="themeOption.value"
                    type="button"
                    class="rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-colors"
                    :class="selectedThemeOption === themeOption.value
                      ? 'border-[var(--theme-text)] text-[var(--theme-text)] bg-[var(--theme-bg-subtle)]'
                      : 'border-[var(--theme-border)] text-[var(--theme-text-soft)] hover:text-[var(--theme-text)] hover:bg-[var(--theme-bg-soft)]'"
                    @click="selectedThemeOption = themeOption.value"
                  >
                    {{ themeOption.label }}
                  </button>
                </div>
              </div>

              <button
                type="button"
                class="w-full rounded-xl border border-[var(--theme-border)] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--theme-text)] hover:bg-[var(--theme-bg-soft)] transition-colors"
              >
                Logout
              </button>
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
</style>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { isValid, parseISO } from 'date-fns';
import { useRoute, useRouter } from 'vue-router';
import { useDashboardState } from '../composables/useDashboardState.js';
import { useInit } from '../composables/useInit.js';
import { useSelectGroup } from '@/features/select-group/composables/useSelectGroup.js';
import { useTabs } from '@/features/tabs/composables/useTabs.js';
import { ChevronDown, ChevronRight, Search, X } from 'lucide-vue-next';

import BlueBar from '../components/BlueBar.vue';
import LoadingDots from '@/shared/components/LoadingDots.vue';
import CategoriesWrapper from '../components/CategoriesWrapper.vue';
import CategoryTransactionsView from '../components/CategoryTransactionsView.vue';
import DashboardHeader from '../components/DashboardHeader.vue';
import SelectGroup from '@/features/select-group/views/SelectGroup.vue';
import AllTabs from '@/features/tabs/components/AllTabs.vue';
import RuleManagerModal from '@/features/rule-manager/components/RuleManagerModal.vue';

const router = useRouter();
const route = useRoute();
const { state } = useDashboardState();
const { init } = useInit();
const { selectGroup, handleGroupChange } = useSelectGroup();
const { selectTab } = useTabs();

const showRuleManagerModal = ref(false);
const isAccountModalOpen = ref(false);
const selectedThemeOption = ref('light');
const accountThemeOptions = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' }
];
const dashboardView = ref('group');
const isGroupSelectorView = computed(() => dashboardView.value === 'group');
const isTabSelectorView = computed(() => dashboardView.value === 'tab');
const isCategoryView = computed(() => dashboardView.value === 'category');
const isCategoryDetailView = computed(() => dashboardView.value === 'category-detail');
const showSelectorView = computed(() => isGroupSelectorView.value || isTabSelectorView.value);
const shouldShowFooter = computed(() => (
  isGroupSelectorView.value ||
  isTabSelectorView.value ||
  isCategoryView.value ||
  isCategoryDetailView.value
));
const shouldShowEditTabAction = computed(() => isCategoryView.value || isCategoryDetailView.value);

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function resetCategorySelection() {
  state.selected.category = false;
  state.selected.transaction = false;
}

function queryValue(key) {
  const value = route.query[key];
  return typeof value === 'string' ? value : '';
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
    const targetGroup = state.allUserGroups.find(group => group._id === context.groupId);
    if (targetGroup && state.selected.group?._id !== targetGroup._id) {
      await selectGroup(targetGroup);
      didRunGroupChange = true;
    }
  }

  if (!didRunGroupChange && context.hasValidDateRange && state.selected.group) {
    await handleGroupChange();
  }

  if (context.tabId) {
    const targetTab = state.selected.tabsForGroup.find(tab => tab._id === context.tabId);
    if (targetTab) {
      await selectTab(targetTab);
      resetCategorySelection();
      dashboardView.value = 'category';
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

function setDefaultDashboardView() {
  if (state.selected.tab) {
    dashboardView.value = state.selected.category ? 'category-detail' : 'category';
    return;
  }

  // if (state.selected.group) {
  //   dashboardView.value = 'tab';
  //   return;
  // }

  dashboardView.value = 'group';
}

function openGroupSelector() {
  resetCategorySelection();
  dashboardView.value = 'group';
}

function openTabSelector() {
  if (!state.selected.group) {
    dashboardView.value = 'group';
    return;
  }

  resetCategorySelection();
  dashboardView.value = 'tab';
}

function openCategoryView() {
  if (!state.selected.tab) {
    openTabSelector();
    return;
  }

  resetCategorySelection();
  dashboardView.value = 'category';
}

function handleGroupSelected() {
  resetCategorySelection();
  dashboardView.value = 'tab';
}

function handleTabSelected() {
  resetCategorySelection();
  dashboardView.value = 'category';
}

function handleCategorySelected(categoryName) {
  if (!categoryName) return;

  state.selected.category = categoryName;
  state.selected.transaction = false;
  dashboardView.value = 'category-detail';
}

watch(
  () => state.selected.tab?._id,
  (selectedTabId, previousTabId) => {
    if (!selectedTabId) {
      resetCategorySelection();
      if (isCategoryView.value || isCategoryDetailView.value) {
        dashboardView.value = state.selected.group ? 'tab' : 'group';
      }
      return;
    }

    if (selectedTabId !== previousTabId && previousTabId) {
      resetCategorySelection();
      if (isCategoryDetailView.value) {
        dashboardView.value = 'category';
      }
    }
  }
);

watch(
  () => state.selected.group?._id,
  (selectedGroupId, previousGroupId) => {
    if (selectedGroupId !== previousGroupId) {
      resetCategorySelection();
    }

    if (!selectedGroupId && !state.isLoading) {
      dashboardView.value = 'group';
    }
  }
);

watch(
  [() => dashboardView.value, () => state.selected.category, () => state.selected.tab?.categorizedItems],
  ([view, selectedCategory]) => {
    if (view !== 'category-detail') {
      return;
    }

    if (!selectedCategory) {
      dashboardView.value = 'category';
      return;
    }

    const categoryExists = Boolean(
      state.selected.tab?.categorizedItems?.find(([categoryName]) => categoryName === selectedCategory)
    );

    if (!categoryExists) {
      resetCategorySelection();
      dashboardView.value = 'category';
    }
  },
  { deep: true }
);

onMounted(async () => {
  await init({
    preferredGroupId: reportContext.groupId,
    prioritizeFirstPaint: !reportContext.hasContext
  });
  await applyReportRowContextFromQuery(reportContext);
  setDefaultDashboardView();
});
</script>
