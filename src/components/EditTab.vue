<template>
<div class="grid">

  <div class="cell-1">

    <!-- Tab Name -->
    <div class="grid middle b-bottom">
      <div class="cell-1-5 section b-right bold line50">
        <small>TabName</small>
      </div>
      <div class="cell-3-5 section">
        <input v-model="editState.changeTabNameTo" class="transparent bold section colorBlue" type="text" />
      </div>
      <div v-if="editState.changeTabNameTo !== selectedTab.tabName" class="cell-1-5 b-left section line50">
        <button @click="app.saveTabConfig()" class="colorBlue transparent bold saveTabName">Save</button>
      </div>
    </div>

    <!-- Sort -->
    <div class="grid middle dottedRow">
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
        <RulesRenderer v-if="editState.selectedRuleType==='sort'" ruleType="sort" :selectedTab="selectedTab" :state="state" />
      </div>
    </div>

    <!-- Categorize -->
    <div class="grid middle dottedRow">
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
        <RulesRenderer v-if="editState.selectedRuleType==='categorize'" ruleType="categorize" :selectedTab="selectedTab" :state="state" />
      </div>
    </div>

    <!-- Filter -->
    <div class="grid middle dottedRow">
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

    <!-- Delete Tab -->
    <div class="grid middle">
      <div class="cell-1 p20">
        <button @click="app.deleteTab" class="button transparent colorDarkRed expanded">Delete Tab</button>
      </div>
    </div>

  </div>

</div>
</template>

<script setup>
import { reactive } from 'vue';
import Plus from 'vue-material-design-icons/Plus.vue';
import Minus from 'vue-material-design-icons/Minus.vue';
import RulesRenderer from './RulesRenderer.vue';
import { useAppStore } from '../stores/app';

const { api } = useAppStore();
const { state } = defineProps({ state: 'object' });

const selectedTab = state.selected.tab;

const editState = reactive({
  changeTabNameTo: selectedTab.tabName,
  selectedRuleType: ''
});

const app = function() {
  function findTab(_id) {
    return state.allUserTabs.find(tab => tab._id === _id);
  }

  return {
    deleteTab: async () => {
      if(!confirm('You sure?')) {
        return;
      }
      
      const tabIndex = state.allUserTabs.findIndex(tab => tab._id === selectedTab._id);

      //delete all rules specific to tab

      state.allUserTabs.splice(tabIndex, 1);
      await api.delete(`api/tabs/${selectedTab._id}`);

      state.view = 'home';
    },
    saveTabConfig: async () => {
      const tabId = selectedTab._id;
      const newName = editState.changeTabNameTo;

      await api.put(`api/tabs/${tabId}`, {
        tabName: newName
      });

      const existingTab = findTab(tabId);
      existingTab.tabName = newName;
    },
    select: (ruleType) => {
      editState.selectedRuleType = editState.selectedRuleType === ruleType 
        ? '' 
        : ruleType;
    }
  }
}();
</script>

<style>
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