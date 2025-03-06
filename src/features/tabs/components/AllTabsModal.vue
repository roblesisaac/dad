<template>
  <Teleport to="body">
    <!-- Fixed overlay with padding enforcement -->
    <div 
      v-if="isOpen" 
      class="fixed inset-0 bg-black bg-opacity-50 z-50"
    >
      <!-- This div ensures padding through absolute positioning -->
      <div class="absolute inset-x-4 inset-y-4 md:inset-x-6 md:inset-y-6 flex items-center justify-center">
        <!-- Modal container with fixed dimensions -->
        <div 
          class="bg-white rounded-lg shadow-2xl w-full max-w-screen-lg flex flex-col"
          style="max-height: calc(100% - 16px);"
          ref="modalContent"
          @click.stop
        >
          <!-- Modal header - sticky to top -->
          <div class="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg sticky top-0 z-10">
            <h3 class="text-lg font-semibold text-gray-800">Manage Tabs</h3>
            <button 
              @click="closeModal" 
              class="text-gray-500 hover:text-black transition-colors p-1 rounded hover:bg-gray-200"
              aria-label="Close modal"
            >
              <X size="20" />
            </button>
          </div>
          
          <!-- Content area - this is the only scrollable element -->
          <div class="flex-1 overflow-y-auto">
            <div class="p-4">
              <AllTabs 
                :in-modal="true"
                @tab-selected="handleTabSelected"
              />
            </div>
          </div>
        </div>
      </div>
      
      <!-- Clickable backdrop for closing -->
      <div 
        class="absolute inset-0 -z-10"
        @click="closeModal"
      ></div>
    </div>
  </Teleport>
</template>

<style scoped>
/* Fix iOS Safari 100vh issues */
@supports (-webkit-touch-callout: none) {
  .fixed {
    height: -webkit-fill-available;
  }
}
</style>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { X } from 'lucide-vue-next';
import AllTabs from './AllTabs.vue';
import { useTabs } from '../composables/useTabs';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'tab-selected']);
const modalContent = ref(null);
const { selectTab } = useTabs();

// Close the modal when Escape key is pressed
const handleKeyDown = (event) => {
  if (event.key === 'Escape' && props.isOpen) {
    closeModal();
  }
};

// Close modal handler
const closeModal = () => {
  emit('close');
};

// Handle tab selection and close modal
const handleTabSelected = (tab) => {
  // Don't call selectTab here - it's already called in AllTabRow component
  // Just emit the event and close the modal
  emit('tab-selected', tab);
  closeModal();
};

// Stop body scrolling when modal is open
const preventBodyScroll = (shouldPrevent) => {
  if (shouldPrevent) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
};

// Watch for modal open/close to control body scroll
watch(() => props.isOpen, (newVal) => {
  preventBodyScroll(newVal);
  if (newVal && modalContent.value) {
    // Reset scroll position when opening modal
    setTimeout(() => {
      if (modalContent.value) {
        const scrollableContent = modalContent.value.querySelector('.overflow-y-auto');
        if (scrollableContent) {
          scrollableContent.scrollTop = 0;
        }
      }
    }, 50);
  }
});

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
  if (props.isOpen) {
    preventBodyScroll(true);
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown);
  preventBodyScroll(false);
});
</script> 