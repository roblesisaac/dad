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
        <header class="mb-6">
          <h1 class="text-3xl font-black tracking-tight text-gray-900">Reports</h1>
          <p class="text-sm text-gray-500 mt-1">Tap a report to see all rows and totals.</p>
        </header>

        <div class="space-y-4">
          <article
            v-for="report in state.reports"
            :key="report._id"
            class="relative border-2 border-gray-100 rounded-2xl p-4 bg-white shadow-sm cursor-pointer hover:border-gray-200 transition-colors"
            @click="openReport(report._id)"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <h2 class="text-xl font-black text-gray-900">{{ report.name }}</h2>
              </div>

              <div class="flex items-center gap-2">
                <span class="text-sm font-black" :class="fontColor(getReportTotal(report._id))">
                  {{ formatPrice(getReportTotal(report._id), { toFixed: 2 }) }}
                </span>
                <div class="relative">
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
                    <button class="menu-item" @click="startRenameFromList(report)">Rename</button>
                    <button class="menu-item" @click="confirmDeleteReport(report._id)">Delete</button>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>

        <button
          class="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-black text-white shadow-xl hover:bg-gray-800 flex items-center justify-center"
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
                  <span v-if="saveStateLabel" class="ml-2">· {{ saveStateLabel }}</span>
                </p>
              </template>
            </div>
          </div>

          <div class="relative">
            <button class="p-2 rounded-lg text-gray-500 hover:bg-gray-100" @click="showDetailReportMenu = !showDetailReportMenu">
              <MoreVertical class="w-5 h-5" />
            </button>

            <div
              v-if="showDetailReportMenu"
              class="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-20"
            >
              <button class="menu-item" @click="startReportNameEdit">Edit report name</button>
              <button class="menu-item" @click="addAndEditRow('tab')">Add tab row</button>
              <button class="menu-item" @click="addAndEditRow('manual')">Add manual row</button>
              <button class="menu-item" @click="confirmDeleteReport(selectedReport._id)">Delete report</button>
            </div>
          </div>
        </header>

        <div class="space-y-3 pb-20">
          <article
            v-for="row in sortedRows(selectedReport.rows)"
            :key="row.rowId"
            class="relative border border-gray-200 rounded-xl px-4 py-3 bg-white"
          >
            <div class="flex items-start justify-between gap-3">
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

              <div class="flex items-center gap-2">
                <span class="text-sm font-black" :class="fontColor(getRowAmount(selectedReport._id, row.rowId))">
                  {{ formatPrice(getRowAmount(selectedReport._id, row.rowId), { toFixed: 2 }) }}
                </span>

                <div class="relative">
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

          <div v-if="!selectedReport.rows.length" class="text-center text-sm text-gray-500 italic py-10">
            No rows yet. Open the menu to add a row.
          </div>

          <div class="pt-2">
            <button
              class="w-full border border-gray-300 rounded-xl py-3 text-sm font-black text-gray-800 hover:bg-gray-50"
              @click="addAndEditRow('tab')"
            >
              Add Tab Row
            </button>
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
            <button class="btn-secondary" @click="cancelRowEditor">Cancel</button>
            <button class="btn-primary" @click="saveRowEditor">Save</button>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { ChevronLeft, MoreVertical, Plus } from 'lucide-vue-next';
import LoadingDots from '@/shared/components/LoadingDots.vue';
import ReportsEmptyState from '@/features/reports/components/ReportsEmptyState.vue';
import { useReportsState } from '@/features/reports/composables/useReportsState.js';
import { useUtils } from '@/shared/composables/useUtils.js';

const {
  state,
  sortedTabs,
  sortedGroups,
  hasReports,
  initReports,
  createReport,
  deleteReport,
  saveReport,
  updateReportName,
  addTabRow,
  addManualRow,
  updateRow,
  removeRow,
  getRowAmount,
  getRowIssue,
  getReportTotal
} = useReportsState();

const { formatPrice, fontColor } = useUtils();

const selectedReportId = ref('');
const activeReportMenuId = ref('');
const activeRowMenuId = ref('');

