<template>
<div class="w-full">
  <div class="w-full">
    <!-- Tab Name -->
    <div v-if="route.name === 'edit-tab'" class="grid grid-cols-5 border-b-2 border-black">
      <div class="col-span-1 py-3 px-4 border-r-2 border-black font-bold flex items-center bg-gray-100">
        <small>Name</small>
      </div>
      <div class="col-span-4 py-3 px-4">
        <input v-model="editState.changeTabNameTo" class="w-full bg-transparent border-0 font-bold text-blue-700 focus:outline-none focus:ring-0" type="text" />
      </div>
    </div>

    <div class="p-4">
      <!-- Sort -->
      <EditTabSection :editState="editState" :sectionName="'sort'" />

      <!-- Categorize -->
      <EditTabSection :editState="editState" :sectionName="'categorize'" />

      <!-- Filter -->
      <EditTabSection :editState="editState" :sectionName="'filter'" />

      <!-- GroupBy -->
      <EditTabSection :editState="editState" :sectionName="'groupBy'" />

      <!-- Share -->
      <!-- <ShareSection :editState="editState" /> -->

      <!-- Delete And Duplicate Buttons -->
      <ActionButtons v-if="route.name === 'edit-tab'" />
    </div>

  </div>
</div>
</template>

<script setup>
import { reactive, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import { useEditTab } from '../composables/useEditTab';
import EditTabSection from '../components/EditTabSection.vue';
import ShareSection from '../components/ShareSection.vue';
import ActionButtons from '../components/ActionButtons.vue';

const route = useRoute();
const { state } = useDashboardState();

const editState = reactive({
  changeTabNameTo: state.selected.tab?.tabName || '',
  selectedRuleType: '',
  ruleDetails: null,
  ruleTypes: {
    sort: {
      itemProps: ['amount', 'date', 'name'],
      ruleMethodNames: ['is', 'contains', 'startsWith', 'endsWith'],
      propNamesToSave: ['itemProp', 'ruleMethodName', 'criterion']
    },
    categorize: {
      itemProps: ['amount', 'date', 'name'],
      ruleMethodNames: ['is', 'contains', 'startsWith', 'endsWith'],
      propNamesToSave: ['categorizeAs', 'itemProp', 'ruleMethodName', 'criterion']
    },
    filter: {
      itemProps: ['amount', 'date', 'name'],
      ruleMethodNames: ['is', 'contains', 'startsWith', 'endsWith'],
      propNamesToSave: ['itemProp', 'ruleMethodName', 'criterion']
    },
    groupBy: {
      itemProps: ['amount', 'date', 'name'],
      ruleMethodNames: ['is', 'contains', 'startsWith', 'endsWith'],
      propNamesToSave: ['itemProp', 'ruleMethodName', 'criterion']
    }
  }
});

const { updateTabName } = useEditTab(editState);

watch(() => editState.changeTabNameTo, async (newName) => {
  await updateTabName(state.selected.tab, newName);
});
</script>

<style>
/* Tailwind handles all styling */
</style> 