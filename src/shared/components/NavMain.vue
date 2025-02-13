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
      <Menu />
    </a>
  </div>

</nav>
</template>

<script setup>
import { onMounted } from 'vue';
import { Menu } from 'lucide-vue-next';

import { useAppStore } from '@/stores/state';
const { State, api, utils, stickify } = useAppStore();

const app = function() {
  async function getUserViews() {
    State.userViews = State.userViews || (await api.get('/api/userviews')).views;
  }

  return {
    init: function () {
      onMounted(() => {
        // stickify.register('.topNav');
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
  transition: all .3s;
  border-bottom: 2px solid #000;
}

.topNav a {
  font-weight: bold;
  padding: 20px;
  display: inline-block;
  border-left: 2px solid #000;
}

.topNav button {
  margin: 15px 0;
}

#logo {
  padding: 10px;
  display: block;
}

.logoBtn {
  color: #000;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
  transition-duration: .4s;
  cursor: pointer;
  padding: 5px 10px;
  border: 2px solid #000;
  border-radius: 3px;
  font-weight: bold;
  height: 32px;
  width: 32px;
}

.logoBtn:hover {
  background-color: #000;
  color: #fff;
}

</style>