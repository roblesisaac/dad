import { reactive, computed } from 'vue';
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
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import { useSelectGroup } from '@/features/select-group/composables/useSelectGroup';

export function useDate() {
  const { state } = useDashboardState();
  const { handleGroupChange } = useSelectGroup();
  
  const tempDate = reactive({
    start: null,
    end: null
  });

  // Initialize temp dates with current values
  const initTempDates = () => {
    tempDate.start = state.date.start;
    tempDate.end = state.date.end;
  };

  // Initialize default date range (1st of current month to today)
  const initDefaultDates = () => {
    // Only set if not already set
    if (state.date.start === 'firstOfMonth') {
      state.date.start = startOfMonth(new Date());
    }
    
    if (state.date.end === 'today') {
      state.date.end = new Date();
    }
    
    // Initialize temp dates with current values
    initTempDates();
  };

  /**
   * Convert a date value (string or Date object) to a Date object
   * Handles special strings like 'firstOfMonth', 'today', etc.
   */
  const convertToDate = (dateValue) => {
    if (!dateValue) return new Date();
    
    // Handle special strings
    if (dateValue === 'firstOfMonth') {
      return startOfMonth(new Date());
    }
    
    if (dateValue === 'firstOfYear') {
      return startOfYear(new Date());
    }
    
    if (dateValue === 'today') {
      return new Date();
    }
    
    // Handle regular date strings
    if (typeof dateValue === 'string') {
      const parsedDate = parseISO(dateValue);
      return isValid(parsedDate) ? parsedDate : new Date();
    }
    
    // Handle Date objects
    if (dateValue instanceof Date) {
      return dateValue;
    }
    
    // Default fallback
    return new Date();
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
    state.date.start = tempDate.start;
    state.date.end = tempDate.end;
    handleGroupChange();
    return false; // To close modal in component
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

  return {
    tempDate,
    dateRangeSummary,
    initDefaultDates,
    initTempDates,
    quickSelect,
    applyDates,
    formatDate,
    convertToDate
  };
} 