<template>
  <BaseModal 
    :isOpen="true" 
    title="Welcome to Your Financial Dashboard"
    size="md"
  >
    <template #content>
      <div class="max-w-6xl mx-auto">
        <!-- Onboarding Flow -->
        <p class="mb-8 text-center text-gray-700">Let's get started by connecting your first bank account.</p>
        
        <OnboardingStatus 
          v-if="['syncing', 'complete'].includes(state.onboardingStep)"
          :state="state"
          @retry="handleRetry"
        />

        <div v-else>
          <div class="mb-8 bg-gray-100 border-2 border-black p-6 shadow-[3px_3px_0px_#000]">
            <ul class="space-y-4">
              <li class="flex items-center gap-3 text-gray-800">
                <LucideShieldCheck class="w-6 h-6 text-purple-700" />
                <span class="text-lg">Securely connect your accounts</span>
              </li>
              <li class="flex items-center gap-3 text-gray-800">
                <LucideLineChart class="w-6 h-6 text-purple-700" />
                <span class="text-lg">Track your spending</span>
              </li>
              <li class="flex items-center gap-3 text-gray-800">
                <LucideWallet class="w-6 h-6 text-purple-700" />
                <span class="text-lg">Manage your finances</span>
              </li>
            </ul>
          </div>
          
          <button 
            class="w-full py-3 px-4 bg-purple-700 hover:bg-purple-800 text-white font-bold border-2 border-black shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000] transition-all duration-200 flex items-center justify-center"
            @click="connectBank"
            :disabled="state.loading"
          >
            <LucidePlus v-if="!state.loading" class="w-5 h-5 mr-2" />
            <LucideLoader v-else class="w-5 h-5 mr-2 animate-spin" />
            {{ state.loading ? 'Connecting...' : 'Connect Your Bank' }}
          </button>
        </div>

        <div v-if="state.error" class="mt-6 p-4 bg-red-100 border-2 border-red-600 text-red-700 flex items-center gap-2">
          <LucideAlertCircle class="w-5 h-5 flex-shrink-0" />
          <span>{{ state.error }}</span>
        </div>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import OnboardingStatus from '../components/OnboardingStatus.vue';
import { usePlaidIntegration } from '../composables/usePlaidIntegration';
import BaseModal from '@/shared/components/BaseModal.vue';

import { 
  LucideShieldCheck, 
  LucideLineChart, 
  LucideWallet,
  LucidePlus,
  LucideLoader,
  LucideAlertCircle
} from 'lucide-vue-next';

const router = useRouter();
const { 
  state, 
  initializePlaid, 
  connectBank, 
  resyncTransactions
} = usePlaidIntegration();

onMounted(async () => {
  try {
    await initializePlaid();
    
    // If user already has items and not in onboarding, redirect to dashboard
    if (state.hasItems && !state.isOnboarding) {
      // router.push('/');
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