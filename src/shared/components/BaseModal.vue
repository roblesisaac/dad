<template>
  <Teleport to="body">
    <div 
      v-if="isOpen" 
      class="fixed inset-0 bg-white z-50 flex flex-col overflow-hidden"
    >
      <!-- Optional Header -->
      <div v-if="!hideHeader" class="flex items-center justify-between p-4 border-b bg-gray-50 shrink-0">
        <slot name="header">
          <h3 class="text-lg font-semibold text-blue-800">{{ title }}</h3>
        </slot>
        <button 
          v-if="showCloseButton"
          @click="closeModal" 
          class="text-gray-500 hover:text-black transition-colors p-2 rounded hover:bg-gray-200"
          aria-label="Close modal"
        >
          <X size="24" />
        </button>
      </div>

      <!-- Close button for top-right when header is hidden -->
      <button 
        v-if="hideHeader && showCloseButton"
        @click="closeModal"
        class="absolute top-4 right-4 z-[60] p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-all"
        aria-label="Close"
      >
        <X size="24" />
      </button>
      
      <!-- Content area - scrollable -->
      <div class="flex-1 overflow-y-auto">
        <div :class="contentPadding">
          <slot name="content">
            <slot></slot>
          </slot>
        </div>
      </div>
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

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: 'Modal'
  },
  // Kept for compatibility but unused in full-screen mode
  size: {
    type: String,
    default: 'lg'
  },
  hideHeader: {
    type: Boolean,
    default: false
  },
  showCloseButton: {
    type: Boolean,
    default: true
  },
  contentPadding: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['close']);

// Close modal handler
const closeModal = () => {
  emit('close');
};

// Handle Escape key
const handleKeyDown = (event) => {
  if (event.key === 'Escape' && props.isOpen) {
    closeModal();
  }
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