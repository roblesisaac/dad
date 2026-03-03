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
      <div class="p-6 md:p-8 max-h-[70vh] overflow-y-auto bg-[var(--theme-bg)]">
        <!-- Quick Action Buttons -->
        <div class="mb-12">
          <div class="text-[10px] font-black tracking-[0.3em] text-[var(--theme-text-soft)] uppercase mb-6 px-2 opacity-50">Quick Select</div>
          
          <div class="flex flex-col">
            <button 
              v-for="option in quickSelectOptions"
              :key="option.id"
              @click="quickSelect(option.id)" 
              class="w-full flex items-center justify-between px-2 py-6 border-b border-[var(--theme-border)]/10 hover:bg-[var(--theme-bg-soft)] transition-all group"
            >
              <span class="text-xl sm:text-2xl font-black uppercase tracking-tighter text-[var(--theme-text)] group-hover:translate-x-1 transition-transform duration-300">
                {{ option.label }}
              </span>
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--theme-text-soft)] opacity-0 group-hover:opacity-100 transition-all duration-300">
                  Select
                </span>
                <ChevronRight class="w-4 h-4 text-[var(--theme-text-soft)] opacity-0 group-hover:opacity-100 transition-all duration-300" />
              </div>
            </button>
          </div>
        </div>
        
        <!-- Custom Date Pickers -->
        <div class="space-y-10 pb-8">
          <div>
            <div class="text-[10px] font-black tracking-[0.3em] text-[var(--theme-text-soft)] uppercase mb-4 px-2 opacity-50">Start Date</div>
            <DatePicker 
              :date="tempDate" 
              when="start" 
              @date-selected="onDateSelected"
            />
          </div>
          
          <div>
            <div class="text-[10px] font-black tracking-[0.3em] text-[var(--theme-text-soft)] uppercase mb-4 px-2 opacity-50">End Date</div>
            <DatePicker 
              :date="tempDate" 
              when="end" 
              @date-selected="onDateSelected"
            />
          </div>
        </div>
      </div>
      
      <!-- Sticky Footer Actions -->
      <div class="border-t border-[var(--theme-border)]/20 bg-[var(--theme-bg)]/80 backdrop-blur-md p-6 sticky bottom-0 z-10 w-full rounded-b-[inherit]">
        <button 
          @click="onApplyDates" 
          class="w-full px-6 py-5 bg-[var(--theme-btn-primary-bg)] hover:bg-[var(--theme-btn-primary-hover-bg)] text-[var(--theme-btn-primary-text)] text-sm font-black uppercase tracking-[0.3em] rounded-2xl transition-all active:scale-[0.98] border border-[var(--theme-border)]/10"
        >
          Apply Selection
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
import { ChevronDown, ChevronRight } from 'lucide-vue-next';
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

const quickSelectOptions = [
  { id: 'thisYear', label: 'This Year' },
  { id: 'lastYear', label: 'Last Year' },
  { id: 'thisMonth', label: 'This Month' },
  { id: 'lastMonth', label: 'Last Month' },
  { id: 'thisWeek', label: 'This Week' },
  { id: 'today', label: 'Today' },
];

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
