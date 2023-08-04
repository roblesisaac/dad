<template>
<div class="grid">
  <div class="cell-1">
    <button class="linkButton" @click="State.showingOffCanvasLinks=false">x Close</button>
    <button class="linkButton" @click="app.changePath(link)"
      v-for="link in State.userViews" 
      :to="link.path || link">
        {{ link.name || link }}
    </button>
  </div>
</div>
</template>

<script setup>
import { useAppStore } from '../stores/app';
const { State, utils } = useAppStore();

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
  .linkButton {
    display: inline-block;
    width: 100%;
    color: black;
    font-size: 1.5rem;
    text-transform: uppercase;
    border-bottom: 1px dashed #000;
    background-color: antiquewhite;
    line-height: 1.1em;
    cursor: pointer;
    padding: 0.6em 0;
    font-weight: 700;
  }
</style>