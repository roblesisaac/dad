<template>
  <div class="min-h-screen bg-white">
    <!-- Feedback Bar -->
    <BlueBar />

    <!-- Dashboard Container -->
    <div class="max-w-5xl mx-auto w-full relative">

      <!-- Unified Header -->
      <div>
        <DashboardHeader />
      </div>

      <!-- Category Content -->
      <div class="mt-4 pb-32">
        <Transition name="fade">
          <div v-if="!state.isLoading && state.selected.tab" class="w-full">
            <CategoriesWrapper />
          </div>
        </Transition>
        <Transition name="fade">
          <div v-if="state.isLoading" class="w-full flex justify-center py-20">
            <LoadingDots />
          </div>
        </Transition>
      </div>

      <!-- Fixed Footer: Filters & Reports -->
      <footer class="fixed bottom-0 left-0 right-0 z-20 bg-white/90 backdrop-blur-md">
        <div class="max-w-5xl mx-auto w-full px-6 py-2 grid grid-cols-3 items-center">
          <!-- Left: Filters -->
          <button 
            @click="showRuleManagerModal = true"
            class="group focus:outline-none flex items-center gap-1.5 hover:opacity-70 transition-opacity justify-self-start"
          >
            <span class="text-xs sm:text-sm font-black text-black uppercase tracking-[0.2em]">
              Edit Tab
            </span>
            <ChevronDown class="w-3.5 h-3.5 text-gray-300 group-hover:text-black transition-colors" />
          </button>

          <div class="justify-self-center">
            <ThemeCycleButton />
          </div>

          <!-- Right: Reports -->
          <button 
            @click="router.push('/reports')"
            class="group focus:outline-none flex items-center gap-1.5 hover:opacity-70 transition-opacity justify-self-end"
          >
            <span class="text-xs sm:text-sm font-black text-black uppercase tracking-[0.2em]">
              Reports
            </span>
            <ChevronRight class="w-3.5 h-3.5 text-gray-300 group-hover:text-black transition-colors" />
          </button>
        </div>
      </footer>

      <!-- Modals -->
      <RuleManagerModal 
        :is-open="showRuleManagerModal" 
        @close="showRuleManagerModal = false" 
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
</style>

<script setup>
import { onMounted, ref } from 'vue';
import { isValid, parseISO } from 'date-fns';
import { useRoute, useRouter } from 'vue-router';
import { useDashboardState } from '../composables/useDashboardState.js';
import { useInit } from '../composables/useInit.js';
import { useSelectGroup } from '@/features/select-group/composables/useSelectGroup.js';
import { useTabs } from '@/features/tabs/composables/useTabs.js';
import { ChevronDown, ChevronRight } from 'lucide-vue-next';

// Core Components
import BlueBar from '../components/BlueBar.vue';
import LoadingDots from '@/shared/components/LoadingDots.vue';
import CategoriesWrapper from '../components/CategoriesWrapper.vue';
import DashboardHeader from '../components/DashboardHeader.vue';
import RuleManagerModal from '@/features/rule-manager/components/RuleManagerModal.vue';
import ThemeCycleButton from '@/shared/components/ThemeCycleButton.vue';

const router = useRouter();
const route = useRoute();
const { state } = useDashboardState();
const { init } = useInit();
const { selectGroup, handleGroupChange } = useSelectGroup();
const { selectTab } = useTabs();
const showRuleManagerModal = ref(false);

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function queryValue(key) {
  const value = route.query[key];
  return typeof value === 'string' ? value : '';
}

function parseReportDate(value) {
  if (!ISO_DATE_PATTERN.test(value)) {
    return null;
  }

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
    if (targetGroup) {
      if (state.selected.group?._id !== targetGroup._id) {
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

onMounted(async () => {
  await init({
    preferredGroupId: reportContext.groupId
  });
  await applyReportRowContextFromQuery(reportContext);
});
</script>
