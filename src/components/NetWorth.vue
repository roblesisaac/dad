<template>
    <span :class="fontColor(netWorth)">{{ formatPrice(netWorth, { toFixed: digits }) }}</span>
</template>

<script setup>
import { computed } from 'vue';
import { fontColor, formatPrice } from '../utils';

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

        const currentBalance = account.type === 'credit' ? account?.balances?.current : account?.balances?.available;
        const balance = isNaN(currentBalance) ? 0 : Number(currentBalance);

        return account.type === 'credit' ?
            acc - balance || 0 :
            acc + balance || 0;
    }, 0);
});

function getAccount(accountId) {
    return props.state.allUserAccounts.find(account => account._id === accountId) || {};
}

</script>