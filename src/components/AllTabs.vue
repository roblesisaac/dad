<template>
<div class="flex flex-col space-y-4">

  <!-- Rows of Tabs -->
  <div>
    <Draggable 
      v-model="props.state.selected.tabsForGroup" 
      v-bind="props.state.dragOptions()" 
      handle=".handlerTab"
    >
      <template #item="{element}">
        <AllTabRow :app="app" :state="state" :element="element" :key="element._id" />
      </template>
    </Draggable>
  </div>

  <!-- New Tab -->
  <div>
    <button 
      @click="createNew" 
      class="w-full py-5 bg-blue-100 hover:bg-blue-200 text-gray-800 font-medium transition-colors duration-200 border-b-2 border-blue-300"
    >
      + New Tab
    </button>
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