<template>
    <span :class="fontColor">{{ formatPrice(netWorth) }}</span>
</template>

<script setup>
import { computed } from 'vue';
import { formatPrice } from '../utils';

const props = defineProps({
    accounts: Array
});

const netWorth = computed(() => {
    return props.accounts.reduce((acc, account) => {
        const currentBalance = account?.balances?.current;
        const balance = isNaN(currentBalance) ? 0 : Number(currentBalance);

        return account.type === 'credit' ?
            acc - balance || 0 :
            acc + balance || 0;
    }, 0);
});

const fontColor = computed(() => {
    return netWorth.value > 0 
        ? 'font-color-positive'
        : netWorth.value === 0
        ? 'font-color-neutral'
        : 'font-color-negative' 
});

</script>