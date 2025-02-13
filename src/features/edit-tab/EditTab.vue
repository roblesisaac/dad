<template>
<div class="grid">
  <div class="cell-1">
    <!-- Tab Name -->
    <div v-if="!state.is('EditRule')" class="grid middle b-bottom">
      <div class="cell-1-5 section b-right bold line50">
        <small>Name</small>
      </div>
      <div class="cell-4-5 section">
        <input v-model="editState.changeTabNameTo" class="transparent bold section colorBlue" type="text" />
      </div>
    </div>

    <!-- Sort -->
    <EditTabSection :editState="editState" :state="state" :app="app" sectionName="sort" />

    <!-- Categorize -->
    <EditTabSection :editState="editState" :state="state" :app="app" sectionName="categorize" />

    <!-- Filter -->
    <EditTabSection :editState="editState" :state="state" :app="app" sectionName="filter" />

    <!-- GroupBy -->
    <EditTabSection :editState="editState" :state="state" :app="app" sectionName="groupBy" />

    <!-- Share -->
    <ShareSection :editState="editState" :state="state" :app="app" />

    <!-- Delete And Duplicate Buttons -->
    <ActionButtons v-if="!state.is('EditRule')" :app="app" />

  </div>
</div>
</template>

<script setup>
import { reactive, watch, computed } from 'vue';
import { useEditTab } from './composables/useEditTab';
import EditTabSection from './components/EditTabSection.vue';
import ShareSection from './components/ShareSection.vue';
import ActionButtons from './components/ActionButtons.vue';

const props = defineProps({
  state: Object,
  App: Object
});

const selectedTab = computed(() => props.state.selected.tab);

const editState = reactive({
  changeTabNameTo: selectedTab.value.tabName,
  ruleDetails: null,
  selectedRuleType: '',
  typingTimer: 0
});

const { app } = useEditTab(props.state, editState, props.App);

watch(() => editState.changeTabNameTo, app.changeTabName);
watch(() => selectedTab.value.showForGroup, app.saveGroups, { deep: true });
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