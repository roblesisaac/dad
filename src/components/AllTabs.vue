<template>
<div class="grid">

  <!-- Rows of Tabs -->
  <div class="cell-1">
    <Draggable v-model="props.state.selected.tabsForGroup" v-bind="props.state.dragOptions()" handle=".handlerTab">
      <template #item="{element}">
        <AllTabRow :app="app" :state="state" :element="element" :key="element._id" />
      </template>
    </Draggable>

  </div>


  <!-- New Tab -->
  <div class="cell-1">
    <button @click="createNew" class="expanded createNewTab">+ New Tab</button>
  </div>

</div>
</template>

<script setup>
import { onMounted } from 'vue';

import AllTabRow from './AllTabRow.vue';
import Draggable from 'vuedraggable';

const props = defineProps({
  app: Object,
  state: Object
});

async function createNew() {
  await props.app.createNewTab();
  props.app.goBack();
}

onMounted(() => {
  window.scrollTo(0, 0);
});

</script>

<style>
.createNewTab {
  background: lightblue;
  color: black;
  border-bottom: 2px solid;
  padding: 20px;
}
</style>