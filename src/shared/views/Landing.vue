<template>
  <main class="min-h-screen flex items-start justify-center p-4 bg-gradient-to-br from-gray-50 to-blue-100">
    <div class="text-center max-w-xl mt-24 p-8 bg-white/90 rounded-2xl shadow-lg">
      <LogoIcon class="w-16 h-16 text-indigo-600 mx-auto mb-6" />
      <h1 class="text-4xl text-gray-800 mb-4 sm:text-3xl">Welcome to TrackTabs</h1>
      <p class="text-xl text-gray-600 mb-8">Track Every Penny.</p>
      
      <button 
        class="inline-flex items-center justify-center gap-2 px-6 py-3 text-lg font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
        @click="handleNavigation"
      >
        <component 
          :is="isAuthed ? LayoutDashboard : LogIn"
          class="w-5 h-5"
        />
        {{ isAuthed ? 'Go to Dashboard' : 'Login' }}
      </button>
    </div>
  </main>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useAuth } from '@/shared/composables/useAuth.js';
import { LogIn, LayoutDashboard, ChartNoAxesCombined as LogoIcon } from 'lucide-vue-next';

const router = useRouter();
const { isAuthed } = useAuth();

const handleNavigation = () => {
  router.push('/dashboard');
};
</script>