<template>
<div class="x-grid off-canvas">
  <div class="cell-1">
    <button class="close-window p20" @click="closeMenu">      
      <X />
    </button>
    
    <!-- Regular Navigation Links -->
    <button 
      v-for="link in regularLinks"
      :key="link.path"
      class="link-button" 
      @click="handleNavigation(link.path)"
    >
      {{ link.name }}
    </button>
    
    <!-- Auth Link -->
    <button 
      class="link-button" 
      @click="handleAuthClick"
    >
      {{ authLink.name }}
    </button>
  </div>
</div>
</template>

<script setup>
import { X } from 'lucide-vue-next';
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

<style scoped>
.close-window {
  float: right;
  text-align: right;
  background-color: white;
  color: black;
  box-shadow: none;
}

.link-button {
  box-shadow: none;
  display: inline-block;
  width: 100%;
  color: black;
  font-size: 1.5rem;
  text-transform: uppercase;
  background-color: white;
  line-height: 1.1em;
  cursor: pointer;
  padding: 0.6em 0;
  font-weight: 700;
}

.off-canvas {
  background-color: white;
}
</style>