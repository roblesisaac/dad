<template>
    <div :class="['x-grid middle proper text-left group-row', isSelected]">
        <!-- Edit Horizontal Dots -->
        <div class="cell-1 right">
            <MoreHorizontal @click="editGroup(element)" class="handler-group pointer" />
        </div>
    
        <!-- Drag Handle -->
        <div class="cell-3-24 p20r">
            <GripHorizontal class="handler-group pointer" />
        </div>
    
        <div class="cell-12-24 pointer" @click="selectGroup(element)">
        <div class="x-grid p10r">
    
            <!-- Element Name -->
            <div class="cell-1">
                <b>{{ element.name }}</b>
            </div>
    
            <!-- Element Accounts -->
            <div v-if="isDefaultName" class="cell-1">
                <small>{{ accountInfo }}</small>
            </div>
    
            <!-- Custom Info -->
            <div v-if="element.info" class="cell-1">
                <small v-if="element.info">{{ element.info }}</small>
            </div>
    
            <!-- Element Group -->
            <div v-if="element.accounts.length > 1" class="cell-1">
                <b><small>Accts: </small></b><small v-for="(account, accountIndex) in element.accounts" :key="index">
                    #{{ account.mask }} <b v-if="accountIndex < element.accounts.length - 1">+</b>
                </small>
            </div>
    
        </div>
        </div>
    
        <!-- Balances + View -->
        <div class="cell-9-24 right p10r pointer" @click="selectGroup(element)">
        <div class="x-grid">
    
            <!-- Current Balance -->
            <div v-if="element.accounts.length" class="cell-1 bold right">
                <NetWorth :accounts="element.accounts" :state="state" />
                <br /><small>Available Balance</small>
            </div>
    
            <!-- Available Balance -->
            <div v-if="element.totalAvailableBalance !== element.totalCurrentBalance" class="cell-1">
                <span :class="fontColor(element.totalAvailableBalance)">{{ formatPrice(element.totalAvailableBalance) }}</span>
                <br /><small>Current</small>
            </div>
    
        </div>
        </div>
    
    </div>
</template>
    
<script setup>
import { computed, watch } from 'vue';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import { useEditGroup } from '../composables/useEditGroup';
import NetWorth from './NetWorth.vue';
import { MoreHorizontal, GripHorizontal } from 'lucide-vue-next';
import { fontColor, formatPrice } from '@/utils';

const props = defineProps({
    element: Object
});

const { state } = useDashboardState();

const accountInfo = computed(() => state.allUserAccounts.find(
    account => account._id === props.element.accounts[0]?._id)?.subtype
);

const isSelected = computed(() => props.element.isSelected ? 'isSelected' : '');
const isDefaultName = computed(() => props.element.name === props.element.accounts[0]?.mask);

const { editGroup, selectGroup, updateGroupSort } = useEditGroup();

watch(props.element, (newVal) => {
    updateGroupSort(newVal._id, newVal.sort);
});

</script>
    
<style>
.group-row {
    background-color: #fff;
    margin-bottom: 20px;
    border: 1px solid #000;
    box-shadow: 3px 3px #000;
    padding: 0 5px 15px 15px;
    border-radius: 3px;
}
.group-row.isSelected {
    background-color: whitesmoke;
    box-shadow: 1px 1px blue;
    border: 1px solid blue;
    color: blue
}
</style>