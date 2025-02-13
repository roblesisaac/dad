<template>
  <div class="bg-white h-full">
    <div class="p-5">
      <button 
        class="float-right p-2 text-black hover:text-gray-600 transition-colors" 
        @click="State.showingOffCanvasLinks=false"
      >      
        <X />
      </button>
      
      <button 
        v-for="link in State.userViews"
        :key="link.path || link"
        @click="app.changePath(link)"
        class="w-full py-3 text-left text-2xl font-bold text-black uppercase hover:bg-gray-50 transition-colors"
      >
        {{ link.name || link }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { X } from 'lucide-vue-next';
import { useAppStore } from '@/stores/state';
const { api, State, utils } = useAppStore();

const app = {
  changePath: (link) => {
    utils.changePath(link);
    State.showingOffCanvasLinks = false
  },
  init: () => {
    getUserViews();
  }
};

async function getUserViews() {
  State.userViews = State.userViews || (await api.get('/api/userviews')).views;
}

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