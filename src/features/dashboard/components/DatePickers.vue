<template>
<div class="relative w-full">
  <!-- Date Range Summary (Clickable to expand) -->
  <div 
    @click="toggleDatePicker"
    class="w-full h-full flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors"
  >
    <div class="flex items-center">
      <Calendar class="h-4 w-4 mr-2 text-gray-700" />
      <span class="text-sm font-medium">{{ dateRangeSummary }}</span>
    </div>
    <ChevronDown 
      class="h-4 w-4 text-gray-600 transition-transform duration-200"
      :class="{ 'transform rotate-180': showDatePicker }"
    />
  </div>
  
  <!-- Expanded Date Pickers -->
  <div 
    v-if="showDatePicker" 
    class="absolute mt-1 left-0 right-0 z-20 bg-white border-2 border-black shadow-[4px_4px_0px_#000] p-4"
  >
    <div class="mb-4">
      <div class="text-xs font-bold mb-2 text-gray-700 uppercase">Start Date</div>
      <DatePicker 
        :date="tempDate" 
        when="start" 
        @date-selected="onDateSelected"
      />
    </div>
    
    <div class="border-t border-gray-300 my-4"></div>
    
    <div>
      <div class="text-xs font-bold mb-2 text-gray-700 uppercase">End Date</div>
      <DatePicker 
        :date="tempDate" 
        when="end" 
        @date-selected="onDateSelected"
      />
    </div>
    
    <div class="flex justify-end mt-4">
      <button 
        @click="applyDates" 
        class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium border border-blue-900 shadow-[2px_2px_0px_#000] hover:shadow-[1px_1px_0px_#000] transition-all duration-200"
      >
        Apply
      </button>
    </div>
  </div>
</div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue';
import { format, isValid, parseISO, startOfMonth } from 'date-fns';
import DatePicker from './DatePicker.vue';
import { Calendar, ChevronDown } from 'lucide-vue-next';
import { useDashboardState } from '../composables/useDashboardState';

const { state } = useDashboardState();
const showDatePicker = ref(false);
const tempDate = reactive({
  start: null,
  end: null
});

// Initialize default date range (1st of current month to today)
onMounted(() => {
  // Only set if not already set
  if (state.date.start === 'firstOfMonth') {
    state.date.start = startOfMonth(new Date());
  }
  
  if (state.date.end === 'today') {
    state.date.end = new Date();
  }
  
  // Initialize temp dates with current values
  tempDate.start = state.date.start;
  tempDate.end = state.date.end;
});

const toggleDatePicker = () => {
  showDatePicker.value = !showDatePicker.value;
  
  // Reset temp dates to current values when opening
  if (showDatePicker.value) {
    tempDate.start = state.date.start;
    tempDate.end = state.date.end;
  }
};

const onDateSelected = () => {
  // This now only updates the temporary date values
};

const applyDates = () => {
  // Only update the actual state dates when Apply is clicked
  state.date.start = tempDate.start;
  state.date.end = tempDate.end;
  showDatePicker.value = false;
};

const formatDate = (date) => {
  if (!date) return '';
  
  if (date === 'firstOfMonth') {
    return format(startOfMonth(new Date()), 'MMM d');
  }
  
  if (date === 'today') {
    return format(new Date(), 'MMM d');
  }
  
  // If it's a string, try to parse it
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(dateObj)) return '';
  
  return format(dateObj, 'MMM d');
};

const dateRangeSummary = computed(() => {
  const start = formatDate(state.date.start);
  const end = formatDate(state.date.end);
  
  if (!start && !end) return 'Select date range';
  if (!end) return `From ${start}`;
  if (!start) return `Until ${end}`;
  
  if (start === end) {
    return start; // Same day
  }
  
  return `${start} - ${end}`;
});
</script>