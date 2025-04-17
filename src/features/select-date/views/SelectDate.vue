<template>
<div class="relative w-full">
  <!-- Date Range Selector -->
  <div 
    @click="toggleDatePicker"
    class="w-full flex items-center justify-between px-4 py-2 transition-all cursor-pointer bg-white font-bold"
  >
    <div class="flex items-center min-w-0">
      <Calendar class="h-4 w-4 text-blue-600 flex-shrink-0 mr-2" />
      <span class="text-xs text-black truncate font-bold">{{ dateRangeSummary }}</span>
    </div>
    <ChevronDown 
      class="h-4 w-4 text-gray-500 transition-transform duration-200 flex-shrink-0 ml-1"
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
      <div class="mb-5">
        <h3 class="text-sm font-bold text-gray-700 mb-3">QUICK SELECT</h3>
        
        <!-- Common Presets (First Row) -->
        <div class="grid grid-cols-3 gap-2 mb-3">
          <button 
            @click="quickSelect('today')" 
            class="quick-select-btn today-btn"
          >
            <CalendarClock class="h-4 w-4 mr-1" />
            Today
          </button>
          <button 
            @click="quickSelect('thisWeek')" 
            class="quick-select-btn week-btn"
          >
            <CalendarDays class="h-4 w-4 mr-1" />
            This Week
          </button>
          <button 
            @click="quickSelect('thisMonth')" 
            class="quick-select-btn month-btn"
          >
            <CalendarRange class="h-4 w-4 mr-1" />
            This Month
          </button>
        </div>
        
        <!-- Recent Periods (Second Row) -->
        <div class="grid grid-cols-3 gap-2 mb-3">
          <button 
            @click="quickSelect('last7Days')" 
            class="quick-select-btn recent-btn"
          >
            <MoveLeft class="h-4 w-4 mr-1" />
            Last 7 Days
          </button>
          <button 
            @click="quickSelect('last30Days')" 
            class="quick-select-btn recent-btn"
          >
            <MoveLeft class="h-4 w-4 mr-1" />
            Last 30 Days
          </button>
          <button 
            @click="quickSelect('last90Days')" 
            class="quick-select-btn recent-btn"
          >
            <MoveLeft class="h-4 w-4 mr-1" />
            Last 90 Days
          </button>
        </div>
        
        <!-- Month Navigation (Third Row) -->
        <div class="grid grid-cols-2 gap-2 mb-3">
          <button 
            @click="quickSelect('prevMonth')" 
            class="quick-select-btn nav-btn flex items-center justify-center"
          >
            <ArrowLeftCircle class="h-4 w-4 mr-1" />
            Prev Month
          </button>
          <button 
            @click="quickSelect('nextMonth')" 
            class="quick-select-btn nav-btn flex items-center justify-center"
          >
            Next Month
            <ArrowRightCircle class="h-4 w-4 ml-1" />
          </button>
        </div>
        
        <!-- Year Navigation (Fourth Row) -->
        <div class="grid grid-cols-3 gap-2">
          <button 
            @click="quickSelect('prevYear')" 
            class="quick-select-btn year-btn flex items-center justify-center"
          >
            <ArrowLeftCircle class="h-4 w-4 mr-1" />
            Prev Year
          </button>
          <button 
            @click="quickSelect('thisYear')" 
            class="quick-select-btn year-btn"
          >
            <CalendarCheck class="h-4 w-4 mr-1" />
            This Year
          </button>
          <button 
            @click="quickSelect('nextYear')" 
            class="quick-select-btn year-btn flex items-center justify-center"
          >
            Next Year
            <ArrowRightCircle class="h-4 w-4 ml-1" />
          </button>
        </div>
      </div>
      
      <!-- Date Range Selection -->
      <div class="grid grid-cols-2 gap-4">
        <!-- Start Date -->
        <div>
          <h3 class="text-sm font-bold text-gray-700 mb-2">START DATE</h3>
          <DatePicker 
            :date="tempDate" 
            when="start" 
            @date-selected="onDateSelected"
          />
        </div>
        
        <!-- End Date -->
        <div>
          <h3 class="text-sm font-bold text-gray-700 mb-2">END DATE</h3>
          <DatePicker 
            :date="tempDate" 
            when="end" 
            @date-selected="onDateSelected"
          />
        </div>
      </div>
      
      <!-- Range Summary -->
      <div class="flex items-center justify-between mt-4 py-2 px-3 bg-gray-50 rounded-md">
        <div>
          <span class="text-sm text-gray-600">Range: </span>
          <span class="text-sm font-medium">{{ formatDateRange }}</span>
        </div>
        <div class="text-sm text-gray-500">
          {{ computedDateRangeDuration }}
        </div>
      </div>
      
      <!-- Action Buttons -->
      <div class="flex justify-end space-x-2 mt-4">
        <button 
          @click="showDatePicker = false" 
          class="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors flex items-center"
        >
          <X class="h-4 w-4 mr-1" />
          Cancel
        </button>
        <button 
          @click="onApplyDates" 
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors flex items-center"
        >
          <Check class="h-4 w-4 mr-1" />
          Apply
        </button>
      </div>
    </template>
  </BaseModal>
</div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import DatePicker from '../components/DatePicker.vue';
import BaseModal from '@/shared/components/BaseModal.vue';
import { 
  Calendar, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  CalendarCheck,
  MoveLeft,
  ArrowLeftCircle,
  ArrowRightCircle,
  Check,
  X
} from 'lucide-vue-next';
import { useDate } from '../composables/useDate.js';

// Use the date composable
const { 
  tempDate, 
  dateRangeSummary, 
  initDefaultDates, 
  initTempDates, 
  quickSelect, 
  applyDates,
  formatDate 
} = useDate();

const showDatePicker = ref(false);

// Format dates for the current temp selection
const formatDateRange = computed(() => {
  const start = formatDate(tempDate.start);
  const end = formatDate(tempDate.end);
  
  if (!start && !end) return 'Select date range';
  if (!end) return `From ${start}`;
  if (!start) return `Until ${end}`;
  
  if (start === end) {
    return start; // Same day
  }
  
  return `${start} - ${end}`;
});

// Calculate duration between selected dates (reactive to tempDate changes)
const computedDateRangeDuration = computed(() => {
  const startDate = new Date(tempDate.start);
  const endDate = new Date(tempDate.end);
  
  if (isNaN(startDate) || isNaN(endDate)) return '';
  
  const diffTime = Math.abs(endDate - startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
});

// Initialize default date range
onMounted(() => {
  initDefaultDates();
});

const toggleDatePicker = () => {
  showDatePicker.value = !showDatePicker.value;
  
  // Reset temp dates to current values when opening
  if (showDatePicker.value) {
    initTempDates();
  }
};

const onDateSelected = () => {
  // Updates the temporary date values in the composable
};

const onApplyDates = () => {
  applyDates();
  showDatePicker.value = false;
};
</script>

<style scoped>
.quick-select-btn {
  @apply px-2 py-2 text-sm font-medium border border-gray-200 rounded transition-colors flex items-center justify-center;
}

.today-btn {
  @apply bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200;
}

.week-btn {
  @apply bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200;
}

.month-btn {
  @apply bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200;
}

.year-btn {
  @apply bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200;
}

.recent-btn {
  @apply bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200;
}

.nav-btn {
  @apply bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200;
}
</style>