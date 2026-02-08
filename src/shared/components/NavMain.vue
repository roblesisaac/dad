<template>
  <nav class="shadow bg-white border-b-2 border-black transition-all duration-300">
    <div class="max-w-7xl mx-auto w-full flex justify-between items-center px-5">
      <!-- logo -->
      <div class="flex items-center font-bold">
        <button @click="reload" class="h-8 w-8 border-2 border-black rounded flex items-center justify-center font-bold text-black hover:bg-black hover:text-white transition-colors duration-400 cursor-pointer p-0">T</button>
        <span class="ml-2">TrackTabs</span>
      </div>

      <!-- links -->
      <div v-if="State.currentScreenSize() !== 'small'" class="flex items-center space-x-6">
        <router-link
          v-for="link in regularLinks"
          :key="link.path"
          :to="link.path"
          class="font-bold py-5 text-black hover:underline capitalize"
        >
          {{ link.name }}
        </router-link>
        <a 
          href="#"
          class="font-bold py-5 text-black hover:underline capitalize"
          @click.prevent="authLink.action"
        >
          {{ authLink.name }}
        </a>
      </div>

      <!-- hamburger -->
      <div v-if="State.currentScreenSize()==='small'" class="" @click="State.showingOffCanvasLinks=true">
        <a href="#" class="text-black inline-block py-5">
          <Menu />
        </a>
      </div>
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