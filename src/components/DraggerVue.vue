<template>
  <draggable class="grid draggable" v-model="state[listName]" v-bind="dragOptions">
    <div :class="' cell-1-'+columns" v-for="view in state[listName]" :key="view+randomNumber()">
      <div class="p5r p5b">
        <button class="grid viewButton">
          <div class="cell-1 proper center middle">
            {{  view }}
          </div>
        </button>
      </div>
    </div>
  </draggable>
  </template>
  
  <script setup>
  import { VueDraggableNext as draggable } from 'vue-draggable-next';
  import { randomNumber } from '../utils';
  
  const props = defineProps({
    cols: Number,
    listName: String,
    state: Object,
  });
  
  const columns = props.cols || 2;
  
  const dragOptions = {
    animation: 200,
    touchStartThreshold: 100
  };
  
  </script>
  
  <style scoped>
  
  .sortable-chosen .viewButton {
    background-color: rgba(0, 0, 255, .4);
    color: #fff;
  }
  
  </style>