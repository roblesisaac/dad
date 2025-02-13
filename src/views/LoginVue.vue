<template>
  <div class="min-h-screen grid grid-cols-1 md:grid-cols-3">
    <!-- <div class="col-span-full">
      <ConsentBanner />
    </div> -->
    
    <!-- Login Form Section -->
    <div class="p-6 md:p-8 bg-white">
      <LoginForm />
    </div>

    <!-- Hero Section -->
    <div class="col-span-2 p-8 md:p-12 bg-gradient-to-br from-blue-50 to-blue-100 flex flex-col justify-center">
      <h1 class="text-4xl md:text-6xl font-bold text-gray-900 mb-2">
        TrackTabs
      </h1>
      <p class="text-lg md:text-xl text-blue-700 italic">
        Track every penny.
      </p>
    </div>
  </div>
</template>

<script setup>
import LoginForm from '@/components/LoginForm.vue';
import ConsentBanner from '@/components/ConsentBanner.vue';
</script>