<template>
    <span :class="fontColor">{{ formatPrice(netWorth, { toFixed: digits }) }}</span>
</template>

<script setup>
import { computed } from 'vue';
import { formatPrice } from '../utils';

const props = defineProps({
    accounts: {
        type: Array,
        default: []
    },
    state: Object,
    digits: {
        type: Number,
        default: 2
    }
});

const netWorth = computed(() => {
    return props.accounts.reduce((acc, account) => {
        account = account.type ? account : getAccount(account._id);

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

function getAccount(accountId) {
    return props.state.allUserAccounts.find(account => account._id === accountId) || {};
}

</script>