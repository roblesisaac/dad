<template>
<div :class="['grid middle b-top proper text-left group-row', isSelected]">
    <div class="cell-3-24 p20">
        <DragHorizontalVariant @dblclick="app.editGroup(element)" class="handlerGroup pointer" />
    </div>

    <div class="cell-19-24 p20y pointer" @click="app.selectGroup(element)">
        <b>{{ element.name }}</b>
        <br><small><b>Info:</b> {{ element.info }}</small>
        <br><small><b>Current:</b> {{ formatPrice(element.totalCurrentBalance) }}</small>
        <br><small><b>Available:</b> {{ formatPrice(element.totalAvailableBalance) }}</small>
    </div>

    <div class="cell-2-24" @click="app.selectGroup(element)">
        <ChevronRight class="icon" />
    </div>

    </div>
</template>

<script setup>
import { computed, watch } from 'vue';
import DragHorizontalVariant from 'vue-material-design-icons/DragHorizontalVariant.vue';
import ChevronRight from 'vue-material-design-icons/ChevronRight.vue';
import { formatPrice } from '../utils';
import { useAppStore } from '../stores/state';

const { api } = useAppStore();

const props = defineProps( {
    element: Object,
    app: Object
} )

const isSelected = computed( () => props.element.isSelected ? 'isSelected' : '' );

watch( () => props.element.sort, (currSort) => {
    api.put( `api/groups/${props.element._id}`, { sort: currSort } );
});

</script>

<style>
.group-row {
    background-color: #fff;
}
.group-row.isSelected {
    background-color: #f5f5f5;
    color: blue
}
</style>