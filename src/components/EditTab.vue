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
    <div v-if="!state.is('EditRule')" class="grid middle dottedRow">
      <div @click="app.select('sharing')" class="cell-1 p20">
        <div class="grid">
          <div class="cell auto">
            Share
          </div>
          <div class="cell auto right">        
            <Minus v-if="editState.selectedRuleType==='sharing'" />
            <Plus v-else />
          </div>
        </div>
      </div>
      <div v-if="editState.selectedRuleType==='sharing'" class="cell-1 p10x">
        <h4 class="bold">Groups Tab Is Shared With:</h4>
        <div class="dropHere">
          <span v-if="!selectedTab.showForGroup.length">Drag and drop groups here.</span>
          <Draggable class="draggable" group="groupDragger" v-model="selectedTab.showForGroup" v-bind="state.dragOptions(100)">
            <template #item="{element}">
              <button class="sharedWith">{{ getGroupName(element) }}</button></template>
          </Draggable>
        </div>
      </div>

      <div v-if="editState.selectedRuleType==='sharing'" class="cell-1 p10x">
        <ScrollingContent class="p30y">
        <Draggable class="draggable" group="groupDragger" v-model="unselectedGroupsInTab" v-bind="state.dragOptions(100)">
          <template #item="{element}">
          <button class="button sharedWith">{{ getGroupName(element) }}</button>
          </template>
        </Draggable>
        </ScrollingContent>
      </div>

      <div v-if="editState.selectedRuleType==='sharing' && selectedTab.showForGroup.length > 1" class="cell-1 p10x p10b">
        <button @click="app.makeTabUnique" class="uniqueBtn expanded">Make Tab Unique?</button>
      </div>
    </div>

    <!-- Delete And Duplicate Buttons -->
    <div v-if="!state.is('EditRule')" class="grid middle">
      <div class="cell-1 p20">
        <button @click="app.duplicateTab" class="button bgBlack expanded">Duplicate Tab</button>
      </div>
      <div class="cell-1 p20b">
        <button @click="app.deleteTab" class="button transparent colorDarkRed expanded">Delete Tab</button>
      </div>
    </div>

  </div>

</div>
</template>

<script setup>
import { computed, nextTick, reactive, watch } from 'vue';

import Draggable from 'vuedraggable';
import ScrollingContent from './ScrollingContent.vue';
import { Plus, Minus } from 'lucide-vue-next';
import EditTabSection from './EditTabSection.vue';
import { useAppStore } from '../stores/state';

const { api } = useAppStore();
const { App, state } = defineProps({ state: Object, App: Object });

const selectedTab = computed(() => state.selected.tab);

const editState = reactive({
  changeTabNameTo: selectedTab.value.tabName,
  ruleDetails: null,
  selectedRuleType: '',
  typingTimer: 0
});

function getGroupName(groupId) {
  return state.allUserGroups.find(group => group._id === groupId)?.name;
}

const unselectedGroupsInTab = computed(() => {
  return state.allUserGroups.filter(group => !selectedTab.value.showForGroup.includes(group._id))
    .map(group => group._id);
});

