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
  
  <!-- Date Picker Modal -->
  <BaseModal
    :is-open="showDatePicker"
    title="Select Date Range"
    size="md"
    @close="showDatePicker = false"
  >
    <template #content>
      <!-- Quick Navigation Buttons -->
      <div class="mb-6">
        <div class="text-xs font-bold mb-2 text-gray-700 uppercase">Quick Select</div>
        
        <!-- Today -->
        <div class="flex mb-3">
          <button 
            @click="quickSelect('today')" 
            class="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-sm font-medium border border-gray-300 rounded transition-colors"
          >
            Today
          </button>
        </div>
        
        <!-- Month Navigation -->
        <div class="flex gap-2 mb-3">
          <button 
            @click="quickSelect('prevMonth')" 
            class="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-sm font-medium border border-gray-300 rounded transition-colors flex items-center justify-center"
          >
            <ChevronLeft class="h-4 w-4 mr-1" />
            Previous Month
          </button>
          <button 
            @click="quickSelect('nextMonth')" 
            class="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-sm font-medium border border-gray-300 rounded transition-colors flex items-center justify-center"
          >
            Next Month
            <ChevronRight class="h-4 w-4 ml-1" />
          </button>
        </div>
        
        <!-- Year Navigation -->
        <div class="flex gap-2 mb-3">
          <button 
            @click="quickSelect('prevYear')" 
            class="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-sm font-medium border border-gray-300 rounded transition-colors flex items-center justify-center"
          >
            <ChevronLeft class="h-4 w-4 mr-1" />
            Previous Year
          </button>
          <button 
            @click="quickSelect('nextYear')" 
            class="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-sm font-medium border border-gray-300 rounded transition-colors flex items-center justify-center"
          >
            Next Year
            <ChevronRight class="h-4 w-4 ml-1" />
          </button>
        </div>
        
        <!-- Common Date Ranges -->
        <div class="flex gap-2">
          <button 
            @click="quickSelect('last30Days')" 
            class="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-sm font-medium border border-gray-300 rounded transition-colors"
          >
            Last 30 Days
          </button>
          <button 
            @click="quickSelect('last90Days')" 
            class="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-sm font-medium border border-gray-300 rounded transition-colors"
          >
            Last 90 Days
          </button>
        </div>
      </div>
      
      <!-- Custom Date Pickers -->
      <div class="mb-4">
        <div class="text-xs font-bold mb-2 text-gray-700 uppercase">Start Date</div>
        <DatePicker 
          :date="tempDate" 
          when="start" 
          @date-selected="onDateSelected"
        />
      </div>
      
      <div class="border-t border-gray-300 my-4"></div>
      
      <div class="mb-4">
        <div class="text-xs font-bold mb-2 text-gray-700 uppercase">End Date</div>
        <DatePicker 
          :date="tempDate" 
          when="end" 
          @date-selected="onDateSelected"
        />
      </div>
      
      <div class="flex justify-end mt-6">
        <button 
          @click="applyDates" 
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium border border-blue-900 shadow-[2px_2px_0px_#000] hover:shadow-[1px_1px_0px_#000] transition-all duration-200 rounded"
        >
          Apply
        </button>
      </div>
    </template>
  </BaseModal>
</div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue';
import { 
  format, 
  isValid, 
  parseISO, 
  startOfMonth, 
  endOfMonth,
  subMonths,
  addMonths,
  startOfYear,
  endOfYear,
  subYears,
  addYears,
  subDays,
  isSameMonth,
  isSameYear
} from 'date-fns';
import DatePicker from '../components/DatePicker.vue';
import BaseModal from '@/shared/components/BaseModal.vue';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-vue-next';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import { useInit } from '@/features/dashboard/composables/useInit';

const { state } = useDashboardState();
const { handleGroupChange } = useInit();
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

const quickSelect = (period) => {
  const today = new Date();
  const currentStart = tempDate.start || today;
  
  // Helper function to determine if we have a monthly or yearly range
  const isMonthRange = () => {
    if (!tempDate.start || !tempDate.end) return false;
    return isSameMonth(tempDate.start, startOfMonth(tempDate.start)) && 
           (isSameMonth(tempDate.start, tempDate.end) || endOfMonth(tempDate.start).getTime() === tempDate.end.getTime());
  };
  
  const isYearRange = () => {
    if (!tempDate.start || !tempDate.end) return false;
    return isSameMonth(tempDate.start, startOfYear(tempDate.start)) && 
           (isSameYear(tempDate.start, tempDate.end) && tempDate.end.getMonth() === 11);
  };
  
  switch (period) {
    case 'today':
      // Set both start and end to today
      tempDate.start = new Date();
      tempDate.end = new Date();
      break;
      
    case 'prevMonth':
      if (isMonthRange()) {
        // If already on a monthly view, go to previous month
        const newStartDate = subMonths(currentStart, 1);
        tempDate.start = startOfMonth(newStartDate);
        tempDate.end = endOfMonth(newStartDate);
      } else {
        // Otherwise, go to previous month from today
        const prevMonth = subMonths(today, 1);
        tempDate.start = startOfMonth(prevMonth);
        tempDate.end = endOfMonth(prevMonth);
      }
      break;
      
    case 'nextMonth':
      if (isMonthRange()) {
        // If already on a monthly view, go to next month
        const newStartDate = addMonths(currentStart, 1);
        tempDate.start = startOfMonth(newStartDate);
        tempDate.end = endOfMonth(newStartDate);
      } else {
        // Otherwise, go to next month from today
        const nextMonth = addMonths(today, 1);
        tempDate.start = startOfMonth(nextMonth);
        tempDate.end = endOfMonth(nextMonth);
      }
      break;
      
    case 'prevYear':
      if (isYearRange()) {
        // If already on a yearly view, go to previous year
        const newStartDate = subYears(currentStart, 1);
        tempDate.start = startOfYear(newStartDate);
        tempDate.end = endOfYear(newStartDate);
      } else {
        // Otherwise, go to previous year from today
        const prevYear = subYears(today, 1);
        tempDate.start = startOfYear(prevYear);
        tempDate.end = endOfYear(prevYear);
      }
      break;
      
    case 'nextYear':
      if (isYearRange()) {
        // If already on a yearly view, go to next year
        const newStartDate = addYears(currentStart, 1);
        tempDate.start = startOfYear(newStartDate);
        tempDate.end = endOfYear(newStartDate);
      } else {
        // Otherwise, go to next year from today
        const nextYear = addYears(today, 1);
        tempDate.start = startOfYear(nextYear);
        tempDate.end = endOfYear(nextYear);
      }
      break;
      
    case 'last30Days':
      tempDate.start = subDays(today, 30);
      tempDate.end = today;
      break;
      
    case 'last90Days':
      tempDate.start = subDays(today, 90);
      tempDate.end = today;
      break;
  }
};

const applyDates = () => {
  // Only update the actual state dates when Apply is clicked
  state.date.start = tempDate.start;
  state.date.end = tempDate.end;
  showDatePicker.value = false;
  handleGroupChange();
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