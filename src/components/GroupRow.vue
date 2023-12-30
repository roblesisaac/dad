<template>
<div :class="['grid middle proper text-left group-row', isSelected]">
    <!-- Edit Horizontal Dots -->
    <div class="cell-1 right">
        <DotsHorizontal @click="app.editGroup(element)" class="handlerGroup pointer" />
    </div>

    <!-- Drag Handle -->
    <div class="cell-3-24 p20r">
        <DragHorizontalVariant class="handlerGroup pointer" />
    </div>

    <div class="cell-12-24 pointer" @click="app.selectGroup(element)">
    <div class="grid p10r">

        <!-- Element Name -->
        <div class="cell-1">
            <b>{{ element.name }}</b>
        </div>

        <!-- Element Accounts -->
        <div v-if="isDefaultName" class="cell-1">
            <small>{{ accountInfo }}</small>
        </div>

        <!-- Cutom Info -->
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
    <div class="cell-9-24 right p10r pointer" @click="app.selectGroup(element)">
    <div class="grid">

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
import NetWorth from './NetWorth.vue';
import DragHorizontalVariant from 'vue-material-design-icons/DragHorizontalVariant.vue';
import DotsHorizontal from 'vue-material-design-icons/DotsHorizontal.vue';
import { formatPrice } from '../utils';
import { useAppStore } from '../stores/state';

const { api } = useAppStore();

const props = defineProps( {
    element: Object,
    app: Object,
    state: Object
} )

function fontColor(amount) {
    return amount > 0 
        ? 'font-color-positive' 
        : amount < 0 
        ? 'font-color-negative' 
        : 'font-color-neutral';
}

const accountInfo = computed( () => props.state.allUserAccounts.find( 
    account => account._id === props.element.accounts[0]?._id )?.subtype 
);

const isSelected = computed( () => props.element.isSelected ? 'isSelected' : '' );
const isDefaultName = computed( () => props.element.name === props.element.accounts[0]?.mask );

watch( () => props.element.sort, (currSort) => {
    api.put( `api/groups/${props.element._id}`, { sort: currSort } );
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
    background-color: lightgoldenrodyellow;
    color: blue
}
</style>