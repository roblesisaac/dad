<template>
  <nav class="sticky top-0 z-50 bg-white flex items-center justify-between border-b-2 border-black shadow-sm transition-all duration-300">
    <!-- Logo -->
    <div class="flex items-center font-bold pl-5">
      <button 
        @click="app.reload" 
        class="h-10 w-10 flex items-center justify-center border-2 border-black rounded text-black hover:bg-black hover:text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
      >
        T
      </button>
      <span class="ml-3 text-lg">TrackTabs</span>
    </div>

    <!-- Desktop Navigation -->
    <div v-if="State.currentScreenSize() !== 'small'" class="flex items-center">
      <router-link 
        v-for="link in State.userViews" 
        :key="link.path || link"
        @click="utils.changePath(link)"
        :to="link.path || link"
        class="px-6 py-5 font-medium text-gray-700 capitalize border-l-2 border-black hover:bg-gray-50 hover:text-black transition-colors duration-200"
      >
        {{ link.name || link }}
      </router-link>
    </div>

    <!-- Mobile Menu Button -->
    <button 
      v-else
      class="p-4 text-gray-700 hover:text-black focus:outline-none focus:ring-2 focus:ring-inset focus:ring-black"
      @click="State.showingOffCanvasLinks=true"
      aria-label="Menu"
    >
      <Menu class="w-6 h-6" />
    </button>
  </nav>
</template>

<script setup>
import { onMounted } from 'vue';
import { Menu } from 'lucide-vue-next';
import { useAppStore } from '@/stores/state';

const { State, api, utils } = useAppStore();

const app = {
  init() {
    onMounted(() => {
      getUserViews();
    });
  },
  reload: () => window.location.reload()
};

async function getUserViews() {
  State.userViews = State.userViews || (await api.get('/api/userviews')).views;
}

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