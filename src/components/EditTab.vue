<template>
<div class="grid">

  <div class="cell-1">

    <!-- Tab Name -->
    <div v-if="!state.is('EditRule')" class="grid middle b-bottom">
      <div class="cell-2-5 section b-right bold line50">
        <small>Tab Name</small>
      </div>
      <div class="cell-3-5 section">
        <input v-model="editState.changeTabNameTo" class="transparent bold section colorBlue" type="text" />
      </div>
      <!-- <div v-if="editState.changeTabNameTo !== selectedTab.tabName" class="cell-1-5 b-left section line50">
        <button @click="app.saveTabConfig()" class="colorBlue transparent bold saveTabName">Save</button>
      </div> -->
    </div>

    <!-- Sort -->
    <div v-if="!state.is('EditRule')" class="grid middle dottedRow">
      <div @click="app.select('sort')" class="cell-1">
        <div class="grid">
          <div class="cell auto">
            Sort
          </div>
          <div class="cell auto right">        
            <Minus v-if="editState.selectedRuleType==='sort'" />
            <Plus v-else />
          </div>
        </div>
      </div>

      <div class="cell-1">
        <RulesRenderer v-if="editState.selectedRuleType==='sort'" ruleType="sort" :state="state" />
      </div>
    </div>

    <!-- Categorize -->
    <div v-if="!state.is('EditRule')" class="grid middle dottedRow">
      <div @click="app.select('categorize')" class="cell-1">
        <div class="grid">
          <div class="cell auto">
            Categorize
          </div>
          <div class="cell auto right">        
            <Minus v-if="editState.selectedRuleType==='categorize'" />
            <Plus v-else />
          </div>
        </div>
      </div>

      <div class="cell-1">
        <RulesRenderer v-if="editState.selectedRuleType==='categorize'" ruleType="categorize" :state="state" />
      </div>
    </div>

    <!-- Filter -->
    <div v-if="!state.is('EditRule')" class="grid middle dottedRow">
      <div @click="app.select('filter')" class="cell-1">
        <div class="grid">
          <div class="cell auto">
            Filter
          </div>
          <div class="cell auto right">        
            <Minus v-if="editState.selectedRuleType==='filter'" />
            <Plus v-else />
          </div>
        </div>
      </div>

      <div class="cell-1">
        <RulesRenderer v-if="editState.selectedRuleType==='filter'" ruleType="filter" :state="state" />
      </div>
    </div>

    <!-- GroupBy -->
    <div v-if="!state.is('EditRule')" class="grid middle dottedRow">
      <div @click="app.select('groupBy')" class="cell-1">
        <div class="grid">
          <div class="cell auto">
            Group By
          </div>
          <div class="cell auto right">        
            <Minus v-if="editState.selectedRuleType==='groupBy'" />
            <Plus v-else />
          </div>
        </div>
      </div>

      <div class="cell-1">
        <RulesRenderer v-if="editState.selectedRuleType==='groupBy'" ruleType="groupBy" :state="state" />
      </div>
    </div>

    <!-- Share -->
    <div v-if="!state.is('EditRule')" class="grid middle dottedRow">
      <div @click="app.select('sharing')" class="cell-1">
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
      <div v-if="editState.selectedRuleType==='sharing'" class="cell-1">
        <b>Groups Tab Is Shared With:</b>
        <div class="dropHere">
          <span v-if="!selectedTab.showForGroup.length">Drag and drop groups here.</span>
          <Draggable class="draggable" group="groupDragger" v-model="selectedTab.showForGroup" v-bind="state.dragOptions()">
            <template #item="{element}">
              <button class="sharedWith">{{ getGroupName(element) }}</button></template>
          </Draggable>
        </div>
      </div>

      <div v-if="editState.selectedRuleType==='sharing'" class="cell-1">
        <ScrollingContent class="p30y">
        <Draggable class="draggable" group="groupDragger" v-model="unselectedGroupsInTab" v-bind="state.dragOptions()">
          <template #item="{element}">
          <button class="button sharedWith">{{ getGroupName(element) }}</button>
          </template>
        </Draggable>
        </ScrollingContent>
      </div>

      <div v-if="editState.selectedRuleType==='sharing' && selectedTab.showForGroup.length > 1" class="cell-1">
        <button @click="app.makeTabUnique" class="bgBlack expanded">Make Tab Unique?</button>
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
import Plus from 'vue-material-design-icons/Plus.vue';
import Minus from 'vue-material-design-icons/Minus.vue';
import RulesRenderer from './RulesRenderer.vue';
import { useAppStore } from '../stores/state';

const { api } = useAppStore();
const { App, state } = defineProps({ state: Object, App: Object });

const selectedTab = computed(() => state.selected.tab);

const editState = reactive({
  changeTabNameTo: selectedTab.value.tabName,
  ruleSharer: null,
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
      console.log('changetabname...');
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

        editState.ruleSharer = null;
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

        editState.ruleSharer = null;
        state.allUserTabs.push(newTab);
        state.blueBar.message = false;
        state.blueBar.loading = false;
        state.views.push('EditTab');
        state.isLoading = false;
      });
    },
    saveGroups: async (newv, oldv) => {
      console.log('savegroup', {newv, oldv})
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
</style>