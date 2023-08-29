<template>
  <nav class="grid topNav shadow middle">
    
    <!-- logo -->
    <div class="cell auto text-left bold">
      <img id="logo" src="../assets/icon.svg" height="30" />
    </div>

    <!-- links -->
    <div v-if="State.currentScreenSize() !== 'small'" class="cell auto text-right">
      <router-link @click="utils.changePath(link)"
      v-for="link in State.userViews" 
      :to="link.path || link"
      class="proper colorBlack">
        {{ link.name || link }}
      </router-link>
  </div>

  <!-- hamburger -->
  <div v-if="State.currentScreenSize()==='small'" class="cell shrink text-right" @click="State.showingOffCanvasLinks=true">
    <a href="#" class="menu-icon">
      <MenuIcon />
    </a>
  </div>

</nav>
</template>

<script setup>
import { onMounted } from 'vue';
import MenuIcon from 'vue-material-design-icons/Menu.vue';

import { useAppStore } from '../stores/app';
const { State, api, utils, sticky } = useAppStore();

const app = function() {
  async function getUserViews() {
    State.userViews = State.userViews || (await api.get('/api/userviews')).views;
  }

  return {
    init: function () {
      onMounted(() => {
        sticky.stickify('.topNav');
      });

      getUserViews();
    }
  };
}();

app.init();

</script>

<style>
.menu-icon {
  color: black;
}

.topNav {
  background: #fff;
  transition: all .3s;
  border-bottom: 2px solid #000;
}

.topNav.is-sticky {
  padding: 10px 10px;
}

.topNav a {
  font-weight: bold;
  padding: 20px;
  display: inline-block;
  border-left: 2px solid #000;
}

#logo {
  padding: 10px;
  display: block;
}
</style>