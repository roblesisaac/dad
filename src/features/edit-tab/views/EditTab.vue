<template>
<div class="x-grid">
  <div class="cell-1">
    <!-- Tab Name -->
    <div v-if="route.name === 'edit-tab'" class="x-grid middle b-bottom">
      <div class="cell-1-5 section b-right bold line50">
        <small>Name</small>
      </div>
      <div class="cell-4-5 section">
        <input v-model="editState.changeTabNameTo" class="transparent bold section colorBlue" type="text" />
      </div>
    </div>

    <!-- Sort -->
    <EditTabSection :editState="editState" :sectionName="'sort'" />

    <!-- Categorize -->
    <EditTabSection :editState="editState" :sectionName="'categorize'" />

    <!-- Filter -->
    <EditTabSection :editState="editState" :sectionName="'filter'" />

    <!-- GroupBy -->
    <EditTabSection :editState="editState" :sectionName="'groupBy'" />

    <!-- Share -->
    <ShareSection :editState="editState" />

    <!-- Delete And Duplicate Buttons -->
    <ActionButtons v-if="route.name === 'edit-tab'" />

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
      propNamesToSave: ['itemProp', 'ruleMethodName', 'testStandard']
    },
    categorize: {
      itemProps: ['amount', 'date', 'name'],
      ruleMethodNames: ['is', 'contains', 'startsWith', 'endsWith'],
      propNamesToSave: ['categorizeAs', 'itemProp', 'ruleMethodName', 'testStandard']
    },
    filter: {
      itemProps: ['amount', 'date', 'name'],
      ruleMethodNames: ['is', 'contains', 'startsWith', 'endsWith'],
      propNamesToSave: ['itemProp', 'ruleMethodName', 'testStandard']
    },
    groupBy: {
      itemProps: ['amount', 'date', 'name'],
      ruleMethodNames: ['is', 'contains', 'startsWith', 'endsWith'],
      propNamesToSave: ['itemProp', 'ruleMethodName', 'testStandard']
    }
  }
});

const { updateTabName } = useEditTab(editState);

watch(() => editState.changeTabNameTo, async (newName) => {
  await updateTabName(state.selected.tab, newName);
});
</script>

<style>
.draggable {
  min-height: 50px;
  width: 100%;
}

.dropHere {
  padding: 15px;
  border: 2px dashed #BFBCB3;
  min-height: 50px;
}

.sharedWith {
  background-color: #333;
  margin-right: 20px;
  margin-bottom: 20px;
}

.saveTabName {
  height: 50px;
  width: 100%;
  border-radius: 0;
}

.saveTabName:hover, .saveTabName:active {
  background: #333;
}

.transparent {
  border: 0 !important;
  background-color: transparent;
  background: transparent;
  box-shadow: none;
}

.transparent:focus {
  outline: none;
  border: 0 !important;
  box-shadow: none !important;
}

.uniqueBtn {
  background-color: #f9c844;
  color: #3c3943;
}
</style> 