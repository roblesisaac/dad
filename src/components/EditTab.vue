<template>
<div class="grid">

  <div class="cell-1">
    <!-- SpecialGoBack -->
    <button @click="app.goBack" class="acctButton section b-bottom"><ChevronLeft class="icon" /> Back</button>

    <!-- RuleSharer -->
    <RuleSharer v-if="editState.ruleSharer" :editState="editState" :ruleConfig="editState.ruleSharer" :state="state" />

    <!-- Tab Name -->
    <div v-if="!editState.ruleSharer" class="grid middle b-bottom">
      <div class="cell-1-5 section b-right bold line50">
        <small>TabName</small>
      </div>
      <div class="cell-4-5 section">
        <input v-model="editState.changeTabNameTo" class="transparent bold section colorBlue" type="text" />
      </div>
      <!-- <div v-if="editState.changeTabNameTo !== selectedTab.tabName" class="cell-1-5 b-left section line50">
        <button @click="app.saveTabConfig()" class="colorBlue transparent bold saveTabName">Save</button>
      </div> -->
    </div>

    <!-- Sort -->
    <div v-if="!editState.ruleSharer" class="grid middle dottedRow">
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
        <RulesRenderer v-if="editState.selectedRuleType==='sort'" :editState="editState" ruleType="sort" :selectedTab="selectedTab" :state="state" />
      </div>
    </div>

    <!-- Categorize -->
    <div v-if="!editState.ruleSharer" class="grid middle dottedRow">
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
        <RulesRenderer v-if="editState.selectedRuleType==='categorize'" :editState="editState" ruleType="categorize" :selectedTab="selectedTab" :state="state" />
      </div>
    </div>

    <!-- Filter -->
    <div v-if="!editState.ruleSharer" class="grid middle dottedRow">
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
        <RulesRenderer v-if="editState.selectedRuleType==='filter'" :editState="editState" ruleType="filter" :state="state" />
      </div>
    </div>

    <!-- Share -->
    <div v-if="!editState.ruleSharer" class="grid middle dottedRow">
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
          <Draggable class="draggable" group="groupDragger" v-model="selectedTab.showForGroup" v-bind="dragOptions">
            <button v-for="groupId in selectedTab.showForGroup" class="sharedWith">{{ getGroupName(groupId) }}</button>
          </Draggable>
        </div>
      </div>

      <div v-if="editState.selectedRuleType==='sharing'" class="cell-1">
        <ScrollingContent class="p30y">
        <Draggable class="draggable" group="groupDragger" v-model="unselectedGroupsInTab" v-bind="dragOptions">
          <button v-for="groupId in unselectedGroupsInTab" class="button sharedWith">{{ getGroupName(groupId) }}</button>
        </Draggable>
        </ScrollingContent>
      </div>

      <button @click="app.makeTabUnique" class="bgBlack expanded">Make Tab Unique?</button>
    </div>

    <!-- Delete Tab -->
    <div v-if="!editState.ruleSharer" class="grid middle">
      <div class="cell-1 p20">
        <button @click="app.deleteTab" class="button transparent colorDarkRed expanded">Delete Tab</button>
      </div>
    </div>

  </div>

</div>
</template>

<script setup>
import { computed, reactive, watch } from 'vue';

import { VueDraggableNext as Draggable } from 'vue-draggable-next';
import ScrollingContent from './ScrollingContent.vue';
import ChevronLeft from 'vue-material-design-icons/ChevronLeft.vue';
import Plus from 'vue-material-design-icons/Plus.vue';
import Minus from 'vue-material-design-icons/Minus.vue';
import RulesRenderer from './RulesRenderer.vue';
import RuleSharer from './RuleSharer.vue';
import { useAppStore } from '../stores/app';

const { api } = useAppStore();
const { state } = defineProps({ state: 'object' });

const dragOptions = {
  animation: 200,
  touchStartThreshold: 100
};

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
  function findTab(_id) {
    return state.allUserTabs.find(tab => tab._id === _id);
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
    changeTabNam: async () => {
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

      state.view = 'home';
      state.allUserTabs.splice(tabIndex, 1);
      await api.delete(`api/tabs/${selectedTabId}`);
    },
    goBack: () => {
      if(editState.ruleSharer) {
        editState.ruleSharer = null;
        return;
      }

      state.view = 'home';
    },
    makeTabUnique: () => {
      if(!prompt(`Please enter the tabName ('${selectedTab.value.tabName}') to make this tab unique`)) {
        return;
      }

      console.log('made unique!');
    },
    saveGroups: async () => {
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

watch(() => editState.changeTabNameTo, app.changeTabNam);
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