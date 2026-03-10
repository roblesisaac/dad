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
      class="h-3 w-3 text-black group-hover:text-black transition-all duration-300 flex-shrink-0"
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
      <div class="p-6 md:p-8 max-h-[70vh] overflow-y-auto bg-inherit" data-no-pull-refresh>
        <!-- Quick Action Buttons -->
        <div class="mb-12">
          <div class="text-[10px] font-black tracking-[0.3em] text-[var(--theme-text-soft)] uppercase mb-6 px-2 opacity-50">Quick Select</div>
          
          <div class="flex flex-col">
            <button 
              v-for="option in quickSelectOptions"
              :key="option.id"
              @click="onQuickSelect(option.id)" 
              data-no-pull-refresh
              class="w-full flex items-center justify-between py-6 transition-all group"
            >
              <span class="text-xl sm:text-2xl font-black uppercase tracking-tighter text-[var(--theme-text)] group-hover:translate-x-1 transition-transform duration-300 flex items-baseline gap-2">
                <span>{{ option.label }}</span>
                <span
                  v-if="option.secondaryLabel"
                  class="text-sm sm:text-base font-semibold text-[var(--theme-text-soft)]"
                >
                  {{ option.secondaryLabel }}
                </span>
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
      <div class="border-t border-[var(--theme-border)]/20 backdrop-blur-md p-6 sticky bottom-0 z-10 w-full rounded-b-[inherit]">
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
import { ref, onMounted, computed } from 'vue';
import DatePicker from '../components/DatePicker.vue';
import BaseModal from '@/shared/components/BaseModal.vue';
import { ChevronDown, ChevronRight } from 'lucide-vue-next';
import { subYears, addYears, subMonths, addMonths, isSameYear } from 'date-fns';
import { useDate } from '../composables/useDate.js';

// Use the date composable
const { 
  tempDate, 
  dateRangeSummary, 
  initDefaultDates, 
  initTempDates, 
  quickSelect, 
  applyDates,
  convertToDate
} = useDate();

const showDatePicker = ref(false);

const currentRange = computed(() => {
  if (!tempDate.start || !tempDate.end) {
    return null;
  }

  return {
    start: convertToDate(tempDate.start),
    end: convertToDate(tempDate.end)
  };
});

const isCurrentRangeThisYear = computed(() => {
  if (!currentRange.value) {
    return false;
  }

  const today = new Date();
  const currentYear = today.getFullYear();
  const { start, end } = currentRange.value;

  return start.getFullYear() === currentYear
    && start.getMonth() === 0
    && start.getDate() === 1
    && end.getFullYear() === today.getFullYear()
    && end.getMonth() === today.getMonth()
    && end.getDate() === today.getDate();
});

const isCurrentRangeLastYear = computed(() => {
  if (!currentRange.value) {
    return false;
  }

  const lastYear = subYears(new Date(), 1).getFullYear();
  const { start, end } = currentRange.value;

  return start.getFullYear() === lastYear
    && start.getMonth() === 0
    && start.getDate() === 1
    && end.getFullYear() === lastYear
    && end.getMonth() === 11
    && end.getDate() === 31;
});

const isCurrentRangeThisMonth = computed(() => {
  if (!currentRange.value) {
    return false;
  }

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const { start, end } = currentRange.value;

  return start.getFullYear() === currentYear
    && start.getMonth() === currentMonth
    && start.getDate() === 1
    && end.getFullYear() === today.getFullYear()
    && end.getMonth() === today.getMonth()
    && end.getDate() === today.getDate();
});

const isCurrentRangeLastMonth = computed(() => {
  if (!currentRange.value) {
    return false;
  }

  const lastMonthDate = subMonths(new Date(), 1);
  const lastMonth = lastMonthDate.getMonth();
  const lastMonthYear = lastMonthDate.getFullYear();
  const { start, end } = currentRange.value;
  const lastDayOfLastMonth = new Date(lastMonthYear, lastMonth + 1, 0).getDate();

  return start.getFullYear() === lastMonthYear
    && start.getMonth() === lastMonth
    && start.getDate() === 1
    && end.getFullYear() === lastMonthYear
    && end.getMonth() === lastMonth
    && end.getDate() === lastDayOfLastMonth;
});

const currentRangeYear = computed(() => {
  if (!currentRange.value) {
    return null;
  }

  const { start, end } = currentRange.value;

  const isFullYearRange = isSameYear(start, end)
    && start.getMonth() === 0
    && start.getDate() === 1
    && end.getMonth() === 11
    && end.getDate() === 31;

  return isFullYearRange ? start.getFullYear() : null;
});

