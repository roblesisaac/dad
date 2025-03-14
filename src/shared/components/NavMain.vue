<template>
  <nav class="grid grid-cols-2 shadow bg-white border-b-2 border-black transition-all duration-300">
    
    <!-- logo -->
    <div class="col-auto text-left font-bold pl-5">
      <button @click="reload" class="h-8 w-8 border-2 border-black rounded text-center font-bold text-black hover:bg-black hover:text-white transition-colors duration-400 cursor-pointer my-[15px] mx-0 p-0">T</button>
      <span class="ml-2">TrackTabs</span>
    </div>

    <!-- links -->
    <div v-if="State.currentScreenSize() !== 'small'" class="col-auto text-right">
      <router-link
        v-for="link in regularLinks"
        :key="link.path"
        :to="link.path"
        class="font-bold p-5 inline-block border-l-2 border-black text-black"
      >
        {{ link.name }}
      </router-link>
      <a 
        href="#"
        class="font-bold p-5 inline-block border-l-2 border-black text-black"
        @click.prevent="authLink.action"
      >
        {{ authLink.name }}
      </a>
    </div>

    <!-- hamburger -->
    <div v-if="State.currentScreenSize()==='small'" class="col-auto text-right" @click="State.showingOffCanvasLinks=true">
      <a href="#" class="text-black p-5 inline-block">
        <Menu />
      </a>
    </div>

  </nav>
</template>

<script setup>
import { Menu } from 'lucide-vue-next';
import { useNavigation } from '@/shared/composables/useNavigation';
import { useAppStore } from '@/stores/state';

const { State } = useAppStore();
const { regularLinks, authLink } = useNavigation();

const reload = () => window.location.reload();

</script>