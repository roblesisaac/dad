<template>
  <span 
    :class="[
      fontColor(netWorth), 
      'font-medium',
      { 'text-lg': isLarge }
    ]"
  >
    {{ formattedNetWorth }}
  </span>
</template>

<script setup>
import { computed } from 'vue';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import { useUtils } from '@/shared/composables/useUtils';

const { fontColor, formatPrice } = useUtils();

const props = defineProps({
  accounts: {
    type: Array,
    default: () => []
  },
  digits: {
    type: Number,
    default: 2
  },
  isLarge: {
    type: Boolean,
    default: false
  },
  showSign: {
    type: Boolean,
    default: false 
  }
});

const { state } = useDashboardState();

const netWorth = computed(() => {
  return props.accounts.reduce((acc, account) => {
    account = account.type ? account : getAccount(account._id);

    const currentBalance = account.type === 'credit' ? account?.balances?.current : account?.balances?.available;
    const balance = isNaN(currentBalance) ? 0 : Number(currentBalance);

    return account.type === 'credit' ?
      acc - balance || 0 :
      acc + balance || 0;
  }, 0);
});

const formattedNetWorth = computed(() => {
  const amount = formatPrice(netWorth.value, { toFixed: props.digits });
  if (props.showSign && netWorth.value > 0) {
    return `+${amount}`;
  }
  return amount;
});

function getAccount(accountId) {
  return state.allUserAccounts.find(account => account._id === accountId) || {};
}
</script>