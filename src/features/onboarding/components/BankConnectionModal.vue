<template>
  <div v-if="isActive" class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <!-- Background overlay -->
      <div class="fixed inset-0 transition-opacity" aria-hidden="true">
        <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
      </div>

      <!-- Modal panel -->
      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="sm:flex sm:items-start">
            <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
              <h3 class="text-lg leading-6 font-medium text-gray-900">
                {{ isReconnecting ? 'Reconnect Your Bank' : 'Connect Your Bank' }}
              </h3>
              <div class="mt-2">
                <p class="text-sm text-gray-500">
                  {{ isReconnecting 
                    ? 'Please follow the prompts to update your bank credentials.' 
                    : 'Connect your bank account to track your financial data.' }}
                </p>
              </div>
              
              <div v-if="isLoading" class="mt-4 flex justify-center">
                <div class="loader">Loading...</div>
              </div>
              
              <div v-else-if="error" class="mt-4 bg-red-50 p-4 rounded-md">
                <p class="text-sm text-red-700">{{ error }}</p>
                <button 
                  @click="$emit('exit')" 
                  class="mt-2 inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none"
                >
                  Close
                </button>
              </div>
              
              <div v-else-if="!plaidLoaded" class="mt-4">
                <p class="text-sm text-gray-500">Loading Plaid Link...</p>
              </div>
              
              <div v-else class="mt-4">
                <p class="text-sm text-gray-500">
                  Ready to connect. Click the button below to start the secure connection process.
                </p>
                <button 
                  @click="openPlaidLink" 
                  class="mt-2 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
                >
                  {{ isReconnecting ? 'Reconnect Bank' : 'Connect Bank' }}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button 
            @click="$emit('exit')" 
            type="button" 
            class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';

const props = defineProps({
  linkToken: {
    type: String,
    required: true
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  isReconnecting: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['success', 'exit', 'error']);

const isActive = ref(true);
const plaidLoaded = ref(false);
const error = ref(null);
const plaidHandler = ref(null);

// Computed value to determine if the component is ready to be used
const isReady = computed(() => !props.isLoading && props.linkToken && plaidLoaded.value && !error.value);

// Load Plaid Link script
onMounted(() => {
  // Only load if not already loaded
  if (!window.Plaid) {
    const script = document.createElement('script');
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
    script.onload = () => {
      plaidLoaded.value = true;
      initializePlaid();
    };
    script.onerror = () => {
      error.value = 'Failed to load Plaid Link. Please try again later.';
    };
    document.head.appendChild(script);
  } else {
    plaidLoaded.value = true;
    initializePlaid();
  }
});

// Initialize Plaid when token is available
watch(() => props.linkToken, (newToken) => {
  if (newToken && plaidLoaded.value) {
    initializePlaid();
  }
});

// Initialize Plaid Link handler
const initializePlaid = () => {
  if (!props.linkToken || !window.Plaid) return;

  try {
    plaidHandler.value = window.Plaid.create({
      token: props.linkToken,
      onSuccess: (public_token, metadata) => {
        emit('success', public_token, metadata);
      },
      onExit: (err, metadata) => {
        if (err) {
          error.value = err.error_message || 'An error occurred during the bank connection process.';
          emit('error', err);
        } else {
          emit('exit', metadata);
        }
      },
      onLoad: () => {
        // Plaid Link has loaded
      },
      receivedRedirectUri: null,
    });
  } catch (err) {
    error.value = 'Failed to initialize Plaid Link: ' + err.message;
    emit('error', err);
  }
};

// Open Plaid Link
const openPlaidLink = () => {
  if (plaidHandler.value) {
    plaidHandler.value.open();
  } else {
    error.value = 'Plaid Link is not initialized. Please try again.';
    emit('error', new Error(error.value));
  }
};

// Cleanup on component destruction
const cleanUp = () => {
  if (plaidHandler.value) {
    try {
      plaidHandler.value.destroy();
    } catch (e) {
      console.error('Error destroying Plaid Link handler:', e);
    }
  }
};
</script>

<style scoped>
.loader {
  border: 3px solid #f3f3f3;
  border-radius: 50%;
  border-top: 3px solid #3498db;
  width: 24px;
  height: 24px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style> 