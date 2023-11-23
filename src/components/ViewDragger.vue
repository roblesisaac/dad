<template>
  <Draggable class="grid draggable" v-model="state[listName]" v-bind="props.state.dragOptions()">
    <template #item="{element}">
      <div :class="' cell-1-'+columns">
        <div class="p5r p5b">
          <button @dblclick="specialClick($event, element)" class="grid viewButton">
            <div class="cell-1 proper center middle">
              {{ element }}
            </div>
          </button>
        </div>
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
  
  const columns = props.cols || 2;

  function specialClick($event, view) {
    if(!props.onDblClick) {
      return;
    }

    props.onDblClick($event, view);
  }
  
  </script>
  
  <style scoped>
  
  .sortable-chosen .viewButton {
    background-color: rgba(0, 0, 255, .4);
    color: #fff;
  }
  
  </style>