const app = function() {
  async function cloneRules(newTabId, currentTabId) {
    for(const rule of state.allUserRules) {

      if(!rule.applyForTabs.includes(currentTabId)) {
        continue;
      }

      const newRule = { 
        rule: rule.rule,
        _isImportant: rule._isImportant,
        orderOfExecution: rule.orderOfExecution,
        applyForTabs: [newTabId]
      };

      const savedRule = await api.post('api/rules', newRule);

      state.allUserRules.push(savedRule);
    }
  }

  async function createNewTab(tabName) {
    const selectedGroup = state.selected.group;
    const tabsForGroup = state.selected.tabsForGroup;

    const newTab = await api.post('api/tabs', {
      tabName: `${tabName} Copy`,
      showForGroup: [selectedGroup._id],
      isSelected: true,
      sort: tabsForGroup.length+1
    });

    return newTab;
  }

  function findTab(_id) {
    return state.allUserTabs.find(tab => tab._id === _id);
  }

  async function removeAndDeselectGroupFromCurrentTab() {
    const currentGroupId = state.selected.group._id;

    const showForGroup = selectedTab.value.showForGroup
      .filter(groupId => groupId !== currentGroupId);

    await api.put(`api/tabs/${selectedTab.value._id}`, {
      isSelected: false,
      showForGroup
    });

    selectedTab.value.isSelected = false;
    selectedTab.value.showForGroup = showForGroup;
  }

  async function updateTabName() {
    const tabId = selectedTab.value._id;
    const newName = editState.changeTabNameTo;

    await api.put(`api/tabs/${tabId}`, {
      tabName: newName
    });

    const existingTab = findTab(tabId);
    existingTab.tabName = newName;
  }

  function waitUntilTypingStops(ms=500) {
    return new Promise((resolve) => {
      clearTimeout(editState.typingTimer);
      editState.typingTimer = setTimeout(resolve, ms);
    });
  }

  return {
    changeTabName: async () => {
      if(editState.changeTabNameTo == selectedTab.value.tabName) {
        return;
      }

      await waitUntilTypingStops();
      await updateTabName();
    },
    deleteTab: async () => {
      if(!confirm('You sure?')) {
        return;
      }
      
      const selectedTabId = selectedTab.value._id;
      const tabIndex = state.allUserTabs.findIndex(tab => tab._id === selectedTabId);

      //delete all rules specific to tab

      state.views.pop();
      state.allUserTabs.splice(tabIndex, 1);
      await api.delete(`api/tabs/${selectedTabId}`);
    },
    duplicateTab: async () => {
      const tabName = selectedTab.value.tabName;
      const promptValue = prompt(`Please enter the tabName ('${tabName}') to duplicate.`);

      if(promptValue !== tabName) {
        return;
      }

      state.blueBar.message = 'Duplicating Tab';
      state.blueBar.loading = true;
      state.isLoading = true;
      App.goBack();

      nextTick(async () => {
        state.blueBar.message = 'Cloning Rules';
        const newTab = await createNewTab(tabName);
        await cloneRules(newTab._id, selectedTab.value._id);

        await api.put(`api/tabs/${selectedTab.value._id}`, {
          isSelected: false
        });

        selectedTab.value.isSelected = false;

        editState.ruleDetails = null;
        state.allUserTabs.push(newTab);
        state.blueBar.message = false;
        state.blueBar.loading = false;
        state.views.push('EditTab');
        state.isLoading = false;
      });
    },
    makeTabUnique: async () => {
      const tabName = selectedTab.value.tabName;
      const promptValue = prompt(`Please enter the tabName ('${tabName}') to make this tab unique.`);

      if(promptValue !== tabName) {
        return;
      }

      state.blueBar.message = 'Making Tab Unique';
      state.blueBar.loading = true;
      state.isLoading = true;
      state.views.pop();

      const currentTabId = selectedTab.value._id;
      const newTab = await createNewTab();

      nextTick(async () => {
        state.blueBar.message = 'Cloning Rules';
        await cloneRules(newTab._id, currentTabId);

        await removeAndDeselectGroupFromCurrentTab();

        editState.ruleDetails = null;
        state.allUserTabs.push(newTab);
        state.blueBar.message = false;
        state.blueBar.loading = false;
        state.views.push('EditTab');
        state.isLoading = false;
      });
    },
    saveGroups: async (newv, oldv) => {
      const { _id, showForGroup } = selectedTab.value;

      await api.put(`api/tabs/${_id}`, {
        showForGroup
      });
    },
    select: (ruleType) => {
      editState.selectedRuleType = editState.selectedRuleType === ruleType 
        ? '' 
        : ruleType;
    }
  }
}();

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