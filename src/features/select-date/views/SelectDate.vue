<template>
<div class="relative w-full">
  <!-- Date Range Summary (Clickable to expand) -->
  <div 
    @click="toggleDatePicker"
    class="w-full h-full flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors"
  >
    <div class="flex items-center">
      <Calendar class="h-4 w-4 mr-2 text-gray-700" />
      <span class="text-sm font-bold">{{ dateRangeSummary }}</span>
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
          @click="onApplyDates" 
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all duration-200 rounded"
        >
          Apply
        </button>
      </div>
    </template>
  </BaseModal>
</div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import DatePicker from '../components/DatePicker.vue';
import BaseModal from '@/shared/components/BaseModal.vue';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-vue-next';
import { useDate } from '../composables/useDate.js';

// Use the date composable
const { 
  tempDate, 
  dateRangeSummary, 
  initDefaultDates, 
  initTempDates, 
  quickSelect, 
  applyDates 
} = useDate();

const showDatePicker = ref(false);

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
  // This now only updates the temporary date values in the composable
};

const onApplyDates = () => {
  const shouldClose = applyDates();
  showDatePicker.value = shouldClose === false ? shouldClose : true;
};
</script>