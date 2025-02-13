import { formatPrice } from '@/utils';

export function calculateTabTotal(tab) {
  const total = tab.total || 0;
  const toFixed = tab.isSelected ? 2 : 0;
  return formatPrice(total, { toFixed });
} 