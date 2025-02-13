<template>
  <div class="fixed inset-x-0 bottom-0 bg-white shadow-lg border-t border-gray-200">
    <div class="max-w-lg mx-auto p-6 text-center">
      <h2 class="text-xl font-semibold mb-2">Stay Logged In</h2>
      <p class="text-gray-600 mb-4">Your session is about to expire. Do you want to stay logged in?</p>
      <button 
        @click="Session.touch"
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Stay Logged In
      </button>
    </div>
  </div>
</template>

<script setup>
import { useAppStore } from '@/stores/state';
const { Session } = useAppStore();
</script>

<style scoped>
.stay-logged-in-popup {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 1rem;
  background-color: #fff;
  box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.2);
  text-align: center;
}
</style>