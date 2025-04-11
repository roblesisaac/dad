<template>
  <NavMain v-if="!State.showingOffCanvasLinks" />
  <Transition>
    <OffCanvasLinks v-if="State.showingOffCanvasLinks" />
  </Transition>

  <router-view v-if="!State.showingOffCanvasLinks" />
  
  <!-- Notification system -->
  <NotificationList />
</template>

<script setup>
import NavMain from './shared/components/NavMain.vue';
import OffCanvasLinks from './shared/components/OffCanvasLinks.vue';
import NotificationList from './shared/components/NotificationList.vue';

import { useAppStore } from './stores/state';
const { State } = useAppStore();
</script>

<style>
@import "css/tailwind.css";
/* @import "css/palette.css"; */
@import "css/grid.css";
/* @import "css/utils.css"; */
/* @import "css/colors.css"; */
/* @import "css/style.css"; */
</style>