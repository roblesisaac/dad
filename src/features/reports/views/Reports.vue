<template>
  <main class="min-h-screen bg-white pb-28">
    <section class="max-w-5xl mx-auto px-4 py-8">
      <div v-if="state.isLoading" class="py-24 flex justify-center">
        <LoadingDots />
      </div>

      <div v-else-if="state.error" class="border border-red-200 bg-red-50 text-red-700 rounded-xl p-4">
        {{ state.error }}
      </div>

      <template v-else-if="!selectedReport && !hasReports">
        <ReportsEmptyState @create="createFirstReport" />
      </template>

      <template v-else-if="!selectedReport">
        <header class="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 class="text-3xl font-black tracking-tight text-gray-900">Reports</h1>
            <p class="text-sm text-gray-500 mt-1">
              {{ isReorderingReports ? 'Drag reports to rearrange, then tap done.' : 'Tap a report to see all rows and totals.' }}
            </p>
          </div>

          <div class="flex items-center gap-2">
            <button
              v-if="isReorderingReports"
              class="btn-primary"
              @click="finishReorderReports"
            >
              Done
            </button>

            <div class="relative">
              <button class="p-2 rounded-lg text-gray-500 hover:bg-gray-100" @click="showListMenu = !showListMenu">
                <MoreVertical class="w-5 h-5" />
              </button>

              <div
                v-if="showListMenu"
                class="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-20"
              >
                <button class="menu-item" @click="toggleReorderReports">
                  {{ isReorderingReports ? 'Stop Rearranging' : 'Rearrange Reports' }}
                </button>
              </div>
            </div>
          </div>
        </header>

        <draggable
          v-model="reportsForDrag"
          item-key="_id"
          class="space-y-4"
          handle=".drag-handle"
          :disabled="!isReorderingReports"
          @end="onReportsDragEnd"
        >
          <template #item="{ element: report }">
            <article
              class="relative border-2 border-gray-100 rounded-2xl p-4 bg-white shadow-sm transition-colors"
              :class="isReorderingReports ? 'border-dashed border-gray-300' : 'cursor-pointer hover:border-gray-200'"
              @click="openReportFromList(report._id)"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-start gap-2 min-w-0">
                  <button
                    v-if="isReorderingReports"
                    class="drag-handle mt-0.5 p-1 rounded-lg text-gray-400 hover:text-gray-700 cursor-move"
                    @click.stop
                    title="Drag to reorder"
                  >
                    <GripVertical class="w-4 h-4" />
                  </button>

                  <h2 class="text-xl font-black text-gray-900 truncate">{{ report.name }}</h2>
                </div>

                <div class="flex items-center gap-2">
                  <span class="text-sm font-black" :class="fontColor(getReportTotal(report._id))">
                    {{ formatPrice(getReportTotal(report._id), { toFixed: 2 }) }}
                  </span>
                  <div v-if="!isReorderingReports" class="relative">
                    <button
                      class="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                      @click.stop="toggleReportMenu(report._id)"
                    >
                      <MoreVertical class="w-4 h-4" />
                    </button>

                    <div
                      v-if="activeReportMenuId === report._id"
                      class="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-20"
                      @click.stop
                    >
                      <button class="menu-item" @click="startRenameFromList(report)">Edit report name</button>
                      <button class="menu-item" @click="refreshReportFromList(report._id)">Refresh totals</button>
                      <button class="menu-item" @click="confirmDeleteReport(report._id)">Delete</button>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </template>
        </draggable>

        <button
          class="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-black text-white shadow-xl hover:bg-gray-800 flex items-center justify-center"
          :class="isReorderingReports ? 'opacity-50 cursor-not-allowed' : ''"
          :disabled="isReorderingReports"
          @click="createNewReportFromFab"
          title="Create report"
        >
          <Plus class="w-6 h-6" />
        </button>
      </template>

      <template v-else>
        <header class="mb-6 flex items-start justify-between gap-3">
          <div class="flex items-start gap-3 min-w-0 flex-1">
            <button class="mt-1 p-2 rounded-lg hover:bg-gray-100 text-gray-600" @click="backToList">
              <ChevronLeft class="w-4 h-4" />
            </button>

            <div class="min-w-0 flex-1">
              <div v-if="isEditingReportName" class="space-y-2">
                <input
                  v-model="reportNameDraft"
                  class="w-full max-w-md border border-gray-300 rounded-lg px-3 py-2 text-lg font-black"
                />
                <div class="flex items-center gap-2">
                  <button class="btn-primary" @click="saveReportName">Save</button>
                  <button class="btn-secondary" @click="cancelReportNameEdit">Cancel</button>
                </div>
              </div>
              <template v-else>
                <h1 class="text-3xl font-black tracking-tight text-gray-900 truncate">{{ selectedReport.name }}</h1>
                <p class="text-xs text-gray-500 mt-1">
                  {{ selectedReport.rows.length }} row{{ selectedReport.rows.length === 1 ? '' : 's' }}
                  <span v-if="isDraftSelected" class="ml-2 text-amber-700 font-bold">· Unsaved</span>
                  <span v-else-if="saveStateLabel" class="ml-2">· {{ saveStateLabel }}</span>
                </p>
              </template>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <template v-if="isDraftSelected">
              <button class="btn-secondary" @click="cancelDraftAndBack">Cancel</button>
              <button class="btn-primary" @click="saveDraftReport">Save</button>
            </template>

            <button
              v-if="isReorderingRows && !isDraftSelected"
              class="btn-primary"
              @click="finishReorderRows"
            >
              Done
            </button>

            <div class="relative">
              <button class="p-2 rounded-lg text-gray-500 hover:bg-gray-100" @click="showDetailReportMenu = !showDetailReportMenu">
                <MoreVertical class="w-5 h-5" />
              </button>

              <div
                v-if="showDetailReportMenu"
                class="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-20"
                @click.stop
              >
                <button class="menu-item" @click="startReportNameEdit">Edit report name</button>
                <button class="menu-item" @click="refreshSelectedReport">Refresh totals</button>
                <button class="menu-item" @click="toggleReorderRows">
                  {{ isReorderingRows ? 'Stop Rearranging Rows' : 'Rearrange Rows' }}
                </button>
                <button class="menu-item" @click="confirmDeleteReport(selectedReport._id)">Delete</button>
              </div>
            </div>
          </div>
        </header>

        <div class="space-y-3 pb-20">
          <p v-if="isReorderingRows" class="text-xs text-gray-500 px-1">
            Drag rows to rearrange order, then tap done.
          </p>

          <draggable
            v-model="rowsForDrag"
            item-key="rowId"
            class="space-y-3"
            handle=".drag-handle"
            :disabled="!isReorderingRows"
            @end="onRowsDragEnd"
          >
            <template #item="{ element: row }">
              <article
                class="relative border rounded-xl px-4 py-3 bg-white"
                :class="isReorderingRows ? 'border-dashed border-gray-300' : 'border-gray-200'"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0 flex items-start gap-2">
                    <button
                      v-if="isReorderingRows"
                      class="drag-handle mt-0.5 p-1 rounded-lg text-gray-400 hover:text-gray-700 cursor-move"
                      @click.stop
                      title="Drag to reorder"
                    >
                      <GripVertical class="w-4 h-4" />
                    </button>

                    <div class="min-w-0">
                      <div class="text-sm font-bold text-gray-900 truncate">
                        {{ rowTitle(row) }}
                      </div>
                      <p class="text-xs text-gray-500 mt-1">
                        {{ rowSubtitle(row) }}
                      </p>
                      <p v-if="getRowIssue(selectedReport._id, row.rowId)" class="text-xs text-red-600 mt-1">
                        {{ getRowIssue(selectedReport._id, row.rowId) }}
                      </p>
                    </div>
                  </div>

                  <div class="flex items-center gap-2">
                    <span class="text-sm font-black" :class="fontColor(getRowAmount(selectedReport._id, row.rowId))">
                      {{ formatPrice(getRowAmount(selectedReport._id, row.rowId), { toFixed: 2 }) }}
                    </span>

                    <div v-if="!isReorderingRows" class="relative">
                      <button class="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100" @click="toggleRowMenu(row.rowId)">
                        <MoreVertical class="w-4 h-4" />
                      </button>

                      <div
                        v-if="activeRowMenuId === row.rowId"
                        class="absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded-xl shadow-lg z-20"
                      >
                        <button class="menu-item" @click="startRowEdit(row)">Edit</button>
                        <button class="menu-item" @click="deleteRowAndSave(row.rowId)">Delete</button>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            </template>
          </draggable>

          <div v-if="!selectedReport.rows.length" class="text-center text-sm text-gray-500 italic py-10">
            No rows yet. Add a row below.
          </div>

          <div class="pt-2 relative">
            <button
              :disabled="isReorderingRows"
              class="w-full border border-gray-300 rounded-xl py-3 text-sm font-black text-gray-800 hover:bg-gray-50"
              :class="isReorderingRows ? 'opacity-50 cursor-not-allowed' : ''"
              @click="showAddRowPicker = !showAddRowPicker"
            >
              Add Tab Row
            </button>

            <div
              v-if="showAddRowPicker"
              class="mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
            >
              <button class="menu-item" @click="addAndEditRow('tab')">Select Existing Tab</button>
              <button class="menu-item" @click="addAndEditRow('manual')">Manually Enter Amount</button>
            </div>
          </div>
        </div>

        <div class="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white">
          <div class="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <span class="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Report Total</span>
            <span class="text-xl font-black" :class="fontColor(getReportTotal(selectedReport._id))">
              {{ formatPrice(getReportTotal(selectedReport._id), { toFixed: 2 }) }}
            </span>
          </div>
        </div>
      </template>

      <div
        v-if="isCreateReportModalOpen"
        class="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
        @click.self="cancelCreateReport"
      >
        <div class="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-2xl p-5">
          <h2 class="text-lg font-black text-gray-900">What do you want to call this report?</h2>

          <label class="block mt-4 text-xs font-black uppercase tracking-wider text-gray-500">
            Report Name
            <input
              v-model="createReportNameDraft"
              class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Monthly Budget"
              @keydown.enter.prevent="confirmCreateReport"
            />
          </label>

          <div class="mt-5 flex items-center justify-end gap-2">
            <button class="btn-secondary" @click="cancelCreateReport">Cancel</button>
            <button
              class="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="!canCreateReport || isCreatingReport"
              @click="confirmCreateReport"
            >
              {{ isCreatingReport ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="isRowEditorOpen && rowEditorDraft"
        class="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
        @click.self="cancelRowEditor"
      >
        <div class="w-full max-w-lg bg-white rounded-2xl border border-gray-200 shadow-2xl p-4 md:p-6">
          <h2 class="text-xl font-black text-gray-900">Edit Row</h2>

          <div class="mt-4 space-y-4">
            <template v-if="rowEditorDraft.type === 'tab'">
              <label class="block text-xs font-black uppercase tracking-wider text-gray-500">
                Tab
                <select v-model="rowEditorDraft.tabId" class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">Select tab</option>
                  <option v-for="tab in sortedTabs" :key="tab._id" :value="tab._id">{{ tab.tabName }}</option>
                </select>
              </label>

              <label class="block text-xs font-black uppercase tracking-wider text-gray-500">
                Group
                <select v-model="rowEditorDraft.groupId" class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">Select group</option>
                  <option v-for="group in sortedGroups" :key="group._id" :value="group._id">{{ group.name }}</option>
                </select>
              </label>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label class="block text-xs font-black uppercase tracking-wider text-gray-500">
                  Start
                  <input type="date" v-model="rowEditorDraft.dateStart" class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </label>
                <label class="block text-xs font-black uppercase tracking-wider text-gray-500">
                  End
                  <input type="date" v-model="rowEditorDraft.dateEnd" class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </label>
              </div>

              <div>
                <button class="btn-secondary" @click="showQuickSelect = !showQuickSelect">Quick Select</button>
                <div v-if="showQuickSelect" class="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                  <button class="chip-btn" @click="applyQuickSelect('today')">Today</button>
                  <button class="chip-btn" @click="applyQuickSelect('prevMonth')">Prev Month</button>
                  <button class="chip-btn" @click="applyQuickSelect('nextMonth')">Next Month</button>
                  <button class="chip-btn" @click="applyQuickSelect('prevYear')">Prev Year</button>
                  <button class="chip-btn" @click="applyQuickSelect('nextYear')">Next Year</button>
                  <button class="chip-btn" @click="applyQuickSelect('last30Days')">Last 30</button>
                  <button class="chip-btn" @click="applyQuickSelect('last90Days')">Last 90</button>
                </div>
              </div>
            </template>

            <template v-else>
              <label class="block text-xs font-black uppercase tracking-wider text-gray-500">
                Title
                <input v-model="rowEditorDraft.title" type="text" class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </label>

              <label class="block text-xs font-black uppercase tracking-wider text-gray-500">
                Amount
                <input v-model.number="rowEditorDraft.amount" type="number" step="0.01" class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </label>
            </template>
          </div>

          <div class="mt-6 flex items-center justify-end gap-2">
            <button
              class="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="isSavingRow"
              @click="cancelRowEditor"
            >
              Cancel
            </button>
            <button
              class="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="isSavingRow"
              @click="saveRowEditor"
            >
              {{ isSavingRow ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import {
  addMonths,
  addYears,
  endOfMonth,
  endOfYear,
  format as formatDate,
  isSameMonth,
  isSameYear,
  isValid,
  parseISO,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
  subYears
} from 'date-fns';
import { ChevronLeft, GripVertical, MoreVertical, Plus } from 'lucide-vue-next';
import draggable from 'vuedraggable';
import LoadingDots from '@/shared/components/LoadingDots.vue';
import ReportsEmptyState from '@/features/reports/components/ReportsEmptyState.vue';
import { useReportsState } from '@/features/reports/composables/useReportsState.js';
import { useUtils } from '@/shared/composables/useUtils.js';

const {
  state,
  sortedTabs,
  sortedGroups,
  hasReports,
  isDraftReport,
  initReports,
  createReport,
  cancelDraftReport,
  deleteReport,
  saveReport,
  updateReportName,
  addTabRow,
  addManualRow,
  updateRow,
  removeRow,
  reorderRows,
  reorderReports,
  saveReportLayout,
  saveReportsOrder,
  refreshRowTotal,
  getRowAmount,
  getRowIssue,
  getReportTotal,
  refreshReportTotals
} = useReportsState();

const { formatPrice, fontColor } = useUtils();

const selectedReportId = ref('');
const activeReportMenuId = ref('');
const activeRowMenuId = ref('');
const showAddRowPicker = ref(false);
const showListMenu = ref(false);

const showDetailReportMenu = ref(false);
const isEditingReportName = ref(false);
const reportNameDraft = ref('');

const isRowEditorOpen = ref(false);
const rowEditorDraft = ref(null);
const editingRowId = ref('');
const editingRowWasNew = ref(false);
const showQuickSelect = ref(false);
const isSavingRow = ref(false);
const isCreateReportModalOpen = ref(false);
const createReportNameDraft = ref('');
const isCreatingReport = ref(false);
const isReorderingReports = ref(false);
const isReorderingRows = ref(false);

const selectedReport = computed(() =>
  state.reports.find(report => report._id === selectedReportId.value) || null
);

const isDraftSelected = computed(() => isDraftReport(selectedReport.value));
const canCreateReport = computed(() => Boolean(createReportNameDraft.value.trim()));

const reportsForDrag = computed({
  get() {
    return [...state.reports].sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0));
  },
  set(nextReports) {
    reorderReports(nextReports);
  }
});

const rowsForDrag = computed({
  get() {
    if (!selectedReport.value) return [];
    return [...selectedReport.value.rows].sort((a, b) => a.sort - b.sort);
  },
  set(nextRows) {
    if (!selectedReport.value) return;
    reorderRows(selectedReport.value._id, nextRows);
  }
});

const saveStateLabel = computed(() => {
  if (!selectedReport.value) return '';

  const status = state.saveStatusByReportId[selectedReport.value._id];
  if (status === 'refreshing') return 'Refreshing totals...';
  if (status === 'saving') return 'Saving...';
  if (status === 'saved') return 'Saved';
  if (status === 'error') return 'Save failed';
  return '';
});

function tabName(tabId) {
  return sortedTabs.value.find(tab => tab._id === tabId)?.tabName || 'Tab not found';
}

function groupName(groupId) {
  return sortedGroups.value.find(group => group._id === groupId)?.name || 'Group not found';
}

function rowTitle(row) {
  if (row.type === 'manual') {
    return row.title || 'Untitled manual row';
  }

  return tabName(row.tabId);
}

function rowSubtitle(row) {
  if (row.type === 'manual') {
    return 'Manual row';
  }

  return `${groupName(row.groupId)} · ${row.dateStart || '—'} to ${row.dateEnd || '—'}`;
}

function openReport(reportId) {
  selectedReportId.value = reportId;
  activeReportMenuId.value = '';
  activeRowMenuId.value = '';
  showListMenu.value = false;
  showDetailReportMenu.value = false;
  showAddRowPicker.value = false;
  isReorderingRows.value = false;
}

function openReportFromList(reportId) {
  if (isReorderingReports.value) return;
  openReport(reportId);
}

function backToList() {
  if (isDraftSelected.value) {
    const shouldDiscard = confirm('Discard this new report?');
    if (!shouldDiscard) {
      return;
    }

    cancelDraftReport(selectedReport.value._id);
  }

  selectedReportId.value = '';
  activeReportMenuId.value = '';
  activeRowMenuId.value = '';
  showListMenu.value = false;
  showDetailReportMenu.value = false;
  showAddRowPicker.value = false;
  isReorderingRows.value = false;
  cancelReportNameEdit();
  cancelRowEditor();
}

function toggleReportMenu(reportId) {
  if (isReorderingReports.value) return;
  activeReportMenuId.value = activeReportMenuId.value === reportId ? '' : reportId;
}

function toggleRowMenu(rowId) {
  if (isReorderingRows.value) return;
  activeRowMenuId.value = activeRowMenuId.value === rowId ? '' : rowId;
}

function toggleReorderReports() {
  isReorderingReports.value = !isReorderingReports.value;
  showListMenu.value = false;
  activeReportMenuId.value = '';
}

async function onReportsDragEnd() {
  if (!isReorderingReports.value) return;
  await saveReportsOrder();
}

async function finishReorderReports() {
  if (!isReorderingReports.value) return;
  await saveReportsOrder();
  isReorderingReports.value = false;
}

function toggleReorderRows() {
  isReorderingRows.value = !isReorderingRows.value;
  activeRowMenuId.value = '';
  showAddRowPicker.value = false;
  showDetailReportMenu.value = false;
}

async function onRowsDragEnd() {
  if (!selectedReport.value || !isReorderingRows.value) return;
  await saveReportLayout(selectedReport.value._id);
}

async function finishReorderRows() {
  if (!selectedReport.value) return;
  await saveReportLayout(selectedReport.value._id);
  isReorderingRows.value = false;
}

async function createFirstReport() {
  openCreateReportModal();
}

async function createNewReportFromFab() {
  openCreateReportModal();
}

function openCreateReportModal() {
  isReorderingReports.value = false;
  showListMenu.value = false;
  activeReportMenuId.value = '';
  createReportNameDraft.value = '';
  isCreateReportModalOpen.value = true;
}

function cancelCreateReport() {
  if (isCreatingReport.value) return;
  isCreateReportModalOpen.value = false;
  createReportNameDraft.value = '';
}

async function confirmCreateReport() {
  if (!canCreateReport.value || isCreatingReport.value) return;

  isCreatingReport.value = true;
  const report = await createReport(createReportNameDraft.value.trim());
  isCreatingReport.value = false;

  if (!report?._id) return;

  isCreateReportModalOpen.value = false;
  createReportNameDraft.value = '';
  openReport(report._id);
}

function startRenameFromList(report) {
  openReport(report._id);
  startReportNameEdit();
}

function startReportNameEdit() {
  if (!selectedReport.value) return;

  isReorderingRows.value = false;
  isEditingReportName.value = true;
  reportNameDraft.value = selectedReport.value.name;
  showDetailReportMenu.value = false;
}

function cancelReportNameEdit() {
  isEditingReportName.value = false;
  reportNameDraft.value = '';
}

async function saveReportName() {
  if (!selectedReport.value) return;

  updateReportName(selectedReport.value._id, reportNameDraft.value);

  if (isDraftSelected.value) {
    cancelReportNameEdit();
    return;
  }

  const saved = await saveReport(selectedReport.value._id);
  if (saved?._id) {
    selectedReportId.value = saved._id;
    cancelReportNameEdit();
  }
}

async function saveDraftReport() {
  if (!selectedReport.value || !isDraftSelected.value) return;

  const saved = await saveReport(selectedReport.value._id);
  if (saved?._id) {
    selectedReportId.value = saved._id;
  }
}

function cancelDraftAndBack() {
  if (!selectedReport.value || !isDraftSelected.value) return;

  const shouldDiscard = confirm('Discard this new report?');
  if (!shouldDiscard) return;

  cancelDraftReport(selectedReport.value._id);
  selectedReportId.value = '';
  showDetailReportMenu.value = false;
  showAddRowPicker.value = false;
}

function startRowEdit(row) {
  rowEditorDraft.value = { ...row };
  editingRowId.value = row.rowId;
  editingRowWasNew.value = false;
  isRowEditorOpen.value = true;
  activeRowMenuId.value = '';
  showQuickSelect.value = false;
}

function addAndEditRow(type) {
  if (!selectedReport.value) return;

  const newRow = type === 'tab'
    ? addTabRow(selectedReport.value._id)
    : addManualRow(selectedReport.value._id);

  showDetailReportMenu.value = false;
  showAddRowPicker.value = false;

  if (!newRow) return;

  rowEditorDraft.value = { ...newRow };
  editingRowId.value = newRow.rowId;
  editingRowWasNew.value = true;
  isRowEditorOpen.value = true;
  showQuickSelect.value = false;
}

function cancelRowEditor() {
  if (isSavingRow.value) return;

  if (selectedReport.value && editingRowWasNew.value && editingRowId.value) {
    removeRow(selectedReport.value._id, editingRowId.value);
  }

  rowEditorDraft.value = null;
  editingRowId.value = '';
  editingRowWasNew.value = false;
  isRowEditorOpen.value = false;
  showQuickSelect.value = false;
}

async function saveRowEditor() {
  if (!selectedReport.value || !rowEditorDraft.value || !editingRowId.value || isSavingRow.value) return;

  isSavingRow.value = true;

  try {
    const reportId = selectedReport.value._id;
    const rowId = editingRowId.value;

    updateRow(reportId, rowId, rowEditorDraft.value);
    await refreshRowTotal(reportId, rowId, { forceTransactionReload: true });

    if (!isDraftSelected.value) {
      const saved = await saveReport(reportId);
      if (saved?._id) {
        selectedReportId.value = saved._id;
      }
    }

    rowEditorDraft.value = null;
    editingRowId.value = '';
    editingRowWasNew.value = false;
    isRowEditorOpen.value = false;
    showQuickSelect.value = false;
  } finally {
    isSavingRow.value = false;
  }
}

async function refreshSelectedReport() {
  if (!selectedReport.value) return;

  showDetailReportMenu.value = false;
  await refreshReportTotals(selectedReport.value._id);
}

async function refreshReportFromList(reportId) {
  activeReportMenuId.value = '';
  await refreshReportTotals(reportId);
}

async function deleteRowAndSave(rowId) {
  if (!selectedReport.value) return;

  removeRow(selectedReport.value._id, rowId);
  activeRowMenuId.value = '';

  if (!isDraftSelected.value) {
    await saveReport(selectedReport.value._id);
  }
}

async function confirmDeleteReport(reportId) {
  const shouldDelete = confirm('Delete this report?');
  if (!shouldDelete) {
    return;
  }

  await deleteReport(reportId);

  if (selectedReportId.value === reportId) {
    selectedReportId.value = '';
  }

  activeReportMenuId.value = '';
  showDetailReportMenu.value = false;
  showAddRowPicker.value = false;
}

function parseDateInput(value) {
  if (!value) return new Date();
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : new Date();
}

function setDraftDateRange(startDate, endDate) {
  if (!rowEditorDraft.value || rowEditorDraft.value.type !== 'tab') return;

  rowEditorDraft.value.dateStart = formatDate(startDate, 'yyyy-MM-dd');
  rowEditorDraft.value.dateEnd = formatDate(endDate, 'yyyy-MM-dd');
}

function applyQuickSelect(period) {
  if (!rowEditorDraft.value || rowEditorDraft.value.type !== 'tab') return;

  const today = new Date();
  const currentStart = parseDateInput(rowEditorDraft.value.dateStart);
  const currentEnd = parseDateInput(rowEditorDraft.value.dateEnd);

  const monthRange =
    isSameMonth(currentStart, currentEnd)
    && formatDate(currentStart, 'yyyy-MM-dd') === formatDate(startOfMonth(currentStart), 'yyyy-MM-dd')
    && formatDate(currentEnd, 'yyyy-MM-dd') === formatDate(endOfMonth(currentEnd), 'yyyy-MM-dd');

  const yearRange =
    isSameYear(currentStart, currentEnd)
    && formatDate(currentStart, 'yyyy-MM-dd') === formatDate(startOfYear(currentStart), 'yyyy-MM-dd')
    && formatDate(currentEnd, 'yyyy-MM-dd') === formatDate(endOfYear(currentEnd), 'yyyy-MM-dd');

  switch (period) {
    case 'today':
      setDraftDateRange(today, today);
      break;
    case 'prevMonth': {
      const base = monthRange ? subMonths(currentStart, 1) : subMonths(today, 1);
      setDraftDateRange(startOfMonth(base), endOfMonth(base));
      break;
    }
    case 'nextMonth': {
      const base = monthRange ? addMonths(currentStart, 1) : addMonths(today, 1);
      setDraftDateRange(startOfMonth(base), endOfMonth(base));
      break;
    }
    case 'prevYear': {
      const base = yearRange ? subYears(currentStart, 1) : subYears(today, 1);
      setDraftDateRange(startOfYear(base), endOfYear(base));
      break;
    }
    case 'nextYear': {
      const base = yearRange ? addYears(currentStart, 1) : addYears(today, 1);
      setDraftDateRange(startOfYear(base), endOfYear(base));
      break;
    }
    case 'last30Days':
      setDraftDateRange(subDays(today, 30), today);
      break;
    case 'last90Days':
      setDraftDateRange(subDays(today, 90), today);
      break;
    default:
      break;
  }
}

onMounted(() => {
  initReports();
});
</script>

<style scoped>
.menu-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.6rem 0.9rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: #1f2937;
}

.menu-item:hover {
  background: #f9fafb;
}

.btn-primary {
  border-radius: 0.6rem;
  padding: 0.55rem 0.9rem;
  background: #111827;
  color: white;
  font-size: 0.85rem;
  font-weight: 800;
}

.btn-primary:hover {
  background: #1f2937;
}

.btn-secondary {
  border-radius: 0.6rem;
  padding: 0.55rem 0.9rem;
  border: 1px solid #d1d5db;
  color: #374151;
  font-size: 0.85rem;
  font-weight: 700;
}

.btn-secondary:hover {
  background: #f9fafb;
}

.chip-btn {
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  padding: 0.45rem 0.55rem;
  font-size: 0.72rem;
  font-weight: 700;
  color: #374151;
  background: #fff;
}

.chip-btn:hover {
  background: #f9fafb;
}
</style>
