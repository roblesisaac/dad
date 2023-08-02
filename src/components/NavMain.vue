<template>
  <nav class="grid topNav shadow middle">
    <div class="cell-1-3 text-left bold">
      <img id="logo" src="../assets/icon.svg" height="30" />
    </div>
    <div v-if="State.currentScreenSize() !== 'small'" class="cell-2-3 text-right">
      <router-link @click="utils.changePath(link)"
      v-for="link in state.userViews" 
      :to="link.path || link"
      class="proper colorBlack">
        {{ link.name || link }}
      </router-link>
      <a class="proper colorBlack" href="/logout">logout</a>
  </div>
  <div v-if="State.currentScreenSize()==='small'" class="cell-2-3 text-right">
    <span class="mdi mdi-menu p20x bold"></span>
  </div>
</nav>
</template>

<script setup>
import { onMounted, reactive } from 'vue';

import { useAppStore } from '../stores/app';
const { State, api, utils, sticky } = useAppStore();

const state = reactive({
  userViews: []
});

const app = function() {

  async function getUserViews() {
    state.userViews = (await api.get('/api/userviews')).views;
  }

  return {
    init() {
      onMounted(async () => {
        sticky.stickify('.topNav');
        await getUserViews();
      });
    }
  };
}();

app.init();

</script>

<style>
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