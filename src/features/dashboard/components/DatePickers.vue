<template>
  <div class="flex items-center space-x-6 px-4 py-3 bg-white border-b border-gray-200">
    <!-- Selected Group -->
    <div class="flex items-center space-x-2">
      <span class="text-sm font-medium text-gray-500">Group:</span>
      <span class="font-medium text-gray-900">
        {{ state.selected.group.name }}
      </span>
    </div>

    <!-- Date Range -->
    <div class="flex items-center space-x-4">
      <DatePicker 
        label="From" 
        :modelValue="state.selected.fromDate"
        @update:modelValue="(date) => updateDate('fromDate', date)"
      />
      <DatePicker 
        label="To" 
        :modelValue="state.selected.toDate"
        @update:modelValue="(date) => updateDate('toDate', date)"
      />
    </div>
  </div>
</template>

<script setup>
import { watch } from 'vue';
import DatePicker from './DatePicker.vue';
import { useAppStore } from '@/stores/state';

const { api } = useAppStore();

const props = defineProps({
  state: Object
});

async function updateDate(dateType, newDate) {
  props.state.selected[dateType] = newDate;
}

watch(
  () => [props.state.selected.fromDate, props.state.selected.toDate],
  async () => {
    const { fromDate, toDate } = props.state.selected;
    await api.put(`api/groups/${props.state.selected.group._id}`, {
      fromDate,
      toDate
    });
  }
);
</script>