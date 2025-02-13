<template>
<div class="grid off-canvas">
  <div class="cell-1">
    <button class="close-window p20" @click="State.showingOffCanvasLinks=false">      
      <X />
    </button>
    <button class="link-button" @click="app.changePath(link)"
      v-for="link in State.userViews" 
      :to="link.path || link">
        {{ link.name || link }}
    </button>
  </div>
</div>
</template>

<script setup>
import { X } from 'lucide-vue-next';
import { useAppStore } from '@/stores/state';
import { useApi } from '@/shared/composables/useApi';
const { State, utils } = useAppStore();
const { api } = useApi();
const app = function() {
  async function getUserViews() {
    State.userViews = State.userViews || (await api.get('/api/userviews')).views;
  }

  return {
    changePath: (link) => {
      utils.changePath(link);
      State.showingOffCanvasLinks = false
    },
    init: () => {
      getUserViews();
    }
  }
}();

app.init();

</script>

<style scoped>
  .close-window {
    float: right;
    text-align: right;
    background-color: white;
    color: black;
    box-shadow: none;
  }
  .link-button {
    box-shadow: none;
    display: inline-block;
    width: 100%;
    color: black;
    font-size: 1.5rem;
    text-transform: uppercase;
    background-color: white;
    line-height: 1.1em;
    cursor: pointer;
    padding: 0.6em 0;
    font-weight: 700;
  }
  .off-canvas {
    background-color: white;
  }
</style>