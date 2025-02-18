<template>
<div class="x-grid">
  <div class="cell-1">
    <Draggable 
      v-model="props.state.selected.tabsForGroup" 
      v-bind="props.state.dragOptions()" 
      handle=".handlerTab"
    >
      <template #item="{element}">
        <AllTabRow 
          :app="app" 
          :state="state" 
          :element="element" 
          :key="element._id" 
        />
      </template>
    </Draggable>
  </div>

  <div class="cell-1">
    <button @click="handleCreateNew" class="expanded createNewTab">
      + New Tab
    </button>
  </div>
</div>
</template>

<script setup>
import { onMounted } from 'vue';
import AllTabRow from './AllTabRow.vue';
import Draggable from 'vuedraggable';
import { useTabs } from '../composables/useTabs';

const props = defineProps({
  app: Object,
  state: Object
});

const { createNewTab } = useTabs();

function handleCreateNew() {
  createNewTab(props.app.createNewTab, props.app.goBack);
}

onMounted(() => {
  window.scrollTo(0, 0);
});
</script>

<style scoped>
.createNewTab {
  background: lightblue;
  color: black;
  border-bottom: 2px solid;
  padding: 20px;
}
</style> 