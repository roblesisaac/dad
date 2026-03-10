<template>
  <div class="border border-gray-200 rounded-xl p-3 bg-white">
    <div class="flex items-start gap-3">
      <div class="handler-row mt-2 text-gray-400 cursor-grab">
        <GripVertical class="w-4 h-4" />
      </div>

      <div class="flex-1 space-y-3">
        <div class="flex items-center justify-between gap-3">
          <span class="text-xs font-black uppercase tracking-widest text-gray-400">{{ row.type }} row</span>
          <span class="text-sm font-bold" :class="fontColor(amount)">
            {{ formatPrice(amount, { toFixed: 2 }) }}
          </span>
        </div>

        <template v-if="row.type === 'tab'">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label class="text-xs font-bold text-gray-600 uppercase tracking-wide">
              Tab
              <select
                class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                :value="row.tabId"
                @change="emitUpdate({ tabId: $event.target.value })"
              >
                <option value="">Select tab</option>
                <option v-for="tab in tabs" :key="tab._id" :value="tab._id">
                  {{ tab.tabName }}
                </option>
              </select>
            </label>

            <label class="text-xs font-bold text-gray-600 uppercase tracking-wide">
              Group
              <select
                class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                :value="row.groupId"
                @change="emitUpdate({ groupId: $event.target.value })"
              >
                <option value="">Select group</option>
                <option v-for="group in groups" :key="group._id" :value="group._id">
                  {{ group.name }}
                </option>
              </select>
            </label>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label class="text-xs font-bold text-gray-600 uppercase tracking-wide">
              Start
              <input
                type="date"
                class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                :value="row.dateStart"
                @input="emitUpdate({ dateStart: $event.target.value })"
              />
            </label>

            <label class="text-xs font-bold text-gray-600 uppercase tracking-wide">
              End
              <input
                type="date"
                class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                :value="row.dateEnd"
                @input="emitUpdate({ dateEnd: $event.target.value })"
              />
            </label>
          </div>

          <p v-if="issue" class="text-xs font-semibold text-black-600">
            {{ issue }}
          </p>
        </template>

        <template v-else>
          <div class="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-3">
            <label class="text-xs font-bold text-gray-600 uppercase tracking-wide">
              Title
              <input
                type="text"
                class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                :value="row.title"
                placeholder="Row title"
                @input="emitUpdate({ title: $event.target.value })"
              />
            </label>

            <label class="text-xs font-bold text-gray-600 uppercase tracking-wide">
              Amount
              <input
                type="number"
                step="0.01"
                class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                :value="row.amount"
                @input="onManualAmountInput"
              />
            </label>
          </div>
        </template>
      </div>

      <button
        class="text-gray-400 hover:text-black-600 transition-colors mt-2"
        @click="$emit('remove-row', row.rowId)"
        title="Remove row"
      >
        <Trash2 class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { GripVertical, Trash2 } from 'lucide-vue-next';
import { useUtils } from '@/shared/composables/useUtils.js';

const props = defineProps({
  row: {
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
  amount: {
    type: Number,
    default: 0
  },
  issue: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update-row', 'remove-row']);

const { fontColor, formatPrice } = useUtils();

function emitUpdate(patch) {
  emit('update-row', {
    rowId: props.row.rowId,
    updates: patch
  });
}

function onManualAmountInput(event) {
  const value = event.target.value;
  emitUpdate({ amount: value === '' ? 0 : Number(value) });
}
</script>
