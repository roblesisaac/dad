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

.sortable-chosen {
  background-color: rgba(0, 0, 0, .3);
}

.sortable-chosen div {
  background-color: rgba(0, 0, 0, .3);
  color: #fff;
}

.flip-list-move {
  transition: transform 0.2s ease-out;
}
</style>