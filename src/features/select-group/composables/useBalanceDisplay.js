import { computed } from 'vue';
import { useUtils } from '@/shared/composables/useUtils.js';

export function useBalanceDisplay(elementRef) {
  const { fontColor, formatPrice } = useUtils();
  
  /**
   * Check if current balance differs from available balance
   */
  const shouldShowCurrentBalance = computed(() => {
    return elementRef.value?.totalAvailableBalance !== elementRef.value?.totalCurrentBalance;
  });
  
  /**
   * Format and display the available balance with appropriate styling
   */
  const availableBalanceDisplay = computed(() => {
    return {
      value: formatPrice(elementRef.value?.totalAvailableBalance || 0),
      color: fontColor(elementRef.value?.totalAvailableBalance || 0)
    };
  });
  
  /**
   * Format and display the current balance with appropriate styling
   */
  const currentBalanceDisplay = computed(() => {
    return {
      value: formatPrice(elementRef.value?.totalCurrentBalance || 0),
      color: fontColor(elementRef.value?.totalCurrentBalance || 0)
    };
  });
  
  return {
    shouldShowCurrentBalance,
    availableBalanceDisplay,
    currentBalanceDisplay
  };
} 