<template>
  <NavMain v-if="!State.showingOffCanvasLinks" />
  <Transition>
  <OffCanvasLinks v-if="State.showingOffCanvasLinks" />
  </Transition>

  <router-view v-if="!State.showingOffCanvasLinks" />

  <Transition>
    <StayLoggedIn v-if="State.showStayLoggedInForm" />
  </Transition>
  <Transition>
    <ShowLoginForm v-if="State.showLoginForm" />
  </Transition>
</template>

<script setup>
import NavMain from './components/NavMain.vue';
import OffCanvasLinks from './components/OffCanvasLinks.vue';
import StayLoggedIn from './components/StayLoggedIn.vue';
import ShowLoginForm from './components/ShowLoginForm.vue';

import { useAppStore } from './stores/state';
const { State, Session } = useAppStore();

Session.watchSession();

</script>

<style>
@import "css/palette.css";
@import "css/grid.css";
@import "css/utils.css";
@import "css/colors.css";
@import "css/style.css";
</style>