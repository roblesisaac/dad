<template>
  <NavMain />
  <router-view />
</template>

<script setup>
import NavMain from './components/NavMain.vue';
</script>

<style>
@import "css/palette.css";
@import "css/grid.css";
@import "css/utils.css";
@import "css/colors.css";
@import "css/style.css";
@import "css/f-icons/foundation-icons.css";

.topNav a {
  font-weight: bold;
  padding: 20px;
}
</style>