<template>
<div class="grid">

  <div class="cell-1">

    <!-- Tab Name -->
    <div class="grid middle b-bottom">
      <div class="cell-1-5 p10r section b-right bold line50">
        Name
      </div>
      <div class="cell auto section">
        <input v-model="editState.changeTabNameTo" class="transparent bold section colorBlue" type="text" />
      </div>
      <div v-if="editState.changeTabNameTo !== tab.tabName" class="cell-1-5 b-left section line50">
        <button @click="app.saveTabConfig" class="colorBlue transparent bold">Save</button>
      </div>
    </div>

    <!-- Categorize -->
    <div class="grid middle dottedRow">
      <div @click="app.select('categorize')" class="cell-1">
        <div class="grid">
          <div class="cell auto">
            Catgorize
          </div>
          <div class="cell auto right">        
            <Minus v-if="editState.isSelected==='categorize'" />
            <Plus v-else />
          </div>
        </div>
      </div>

      <div class="cell-1">
        <RulesCategorize v-if="editState.isSelected==='categorize'" :selectedTab="tab" :state="state" />
      </div>
    </div>

  </div>

  <!-- Sort -->
  <!-- Filter -->

</div>
</template>

<script setup>
import { reactive, computed } from 'vue';
import Plus from 'vue-material-design-icons/Plus.vue';
import Minus from 'vue-material-design-icons/Minus.vue';
import RulesCategorize from './RulesCategorize.vue';

import { useAppStore } from '../stores/app';

const { api } = useAppStore();
const { state } = defineProps({ state: 'object' });

const tab = computed(() =>  state.selected.tab);

const editState = reactive({
  changeTabNameTo: tab?.value?.tabName,
  isSelected: ''
});

const app = function() {
  return {
    init: async () => {
    },
    saveTabConfig: async () => {
      console.log('save tab config....');
    },
    select: (selectConfigName) => {
      editState.isSelected = 
        editState.isSelected === selectConfigName ? '' 
        : selectConfigName;
    }
  }
}();

app.init();
</script>

<style>
.transparent {
  border: 0 !important;
  background-color: transparent;
  background: transparent;
  box-shadow: none;
}
</style>