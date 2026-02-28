<template>
  <main class="min-h-screen bg-white">
    <section class="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <header class="flex items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-black tracking-tight text-gray-900">Reports</h1>
          <p class="text-sm text-gray-500 mt-1">
            Build reports from tab totals and manual line items.
          </p>
        </div>

        <button
          v-if="hasReports"
          class="px-4 py-2 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition-colors"
          @click="createReport"
        >
          New Report
        </button>
      </header>

      <div v-if="state.isLoading" class="py-20 flex justify-center">
        <LoadingDots />
      </div>

      <div v-else-if="state.error" class="border border-red-200 bg-red-50 text-red-700 rounded-xl p-4">
        {{ state.error }}
      </div>

      <ReportsEmptyState
        v-else-if="!hasReports"
        @create="createReport"
      />

      <div v-else class="space-y-5 pb-20">
        <ReportCard
          v-for="report in state.reports"
          :key="report._id"
          :report="report"
          :tabs="sortedTabs"
          :groups="sortedGroups"
          :total="getReportTotal(report._id)"
          :save-status="state.saveStatusByReportId[report._id]"
          :row-amount-for="(rowId) => getRowAmount(report._id, rowId)"
          :row-issue-for="(rowId) => getRowIssue(report._id, rowId)"
          @rename-report="onRenameReport"
          @delete-report="deleteReport"
          @add-tab-row="addTabRow"
          @add-manual-row="addManualRow"
          @update-row="onUpdateRow"
          @remove-row="onRemoveRow"
          @reorder-rows="onReorderRows"
        />
      </div>
    </section>
  </main>
</template>

<script setup>
import { onMounted } from 'vue';
import LoadingDots from '@/shared/components/LoadingDots.vue';
import ReportsEmptyState from '@/features/reports/components/ReportsEmptyState.vue';
import ReportCard from '@/features/reports/components/ReportCard.vue';
import { useReportsState } from '@/features/reports/composables/useReportsState.js';

const {
  state,
  sortedTabs,
  sortedGroups,
  hasReports,
  initReports,
  createReport,
  deleteReport,
  updateReportName,
  addTabRow,
  addManualRow,
  updateRow,
  removeRow,
  reorderRows,
  getRowAmount,
  getRowIssue,
  getReportTotal
} = useReportsState();

function onRenameReport({ reportId, name }) {
  updateReportName(reportId, name);
}

function onUpdateRow({ reportId, rowId, updates }) {
  updateRow(reportId, rowId, updates);
}

function onRemoveRow({ reportId, rowId }) {
  removeRow(reportId, rowId);
}

function onReorderRows({ reportId, rows }) {
  reorderRows(reportId, rows);
}

onMounted(() => {
  initReports();
});
</script>
