<template>
  <nav class="grid topNav shadow middle">
    
    <!-- logo -->
    <div class="cell auto text-left bold p20l">
      <button @click="app.reload" class="logoBtn">T</button> TrackTabs
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

import { useAppStore } from '../stores/state';
const { State, api, utils, sticky, stickify } = useAppStore();

const app = function() {
  async function getUserViews() {
    State.userViews = State.userViews || (await api.get('/api/userviews')).views;
  }

  return {
    init: function () {
      onMounted(() => {
        stickify.stickify('.topNav');
      });

      getUserViews();
    },
    reload: () => window.location.reload()
  };
}();

app.init();

</script>

<style>
.menu-icon {
  color: black;
}

.topNav {
  background: rgb(243 243 238);
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

.logoBtn {
  background-color: transparent;
  /* box-shadow: 1px 1px #333; */
  color: #000;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
  transition-duration: .4s;
  cursor: pointer;
  /* border-radius: 5px; */
  padding: 5px 10px;
  border: 2px solid #000;
}

.logoBtn:hover {
  background-color: #000;
  color: #fff;
}

</style>