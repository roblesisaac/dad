export function useUtils() {
  // Sort function generator
  function sortBy(prop) {
    return (a, b) => a[prop] - b[prop];
  }

  // Date utilities
  function extractDateRange(state) {
    const { start, end } = state;
    return `${yyyyMmDd(start)}_${yyyyMmDd(end)}`;
  }

  function yyyyMmDd(dateObject) {
    if(!dateObject) return;
    const year = dateObject.getFullYear();
    const month = String(dateObject.getMonth() + 1).padStart(2, '0');
    const day = String(dateObject.getDate()).padStart(2, '0');
    
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
    if(typeof string === 'string') {
      return string.toLowerCase();
    }
    return string;
  }

  function makeArray(value) {
    return Array.isArray(value) ? value : [value];
  }

  // UI helpers
  function waitUntilTypingStops(ms=500) {
    return new Promise((resolve) => {
      if (window.typingTimer) clearTimeout(window.typingTimer);
      window.typingTimer = setTimeout(resolve, ms);
    });
  }

  function fontColor(amt) {
    return amt > 0
      ? 'text-blue-800' 
      : amt === 0
      ? 'text-gray-700'
      : 'text-red-500'
  }

  function formatPrice(amt=0, { toFixed = 2 } = {}) {
    // Ensure amt is a valid number
    const validAmount = typeof amt === 'number' && !isNaN(amt) ? amt : 0;
    return validAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: toFixed, maximumFractionDigits: toFixed });
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