<template>
<div class="grid">
  <div class="cell-20-24">
    <Draggable class="draggable button-container" :class="{ 'toggle-scroll': !isSmallScreen }" handle=".handleTab" v-model="props.state.selected.tabsForGroup" v-bind="props.state.dragOptions(100)">
      <template #item="{element}">
        <TabButton
          :state="state" 
          :tab="element" 
          :key="element._id"
          class="reportTab" />
      </template>
    </Draggable>
  </div>
  <div class="cell-4-24">
    <button @click="props.state.views.push('AllTabs')" class="view-all b-bottom b-left expanded">All</button>
  </div>
</div>

</template>

<script setup>
import { computed } from 'vue';
import TabButton from './TabButton.vue';
import Draggable from 'vuedraggable';

const props = defineProps({
  app: Object,
  state: Object
});

const isSmallScreen = computed(() => props.state.isSmallScreen());

</script>

<style>
.button-container {
  display: flex;
  overflow-x: auto;
  white-space: nowrap;
}

.button-container::-webkit-scrollbar {
  width: 0;
  background: transparent;
}

.toggle-scroll:hover::-webkit-scrollbar {
  width: 8px;
  background-color: rgba(0, 0, 0, 0.1);
}

.toggle-scroll:hover::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
}

.view-all {
  height: 50px;
  background: #f3f3ee;
  color: blue;
  border-radius: 0 0 3px 3px;
}

.view-all:hover,
.view-all:active,
.view-all:focus {
  background: #f3f3ee;
  color: blue;
  outline: none;
}
</style>