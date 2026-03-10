<template>
  <article class="border-2 border-gray-100 rounded-2xl bg-white shadow-sm overflow-hidden">
    <header class="px-4 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
      <div class="flex-1">
        <input
          class="w-full text-xl font-black tracking-tight text-gray-900 bg-transparent border-b border-transparent focus:border-black outline-none pb-1"
          :value="report.name"
          @input="emitRename($event.target.value)"
          placeholder="Report name"
        />
        <p class="text-xs text-gray-500 mt-1">
          {{ saveLabel }}
        </p>
      </div>

      <div class="text-right">
        <div class="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-black">Total</div>
        <div class="text-lg font-black" :class="fontColor(total)">
          {{ formatPrice(total, { toFixed: 2 }) }}
        </div>
      </div>

      <button
        class="text-gray-400 hover:text-black-600 transition-colors"
        @click="$emit('delete-report', report._id)"
        title="Delete report"
      >
        <Trash2 class="w-5 h-5" />
      </button>
    </header>

    <div class="px-4 py-4 border-b border-gray-100 flex flex-wrap gap-2">
      <button
        class="px-3 py-2 text-sm font-bold rounded-lg border border-gray-300 hover:bg-gray-50"
        @click="$emit('add-tab-row', report._id)"
      >
        + Tab Row
      </button>
      <button
        class="px-3 py-2 text-sm font-bold rounded-lg border border-gray-300 hover:bg-gray-50"
        @click="$emit('add-manual-row', report._id)"
      >
        + Manual Row
      </button>
    </div>

    <div class="p-4">
      <p v-if="!orderedRows.length" class="text-sm text-gray-500 italic px-2 py-4">
        No rows yet. Add a tab row or a manual row.
      </p>

      <Draggable
        v-else
        v-model="rowsModel"
        item-key="rowId"
        handle=".handler-row"
        v-bind="dragOptions"
        class="space-y-3"
      >
        <template #item="{ element }">
          <ReportRowItem
            :row="element"
            :tabs="tabs"
            :groups="groups"
            :amount="rowAmountFor(element.rowId)"
            :issue="rowIssueFor(element.rowId)"
            @update-row="onUpdateRow"
            @remove-row="onRemoveRow"
          />
        </template>
      </Draggable>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue';
import { Trash2 } from 'lucide-vue-next';
import ReportRowItem from '@/features/reports/components/ReportRowItem.vue';
import { useUtils } from '@/shared/composables/useUtils.js';
import { useDraggable } from '@/shared/composables/useDraggable.js';

const props = defineProps({
  report: {
    type: Object,
    required: true
  },
  tabs: {
    type: Array,
    required: true
  },
  groups: {
    type: Array,
    required: true
  },
  total: {
    type: Number,
    default: 0
  },
  saveStatus: {
    type: String,
    default: 'idle'
  },
  rowAmountFor: {
    type: Function,
    required: true
  },
  rowIssueFor: {
    type: Function,
    required: true
  }
});

const emit = defineEmits([
  'rename-report',
  'delete-report',
  'add-tab-row',
  'add-manual-row',
  'update-row',
  'remove-row',
  'reorder-rows'
]);

const { fontColor, formatPrice } = useUtils();
const { Draggable, dragOptions } = useDraggable();

const orderedRows = computed(() =>
  [...props.report.rows].sort((a, b) => a.sort - b.sort)
);

const rowsModel = computed({
  get: () => orderedRows.value,
  set: (rows) => {
    emit('reorder-rows', {
      reportId: props.report._id,
      rows
    });
  }
});

const saveLabel = computed(() => {
  if (props.saveStatus === 'saving') return 'Saving...';
  if (props.saveStatus === 'saved') return 'Saved';
  if (props.saveStatus === 'error') return 'Save failed';
  return 'All changes autosave';
});

function emitRename(name) {
  emit('rename-report', {
    reportId: props.report._id,
    name
  });
}

function onUpdateRow(payload) {
  emit('update-row', {
    reportId: props.report._id,
    ...payload
  });
}

function onRemoveRow(rowId) {
  emit('remove-row', {
    reportId: props.report._id,
    rowId
  });
}
</script>
