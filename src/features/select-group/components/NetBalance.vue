<template>
  <span 
    :class="[
      fontColor(netBalance), 
      'font-bold'
    ]"
  >
    {{ formattedNetBalance }}
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
  }
});

const { state } = useDashboardState();

const netBalance = computed(() => {
  return props.accounts.reduce((acc, account) => {
    account = account.type ? account : getAccount(account._id);

    const currentBalance = account.type === 'credit' ? account?.balances?.current : account?.balances?.available;
    const balance = isNaN(currentBalance) ? 0 : Number(currentBalance);

    return account.type === 'credit' ?
      acc - balance || 0 :
      acc + balance || 0;
  }, 0);
});

const formattedNetBalance = computed(() => {
  const amount = formatPrice(netBalance.value, { toFixed: props.digits });
  return amount;
});

function getAccount(accountId) {
  return state.allUserAccounts.find(account => account._id === accountId) || {};
}
</script>