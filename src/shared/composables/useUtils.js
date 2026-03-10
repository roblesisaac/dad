export function useUtils() {
  function normalizeDate(dateValue) {
    const now = new Date();

    if (dateValue instanceof Date) {
      return Number.isNaN(dateValue.getTime()) ? now : dateValue;
    }

    if (!dateValue) return now;

    if (typeof dateValue === 'string') {
      if (dateValue === 'firstOfMonth') {
        return new Date(now.getFullYear(), now.getMonth(), 1);
      }

      if (dateValue === 'firstOfYear') {
        return new Date(now.getFullYear(), 0, 1);
      }

      if (dateValue === 'today') {
        return now;
      }

      const yyyyMmDdMatch = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (yyyyMmDdMatch) {
        const [, year, month, day] = yyyyMmDdMatch;
        return new Date(Number(year), Number(month) - 1, Number(day));
      }

      const parsed = new Date(dateValue);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }

      return now;
    }

    if (typeof dateValue === 'number') {
      const parsed = new Date(dateValue);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    return now;
  }

  // Sort function generator
  function sortBy(prop) {
    return (a, b) => a[prop] - b[prop];
  }

  // Date utilities
  function extractDateRange(state) {
    const { start, end } = state;
    return `${yyyyMmDd(normalizeDate(start))}_${yyyyMmDd(normalizeDate(end))}`;
  }

  function yyyyMmDd(dateObject) {
    const normalizedDate = normalizeDate(dateObject);
    const year = normalizedDate.getFullYear();
    const month = String(normalizedDate.getMonth() + 1).padStart(2, '0');
    const day = String(normalizedDate.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  function getDayOfWeekPST(dateString) {
    let date = new Date(dateString + 'T00:00:00');
    let dayOfWeek = date.toLocaleDateString('en-US', {
      weekday: 'long',
      timeZone: 'America/Los_Angeles'
    });
    return dayOfWeek;
  }

  // String/value utilities
  function lowercase(string) {
    if (typeof string === 'string') {
      return string.toLowerCase();
    }
    return string;
  }

  function makeArray(value) {
    return Array.isArray(value) ? value : [value];
  }

  // UI helpers
  function waitUntilTypingStops(ms = 500) {
    return new Promise((resolve) => {
      if (window.typingTimer) clearTimeout(window.typingTimer);
      window.typingTimer = setTimeout(resolve, ms);
    });
  }

  function fontColor(amt) {
    return 'text-black'
    // return amt > 0
    //   ? 'text-blue-800' 
    //   : amt === 0
    //   ? 'text-gray-700'
    //   : 'text-black-500'
  }

  function formatPrice(amt = 0, { toFixed = 2 } = {}) {
    return amt.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: toFixed, maximumFractionDigits: toFixed });
  }

  return {
    // Date utilities
    extractDateRange,
    yyyyMmDd,
    getDayOfWeekPST,

    // Sort utilities
    sortBy,

    // String/value utilities
    lowercase,
    makeArray,

    // UI helpers
    waitUntilTypingStops,
    fontColor,
    formatPrice
  };
} 
