<template>
  <NavMain v-if="!State.showingOffCanvasLinks" />
  <Transition>
  <OffCanvasLinks v-if="State.showingOffCanvasLinks" />
  </Transition>

  <router-view v-if="!State.showingOffCanvasLinks" />
</template>

<script setup>
import NavMain from './components/NavMain.vue';
import OffCanvasLinks from './components/OffCanvasLinks.vue';

import { useAppStore } from './stores/app';
const { State } = useAppStore();


</script>

<style>
@import "css/palette.css";
@import "css/grid.css";
@import "css/utils.css";
@import "css/colors.css";
@import "css/style.css";
@import "css/f-icons/foundation-icons.css";
@import "@mdi/font/css/materialdesignicons.css" ;
</style>