const showDetailReportMenu = ref(false);
const isEditingReportName = ref(false);
const reportNameDraft = ref('');

const isRowEditorOpen = ref(false);
const rowEditorDraft = ref(null);
const editingRowId = ref('');
const editingRowWasNew = ref(false);

const selectedReport = computed(() =>
  state.reports.find(report => report._id === selectedReportId.value) || null
);

const saveStateLabel = computed(() => {
  if (!selectedReport.value) return '';

  const status = state.saveStatusByReportId[selectedReport.value._id];
  if (status === 'saving') return 'Saving...';
  if (status === 'saved') return 'Saved';
  if (status === 'error') return 'Save failed';
  return '';
});

function sortedRows(rows) {
  return [...(rows || [])].sort((a, b) => a.sort - b.sort);
}

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
  showDetailReportMenu.value = false;
}

function backToList() {
  selectedReportId.value = '';
  activeReportMenuId.value = '';
  activeRowMenuId.value = '';
  showDetailReportMenu.value = false;
  cancelReportNameEdit();
  cancelRowEditor();
}

function toggleReportMenu(reportId) {
  activeReportMenuId.value = activeReportMenuId.value === reportId ? '' : reportId;
}

function toggleRowMenu(rowId) {
  activeRowMenuId.value = activeRowMenuId.value === rowId ? '' : rowId;
}

async function createFirstReport() {
  const report = await createReport();
  if (report?._id) {
    openReport(report._id);
  }
}

async function createNewReportFromFab() {
  const report = await createReport();
  if (report?._id) {
    openReport(report._id);
  }
}

function startRenameFromList(report) {
  openReport(report._id);
  startReportNameEdit();
}

function startReportNameEdit() {
  if (!selectedReport.value) return;

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
  const saved = await saveReport(selectedReport.value._id);

  if (saved) {
    cancelReportNameEdit();
  }
}

function startRowEdit(row) {
  rowEditorDraft.value = { ...row };
  editingRowId.value = row.rowId;
  editingRowWasNew.value = false;
  isRowEditorOpen.value = true;
  activeRowMenuId.value = '';
}

function addAndEditRow(type) {
  if (!selectedReport.value) return;

  const newRow = type === 'tab'
    ? addTabRow(selectedReport.value._id)
    : addManualRow(selectedReport.value._id);

  showDetailReportMenu.value = false;

  if (!newRow) return;

  rowEditorDraft.value = { ...newRow };
  editingRowId.value = newRow.rowId;
  editingRowWasNew.value = true;
  isRowEditorOpen.value = true;
}

function cancelRowEditor() {
  if (selectedReport.value && editingRowWasNew.value && editingRowId.value) {
    removeRow(selectedReport.value._id, editingRowId.value, { skipRefresh: true });
  }

  rowEditorDraft.value = null;
  editingRowId.value = '';
  editingRowWasNew.value = false;
  isRowEditorOpen.value = false;
}

async function saveRowEditor() {
  if (!selectedReport.value || !rowEditorDraft.value || !editingRowId.value) return;

  const reportId = selectedReport.value._id;
  const rowId = editingRowId.value;

  updateRow(reportId, rowId, rowEditorDraft.value, { skipRefresh: true });
  const saved = await saveReport(reportId);

  if (saved) {
    rowEditorDraft.value = null;
    editingRowId.value = '';
    editingRowWasNew.value = false;
    isRowEditorOpen.value = false;
  }
}

async function deleteRowAndSave(rowId) {
  if (!selectedReport.value) return;

  removeRow(selectedReport.value._id, rowId, { skipRefresh: true });
  activeRowMenuId.value = '';
  await saveReport(selectedReport.value._id);
}

async function confirmDeleteReport(reportId) {
  if (!confirm('Delete this report?')) {
    return;
  }

  await deleteReport(reportId);

  if (selectedReportId.value === reportId) {
    backToList();
  }

  activeReportMenuId.value = '';
  showDetailReportMenu.value = false;
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
</style>