const currentRangeMonthKey = computed(() => {
  if (!currentRange.value) {
    return null;
  }

  const { start, end } = currentRange.value;
  const lastDayOfMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  const isFullMonthRange = start.getFullYear() === end.getFullYear()
    && start.getMonth() === end.getMonth()
    && start.getDate() === 1
    && end.getDate() === lastDayOfMonth;

  return isFullMonthRange ? (start.getFullYear() * 12 + start.getMonth()) : null;
});

const getMonthSortValue = (date) => (date.getFullYear() * 12) + date.getMonth();
const formatMonthYearLabel = (date) => {
  const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  return `${month} ${date.getFullYear()}`;
};

const quickSelectOptions = computed(() => {
  const today = new Date();
  const thisYear = today.getFullYear();
  const lastYear = subYears(today, 1).getFullYear();
  const thisMonthDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonthDate = subMonths(thisMonthDate, 1);

  const yearOptions = [
    ...(isCurrentRangeThisYear.value ? [] : [{ id: 'thisYear', label: 'This Year', year: thisYear, secondaryLabel: String(thisYear) }]),
    ...(isCurrentRangeLastYear.value ? [] : [{ id: 'lastYear', label: 'Last Year', year: lastYear, secondaryLabel: String(lastYear) }]),
  ];

  const monthOptions = [
    ...(isCurrentRangeThisMonth.value ? [] : [{
      id: 'thisMonth',
      label: 'This Month',
      monthSort: getMonthSortValue(thisMonthDate),
      secondaryLabel: formatMonthYearLabel(thisMonthDate)
    }]),
    ...(isCurrentRangeLastMonth.value ? [] : [{
      id: 'lastMonth',
      label: 'Last Month',
      monthSort: getMonthSortValue(lastMonthDate),
      secondaryLabel: formatMonthYearLabel(lastMonthDate)
    }]),
  ];

  const nonDateScopedOptions = [
    { id: 'thisWeek', label: 'This Week' },
    { id: 'today', label: 'Today' },
  ];

  if (currentRangeYear.value !== null) {
    const previousYear = currentRangeYear.value - 1;
    const nextYear = addYears(currentRange.value.start, 1).getFullYear();

    if (previousYear !== lastYear) {
      yearOptions.push({ id: 'prevYear', label: 'Prev Year', year: previousYear, secondaryLabel: String(previousYear) });
    }

    if (nextYear !== lastYear && nextYear !== thisYear) {
      yearOptions.push({ id: 'nextYear', label: 'Next Year', year: nextYear, secondaryLabel: String(nextYear) });
    }
  }

  if (currentRangeMonthKey.value !== null) {
    const previousMonthDate = subMonths(currentRange.value.start, 1);
    const nextMonthDate = addMonths(currentRange.value.start, 1);
    const previousMonthSort = getMonthSortValue(previousMonthDate);
    const nextMonthSort = getMonthSortValue(nextMonthDate);
    const lastMonthSort = getMonthSortValue(lastMonthDate);
    const thisMonthSort = getMonthSortValue(thisMonthDate);

    if (previousMonthSort !== lastMonthSort) {
      monthOptions.push({
        id: 'prevMonth',
        label: 'Prev Month',
        monthSort: previousMonthSort,
        secondaryLabel: formatMonthYearLabel(previousMonthDate)
      });
    }

    if (nextMonthSort !== lastMonthSort && nextMonthSort !== thisMonthSort) {
      monthOptions.push({
        id: 'nextMonth',
        label: 'Next Month',
        monthSort: nextMonthSort,
        secondaryLabel: formatMonthYearLabel(nextMonthDate)
      });
    }
  }

  const orderedYearOptions = [...yearOptions].sort((a, b) => a.year - b.year);
  const orderedMonthOptions = [...monthOptions].sort((a, b) => a.monthSort - b.monthSort);
  return [...orderedYearOptions, ...orderedMonthOptions, ...nonDateScopedOptions];
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
  // This now only updates the temporary date values in the composable
};

const onQuickSelect = async (period) => {
  quickSelect(period);
  await onApplyDates();
};

const onApplyDates = async () => {
  const shouldClose = await applyDates();
  showDatePicker.value = shouldClose === false ? shouldClose : true;
};
</script>
