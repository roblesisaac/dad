<template>
  <NavMain v-if="showNav" />
  <Transition>
    <OffCanvasLinks v-if="State.showingOffCanvasLinks" />
  </Transition>

  <router-view v-if="!State.showingOffCanvasLinks" />
</template>

<script setup>
import NavMain from './shared/components/NavMain.vue';
import OffCanvasLinks from './shared/components/OffCanvasLinks.vue';
import { useRoute } from 'vue-router';
import { useAppStore } from './stores/state';
import { computed } from 'vue';

const { State } = useAppStore();
const route = useRoute();

const showNav = computed(() => {
  // Always hide if off-canvas links are showing
  if (State.showingOffCanvasLinks) return false;
  
  // User requested to only show on path '/'
  // We check window.location.pathname directly because route.path 
  // can default to '/' during initial mounting before the router is ready.
  const path = window.location.pathname;
  
  // Force update when route changes
  const _routePath = route.path; 

  return path === '/';
});
</script>

<style>
@import "css/tailwind.css";
/* @import "css/palette.css"; */
@import "css/grid.css";
@import "css/theme-overrides.css";
/* @import "css/utils.css"; */
/* @import "css/colors.css"; */
/* @import "css/style.css"; */
</style>
