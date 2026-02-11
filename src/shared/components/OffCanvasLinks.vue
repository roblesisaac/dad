<template>
  <div class="fixed inset-0 z-50 flex justify-end font-mono">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" @click="closeMenu"></div>

    <!-- Drawer Panel -->
    <div class="relative w-full max-w-sm bg-white h-full shadow-2xl flex flex-col animate-slide-in">
      
      <!-- Header -->
      <div class="flex justify-between items-center p-6 border-b border-gray-100">
        <span class="font-bold text-lg tracking-tight">Menu</span>
        <button 
          @click="closeMenu" 
          class="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X class="w-6 h-6" />
        </button>
      </div>

      <!-- Navigation Links -->
      <div class="flex-1 overflow-y-auto py-4">
        <div class="flex flex-col space-y-2 px-4">
          <button 
            v-for="link in regularLinks"
            :key="link.path"
            @click="handleNavigation(link.path)"
            class="text-left px-4 py-3 text-lg font-medium text-gray-800 hover:bg-gray-50 rounded-lg transition-colors capitalize flex justify-between items-center group"
          >
            {{ link.name }}
            <ArrowRight class="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      <!-- Footer / Auth Action -->
      <div class="p-6 border-t border-gray-100 bg-gray-50/50">
        <button 
          @click="handleAuthClick"
          class="w-full py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
        >
          {{ authLink.name }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { X, ArrowRight } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import { useAppStore } from '@/stores/state';
import { useNavigation } from '@/shared/composables/useNavigation';

const router = useRouter();
const { State } = useAppStore();
const { regularLinks, authLink } = useNavigation();

const closeMenu = () => {
  State.showingOffCanvasLinks = false;
};

const handleNavigation = (path) => {
  router.push(path);
  closeMenu();
};

const handleAuthClick = () => {
  authLink.value.action();
  closeMenu();
};
</script>