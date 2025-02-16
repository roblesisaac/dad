<template>
  <main class="landing-container">
    <div class="content">
      <LogoIcon class="logo-icon" />
      <h1>Welcome to TrackTabs</h1>
      <p>Track Every Penny.</p>
      
      <button 
        class="cta-button"
        @click="handleNavigation"
      >
        <component 
          :is="isAuthed ? LayoutDashboard : LogIn"
          class="icon"
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
  router.push('/spending-report');
};
</script>

<style scoped>
.landing-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.content {
  text-align: center;
  max-width: 600px;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 1rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.logo-icon {
  width: 64px;
  height: 64px;
  color: #4f46e5;
  margin-bottom: 1.5rem;
}

h1 {
  font-size: 2.5rem;
  color: #1f2937;
  margin-bottom: 1rem;
}

@media (max-width: 640px) {
  h1 {
    font-size: 2rem;
  }
}

p {
  font-size: 1.25rem;
  color: #4b5563;
  margin-bottom: 2rem;
  line-height: 1.6;
}

.cta-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  font-size: 1.125rem;
  font-weight: 500;
  color: white;
  background-color: #4f46e5;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.cta-button:hover {
  background-color: #4338ca;
}

.icon {
  width: 20px;
  height: 20px;
}
</style>