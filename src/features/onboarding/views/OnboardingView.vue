<template>
  <div class="w-full flex flex-col justify-center items-center px-4 py-8 sm:py-12">
    <div class="w-full max-w-md relative">
      <!-- Reconnection Banner (when credentials expired) -->
      <div 
        v-if="isReconnecting" 
        class="mb-8 p-6 bg-[var(--theme-bg-soft)] text-[var(--theme-text)] flex items-start gap-4 rounded-xl"
      >
        <LucideAlertTriangle class="w-5 h-5 flex-shrink-0 mt-0.5 text-[var(--theme-text)]" />
        <div>
          <p class="font-black text-sm uppercase tracking-wider mb-2">Connection Expired</p>
          <p class="text-sm opacity-70">Your bank connection needs to be re-established. Please reconnect below.</p>
        </div>
      </div>

      <div class="mb-12 text-center">
        <h2 class="text-3xl font-black mb-4 tracking-tight text-[var(--theme-text)]">
          {{ isReconnecting ? 'Reconnect Bank' : 'Welcome' }}
        </h2>
        <p class="text-sm opacity-70 text-[var(--theme-text)] max-w-sm mx-auto">
          {{ isReconnecting 
            ? 'Your previous connection has expired. Securely reconnect below.' 
            : 'Get started by connecting your first bank account.' }}
        </p>
      </div>
      
      <OnboardingStatus 
        v-if="['syncing', 'complete'].includes(state.onboardingStep)"
        :state="state"
        @retry="handleRetry"
        @complete="$emit('complete')"
      />

      <div v-else>
        <div class="mb-12 space-y-6">
          <div class="flex items-center gap-4">
             <div class="w-12 h-12 rounded-full bg-[var(--theme-bg-soft)] flex items-center justify-center">
              <LucideShieldCheck class="w-5 h-5 text-[var(--theme-text)]" />
             </div>
             <span class="text-sm font-bold text-[var(--theme-text)] uppercase tracking-wider">Secure Connection</span>
          </div>
          <div class="flex items-center gap-4">
             <div class="w-12 h-12 rounded-full bg-[var(--theme-bg-soft)] flex items-center justify-center">
              <LucideLineChart class="w-5 h-5 text-[var(--theme-text)]" />
             </div>
             <span class="text-sm font-bold text-[var(--theme-text)] uppercase tracking-wider">Track Spending</span>
          </div>
          <div class="flex items-center gap-4">
             <div class="w-12 h-12 rounded-full bg-[var(--theme-bg-soft)] flex items-center justify-center">
              <LucideWallet class="w-5 h-5 text-[var(--theme-text)]" />
             </div>
             <span class="text-sm font-bold text-[var(--theme-text)] uppercase tracking-wider">Manage Finances</span>
          </div>
        </div>
        
        <button 
          class="w-full py-4 px-6 bg-[var(--theme-text)] hover:opacity-70 text-[var(--theme-browser-chrome)] transition-opacity flex items-center justify-center rounded-xl"
          @click="connectBank"
          :disabled="state.loading"
        >
          <LucidePlus v-if="!state.loading" class="w-5 h-5 mr-3" />
          <LucideLoader v-else class="w-5 h-5 mr-3 animate-spin" />
          <span class="text-sm font-black uppercase tracking-[0.2em]">
            {{ state.loading ? 'Connecting...' : (isReconnecting ? 'Reconnect' : 'Connect Bank') }}
          </span>
        </button>
      </div>

      <div v-if="state.error" class="mt-8 p-4 bg-red-100 text-red-800 flex items-start gap-3 rounded-xl text-sm border-none shadow-none">
        <LucideAlertCircle class="w-5 h-5 flex-shrink-0 mt-0.5" />
        <span class="font-medium">{{ state.error }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import OnboardingStatus from '../components/OnboardingStatus.vue';
import { usePlaidIntegration } from '../composables/usePlaidIntegration';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState.js';
import { 
  LucideShieldCheck, 
  LucideLineChart, 
  LucideWallet,
  LucidePlus,
  LucideLoader,
  LucideAlertCircle,
  LucideAlertTriangle
} from 'lucide-vue-next';

const emit = defineEmits(['complete']);
const { state: dashboardState } = useDashboardState();
const router = useRouter();

const { 
  state, 
  initializePlaid, 
  connectBank, 
  resyncTransactions
} = usePlaidIntegration();

// Check if user is reconnecting due to expired credentials
const isReconnecting = computed(() => dashboardState.itemsNeedingReauth?.length > 0);

onMounted(async () => {
  try {
    await initializePlaid();
    
    // If user already has items and not in onboarding, remove onboarding view state
    if (state.hasItems && !state.isOnboarding && !isReconnecting.value) {
       emit('complete');
    }
  } catch (error) {
    console.error('Onboarding initialization error:', error);
  }
});

const handleRetry = async () => {
  state.error = null;
  await resyncTransactions();
};
</script> 
