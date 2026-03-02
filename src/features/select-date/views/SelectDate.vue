<template>
<div class="relative w-full h-full flex justify-center">
  <!-- Date Range Summary (Clickable to expand) -->
  <button 
    @click="toggleDatePicker"
    class="flex items-center justify-center gap-1.5 hover:opacity-70 transition-opacity group focus:outline-none"
  >
    <span class="text-xs sm:text-sm font-black text-black uppercase tracking-[0.2em] truncate">
      {{ dateRangeSummary }}
    </span>
    <ChevronDown 
      class="h-3 w-3 text-gray-300 group-hover:text-black transition-all duration-300 flex-shrink-0"
      :class="{ '-rotate-180': showDatePicker }"
    />
  </button>
  
  <!-- Date Picker Modal -->
  <BaseModal
    :is-open="showDatePicker"
    title="Select Date Range"
    size="md"
    :content-padding="false"
    @close="showDatePicker = false"
  >
    <template #content>
      <!-- Scrollable content area -->
      <div class="p-6 md:p-8 max-h-[70vh] overflow-y-auto">
        <!-- Quick Action Buttons -->
        <div class="mb-8">
          <div class="text-[10px] font-black tracking-widest text-gray-400 uppercase mb-3 px-2">Quick Select</div>
          
          <div class="grid grid-cols-2 gap-2">
            <button 
              @click="quickSelect('thisYear')" 
              class="px-6 py-4 bg-gray-100 hover:bg-black text-gray-800 hover:text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors border-2 border-transparent"
            >
              This Year
            </button>
            <button 
              @click="quickSelect('lastYear')" 
              class="px-6 py-4 bg-gray-100 hover:bg-black text-gray-800 hover:text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors border-2 border-transparent"
            >
              Last Year
            </button>
            <button 
              @click="quickSelect('thisMonth')" 
              class="px-6 py-4 bg-gray-100 hover:bg-black text-gray-800 hover:text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors border-2 border-transparent"
            >
              This Month
            </button>
            <button 
              @click="quickSelect('lastMonth')" 
              class="px-6 py-4 bg-gray-100 hover:bg-black text-gray-800 hover:text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors border-2 border-transparent"
            >
              Last Month
            </button>
            <button 
              @click="quickSelect('thisWeek')" 
              class="px-6 py-4 bg-gray-100 hover:bg-black text-gray-800 hover:text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors border-2 border-transparent"
            >
              This Week
            </button>
            <button 
              @click="quickSelect('today')" 
              class="px-6 py-4 bg-gray-100 hover:bg-black text-gray-800 hover:text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors border-2 border-transparent"
            >
              Today
            </button>
          </div>
        </div>
        
        <!-- Custom Date Pickers -->
        <div class="space-y-6">
          <div>
            <div class="text-[10px] font-black tracking-widest text-gray-400 uppercase mb-2 px-2">Start Date</div>
            <DatePicker 
              :date="tempDate" 
              when="start" 
              @date-selected="onDateSelected"
            />
          </div>
          
          <div>
            <div class="text-[10px] font-black tracking-widest text-gray-400 uppercase mb-2 px-2">End Date</div>
            <DatePicker 
              :date="tempDate" 
              when="end" 
              @date-selected="onDateSelected"
            />
          </div>
        </div>
      </div>
      
      <!-- Sticky Footer Actions -->
      <div class="border-t-2 border-gray-100 bg-white/80 backdrop-blur-md p-6 sticky bottom-0 z-10 w-full rounded-b-[inherit]">
        <button 
          @click="onApplyDates" 
          class="w-full px-6 py-4 bg-black hover:bg-gray-800 text-white text-sm font-black uppercase tracking-widest rounded-2xl transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
        >
          Apply Dates
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
import { Calendar, ChevronDown } from 'lucide-vue-next';
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
