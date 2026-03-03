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
  
  // If route meta is explicitly set to hide nav, hide it
  if (route.meta.hideNav) return false;
  
  // During initial load, route meta might be unresolved.
  // Check window location directly to prevent flash.
  const path = window.location.pathname;
  if (
    path.startsWith('/dashboard') || 
    path.startsWith('/reports') || 
    path.startsWith('/records')
  ) {
    return false;
  }

  return true;
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
