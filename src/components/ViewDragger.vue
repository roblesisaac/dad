<template>
  <Draggable 
    class="grid grid-cols-2 gap-2" 
    v-model="state[listName]" 
    v-bind="dragOptions"
  >
    <template #item="{element}">
      <div>
        <button 
          @dblclick="specialClick($event, element)" 
          class="w-full p-4 text-center bg-white hover:bg-gray-50 border border-gray-200 rounded-lg shadow-sm transition-colors duration-200"
        >
          <div class="capitalize">{{ element }}</div>
        </button>
      </div>
    </template>
  </Draggable>
</template>

<script setup>
import Draggable from 'vuedraggable';

const props = defineProps({
  cols: Number,
  listName: String,
  state: Object,
  onDblClick: Function
});

const dragOptions = {
  animation: 200,
  delay: 100,
  touchStartThreshold: 100
}

const columns = props.cols || 2;

function specialClick($event, view) {
  if(!props.onDblClick) {
    return;
  }

  props.onDblClick($event, view);
}
</script>