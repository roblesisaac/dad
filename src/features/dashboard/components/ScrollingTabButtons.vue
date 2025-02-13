<template>
  <div class="relative group">
    <!-- Scroll Shadow Indicators -->
    <div class="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
    <div class="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>

    <!-- Scroll Buttons -->
    <button
      @click="$refs.container.scrollBy({left: -200, behavior: 'smooth'})"
      class="absolute left-0 inset-y-0 px-2 bg-white bg-opacity-80 hover:bg-opacity-100 z-20 opacity-0 group-hover:opacity-100 transition-opacity"
      aria-label="Scroll left"
    >
      <ChevronLeft class="w-5 h-5 text-gray-600" />
    </button>

    <button
      @click="$refs.container.scrollBy({left: 200, behavior: 'smooth'})"
      class="absolute right-0 inset-y-0 px-2 bg-white bg-opacity-80 hover:bg-opacity-100 z-20 opacity-0 group-hover:opacity-100 transition-opacity"
      aria-label="Scroll right"
    >
      <ChevronRight class="w-5 h-5 text-gray-600" />
    </button>

    <!-- Scrolling Container -->
    <div 
      ref="container"
      class="overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory"
    >
      <div class="inline-flex space-x-2 px-2">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';
</script>

<style scoped>
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>